# Multi-player Trivia Tournament 

A real-time multiplayer trivia game built with React, Node.js, Express, PostgreSQL, and Socket.io. Players compete head-to-head answering trivia questions across multiple categories with live scoring and leaderboards.

## Features

- **Real-time Multiplayer**: WebSocket-based live gameplay
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Match System**: Create/join matches, invite friends, spectate ongoing games
- **Leaderboard**: Global rankings tracking wins, accuracy, and streaks
- **Admin Dashboard**: Question and category management
- **Profile Customization**: Choose avatars and track personal statistics

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Socket.io-client
- **Backend**: Node.js, Express 5, Socket.io
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens, bcrypt
- **Development**: Docker Compose (PostgreSQL)

---

## Requirements 

- **Node.js** v20.19.0 or higher
- **Docker & Docker Compose** (for PostgreSQL)
- **npm**

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd group-23-rw343-project-2
```

### 2. Full Setup

Run the setup command to install dependencies, start PostgreSQL, run migrations, and seed data:

```bash
make setup
```

This will:
- Start PostgreSQL in Docker
- Install client and server dependencies
- Run database migrations
- Seed the database with users and categories

### 3. Start Development Servers

Terminal 1 - Backend:
```bash
make dev-server
```

Terminal 2 - Frontend:
```bash
make dev-client
```

---

## Manual Setup

If you prefer step-by-step setup or the Makefile doesn't work:

### 1. Start PostgreSQL

```bash
docker-compose up -d postgres
```

Wait for PostgreSQL to be ready:
```bash
docker-compose exec postgres pg_isready -U trivia_user -d trivia_db
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Configure Environment Variables

The server uses these default values (no `.env` file needed for development):

```env
DATABASE_URL=postgresql://trivia_user:trivia_pass@localhost:5432/trivia_db
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

To customize, create `server/.env` and override any values.

### 4. Run Database Migrations

```bash
cd server
npx prisma migrate deploy
```

### 5. Generate Prisma Client

```bash
cd server
npx prisma generate
```

### 6. Seed Database

```bash
cd server
npm run db:seed
```

This creates:
- **Test users**: `admin@test.com` / `admin123`, `user@test.com` / `user123`
- **Categories**: General Knowledge, Science, History, etc.

### 7. Import Questions (Optional)

Load real trivia questions from Open Trivia Database:

```bash
cd server
npm run import-questions
```

### 8. Start Development Servers

Backend:
```bash
cd server
npm run dev
```

Frontend (new terminal):
```bash
cd client
npm run dev
```

---

## Available Commands

### General

| Command | Description |
|---------|-------------|
| `make setup` | Full setup (DB + deps + migrations + seed) |
| `make install` | Install client + server dependencies |
| `make dev-client` | Start frontend dev server (Vite) |
| `make dev-server` | Start backend dev server (hot-reload) |
| `make build` | Build for production |
| `make clean` | Remove build outputs |

### Database

| Command | Description |
|---------|-------------|
| `make db-up` | Start PostgreSQL (Docker) |
| `make db-down` | Stop PostgreSQL |
| `make db-reset` | Reset database (drop + recreate) |
| `make db-clear` | Clear all data (keep structure) |
| `make db-migrate` | Run Prisma migrations |
| `make db-seed` | Seed database (users + categories) |
| `make db-studio` | Open Prisma Studio GUI |
| `make import-questions` | Import questions from OpenTDB |

### Testing

| Command | Description |
|---------|-------------|
| `make test-api` | Test all API endpoints |
| `make test-auth` | Test authentication system |
| `make test-match` | Test match system |
| `make test-websocket` | Test WebSocket functionality |
| `make test-scoring` | Test scoring system (unit tests) |
| `make test-profile` | Test profile endpoints |

---

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks (WebSocket)
│   │   └── utils/         # Helper functions
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── auth/          # Authentication (JWT, middleware)
│   │   ├── user/          # User management
│   │   ├── match/         # Match logic
│   │   ├── question/      # Question CRUD
│   │   ├── category/      # Category management
│   │   ├── leaderboard/   # Rankings & stats
│   │   ├── socket/        # WebSocket events
│   │   └── trivia/        # OpenTDB import
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   ├── seed.js        # Initial data
│   │   └── migrations/    # SQL migrations
│   └── package.json
│
├── tests/                  # API & integration tests
├── docker-compose.yml      # PostgreSQL container
├── Makefile               # Development commands
└── README.md              # This file
```

