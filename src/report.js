import { sessionPool as pool } from "./db.js";

const initDatabase = async() => {
    await pool.query("CREATE TABLE IF NOT EXISTS reports (id VARCHAR(255)," +
                " authorid INT NOT NULL, createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                "title VARCHAR(255), content TEXT, ");
};

export {
    initDatabase,
};
