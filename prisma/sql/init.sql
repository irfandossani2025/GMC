CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');
CREATE TYPE "MembershipType" AS ENUM ('STANDARD', 'PREMIUM', 'CORPORATE');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED');
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PRINTED', 'ARCHIVED');
CREATE TYPE "TransactionType" AS ENUM ('MEMBERSHIP_FEE', 'RENEWAL', 'PREMIUM_UPGRADE', 'SERVICE_CHARGE');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STAFF',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "members" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "gender" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zipCode" TEXT,
  "bloodGroup" TEXT,
  "emergencyContact" TEXT,
  "emergencyPhone" TEXT,
  "membershipType" "MembershipType" NOT NULL DEFAULT 'STANDARD',
  "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiryDate" TIMESTAMP(3) NOT NULL,
  "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "cardIssued" BOOLEAN NOT NULL DEFAULT false,
  "cardImageUrl" TEXT,
  "cardGeneratedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_cards" (
  "id" TEXT NOT NULL,
  "cardNumber" TEXT NOT NULL,
  "barcode" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "frontImageUrl" TEXT,
  "backImageUrl" TEXT,
  "combinedImageUrl" TEXT,
  "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiryDate" TIMESTAMP(3) NOT NULL,
  "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
  "pdfUrl" TEXT,
  "pdfGeneratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "membership_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "type" "TransactionType" NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_logs" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "messageType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "response" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "changes" TEXT,
  "userId" TEXT NOT NULL,
  "memberId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "members_memberId_key" ON "members"("memberId");
CREATE UNIQUE INDEX "members_phone_key" ON "members"("phone");
CREATE UNIQUE INDEX "membership_cards_cardNumber_key" ON "membership_cards"("cardNumber");
CREATE UNIQUE INDEX "membership_cards_barcode_key" ON "membership_cards"("barcode");
CREATE UNIQUE INDEX "transactions_transactionId_key" ON "transactions"("transactionId");
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

CREATE INDEX "members_memberId_idx" ON "members"("memberId");
CREATE INDEX "members_phone_idx" ON "members"("phone");
CREATE INDEX "members_email_idx" ON "members"("email");
CREATE INDEX "members_createdByUserId_idx" ON "members"("createdByUserId");
CREATE INDEX "membership_cards_memberId_idx" ON "membership_cards"("memberId");
CREATE INDEX "membership_cards_barcode_idx" ON "membership_cards"("barcode");
CREATE INDEX "transactions_memberId_idx" ON "transactions"("memberId");
CREATE INDEX "transactions_transactionId_idx" ON "transactions"("transactionId");
CREATE INDEX "whatsapp_logs_phone_idx" ON "whatsapp_logs"("phone");
CREATE INDEX "whatsapp_logs_status_idx" ON "whatsapp_logs"("status");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_memberId_idx" ON "audit_logs"("memberId");
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

ALTER TABLE "members"
  ADD CONSTRAINT "members_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_cards"
  ADD CONSTRAINT "membership_cards_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
