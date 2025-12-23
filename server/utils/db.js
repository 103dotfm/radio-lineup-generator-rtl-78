import { query, pool } from '../../src/lib/db.js';

// Helper function to build WHERE clause
const buildWhereClause = (where) => {
  if (!where) return { text: '', values: [] };
  
  const conditions = [];
  const values = [];
  let paramCount = 1;
  
  for (const [key, value] of Object.entries(where)) {
    if (key === 'or') {
      // Handle OR conditions
      if (Array.isArray(value)) {
        const orConditions = [];
        for (const orItem of value) {
          for (const [orKey, orValue] of Object.entries(orItem)) {
            if (orKey.includes('ILIKE')) {
              orConditions.push(`${orKey} $${paramCount}`);
              values.push(orValue);
              paramCount++;
            } else if (typeof orValue === 'object' && orValue !== null) {
              if (orValue.ilike !== undefined) {
                orConditions.push(`${orKey} ILIKE $${paramCount}`);
                values.push(orValue.ilike);
                paramCount++;
              }
            } else {
              orConditions.push(`${orKey} = $${paramCount}`);
              values.push(orValue);
              paramCount++;
            }
          }
        }
        if (orConditions.length > 0) {
          conditions.push(`(${orConditions.join(' OR ')})`);
        }
      }
    } else if (key.includes('<=') || key.includes('>=') || key.includes('ILIKE')) {
      // Handle operator in key
      conditions.push(`${key} $${paramCount}`);
      values.push(value);
      paramCount++;
    } else if (typeof value === 'object' && value !== null) {
      // Handle operator objects
      if (value.eq !== undefined) {
        conditions.push(`${key} = $${paramCount}`);
        values.push(value.eq);
        paramCount++;
      }
      if (value.lte !== undefined) {
        conditions.push(`${key} <= $${paramCount}`);
        values.push(value.lte);
        paramCount++;
      }
      if (value.lt !== undefined) {
        conditions.push(`${key} < $${paramCount}`);
        values.push(value.lt);
        paramCount++;
      }
      if (value.gte !== undefined) {
        conditions.push(`${key} >= $${paramCount}`);
        values.push(value.gte);
        paramCount++;
      }
      if (value.ilike !== undefined) {
        conditions.push(`${key} ILIKE $${paramCount}`);
        values.push(value.ilike);
        paramCount++;
      }
      if (value.in !== undefined) {
        if (Array.isArray(value.in)) {
          const placeholders = value.in.map(() => `$${paramCount++}`).join(', ');
          conditions.push(`${key} IN (${placeholders})`);
          values.push(...value.in);
        }
      }
    } else {
      conditions.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }
  
  return {
    text: conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '',
    values
  };
};

// Helper function to build ORDER BY clause
const buildOrderByClause = (orderBy) => {
  if (!orderBy || Object.keys(orderBy).length === 0) return '';
  
  const orders = Object.entries(orderBy).map(([key, value]) => `${key} ${value}`);
  return orders.length ? ` ORDER BY ${orders.join(', ')}` : '';
};

// Execute SELECT query
export const executeSelect = async (table, options = {}) => {
  try {
    const { select = '*', where, orderBy, limit } = options;
    const whereClause = buildWhereClause(where);
    const orderByClause = buildOrderByClause(orderBy);
    const limitClause = limit ? ` LIMIT ${limit}` : '';
    
    const queryText = `SELECT ${select} FROM "${table}"${whereClause.text}${orderByClause}${limitClause}`;
    console.log('Executing query:', {
      text: queryText,
      values: whereClause.values,
      table,
      options
    });

    const startTime = Date.now();
    const result = await query(queryText, whereClause.values);
    const duration = Date.now() - startTime;
    
    console.log('Query result:', {
      duration: `${duration}ms`,
      rowCount: result.data?.length,
      error: result.error ? {
        message: result.error.message,
        code: result.error.code,
        detail: result.error.detail
      } : null
    });

    return result;
  } catch (error) {
    console.error('executeSelect error:', {
      error,
      message: error.message,
      code: error.code,
      table,
      options
    });
    return { data: null, error };
  }
};

// Execute INSERT query
export const executeInsert = async (table, data) => {
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);
    
    const queryText = `
      INSERT INTO "${table}" (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    return await query(queryText, values);
  } catch (error) {
    console.error('executeInsert error:', error);
    return { data: null, error };
  }
};

// Execute UPDATE query
export const executeUpdate = async (table, data, where) => {
  try {
    const updates = Object.entries(data).map(([key], i) => `${key} = $${i + 1}`);
    const values = [...Object.values(data)];
    
    const whereClause = buildWhereClause(where);
    const whereValues = whereClause.values;
    const wherePlaceholderOffset = values.length;
    const adjustedWhereClause = whereClause.text.replace(/\$(\d+)/g, (_, num) => 
      `$${parseInt(num) + wherePlaceholderOffset}`
    );
    
    const queryText = `
      UPDATE "${table}"
      SET ${updates.join(', ')}${adjustedWhereClause}
      RETURNING *
    `;
    
    return await query(queryText, [...values, ...whereValues]);
  } catch (error) {
    console.error('executeUpdate error:', error);
    return { data: null, error };
  }
};

// Execute a DELETE query
export async function executeDelete(table, where) {
  const whereClause = buildWhereClause(where);
  const values = whereClause.values;
  
  const sql = `
    DELETE FROM "${table}"
    ${whereClause.text}
    RETURNING *
  `;
  
  return await query(sql, values);
}

export default {
  executeSelect,
  executeInsert,
  executeUpdate,
  executeDelete
}; 