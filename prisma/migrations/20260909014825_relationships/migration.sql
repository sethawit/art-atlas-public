-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "subjectArtworkId" TEXT NOT NULL,
    "objectArtworkId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidenceSourceId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Relationship_subjectArtworkId_idx" ON "Relationship"("subjectArtworkId");

-- CreateIndex
CREATE INDEX "Relationship_objectArtworkId_idx" ON "Relationship"("objectArtworkId");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_subjectArtworkId_objectArtworkId_relationshipT_key" ON "Relationship"("subjectArtworkId", "objectArtworkId", "relationshipType");

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_subjectArtworkId_fkey" FOREIGN KEY ("subjectArtworkId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_objectArtworkId_fkey" FOREIGN KEY ("objectArtworkId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_evidenceSourceId_fkey" FOREIGN KEY ("evidenceSourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

