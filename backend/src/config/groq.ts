import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export const testGroqConnection = async (): Promise<{
    success: boolean;
    response?: string;
    error?: string;
    message?: string;
}> => {
    try {
        if(!process.env.GROQ_API_KEY) {
            console.warn("GROQ_API_KEY is not set in the environment variables");
            return {
                success: false,
                error: "GROQ_API_KEY is not set in the environment variables",
            };
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: "Hello, how are you?" }],
            max_tokens: 50,
        });

        const responseText = completion.choices[0]?.message?.content || "No response from Groq";
        console.log("Groq response:", responseText);
        return {
            success: true,
            response: responseText,
        };

    } catch (error) {
        console.error("Error testing Groq connection:", error);
        return {
            success: false,
            
        };
    }
}
export default groq;