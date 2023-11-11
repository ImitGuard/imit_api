import { login } from "../../user.js";

export const handle = async(fastify) => {
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
            const user = await login(username, password);
            const sessionId = await user?.sessionId !== -1 ? await user?.sessionId : -1;
            reply.send({ status: user?.status, code: user?.code, sessionId});
        },
    });
};
