-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('operator', 'customer', 'carrier', 'cloud_provider', 'exchange');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'ops_manager', 'ops_technician', 'customer_admin', 'customer_viewer');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('smf', 'mmf', 'cat6', 'coax', 'dac');

-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('lc', 'sc', 'mtp_mpo', 'rj45', 'fc');

-- CreateEnum
CREATE TYPE "StrandRole" AS ENUM ('tx', 'rx', 'unspecified');

-- CreateEnum
CREATE TYPE "PortState" AS ENUM ('available', 'reserved', 'in_use', 'faulty', 'maintenance', 'decommissioned');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('standard', 'mmr', 'telco_closet', 'common_area');

-- CreateEnum
CREATE TYPE "PanelType" AS ENUM ('patch_panel', 'odf', 'fdf', 'demarc', 'splice_enclosure');

-- CreateEnum
CREATE TYPE "DemarcType" AS ENUM ('customer', 'carrier', 'cloud_onramp', 'exchange', 'internal');

-- CreateEnum
CREATE TYPE "PathwayType" AS ENUM ('conduit', 'cable_tray', 'subduct', 'inner_duct', 'bundle', 'overhead');

-- CreateEnum
CREATE TYPE "OrderState" AS ENUM ('draft', 'submitted', 'under_review', 'pending_approval', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('customer_to_carrier', 'customer_to_customer', 'customer_to_cloud', 'exchange');

-- CreateEnum
CREATE TYPE "ServiceState" AS ENUM ('provisioning', 'active', 'suspended', 'pending_disconnect', 'disconnected');

-- CreateEnum
CREATE TYPE "EndpointSide" AS ENUM ('a_side', 'z_side');

-- CreateEnum
CREATE TYPE "EndpointType" AS ENUM ('customer', 'carrier', 'cloud_onramp', 'exchange', 'internal');

-- CreateEnum
CREATE TYPE "PathRole" AS ENUM ('primary', 'diverse');

-- CreateEnum
CREATE TYPE "PathState" AS ENUM ('planned', 'installed', 'active', 'rerouting', 'decommissioned');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('patch', 'trunk', 'jumper', 'demarc_extension');

-- CreateEnum
CREATE TYPE "ReservationState" AS ENUM ('active', 'released', 'cancelled');

-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('install', 'disconnect', 'reroute', 'repair', 'audit_check');

-- CreateEnum
CREATE TYPE "WorkOrderState" AS ENUM ('created', 'assigned', 'in_progress', 'pending_test', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "WorkOrderTaskState" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('approved', 'rejected', 'deferred');

-- CreateEnum
CREATE TYPE "ApprovalState" AS ENUM ('pending', 'decided');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('loa', 'cfa', 'test_result', 'photo', 'drawing', 'other');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('service_activated', 'service_disconnected', 'temporary_extended', 'reroute_completed');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orgType" "OrgType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "orgId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "floor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerOrgId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rack" (
    "id" TEXT NOT NULL,
    "cageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "uSize" INTEGER NOT NULL DEFAULT 42,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" TEXT NOT NULL,
    "rackId" TEXT,
    "roomId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "panelType" "PanelType" NOT NULL,
    "portCount" INTEGER NOT NULL,
    "uPosition" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Port" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "connectorType" "ConnectorType" NOT NULL,
    "strandRole" "StrandRole" NOT NULL DEFAULT 'unspecified',
    "fiberTube" INTEGER,
    "fiberStrand" INTEGER,
    "state" "PortState" NOT NULL DEFAULT 'available',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Port_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemarcPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "demarcType" "DemarcType" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomId" TEXT,
    "panelId" TEXT,
    "loaReference" TEXT,
    "cfaReference" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemarcPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pathway" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pathwayType" "PathwayType" NOT NULL,
    "fromRoomId" TEXT NOT NULL,
    "toRoomId" TEXT NOT NULL,
    "capacityStrandCount" INTEGER,
    "lengthMeters" DECIMAL(65,30),
    "isBidirectional" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossConnectOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "requestingOrgId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "speedGbps" DECIMAL(65,30),
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "requestedActiveAt" TIMESTAMP(3),
    "requestedExpiresAt" TIMESTAMP(3),
    "customerReference" TEXT,
    "notes" TEXT,
    "state" "OrderState" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossConnectOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEndpoint" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "side" "EndpointSide" NOT NULL,
    "endpointType" "EndpointType" NOT NULL,
    "organizationId" TEXT,
    "desiredPanelId" TEXT,
    "demarcPointId" TEXT,
    "loaNumber" TEXT,
    "cfaNumber" TEXT,
    "demarcDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossConnectService" (
    "id" TEXT NOT NULL,
    "serviceNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "state" "ServiceState" NOT NULL DEFAULT 'provisioning',
    "activatedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "disconnectRequestedAt" TIMESTAMP(3),
    "disconnectReason" TEXT,
    "serviceType" "ServiceType" NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "speedGbps" DECIMAL(65,30),
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossConnectService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEndpoint" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "side" "EndpointSide" NOT NULL,
    "endpointType" "EndpointType" NOT NULL,
    "organizationId" TEXT,
    "assignedPanelId" TEXT,
    "demarcPointId" TEXT,
    "verifiedLoaNumber" TEXT,
    "verifiedCfaNumber" TEXT,
    "demarcDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CablePath" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "pathRole" "PathRole" NOT NULL DEFAULT 'primary',
    "state" "PathState" NOT NULL DEFAULT 'planned',
    "plannedById" TEXT,
    "installedAt" TIMESTAMP(3),
    "installedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CablePath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathSegment" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "fromPortId" TEXT NOT NULL,
    "toPortId" TEXT NOT NULL,
    "segmentType" "SegmentType" NOT NULL,
    "physicalCableLabel" TEXT,
    "physicalCableLength" DECIMAL(65,30),
    "pathwayId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortReservation" (
    "id" TEXT NOT NULL,
    "portId" TEXT NOT NULL,
    "serviceId" TEXT,
    "cablePathId" TEXT,
    "state" "ReservationState" NOT NULL DEFAULT 'active',
    "reservedById" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,

    CONSTRAINT "PortReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "state" "ApprovalState" NOT NULL DEFAULT 'pending',
    "dueBy" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL DEFAULT 1,
    "approverId" TEXT NOT NULL,
    "decision" "ApprovalDecision",
    "decidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "woNumber" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "cablePathId" TEXT,
    "woType" "WorkOrderType" NOT NULL,
    "state" "WorkOrderState" NOT NULL DEFAULT 'created',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "assignedToId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dueBy" TIMESTAMP(3),
    "techNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderTask" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "state" "WorkOrderTaskState" NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "orderId" TEXT,
    "workOrderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTriggerEvent" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "eventType" "BillingEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "mrcCents" INTEGER,
    "nrcCents" INTEGER,
    "metadata" JSONB,
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingTriggerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT,
    "serviceId" TEXT,
    "workOrderId" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_orgType_idx" ON "Organization"("orgType");

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE INDEX "Site_isActive_idx" ON "Site"("isActive");

-- CreateIndex
CREATE INDEX "Building_siteId_idx" ON "Building"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_siteId_code_key" ON "Building"("siteId", "code");

-- CreateIndex
CREATE INDEX "Room_buildingId_idx" ON "Room"("buildingId");

-- CreateIndex
CREATE INDEX "Room_roomType_idx" ON "Room"("roomType");

-- CreateIndex
CREATE UNIQUE INDEX "Room_buildingId_code_key" ON "Room"("buildingId", "code");

-- CreateIndex
CREATE INDEX "Cage_roomId_idx" ON "Cage"("roomId");

-- CreateIndex
CREATE INDEX "Cage_ownerOrgId_idx" ON "Cage"("ownerOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Cage_roomId_code_key" ON "Cage"("roomId", "code");

-- CreateIndex
CREATE INDEX "Rack_cageId_idx" ON "Rack"("cageId");

-- CreateIndex
CREATE UNIQUE INDEX "Rack_cageId_code_key" ON "Rack"("cageId", "code");

-- CreateIndex
CREATE INDEX "Panel_rackId_idx" ON "Panel"("rackId");

-- CreateIndex
CREATE INDEX "Panel_roomId_idx" ON "Panel"("roomId");

-- CreateIndex
CREATE INDEX "Panel_panelType_idx" ON "Panel"("panelType");

-- CreateIndex
CREATE INDEX "Port_panelId_state_idx" ON "Port"("panelId", "state");

-- CreateIndex
CREATE INDEX "Port_state_idx" ON "Port"("state");

-- CreateIndex
CREATE INDEX "Port_mediaType_idx" ON "Port"("mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "Port_panelId_label_key" ON "Port"("panelId", "label");

-- CreateIndex
CREATE INDEX "DemarcPoint_organizationId_idx" ON "DemarcPoint"("organizationId");

-- CreateIndex
CREATE INDEX "DemarcPoint_demarcType_idx" ON "DemarcPoint"("demarcType");

-- CreateIndex
CREATE INDEX "DemarcPoint_roomId_idx" ON "DemarcPoint"("roomId");

-- CreateIndex
CREATE INDEX "DemarcPoint_panelId_idx" ON "DemarcPoint"("panelId");

-- CreateIndex
CREATE UNIQUE INDEX "Pathway_code_key" ON "Pathway"("code");

-- CreateIndex
CREATE INDEX "Pathway_fromRoomId_idx" ON "Pathway"("fromRoomId");

-- CreateIndex
CREATE INDEX "Pathway_toRoomId_idx" ON "Pathway"("toRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "CrossConnectOrder_orderNumber_key" ON "CrossConnectOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "CrossConnectOrder_requestingOrgId_idx" ON "CrossConnectOrder"("requestingOrgId");

-- CreateIndex
CREATE INDEX "CrossConnectOrder_state_idx" ON "CrossConnectOrder"("state");

-- CreateIndex
CREATE INDEX "CrossConnectOrder_submittedById_idx" ON "CrossConnectOrder"("submittedById");

-- CreateIndex
CREATE INDEX "CrossConnectOrder_submittedAt_idx" ON "CrossConnectOrder"("submittedAt");

-- CreateIndex
CREATE INDEX "CrossConnectOrder_createdAt_idx" ON "CrossConnectOrder"("createdAt");

-- CreateIndex
CREATE INDEX "OrderEndpoint_orderId_idx" ON "OrderEndpoint"("orderId");

-- CreateIndex
CREATE INDEX "OrderEndpoint_organizationId_idx" ON "OrderEndpoint"("organizationId");

-- CreateIndex
CREATE INDEX "OrderEndpoint_demarcPointId_idx" ON "OrderEndpoint"("demarcPointId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEndpoint_orderId_side_key" ON "OrderEndpoint"("orderId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "CrossConnectService_serviceNumber_key" ON "CrossConnectService"("serviceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CrossConnectService_orderId_key" ON "CrossConnectService"("orderId");

-- CreateIndex
CREATE INDEX "CrossConnectService_state_idx" ON "CrossConnectService"("state");

-- CreateIndex
CREATE INDEX "CrossConnectService_isTemporary_expiresAt_idx" ON "CrossConnectService"("isTemporary", "expiresAt");

-- CreateIndex
CREATE INDEX "CrossConnectService_activatedAt_idx" ON "CrossConnectService"("activatedAt");

-- CreateIndex
CREATE INDEX "ServiceEndpoint_serviceId_idx" ON "ServiceEndpoint"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceEndpoint_organizationId_idx" ON "ServiceEndpoint"("organizationId");

-- CreateIndex
CREATE INDEX "ServiceEndpoint_demarcPointId_idx" ON "ServiceEndpoint"("demarcPointId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEndpoint_serviceId_side_key" ON "ServiceEndpoint"("serviceId", "side");

-- CreateIndex
CREATE INDEX "CablePath_serviceId_idx" ON "CablePath"("serviceId");

-- CreateIndex
CREATE INDEX "CablePath_serviceId_pathRole_idx" ON "CablePath"("serviceId", "pathRole");

-- CreateIndex
CREATE INDEX "CablePath_state_idx" ON "CablePath"("state");

-- CreateIndex
CREATE INDEX "PathSegment_pathId_idx" ON "PathSegment"("pathId");

-- CreateIndex
CREATE INDEX "PathSegment_fromPortId_idx" ON "PathSegment"("fromPortId");

-- CreateIndex
CREATE INDEX "PathSegment_toPortId_idx" ON "PathSegment"("toPortId");

-- CreateIndex
CREATE INDEX "PathSegment_pathwayId_idx" ON "PathSegment"("pathwayId");

-- CreateIndex
CREATE UNIQUE INDEX "PathSegment_pathId_sequence_key" ON "PathSegment"("pathId", "sequence");

-- CreateIndex
CREATE INDEX "PortReservation_portId_idx" ON "PortReservation"("portId");

-- CreateIndex
CREATE INDEX "PortReservation_portId_state_idx" ON "PortReservation"("portId", "state");

-- CreateIndex
CREATE INDEX "PortReservation_serviceId_idx" ON "PortReservation"("serviceId");

-- CreateIndex
CREATE INDEX "PortReservation_cablePathId_idx" ON "PortReservation"("cablePathId");

-- CreateIndex
CREATE INDEX "PortReservation_state_idx" ON "PortReservation"("state");

-- CreateIndex
CREATE INDEX "PortReservation_reservedAt_idx" ON "PortReservation"("reservedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_orderId_key" ON "ApprovalRequest"("orderId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_state_idx" ON "ApprovalRequest"("state");

-- CreateIndex
CREATE INDEX "ApprovalRequest_dueBy_idx" ON "ApprovalRequest"("dueBy");

-- CreateIndex
CREATE INDEX "ApprovalStep_approverId_idx" ON "ApprovalStep"("approverId");

-- CreateIndex
CREATE INDEX "ApprovalStep_decision_idx" ON "ApprovalStep"("decision");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_approvalRequestId_stepNumber_key" ON "ApprovalStep"("approvalRequestId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_woNumber_key" ON "WorkOrder"("woNumber");

-- CreateIndex
CREATE INDEX "WorkOrder_serviceId_idx" ON "WorkOrder"("serviceId");

-- CreateIndex
CREATE INDEX "WorkOrder_assignedToId_idx" ON "WorkOrder"("assignedToId");

-- CreateIndex
CREATE INDEX "WorkOrder_state_idx" ON "WorkOrder"("state");

-- CreateIndex
CREATE INDEX "WorkOrder_scheduledAt_idx" ON "WorkOrder"("scheduledAt");

-- CreateIndex
CREATE INDEX "WorkOrder_priority_state_idx" ON "WorkOrder"("priority", "state");

-- CreateIndex
CREATE INDEX "WorkOrderTask_workOrderId_idx" ON "WorkOrderTask"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderTask_workOrderId_sequence_key" ON "WorkOrderTask"("workOrderId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Document_s3Key_key" ON "Document"("s3Key");

-- CreateIndex
CREATE INDEX "Document_orderId_idx" ON "Document"("orderId");

-- CreateIndex
CREATE INDEX "Document_workOrderId_idx" ON "Document"("workOrderId");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_docType_idx" ON "Document"("docType");

-- CreateIndex
CREATE INDEX "Document_isActive_idx" ON "Document"("isActive");

-- CreateIndex
CREATE INDEX "BillingTriggerEvent_serviceId_idx" ON "BillingTriggerEvent"("serviceId");

-- CreateIndex
CREATE INDEX "BillingTriggerEvent_exportedAt_idx" ON "BillingTriggerEvent"("exportedAt");

-- CreateIndex
CREATE INDEX "BillingTriggerEvent_occurredAt_idx" ON "BillingTriggerEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "BillingTriggerEvent_eventType_idx" ON "BillingTriggerEvent"("eventType");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_idx" ON "AuditEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_orderId_idx" ON "AuditEvent"("orderId");

-- CreateIndex
CREATE INDEX "AuditEvent_serviceId_idx" ON "AuditEvent"("serviceId");

-- CreateIndex
CREATE INDEX "AuditEvent_workOrderId_idx" ON "AuditEvent"("workOrderId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cage" ADD CONSTRAINT "Cage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_cageId_fkey" FOREIGN KEY ("cageId") REFERENCES "Cage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Port" ADD CONSTRAINT "Port_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemarcPoint" ADD CONSTRAINT "DemarcPoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemarcPoint" ADD CONSTRAINT "DemarcPoint_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemarcPoint" ADD CONSTRAINT "DemarcPoint_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pathway" ADD CONSTRAINT "Pathway_fromRoomId_fkey" FOREIGN KEY ("fromRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pathway" ADD CONSTRAINT "Pathway_toRoomId_fkey" FOREIGN KEY ("toRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossConnectOrder" ADD CONSTRAINT "CrossConnectOrder_requestingOrgId_fkey" FOREIGN KEY ("requestingOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossConnectOrder" ADD CONSTRAINT "CrossConnectOrder_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossConnectOrder" ADD CONSTRAINT "CrossConnectOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEndpoint" ADD CONSTRAINT "OrderEndpoint_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CrossConnectOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEndpoint" ADD CONSTRAINT "OrderEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEndpoint" ADD CONSTRAINT "OrderEndpoint_desiredPanelId_fkey" FOREIGN KEY ("desiredPanelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEndpoint" ADD CONSTRAINT "OrderEndpoint_demarcPointId_fkey" FOREIGN KEY ("demarcPointId") REFERENCES "DemarcPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossConnectService" ADD CONSTRAINT "CrossConnectService_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CrossConnectOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEndpoint" ADD CONSTRAINT "ServiceEndpoint_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CrossConnectService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEndpoint" ADD CONSTRAINT "ServiceEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEndpoint" ADD CONSTRAINT "ServiceEndpoint_assignedPanelId_fkey" FOREIGN KEY ("assignedPanelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEndpoint" ADD CONSTRAINT "ServiceEndpoint_demarcPointId_fkey" FOREIGN KEY ("demarcPointId") REFERENCES "DemarcPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CablePath" ADD CONSTRAINT "CablePath_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CrossConnectService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathSegment" ADD CONSTRAINT "PathSegment_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "CablePath"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathSegment" ADD CONSTRAINT "PathSegment_fromPortId_fkey" FOREIGN KEY ("fromPortId") REFERENCES "Port"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathSegment" ADD CONSTRAINT "PathSegment_toPortId_fkey" FOREIGN KEY ("toPortId") REFERENCES "Port"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathSegment" ADD CONSTRAINT "PathSegment_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortReservation" ADD CONSTRAINT "PortReservation_portId_fkey" FOREIGN KEY ("portId") REFERENCES "Port"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortReservation" ADD CONSTRAINT "PortReservation_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CrossConnectOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CrossConnectService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_cablePathId_fkey" FOREIGN KEY ("cablePathId") REFERENCES "CablePath"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTask" ADD CONSTRAINT "WorkOrderTask_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CrossConnectOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTriggerEvent" ADD CONSTRAINT "BillingTriggerEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CrossConnectService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CrossConnectOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CrossConnectService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
