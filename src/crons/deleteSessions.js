import Log from "../util/log.js";
import { prisma } from "../db.js";

export const deleteSessions = async function(){
    try{
        // ugly workaround since there is no native way to define the timezone in prisma
        const updatedDate = new Date(new Date().toLocaleString("sv-SE", { timeZone: "UTC" }));
        Log.info("" + updatedDate);
        const deletedSessions = await prisma.sessions.deleteMany({
            where: {
                expiresat: {
                    gt: updatedDate,
                },
            },
        });
        Log.info(`Purged ${deletedSessions.count} sessions...`);
    }
    catch(err){
        Log.error(err);
    }
};
