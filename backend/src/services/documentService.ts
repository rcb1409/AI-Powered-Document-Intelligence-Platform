import pool from "../config/database";
import { Document } from "../types";

export async function createDocument(
    userId: number,
    filename: string,
    fileUrl: string,
    fileSizeBytes: number
  ): Promise<Document> {
    const result = await pool.query(
      `INSERT INTO documents (user_id, filename, file_url, file_size_bytes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, filename, file_url, file_size_bytes as file_size, uploaded_at`,
      [userId, filename, fileUrl, fileSizeBytes]
    );
  
    // We cast the row to your Document interface
    return result.rows[0] as Document;
  }

  export async function saveDocumentChunks(
    documentId: number,
    chunks: string[],
    embeddings: number[][]
  ): Promise<number> {
    if (chunks.length !== embeddings.length) {
      throw new Error("Chunks and embeddings arrays must have the same length");
    }
  
    // Simple implementation: insert one by one.
    // For more performance later, you could batch or use a transaction.
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = embeddings[i];
  
      // Convert embedding array to pgvector literal format: [0.1,0.2,...]
      const embeddingLiteral = `[${embedding.join(",")}]`;
  
      await pool.query(
        `INSERT INTO document_chunks (document_id, chunk_index, chunk_text, embedding)
         VALUES ($1, $2, $3, $4::vector)`,
        [documentId, i, chunkText, embeddingLiteral]
      );
    }
  
    return chunks.length;
  }

  export async function getUserDocuments(userId: number): Promise<Document[]> {
    const result = await pool.query(
      `SELECT
         id,
         user_id,
         filename,
         file_url,
         file_size_bytes as file_size,
         uploaded_at
       FROM documents
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [userId]
    );
  
    return result.rows as Document[];
  }
  
  export async function deleteDocument(
    documentId: number,
    userId: number
  ): Promise<void> {
    // Ensure the document belongs to this user
    const docResult = await pool.query(
      `SELECT id FROM documents WHERE id = $1 AND user_id = $2`,
      [documentId, userId]
    );
  
    if (docResult.rows.length === 0) {
      throw new Error("Document not found or access denied");
    }
  
    // Due to ON DELETE CASCADE on document_chunks.document_id,
    // deleting the document will also delete its chunks.
    await pool.query(
      `DELETE FROM documents WHERE id = $1`,
      [documentId]
    );}


export async function getTopChunksForQuestion(
        documentId: number,
        questionEmbedding: number[],
        limit: number = 5
      ): Promise<string[]> {
        // Convert embedding array to pgvector format: [0.1,0.2,0.3,...]
        const embeddingLiteral = `[${questionEmbedding.join(",")}]`;
      
        // pgvector uses <=> operator for cosine distance
        // Smaller distance = more similar
        // ORDER BY embedding <=> $2::vector sorts by similarity (ascending = most similar first)
        const result = await pool.query(
          `SELECT chunk_text
           FROM document_chunks
           WHERE document_id = $1
           ORDER BY embedding <=> $2::vector
           LIMIT $3`,
          [documentId, embeddingLiteral, limit]
        );
      
        // Return just the text of each chunk (in order of similarity)
        return result.rows.map((row) => row.chunk_text);
    }
  