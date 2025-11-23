import { pool } from "../config/db.js";

const toVectorLiteral = (embedding) => {
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding must be an array of numbers");
  }
  const sanitized = embedding.map((value) => {
    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numeric)) {
      throw new Error('Embedding contains non-numeric value');
    }
    return numeric;
  });
  return `[${sanitized.join(',')}]`;
};

export const deleteDocumentsByRepo = async (repoUrl) => {
  await pool.query("DELETE FROM documents WHERE repo_url = $1", [repoUrl]);
};

export const insertDocuments = async (documents) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    return;
  }

  const values = [];
  const params = [];
  let index = 1;

  for (const doc of documents) {
    if (!doc.embedding || doc.embedding.length === 0) {
      continue;
    }

    values.push(`($${index++}, $${index++}, $${index++}, $${index++}::vector)`);
    params.push(
      doc.repoUrl,
      doc.filePath,
      doc.content,
      toVectorLiteral(doc.embedding)
    );
  }

  if (values.length === 0) {
    return;
  }

  const query = `INSERT INTO documents (repo_url, file_path, content, embedding) VALUES ${values.join(",")}`;
  await pool.query(query, params);
};
