import * as argon2 from "argon2";

import { userPool as pool } from "./db.js";
import { config } from "../config/config.js";
import * as session from "./session.js";
import Log from "./util/log.js";

const PASSWORD_SECRET = Buffer.from(config.database.password_secret);

const validateEmail = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
};

const usernameExists = async(username) => {
    try {
        const res = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if(res.rows.length > 0) return true;
    }
    catch(err){
        Log.error(err);
    }

    return false;
};

const emailExists = async(email) => {
    if(!validateEmail(email)) return false;

    try {
        const res = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if(res.rows.length > 0) return true;
    }
    catch(err){
        Log.error(err);
    }
    return false;
};

const userExists = async function(userId){
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    return result.rows.length > 0;
};

const createUser = async(username, email, password) => {
    try{
        await pool.query("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) NOT NULL, " +
            "email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, accountType INT NOT NULL, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

        if(await emailExists(email)) return {code: -6, status: "Email already exists..."};
        if(await usernameExists(username)) return {code: -5, status: "Username already exists..."};

        await pool.query("INSERT INTO users (username, email, password, accountType) VALUES ($1, $2, $3, $4)",
            [username, email, await password, 4]);
        return {code: 1, status: "Successfully registered..."};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong..."};
};

const deleteUser = async(userId) => {
    try{
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        await session.deleteAllUserSessions(userId);
        return {code: 1, status: "Successfully deleted user..."};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong..."};
};

// doesnt need more verification because you verify when you call the method and the endpoint will never be public
const getUserByName = async(username, requesterId) => {
    try{
        const requesterRes = await pool.query("select * from users where id = $1", [requesterId]);
        if(requesterRes.rows.length === 0) return {code: -3, status: "Invalid Requester"};
        if(requesterRes.rows[0].accounttype !== 4) return {code: -9, status: "Not authorized"};


        const res = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if(res.rows.length === 0) return {code: -8, status: "Invalid username..."};

        return {code: 1, status: "Successfully got user...", user: res.rows[0]};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong..."};
};

const getUserById = async(userId) => {
    try{
        const res = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if(res.rows.length === 0) return {code: -1, status: "Invalid user id..."};

        return {code: 1, status: "Successfully got user...", user: res.rows[0]};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong...", user: undefined};
};

const isAdmin = async(userId) => {
    const adminUser = await getUserById(userId);
    if(adminUser === undefined) return {code: -3, status: "Admin User not found..."};
    if(adminUser.user.accounttype !== 0) return {code: -9, status: "Not authorized..."};

    return {code: 1, status: "Is Admin"};
};

const isValidSession = async(userId, sessionId) => {
    const validSession = await session.validateSession(userId, sessionId);
    if(!validSession) return {code: -7, status: "Invalid session..."};

    return {code: 1, status: "valid session..."};
};

const getIdByName = async(username) => {
    try{
        const res = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
        if(res.rows.length === 0) return {code: -1, status: "Invalid username..."};

        return {code: 1, status: "Successfully got user id...", id: res?.rows[0]?.id};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong..."};
};

const deleteAccount = async(sessionId, adminId, userId, password) => {
    if(((userId !== undefined && userId !== ""))
        && (password !== undefined && password !== "")
        && ((adminId === userId || adminId === undefined || adminId === ""))){
        // case when user deletes own account
        const user = await getUserById(userId);
        if(!user) return {code: -3, status: "Invalid user..."};
        if(await argon2.verify(user.user.password, password, { secret: PASSWORD_SECRET })){
            const deleteResult = await deleteUser(userId);
            return { code: deleteResult.code, status: deleteResult.status};
        }
        return {code: -2, status: "Invalid password..."};
    }
    else if((userId !== undefined && userId !== "") && (adminId !== undefined && adminId !== "") && (adminId !== userId)){
        // case when admin deletes account
        // check if is admin
        const userIsAdmin = isAdmin(adminId);
        if((await userIsAdmin).code !== 1) return userIsAdmin;

        const toDeleteUser = await getUserById(userId);
        // if user is admin account, don't delete
        if(toDeleteUser.user.accounttype === 0) return {code: -9, status: "Not authorized, User is admin"};

        // check if session of admin is valid, otherwise logout
        const validSession = await isValidSession(adminId, sessionId);
        if(validSession.code !== 1) return validSession;

        const deleteResult = await deleteUser(userId);
        return { code: deleteResult.code, status: deleteResult.status};
    }

    return {code: -1, status: "Something went wrong..."};
};

const loginUser = async(username, password) => {
    await session.initDatabase();
    try{
        const res = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if(res.rows.length === 0) return {sessionId: -1, code: -1, status: "Invalid username..."};

        const user = res.rows[0];
        if(await argon2.verify(user.password, password, { secret: Buffer.from(PASSWORD_SECRET) })){
            const sessionId = session.createSession(user.id);
            return {sessionId, code: 1, status: "Successfully logged in..."};
        }

        return {sessionId: -1, code: -2, status: "Invalid password..."};
    }
    catch(err){
        Log.error(err);
    }

    return {sessionId: -1, code: -1, status: "Something went wrong..."};
};

const logout = async(userId, sessionId) => {
    try{
        const result = await session.deleteSession(userId, sessionId);

        if(result.code === 1){
            return {code: 1, status: "Successfully logged out..."};
        }
        return {code: -1, status: "No session found..."};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong..."};
};

const changeEmail = async(userId, email, password) => {
    try{
        const res = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if(res.rows.length === 0) return {code: -1, status: "Invalid user id..."};
        if(email === res.rows[0].email) return {code: -2, status: "Email is the same..."};

        const user = res.rows[0];
        if(await argon2.verify(user.password, password, { secret: PASSWORD_SECRET })){
            await pool.query("UPDATE users SET email = $1 WHERE id = $2", [email, userId]);
            return {code: 1, status: "Successfully changed email..."};
        }

        return {code: -2, status: "Invalid password..."};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong..."};
};

const changeUsername = async(userId, newUsername, password) => {
    try{
        const res = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if(res.rows.length === 0) return {code: -3, status: "Invalid user..."};
        if(newUsername === res.rows[0].username) return {code: -4, status: "Username is the same..."};

        const user = res.rows[0];
        if(await argon2.verify(user.password, password, { secret: PASSWORD_SECRET })){
            await pool.query("UPDATE users SET username = $1 WHERE id = $2", [newUsername, userId]);
            return {code: 1, status: "Successfully changed username..."};
        }

        return {code: -2, status: "Invalid password..."};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong..."};
};

const changePassword = async(userId, password, newPassword) => {
    try{
        const user = await getUserById(userId);
        if(await argon2.verify(user.user.password, password, { secret: PASSWORD_SECRET })){
            if(await argon2.verify(user.user.password, newPassword, { secret: PASSWORD_SECRET })) return {code: -1, status: "New password is the same..."};
            const hashedNewPassword = await argon2.hash(newPassword, { secret: PASSWORD_SECRET });

            await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedNewPassword, userId]);
            return {code: 1, status: "Successfully changed password..."};
        }

        return {code: -2, status: "Invalid password..."};
    }
    catch(err){
        Log.error(err);
    }

    return {code: -1, status: "Something went wrong..."};
};

const updateAccount = async(userId, username, email, password) => {
    if(userId === undefined || userId === "") return {code: -1, status: "Invalid user id..."};
    if(password === undefined || password === "") return {code: -1, status: "Invalid password..."};

    if(email !== undefined && email !== ""){
        if(!validateEmail(email)) return {code: -1, status: "Invalid email format..."};
        const emailChange = await changeEmail(userId, email, password);
        if(emailChange.code !== -4) return {code: emailChange.code, status: emailChange.status};
    }

    if(username !== undefined && username !== ""){
        const usernameChange = await changeUsername(userId, username, password);
        if(usernameChange.code !== -4) return {code: usernameChange.code, status: usernameChange.status};
    }

    return {code: -1, status: "Something went wrong or nothing was updated..."};
};

const updateAccountType = async(userId, changerId, sessionId, accountType) => {
    if(userId === undefined || userId === "") return {code: -1, status: "Invalid user id..."};
    if(changerId === undefined || changerId === "") return {code: -1, status: "Invalid changer id..."};
    if(sessionId === undefined || sessionId === "") return {code: -1, status: "Invalid session id..."};
    if(accountType === undefined || accountType === "") return {code: -1, status: "Invalid account type..."};

    const validSession = await session.validateSession(changerId, sessionId);
    if(!validSession) return {code: -7, status: "Invalid session..."};

    const changerUser = await getUserById(changerId);
    if(changerUser.user.accounttype !== 0) return {code: -9, status: "Not authorized"};

    pool.query("UPDATE users SET accountType = $1 WHERE id = $2", [accountType, userId]);
    return {code: 1, status: "Successfully updated account type..."};
};

export {
    logout,
    deleteUser,
    userExists,
    deleteAccount,
    createUser,
    loginUser,
    emailExists,
    usernameExists,
    validateEmail,
    changeEmail,
    changeUsername,
    changePassword,
    updateAccount,
    getUserByName,
    getUserById,
    getIdByName,
    updateAccountType,
};
