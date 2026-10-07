require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const connectDB = require('./config/db');
const { authenticateUser } = require('./middleware/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const articleRoutes = require('./routes/articleRoutes');
const commentRoutes = require('./routes/commentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// Core Middlewares
app.use(cookieParser(process.env.COOKIE_SECRET || 'blog_secret_cookie_parser_key'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

// Global User Extraction & Authentication Middleware
app.use(authenticateUser);

// Global Template Variables
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.appName = 'BlogSphere';
  next();
});

// Mount Application Routes
app.use('/', authRoutes);
app.use('/', articleRoutes);
app.use('/', commentRoutes);

// Home route redirect
app.get('/', (req, res) => {
  res.redirect('/articles');
});

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    statusCode: 404,
    message: 'Oops! The page you were looking for could not be found.',
    details: `No route matches: ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).render('error', {
    title: `${err.status || 500} - Error`,
    statusCode: err.status || 500,
    message: 'An internal server error occurred.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start Express Server after establishing database connection
const startServer = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`🚀 BlogSphere server is running on http://localhost:${PORT}`);
    console.log(`✨ Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
