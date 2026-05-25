import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main(){
  const migrations = await prisma.$queryRawUnsafe('SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 20');
  console.log('migrations:', JSON.stringify(migrations, null, 2));
  const dealCols = await prisma.$queryRawUnsafe("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='Deal' ORDER BY ordinal_position");
  console.log('deal columns:', JSON.stringify(dealCols, null, 2));
}
main().catch(e=>{ console.error(e); process.exit(1); }).finally(async ()=>{ await prisma.$disconnect(); });
