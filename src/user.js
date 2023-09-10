import pkg from "pg";
import * as argon2 from "argon2";

import * as session from "./session.js";
import { config } from "../config/config.js";
import Log from "./util/log.js";

const pool = new pkg.Pool({
  user: config.database.username,
  password: config.database.password,
  host: config.database.host,
  database: config.database.database,
});

const validateEmail = function(email){
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

const usernameExists = async function(username){
  try {
    const res = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if(res.rows.length > 0) return true;
  }
  catch(err){
    Log.error(err);
  }

  return false;
};

const emailExists = async function(email){
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

/*
  username: name of the user
  email: email of the user
  password: password of the user
  accountType: type of the account (0: admin, 1: moderator, 2: Creator Manager, 3: Creator, 4: Reporter)

  returns:
    1: successfully created user
    -1: something went wrong
    -2: email already exists
    -3: username already exists
*/
const createUser = async function(username, email, password){
  try{
    await pool.query("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, accountType INT NOT NULL, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

    if(await emailExists(email)) return {code: -2, status: "Email already exists..."};
    if(await usernameExists(username)) return {code: -3, status: "Username already exists..."};

    await pool.query("INSERT INTO users (username, email, password, accountType) VALUES ($1, $2, $3, $4)", [username, email, await password, 4]);
    return {code: 1, status: "Successfully registered..."};
  }
  catch(err){
    Log.error(err);
  }

  return {code: -1, status: "Something went wrong..."};
};

const deleteUser = async function(userId){
  try{
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await session.deleteAllUserSessions(pool, userId);
    return {code: 1, status: "Successfully deleted user..."};
  }
  catch(err){
    Log.error(err);
  }

  return {code: -1, status: "Something went wrong..."};
};

const getUserByName = async function(username){
  try{
    const res = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if(res.rows.length === 0) return {code: -1, status: "Invalid username..."};

    return {code: 1, status: "Successfully got user...", user: res.rows[0]};
  }
  catch(err){
    Log.error(err);
  }

  return {code: -1, status: "Something went wrong..."};
};

const getUserById = async function(userId){
  try{
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if(res.rows.length === 0) return {code: -1, status: "Invalid user id..."};

    return {code: 1, status: "Successfully got user...", user: res.rows[0]};
  }
  catch(err){
    Log.error(err);
  }

  return {code: -1, status: "Something went wrong..."};
};

const deleteAccount = async function(sessionId, deleterId, userId, password){
  if((userId !== undefined && userId !== "") && (password !== undefined && password !== "") && (deleterId === userId)){
    // case when user deletes own account
    const user = await getUserById(userId);
    if(await argon2.verify(user.user.password, password, { secret: Buffer.from(config.database.password_secret) })){
      const deleteResult = await deleteUser(userId);
      return { code: deleteResult.code, status: deleteResult.status};
    }
  }
  else if((userId !== undefined || userId !== "") && (deleterId !== userId)){
    // case when admin deletes account
    const user = await getUserById(userId);
    // if user is admin account, don't delete
    if(user.user.accounttype === 0) return {code: -9, status: "Not authorized"};

    const validSession = await session.validateSession(pool, deleterId, sessionId);
    if(!validSession) return {code: -4, status: "Invalid session..."};
    if(await session.getUserTypeBySession(pool, sessionId) !== 0) return {code: -9, status: "Not authorized"};
    const deleterUser = await getUserById(deleterId);
    if(deleterUser.user.accounttype !== 0) return {code: -9, status: "Not authorized"};
    const deleteResult = await deleteUser(userId);
    return { code: deleteResult.code, status: deleteResult.status};
  }

  return {code: -1, status: "Something went wrong..."};
};

const login = async function(username, password){
  await session.initDatabase(pool);
  try{
    const res = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if(res.rows.length === 0) return {sessionId: -1, code: -1, status: "Invalid username..."};

    const user = res.rows[0];
    if(await argon2.verify(user.password, password, { secret: Buffer.from(config.database.password_secret) })){
      const sessionId = session.createSession(pool, user.id);
      return {sessionId, code: 1, status: "Successfully logged in..."};
    }

    return {sessionId: -1, code: -2, status: "Invalid password..."};
  }
  catch(err){
    Log.error(err);
  }

  return {sessionId: -1, code: -3, status: "Something went wrong..."};
};

const logout = async function(userId, sessionId){
  try{
    const result = await session.deleteSession(pool, userId, sessionId);

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

const changeEmail = async function(userId, email, password){
  try{
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if(res.rows.length === 0) return {code: -1, status: "Invalid user id..."};
    if(email === res.rows[0].email) return {code: -2, status: "Email is the same..."};

    const user = res.rows[0];
    if(await argon2.verify(user.password, password, { secret: Buffer.from(config.database.password_secret) })){
      await pool.query("UPDATE users SET email = $1 WHERE id = $2", [email, userId]);
      return {code: 1, status: "Successfully changed email..."};
    }

    return {code: -3, status: "Invalid password..."};
  }
  catch(err){
    Log.error(err);
  }

  return {code: -4, status: "Something went wrong..."};
};

const changeUsername = async function(userId, newUsername, password){
  try{
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if(res.rows.length === 0) return {code: -1, status: "Invalid user..."};
    if(newUsername === res.rows[0].username) return {code: -2, status: "Username is the same..."};

    const user = res.rows[0];
    if(await argon2.verify(user.password, password, { secret: Buffer.from(config.database.password_secret) })){
      await pool.query("UPDATE users SET username = $1 WHERE id = $2", [newUsername, userId]);
      return {code: 1, status: "Successfully changed username..."};
    }

    return {code: -3, status: "Invalid password..."};
  }
  catch(err){
    Log.error(err);
  }

  return {code: -4, status: "Something went wrong..."};
};

const changePassword = async function(userId, password, newPassword){
  try{
    const user = await getUserById(userId);
    if(await argon2.verify(user.user.password, password, { secret: Buffer.from(config.database.password_secret) })){
      if(await argon2.verify(user.user.password, newPassword, { secret: Buffer.from(config.database.password_secret) })) return {code: -1, status: "New password is the same..."};
      const hashedNewPassword = await argon2.hash(newPassword, { secret: Buffer.from(config.database.password_secret) });

      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedNewPassword, userId]);
      return {code: 1, status: "Successfully changed password..."};
    }

    return {code: -2, status: "Invalid password..."};
  }
  catch(err){
    Log.error(err);
  }

  return {code: -3, status: "Something went wrong..."};
};

const updateAccount = async function(userId, username, email, password){
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

const updateAccountType = async function(userId, changerId, sessionId, accountType){
  if(userId === undefined || userId === "") return {code: -1, status: "Invalid user id..."};
  if(changerId === undefined || changerId === "") return {code: -1, status: "Invalid changer id..."};
  if(sessionId === undefined || sessionId === "") return {code: -1, status: "Invalid session id..."};
  if(accountType === undefined || accountType === "") return {code: -1, status: "Invalid account type..."};

  const validSession = await session.validateSession(pool, changerId, sessionId);
  if(!validSession) return {code: -4, status: "Invalid session..."};
  const changerUser = await getUserById(changerId);
  if(changerUser.user.accounttype !== 0) return {code: -9, status: "Not authorized"};

  pool.query("UPDATE users SET accountType = $1 WHERE id = $2", [accountType, userId]);
  return {code: 1, status: "Successfully updated account type..."};
};

export {pool,
  logout,
  deleteUser,
  userExists,
  deleteAccount,
  createUser,
  login,
  emailExists,
  usernameExists,
  validateEmail,
  changeEmail,
  changeUsername,
  changePassword,
  updateAccount,
  getUserByName,
  getUserById,
  updateAccountType,
};
