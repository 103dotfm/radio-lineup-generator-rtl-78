
# Radio Lineup Generator - Installation Guide

This document provides detailed instructions for installing and configuring the Radio Lineup Generator application, including how to set it up to run locally without Supabase.

## Prerequisites

- Node.js (v18 or higher)
- npm, yarn or bun (package managers)
- A PostgreSQL database (v13 or higher)
- Git (for cloning the repository)
- For storage: Local filesystem storage or a compatible S3 storage solution
- For edge functions: Node.js server with Express

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd radio-lineup-generator
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using yarn:
```bash
yarn install
```

Or using bun:
```bash
bun install
```

### 3. Configure Database Connection

You have two options for the database connection:

#### Option A: Local PostgreSQL Database Setup

1. **Install PostgreSQL**:
   - **Windows**: Download and run the installer from [PostgreSQL official website](https://www.postgresql.org/download/windows/)
   - **macOS**: 
     - Using Homebrew: `brew install postgresql`
     - Or download from [PostgreSQL official website](https://www.postgresql.org/download/macosx/)
   - **Linux (Ubuntu/Debian)**: `sudo apt update && sudo apt install postgresql postgresql-contrib`
   - **Linux (Fedora)**: `sudo dnf install postgresql postgresql-server`

2. **Start PostgreSQL service**:
   - **Windows**: It starts automatically after installation, or you can find it in Services
   - **macOS with Homebrew**: `brew services start postgresql`
   - **Linux**: `sudo systemctl start postgresql`

3. **Create a new database**:
   ```bash
   # Login to PostgreSQL as the postgres user
   sudo -u postgres psql
   
   # Create a new database
   CREATE DATABASE radiodb;
   
   # Create a user (optional, you can use the default postgres user)
   CREATE USER radiouser WITH ENCRYPTED PASSWORD 'your_password';
   
   # Grant privileges to the user
   GRANT ALL PRIVILEGES ON DATABASE radiodb TO radiouser;
   
   # Exit PostgreSQL
   \q
   ```

4. **Database Schema Setup**:
   Run the SQL schema file located in the `database/schema.sql` file. This can be done using the PostgreSQL command line tool:

   ```bash
   sudo -u postgres psql -d radiodb -f database/schema.sql
   ```

   Or using a database administration tool like pgAdmin or DBeaver.

#### Option B: Using the PostgreSQL Connection String

1. Create a `.env` file in the root directory of the project with the following content:
   ```
   DATABASE_URL=postgres://username:password@localhost:5432/radiodb
   ```
   Replace `username`, `password`, and `radiodb` with your PostgreSQL credentials and database name.

### 4. Setup Alternatives to Supabase Features

#### 4.1 Alternative for Supabase Storage

For file storage (PDF files, work arrangements, etc.), you can set up:

**Option A: Local File Storage**
1. Create a storage directory in your project:
   ```bash
   mkdir -p storage/lovable
   ```

2. Install required packages for file handling:
   ```bash
   npm install multer fs-extra
   ```

3. Create a `storage-server.js` file in the `server` directory:
   ```javascript
   const express = require('express');
   const multer = require('multer');
   const path = require('path');
   const fs = require('fs-extra');
   
   const router = express.Router();
   
   // Configure storage
   const storage = multer.diskStorage({
     destination: function (req, file, cb) {
       const bucket = req.params.bucket || 'default';
       const dir = path.join(__dirname, '../storage', bucket);
       fs.ensureDirSync(dir);
       cb(null, dir);
     },
     filename: function (req, file, cb) {
       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
       cb(null, uniqueSuffix + '-' + file.originalname);
     }
   });
   
   const upload = multer({ storage: storage });
   
   // Upload file endpoint
   router.post('/upload/:bucket?', upload.single('file'), (req, res) => {
     if (!req.file) {
       return res.status(400).json({ error: 'No file uploaded' });
     }
     
     const bucket = req.params.bucket || 'default';
     const filePath = `/storage/${bucket}/${req.file.filename}`;
     
     res.json({
       data: {
         path: filePath,
         fullPath: `${req.protocol}://${req.get('host')}${filePath}`,
       }
     });
   });
   
   // Get file endpoint
   router.get('/:bucket/:filename', (req, res) => {
     const { bucket, filename } = req.params;
     const filePath = path.join(__dirname, '../storage', bucket, filename);
     
     if (!fs.existsSync(filePath)) {
       return res.status(404).json({ error: 'File not found' });
     }
     
     res.sendFile(filePath);
   });
   
   // Delete file endpoint
   router.delete('/:bucket/:filename', (req, res) => {
     const { bucket, filename } = req.params;
     const filePath = path.join(__dirname, '../storage', bucket, filename);
     
     if (!fs.existsSync(filePath)) {
       return res.status(404).json({ error: 'File not found' });
     }
     
     fs.unlinkSync(filePath);
     res.json({ success: true });
   });
   
   module.exports = router;
   ```

4. Update the main server.js file to include the storage routes:
   ```javascript
   const storageRouter = require('./storage-server');
   app.use('/storage', storageRouter);
   ```

**Option B: Using S3-compatible Storage**
1. Install required packages:
   ```bash
   npm install aws-sdk
   ```

2. Create a `.env.local` file in the root directory with your S3 credentials:
   ```
   S3_ENDPOINT=https://your-s3-endpoint
   S3_ACCESS_KEY=your-access-key
   S3_SECRET_KEY=your-secret-key
   S3_BUCKET=your-bucket-name
   S3_REGION=your-region
   ```

3. Create a utility file `src/lib/s3Storage.js`:
   ```javascript
   const AWS = require('aws-sdk');

   // Initialize S3 client
   const s3 = new AWS.S3({
     accessKeyId: process.env.S3_ACCESS_KEY,
     secretAccessKey: process.env.S3_SECRET_KEY,
     endpoint: process.env.S3_ENDPOINT,
     s3ForcePathStyle: true, // needed for MinIO and some other S3-compatible services
     signatureVersion: 'v4',
     region: process.env.S3_REGION,
   });

   const bucketName = process.env.S3_BUCKET;

   // Function to upload a file
   async function uploadFile(file, path) {
     const fileContent = Buffer.from(file.buffer);
     
     const params = {
       Bucket: bucketName,
       Key: path,
       Body: fileContent,
       ContentType: file.mimetype,
     };
     
     try {
       const result = await s3.upload(params).promise();
       return result.Location;
     } catch (error) {
       console.error('Error uploading file:', error);
       throw error;
     }
   }

   // Function to get a file
   async function getFileUrl(path) {
     const params = {
       Bucket: bucketName,
       Key: path,
       Expires: 60 * 60 * 24, // URL expires in 24 hours
     };
     
     try {
       return s3.getSignedUrl('getObject', params);
     } catch (error) {
       console.error('Error generating signed URL:', error);
       throw error;
     }
   }

   // Function to delete a file
   async function deleteFile(path) {
     const params = {
       Bucket: bucketName,
       Key: path,
     };
     
     try {
       await s3.deleteObject(params).promise();
       return true;
     } catch (error) {
       console.error('Error deleting file:', error);
       throw error;
     }
   }

   module.exports = {
     uploadFile,
     getFileUrl,
     deleteFile,
   };
   ```

#### 4.2 Alternative for Edge Functions

Supabase Edge Functions can be replaced with Express.js API endpoints:

1. Install Express.js if not already installed:
   ```bash
   npm install express cors body-parser
   ```

2. Create a server directory with API endpoints:
   ```bash
   mkdir -p server/api
   ```

3. Create a base server.js file:
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const bodyParser = require('body-parser');
   const path = require('path');
   
   // Import API route handlers
   const generateScheduleXml = require('./api/generate-schedule-xml');
   const generateScheduleJson = require('./api/generate-schedule-json');
   const scheduleXmlRefresh = require('./api/schedule-xml-refresh');
   const sendLineupEmail = require('./api/send-lineup-email');
   const executeSql = require('./api/execute-sql');
   
   const app = express();
   
   // Middleware
   app.use(cors());
   app.use(bodyParser.json());
   
   // API Routes
   app.use('/api/generate-schedule-xml', generateScheduleXml);
   app.use('/api/generate-schedule-json', generateScheduleJson);
   app.use('/api/schedule-xml-refresh', scheduleXmlRefresh);
   app.use('/api/send-lineup-email', sendLineupEmail);
   app.use('/api/execute-sql', executeSql);
   
   // Serve static files from the React app
   app.use(express.static(path.join(__dirname, '../dist')));
   
   // The "catchall" handler: for any request that doesn't match an API route,
   // send back the React app's index.html file.
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../dist/index.html'));
   });
   
   const PORT = process.env.PORT || 8080;
   app.listen(PORT, () => {
     console.log(`Server listening on port ${PORT}`);
   });
   ```

