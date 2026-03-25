module.exports = {
  apps: [
    {
      name: "beki",
      script: "node_modules/.bin/next",
      args: "start -p 3365",
      cwd: "/Users/noh/cv3_hr",
      env: {
        NODE_ENV: "production",
        PORT: "3365",
      },
    },
  ],
};
