import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { pool } from "../config/db.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const createEmbeddings = async (texts) => {
  const embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004",
  });

  const validTexts = texts.filter(
    (t) => typeof t === "string" && t.trim() !== ""
  );

  if (validTexts.length === 0) {
    return [];
  }

  const result = await embeddingModel.batchEmbedContents({
    requests: validTexts.map((text) => ({
      content: { parts: [{ text }] },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    })),
  });

  return result.embeddings.map((e) => e.values);
};

export const semanticSearch = async (queryVector, repoUrl) => {
  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    return [];
  }

  const sanitized = queryVector.map((value) => {
    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numeric)) {
      throw new Error('Query embedding contains non-numeric value');
    }
    return numeric;
  });

  const vectorLiteral = `[${sanitized.join(',')}]`;

  const { rows } = await pool.query(
    `SELECT file_path AS "filePath",
            content,
            1 - (embedding <=> $1::vector) AS score
       FROM documents
      WHERE repo_url = $2
      ORDER BY embedding <-> $1::vector
      LIMIT 8`,
    [vectorLiteral, repoUrl]
  );

  return rows;
};

export const askGeminiWithMemory = async (context, question, chatHistory) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const formattedHistory = chatHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history: formattedHistory });

  const prompt = `You are an expert software developer AI assistant named Git-Query. Your task is to be a helpful, in-depth conversational partner.

Follow this logic:
1.  **Analyze the User's Question:** First, understand if the user is asking a question directly about the code in the provided "CONTEXT FROM REPOSITORY" or if they are asking a more general, conceptual question (e.g., "teach me about redis").

2.  **Prioritize Repository Context:** If the question can be answered using the provided context, you MUST base your answer on it. When you do this, begin your response with "Based on the repository files...". Provide detailed explanations and elaborate on the code's purpose and functionality.

3.  **Use General Knowledge as a Fallback:** If the context is insufficient OR the user asks a general knowledge question, you are then permitted to use your own internal knowledge to provide a comprehensive answer. When you do this, you MUST begin your response with "From my general knowledge base...".

4.  **Be Conversational:** Do not simply state "I could not find the answer." Instead, use the logic above to provide the most helpful response possible.

---
CONTEXT FROM REPOSITORY:
${context || "No specific context was found for this query."}
---

User's Question: ${question}

ANSWER:`;

  const result = await chat.sendMessage(prompt);
  return result.response.text();
};
