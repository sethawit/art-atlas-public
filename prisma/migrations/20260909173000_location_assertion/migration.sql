-- CreateTable
CREATE TABLE "LocationAssertion" (
    "id" TEXT NOT NULL,
    "physicalObjectId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sourceStatement" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "verificationStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationAssertion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationAssertion_physicalObjectId_idx" ON "LocationAssertion"("physicalObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationAssertion_physicalObjectId_field_key" ON "LocationAssertion"("physicalObjectId", "field");

-- AddForeignKey
ALTER TABLE "LocationAssertion" ADD CONSTRAINT "LocationAssertion_physicalObjectId_fkey" FOREIGN KEY ("physicalObjectId") REFERENCES "PhysicalObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationAssertion" ADD CONSTRAINT "LocationAssertion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
