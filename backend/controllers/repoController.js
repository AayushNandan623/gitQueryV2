import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import {
  deleteDocumentsByRepo,
  insertDocuments,
} from "../models/documentModel.js";
import { createEmbeddings } from "../services/geminiService.js";
import { getRepoContent } from "../services/githubService.js";

export const indexRepository = async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) {
    return res
      .status(400)
      .json({ message: "GitHub repository URL is required." });
  }

  try {
    const docs = await getRepoContent(repoUrl);
    const validDocs = docs.filter((doc) => typeof doc.pageContent === "string");

    if (validDocs.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid text documents were found to index." });
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(validDocs);

    const contents = chunks.map((chunk) => chunk.pageContent);
    const embeddings = await createEmbeddings(contents);

    const documentsToStore = chunks
      .map((chunk, index) => {
        const embedding = embeddings[index];
        if (!embedding || embedding.length === 0) {
          return null;
        }
        return {
          repoUrl,
          filePath: chunk.metadata.source,
          content: chunk.pageContent,
          embedding,
        };
      })
      .filter(Boolean);

    await deleteDocumentsByRepo(repoUrl);
    await insertDocuments(documentsToStore);

    res.status(201).json({
      message: `Repository indexed successfully. ${documentsToStore.length} chunks created from ${validDocs.length} valid files.`,
    });
  } catch (error) {
    console.error("Indexing error:", error.message);
    res
      .status(500)
      .json({ message: `Error indexing repository: ${error.message}` });
  }
};
