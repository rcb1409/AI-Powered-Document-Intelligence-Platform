// import OpenAI from "openai";
// import dotenv from "dotenv";

// dotenv.config();

// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });


// export const testOpenAIConection = async (): Promise<boolean> => {
//     try {
//         if(!process.env.OPENAI_API_KEY) {
//             console.warn("OPENAI_API_KEY is not set in the environment variables");
//             return false;
//         }
//         const response = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [{ role: "user", content: "Hello, how are you?" }],
//         });
//         return true;
//     } catch (error) {
//     }
// export default openai;

