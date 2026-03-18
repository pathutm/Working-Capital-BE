import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const COMPANY_ID = '7b321eb2-39ee-479a-b740-841b316d2243';

  console.log('--- Seeding Accounts ---');
  
  const accountsData = [
    { name: "HDFC Bank", type: "BANK" },
    { name: "Cash Account", type: "CASH" }
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: {
        company_id_name: {
          company_id: COMPANY_ID,
          name: acc.name
        }
      },
      update: {},
      create: {
        name: acc.name,
        type: acc.type,
        company_id: COMPANY_ID
      }
    });
  }

  const bank = await prisma.account.findFirst({
    where: { name: "HDFC Bank", company_id: COMPANY_ID }
  });

  const cash = await prisma.account.findFirst({
    where: { name: "Cash Account", company_id: COMPANY_ID }
  });

  if (!bank || !cash) {
    throw new Error("Accounts not found after seeding");
  }

  console.log('Accounts seeded successfully.');

  console.log('--- Seeding Transactions ---');

  // Clean up existing transactions for this seeded data to allow re-runs
  await prisma.transaction.deleteMany({
    where: { company_id: COMPANY_ID }
  });

  // 3. Transactions with proper Decimal handling
  const transactions = [
    {
      account_id: bank.id,
      company_id: COMPANY_ID,
      type: "INFLOW",
      amount: new Prisma.Decimal(50000),
      reference_type: "SALES_INVOICE",
      reference_id: "SINV-1001",
      description: "Customer payment received",
      date: new Date(),
      status: "COMPLETED"
    },
    {
      account_id: bank.id,
      company_id: COMPANY_ID,
      type: "OUTFLOW",
      amount: new Prisma.Decimal(20000),
      reference_type: "PURCHASE_INVOICE",
      reference_id: "PINV-1001",
      description: "Payment to vendor",
      date: new Date(),
      status: "COMPLETED"
    },
    {
      account_id: cash.id,
      company_id: COMPANY_ID,
      type: "OUTFLOW",
      amount: new Prisma.Decimal(5000),
      description: "Office expense",
      date: new Date(),
      status: "COMPLETED"
    }
  ];

  for (const tx of transactions) {
     await prisma.transaction.create({
        data: tx
     });
  }

  console.log('Transactions seeded successfully.');

  // 4. Verification
  const inflow = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: "INFLOW", company_id: COMPANY_ID }
  });

  const outflow = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: "OUTFLOW", company_id: COMPANY_ID }
  });

  const cashBalance = Number(inflow._sum.amount || 0) - Number(outflow._sum.amount || 0);
  console.log(`Verified Cash Balance: ₹${cashBalance} (Expected: ₹25000)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
