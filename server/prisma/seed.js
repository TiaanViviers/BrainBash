/**
 * seed.js
 *
 * Purpose:
 * - Seeds the database with initial users for development
 * - Creates an admin user and several regular player users
 *
 * Prerequisites:
 * - A running Postgres database configured in `.env` as `DATABASE_URL`
 * - Prisma schema and generated client available
 * - Migrations applied: `npx prisma migrate dev` or `make db-migrate`
 *
 * How to run:
 * 1. From the project root: `make db-seed`
 * 2. Or directly: `node server/prisma/seed.js`
 * 3. After seeding, import questions: `make import-questions`
 *
 * Default Users Created:
 * - Admin (admin@bb.com) - Password: Admin1234 - Role: ADMIN
 * - Tiaan (tiaan@bb.com) - Password: Tiaan1234 - Role: PLAYER
 * - Jaiden (jaiden@bb.com) - Password: Jaiden1234 - Role: PLAYER
 * - Lenz (lenz@bb.com) - Password: Lenz1234 - Role: PLAYER
 * - Shalome (shalome@bb.com) - Password: Shalome1234 - Role: PLAYER
 * - Neil (neil@bb.com) - Password: Neil1234 - Role: PLAYER
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ========================================
  // SEED USERS
  // ========================================
  
  const users = [
    {
      username: 'Admin',
      email: 'admin@bb.com',
      password_hash: '$2b$12$045NbfCNq9HD22WXKvzYNe5bjj5l7tvmi7YjisilRj/ouZEpN9d9S', // Admin1234
      role: 'ADMIN',
      avatar_url: 'stewie',
      status: 'ONLINE'
    },
    {
      username: 'Tiaan',
      email: 'tiaan@bb.com',
      password_hash: '$2b$12$qtwXVA9.8ZCwfWU63O4TCeOdywA2l1GmCyAweniXsG98j/9Bz9XXO', // Tiaan1234
      role: 'PLAYER',
      avatar_url: 'bubbles',
      status: 'ONLINE'
    },
    {
      username: 'Jaiden',
      email: 'jaiden@bb.com',
      password_hash: '$2b$12$OKXy.cR5hS4om6WllZErIOlzGw11cNEfssmZfUt6x/7mni1uov6fK', // Jaiden1234
      role: 'PLAYER',
      avatar_url: 'homer',
      status: 'ONLINE'
    },
    {
      username: 'Lenz',
      email: 'lenz@bb.com',
      password_hash: '$2b$12$BOOyxOzFB5u/G6GePg63A.EyZa104EcnxGuA2QoecVeX4GbOlH8e.', // Lenz1234
      role: 'PLAYER',
      avatar_url: 'brian',
      status: 'ONLINE'
    },
    {
      username: 'Shalome',
      email: 'shalome@bb.com',
      password_hash: '$2b$12$wTnUyuVO/fVH7nirSskP0.D.MUTakvAaBM0VA4gz//lw41l9ewu7q', // Shalome1234
      role: 'PLAYER',
      avatar_url: 'clarence',
      status: 'ONLINE'
    },
    {
      username: 'Neil',
      email: 'neil@bb.com',
      password_hash: '$2b$12$E2OKqBfiWvnxWr8ox2/ykeKLjAjSZYmmOTtgMduRnnS8BzfDf3VNu', // Neil1234
      role: 'PLAYER',
      avatar_url: 'nick',
      status: 'ONLINE'
    }
  ];

  console.log('👥 Creating users...');
  
  for (const userData of users) {
    const user = await prisma.users.upsert({
      where: { email: userData.email },
      update: {
        username: userData.username,
        password_hash: userData.password_hash,
        role: userData.role,
        avatar_url: userData.avatar_url,
        status: userData.status
      },
      create: {
        username: userData.username,
        email: userData.email,
        password_hash: userData.password_hash,
        role: userData.role,
        avatar_url: userData.avatar_url,
        status: userData.status,
        created_at: new Date()
      }
    });
    
    console.log(`  ✓ ${user.role === 'ADMIN' ? '👑' : '👤'} ${user.username} (${user.email})`);
    
    // Create user_stats entry for each user
    await prisma.user_stats.upsert({
      where: { user_id: user.user_id },
      update: {},
      create: {
        user_id: user.user_id,
        games_played: 0,
        games_won: 0,
        total_score: 0,
        average_score: 0
      }
    });
  }

  console.log('\nDatabase seeding complete!\n');
  console.log(' Login credentials:');
  console.log('   Admin: admin@bb.com / Admin1234');
  console.log('   Tiaan: tiaan@bb.com / Tiaan1234');
  console.log('   Jaiden: jaiden@bb.com / Jaiden1234');
  console.log('   Lenz: lenz@bb.com / Lenz1234');
  console.log('   Shalome: shalome@bb.com / Shalome1234');
  console.log('   Neil: neil@bb.com / Neil1234');
  console.log('\n Next steps:');
  console.log('   1. Import questions: make import-questions');
  console.log('   2. Start the server: make dev-server');
  console.log('   3. Start the client: make dev-client');
  console.log('   4. Login as Admin and use the admin panel!\n');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
