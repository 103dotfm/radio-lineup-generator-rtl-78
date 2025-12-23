import express from 'express';
import { executeSelect, executeInsert, executeUpdate, executeDelete } from '../utils/db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get workers with search support
router.get('/', async (req, res) => {
  try {
    const { where, order, limit } = req.query;
    let whereConditions = {};
    let orderBy = {};
    let limitNum = undefined;
    
    // Parse where conditions
    if (where) {
      try {
        whereConditions = typeof where === 'string' ? JSON.parse(where) : where;
        
        // Handle 'in' operator for id
        if (whereConditions.id?.in) {
          whereConditions['id = ANY'] = whereConditions.id.in;
          delete whereConditions.id;
        }
      } catch (error) {
        console.error('Error parsing where conditions:', error);
        return res.status(400).json({ error: 'Invalid where conditions' });
      }
    }
    
    // Parse order
    if (order) {
      try {
        orderBy = typeof order === 'string' ? JSON.parse(order) : order;
      } catch (error) {
        console.error('Error parsing order:', error);
        return res.status(400).json({ error: 'Invalid order parameter' });
      }
    }
    
    // Parse limit
    if (limit) {
      try {
        limitNum = parseInt(limit);
        if (isNaN(limitNum)) throw new Error('Invalid limit');
      } catch (error) {
        console.error('Error parsing limit:', error);
        return res.status(400).json({ error: 'Invalid limit parameter' });
      }
    }

    console.log('Executing query with:', {
      whereConditions,
      orderBy,
      limitNum
    });

    const result = await executeSelect('workers', {
      select: '*',
      where: whereConditions,
      orderBy,
      limit: limitNum
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting workers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create worker
router.post('/', async (req, res) => {
  try {
    const worker = {
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await executeInsert('workers', worker);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating worker:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update worker
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await executeUpdate('workers', updates, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating worker:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete worker
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeDelete('workers', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting worker:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user account for worker (admin only)
router.post('/:id/create-user', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'כתובת אימייל נדרשת' 
      });
    }

    // Check if worker exists
    const { data: workerData, error: workerError } = await executeSelect('workers', {
      select: '*',
      where: { id }
    });

    if (workerError) {
      console.error('Database error fetching worker:', workerError);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בבסיס הנתונים' 
      });
    }

    if (!workerData || workerData.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'העובד לא נמצא' 
      });
    }

    const worker = workerData[0];

    // Check if user with this email already exists
    const { data: existingUser, error: userCheckError } = await executeSelect('users', {
      select: 'id',
      where: { email }
    });

    if (userCheckError) {
      console.error('Database error checking existing user:', userCheckError);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בבסיס הנתונים' 
      });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'האימייל כבר רשום במערכת' 
      });
    }

    // Generate a strong temporary password
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const tempPassword = generatePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user in database
    const userId = crypto.randomUUID();
    const { data: newUser, error: createUserError } = await executeInsert('users', {
      id: userId,
      email: email,
      password_hash: passwordHash,
      full_name: worker.name,
      username: email.split('@')[0],
      is_admin: false,
      role: 'user',
      avatar_url: '/storage-new/uploads/work-arrangements/favicon.png'
    });

    if (createUserError) {
      console.error('Database error creating user:', createUserError);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה ביצירת משתמש' 
      });
    }

    // Update worker with user_id (no longer store plaintext password)
    const { error: updateWorkerError } = await executeUpdate('workers', {
      user_id: userId,
      email: email
    }, { id });

    if (updateWorkerError) {
      console.error('Database error updating worker:', updateWorkerError);
      // Try to clean up the created user
      await executeDelete('users', { id: userId });
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בעדכון פרטי העובד' 
      });
    }

    res.json({ 
      success: true, 
      password: tempPassword,
      message: 'המשתמש נוצר בהצלחה'
    });
  } catch (error) {
    console.error('Error creating user account for worker:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה פנימית בשרת' 
    });
  }
});

// Reset password for worker (admin only)
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if worker exists and has a user account
    const { data: workerData, error: workerError } = await executeSelect('workers', {
      select: '*',
      where: { id }
    });

    if (workerError) {
      console.error('Database error fetching worker:', workerError);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בבסיס הנתונים' 
      });
    }

    if (!workerData || workerData.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'העובד לא נמצא' 
      });
    }

    const worker = workerData[0];

    if (!worker.user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'לעובד זה אין חשבון משתמש' 
      });
    }

    // Generate new temporary password
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const newPassword = generatePassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const { error: updateUserError } = await executeUpdate('users', {
      password_hash: passwordHash
    }, { id: worker.user_id });

    if (updateUserError) {
      console.error('Database error updating user password:', updateUserError);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בעדכון הסיסמה' 
      });
    }

    // Note: No longer storing plaintext password in workers table
    // Password is only stored hashed in users table

    if (updateWorkerError) {
      console.error('Database error updating worker password:', updateWorkerError);
      // Password was updated in users table, so we can still return success
    }

    res.json({ 
      success: true, 
      password: newPassword,
      message: 'הסיסמה אופסה בהצלחה'
    });
  } catch (error) {
    console.error('Error resetting password for worker:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה פנימית בשרת' 
    });
  }
});

export default router; 