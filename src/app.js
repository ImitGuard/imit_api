/* eslint-disable new-cap */
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import PrismaStore from "./PrismaStore.js";

import { config } from "../config/config.js";
import { registerRoutes } from "./routes/router.js";
import { prisma } from "./db.js";

import * as cronScheduler from "./service/cronScheduler.js";
import Log from "./util/log.js";


const fastify = Fastify({
    logger: true,
});

const registerPlugins = async() => {
    await fastify.register(cors, {
        origin: "*",
    });

    await fastify.register(fastifyCookie);
    await fastify.register(fastifySession, {
        cookieName: "sessionId",
        secret: config.sessions.secret,
        cookie: {
            secure: false,
            maxAge: 18000000,
            httpOnly: false,
            sameSite: "none",
            domain: "http://127.0.0.1:3000/",
        },
        saveUninitialized: false,
        store: new PrismaStore({ prisma }),
    });
};

const start = async() => {
    await registerPlugins();
    await cronScheduler.scheduleCrons();

    await registerRoutes(fastify);

    try {
        await fastify.listen({ port: config.server.port });
    }
    catch (err){
        fastify.log.error(err);
        process.exit(1);
    }
};

Log.wait("Starting server for ImitGuard...");
await start();

// shutdown handling
const shutdown = async() => {
    Log.wait("Shutting down server for ImitGuard...");

    // await sessionPool.end().then(() => Log.done("Closed session database pool..."));

    try{
        await prisma.$disconnect();
        Log.info("Prisma client disconnected successfully.");
    }
    catch (error){
        Log.error("Error disconnecting Prisma client:", error);
    }

    try {
        await fastify.close();
        Log.info("Fastify server closed successfully.");
    }
    catch (error){
        Log.error("Error closing Fastify server:", error);
    }

    Log.done("Shutdown server for ImitGuard...");
    process.exit(0); // Ensure the process exits after the shutdown is complete
};

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
