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
      interval: 1, // in minutes
      expire: 2, // in minutes
    },
  },
};