4. Create API endpoint files in the server/api directory for each of your Edge Functions. For example, `server/api/generate-schedule-xml.js`:
   ```javascript
   const express = require('express');
   const { Pool } = require('pg');
   const router = express.Router();
   
   // Create a PostgreSQL connection pool
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });
   
   router.post('/', async (req, res) => {
     try {
       // Implementation of your generate-schedule-xml logic
       const { previewOffset } = req.body || {};
       
       // Get schedule data from database
       const client = await pool.connect();
       // ... your SQL queries
       
       // Generate XML
       const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><schedule>...</schedule>';
       
       // Store in database
       await client.query('UPDATE system_settings SET value = $1 WHERE key = $2', [xmlContent, 'schedule_xml']);
       client.release();
       
       res.send(xmlContent);
     } catch (error) {
       console.error('Error generating schedule XML:', error);
       res.status(500).send({ error: 'Failed to generate schedule XML' });
     }
   });
   
   module.exports = router;
   ```

5. Update package.json scripts to run both the client and server:
   ```json
   "scripts": {
     "dev": "concurrently \"vite\" \"node server/server.js\"",
     "start": "node server/server.js",
     "build": "vite build",
     "preview": "vite preview"
   }
   ```

#### 4.3 Alternative for Cron Jobs

For scheduled tasks, you can use node-cron:

