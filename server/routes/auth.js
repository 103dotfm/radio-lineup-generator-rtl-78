import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, pool } from '../../src/lib/db.js';
import crypto from 'crypto';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  console.log('=== LOGIN DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Is development?', process.env.NODE_ENV !== 'production');
  
  const { email, password } = req.body;
  console.log('Login attempt for email:', email);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Get user from database
    console.log('Querying database for user');
    const { data: users, error } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (!users || users.length === 0) {
      console.log('No user found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    console.log('Verifying password');
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create JWT token
    console.log('Creating JWT token');
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Allow non-secure cookies for development
      sameSite: 'lax', // Use lax for non-HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      domain: undefined // Let browser set domain automatically
    };

    // Handle remote access domains
    if (req.headers.origin) {
      const origin = new URL(req.headers.origin);
      const hostname = origin.hostname;
      const port = origin.port;
      
      // For remote access, set domain to the hostname
      if (hostname === '212.179.162.102' || hostname === 'logger.103.fm' || hostname === 'l.103.fm') {
        // Don't set domain for IP addresses with ports, let browser handle it
        if (hostname === '212.179.162.102' && port === '8080') {
          console.log('Not setting domain for IP with port, letting browser handle it');
        } else {
          cookieOptions.domain = hostname;
          console.log('Setting cookie domain for remote access:', hostname);
        }
      }
    }

    // Set token in cookie
    console.log('Setting cookie with token');
    res.cookie('auth_token', token, cookieOptions);

    // Return user data (excluding sensitive information)
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      is_admin: user.is_admin,
      full_name: user.full_name,
      title: user.title,
      avatar_url: user.avatar_url
    };

    // Always return token for development (since we're having issues with NODE_ENV)
    console.log('Adding token to response for development mode');
    userData.token = token;

    console.log('Final userData:', userData);
    console.log('Login successful for user:', email);
    res.json(userData);
  } catch (err) {
    console.error('Login error:', {
      error: err,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // Clear cookie with same options as when setting it
  const cookieOptions = {
    httpOnly: true,
    secure: false, // Allow non-secure cookies for development
    sameSite: 'lax', // Use lax for non-HTTPS
    path: '/',
    domain: undefined
  };

  // Handle remote access domains for logout
  if (req.headers.origin) {
    const origin = new URL(req.headers.origin);
    const hostname = origin.hostname;
    
    // For remote access, set domain to the hostname
    if (hostname === '212.179.162.102' || hostname === 'logger.103.fm' || hostname === 'l.103.fm') {
      cookieOptions.domain = hostname;
      console.log('Clearing cookie domain for remote access:', hostname);
    }
  }

  res.clearCookie('auth_token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
});

// Verify session endpoint
router.get('/verify', async (req, res) => {
  console.log('Verifying session');
  console.log('Cookies:', req.cookies);
  console.log('auth_token:', req.cookies.auth_token);
  console.log('Authorization header:', req.headers.authorization);
  
  let token = req.cookies.auth_token;

  // In development, also check Authorization header for token
  if (!token || process.env.NODE_ENV !== 'production') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('Using token from Authorization header');
    }
  }

  if (!token) {
    console.log('No token found in cookies or Authorization header');
    return res.json({ valid: false, reason: 'No token provided' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify token
    console.log('Verifying JWT token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist
    console.log('Checking if user still exists');
    const { data: users, error } = await query(
      'SELECT id, email, role, is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (error || !users || users.length === 0) {
      console.log('User not found in database');
      throw new Error('User not found');
    }

    // Check if token is about to expire (within 1 hour) and refresh it
    const tokenExp = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (tokenExp - now < oneHour) {
      // Token expires within 1 hour, refresh it
      const user = users[0];
      const newToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const cookieOptions = {
        httpOnly: true,
        secure: false, // Allow non-secure cookies for development
        sameSite: 'lax', // Use lax for non-HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        domain: undefined // Let browser set domain automatically
      };

      // Handle remote access domains for token refresh
      if (req.headers.origin) {
        const origin = new URL(req.headers.origin);
        const hostname = origin.hostname;
        
        // For remote access, set domain to the hostname
        if (hostname === '212.179.162.102' || hostname === 'logger.103.fm' || hostname === 'l.103.fm') {
          cookieOptions.domain = hostname;
          console.log('Setting cookie domain for token refresh:', hostname);
        }
      }
      
      res.cookie('auth_token', newToken, cookieOptions);
      console.log('Token refreshed during verification');
    }

    console.log('Session verified successfully');
    res.json({ valid: true });
  } catch (err) {
    console.error('Token verification error:', {
      error: err,
      message: err.message,
      stack: err.stack
    });
    
    // Clear cookie with same options as when setting it
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      sameSite: 'lax',
      path: '/',
      domain: undefined
    };

    // Handle remote access domains for cookie clearing
    if (req.headers.origin) {
      const origin = new URL(req.headers.origin);
      const hostname = origin.hostname;
      
      // For remote access, set domain to the hostname
      if (hostname === '212.179.162.102' || hostname === 'logger.103.fm' || hostname === 'l.103.fm') {
        cookieOptions.domain = hostname;
        console.log('Clearing cookie domain for remote access:', hostname);
      }
    }

    res.clearCookie('auth_token', cookieOptions);
    res.json({ valid: false, reason: err.message || 'Token verification failed' });
  }
});

// Get all users endpoint
router.get('/users', async (req, res) => {
  try {
    // Get users from the database
    const { data: users, error } = await query(
      `SELECT id, email, role, is_admin, full_name, title, avatar_url, created_at, updated_at 
       FROM users 
       ORDER BY created_at DESC`
    );

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    // Get worker information for users
    const { data: workers, error: workersError } = await query(
      `SELECT w.*, u.id as user_id 
       FROM workers w 
       INNER JOIN users u ON w.user_id = u.id`
    );

    if (workersError) {
      console.error('Error fetching worker data:', workersError);
    } else if (workers && workers.length > 0) {
      // Create a map of workers with user accounts for quick lookup
      const workerUserMap = workers.reduce((acc, worker) => {
        if (worker.user_id) {
          acc[worker.user_id] = worker;
        }
        return acc;
      }, {});

      // Add additional information from worker data if available
      users.forEach(user => {
        if (workerUserMap[user.id]) {
          const worker = workerUserMap[user.id];
          if (!user.title) {
            user.title = worker.position || worker.department || 'producer';
          }
          if (!user.full_name && worker.name) {
            user.full_name = worker.name;
          }
        }
      });
    }

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users endpoint
router.get('/users-count', async (req, res) => {
  try {
    // Get count of users from the database
    const { data: userCount, error } = await query(
      'SELECT COUNT(*) as count FROM users'
    );

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json({ count: userCount[0].count });
  } catch (err) {
    console.error('Error fetching user count:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user endpoint
router.post('/users', async (req, res) => {
  try {
    const { email, password, username, full_name, is_admin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user with this email already exists
    const { data: existingUser, error: checkError } = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (checkError) {
      console.error('Database error checking existing user:', checkError);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Generate UUID for the user using Node.js crypto
    const userId = crypto.randomUUID();

    // Create user in database
    const { data: user, error } = await query(
      `INSERT INTO users (id, email, password_hash, username, full_name, is_admin, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, username, full_name, is_admin, role`,
      [userId, email, password_hash, username, full_name, is_admin, is_admin ? 'admin' : 'user']
    );

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json(user[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user endpoint
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, full_name, is_admin } = req.body;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/efa41fc6-cffb-4401-9713-bc2e1201a2aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes/auth.js:394',message:'PUT /users/:id entry',data:{userId:id,body:{email,username,full_name,is_admin:req.body.is_admin},hasReqUser:!!req.user,reqUserId:req.user?.userId,hasCurrentUserId:!!req.currentUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2'})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/efa41fc6-cffb-4401-9713-bc2e1201a2aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes/auth.js:399',message:'Before UPDATE query',data:{id,is_admin,is_adminType:typeof is_admin,is_adminCoalesced:is_admin ?? 'NULL',params:[email,username,full_name,is_admin,id]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    // Check if we need to set current_user_id for trigger
    let currentUserId = req.user?.userId || req.currentUserId;
    
    // If not set, try to extract from JWT token
    if (!currentUserId) {
      let token = req.cookies.auth_token;
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          currentUserId = decoded.userId;
        } catch (err) {
          // Token invalid, ignore
        }
      }
    }
    
    console.log('[DEBUG] Update user - currentUserId:', currentUserId, 'is_admin:', is_admin, 'targetUserId:', id);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/efa41fc6-cffb-4401-9713-bc2e1201a2aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes/auth.js:407',message:'Current user ID check',data:{currentUserId,hasReqUser:!!req.user,reqUserId:req.user?.userId,hasCurrentUserId:!!req.currentUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2'})}).catch(()=>{});
    // #endregion

    // Update user in database
    let queryText = `UPDATE users 
       SET email = COALESCE($1, email),
           username = COALESCE($2, username),
           full_name = COALESCE($3, full_name),
           is_admin = COALESCE($4, is_admin),
           role = CASE WHEN $4 IS NOT NULL THEN 
                    CASE WHEN $4 THEN 'admin' ELSE 'user' END
                  ELSE role END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, username, full_name, is_admin, role`;
    
    // Always use transaction with session variable set to avoid trigger issues
    // The trigger fires on every UPDATE, so we need to ensure session variable is always set
    const isAdminBeingChanged = is_admin !== undefined && is_admin !== null;
    
    // If changing admin status, verify current user is admin first
    if (currentUserId && isAdminBeingChanged) {
      const { data: currentUser, error: checkError } = await query(
        'SELECT is_admin FROM users WHERE id = $1',
        [currentUserId]
      );
      
      if (checkError || !currentUser || !currentUser[0] || !currentUser[0].is_admin) {
        return res.status(403).json({ error: 'Only admins can change user admin status' });
      }
    }
    
    // Always use transaction with session variable for consistent trigger behavior
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Set session variables to help the trigger
      // Always set skip flag when we have currentUserId to avoid trigger's SELECT query
      // The trigger will only check when promoting to admin, but we've already verified permissions
      if (currentUserId) {
        // Set current user ID for trigger's is_current_user_admin() check (fallback)
        await client.query(`SELECT set_config('app.current_user_id', $1::text, false)`, [currentUserId]);
        // Set skip flag to bypass trigger's check (we've already verified permissions in application code)
        await client.query(`SELECT set_config('app.skip_admin_check', 'true', false)`, []);
      }
      
      // Single UPDATE query - trigger will check session variable if needed
      const updateQuery = `UPDATE users 
        SET email = COALESCE($1, email),
            username = COALESCE($2, username),
            full_name = COALESCE($3, full_name),
            is_admin = COALESCE($4, is_admin),
            role = CASE WHEN $4 IS NOT NULL THEN 
                     CASE WHEN $4 THEN 'admin' ELSE 'user' END
                   ELSE role END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, email, username, full_name, is_admin, role`;
      
      const result = await client.query(updateQuery, [email, username, full_name, is_admin, id]);
      
      if (!result.rows || result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Database error:', err);
      // Check if it's a known security exception from the trigger
      if (err.message && err.message.includes('Only existing admins')) {
        return res.status(403).json({ error: err.message });
      }
      if (err.message && err.message.includes('Cannot demote the last admin')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Database error occurred', details: err.message });
    } finally {
      client.release();
    }
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/efa41fc6-cffb-4401-9713-bc2e1201a2aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes/auth.js:437',message:'Exception caught',data:{errorMessage:err.message,errorStack:err.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user endpoint
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if this user is linked to a worker
    const { data: workerData, error: workerError } = await query(
      'SELECT id, name FROM workers WHERE user_id = $1',
      [id]
    );

    if (!workerError && workerData && workerData.length > 0) {
      // If this user is linked to a worker, just remove the link instead of deleting the user
      const { error: updateError } = await query(
        'UPDATE workers SET user_id = NULL, password_readable = NULL WHERE user_id = $1',
        [id]
      );

      if (updateError) {
        console.error('Error updating worker:', updateError);
        return res.status(500).json({ error: 'Database error occurred' });
      }

      // Now delete the user after removing the link
      const { error: deleteError } = await query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      if (deleteError) {
        console.error('Database error deleting user:', deleteError);
        return res.status(500).json({ error: 'Database error occurred' });
      }

      res.json({ 
        message: 'User deleted successfully',
        note: 'User was linked to worker but link was removed before deletion'
      });
    } else {
      // User is not linked to any worker, safe to delete directly
      const { error: deleteError } = await query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      if (deleteError) {
        console.error('Database error:', deleteError);
        return res.status(500).json({ error: 'Database error occurred' });
      }

      res.json({ message: 'User deleted successfully' });
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user by email endpoint
router.delete('/users/email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Find user by email
    const { data: userData, error: userError } = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userError) {
      console.error('Database error:', userError);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (!userData || userData.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userData[0].id;

    // Check if this user is linked to a worker
    const { data: workerData, error: workerError } = await query(
      'SELECT id, name FROM workers WHERE user_id = $1',
      [userId]
    );

    if (!workerError && workerData && workerData.length > 0) {
      // If this user is linked to a worker, remove the link first
      const { error: updateError } = await query(
        'UPDATE workers SET user_id = NULL, password_readable = NULL WHERE user_id = $1',
        [userId]
      );

      if (updateError) {
        console.error('Error updating worker:', updateError);
        return res.status(500).json({ error: 'Database error occurred' });
      }
    }

    // Delete the user using the ID
    const { error: deleteError } = await query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );

    if (deleteError) {
      console.error('Database error:', deleteError);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json({ 
      message: 'User deleted successfully',
      note: workerData && workerData.length > 0 ? 'User was linked to worker but link was removed before deletion' : undefined
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  let token = req.cookies.auth_token;
  
  // In development, also check Authorization header for token
  if (!token || process.env.NODE_ENV !== 'production') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: users, error } = await query(
      'SELECT id, email, role, is_admin, full_name, title, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (error || !users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];
    
    // Check if token is about to expire (within 1 hour) and refresh it
    const tokenExp = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (tokenExp - now < oneHour) {
      // Token expires within 1 hour, refresh it
      const newToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined
      };
      
      res.cookie('auth_token', newToken, cookieOptions);
    }
    
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  let token = req.cookies.auth_token;
  
  // In development, also check Authorization header for token
  if (!token || process.env.NODE_ENV !== 'production') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist
    const { data: users, error } = await query(
      'SELECT id, email, role, is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (error || !users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Create new token
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? undefined : undefined
    };
    
    res.cookie('auth_token', newToken, cookieOptions);
    res.json({ message: 'Token refreshed successfully' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Temporary endpoint to create a default admin user if none exist
router.get('/setup-default-admin', async (req, res) => {
  try {
    // Check if any users exist
    const { data: userCount, error } = await query(
      'SELECT COUNT(*) as count FROM users'
    );

    if (error) {
      console.error('Database error checking user count:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (userCount[0].count > 0) {
      return res.json({ message: 'Users already exist. No action taken.' });
    }

    // No users exist, create a default admin
    const defaultEmail = 'admin@example.com';
    const defaultPassword = 'AdminPassword123!';
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    console.log('Creating default admin user');
    const { data: newUser, error: insertError } = await query(
      `INSERT INTO users (email, password_hash, username, full_name, is_admin, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, username, full_name, is_admin, role`,
      [defaultEmail, password_hash, 'admin', 'Default Admin', true, 'admin']
    );

    if (insertError) {
      console.error('Database error creating default admin:', insertError);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json({ 
      message: 'Default admin user created successfully',
      email: defaultEmail,
      password: defaultPassword
    });
  } catch (err) {
    console.error('Error setting up default admin:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary endpoint to list user summaries (non-sensitive data)
router.get('/list-users-summary', async (req, res) => {
  try {
    // Get a summary of users from the database
    const { data: users, error } = await query(
      'SELECT id, email, username, full_name, is_admin, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    if (error) {
      console.error('Database error fetching user summaries:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json(users);
  } catch (err) {
    console.error('Error fetching user summaries:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary endpoint to reset test user password
router.get('/reset-test-password', async (req, res) => {
  try {
    const testEmail = 'test@example.com';
    const newPassword = 'TestPassword123!';
    const password_hash = await bcrypt.hash(newPassword, 10);

    console.log('Resetting password for test user');
    const { data: updatedUser, error } = await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email',
      [password_hash, testEmail]
    );

    if (error) {
      console.error('Database error resetting test user password:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(404).json({ error: 'Test user not found' });
    }

    res.json({ 
      message: 'Test user password reset successfully',
      email: testEmail,
      password: newPassword
    });
  } catch (err) {
    console.error('Error resetting test user password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary endpoint to reset yaniv user password
router.get('/reset-yaniv-password', async (req, res) => {
  try {
    const yanivEmail = 'yaniv@103.fm';
    const newPassword = 'YanivPassword123!';
    const password_hash = await bcrypt.hash(newPassword, 10);

    console.log('Resetting password for yaniv user');
    const { data: updatedUser, error } = await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email',
      [password_hash, yanivEmail]
    );

    if (error) {
      console.error('Database error resetting yaniv user password:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(404).json({ error: 'Yaniv user not found' });
    }

    res.json({ 
      message: 'Yaniv user password reset successfully',
      email: yanivEmail,
      password: newPassword
    });
  } catch (err) {
    console.error('Error resetting yaniv user password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary endpoint to fix null ID for test user
router.get('/fix-test-user-id', async (req, res) => {
  try {
    const testEmail = 'test@example.com';
    console.log('Checking and fixing ID for test user');
    // Check if the user has a null ID
    const { data: userData, error } = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [testEmail]
    );

    if (error) {
      console.error('Database error checking test user ID:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (!userData || userData.length === 0) {
      return res.status(404).json({ error: 'Test user not found' });
    }

    if (userData[0].id !== null) {
      return res.json({ message: 'Test user already has a valid ID', userId: userData[0].id });
    }

    // Generate a new UUID for the user
    const newId = crypto.randomUUID();
    const { data: updatedUser, error: updateError } = await query(
      'UPDATE users SET id = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email',
      [newId, testEmail]
    );

    if (updateError) {
      console.error('Database error updating test user ID:', updateError);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json({ 
      message: 'Test user ID updated successfully',
      email: testEmail,
      newId: newId
    });
  } catch (err) {
    console.error('Error fixing test user ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for changing password
router.post('/change-password', async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    const { currentPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Get user from database
    const { data: users, error } = await query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (error || !users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const { error: updateError } = await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    if (updateError) {
      console.error('Database error updating password:', updateError);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for updating user profile
router.post('/update-profile', async (req, res) => {
  try {
    console.log('Received profile update request');
    const token = req.cookies.auth_token;
    const { full_name, title, avatar_url } = req.body;
    console.log('Profile update data:', { full_name, title, avatar_url });

    if (!token) {
      console.log('No authentication token provided');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log('Verified user ID:', userId);

    // Update user profile in database with detailed logging
    console.log('Executing database update for user:', userId);
    const { data: updatedUser, error } = await query(
      'UPDATE users SET full_name = $1, title = $2, avatar_url = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, full_name, title, avatar_url',
      [full_name, title, avatar_url, userId]
    );

    if (error) {
      console.error('Database error updating profile:', error);
      return res.status(500).json({ error: 'Database error occurred', details: error.message });
    }

    if (!updatedUser || updatedUser.length === 0) {
      console.error('No user data returned after update for user:', userId);
      return res.status(404).json({ error: 'User not found after update' });
    }

    console.log('Database update successful, updated data:', updatedUser[0]);
    // Verify the update by querying the data again
    const { data: verifiedUser, error: verifyError } = await query(
      'SELECT id, full_name, title, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (verifyError) {
      console.error('Error verifying update:', verifyError);
    } else if (verifiedUser && verifiedUser.length > 0) {
      console.log('Verified updated data in database:', verifiedUser[0]);
    } else {
      console.error('Verification failed, user not found in database after update:', userId);
    }

    res.json({ message: 'Profile updated successfully', user: updatedUser[0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password endpoint (admin only)
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Generate a strong temporary password
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

    // Update user password in database
    const { data: updatedUser, error } = await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, full_name',
      [passwordHash, id]
    );

    if (error) {
      console.error('Database error updating password:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true,
      message: 'Password reset successfully',
      password: newPassword,
      user: updatedUser[0]
    });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary endpoint to fetch latest user data after update
router.get('/refresh-user-data', async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log('Fetching latest data for user ID:', userId);

    // Get latest user data from database
    const { data: userData, error } = await query(
      'SELECT id, full_name, title, avatar_url, email, role, is_admin FROM users WHERE id = $1',
      [userId]
    );

    if (error || !userData || userData.length === 0) {
      console.error('Database error fetching user data:', error);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Latest user data fetched:', userData[0]);
    res.json(userData[0]);
  } catch (err) {
    console.error('Error fetching user data:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 