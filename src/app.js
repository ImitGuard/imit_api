import ffastify from "fastify";
import cors from "@fastify/cors";
import * as argon2 from "argon2";

import * as users from "./user.js";
import { config } from "../config/config.js";

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

fastify.route({
  method: "POST",
  url: "/register",
  schema: {
    querystring: {
      username: { type: "string" },
      email: { type: "string" },
      password: { type: "string" },
      accountType: { type: "number" },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "number" },
        },
      },
    },
  },
  handler: async(request, reply) => {
    // @ts-ignore
    const body = JSON.parse(request.body);
    const { username, email, password, accountType } = body;
    const hashedPassword = await argon2.hash(password, { secret: Buffer.from(config.database.password_secret) });
    const user = await users.createUser(username, email, hashedPassword, accountType);
    reply.send({ status: user?.status, code: user?.code });
  },
});

fastify.route({
  method: "POST",
  url: "/login",
  schema: {
    querystring: {
      username: { type: "string" },
      password: { type: "string" },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "number" },
          sessionId: { type: "string" },
        },
      },
    },
  },
  handler: async(request, reply) => {
    // @ts-ignore
    const body = JSON.parse(request.body);
    const { username, password } = body;
    const user = await users.login(username, password);
    const sessionId = await user?.sessionId !== -1 ? await user?.sessionId : -1;
    reply.send({ status: user?.status, code: user?.code, sessionId});
  },
});

fastify.route({
  method: "POST",
  url: "/logout",
  schema: {
    querystring: {
      userId: { type: "number" },
      sessionId: { type: "string" },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "number" },
        },
      },
    },
  },
  handler: async(request, reply) => {
    // @ts-ignore
    const body = JSON.parse(request.body);
    const { userId, sessionId } = body;
    const user = await users.logout(userId, sessionId);
    reply.send({ status: user?.status, code: user?.code });
  },
});

fastify.route({
  method: "POST",
  url: "/updateAccount",
  schema: {
    querystring: {
      userId: { type: "number" },
      username: { type: "string" },
      email: { type: "string" },
      password: { type: "string" },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "number" },
        },
      },
    },
  },
  handler: async(request, reply) => {
    // @ts-ignore
    const body = JSON.parse(request.body);
    const { userId, username, email, password } = body;
    const user = await users.updateAccount(userId, username, email, password);
    reply.send({ status: user?.status, code: user?.code });
  },
});

fastify.route({
  method: "POST",
  url: "/updatePassword",
  schema: {
    querystring: {
      userId: { type: "number" },
      oldPassword: { type: "string" },
      newPassword: { type: "string" },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "number" },
        },
      },
    },
  },
  handler: async(request, reply) => {
    // @ts-ignore
    const body = JSON.parse(request.body);
    const { userId, oldPassword, newPassword } = body;
    const user = await users.changePassword(userId, oldPassword, newPassword);
    reply.send({ status: user?.status, code: user?.code });
  },
});

fastify.route({
  method: "POST",
  url: "/deleteAccount",
  schema: {
    querystring: {
      userId: { type: "number" },
      password: { type: "string" },
      deleter: { type: "number" },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "number" },
        },
      },
    },
  },
  handler: async(request, reply) => {
    // @ts-ignore
    const body = JSON.parse(request.body);
    const { userId, password, deleter } = body;
    const user = await users.deleteAccount(deleter, userId, password);
    reply.send({ status: user?.status, code: user?.code });
  },
});


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
