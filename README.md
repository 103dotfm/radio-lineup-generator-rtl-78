# Radio Lineup Generator - RTL

Generated with Lovable.

## Project info

**URL**: https://lovable.dev/projects/e09ea48d-3f42-4739-95ef-f05c2d5b6f9c

## Installation

For detailed installation instructions, including how to set up with a local database, see [INSTALLATION.md](./INSTALLATION.md).

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (default) or local PostgreSQL database

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:

a. Create a PostgreSQL database and user:
```bash
sudo -u postgres psql
postgres=# CREATE USER radiouser WITH PASSWORD 'radio123';
postgres=# CREATE DATABASE radiodb;
postgres=# GRANT ALL PRIVILEGES ON DATABASE radiodb TO radiouser;
postgres=# \q
```

b. Create a `.env` file in the project root with your database configuration:
```env
DB_TYPE=local
DB_USER=radiouser
DB_PASSWORD=radio123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=radiodb
```

c. Run database migrations:
```bash
npm run migrate
```

3. Start the development server:
```bash
npm run dev
```

4. Start the API server:
```bash
npm run server
```

## Development

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: PostgreSQL

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start the API server
- `npm run migrate` - Run database migrations

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DB_TYPE=local # or 'remote' for remote database
DB_USER=radiouser
DB_PASSWORD=radio123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=radiodb

# Server Configuration
PORT=5174 # API server port

# Client Configuration
VITE_API_URL=http://localhost:5174 # API URL for the client
```

## License

MIT

