import { PrismaClient } from '../src/generated/prisma/index.js'; 
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin(username, email, password) {
  const password_hash = await bcrypt.hash(password, 12);

  const adminUser = await prisma.users.create({
    data: {
      username,
      email,
      password_hash,
      role: 'ADMIN'
    }
  });

  console.log('Admin user created:', adminUser);
}

createAdmin('admin', 'admin@example.com', 'StrongPassword123')
  .catch(console.error)
  .finally(() => prisma.$disconnect());
