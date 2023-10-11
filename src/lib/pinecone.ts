import { Pinecone, PineconeRecord, utils as PineconeUtils } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
//import {Document, RecursiveCharacterTextSplitter} from '@pinecone-database/doc-splitter'
import md5 from "md5";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

import {Document} from '@pinecone-database/doc-splitter'
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import Bottleneck from 'bottleneck';
import { TextEncoder } from 'util';


export const getPineconeClient = () => {
    return new Pinecone({
      environment: process.env.PINECONE_ENVIRONMENT!,
      apiKey: process.env.PINECONE_API_KEY!,
    });
  };
      

  //Create a type for the PDFPage after PDFLoader segments it to texts 
type PDFPage = {
	pageContent: string;
	metadata: {
		loc: {pageNumber:number}
		}
	
}


  export async function loadS3IntoPinecone(fileKey: string){
    // 1. obtain the pdf -> downlaod and read from pdf
  console.log("pinecone.ts: 1- Downloading s3 into file system");
  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error("pinecone.ts: could not download from s3");
  }
  // 1.1 get the text from the PDF
  console.log("loading pdf into memory" + file_name);
  const loader = new PDFLoader(file_name);
  // 1.2 Segement the PDF text into page
  const pages = await loader.load() as  PDFPage[];
  // 2. split and segment the pdf
  console.log("Starting Splitting pages into smaller chunks")
  const documents = await Promise.all(pages.map(prepareDocument));
  console.log("Finished Splitting pages into smaller chunks")
  // 3. vectorise and embed individual documents
    console.log("Starting Embedding Documents")
    const vectors = await Promise.all(documents.flat().map(embedDocument));
    console.log("Embedding successful")
    
  // Create batches and send to Pinecone
  console.log("Creating batches");
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const MAX_VECTORS = 100; // 100 vectors
  let currentBatch = [];
  let currentSize = 0;

  for (const vector of vectors) {
    const vectorSize = new TextEncoder().encode(JSON.stringify(vector)).length;

    if (currentSize + vectorSize > MAX_SIZE || currentBatch.length >= MAX_VECTORS) {
      console.log('Sending batch to Pinecone');
      await sendBatchToPinecone(currentBatch, fileKey);  // Adjust with actual function to send to Pinecone
      currentBatch = [];
      currentSize = 0;
    }

    currentBatch.push(vector);
    currentSize += vectorSize;
  }

  if (currentBatch.length > 0) {
    console.log('Sending final batch to Pinecone');
    await sendBatchToPinecone(currentBatch, fileKey);  // Adjust with actual function to send to Pinecone
  }

  return documents[0];
}

async function sendBatchToPinecone(batch: PineconeRecord[], fileKey: string) {
  const client = await getPineconeClient();
  const pineconeIndex = await client.index("chatpdf-yt");
  const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
  console.log("Inserting vectors into Pinecone");
  await namespace.upsert(batch);
}


  async function embedDocument(doc: Document) {
    try {
      
      const embeddings = await getEmbeddings(doc.pageContent);
      const hash = md5(doc.pageContent);
  
      return {
        id: hash,
        values: embeddings,
        metadata: {
          text: doc.metadata.text,
          pageNumber: doc.metadata.pageNumber,
        },
      } as PineconeRecord;
    } catch (error) {
      console.log("error embedding document", error);
      throw error;
    }
  }


  export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder();
    return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
  };

  async function prepareDocument(page: PDFPage) {
    let { pageContent, metadata } = page;
    pageContent = pageContent.replace(/\n/g, "");
    // split the docs
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 15000,
        chunkOverlap: 450,
                
    });
    const docs = await splitter.splitDocuments([
      new Document({
        pageContent,
        metadata: {
          pageNumber: metadata.loc.pageNumber,
          // 36000 is the maxium vectors we can send to pinecone
          text: truncateStringByBytes(pageContent, 36000),
        },
      }),
    ]);
    return docs;
  }

