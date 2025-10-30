import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post(
  '/super-admin/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const query = 'SELECT id, email, password_hash FROM super_admins WHERE LOWER(email) = $1 LIMIT 1';
    const { rows } = await pool.query(query, [trimmedEmail]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const passwordMatches = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(200).json({
      message: 'Super admin authenticated',
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  })
);

export default router;
