export interface User {
    id: number;
    email: string;
    password_hash: string;
    created_at: Date;
  }

export interface UserResponse {
    id: number;
    email: string;
    created_at: Date;
  }
export interface Document {
    id: number;
    user_id: number;
    filename: string;
    file_url: string;
    file_size: number;
    uploaded_at: Date;
  }  



export interface DocumentChunk {
    id: number;
    document_id: number;
    chunk_text: string;
    chunk_index: number;
    embedding: number[];
    created_at: Date;
  }
  
  // Chat types
export interface ChatHistory {
    id: number;
    user_id: number;
    document_id: number;
    question: string;
    answer: string;
    created_at: Date;
  }
  
  // Request types
export interface AuthRequest {
    email: string;
    password: string;
  }
  
export interface AskRequest {
    documentId: number;
    question: string;
  }
  
  // Response types
export interface AskResponse {
    answer: string;
    relevantChunks: string[];
  }