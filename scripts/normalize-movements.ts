// Usage: npx tsx scripts/normalize-movements.ts
import { prisma } from "@/lib/prisma";
import { normalizeMovements } from "@/lib/movements/normalize-movements";

const result = await normalizeMovements(prisma);
console.log(`Movements created: ${result.created}`);
console.log(`Artwork links created: ${result.linked}`);
console.log(`styleTitle assertions processed: ${result.assertionsSeen}`);

await prisma.$disconnect();
