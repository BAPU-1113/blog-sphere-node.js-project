const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_blog_app_2026_xyz';
const TOKEN_EXPIRY = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper to generate JWT token with user id, username, email, and role
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

// Render Registration page
exports.getRegister = (req, res) => {
  if (req.user) return res.redirect('/articles');
  res.render('register', {
    title: 'Create Account - BlogSphere',
    error: null,
    formData: {},
  });
};

// Handle Registration
exports.postRegister = async (req, res) => {
  const { username, email, password, confirmPassword, role, bio } = req.body;

  try {
    // Validation
    if (!username || !email || !password) {
      return res.status(400).render('register', {
        title: 'Create Account - BlogSphere',
        error: 'Please fill in all required fields.',
        formData: { username, email, role, bio },
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('register', {
        title: 'Create Account - BlogSphere',
        error: 'Passwords do not match.',
        formData: { username, email, role, bio },
      });
    }

    if (password.length < 6) {
      return res.status(400).render('register', {
        title: 'Create Account - BlogSphere',
        error: 'Password must be at least 6 characters long.',
        formData: { username, email, role, bio },
      });
    }

    // Check existing username or email
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(400).render('register', {
        title: 'Create Account - BlogSphere',
        error: `${field} is already in use. Please use another one.`,
        formData: { username, email, role, bio },
      });
    }

    // Create user
    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      bio: bio && bio.trim() ? bio.trim() : undefined,
    });

    await newUser.save();

    // Issue JWT token and set in cookie
    const token = generateToken(newUser);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });

    return res.redirect('/articles?welcome=1');
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).render('register', {
      title: 'Create Account - BlogSphere',
      error: 'An unexpected error occurred during registration. Please try again.',
      formData: { username, email, role, bio },
    });
  }
};

// Render Login page
exports.getLogin = (req, res) => {
  if (req.user) return res.redirect('/articles');
  const redirect = req.query.redirect || '';
  res.render('login', {
    title: 'Sign In - BlogSphere',
    error: null,
    redirect,
    formData: {},
  });
};

// Handle Login
exports.postLogin = async (req, res) => {
  const { credential, password, redirect } = req.body;

  try {
    if (!credential || !password) {
      return res.status(400).render('login', {
        title: 'Sign In - BlogSphere',
        error: 'Please enter both your username/email and password.',
        redirect,
        formData: { credential },
      });
    }

    // Find user by either email or username (case-insensitive)
    const trimmedCredential = credential.trim();
    const escaped = trimmedCredential.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const user = await User.findOne({
      $or: [
        { email: trimmedCredential.toLowerCase() },
        { username: trimmedCredential },
        { username: new RegExp(`^${escaped}$`, 'i') },
      ],
    });

    if (!user) {
      return res.status(401).render('login', {
        title: 'Sign In - BlogSphere',
        error: 'Invalid credentials. User not found.',
        redirect,
        formData: { credential },
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).render('login', {
        title: 'Sign In - BlogSphere',
        error: 'Invalid credentials. Incorrect password.',
        redirect,
        formData: { credential },
      });
    }

    // Issue JWT token with role in payload
    const token = generateToken(user);

    // Send token as httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });

    // Redirect to specified redirect URL or articles
    const targetUrl = redirect && redirect.startsWith('/') ? redirect : '/articles';
    return res.redirect(targetUrl);
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).render('login', {
      title: 'Sign In - BlogSphere',
      error: 'An unexpected error occurred while logging in. Please try again.',
      redirect,
      formData: { credential },
    });
  }
};

// Handle Logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login?loggedOut=1');
};
