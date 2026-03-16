import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Sns@123', 10);
  
  const organization = await prisma.organization.upsert({
    where: { email: 'admin@snssquare.com' },
    update: {
      name: 'SNS Square',
      passwordHash: passwordHash,
      phone: '+91 00000 00000',
      address: 'SNS Square Office, City',
      contactPerson: 'Admin',
    },
    create: {
      name: 'SNS Square',
      email: 'admin@snssquare.com',
      passwordHash: passwordHash,
      phone: '+91 00000 00000',
      address: 'SNS Square Office, City',
      contactPerson: 'Admin',
    },
  });

  console.log('Organization seeded successfully:', organization);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
