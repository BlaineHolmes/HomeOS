import { Router } from 'express';
import { DatabaseService } from '../services/database.js';
import { randomUUID } from 'crypto';

const router = Router();

// ============================================================================
// GROCERY LIST API ROUTES - FAMILY SHOPPING LIST MANAGEMENT
// ============================================================================

// GET /api/grocery - Get all grocery items
router.get('/', async (req, res) => {
  try {
    const { category, completed, user_id } = req.query;

    let sql = `
      SELECT
        gi.*,
        u1.username as added_by_name,
        u2.username as completed_by_name
      FROM grocery_items gi
      LEFT JOIN users u1 ON gi.added_by = u1.id
      LEFT JOIN users u2 ON gi.completed_by = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by category
    if (category && category !== 'all') {
      sql += ' AND gi.category = ?';
      params.push(category);
    }

    // Filter by completion status
    if (completed !== undefined) {
      sql += ' AND gi.is_completed = ?';
      params.push(completed === 'true' ? 1 : 0);
    }

    // Filter by user
    if (user_id) {
      sql += ' AND gi.added_by = ?';
      params.push(user_id);
    }

    sql += ' ORDER BY gi.is_completed ASC, gi.created_at DESC';

    const items = await DatabaseService.query(sql, params);

    // Get category counts
    const categoryCounts = await DatabaseService.query(`
      SELECT
        category,
        COUNT(*) as total,
        SUM(is_completed) as completed
      FROM grocery_items
      GROUP BY category
    `);

    res.json({
      success: true,
      data: {
        items: items.map(item => ({
          ...item,
          is_completed: Boolean(item.is_completed),
          created_at: new Date(item.created_at),
          updated_at: new Date(item.updated_at),
          completed_at: item.completed_at ? new Date(item.completed_at) : null,
        })),
        categories: categoryCounts,
        total: items.length,
        completed: items.filter(item => item.is_completed).length,
      },
    });
  } catch (error) {
    console.error('Error fetching grocery items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grocery items',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/grocery - Add new grocery item
router.post('/', async (req, res) => {
  try {
    const { name, quantity = 1, unit = 'item', category = 'other', added_by = 'system' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required',
      });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await DatabaseService.execute(`
      INSERT INTO grocery_items (
        id, name, quantity, unit, category, is_completed,
        added_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `, [id, name.trim(), quantity, unit, category, added_by, now, now]);

    const newItem = await DatabaseService.queryOne(`
      SELECT
        gi.*,
        u.username as added_by_name
      FROM grocery_items gi
      LEFT JOIN users u ON gi.added_by = u.id
      WHERE gi.id = ?
    `, [id]);

    res.status(201).json({
      success: true,
      message: 'Grocery item added successfully',
      data: {
        ...newItem,
        is_completed: Boolean(newItem.is_completed),
        created_at: new Date(newItem.created_at),
        updated_at: new Date(newItem.updated_at),
      },
    });
  } catch (error) {
    console.error('Error adding grocery item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add grocery item',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/grocery/:id - Update grocery item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, unit, category, is_completed, completed_by } = req.body;

    // Check if item exists
    const existingItem = await DatabaseService.queryOne(
      'SELECT * FROM grocery_items WHERE id = ?',
      [id]
    );

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Grocery item not found',
      });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }

    if (unit !== undefined) {
      updates.push('unit = ?');
      params.push(unit);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }

    if (is_completed !== undefined) {
      updates.push('is_completed = ?');
      params.push(is_completed ? 1 : 0);

      if (is_completed) {
        updates.push('completed_at = ?');
        params.push(new Date().toISOString());

        if (completed_by) {
          updates.push('completed_by = ?');
          params.push(completed_by);
        }
      } else {
        updates.push('completed_at = NULL');
        updates.push('completed_by = NULL');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await DatabaseService.execute(`
      UPDATE grocery_items
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    const updatedItem = await DatabaseService.queryOne(`
      SELECT
        gi.*,
        u1.username as added_by_name,
        u2.username as completed_by_name
      FROM grocery_items gi
      LEFT JOIN users u1 ON gi.added_by = u1.id
      LEFT JOIN users u2 ON gi.completed_by = u2.id
      WHERE gi.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Grocery item updated successfully',
      data: {
        ...updatedItem,
        is_completed: Boolean(updatedItem.is_completed),
        created_at: new Date(updatedItem.created_at),
        updated_at: new Date(updatedItem.updated_at),
        completed_at: updatedItem.completed_at ? new Date(updatedItem.completed_at) : null,
      },
    });
  } catch (error) {
    console.error('Error updating grocery item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update grocery item',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/grocery/:id - Delete grocery item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item exists
    const existingItem = await DatabaseService.queryOne(
      'SELECT * FROM grocery_items WHERE id = ?',
      [id]
    );

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Grocery item not found',
      });
    }

    await DatabaseService.execute('DELETE FROM grocery_items WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Grocery item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting grocery item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete grocery item',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/grocery/bulk - Bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { action, items, user_id = 'system' } = req.body;

    if (!action || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Action and items array are required',
      });
    }

    const connection = await DatabaseService.beginTransaction();

    try {
      let affectedCount = 0;

      switch (action) {
        case 'complete':
          for (const itemId of items) {
            await DatabaseService.execute(`
              UPDATE grocery_items
              SET is_completed = 1, completed_by = ?, completed_at = ?, updated_at = ?
              WHERE id = ? AND is_completed = 0
            `, [user_id, new Date().toISOString(), new Date().toISOString(), itemId]);
            affectedCount++;
          }
          break;

        case 'uncomplete':
          for (const itemId of items) {
            await DatabaseService.execute(`
              UPDATE grocery_items
              SET is_completed = 0, completed_by = NULL, completed_at = NULL, updated_at = ?
              WHERE id = ? AND is_completed = 1
            `, [new Date().toISOString(), itemId]);
            affectedCount++;
          }
          break;

        case 'delete':
          for (const itemId of items) {
            await DatabaseService.execute('DELETE FROM grocery_items WHERE id = ?', [itemId]);
            affectedCount++;
          }
          break;

        case 'add':
          for (const item of items) {
            const { name, quantity = 1, unit = 'item', category = 'other' } = item;
            if (name && name.trim()) {
              const id = randomUUID();
              const now = new Date().toISOString();
              await DatabaseService.execute(`
                INSERT INTO grocery_items (
                  id, name, quantity, unit, category, is_completed,
                  added_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
              `, [id, name.trim(), quantity, unit, category, user_id, now, now]);
              affectedCount++;
            }
          }
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      await DatabaseService.commitTransaction(connection);

      res.json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: {
          action,
          affected_count: affectedCount,
        },
      });
    } catch (error) {
      await DatabaseService.rollbackTransaction(connection);
      throw error;
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/grocery/categories - Get available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'produce', name: 'Produce', icon: '🥬', color: '#10b981' },
      { id: 'dairy', name: 'Dairy', icon: '🥛', color: '#f59e0b' },
      { id: 'meat', name: 'Meat & Seafood', icon: '🥩', color: '#ef4444' },
      { id: 'pantry', name: 'Pantry', icon: '🥫', color: '#8b5cf6' },
      { id: 'frozen', name: 'Frozen', icon: '🧊', color: '#06b6d4' },
      { id: 'household', name: 'Household', icon: '🧽', color: '#6b7280' },
      { id: 'other', name: 'Other', icon: '📦', color: '#374151' },
    ];

    // Get counts for each category
    const counts = await DatabaseService.query(`
      SELECT
        category,
        COUNT(*) as total,
        SUM(is_completed) as completed
      FROM grocery_items
      GROUP BY category
    `);

    const categoriesWithCounts = categories.map(cat => {
      const count = counts.find(c => c.category === cat.id);
      return {
        ...cat,
        total: count?.total || 0,
        completed: count?.completed || 0,
        pending: (count?.total || 0) - (count?.completed || 0),
      };
    });

    res.json({
      success: true,
      data: categoriesWithCounts,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/grocery/suggestions - Get smart suggestions based on history
router.get('/suggestions', async (req, res) => {
  try {
    const { query } = req.query;

    // Get frequently added items
    const frequentItems = await DatabaseService.query(`
      SELECT
        name,
        COUNT(*) as frequency,
        AVG(quantity) as avg_quantity,
        category,
        unit
      FROM grocery_items
      WHERE name LIKE ? OR ? = ''
      GROUP BY LOWER(name), category, unit
      ORDER BY frequency DESC, name ASC
      LIMIT 10
    `, [`%${query || ''}%`, query || '']);

    // Get recently added items
    const recentItems = await DatabaseService.query(`
      SELECT DISTINCT name, quantity, category, unit
      FROM grocery_items
      WHERE name LIKE ? OR ? = ''
      ORDER BY created_at DESC
      LIMIT 5
    `, [`%${query || ''}%`, query || '']);

    res.json({
      success: true,
      data: {
        frequent: frequentItems,
        recent: recentItems,
      },
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggestions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
