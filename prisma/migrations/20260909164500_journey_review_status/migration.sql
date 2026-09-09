-- AlterTable
ALTER TABLE "ExhibitionEvent" ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'unreviewed';

-- AlterTable
ALTER TABLE "OwnershipEvent" ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'unreviewed';
