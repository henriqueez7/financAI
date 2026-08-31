-- CreateEnum
CREATE TYPE "PendingFinancialActionType" AS ENUM ('CREATE_EXPENSE', 'CREATE_INCOME');

-- CreateEnum
CREATE TYPE "PendingFinancialActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('PENDING', 'VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "pending_financial_actions" (
    "id" TEXT NOT NULL,
    "type" "PendingFinancialActionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "PendingFinancialActionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_financial_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connections" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "type" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
    "status" "WhatsAppMessageStatus" NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "connectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint
ALTER TABLE "pending_financial_actions"
ADD CONSTRAINT "pending_financial_actions_expiration_check"
CHECK ("expiresAt" > "createdAt");

-- AddCheckConstraint
ALTER TABLE "pending_financial_actions"
ADD CONSTRAINT "pending_financial_actions_state_check"
CHECK (
    ("status" = 'PENDING' AND "confirmedAt" IS NULL AND "cancelledAt" IS NULL)
    OR ("status" = 'CONFIRMED' AND "confirmedAt" IS NOT NULL AND "cancelledAt" IS NULL)
    OR ("status" = 'CANCELLED' AND "confirmedAt" IS NULL AND "cancelledAt" IS NOT NULL)
    OR ("status" = 'EXPIRED' AND "confirmedAt" IS NULL AND "cancelledAt" IS NULL)
);

-- AddCheckConstraint
ALTER TABLE "whatsapp_connections"
ADD CONSTRAINT "whatsapp_connections_verification_check"
CHECK ("status" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL);

-- CreateIndex
CREATE INDEX "pending_financial_actions_userId_status_expiresAt_idx" ON "pending_financial_actions"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "pending_financial_actions_expiresAt_idx" ON "pending_financial_actions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_phoneNumber_key" ON "whatsapp_connections"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_waId_key" ON "whatsapp_connections"("waId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_userId_key" ON "whatsapp_connections"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_connections_userId_status_idx" ON "whatsapp_connections"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_messageId_key" ON "whatsapp_messages"("messageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_connectionId_createdAt_idx" ON "whatsapp_messages"("connectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "pending_financial_actions" ADD CONSTRAINT "pending_financial_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
