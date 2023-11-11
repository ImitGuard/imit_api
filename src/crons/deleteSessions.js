import pkg from "pg";
import { config } from "../../config/config.js";
import Log from "../util/log.js";

const pool = new pkg.Pool({
    user: config.database.username,
    password: config.database.password,
    host: config.database.host,
    database: config.database.database,
});

export const deleteSessions = async function(){
    try{
        const deletedSessions = await pool.query("DELETE FROM sessions WHERE expiresAt < NOW()");
        Log.info(`Purged ${deletedSessions.rowCount} sessions...`);
    }
    catch(err){
        Log.error(err);
    }
};
