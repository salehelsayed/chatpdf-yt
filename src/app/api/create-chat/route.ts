import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { getS3Url } from "@/lib/s3";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// /api/create-chat
export async function POST(req: Request, res: Response){
    const {userId} = await auth()
    if(!userId){
        return NextResponse.json({error: "unauthorized"}, {status: 401})
    }
    try {
        const body = await req.json()
        const {file_key, file_name} = body;
        console.log(file_key, file_name);
        const pages = await loadS3IntoPinecone(file_key)
        //return NextResponse.json({pages});

        // Insert information into our database
        const chat_id = await db.insert(chats).values({
            fileKey: file_key,
            pdfName: file_name,
            pdfURL: getS3Url(file_key),
            userId,
        }).returning({
            insertedId: chats.id
        })

        //Send the next respons
        return NextResponse.json({
            chat_id: chat_id[0].insertedId
        },{
            status: 200
        })

        
    } catch (error) {
        console.error(error);
        return NextResponse.json( 
        { error: "internal server error" },
        { status: 500}
        
        );
    }
}

