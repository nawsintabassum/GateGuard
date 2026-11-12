import app from "../backend/src/app";
import { connectDatabase } from "../backend/src/config/db";

let dbConnection: Promise<void> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!dbConnection) {
      dbConnection = connectDatabase();
    }

    await dbConnection;
  } catch (error) {
    dbConnection = null;
    console.error("Database connection failed:", error);

    return res.status(503).json({
      status: "error",
      message: "Database connection failed"
    });
  }

  return app(req, res);
}
