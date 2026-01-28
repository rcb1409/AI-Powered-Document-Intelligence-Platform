import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";

dotenv.config();

const MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.HUGGINGFACE_API_KEY) throw new Error("HUGGINGFACE_API_KEY is not set");

  const out = await hf.featureExtraction({
    model: MODEL_ID,
    inputs: text,
  });

  // SDK returns either number[] or number[][]
  if (Array.isArray(out) && typeof out[0] === "number") return out as number[];
  return (out as number[][])[0];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.HUGGINGFACE_API_KEY) throw new Error("HUGGINGFACE_API_KEY is not set");

  const out = await hf.featureExtraction({
    model: MODEL_ID,
    inputs: texts,
  });

  // If we got a single embedding back, normalize to array
  if (Array.isArray(out) && typeof out[0] === "number") return [out as number[]];
  return out as number[][];
}

export async function testHuggingFaceConnection(): Promise<{
  message?: string;
  success: boolean;
  embeddingLength?: number;
  sampleEmbedding?: number[];
  error?: string;
}> {
  try {
    const emb = await generateEmbedding("hello from embeddings test");
    return { success: true, embeddingLength: emb.length, sampleEmbedding: emb.slice(0, 5) };
  } catch (e: any) {
    return { success: false, error: e?.message ?? String(e) };
  }
}