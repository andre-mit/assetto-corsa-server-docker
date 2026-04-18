-- CreateTable
CREATE TABLE "ModJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModJob_pkey" PRIMARY KEY ("id")
);
