import { updateAccount } from "../../user.js";

export const handle = async(fastify) => {
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
            const user = await updateAccount(userId, username, email, password);
            reply.send({ status: user?.status, code: user?.code });
        },
    });
};
