-- CreateEnum
CREATE TYPE "WhatsAppLinkChallengeStatus" AS ENUM ('PENDING', 'CONSUMED', 'CANCELLED', 'EXPIRED', 'BLOCKED');

-- CreateTable
CREATE TABLE "whatsapp_link_challenges" (
    "id" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "WhatsAppLinkChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "activeUserKey" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_link_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_link_challenges_lookupKey_key" ON "whatsapp_link_challenges"("lookupKey");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_link_challenges_codeHash_key" ON "whatsapp_link_challenges"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_link_challenges_activeUserKey_key" ON "whatsapp_link_challenges"("activeUserKey");

-- CreateIndex
CREATE INDEX "whatsapp_link_challenges_userId_status_expiresAt_idx" ON "whatsapp_link_challenges"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "whatsapp_link_challenges_expiresAt_idx" ON "whatsapp_link_challenges"("expiresAt");

-- AddForeignKey
ALTER TABLE "whatsapp_link_challenges" ADD CONSTRAINT "whatsapp_link_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
