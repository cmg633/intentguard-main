-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'DISMISSED';

-- CreateTable
CREATE TABLE "SecurityEventTransition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "previousStatus" "EventStatus" NOT NULL,
    "newStatus" "EventStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEventTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEventTransition_eventId_idx" ON "SecurityEventTransition"("eventId");

-- CreateIndex
CREATE INDEX "SecurityEventTransition_actorId_idx" ON "SecurityEventTransition"("actorId");

-- CreateIndex
CREATE INDEX "SecurityEventTransition_createdAt_idx" ON "SecurityEventTransition"("createdAt");

-- AddForeignKey
ALTER TABLE "SecurityEventTransition" ADD CONSTRAINT "SecurityEventTransition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEventTransition" ADD CONSTRAINT "SecurityEventTransition_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
