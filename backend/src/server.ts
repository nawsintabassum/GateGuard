
import mongoose from "mongoose";
import app from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/db";

async function bootstrap() {
  try {
    await connectDatabase();

    const server = app.listen(env.PORT, () => {
      console.log(
        `GateGuard API listening on http://localhost:${env.PORT}`
      );
    });

    let shuttingDown = false;

    const shutdown = (signal: string) => {
      if (shuttingDown) return;

      shuttingDown = true;

      console.log(
        `${signal} received. Closing GateGuard API...`
      );

      server.close(async () => {
        try {
          await mongoose.disconnect();
          console.log("Database disconnected successfully");
          process.exit(0);
        } catch (error) {
          console.error("Shutdown error:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

bootstrap();
