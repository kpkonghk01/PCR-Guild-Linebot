module.exports = {
  apps: [{
    name: '3000_PCR',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
};