---

## Default Test Accounts

After running `make db-seed`, you can log in with:

| Email | Password | Role |
|-------|----------|------|
| `admin@bb.com` | `Admin1234` | Admin |
| `tiaan@bb.com` | `Tiaan1234` | Player |
| `jaiden@bb.com` | `Jaiden1234` | Player |
| `lenz@bb.com` | `Lenz1234` | Player |
| `shalome@bb.com` | `Shalome1234` | Player |
| `neil@bb.com` | `Neil1234` | Player |

---

## Database Management

### View Database in GUI

```bash
make db-studio
```

Opens Prisma Studio at http://localhost:5555

### Reset Database (Fresh Start)

```bash
make db-reset
```

Drops all tables, reruns migrations, and seeds data.

### Clear All Data (Keep Schema)

```bash
make db-clear
```

Deletes all rows but keeps table structure.

### Direct PostgreSQL Access

```bash
docker-compose exec postgres psql -U trivia_user -d trivia_db
```

---

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is taken:

**Backend**: Set `PORT=4000` in `server/.env`  
**Frontend**: Vite will auto-increment to 5174

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
make db-down
make db-up

# Check logs
docker-compose logs postgres
```

### Prisma Client Not Found

```bash
cd server
npx prisma generate
```

### Migration Errors

```bash
make db-reset
```

This will drop the database and reapply all migrations.

---

## API Documentation

Detailed API documentation is available in each module:

- [Authentication](server/src/auth/AUTH_DOCS.md) - Login, register, JWT
- [Users](server/src/user/USER_DOCS.md) - Profile management
- [Matches](server/src/match/MATCH_DOCS.md) - Game lifecycle
- [Questions](server/src/question/QUESTION_DOCS.md) - Question CRUD
- [Categories](server/src/category/CATEGORY_DOCS.md) - Category management
- [Leaderboard](server/src/leaderboard/LEADERBOARD_DOCS.md) - Rankings
- [WebSocket](server/src/socket/SOCKET_DOCS.md) - Real-time events

---

## Live Demo

**Deployed Application**: https://brainbash-vp7y.onrender.com

The application is deployed on Render.com with:
- **Frontend**: Static site (React build)
- **Backend**: Node.js service
- **Database**: PostgreSQL (managed)

**Demo Credentials**:
- **Admin**: `admin@bb.com` / `Admin1234`
- **Test Users**: `tiaan@bb.com`, `jaiden@bb.com`, `lenz@bb.com`, etc. (Password: `<Name>1234`)

**Note**: The free tier has a cold start delay (~30-60 seconds) after 15 minutes of inactivity.

---

## Production Deployment

### Deployed on Render.com

This project uses Infrastructure as Code via `render.yaml` for automatic deployment.

**Services**:
1. **PostgreSQL Database** (`brainbash-db`)
2. **Backend API** (`brainbash-server`) - Node.js at https://brainbash-server.onrender.com
3. **Frontend** (`brainbash`) - Static site at https://brainbash-vp7y.onrender.com

**Auto-deployment**: Pushes to `main` branch trigger automatic redeployment.

### Manual Deployment

#### Build

```bash
make build
```

### Environment Variables

Set these for production:

```env
NODE_ENV=production
DATABASE_URL=<production-postgres-url>
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
PORT=10000
FRONTEND_URL=<your-frontend-url>
API_URL=<your-backend-url>
VITE_API_URL=<your-backend-url>
```

**Required Environment Variables**:
- `JWT_SECRET` - Access token signing key (auto-generated on Render)
- `JWT_REFRESH_SECRET` - Refresh token signing key (auto-generated on Render)
- `DATABASE_URL` - PostgreSQL connection string (provided by Render database)
- `FRONTEND_URL` - For CORS configuration
- `VITE_API_URL` - Frontend API endpoint

### Start Production Server

```bash
cd server
npm start
```

Serve the `client/dist` folder with a static file server (Nginx, Vercel, Netlify, Render, etc.).

---

## Contributors

Group 23 - RW343 Project 2