1. Install node-cron:
   ```bash
   npm install node-cron
   ```

2. Create a `cron.js` file in the server directory:
   ```javascript
   const cron = require('node-cron');
   const axios = require('axios');
   const { Pool } = require('pg');
   
   // Create a PostgreSQL connection pool
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });
   
   // Function to get the refresh interval from system settings
   async function getRefreshInterval() {
     try {
       const client = await pool.connect();
       const result = await client.query(
         "SELECT value FROM system_settings WHERE key = 'schedule_xml_refresh_interval'"
       );
       client.release();
       
       if (result.rows.length > 0) {
         return parseInt(result.rows[0].value) || 10; // Default to 10 minutes
       }
       
       return 10; // Default to 10 minutes
     } catch (error) {
       console.error('Error getting refresh interval:', error);
       return 10; // Default to 10 minutes
     }
   }
   
   // Schedule the XML generation task
   async function scheduleXmlGeneration() {
     const intervalMinutes = await getRefreshInterval();
     
     // Schedule the task using the retrieved interval
     cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
       try {
         console.log(`Running scheduled XML generation (every ${intervalMinutes} minutes)`);
         
         // Call the API endpoint to generate XML
         await axios.post('http://localhost:8080/api/generate-schedule-xml');
         
         console.log('Scheduled XML generation completed successfully');
       } catch (error) {
         console.error('Error in scheduled XML generation:', error);
       }
     });
     
     console.log(`XML generation scheduled to run every ${intervalMinutes} minutes`);
   }
   
   // Schedule the lineup email task
   cron.schedule('* * * * *', async () => {
     try {
       console.log('Checking for lineup emails to send...');
       
       // Call the API endpoint to send emails
       await axios.post('http://localhost:8080/api/schedule-lineup-emails');
       
       console.log('Lineup email check completed');
     } catch (error) {
       console.error('Error in lineup email schedule:', error);
     }
   });
   
   // Initialize scheduled tasks
   scheduleXmlGeneration();
   
   console.log('Cron jobs initialized');
   ```

