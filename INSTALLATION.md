
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

1. Make sure you have PostgreSQL installed and running on your system
2. Create a new PostgreSQL database for the application
3. Take note of your database credentials:
   - Host (usually localhost)
   - Port (usually 5432)
   - Database name
   - Username
   - Password

### 4. Start the Development Server

```bash
npm run dev
```

Or using bun:
```bash
bun run dev
```

The application will be available at http://localhost:8080

### 5. Login to the Application

Use the admin credentials provided during setup to log in to the application:
- Email: [your admin email]
- Password: [your admin password]

### 6. Configure Database Settings in Admin Console

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

## Database Schema

The application requires the following tables in your PostgreSQL database:

- users
- shows
- show_items
- interviewees
- schedule_slots
- day_notes
- system_settings
- email_settings
- email_recipients
- work_arrangements
- show_email_logs

Each table has specific columns and relationships. When you switch to a local database in the admin console, the application will attempt to validate the schema.

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

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For additional support, please contact the application administrator.
