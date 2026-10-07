const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_blog_app_2026_xyz';

// Middleware to detect logged-in user from JWT cookie and attach to req & res.locals
const authenticateUser = async (req, res, next) => {
  const token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    req.user = null;
    res.locals.currentUser = null;
    res.locals.isAuthenticated = false;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach decoded user info
    req.user = decoded;
    res.locals.currentUser = decoded;
    res.locals.isAuthenticated = true;
    next();
  } catch (error) {
    // If token is expired or malformed, clear cookie
    res.clearCookie('token');
    req.user = null;
    res.locals.currentUser = null;
    res.locals.isAuthenticated = false;
    next();
  }
};

// Guard middleware: Require user to be authenticated
const requireAuth = (req, res, next) => {
  if (!req.user) {
    // Store original destination to redirect after login
    const redirectUrl = req.originalUrl ? `?redirect=${encodeURIComponent(req.originalUrl)}` : '';
    return res.redirect(`/login${redirectUrl}`);
  }
  next();
};

// Guard middleware: Require specific role(s) (e.g. 'admin')
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect('/login');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).render('error', {
        title: '403 - Access Forbidden',
        statusCode: 403,
        message: 'Forbidden: You do not have sufficient permissions to access this resource.',
        details: `Your current role is "${req.user.role}". This action requires one of: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  requireAuth,
  requireRole,
};
