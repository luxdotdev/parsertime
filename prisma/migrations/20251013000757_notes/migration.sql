-- CreateTable
CREATE TABLE "NoteData" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "scrimId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "MapDataId" INTEGER NOT NULL,

    CONSTRAINT "NoteData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteData_scrimId_idx" ON "NoteData"("scrimId");

-- CreateIndex
CREATE INDEX "NoteData_MapDataId_idx" ON "NoteData"("MapDataId");

-- AddForeignKey
ALTER TABLE "NoteData" ADD CONSTRAINT "NoteData_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "MapData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
