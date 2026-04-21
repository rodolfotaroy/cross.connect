-- CreateEnum
CREATE TYPE "DedicatedXcStatus" AS ENUM ('draft', 'submitted', 'in_progress', 'completed', 'disconnected', 'cancelled');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('issue', 'suggestion', 'billing', 'access', 'other');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'sp_admin';
ALTER TYPE "UserRole" ADD VALUE 'sp_ops';
ALTER TYPE "UserRole" ADD VALUE 'sp_viewer';
ALTER TYPE "UserRole" ADD VALUE 'sp_report';

-- DropForeignKey
ALTER TABLE "Rack" DROP CONSTRAINT "Rack_cageId_fkey";

-- DropForeignKey
ALTER TABLE "Rack" DROP CONSTRAINT "Rack_roomId_fkey";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "dedicatedConfig" JSONB,
ADD COLUMN     "isDedicated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DedicatedCrossConnect" (
    "id" TEXT NOT NULL,
    "crossConnectId" TEXT NOT NULL,
    "circuitId" TEXT,
    "ticketNumber" TEXT,
    "salesSource" TEXT,
    "nrc" DECIMAL(12,2),
    "mrc" DECIMAL(12,2),
    "serviceId" TEXT,
    "status" "DedicatedXcStatus" NOT NULL DEFAULT 'draft',
    "testReport" TEXT,
    "siteId" TEXT,
    "dateCompleted" TIMESTAMP(3),
    "year" INTEGER,
    "quarter" INTEGER,
    "billableDate" TIMESTAMP(3),
    "disconnectionDate" TIMESTAMP(3),
    "requestedDisconnectionDate" TIMESTAMP(3),
    "orderingCompany" TEXT,
    "aEndCampus" TEXT,
    "aEndBuilding" TEXT,
    "aEndFloor" TEXT,
    "aEndRoom" TEXT,
    "aEndRack" TEXT,
    "aEndDevice" TEXT,
    "aEndPort" TEXT,
    "zEndCampus" TEXT,
    "zEndBuilding" TEXT,
    "zEndFloor" TEXT,
    "zEndRoom" TEXT,
    "zEndRack" TEXT,
    "zEndDevice" TEXT,
    "zEndPort" TEXT,
    "customerType" TEXT,
    "cableType" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DedicatedCrossConnect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DedicatedXcHop" (
    "id" TEXT NOT NULL,
    "dedicatedCrossConnectId" TEXT NOT NULL,
    "hopNumber" INTEGER NOT NULL,
    "room" TEXT,
    "rack" TEXT,
    "device" TEXT,
    "port" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DedicatedXcHop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL DEFAULT 'issue',
    "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DedicatedCrossConnect_crossConnectId_key" ON "DedicatedCrossConnect"("crossConnectId");

-- CreateIndex
CREATE INDEX "DedicatedCrossConnect_organizationId_idx" ON "DedicatedCrossConnect"("organizationId");

-- CreateIndex
CREATE INDEX "DedicatedCrossConnect_organizationId_status_idx" ON "DedicatedCrossConnect"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DedicatedCrossConnect_organizationId_deletedAt_idx" ON "DedicatedCrossConnect"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "DedicatedCrossConnect_billableDate_idx" ON "DedicatedCrossConnect"("billableDate");

-- CreateIndex
CREATE INDEX "DedicatedCrossConnect_year_quarter_idx" ON "DedicatedCrossConnect"("year", "quarter");

-- CreateIndex
CREATE INDEX "DedicatedCrossConnect_createdById_idx" ON "DedicatedCrossConnect"("createdById");

-- CreateIndex
CREATE INDEX "DedicatedXcHop_dedicatedCrossConnectId_idx" ON "DedicatedXcHop"("dedicatedCrossConnectId");

-- CreateIndex
CREATE UNIQUE INDEX "DedicatedXcHop_dedicatedCrossConnectId_hopNumber_key" ON "DedicatedXcHop"("dedicatedCrossConnectId", "hopNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_organizationId_idx" ON "SupportTicket"("organizationId");

-- CreateIndex
CREATE INDEX "SupportTicket_organizationId_status_idx" ON "SupportTicket"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_createdById_idx" ON "SupportTicket"("createdById");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketComment_authorId_idx" ON "TicketComment"("authorId");

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_cageId_fkey" FOREIGN KEY ("cageId") REFERENCES "Cage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedicatedCrossConnect" ADD CONSTRAINT "DedicatedCrossConnect_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedicatedCrossConnect" ADD CONSTRAINT "DedicatedCrossConnect_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedicatedCrossConnect" ADD CONSTRAINT "DedicatedCrossConnect_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedicatedXcHop" ADD CONSTRAINT "DedicatedXcHop_dedicatedCrossConnectId_fkey" FOREIGN KEY ("dedicatedCrossConnectId") REFERENCES "DedicatedCrossConnect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
