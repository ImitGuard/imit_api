import { v4 as uuidv4 } from "uuid";
import * as argon2 from "argon2";
import { config } from "../config/config.js";
import { prisma } from "./db.js";
import Log from "./util/log.js";

const getUserId = async(sessionId) => {
    const sessions = await prisma.sessions.findMany();

    for(const session of sessions){
        const isMatch = await argon2.verify(session.id, sessionId, { secret: Buffer.from(config.database.session_secret) });
        if(isMatch) return session.userid;
    }

    return -1;
};

const createSession = async(userId) => {
    const sessionId = uuidv4();
    const hashedSessionId = await argon2.hash(sessionId, { secret: Buffer.from(config.database.session_secret) });
    const result = await prisma.sessions.create({
        data: {
            id: hashedSessionId,
            userid: userId,
        },
    });

    if(!result) return -1;

    return sessionId;
};

const getUserSessions = async(userId) => {
    const result = await prisma.sessions.findMany({
        where: {
            userid: userId,
        },
    });

    return result;
};

const deleteSession = async(userId, sessionId) => {
    const userSessions = await getUserSessions(userId);
    for(const session of userSessions){
        const isMatch = await argon2.verify(session.id, sessionId, { secret: Buffer.from(config.database.session_secret) });
        if(isMatch){
            Log.info("Found matching session, deleting it...");
            const result = await prisma.sessions.delete({
                where: {
                    id: session.id,
                },
            });
            if(!result) return {code: -1, status: "Something went wrong while deleting..."};
            return {code: 1, status: "Successfully deleted session..."};
        }
    }

    return {code: -1, status: "Something went wrong..."};
};

const deleteAllUserSessions = async(userId) => {
    await prisma.sessions.deleteMany({
        where: {
            userid: userId,
        },
    }).catch(error => console.error(error));
};

const validateSession = async(userId, sessionId) => {
    const sessions = await getUserSessions(userId);

    for(const session of sessions){
        const isMatch = await argon2.verify(session.id, sessionId, { secret: Buffer.from(config.database.session_secret) });
        if(isMatch) return true;
    }

    return false;
};

const getUserTypeBySession = async(sessionId) => {
    const userId = await getUserId(sessionId);
    const user = await prisma.users.findFirst({
        select: {
            accounttype: true,
        },
        where: {
            id: userId,
        },
    });
    return user?.accounttype;
};

export {getUserId, getUserSessions, createSession, deleteSession, deleteAllUserSessions, validateSession, getUserTypeBySession};