3. Update the main server.js file to include the cron jobs:
   ```javascript
   // Initialize cron jobs
   require('./cron');
   ```

### 5. Configure the Client

1. Create a `.env` file in the project root with connection information:
   ```
   VITE_API_URL=http://localhost:8080/api
   VITE_DATABASE_URL=postgres://username:password@localhost:5432/radiodb
   VITE_STORAGE_URL=http://localhost:8080/storage
   ```

2. Update the Supabase client adapter to use your custom backend:
   
   Create a file `src/lib/api-client.js`:
   ```javascript
   import axios from 'axios';

   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
   
   export const apiClient = axios.create({
     baseURL: API_URL,
     headers: {
       'Content-Type': 'application/json',
     },
   });
   
   export const invokeFunction = async (functionName, body = {}) => {
     try {
       const response = await apiClient.post(`/${functionName}`, body);
       return { data: response.data, error: null };
     } catch (error) {
       console.error(`Error invoking function ${functionName}:`, error);
       return { data: null, error: error.response?.data || error.message };
     }
   };
   
   export const storage = {
     from: (bucket) => ({
       upload: async (path, file) => {
         try {
           const formData = new FormData();
           formData.append('file', file);
           
           const response = await apiClient.post(`/storage/upload/${bucket}`, formData, {
             headers: {
               'Content-Type': 'multipart/form-data',
             },
           });
           
           return { data: response.data, error: null };
         } catch (error) {
           console.error('Error uploading file:', error);
           return { data: null, error: error.response?.data || error.message };
         }
       },
       getPublicUrl: (path) => {
         const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8080/storage';
         return {
           data: { publicUrl: `${STORAGE_URL}/${bucket}/${path}` },
         };
       },
       remove: async (paths) => {
         try {
           if (!Array.isArray(paths)) {
             paths = [paths];
           }
           
           const results = await Promise.all(
             paths.map((path) => apiClient.delete(`/storage/${bucket}/${path}`))
           );
           
           return { data: results.map(r => r.data), error: null };
         } catch (error) {
           console.error('Error removing files:', error);
           return { data: null, error: error.response?.data || error.message };
         }
       },
     }),
   };
   ```

### 6. Database Management

Since you won't have access to Supabase's built-in database management tools, consider these alternatives:

