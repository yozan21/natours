const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:💥', err.name, ',', err.message);
  console.error('Shutting down...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

// Connect to MongoDB
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose.connect(DB).then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server has started on port:${port}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.name, ',', err.message);
  server.close(() => {
    console.error('Shutting down...');
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Sutting down gracefully.');
  server.close(() => {
    console.log('Process terminated');
  });
});
