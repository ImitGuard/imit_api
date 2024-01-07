import { v4 as uuidv4 } from "uuid";
import * as argon2 from "argon2";
import { config } from "../config/config.js";
import { sessionPool as pool } from "./db.js";
import Log from "./util/log.js";

const initDatabase = async() =>{
    await pool.query(`CREATE TABLE IF NOT EXISTS sessions (id VARCHAR(255) PRIMARY KEY, 
            userId INT NOT NULL, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expiresAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '${config.sessions.cron.expire} minutes')`);
};

const getUserId = async(sessionId) => {
    const sessions = await pool.query("SELECT * FROM sessions");

    for(const session of sessions.rows){
        const isMatch = await argon2.verify(session.id, sessionId, { secret: Buffer.from(config.database.session_secret) });
        if(isMatch) return session.userid;
    }

    return -1;
};

const createSession = async(userId) => {
    const sessionId = uuidv4();
    const hashedSessionId = await argon2.hash(sessionId, { secret: Buffer.from(config.database.session_secret) });
    await pool.query("INSERT INTO sessions (id, userId) VALUES ($1, $2)", [hashedSessionId, userId]);
    return sessionId;
};

const getUserSessions = async(userId) => {
    const result = await pool.query("SELECT * FROM sessions WHERE userId = $1", [userId]);
    return result.rows;
};

const deleteSession = async(userId, sessionId) => {
    const userSessions = await getUserSessions(userId);
    for(const session of userSessions){
        const isMatch = await argon2.verify(session.id, sessionId, { secret: Buffer.from(config.database.session_secret) });
        if(isMatch){
            Log.info("Found matching session, deleting it...");
            await pool.query("DELETE FROM sessions WHERE id = $1", [session.id]);
            return {code: 1, status: "Successfully deleted session..."};
        }
    }

    return {code: -1, status: "Something went wrong..."};
};

const deleteAllUserSessions = async(userId) => {
    await pool.query("DELETE FROM sessions WHERE userId = $1", [userId]);
};

const validateSession = async(userId, sessionId) => {
    const sessions = await pool.query("SELECT * FROM sessions WHERE userid = $1", [userId]);

    for(const session of sessions.rows){
        const isMatch = await argon2.verify(session.id, sessionId, { secret: Buffer.from(config.database.session_secret) });
        if(isMatch) return true;
    }

    return false;
};

const getUserTypeBySession = async(sessionId) => {
    const userId = await getUserId(sessionId);
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    return user.rows[0]?.accounttype;
};

export {initDatabase, getUserId, getUserSessions, createSession, deleteSession, deleteAllUserSessions, validateSession, getUserTypeBySession};
