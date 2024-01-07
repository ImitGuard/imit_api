import ffastify from "fastify";
import cors from "@fastify/cors";

import { config } from "../config/config.js";
import { registerRoutes } from "./routes/router.js";
import { userPool, sessionPool, reportPool } from "./db.js";

import * as cronScheduler from "./service/cronScheduler.js";
import Log from "./util/log.js";

const fastify = ffastify({
    logger: true,
});

Log.wait("Starting server for ImitGuard...");

await fastify.register(cors, {
    origin: "*",
});

await cronScheduler.scheduleCrons();

await registerRoutes(fastify);

try {
    await fastify.listen({ port: config.server.port });
}
catch (err){
    fastify.log.error(err);
    process.exit(1);
}

// shutdown handling
async function shutdown(){
    Log.wait("Shutting down server for ImitGuard...");
    await fastify.close();
    await sessionPool.end().then(() => Log.done("Closed session database pool..."));
    await reportPool.end().then(() => Log.done("Closed report database pool..."));
    await userPool.end().then(() => {
        Log.done("Closed user database pool...");
        process.exit(0);
    });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (err) => {
    Log.error("Uncaught exception:", err);
    shutdown();
});

process.on("unhandledRejection", (reason, promise) => {
    Log.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    shutdown();
});

Log.done("Server started for ImitGuard!");
