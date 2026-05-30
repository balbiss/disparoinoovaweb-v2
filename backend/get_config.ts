import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const config = await prisma.systemSettings.findFirst({ where: { key: 'evolution_api_config' } });
  console.log(config?.value);
}
main().catch(console.error).finally(() => prisma.$disconnect());
