import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user (Olan)
  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'olan@dompetrack.com' },
    update: {},
    create: {
      name: 'Olan',
      email: 'olan@dompetrack.com',
      passwordHash,
    },
  });

  console.log(`✅ User created: ${user.name} (${user.email})`);

  // Create default categories for demo user
  const categories = [
    { name: 'Food', icon: '🍔', color: '#FF6B6B' },
    { name: 'Essentials', icon: '🏠', color: '#4ECDC4' },
    { name: 'Hobby', icon: '🎮', color: '#45B7D1' },
    { name: 'Other', icon: '📦', color: '#96CEB4' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        id: `seed-${cat.name.toLowerCase()}-${user.id}`,
      },
      update: {},
      create: {
        id: `seed-${cat.name.toLowerCase()}-${user.id}`,
        ...cat,
        isDefault: true,
        userId: user.id,
      },
    });
  }

  console.log(`✅ ${categories.length} default categories created`);

  // Create sample transactions
  const makananCat = await prisma.category.findFirst({
    where: { name: 'Food', userId: user.id },
  });

  const primerCat = await prisma.category.findFirst({
    where: { name: 'Essentials', userId: user.id },
  });

  if (makananCat && primerCat) {
    await prisma.transaction.createMany({
      data: [
        {
          type: 'INCOME',
          amount: BigInt(12000000),
          description: 'Monthly Salary',
          date: new Date(2024, 9, 1),
          categoryId: primerCat.id,
          userId: user.id,
        },
        {
          type: 'EXPENSE',
          amount: BigInt(50000),
          description: 'Special Fried Rice',
          date: new Date(2024, 9, 14),
          categoryId: makananCat.id,
          userId: user.id,
        },
        {
          type: 'EXPENSE',
          amount: BigInt(2500000),
          description: 'Electricity & Water Bill',
          date: new Date(2024, 9, 10),
          categoryId: primerCat.id,
          userId: user.id,
        },
        {
          type: 'EXPENSE',
          amount: BigInt(25005),
          description: 'Coffee with Milk',
          date: new Date(2024, 9, 14),
          categoryId: makananCat.id,
          userId: user.id,
        },
        {
          type: 'EXPENSE',
          amount: BigInt(150000),
          description: 'Team Lunch',
          date: new Date(2024, 9, 13),
          categoryId: makananCat.id,
          userId: user.id,
        },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Sample transactions created');
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
