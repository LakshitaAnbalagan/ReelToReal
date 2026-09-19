import { Router } from 'express';
import { createUser, findUserByEmail, getUserById } from '../services/userStore.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters.' });
    }
    const user = await createUser({ name, email, password });
    const token = `fake-jwt-token-${user._id}`;
    res.status(201).json({ user, token, message: 'Account created successfully!' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter your email and password.' });
    }
    const user = await findUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = `fake-jwt-token-${user._id}`;
    const safeUser = {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      avatar: user.avatar || ''
    };
    res.json({ user: safeUser, token, message: 'Welcome back!' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const userId = authHeader.replace('Bearer fake-jwt-token-', '');
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
