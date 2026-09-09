-- CreateTable
CREATE TABLE "OwnershipEvent" (
    "id" TEXT NOT NULL,
    "physicalObjectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnershipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExhibitionEvent" (
    "id" TEXT NOT NULL,
    "physicalObjectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExhibitionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnershipEvent_physicalObjectId_idx" ON "OwnershipEvent"("physicalObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnershipEvent_physicalObjectId_sequence_key" ON "OwnershipEvent"("physicalObjectId", "sequence");

-- CreateIndex
CREATE INDEX "ExhibitionEvent_physicalObjectId_idx" ON "ExhibitionEvent"("physicalObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExhibitionEvent_physicalObjectId_sequence_key" ON "ExhibitionEvent"("physicalObjectId", "sequence");

-- AddForeignKey
ALTER TABLE "OwnershipEvent" ADD CONSTRAINT "OwnershipEvent_physicalObjectId_fkey" FOREIGN KEY ("physicalObjectId") REFERENCES "PhysicalObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipEvent" ADD CONSTRAINT "OwnershipEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitionEvent" ADD CONSTRAINT "ExhibitionEvent_physicalObjectId_fkey" FOREIGN KEY ("physicalObjectId") REFERENCES "PhysicalObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitionEvent" ADD CONSTRAINT "ExhibitionEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
