import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Mock authentication: find or create a user for testing
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        passwordHash: 'mock_hash_for_' + password
      });
    }

    return res.json({
      success: true,
      message: 'Logged in successfully (Mock)',
      user: {
        id: user.id,
        email: user.email
      },
      token: 'mock_jwt_token_for_user_' + user.id
    });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

export default router;
