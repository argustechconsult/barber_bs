/*
  Warnings:

  - You are about to drop the column `stripePriceId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stripeProductId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `stripeProductId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[infinitePayOrderNSU]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[infinitePayTransactionNSU]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[infinitePaySlug]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[asaasPaymentId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inviteToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[asaasCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[asaasSubscriptionId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resetToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'INCOME';
ALTER TYPE "TransactionType" ADD VALUE 'EXPENSE';

-- DropIndex
DROP INDEX "Transaction_stripeSessionId_key";

-- DropIndex
DROP INDEX "User_stripeCustomerId_key";

-- DropIndex
DROP INDEX "User_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stripePriceId",
DROP COLUMN "stripeProductId",
ADD COLUMN     "image" TEXT,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "duration",
DROP COLUMN "stripePriceId",
DROP COLUMN "stripeProductId";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "stripeSessionId",
ADD COLUMN     "asaasPaymentId" TEXT,
ADD COLUMN     "billingType" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "infinitePayOrderNSU" TEXT,
ADD COLUMN     "infinitePayReceiptUrl" TEXT,
ADD COLUMN     "infinitePaySlug" TEXT,
ADD COLUMN     "infinitePayTransactionNSU" TEXT,
ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "appointmentInterval" INTEGER DEFAULT 10,
ADD COLUMN     "asaasCustomerId" TEXT,
ADD COLUMN     "asaasSubscriptionId" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cpfCnpj" TEXT,
ADD COLUMN     "endTime" TEXT DEFAULT '18:00',
ADD COLUMN     "image" TEXT,
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "lastRenewal" TIMESTAMP(3),
ADD COLUMN     "nextRenewal" TIMESTAMP(3),
ADD COLUMN     "offDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "startTime" TEXT DEFAULT '09:00',
ADD COLUMN     "workEndDate" TEXT,
ADD COLUMN     "workStartDate" TEXT;

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_infinitePayOrderNSU_key" ON "Transaction"("infinitePayOrderNSU");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_infinitePayTransactionNSU_key" ON "Transaction"("infinitePayTransactionNSU");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_infinitePaySlug_key" ON "Transaction"("infinitePaySlug");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_asaasPaymentId_key" ON "Transaction"("asaasPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_asaasCustomerId_key" ON "User"("asaasCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_asaasSubscriptionId_key" ON "User"("asaasSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
