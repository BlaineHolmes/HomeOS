import { Router } from 'express';
import { DatabaseService } from '../services/database.js';

const router = Router();

// ============================================================================
// CHORES ROUTES - FAMILY CHORE MANAGEMENT WITH GAMIFICATION
// ============================================================================

/**
 * GET /api/chores
 * Get all chores with categories and statistics
 */
router.get('/', async (req, res) => {
  try {
    // Get all chores with user information
    const chores = await DatabaseService.query(`
      SELECT
        c.*,
        u.username as assigned_to_name,
        cu.username as completed_by_name
      FROM chores c
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN users cu ON c.completed_by = cu.id
      ORDER BY c.is_completed ASC, c.due_date ASC, c.created_at DESC
    `);

    // Get category statistics
    const categoryStats = await DatabaseService.query(`
      SELECT
        category,
        COUNT(*) as total,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN is_completed = 0 THEN 1 ELSE 0 END) as pending
      FROM chores
      GROUP BY category
    `);

    // Create category objects with icons and colors
    const categories = categoryStats.map((stat: any) => {
      const categoryInfo = getCategoryInfo(stat.category);
      return {
        id: stat.category,
        name: categoryInfo.name,
        icon: categoryInfo.icon,
        color: categoryInfo.color,
        total: stat.total,
        completed: stat.completed,
        pending: stat.pending,
      };
    });

    // Calculate totals
    const total = chores.length;
    const completed = chores.filter((c: any) => c.is_completed).length;
    const totalPoints = chores.reduce((sum: number, c: any) => sum + c.points, 0);
    const completedPoints = chores
      .filter((c: any) => c.is_completed)
      .reduce((sum: number, c: any) => sum + c.points, 0);

    res.json({
      success: true,
      data: {
        chores: chores.map((chore: any) => ({
          ...chore,
          is_completed: Boolean(chore.is_completed),
          due_date: chore.due_date ? new Date(chore.due_date) : null,
          completed_at: chore.completed_at ? new Date(chore.completed_at) : null,
          created_at: new Date(chore.created_at),
          updated_at: new Date(chore.updated_at),
          recurrence: chore.recurrence ? JSON.parse(chore.recurrence) : null,
        })),
        categories,
        total,
        completed,
        total_points: totalPoints,
        completed_points: completedPoints,
      },
    });
  } catch (error: any) {
    console.error('Chores fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chores',
      details: error.message,
    });
  }
});

/**
 * GET /api/chores/assignments
 * Get chore assignments and user statistics
 */
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await DatabaseService.query(`
      SELECT
        u.id as user_id,
        u.username as user_name,
        COUNT(c.id) as total_chores,
        SUM(CASE WHEN c.is_completed = 1 THEN 1 ELSE 0 END) as completed_chores,
        SUM(c.points) as total_points,
        SUM(CASE WHEN c.is_completed = 1 THEN c.points ELSE 0 END) as completed_points,
        CASE
          WHEN COUNT(c.id) > 0
          THEN ROUND((SUM(CASE WHEN c.is_completed = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(c.id), 2)
          ELSE 0
        END as completion_rate
      FROM users u
      LEFT JOIN chores c ON u.id = c.assigned_to
      WHERE u.role IN ('user', 'child', 'admin')
      GROUP BY u.id, u.username
      HAVING COUNT(c.id) > 0
      ORDER BY completion_rate DESC, completed_points DESC
    `);

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    console.error('Assignments fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignments',
      details: error.message,
    });
  }
});

/**
 * POST /api/chores
 * Create a new chore
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      assigned_to,
      due_date,
      points = 10,
      category = 'other',
      recurrence,
      created_by,
    } = req.body;

    // Validate required fields
    if (!title || !assigned_to) {
      return res.status(400).json({
        success: false,
        error: 'Title and assigned_to are required',
      });
    }

    // Verify assigned user exists
    const assignedUser = await DatabaseService.queryOne(
      'SELECT id FROM users WHERE id = ?',
      [assigned_to]
    );

    if (!assignedUser) {
      return res.status(400).json({
        success: false,
        error: 'Assigned user not found',
      });
    }

    const choreId = `chore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await DatabaseService.execute(`
      INSERT INTO chores (
        id, title, description, assigned_to, due_date, points,
        category, recurrence, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      choreId,
      title,
      description || null,
      assigned_to,
      due_date || null,
      points,
      category,
      recurrence ? JSON.stringify(recurrence) : null,
      now,
      now,
    ]);

    res.json({
      success: true,
      message: 'Chore created successfully',
      data: { id: choreId },
    });
  } catch (error: any) {
    console.error('Chore creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chore',
      details: error.message,
    });
  }
});

/**
 * PUT /api/chores/:id
 * Update a chore
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assigned_to,
      due_date,
      points,
      category,
      is_completed,
      completed_by,
      completed_at,
      recurrence,
    } = req.body;

    // Check if chore exists
    const existingChore = await DatabaseService.queryOne(
      'SELECT * FROM chores WHERE id = ?',
      [id]
    );

    if (!existingChore) {
      return res.status(404).json({
        success: false,
        error: 'Chore not found',
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(assigned_to);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date);
    }
    if (points !== undefined) {
      updates.push('points = ?');
      values.push(points);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (is_completed !== undefined) {
      updates.push('is_completed = ?');
      values.push(is_completed ? 1 : 0);
    }
    if (completed_by !== undefined) {
      updates.push('completed_by = ?');
      values.push(completed_by);
    }
    if (completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(completed_at);
    }
    if (recurrence !== undefined) {
      updates.push('recurrence = ?');
      values.push(recurrence ? JSON.stringify(recurrence) : null);
    }

    // Always update the updated_at timestamp
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    // Add the ID for the WHERE clause
    values.push(id);

    await DatabaseService.execute(`
      UPDATE chores
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    res.json({
      success: true,
      message: 'Chore updated successfully',
    });
  } catch (error: any) {
    console.error('Chore update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update chore',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/chores/:id
 * Delete a chore
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if chore exists
    const existingChore = await DatabaseService.queryOne(
      'SELECT * FROM chores WHERE id = ?',
      [id]
    );

    if (!existingChore) {
      return res.status(404).json({
        success: false,
        error: 'Chore not found',
      });
    }

    await DatabaseService.execute('DELETE FROM chores WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Chore deleted successfully',
    });
  } catch (error: any) {
    console.error('Chore deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chore',
      details: error.message,
    });
  }
});

/**
 * Helper function to get category information
 */
function getCategoryInfo(category: string) {
  const categories = {
    cleaning: { name: 'Cleaning', icon: '🧹', color: 'blue' },
    kitchen: { name: 'Kitchen', icon: '🍽️', color: 'green' },
    laundry: { name: 'Laundry', icon: '👕', color: 'purple' },
    outdoor: { name: 'Outdoor', icon: '🌱', color: 'yellow' },
    pets: { name: 'Pets', icon: '🐕', color: 'pink' },
    other: { name: 'Other', icon: '📋', color: 'gray' },
  };
  return categories[category as keyof typeof categories] || categories.other;
}

export default router;
