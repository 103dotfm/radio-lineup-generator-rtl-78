import pg from 'pg';
const { Pool } = pg;

// Database configuration
const pool = new Pool({
  user: 'radiouser',
  host: 'localhost',
  database: 'radiodb',
  password: 'radio123',
  port: 5432,
});

async function debugDivisions() {
  try {
    console.log('=== Debugging Divisions and Workers ===\n');

    // Check divisions
    console.log('1. Checking divisions:');
    const divisionsResult = await pool.query('SELECT * FROM divisions ORDER BY name');
    console.log('Divisions found:', divisionsResult.rows);

    // Check workers
    console.log('\n2. Checking workers:');
    const workersResult = await pool.query('SELECT id, name, department FROM workers ORDER BY name');
    console.log('Workers found:', workersResult.rows);

    // Check worker-divisions assignments
    console.log('\n3. Checking worker-divisions assignments:');
    const workerDivisionsResult = await pool.query(`
      SELECT wd.worker_id, wd.division_id, w.name as worker_name, d.name as division_name
      FROM worker_divisions wd
      JOIN workers w ON wd.worker_id = w.id
      JOIN divisions d ON wd.division_id = d.id
      ORDER BY d.name, w.name
    `);
    console.log('Worker-divisions assignments:', workerDivisionsResult.rows);

    // Check producer assignments for specific week
    console.log('\n4. Checking producer assignments for week 2025-08-10:');
    const producerAssignmentsResult = await pool.query(`
      SELECT pa.id, pa.worker_id, pa.role, pa.week_start, w.name as worker_name, w.department
      FROM producer_assignments pa
      JOIN workers w ON pa.worker_id = w.id
      WHERE pa.is_deleted = false AND pa.week_start = '2025-08-10'
      ORDER BY w.name
    `);
    console.log('Producer assignments for 2025-08-10:', producerAssignmentsResult.rows);

    // Check work arrangements for specific week
    console.log('\n5. Checking work arrangements for week 2025-08-10:');
    const workArrangementsResult = await pool.query(`
      SELECT id, type, week_start, filename, url
      FROM work_arrangements
      WHERE week_start = '2025-08-10'
      ORDER BY type
    `);
    console.log('Work arrangements for 2025-08-10:', workArrangementsResult.rows);

    // Check all work arrangements
    console.log('\n6. Checking all work arrangements:');
    const allWorkArrangementsResult = await pool.query(`
      SELECT id, type, week_start, filename, url
      FROM work_arrangements
      ORDER BY week_start DESC, type
      LIMIT 20
    `);
    console.log('All work arrangements:', allWorkArrangementsResult.rows);

    // Check if there are any workers with engineer-related departments
    console.log('\n7. Checking workers with engineer-related departments:');
    const engineerWorkersResult = await pool.query(`
      SELECT id, name, department
      FROM workers
      WHERE department ILIKE '%engineer%' OR department ILIKE '%טכנאי%' OR department ILIKE '%טכני%'
      ORDER BY name
    `);
    console.log('Engineer-related workers:', engineerWorkersResult.rows);

    // Check if there are any workers with producer-related departments
    console.log('\n8. Checking workers with producer-related departments:');
    const producerWorkersResult = await pool.query(`
      SELECT id, name, department
      FROM workers
      WHERE department ILIKE '%producer%' OR department ILIKE '%מפיק%' OR department ILIKE '%הפקה%'
      ORDER BY name
    `);
    console.log('Producer-related workers:', producerWorkersResult.rows);

    // Check all workers with null department
    console.log('\n9. Checking workers with null department:');
    const nullDeptWorkersResult = await pool.query(`
      SELECT id, name, department
      FROM workers
      WHERE department IS NULL
      ORDER BY name
    `);
    console.log('Workers with null department:', nullDeptWorkersResult.rows);

    // Check all unique departments
    console.log('\n10. Checking all unique departments:');
    const uniqueDeptsResult = await pool.query(`
      SELECT DISTINCT department
      FROM workers
      WHERE department IS NOT NULL
      ORDER BY department
    `);
    console.log('All unique departments:', uniqueDeptsResult.rows);

    // Check if there are any workers that might be engineers by name
    console.log('\n11. Checking workers that might be engineers by name:');
    const engineerByNameResult = await pool.query(`
      SELECT id, name, department
      FROM workers
      WHERE name ILIKE '%טכנאי%' OR name ILIKE '%טכני%' OR name ILIKE '%engineer%' OR name ILIKE '%technician%'
      ORDER BY name
    `);
    console.log('Workers that might be engineers by name:', engineerByNameResult.rows);

    // Check if the worker with null department has any assignments
    console.log('\n12. Checking assignments for worker with null department:');
    const nullDeptAssignmentsResult = await pool.query(`
      SELECT pa.id, pa.worker_id, pa.role, pa.week_start, w.name as worker_name, w.department
      FROM producer_assignments pa
      JOIN workers w ON pa.worker_id = w.id
      WHERE w.department IS NULL AND pa.is_deleted = false
      ORDER BY pa.week_start DESC
    `);
    console.log('Assignments for worker with null department:', nullDeptAssignmentsResult.rows);

    // Check if the worker with null department might be an engineer by checking their assignments
    console.log('\n13. Checking if worker with null department might be an engineer:');
    const nullDeptWorkerAssignmentsResult = await pool.query(`
      SELECT pa.id, pa.worker_id, pa.role, pa.week_start, w.name as worker_name, w.department
      FROM producer_assignments pa
      JOIN workers w ON pa.worker_id = w.id
      WHERE w.id = 'b65e8b7e-aead-4ac9-8d2e-d3ef0530dcb6' AND pa.is_deleted = false
      ORDER BY pa.week_start DESC
      LIMIT 10
    `);
    console.log('Assignments for יניב מורוזובסקי (null department):', nullDeptWorkerAssignmentsResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugDivisions();
