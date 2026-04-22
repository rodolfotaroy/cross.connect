-- AddColumn: ticketNumber (globally sequential SP/OP prefixed identifier)
ALTER TABLE "SupportTicket" ADD COLUMN "ticketNumber" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "portal" TEXT NOT NULL DEFAULT 'sp';

-- Backfill existing tickets with sequential SP numbers
DO $$
DECLARE
  rec RECORD;
  counter INT := 0;
BEGIN
  FOR rec IN SELECT id FROM "SupportTicket" ORDER BY "createdAt" ASC LOOP
    counter := counter + 1;
    UPDATE "SupportTicket"
      SET "ticketNumber" = 'SP' || LPAD(counter::TEXT, 6, '0')
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Now make ticketNumber unique and not null
ALTER TABLE "SupportTicket" ALTER COLUMN "ticketNumber" SET NOT NULL;
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- Create TicketCounter table (single-row global counter)
CREATE TABLE "TicketCounter" (
  "id"       INTEGER NOT NULL DEFAULT 1,
  "lastUsed" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TicketCounter_pkey" PRIMARY KEY ("id")
);

-- Seed counter with the current highest ticket number
INSERT INTO "TicketCounter" ("id", "lastUsed")
SELECT 1, COUNT(*) FROM "SupportTicket";
