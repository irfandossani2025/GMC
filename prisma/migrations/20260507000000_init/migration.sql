-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('STANDARD', 'PREMIUM', 'CORPORATE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PRINTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('MEMBERSHIP_FEE', 'RENEWAL', 'PREMIUM_UPGRADE', 'SERVICE_CHARGE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "treatmentId" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "validityMonths" INTEGER NOT NULL DEFAULT 6,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_packages" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "usedSessions" INTEGER NOT NULL DEFAULT 0,
    "remainingSessions" INTEGER NOT NULL DEFAULT 0,
    "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "treatmentId" TEXT,
    "packageId" TEXT,
    "sessionNumber" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "processedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_memberId_key" ON "members"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "members_phone_key" ON "members"("phone");

-- CreateIndex
CREATE INDEX "members_memberId_idx" ON "members"("memberId");

-- CreateIndex
CREATE INDEX "members_phone_idx" ON "members"("phone");

-- CreateIndex
CREATE INDEX "members_email_idx" ON "members"("email");

-- CreateIndex
CREATE INDEX "members_createdByUserId_idx" ON "members"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_cards_cardNumber_key" ON "membership_cards"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "membership_cards_barcode_key" ON "membership_cards"("barcode");

-- CreateIndex
CREATE INDEX "membership_cards_memberId_idx" ON "membership_cards"("memberId");

-- CreateIndex
CREATE INDEX "membership_cards_barcode_idx" ON "membership_cards"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transactionId_key" ON "transactions"("transactionId");

-- CreateIndex
CREATE INDEX "transactions_memberId_idx" ON "transactions"("memberId");

-- CreateIndex
CREATE INDEX "transactions_transactionId_idx" ON "transactions"("transactionId");

-- CreateIndex
CREATE INDEX "whatsapp_logs_phone_idx" ON "whatsapp_logs"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_logs_status_idx" ON "whatsapp_logs"("status");

-- CreateIndex
CREATE INDEX "treatments_category_idx" ON "treatments"("category");

-- CreateIndex
CREATE INDEX "treatments_active_idx" ON "treatments"("active");

-- CreateIndex
CREATE INDEX "treatment_packages_treatmentId_idx" ON "treatment_packages"("treatmentId");

-- CreateIndex
CREATE INDEX "treatment_packages_active_idx" ON "treatment_packages"("active");

-- CreateIndex
CREATE INDEX "member_packages_memberId_idx" ON "member_packages"("memberId");

-- CreateIndex
CREATE INDEX "member_packages_packageId_idx" ON "member_packages"("packageId");

-- CreateIndex
CREATE INDEX "member_packages_status_idx" ON "member_packages"("status");

-- CreateIndex
CREATE INDEX "sessions_memberId_idx" ON "sessions"("memberId");

-- CreateIndex
CREATE INDEX "sessions_treatmentId_idx" ON "sessions"("treatmentId");

-- CreateIndex
CREATE INDEX "sessions_packageId_idx" ON "sessions"("packageId");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_scheduledAt_idx" ON "sessions"("scheduledAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_memberId_idx" ON "audit_logs"("memberId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_cards" ADD CONSTRAINT "membership_cards_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_packages" ADD CONSTRAINT "treatment_packages_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "treatment_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "member_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

