import { pool } from "../config/db.js";

export const createChatHistory = async ({ sessionId, repoUrl }) => {
  await pool.query(
    `INSERT INTO chat_histories (session_id, repo_url, history)
     VALUES ($1, $2, '[]'::jsonb)
     ON CONFLICT (session_id) DO UPDATE
     SET repo_url = EXCLUDED.repo_url,
         updated_at = NOW()`,
    [sessionId, repoUrl]
  );
};

export const findChatHistory = async (sessionId) => {
  const { rows } = await pool.query(
    `SELECT session_id, repo_url, history
       FROM chat_histories
      WHERE session_id = $1`,
    [sessionId]
  );

  if (!rows[0]) {
    return null;
  }

  const row = rows[0];
  return {
    sessionId: row.session_id,
    repoUrl: row.repo_url,
    history: Array.isArray(row.history) ? row.history : [],
  };
};

export const updateChatHistory = async (sessionId, history) => {
  await pool.query(
    `UPDATE chat_histories
        SET history = $2::jsonb,
            updated_at = NOW()
      WHERE session_id = $1`,
    [sessionId, JSON.stringify(history)]
  );
};
