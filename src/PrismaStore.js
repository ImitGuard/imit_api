import { EventEmitter } from "events";
import * as util from "node:util";

export const DEFAULT_TTL = 86400;
export default class PrismaStore extends EventEmitter {
    constructor({ prisma, ttl = DEFAULT_TTL }){
        super();
        this.prisma = prisma;
        this.ttl = ttl;
        EventEmitter.call(this);
    }

    getExpires(expiry){
        return new Date(expiry ?? Date.now() + this.ttl * 1000);
    }

    _toObject(prismaResult){
        return {
            sessionId: prismaResult.sessionId,
            userId: prismaResult.userId,
            originalMaxAge: prismaResult.originalMaxAge,
            maxAge: prismaResult.maxAge,
            signed: prismaResult.signed,
            expires: prismaResult.expires,
            httpOnly: prismaResult.httpOnly,
            path: prismaResult.path,
            domain: prismaResult.domain,
            secure: prismaResult.secure,
            sameSite: prismaResult.sameSite,
        };
    }

    async set(sessionId, session, callback){
        const originalMaxAge = session?.originalMaxAge ?? Date.now() + (1000 * 60 * 60 * 24 * 30);
        const maxAge = session?.maxAge ?? Date.now() + (1000 * 60 * 60 * 24 * 15);
        const signed = session?.signed ?? false;
        const expires = this.getExpires();
        const httpOnly = session?.httpOnly ?? true;
        const path = session?.path ?? "/";
        const domain = session?.domain ?? "";
        const secure = session?.secure ?? false;
        const sameSite = session?.sameSite ?? false;
        const userId = session?.userId.toString() ?? "-1";

        const result = await this.prisma.session.upsert({
            create: {
                sessionId,
                userId,
                originalMaxAge,
                maxAge,
                signed,
                expires,
                httpOnly,
                path,
                domain,
                secure,
                sameSite,
            },
            update: {
                originalMaxAge,
                maxAge,
                signed,
                expires,
                httpOnly,
                path,
                domain,
                secure,
                sameSite,
            },
            where: {
                sessionId,
            },
        });
        callback(null, result);

        if(!result) console.log("Something went wrong while creating or updating the session...");
    }

    async get(sessionId, callback){
        const result = await this.prisma.session.findUnique({
            where: {
                sessionId,
            },
        });
        callback(null, await result);
        return await result ? this._toObject(await result) : {};
    }

    async getByUserId(userId, callback){
        const result = await this.prisma.session.findFirst({
            where: {
                userId: userId.toString(),
            },
        });
        callback();

        return result ? this._toObject(result) : undefined;
    }

    async destroy(sessionId, callback){
        const result = await this.prisma.session.delete({
            where: {
                sessionId,
            },
        });

        if(!result) console.log("Something went wrong while deleting session...");
        callback();
    }

    async destroyByUserId(userId, callback){
        if(!userId) return;

        const result = await this.prisma.session.delete({
            where: {
                userId: userId.toString(),
            },
        });

        if(!result) console.log("Something went wrong while deleting session...");
        callback();
    }
}

util.inherits(PrismaStore, EventEmitter);