#### Option A: pgAdmin
1. Install pgAdmin from [pgadmin.org](https://www.pgadmin.org/download/)
2. Connect to your PostgreSQL database using your credentials
3. Use the GUI to manage tables, run queries, and perform database operations

#### Option B: DBeaver
1. Install DBeaver from [dbeaver.io](https://dbeaver.io/download/)
2. Connect to your PostgreSQL database using your credentials
3. Use the GUI to manage your database

### 7. Authentication

Without Supabase auth, you'll need an alternative authentication system:

#### Option: Implement JWT-based authentication

1. Install required packages:
   ```bash
   npm install jsonwebtoken bcrypt
   ```

2. Create an auth middleware in `server/middleware/auth.js`:
   ```javascript
   const jwt = require('jsonwebtoken');
   
   const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
   
   function authMiddleware(req, res, next) {
     // Get token from the Authorization header
     const authHeader = req.headers.authorization;
     const token = authHeader && authHeader.split(' ')[1];
     
     if (!token) {
       return res.status(401).json({ error: 'Access denied. No token provided.' });
     }
     
     try {
       // Verify token
       const decoded = jwt.verify(token, JWT_SECRET);
       req.user = decoded;
       next();
     } catch (error) {
       res.status(400).json({ error: 'Invalid token.' });
     }
   }
   
   module.exports = authMiddleware;
   ```

3. Create authentication routes in `server/api/auth.js`:
   ```javascript
   const express = require('express');
   const bcrypt = require('bcrypt');
   const jwt = require('jsonwebtoken');
   const { Pool } = require('pg');
   
   const router = express.Router();
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });
   
   const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
   
   // Register endpoint
   router.post('/register', async (req, res) => {
     try {
       const { email, password, full_name } = req.body;
       
       // Check if user exists
       const client = await pool.connect();
       const existingUser = await client.query(
         'SELECT * FROM users WHERE email = $1',
         [email]
       );
       
       if (existingUser.rows.length > 0) {
         client.release();
         return res.status(400).json({ error: 'User already exists' });
       }
       
       // Hash password
       const salt = await bcrypt.genSalt(10);
       const hashedPassword = await bcrypt.hash(password, salt);
       
       // Insert user
       const result = await client.query(
         'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
         [email, hashedPassword, full_name]
       );
       
       client.release();
       
       // Generate token
       const token = jwt.sign(
         { id: result.rows[0].id, email: result.rows[0].email },
         JWT_SECRET,
         { expiresIn: '1d' }
       );
       
       res.json({
         user: {
           id: result.rows[0].id,
           email: result.rows[0].email,
           full_name: result.rows[0].full_name,
         },
         token,
       });
     } catch (error) {
       console.error('Registration error:', error);
       res.status(500).json({ error: 'Internal server error' });
     }
   });
   
   // Login endpoint
   router.post('/login', async (req, res) => {
     try {
       const { email, password } = req.body;
       
       // Check if user exists
       const client = await pool.connect();
       const result = await client.query(
         'SELECT * FROM users WHERE email = $1',
         [email]
       );
       
       if (result.rows.length === 0) {
         client.release();
         return res.status(400).json({ error: 'Invalid email or password' });
       }
       
       const user = result.rows[0];
       
       // Compare password
       const isValidPassword = await bcrypt.compare(password, user.password_hash);
       
       if (!isValidPassword) {
         client.release();
         return res.status(400).json({ error: 'Invalid email or password' });
       }
       
       client.release();
       
       // Generate token
       const token = jwt.sign(
         { id: user.id, email: user.email },
         JWT_SECRET,
         { expiresIn: '1d' }
       );
       
       res.json({
         user: {
           id: user.id,
           email: user.email,
           full_name: user.full_name,
         },
         token,
       });
     } catch (error) {
       console.error('Login error:', error);
       res.status(500).json({ error: 'Internal server error' });
     }
   });
   
   module.exports = router;
   ```

4. Add the auth routes to your server.js:
   ```javascript
   const authRouter = require('./api/auth');
   app.use('/api/auth', authRouter);
   ```

### 8. Running in Production

For a production environment, consider the following steps:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set up process management with PM2**:
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start the application
   pm2 start server/server.js --name radio-app
   
   # Ensure PM2 starts on system restart
   pm2 startup
   pm2 save
   ```

3. **Set up a reverse proxy with Nginx**:
   ```
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Secure with HTTPS** using Let's Encrypt:
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Obtain and install SSL certificates
   sudo certbot --nginx -d your-domain.com
   ```

### 9. Updating the Database Schema

1. **Create a migrations folder** to track database schema changes:
   ```bash
   mkdir -p database/migrations
   ```

2. **Create numbered migration files** in the migrations folder, for example:
   ```sql
   -- database/migrations/001_initial_schema.sql
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     full_name TEXT,
     is_admin BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   -- Additional tables...
   ```

3. **Create a script to run migrations**:
   ```javascript
   // server/db/run-migrations.js
   const fs = require('fs');
   const path = require('path');
   const { Pool } = require('pg');
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });
   
   async function runMigrations() {
     const client = await pool.connect();
     
     try {
       // Create migrations table if it doesn't exist
       await client.query(`
         CREATE TABLE IF NOT EXISTS migrations (
           id SERIAL PRIMARY KEY,
           name TEXT NOT NULL,
           applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
         )
       `);
       
       // Get applied migrations
       const { rows } = await client.query('SELECT name FROM migrations');
       const appliedMigrations = new Set(rows.map(row => row.name));
       
       // Get migration files
       const migrationsDir = path.join(__dirname, '../../database/migrations');
       const migrationFiles = fs.readdirSync(migrationsDir)
         .filter(file => file.endsWith('.sql'))
         .sort();
       
       // Apply new migrations
       for (const file of migrationFiles) {
         if (!appliedMigrations.has(file)) {
           console.log(`Applying migration: ${file}`);
           
           const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
           await client.query('BEGIN');
           
           try {
             await client.query(sql);
             await client.query(
               'INSERT INTO migrations (name) VALUES ($1)',
               [file]
             );
             await client.query('COMMIT');
             console.log(`Migration ${file} applied successfully`);
           } catch (error) {
             await client.query('ROLLBACK');
             console.error(`Error applying migration ${file}:`, error);
             throw error;
           }
         }
       }
       
       console.log('All migrations applied successfully');
     } finally {
       client.release();
     }
   }
   
   runMigrations().catch(console.error);
   ```

4. **Add a script to package.json** to run migrations:
   ```json
   "scripts": {
     "migrate": "node server/db/run-migrations.js"
   }
   ```

## Troubleshooting

### Connection Issues

If you experience connection issues with your local database:

1. Verify PostgreSQL is running
2. Check that your database credentials are correct
3. Ensure your PostgreSQL instance allows connections from the application
4. Check PostgreSQL logs for any error messages

### Authentication Issues

If you're unable to log in after configuring authentication:

1. Verify the users table has been properly migrated
2. Check that you're using the correct credentials
3. Verify that your JWT secret is correctly set in both the server and client environments

### PostgreSQL Configuration

If you have trouble connecting to your PostgreSQL database, you might need to edit the PostgreSQL configuration:

1. Locate your `pg_hba.conf` file:
   - Windows: Usually in `C:\Program Files\PostgreSQL\<version>\data\`
   - macOS: Usually in `/usr/local/var/postgres/` (Homebrew) or `/Library/PostgreSQL/<version>/data/`
   - Linux: Usually in `/etc/postgresql/<version>/main/`

2. Add or modify the following lines to allow local connections:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            md5
   # IPv6 local connections:
   host    all             all             ::1/128                 md5
   ```

