import { Router } from 'express';
import { DatabaseService } from '../services/database.js';
import bcrypt from 'bcryptjs';

const router = Router();

// ============================================================================
// USERS ROUTES - FAMILY MEMBER MANAGEMENT
// ============================================================================

/**
 * GET /api/users
 * Get all family members
 */
router.get('/', async (req, res) => {
  try {
    const users = await DatabaseService.query(`
      SELECT id, username, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at ASC
    `);

    res.json({
      success: true,
      data: users.map((user: any) => ({
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
      })),
    });
  } catch (error: any) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error.message,
    });
  }
});

/**
 * POST /api/users
 * Create a new family member
 */
router.post('/', async (req, res) => {
  try {
    const { username, email, password = 'temp123', role = 'user' } = req.body;

    // Validate required fields
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username and email are required',
      });
    }

    // Check if user already exists
    const existingUser = await DatabaseService.queryOne(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this username or email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await DatabaseService.execute(`
      INSERT INTO users (id, username, email, password, role, preferences, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      username,
      email,
      hashedPassword,
      role,
      JSON.stringify({
        theme: 'light',
        language: 'en',
        timezone: process.env.TIMEZONE || 'America/New_York',
        notifications: {
          email: true,
          push: true,
          sound: true,
          deliveries: true,
          generator: true,
          weather: true,
        },
      }),
      now,
      now,
    ]);

    res.json({
      success: true,
      message: 'Family member created successfully',
      data: { id: userId },
    });
  } catch (error: any) {
    console.error('User creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create family member',
      details: error.message,
    });
  }
});

/**
 * PUT /api/users/:id
 * Update a family member
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;

    // Check if user exists
    const existingUser = await DatabaseService.queryOne(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'Family member not found',
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }

    // Always update the updated_at timestamp
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    // Add the ID for the WHERE clause
    values.push(id);

    await DatabaseService.execute(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    res.json({
      success: true,
      message: 'Family member updated successfully',
    });
  } catch (error: any) {
    console.error('User update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update family member',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a family member
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await DatabaseService.queryOne(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'Family member not found',
      });
    }

    // Check if user has assigned chores
    const assignedChores = await DatabaseService.query(
      'SELECT COUNT(*) as count FROM chores WHERE assigned_to = ? AND is_completed = 0',
      [id]
    );

    if (assignedChores[0]?.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete family member with pending chores. Please reassign or complete their chores first.',
      });
    }

    await DatabaseService.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Family member removed successfully',
    });
  } catch (error: any) {
    console.error('User deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove family member',
      details: error.message,
    });
  }
});

export default router;
