import { OpenAIApi, Configuration } from "openai-edge";
import Bottleneck from 'bottleneck';

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY!,
  });

const openai = new OpenAIApi(config)

// Create a global Bottleneck instance
const limiter = new Bottleneck({
  minTime: 60  // Adjust this value as per the API rate limit
});

export async function getEmbeddings(text: string) {
    try {
      const response = await limiter.schedule(() => openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: text.replace(/\n/g, " "),
      }));
      const result = await response.json();
      console.log('result', result)
      return result.data[0].embedding as number[];
    } catch (error) {
      console.log("error calling openai embeddings api", error);
      throw error;
    }
  }