import pkg from "pg";
import { config } from "../config/config.js";

export const userPool = new pkg.Pool({
    user: config.database.username,
    password: config.database.password,
    host: config.database.host,
    database: config.database.database,
});

export const sessionPool = new pkg.Pool({
    user: config.database.username,
    password: config.database.password,
    host: config.database.host,
    database: config.database.database,
});

export const reportPool = new pkg.Pool({
    user: config.database.username,
    password: config.database.password,
    host: config.database.host,
    database: config.database.database,
});
