import * as argon2 from "argon2";

import { config } from "../../../config/config.js";
import { createUser } from "../../user.js";

export const handle = async(fastify) => {
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
            const { username, email, password } = body;
            const hashedPassword = await argon2.hash(password, { secret: Buffer.from(config.database.password_secret) });
            const user = await createUser(username, email, hashedPassword);
            reply.send({ status: user?.status, code: user?.code });
        },
    });
};
