import * as argon2 from "argon2";

import { config } from "../../config/config.js";
import * as users from "../user.js";

export default class User {
    constructor(fastify){
        this.fastify = fastify;
    }

    async get(){
        this.fastify.route({
            method: "GET",
            url: "/user/:id",
            schema: {
                params: {
                    id: { type: "number" },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            code: { type: "number" },
                            user: {
                                type: "object",
                                properties: {
                                    id: { type: "number" },
                                    username: { type: "string" },
                                    email: { type: "string" },
                                    accountType: { type: "number" },
                                    createdAt: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
            handler: async(request, reply) => {
                const { id } = request.params;
                const user = await users.getUserById(id);
                reply.send({
                    status: user?.status,
                    code: user?.code,
                    user: {
                        id: user?.user?.id,
                        username: user?.user?.username,
                        email: user?.user?.email,
                        accountType: user?.user?.accounttype,
                        createdAt: user?.user?.createdat,
                    },
                });
            },
        });
    }

    async register(){
        this.fastify.route({
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
                const {body} = request;
                const { username, email, password } = body;
                const hashedPassword = await argon2.hash(password, { secret: Buffer.from(config.database.password_secret) });
                const user = await users.createUser(username, email, hashedPassword);
                reply.send({ status: user?.status, code: user?.code });
            },
        });
    }

    async login(){
        this.fastify.route({
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
                const {body} = request;
                const { username, password } = body;
                const user = await users.loginUser(username, password);
                const sessionId = await user?.sessionId !== -1 ? await user?.sessionId : -1;
                reply.send({ status: user?.status, code: user?.code, sessionId});
            },
        });
    }

    async logout(){
        this.fastify.route({
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
                const {body} = request;
                const { userId, sessionId } = body;
                const user = await users.logout(userId, sessionId);
                reply.send({ status: user?.status, code: user?.code });
            },
        });
    }

    async delete(){
        this.fastify.route({
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
                const {body} = request;
                const { sessionId, userId, password, deleterId } = body;
                const user = await users.deleteAccount(sessionId, deleterId, userId, password);
                reply.send({ status: user?.status, code: user?.code });
            },
        });
    }

    async updateAccount(){
        this.fastify.route({
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
                const {body} = request;
                const { userId, username, email, password } = body;
                const user = await users.updateAccount(userId, username, email, password);
                reply.send({ status: user?.status, code: user?.code });
            },
        });
    }

    async updatePassword(){
        this.fastify.route({
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
                const {body} = request;
                const { userId, oldPassword, newPassword } = body;
                const user = await users.changePassword(userId, oldPassword, newPassword);
                reply.send({ status: user?.status, code: user?.code });
            },
        });
    }
}
