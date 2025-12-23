import { startEmailScheduler } from './email-scheduler.js';

console.log('Starting Email Scheduler Service...');

// Start the email scheduler
startEmailScheduler();

// Keep the process running
process.on('SIGINT', () => {
  console.log('Email Scheduler Service received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Email Scheduler Service received SIGTERM, shutting down...');
  process.exit(0);
});

console.log('Email Scheduler Service is running...');
