import { logout } from "../../user.js";

export const handle = async(fastify) => {
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
            const user = await logout(userId, sessionId);
            reply.send({ status: user?.status, code: user?.code });
        },
    });
};
