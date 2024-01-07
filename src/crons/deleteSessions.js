import Log from "../util/log.js";
import { sessionPool } from "../db.js";

export const deleteSessions = async function(){
    try{
        const deletedSessions = await sessionPool.query("DELETE FROM sessions WHERE expiresAt < NOW()");
        Log.info(`Purged ${deletedSessions.rowCount} sessions...`);
    }
    catch(err){
        Log.error(err);
    }
};
