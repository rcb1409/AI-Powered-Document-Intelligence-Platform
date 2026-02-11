import pool from "../config/database";
import { Document } from "../types";

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

/**
 * Create a document within a workspace
 */
export async function createDocumentInWorkspace(
  userId: number,
  workspaceId: number,
  filename: string,
  fileUrl: string,
  fileSizeBytes: number
): Promise<Document> {
  // Verify workspace belongs to user
  const wsCheck = await pool.query(
    `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  if (wsCheck.rowCount === 0) {
    throw new Error("Workspace not found or access denied");
  }

  const result = await pool.query(
    `INSERT INTO documents (user_id, workspace_id, filename, file_url, file_size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, filename, file_url, file_size_bytes as file_size, uploaded_at`,
    [userId, workspaceId, filename, fileUrl, fileSizeBytes]
  );

  return result.rows[0] as Document;
}

/**
 * Get all documents in a workspace (for a user)
 */
export async function getWorkspaceDocuments(
  userId: number,
  workspaceId: number
): Promise<Document[]> {
  // Verify workspace belongs to user
  const wsCheck = await pool.query(
    `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  if (wsCheck.rowCount === 0) {
    throw new Error("Workspace not found or access denied");
  }

  const result = await pool.query(
    `SELECT
       id,
       user_id,
       filename,
       file_url,
       file_size_bytes as file_size,
       uploaded_at
     FROM documents
     WHERE user_id = $1 AND workspace_id = $2
     ORDER BY uploaded_at DESC`,
    [userId, workspaceId]
  );

  return result.rows as Document[];
}

/**
 * Delete a document from a workspace
 */
export async function deleteDocumentFromWorkspace(
  documentId: number,
  userId: number,
  workspaceId: number
): Promise<void> {
  // Verify workspace belongs to user
  const wsCheck = await pool.query(
    `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  if (wsCheck.rowCount === 0) {
    throw new Error("Workspace not found or access denied");
  }

  // Ensure document belongs to user + workspace
  const docResult = await pool.query(
    `SELECT id FROM documents
     WHERE id = $1 AND user_id = $2 AND workspace_id = $3`,
    [documentId, userId, workspaceId]
  );

  if (docResult.rows.length === 0) {
    throw new Error("Document not found or access denied");
  }

  await pool.query(
    `DELETE FROM documents WHERE id = $1`,
    [documentId]
  );
}

/**
 * Get top chunks from all documents in a workspace (for RAG)
 */
export async function getTopChunksForWorkspaceQuestion(
  workspaceId: number,
  userId: number,
  questionEmbedding: number[],
  limit: number = 5
): Promise<string[]> {
  // Verify workspace belongs to user
  const wsCheck = await pool.query(
    `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  if (wsCheck.rowCount === 0) {
    throw new Error("Workspace not found or access denied");
  }

  const embeddingLiteral = `[${questionEmbedding.join(",")}]`;

  // Search across all chunks from documents in this workspace
  const result = await pool.query(
    `SELECT dc.chunk_text
     FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     WHERE d.workspace_id = $1 AND d.user_id = $2
     ORDER BY dc.embedding <=> $3::vector
     LIMIT $4`,
    [workspaceId, userId, embeddingLiteral, limit]
  );

  return result.rows.map((row) => row.chunk_text);
}