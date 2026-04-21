-- CreateTable
CREATE TABLE "Skin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "s3PreviewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skin_carId_name_key" ON "Skin"("carId", "name");

-- AddForeignKey
ALTER TABLE "Skin" ADD CONSTRAINT "Skin_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
