-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "icon" TEXT,
    "color" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_contributions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint
ALTER TABLE "goals"
ADD CONSTRAINT "goals_targetAmount_positive_check"
CHECK ("targetAmount" > 0);

-- AddCheckConstraint
ALTER TABLE "goal_contributions"
ADD CONSTRAINT "goal_contributions_amount_positive_check"
CHECK ("amount" > 0);

-- CreateIndex
CREATE INDEX "goals_userId_status_idx" ON "goals"("userId", "status");

-- CreateIndex
CREATE INDEX "goals_userId_targetDate_idx" ON "goals"("userId", "targetDate");

-- CreateIndex
CREATE INDEX "goal_contributions_goalId_date_idx" ON "goal_contributions"("goalId", "date");

-- CreateIndex
CREATE INDEX "goal_contributions_userId_idx" ON "goal_contributions"("userId");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
