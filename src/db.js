// import pkg from "pg";
import { PrismaClient } from "@prisma/client";
// import { config } from "../config/config.js";

export const prisma = new PrismaClient();

// export const sessionPool = new pkg.Pool({
//     user: config.database.username,
//     password: config.database.password,
//     host: config.database.host,
//     port: Number(config.database.port),
//     database: config.database.database,
// });
