import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.campaignMessage.findMany({
    where: { status: 'FAILED' },
    orderBy: { criadoEm: 'desc' },
    take: 1
  });
  console.log(JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
