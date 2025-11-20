module.exports = {
  apps: [
    {
      name: 'query-service',
      script: '/usr/local/bin/uvicorn',
      args: 'main:app --host 127.0.0.1 --port 2025 --workers 2 --proxy-headers',
      cwd: '/home/saktiegi08/apiendpoint/app',
      interpreter: 'none', // run the binary directly
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        ENVIRONMENT: 'production',
        API_PORT: 2025,
        COMMAND_PORT: 3108
      },
      env_production: {
        ENVIRONMENT: 'production'
      }
    }
  ]
};
