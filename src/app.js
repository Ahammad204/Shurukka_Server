const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const incidentRoutes = require('./routes/incident.routes');
const lostFoundRoutes = require('./routes/lostfound.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const notificationRoutes = require('./routes/notification.routes');
const statsRoutes = require('./routes/stats.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://alartnagar.netlify.app'
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('CORS policy: Origin not allowed'))
    },
    credentials: true,
  })
);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LocalGuard API is running. Use /api endpoints.',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/emergency-contacts', emergencyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

app.use(errorHandler);

module.exports = app;
