export default {
  server: {
    port: 3000,
  },
  database: {
    username: "",
    password: "",
    host: "",
    database: "",
    port: "",
    password_secret: "",
    session_secret: "",
  },
  sessions: {
    cron: {
      enabled: true,
      interval: 20, // in minutes
      expire: 30, // in minutes
    },
  },
};
