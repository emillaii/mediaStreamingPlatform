import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const query = `
      SELECT id, email, display_name AS "displayName", role, created_at AS "createdAt"
      FROM users
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json({ users: rows });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email, password, displayName, role = 'member' } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      return res.status(400).json({ error: 'email must not be empty' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, password_hash, display_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, display_name AS "displayName", role, created_at AS "createdAt"
    `;

    try {
      const { rows } = await pool.query(query, [trimmedEmail, passwordHash, displayName ?? null, role]);
      return res.status(201).json({ user: rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      throw error;
    }
  })
);

export default router;
