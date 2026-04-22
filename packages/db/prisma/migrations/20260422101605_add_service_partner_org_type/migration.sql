-- AlterEnum
ALTER TYPE "OrgType" ADD VALUE 'service_partner';

-- CreateIndex
CREATE INDEX "SupportTicket_portal_idx" ON "SupportTicket"("portal");
