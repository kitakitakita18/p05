# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

マンション理事会管理システム - Web application for managing apartment building board meetings, agendas, announcements, and garbage collection schedules.

## Codebase Structure

- `server/` - Node.js/Express backend with JWT authentication and PostgreSQL
- `client/` - React/TypeScript frontend with responsive design
- `server/database.sql` - Database schema and sample data
- `server/uploads/` - File upload directory

## Development Commands

```bash
# Install dependencies
npm install
cd client && npm install

# Start development servers
npm run dev  # Runs both server and client concurrently

# Individual commands
npm run server  # Start backend server (port 5105)
npm run client  # Start frontend dev server (port 3105)

# Build and deploy
npm run build   # Build React app for production
npm run lint    # Run ESLint
npm run typecheck  # TypeScript type checking
```

## Architecture

- **Backend**: Node.js/Express with JWT authentication and role-based access control
- **Frontend**: React/TypeScript with Context API for state management
- **Database**: PostgreSQL with tables for users, meetings, agendas, documents, etc.
- **Authentication**: JWT tokens with 4 user roles (admin, chairperson, board_member, resident)
- **File Uploads**: Multer for handling document attachments

## Key Features

1. **Authentication & Authorization**: JWT-based with role-based permissions
2. **Dashboard**: Shows upcoming meetings, announcements, and garbage schedule
3. **Meeting Management**: Create/manage board meetings (admin/chairperson only)
4. **Agenda Management**: Handle meeting agendas and minutes
5. **Garbage Calendar**: Display collection schedules
6. **User Management**: Admin can manage user accounts

## Database Setup

Run `server/database.sql` to create tables and insert sample data.

## User Roles & Permissions

- **admin**: Full access to all features and user management
- **chairperson**: Can manage meetings, agendas, and announcements
- **board_member**: Can view meetings, comment on agendas
- **resident**: Can view announcements and garbage calendar

## Development Notes

- API endpoints are prefixed with `/api/`
- Client proxy is configured to backend on port 5105
- All dates use date-fns with Japanese locale
- Responsive design with mobile-first approach