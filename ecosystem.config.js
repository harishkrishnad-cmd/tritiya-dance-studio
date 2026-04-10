module.exports = {
  apps: [{
    name: 'tritiya',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '400M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      // SQLite stored outside the app folder so git pull never touches it
      DB_PATH: '/home/ubuntu/data/school.db',
    },
  }],
};
