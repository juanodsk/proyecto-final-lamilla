CREATE TYPE "Role" AS ENUM ('STUDENT', 'AGENT');
CREATE TYPE "Campus" AS ENUM ('CENTRAL', 'NORTE');
CREATE TYPE "Category" AS ENUM ('ACCESS', 'ENROLLMENT', 'CAMPUS', 'OTHER');
CREATE TYPE "Status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL, "campus" "Campus" NOT NULL
);
CREATE TABLE "Ticket" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "category" "Category" NOT NULL, "status" "Status" NOT NULL DEFAULT 'OPEN',
  "campus" "Campus" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE
);
CREATE TABLE "OutboxEvent" (
  "id" TEXT PRIMARY KEY, "ticketId" TEXT NOT NULL, "status" "Status" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processedAt" TIMESTAMP(3)
);
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL UNIQUE REFERENCES "OutboxEvent"("id") ON UPDATE CASCADE,
  "ticketId" TEXT NOT NULL REFERENCES "Ticket"("id") ON UPDATE CASCADE,
  "status" "Status" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Ticket_ownerId_createdAt_idx" ON "Ticket"("ownerId", "createdAt");
CREATE INDEX "Ticket_campus_createdAt_idx" ON "Ticket"("campus", "createdAt");
CREATE INDEX "OutboxEvent_processedAt_createdAt_idx" ON "OutboxEvent"("processedAt", "createdAt");
CREATE INDEX "Notification_ticketId_createdAt_idx" ON "Notification"("ticketId", "createdAt");
