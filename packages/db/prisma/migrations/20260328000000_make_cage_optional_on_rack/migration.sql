-- Make cageId optional on Rack and add roomId for room-level (cageless) racks.
-- Follows the same dual-parent pattern as Panel (rackId / roomId).

-- Step 1: Add roomId as a nullable column
ALTER TABLE "Rack" ADD COLUMN "roomId" TEXT;

-- Step 2: Allow cageId to be NULL (existing rows keep their cageId value)
ALTER TABLE "Rack" ALTER COLUMN "cageId" DROP NOT NULL;

-- Step 3: Foreign key from Rack.roomId → Room.id
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Index on roomId for query performance
CREATE INDEX "Rack_roomId_idx" ON "Rack"("roomId");

-- Step 5: Unique index for room-level rack codes (NULL != NULL in Postgres, so safe alongside cageId index)
CREATE UNIQUE INDEX "Rack_roomId_code_key" ON "Rack"("roomId", "code");
