# Database Setup (PostgreSQL)

This guide explains how to set up PostgreSQL, create a local database, configure environment variables, apply Prisma migrations, and seed the database with test data for this project.

## Prerequisites

- Node.js and npm (for Prisma commands)
- PostgreSQL (locally)
- `psql`, `createdb`, `createuser` available when Postgres is installed locally

----

## Local PostgreSQL (Ubuntu)

1. Install PostgreSQL:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```
Start the PostgreSQL service:
```bash
sudo service postgresql start
```

2. Create PostgreSQL User and Database (replace placeholders)

Open a terminal:

```bash
sudo -u postgres psql
```

In the PostgreSQL prompt, create your user and database (replace your_username and your_db_name):

```bash
-- Create a new PostgreSQL user
CREATE USER your_username WITH PASSWORD 'your_password';

-- Create a new database owned by the user
CREATE DATABASE your_db_name OWNER your_username;

-- Exit PostgreSQL
\q
```

3. Verify PostgreSQL is running and the database exists:

```bash
psql -U <your_username> -d group23_project2 -c "\dt"
```

3. Set Up Environment Variables

Create a .env file inside the server folder (or inside server/prisma) with the following content:

```bash
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/your_db_name?schema=public"
```

Replace your_username, your_password, and your_db_name with the values you used above.

4. Apply Prisma Migrations

From the project root:

```bash
cd server
npx prisma migrate dev --name init --skip-seed
```

This will create the database schema according to prisma/schema.prisma.

5. Generate Prisma Client

Still in the server folder:

```bash
npx prisma generate
```

This generates the Prisma client in src/generated/prisma.

6. Seed the Database with Test Data

Run the seed script:

```bash
node prisma/seed.js
```

You should see:

```bash
Seeding database (idempotent)...
Seeding finished.
```

7. Verify Setup (Optional)

Connect to your database:

```bash
psql -U your_username -d your_db_name
```

List tables:

```bash
\dt
```

Check some seeded data, e.g., users:

```bash
SELECT * FROM users;
```

8. After Setup

You can confirm everything worked by running:

```bash
cd server
npx prisma studio
```

This opens Prisma Studio in your browser — a visual interface to explore your database.

Your local database is now ready!
You can now run the backend and it will connect to this database.