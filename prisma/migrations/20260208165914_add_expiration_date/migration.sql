-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "expiration_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "plan" SET DEFAULT 'PREMIUM';
