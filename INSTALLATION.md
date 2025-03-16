
# Radio Lineup Generator - Installation Guide

This document provides instructions for installing and configuring the Radio Lineup Generator application, including how to set up a local database connection.

## Prerequisites

- Node.js (v18 or higher)
- npm or bun (package managers)
- A PostgreSQL database (for local database option)
- Git (for cloning the repository)

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

Or using bun:
```bash
bun install
```

### 3. Configure Database Connection

You have two options for the database connection:

#### A. Use the default Supabase cloud database
The application is pre-configured to use a Supabase cloud database. No additional configuration is required to use this option.

#### B. Configure a local PostgreSQL database

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

4. **Take note of your database credentials**:
   - Host (usually localhost or 127.0.0.1)
   - Port (usually 5432)
   - Database name (e.g., radiodb)
   - Username (e.g., radiouser or postgres)
   - Password (the one you set)

5. **Database Schema Setup**:
   You have two options for setting up the database schema:
   - Automatic setup through the application (recommended)
   - Manual setup using SQL scripts

   For automatic setup, see section 6.B below after logging in to the application.

   For manual setup, you can use the following SQL to create the basic schema:
   ```sql
   -- Create required tables
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     email TEXT,
     full_name TEXT,
     username TEXT,
     is_admin BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
   );

   CREATE TABLE shows (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     date DATE,
     time TEXT,
     slot_id UUID,
     notes TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE show_items (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     show_id UUID REFERENCES shows(id),
     position INTEGER NOT NULL,
     name TEXT NOT NULL,
     title TEXT,
     details TEXT,
     phone TEXT,
     duration INTEGER,
     is_break BOOLEAN DEFAULT FALSE,
     is_note BOOLEAN DEFAULT FALSE,
     is_divider BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE interviewees (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     title TEXT,
     phone TEXT,
     duration INTEGER,
     item_id UUID NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE schedule_slots (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     day_of_week SMALLINT NOT NULL,
     start_time TIME WITHOUT TIME ZONE NOT NULL,
     end_time TIME WITHOUT TIME ZONE NOT NULL,
     show_name TEXT NOT NULL,
     host_name TEXT,
     color TEXT DEFAULT 'green',
     is_recurring BOOLEAN DEFAULT TRUE,
     is_collection BOOLEAN DEFAULT FALSE,
     is_prerecorded BOOLEAN DEFAULT FALSE,
     has_lineup BOOLEAN DEFAULT FALSE,
     is_modified BOOLEAN DEFAULT FALSE,
     is_deleted BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
   );

   CREATE TABLE day_notes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     date TEXT NOT NULL,
     note TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );

   CREATE TABLE system_settings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     key TEXT NOT NULL,
     value TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );

   CREATE TABLE email_settings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     sender_name TEXT NOT NULL,
     sender_email TEXT NOT NULL,
     subject_template TEXT NOT NULL DEFAULT 'ליינאפ תוכנית {{show_name}}',
     body_template TEXT NOT NULL,
     email_method TEXT DEFAULT 'smtp',
     smtp_host TEXT NOT NULL,
     smtp_port INTEGER NOT NULL,
     smtp_user TEXT NOT NULL,
     smtp_password TEXT NOT NULL,
     gmail_client_id TEXT DEFAULT '',
     gmail_client_secret TEXT DEFAULT '',
     gmail_redirect_uri TEXT DEFAULT '',
     gmail_refresh_token TEXT DEFAULT '',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );

   CREATE TABLE email_recipients (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );

   CREATE TABLE work_arrangements (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     type TEXT NOT NULL,
     week_start DATE NOT NULL,
     filename TEXT NOT NULL,
     url TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );

   CREATE TABLE show_email_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     show_id UUID NOT NULL,
     sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     success BOOLEAN NOT NULL,
     error_message TEXT
   );

   -- Create trigger functions for updated_at timestamps
   CREATE OR REPLACE FUNCTION handle_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = timezone('utc'::text, now());
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Create triggers
   CREATE TRIGGER handle_schedule_slots_updated_at
   BEFORE UPDATE ON schedule_slots
   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

   CREATE TRIGGER day_notes_updated_at
   BEFORE UPDATE ON day_notes
   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

   CREATE TRIGGER set_updated_at
   BEFORE UPDATE ON email_settings
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   CREATE TRIGGER set_system_settings_updated_at
   BEFORE UPDATE ON system_settings
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   ```

### 4. Start the Development Server

```bash
npm run dev
```

Or using bun:
```bash
bun run dev
```

The application will be available at http://localhost:8080 by default.

### 5. To Run on Port 80 (Optional)

Running a Node.js application on port 80 typically requires root privileges or additional configuration:

#### Option A: Using root privileges (not recommended for production)

```bash
sudo npm run dev -- --port=80
```

Or using bun:
```bash
sudo bun run dev -- --port=80
```

#### Option B: Using port forwarding (recommended)

1. Run the application on the default port (8080)
2. Set up port forwarding from port 80 to 8080:

   **Linux/macOS**:
   ```bash
   sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
   ```

   **Windows**:
   ```
   netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=8080 connectaddress=127.0.0.1
   ```

#### Option C: Using a reverse proxy

Set up a reverse proxy using Nginx or Apache to forward requests from port 80 to your application port.

Example Nginx configuration:
```
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6. Login to the Application

Use the admin credentials provided during setup to log in to the application:
- Email: [your admin email]
- Password: [your admin password]

### 7. Configure Application Settings

After logging in, you should:

1. Set your application's domain name in the admin settings to ensure all URLs generated by the application (including email validation links) are correct.
2. Configure your database settings if using a local database.

### 8. Configure Database Settings in Admin Console

To switch from the default Supabase database to your local PostgreSQL database:

1. Log in as an administrator
2. Navigate to Admin section
3. Select the "Database Settings" tab
4. Choose "Local Database" option
5. Enter your database connection details:
   - Host
   - Port
   - Database name
   - Username
   - Password
6. Click "Save Settings"

   a. **For existing databases**: The application will attempt to connect to the database.
   b. **For fresh databases**: You will have the option to initialize the database schema automatically. Use this option if you're starting with an empty database.

7. After setting up the database, you can import data from a backup file:
   - Go to the "Data Management" tab in the Admin section
   - Select the "Import Data" tab
   - Upload your backup JSON file

## Troubleshooting

### Connection Issues

If you experience connection issues with your local database:

1. Verify PostgreSQL is running
2. Check that your database credentials are correct
3. Ensure your PostgreSQL instance allows connections from the application
4. Check PostgreSQL logs for any error messages

### Authentication Issues

If you're unable to log in after configuring a local database:

1. Verify the users table has been properly migrated
2. Check the authentication configuration in the database settings

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

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For additional support, please contact the application administrator.
