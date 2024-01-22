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

                reply.code(user.code === 1 ? 200 : 400).send({
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
                const { username, email, password } = JSON.parse(body);
                const hashedPassword = await argon2.hash(password, { secret: Buffer.from(config.database.password_secret) });
                const user = await users.createUser(username, email, hashedPassword);
                reply.code(user.code === 1 ? 200 : 400).send({ status: user?.status, code: user?.code });
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
                        },
                    },
                },
            },
            handler: async(request, reply) => {
                const {body} = request;
                const { username, password } = JSON.parse(body);
                const result = await users.loginUser(username, password);

                const session = await request.sessionStore.getByUserId(result.user?.id, (err) => {
                    if(err) console.log(err);
                });

                if(result.user && result.code === 1 && !session){
                    request.session.userId = result.user.id;
                    await request.sessionStore.set(request.session.sessionId, request.session, (err) => {
                        if(err) console.log(err);
                    });
                    await reply.code(result.code === 1 ? 200 : 401).send({ status: result?.status, code: result?.code });
                }
                else{
                    reply.code(401).send({ status: "You're already logged in.", code: -9 });
                }
            },
        });
    }

    async loggedIn(){
        this.fastify.route({
            method: "GET",
            url: "/loggedIn",
            schema: {
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
                // const sessionId = await user?.sessionId !== -1 ? await user?.sessionId : -1

                reply.code(200).send({ status: "Test", code: 1 });
            },
        });
    }

    async logout(){
        this.fastify.route({
            method: "POST",
            url: "/logout",
            schema: {
                queryString: {
                    sessionId: {type: "string"},
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
                const { body } = request;
                const { sessionId } = JSON.parse(body);
                const realSessionId = sessionId.split(".")[0];
                const session = request.sessionStore.store.get(realSessionId);
                console.log("session in store: ", session);
                if(session){
                    reply.code(200).send({ status: "Logged out", code: 1 });
                    return;
                }
                reply.code(200).send({ status: "Something went wrong", code: -1 });
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
                const { sessionId, userId, password, deleterId } = JSON.parse(body);
                const user = await users.deleteAccount(sessionId, deleterId, userId, password);
                reply.code(user.code === 1 ? 200 : 400).send({ status: user?.status, code: user?.code });
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
                const { userId, username, email, password } = JSON.parse(body);
                const user = await users.updateAccount(userId, username, email, password);
                reply.code(user.code === 1 ? 200 : 400).send({ status: user?.status, code: user?.code });
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
                const { userId, oldPassword, newPassword } = JSON.parse(body);
                const user = await users.changePassword(userId, oldPassword, newPassword);
                reply.code(user.code === 1 ? 200 : 400).send({ status: user?.status, code: user?.code });
            },
        });
    }
}
