import ffastify from "fastify";
import cors from "@fastify/cors";

import * as users from "./user.js";
import { config } from "../config/config.js";

import * as cronScheduler from "./service/cronScheduler.js";
import Log from "./util/log.js";

//
import * as register from "./routes/user/register.js";
import * as login from "./routes/user/login.js";
import * as logout from "./routes/user/logout.js";
import * as updateAccount from "./routes/user/updateAccount.js";
import * as updatePassword from "./routes/user/updatePassword.js";
import * as deleteAccount from "./routes/user/deleteAccount.js";

const fastify = ffastify({
    logger: true,
});

Log.wait("Starting server for ImitGuard...");

await fastify.register(cors, {
    origin: "*",
});

await cronScheduler.scheduleCrons();

const registerRoutes = async() => {
    await register.handle(fastify);
    await login.handle(fastify);
    await logout.handle(fastify);
    await updateAccount.handle(fastify);
    await updatePassword.handle(fastify);
    await deleteAccount.handle(fastify);
};

await registerRoutes();

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
    await cronScheduler.pool.end().then(() => Log.done("Closed session database pool..."));
    await users.pool.end().then(() => {
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
