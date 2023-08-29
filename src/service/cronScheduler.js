import pkg from "pg";
import cron from "node-cron";
import { config } from "../../config/config.js";
import Log from "../util/log.js";

import { deleteSessions } from "../crons/deleteSessions.js";

const pool = new pkg.Pool({
  user: config.database.username,
  password: config.database.password,
  host: config.database.host,
  database: config.database.database,
});

const scheduleCrons = async function(){
  Log.wait("Scheduling crons...");
  // session cron
  cron.schedule(`*/${config.sessions.cron.interval} * * * *`, async function(){
    deleteSessions();
  });

  // daily cron for deleting old logs
  // cron.schedule("0 0 * * *", () => {
  //   removeOldLogs();
  // });

  const cronCount = cron.getTasks().size;
  Log.done("Scheduled " + cronCount + " Crons.");

  await deleteSessions();
  // await removeOldLogs();
};

export {pool, scheduleCrons};
