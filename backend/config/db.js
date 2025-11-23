import pg from "pg";

const { Pool } = pg;

const buildPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    const config = { connectionString: process.env.DATABASE_URL };
    if (process.env.PGSSLMODE === "require") {
      config.ssl = { rejectUnauthorized: false };
    }
    return config;
  }

  const config = {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  };

  if (process.env.PGSSL === "true") {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
};

export const pool = new Pool(buildPoolConfig());

const connectDB = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
