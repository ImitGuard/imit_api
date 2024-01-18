import Log from "../util/log.js";
import { prisma } from "../db.js";

export const deleteSessions = async function(){
    try{
        const deletedSessions = await prisma.sessions.deleteMany({
            where: {
                expiresat: {
                    lt: new Date(),
                },
            },
        });
        Log.info(`Purged ${deletedSessions.count} sessions...`);
    }
    catch(err){
        Log.error(err);
    }
};
