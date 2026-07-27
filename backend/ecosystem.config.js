module.exports = {
  apps: [
    {
      name: "jts-crm-backend",
      script: "./src/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      },
      env_development: {
        NODE_ENV: "development"
      }
    }
  ]
};
