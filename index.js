const dotenv = require('dotenv');
dotenv.config();
const app = require('./src/app');
const connectDB = require('./src/config/db');



const PORT = process.env.PORT || 5000;

/**
 * Start the HTTP server after MongoDB connects.
 */
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`LocalGuard server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Fatal error starting the server:', error);
  process.exit(1);
});
