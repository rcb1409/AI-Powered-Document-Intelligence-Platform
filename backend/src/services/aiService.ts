import groq from "../config/groq";

/**
 * Answer a question using RAG (Retrieval-Augmented Generation).
 * 
 * Flow:
 * 1) Takes user's question + relevant document chunks (from vector search)
 * 2) Builds a prompt that includes the chunks as context
 * 3) Calls Groq to generate an answer based on that context
 * 4) Returns the answer
 * 
 * @param question - User's question
 * @param contextChunks - Array of relevant document chunks (from vector search)
 * @returns The AI-generated answer
 */
export async function answerQuestion(
  question: string,
  contextChunks: string[]
): Promise<string> {
  if (!contextChunks || contextChunks.length === 0) {
    throw new Error("No context chunks provided for answering the question");
  }

  // Combine all chunks into a single context string
  const context = contextChunks.join("\n\n---\n\n");

  // Build the system prompt - tells Groq how to behave
  const systemPrompt = `You are a helpful assistant that answers questions based on the provided document context.
  
Important rules:
- Only use information from the provided context to answer the question
- If the answer is not in the context, say "I don't have enough information in the document to answer this question"
- Be concise and accurate
- Cite specific parts of the context when relevant`;

  // Build the user message - includes context + question
  const userMessage = `Context from document:
${context}

Question: ${question}

Answer based on the context above:`;

  try {
    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Fast and free model
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.7, // Balance between creativity and accuracy
      max_tokens: 500, // Limit response length
    });

    const answer = completion.choices[0]?.message?.content;

    if (!answer) {
      throw new Error("No answer generated from Groq");
    }

    return answer;
  } catch (error: any) {
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}