import mongoose from "mongoose";
import app from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/db";

async function bootstrap() {
  await connectDatabase();
  const server = app.listen(env.PORT, () => console.log(`GateGuard API listening on http://localhost:${env.PORT}`));
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received. Closing GateGuard API...`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch(err => { console.error("Server startup failed", err); process.exit(1); });
