import { query } from '../../src/lib/db.js';
import jwt from 'jsonwebtoken';

// Authentication middleware
export function requireAuth(req, res, next) {
  // Check if user is authenticated via JWT token
  // First check cookie (works in production with httpOnly cookies)
  // Then check Authorization header (works in development or when explicitly set)
  let token = req.cookies.auth_token;
  
  // Debug logging
  if (!token) {
    console.log('No cookie token, checking Authorization header');
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('Found token in Authorization header');
    } else {
      console.log('No Authorization header found');
    }
  } else {
    console.log('Found token in cookie');
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'יש להתחבר למערכת'
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'יש להתחבר למערכת'
    });
  }
}

// Admin authorization middleware
export async function requireAdmin(req, res, next) {
  try {
    // First check if user is authenticated (should be set by requireAuth)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'יש להתחבר למערכת'
      });
    }

    // Check if user is admin
    const { data: user, error } = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (error) {
      console.error('Database error checking admin status:', error);
      return res.status(500).json({ 
        error: 'Database error',
        message: 'שגיאה בבסיס הנתונים'
      });
    }

    if (!user || user.length === 0 || !user[0].is_admin) {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'גישה למנהלים בלבד'
      });
    }

    // Set current user ID for database functions
    req.currentUserId = req.user.userId;
    next();
  } catch (error) {
    console.error('Error in requireAdmin middleware:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'שגיאה פנימית בשרת'
    });
  }
}

// Set current user ID for database functions
export function setCurrentUser(req, res, next) {
  if (req.user && req.user.userId) {
    // Set the current user ID for database functions that need it
    // This will be used by the is_current_user_admin() function
    req.currentUserId = req.user.userId;
  }
  next();
} 