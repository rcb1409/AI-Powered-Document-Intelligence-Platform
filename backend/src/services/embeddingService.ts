import { generateEmbedding, generateEmbeddings } from "../config/embeddings";

export async function embedText(rawText: string): Promise<number[]> {
    const text = rawText.trim();
    if(!text){
        throw new Error("Empty text provided");
    }
    return await generateEmbedding(text);
}

export async function embedTexts(rawTexts: string[]): Promise<number[][]> {
    const texts = rawTexts.map(text => text.trim()).filter(text => text !== "");
    if(texts.length === 0){
        throw new Error("No non-empty texts provided");
    }
    return await generateEmbeddings(texts);
}