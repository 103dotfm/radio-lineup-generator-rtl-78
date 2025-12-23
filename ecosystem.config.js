module.exports = {
  apps: [
    {
      name: 'radio-api',
      script: './server/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5174
      },
      error_file: './logs/radio-api-error.log',
      out_file: './logs/radio-api-out.log',
      log_file: './logs/radio-api-combined.log',
      time: true
    },
    {
      name: 'email-scheduler',
      script: './server/services/email-scheduler-standalone.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/email-scheduler-error.log',
      out_file: './logs/email-scheduler-out.log',
      log_file: './logs/email-scheduler-combined.log',
      time: true
    }
  ]
};
