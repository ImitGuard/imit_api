import User from "./user.js";
import Report from "./reports.js";
import Admin from "./admin.js";

import Log from "../util/log.js";

const registerUserRoutes = async(fastify) => {
    const user = new User(fastify);
    await user.get();
    await user.register();
    await user.login();
    await user.logout();
    await user.delete();
    await user.updateAccount();
    await user.updatePassword();

    Log.info("Registered user routes...");
};

const registerReportRoutes = async(fastify) => {
    const report = new Report(fastify);
    await report.get();
    await report.create();
    await report.delete();

    Log.info("Registered report routes...");
};

const registerAdminRoutes = async(fastify) => {
    const admin = new Admin(fastify);
    await admin.get();

    Log.info("Registered admin routes...");
};

export const registerRoutes = async(fastify) => {
    Log.wait("Registering routes...");
    await registerUserRoutes(fastify);
    await registerReportRoutes(fastify);
    await registerAdminRoutes(fastify);
    Log.done("Registered routes...");
};
