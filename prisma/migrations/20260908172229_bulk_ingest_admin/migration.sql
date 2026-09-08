-- AlterTable
ALTER TABLE "ImageAsset" ADD COLUMN     "removedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PhysicalObject" ADD COLUMN     "externalRecordUrl" TEXT;

-- CreateTable
CREATE TABLE "DuplicateFlag" (
    "id" TEXT NOT NULL,
    "artworkAId" TEXT NOT NULL,
    "artworkBId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DuplicateFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestLog" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "artworkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuplicateFlag_status_idx" ON "DuplicateFlag"("status");

-- CreateIndex
CREATE INDEX "IngestLog_sourceName_externalId_idx" ON "IngestLog"("sourceName", "externalId");

-- CreateIndex
CREATE INDEX "IngestLog_status_idx" ON "IngestLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalObject_externalRecordUrl_key" ON "PhysicalObject"("externalRecordUrl");

-- AddForeignKey
ALTER TABLE "DuplicateFlag" ADD CONSTRAINT "DuplicateFlag_artworkAId_fkey" FOREIGN KEY ("artworkAId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateFlag" ADD CONSTRAINT "DuplicateFlag_artworkBId_fkey" FOREIGN KEY ("artworkBId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

