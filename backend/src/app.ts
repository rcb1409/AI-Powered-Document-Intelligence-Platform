import express from "express";
import cors from "cors";
import helmet from "helmet";
import { testConnection } from "./config/database";
import { testGroqConnection } from "./config/groq";
import { testHuggingFaceConnection } from "./config/embeddings";
import path from "path";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../../uploads")));

app.get("/health", (_req, res) => {
    res.json({status: "ok"})
});

app.get("/health/db", async (req, res) => {
    const isConnected = await testConnection();
    res.status(isConnected ? 200 : 503).json({
        status: isConnected ? "connected" : "disconnected",
        database: isConnected ? "ok" : "error"
    })
});

app.get("/health/groq", async (_req, res) => {
    const result = await testGroqConnection();
    
    if (result.success) {
        res.status(200).json({
            status: "working",
            groq: "ok",
            purpose: "chat_completions",
            test: {
                message: result.message,
                response: result.response,
            }
        });
    } else {
        res.status(503).json({
            status: "error",
            groq: "error",
            error: result.error
        });
    }
});

app.get("/health/embeddings", async (_req, res) => {
    const result = await testHuggingFaceConnection();
    
    if (result.success) {
        res.status(200).json({
            status: "working",
            huggingface: "ok",
            purpose: "embeddings",
            test: {
                message: result.message,
                embeddingDimensions: result.embeddingLength,
                sampleEmbedding: result.sampleEmbedding, // First 5 numbers
            }
        });
    } else {
        res.status(503).json({
            status: "error",
            huggingface: "error",
            message: result.message,
            error: result.error
        });
    }
});

export default app;
