import { changePassword } from "../../user.js";

export const handle = async(fastify) => {
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
            const user = await changePassword(userId, oldPassword, newPassword);
            reply.send({ status: user?.status, code: user?.code });
        },
    });
};
