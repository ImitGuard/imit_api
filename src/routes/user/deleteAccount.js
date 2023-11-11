import { deleteAccount } from "../../user.js";

export const handle = async(fastify) => {
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
            const { sessionId, userId, password, deleterId } = body;
            const user = await deleteAccount(sessionId, deleterId, userId, password);
            reply.send({ status: user?.status, code: user?.code });
        },
    });
};