3. Restart PostgreSQL service after making changes.

### Email Sending

For email sending functionality (replacing Supabase edge functions):

1. Install Nodemailer:
   ```bash
   npm install nodemailer
   ```

2. Create an email service in `server/services/email-service.js`:
   ```javascript
   const nodemailer = require('nodemailer');
   const { Pool } = require('pg');
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });
   
   // Get email settings from the database
   async function getEmailSettings() {
     const client = await pool.connect();
     try {
       const result = await client.query('SELECT * FROM email_settings LIMIT 1');
       return result.rows[0];
     } finally {
       client.release();
     }
   }
   
   // Create mail transporter based on settings
   async function createTransporter() {
     const settings = await getEmailSettings();
     
     if (settings.email_method === 'smtp') {
       return nodemailer.createTransport({
         host: settings.smtp_host,
         port: settings.smtp_port,
         secure: settings.smtp_port === 465,
         auth: {
           user: settings.smtp_user,
           pass: settings.smtp_password,
         },
       });
     } else {
       // Handle other email methods
       throw new Error(`Unsupported email method: ${settings.email_method}`);
     }
   }
   
   // Send email function
   async function sendEmail({ to, subject, html }) {
     try {
       const settings = await getEmailSettings();
       const transporter = await createTransporter();
       
       const mailOptions = {
         from: `"${settings.sender_name}" <${settings.sender_email}>`,
         to,
         subject,
         html,
       };
       
       const info = await transporter.sendMail(mailOptions);
       return { success: true, messageId: info.messageId };
     } catch (error) {
       console.error('Error sending email:', error);
       return { success: false, error: error.message };
     }
   }
   
   module.exports = {
     sendEmail,
   };
   ```

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## Support

For additional support, please contact the application administrator.
