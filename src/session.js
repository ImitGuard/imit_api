import { v4 as uuidv4 } from "uuid";
import * as argon2 from "argon2";
import { config } from "../config/config.js";
import Log from "./util/log.js";

const initDatabase = async function(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions (id VARCHAR(255) PRIMARY KEY, userId INT NOT NULL, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expiresAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '${config.sessions.cron.expire} minutes')`);
};

const getUserId = async function(pool, sessionId){
  const hashedSessionId = await argon2.hash(sessionId, { secret: Buffer.from(config.database.session_secret) });
  const result = await pool.query("SELECT * FROM sessions WHERE id = $1", [hashedSessionId]);
  if(result.rows.length === 0) return -1;
  return result.rows[0].userid;
};

const createSession = async function(pool, userId){
  const sessionId = uuidv4();
  const hashedSessionId = await argon2.hash(sessionId, { secret: Buffer.from(config.database.session_secret) });
  await pool.query("INSERT INTO sessions (id, userId) VALUES ($1, $2)", [hashedSessionId, userId]);
  return sessionId;
};

const getUserSessions = async function(pool, userId){
  const result = await pool.query("SELECT * FROM sessions WHERE userId = $1", [userId]);
  return result.rows;
};

const deleteSession = async function(pool, userId, sessionId){
  const userSessions = await getUserSessions(pool, userId);
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

const deleteAllUserSessions = async function(pool, userId){
  await pool.query("DELETE FROM sessions WHERE userId = $1", [userId]);
};

const validateSession = async function(pool, id){
  const hashedSessionId = await argon2.hash(id, { secret: Buffer.from(config.database.session_secret) });
  const result = await pool.query("SELECT * FROM sessions WHERE id = $1", [hashedSessionId]);
  return result.rows.length > 0;
};

export {initDatabase, getUserId, getUserSessions, createSession, deleteSession, deleteAllUserSessions, validateSession};
