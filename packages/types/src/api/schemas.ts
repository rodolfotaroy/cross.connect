import { z } from 'zod';
import { ConnectorType, StrandRole, UserRole } from '../enums';

// Zod enum tuples derived from type-safe const objects
const CONNECTOR_TYPES = Object.values(ConnectorType) as [ConnectorType, ...ConnectorType[]];
const STRAND_ROLES = Object.values(StrandRole) as [StrandRole, ...StrandRole[]];

// ══════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES & CONVENTIONS
//
// Base URL:     /api/v1
// Auth:         Bearer <accessToken>  (JWT, 15-min TTL)
// Content-Type: application/json
// Pagination:   ?page=1&limit=20  (default limit 20, max 100)
// Filtering:    query params, all optional, OR-combined within field
// Sorting:      ?sortBy=createdAt&sortDir=desc  (default: createdAt desc)
// Versioning:   URL path prefix /api/v1  (bump to /api/v2 for breaking changes)
//
// Status codes:
//   200  OK              — GET, successful PATCH/PUT
//   201  Created         — POST (new resource)
//   204  No Content      — DELETE, idempotent PATCH with no body response
//   400  Bad Request     — validation failure
//   401  Unauthorized    — missing / expired token
//   403  Forbidden       — authenticated but insufficient role
//   404  Not Found       — resource does not exist (or tenant-scoped 404)
//   409  Conflict        — duplicate code/email, concurrent port claim
//   422  Unprocessable   — passes validation but fails a business rule (state machine guard)
//   500  Internal Error  — unexpected server fault
//
// Error envelope (all 4xx/5xx):
//   { "statusCode": 422, "error": "Unprocessable Entity", "message": "..." }
//
// Audit: every mutating endpoint writes an AuditEvent inside the same DB
//        transaction as the state change. GET endpoints do not produce audit records.
// ══════════════════════════════════════════════════════════════════════════════

// ── Pagination & sorting ──────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until accessToken expiry
  user: {
    id: string;
    email: string;
    role: UserRole;
    orgId: string;
    firstName: string;
    lastName: string;
  };
}

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

// ── Organizations ─────────────────────────────────────────────────────────────

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, 'code must be uppercase alphanumeric'),
  orgType: z.enum(['operator', 'customer', 'carrier', 'cloud_provider', 'exchange']),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial().omit({
  code: true,
  orgType: true,
});
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const ListOrganizationsSchema = PaginationSchema.extend({
  orgType: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  q: z.string().max(100).optional(), // name/code substring search
});
export type ListOrganizationsInput = z.infer<typeof ListOrganizationsSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum([
    'ops_manager',
    'ops_technician',
    'customer_admin',
    'customer_orderer',
    'customer_viewer',
  ]),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserRoleSchema = z.object({
  role: z.enum([
    'ops_manager',
    'ops_technician',
    'customer_admin',
    'customer_orderer',
    'customer_viewer',
  ]),
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

// ── Locations — Site ──────────────────────────────────────────────────────────

export const CreateSiteSchema = z.object({
  name: z.string().min(2).max(200),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  state: z.string().max(50).optional(),
  country: z.string().length(2).toUpperCase(), // ISO 3166-1 alpha-2
  timezone: z.string().max(50).default('UTC'),
  notes: z.string().max(500).optional(),
});
export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;

export const UpdateSiteSchema = CreateSiteSchema.partial().omit({ code: true });
export type UpdateSiteInput = z.infer<typeof UpdateSiteSchema>;

// ── Locations — Building ──────────────────────────────────────────────────────

export const CreateBuildingSchema = z.object({
  name: z.string().min(1).max(200),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/),
  notes: z.string().max(500).optional(),
});
export type CreateBuildingInput = z.infer<typeof CreateBuildingSchema>;

export const UpdateBuildingSchema = CreateBuildingSchema.partial().omit({ code: true });
export type UpdateBuildingInput = z.infer<typeof UpdateBuildingSchema>;

// ── Locations — Room ──────────────────────────────────────────────────────────

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  roomType: z.enum(['standard', 'mmr', 'telco_closet', 'common_area']),
  floor: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

export const UpdateRoomSchema = CreateRoomSchema.partial().omit({ code: true });
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;

// ── Locations — Cage ──────────────────────────────────────────────────────────

export const CreateCageSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  ownerOrgId: z.string().optional(), // null = operator-owned
  notes: z.string().max(500).optional(),
});
export type CreateCageInput = z.infer<typeof CreateCageSchema>;

export const UpdateCageSchema = CreateCageSchema.partial().omit({ code: true });
export type UpdateCageInput = z.infer<typeof UpdateCageSchema>;

// ── Locations — Rack ──────────────────────────────────────────────────────────

export const CreateRackSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  uSize: z.number().int().min(1).max(100).default(42),
  notes: z.string().max(500).optional(),
});
export type CreateRackInput = z.infer<typeof CreateRackSchema>;

export const UpdateRackSchema = CreateRackSchema.partial().omit({ code: true });
export type UpdateRackInput = z.infer<typeof UpdateRackSchema>;

// ── Locations — Panel ─────────────────────────────────────────────────────────

export const CreatePanelInRackSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  panelType: z.enum(['patch_panel', 'odf', 'fdf', 'demarc', 'splice_enclosure']),
  portCount: z.number().int().min(1).max(1000),
  uPosition: z.number().int().min(1).max(200).optional(),
  notes: z.string().max(500).optional(),
});
export type CreatePanelInRackInput = z.infer<typeof CreatePanelInRackSchema>;

export const CreatePanelInRoomSchema = CreatePanelInRackSchema.omit({ uPosition: true });
export type CreatePanelInRoomInput = z.infer<typeof CreatePanelInRoomSchema>;

export const UpdatePanelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  panelType: z.enum(['patch_panel', 'odf', 'fdf', 'demarc', 'splice_enclosure']).optional(),
  uPosition: z.number().int().min(1).max(200).nullable().optional(),
  notes: z.string().max(500).optional(),
});
export type UpdatePanelInput = z.infer<typeof UpdatePanelSchema>;

// ── Locations — Port ──────────────────────────────────────────────────────────

export const CreatePortSchema = z.object({
  label: z.string().min(1).max(20),
  position: z.number().int().min(1),
  mediaType: z.enum(['smf', 'mmf', 'cat6', 'coax', 'dac']),
  connectorType: z.enum(CONNECTOR_TYPES),
  strandRole: z.enum(STRAND_ROLES).default('unspecified'),
  notes: z.string().max(500).optional(),
});
export type CreatePortInput = z.infer<typeof CreatePortSchema>;

// Bulk port generation — sequential labels for a newly-created panel
export const BulkCreatePortsSchema = z.object({
  count: z.number().int().min(1).max(1000),
  mediaType: z.enum(['smf', 'mmf', 'cat6', 'coax', 'dac']),
  connectorType: z.enum(CONNECTOR_TYPES),
  labelPrefix: z.string().max(10).default(''),
  alternateTxRx: z.boolean().default(false),
  startPosition: z.number().int().min(1).default(1),
});
export type BulkCreatePortsInput = z.infer<typeof BulkCreatePortsSchema>;

// ── Port availability query ───────────────────────────────────────────────────

export const ListAvailablePortsSchema = z.object({
  mediaType: z.enum(['smf', 'mmf', 'cat6', 'coax', 'dac']).optional(),
  connectorType: z.enum(CONNECTOR_TYPES).optional(),
  strandRole: z.enum(STRAND_ROLES).optional(),
  minCount: z.coerce.number().int().min(1).optional(), // filter panels with at least N free ports
});
export type ListAvailablePortsInput = z.infer<typeof ListAvailablePortsSchema>;

// ── DemarcPoint ───────────────────────────────────────────────────────────────

export const CreateDemarcPointSchema = z.object({
  name: z.string().min(1).max(200),
  demarcType: z.enum(['customer', 'carrier', 'cloud_onramp', 'exchange', 'internal']),
  organizationId: z.string(),
  roomId: z.string().optional(),
  panelId: z.string().optional(),
  loaReference: z.string().max(100).optional(),
  cfaReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateDemarcPointInput = z.infer<typeof CreateDemarcPointSchema>;

// ── Cross-Connect Orders ──────────────────────────────────────────────────────

const EndpointInputSchema = z.object({
  endpointType: z.enum(['customer', 'carrier', 'cloud_onramp', 'exchange', 'internal']),
  organizationId: z.string().optional(),
  desiredPanelId: z.string().optional(),
  demarcPointId: z.string().optional(),
  loaNumber: z.string().max(100).optional(),
  cfaNumber: z.string().max(100).optional(),
  demarcDescription: z.string().max(500).optional(),
});

export const CreateOrderSchema = z
  .object({
    serviceType: z.enum([
      'customer_to_carrier',
      'customer_to_customer',
      'customer_to_cloud',
      'exchange',
    ]),
    mediaType: z.enum(['smf', 'mmf', 'cat6', 'coax', 'dac']),
    speedGbps: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .nullable()
      .optional(),
    isTemporary: z.boolean().default(false),
    requestedActiveAt: z.string().datetime().nullable().optional(),
    requestedExpiresAt: z.string().datetime().nullable().optional(),
    customerReference: z.string().max(100).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    aSide: EndpointInputSchema,
    zSide: EndpointInputSchema,
  })
  .refine((d) => !d.isTemporary || !!d.requestedExpiresAt, {
    message: 'requestedExpiresAt is required for temporary cross-connects',
    path: ['requestedExpiresAt'],
  });
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const ListOrdersSchema = PaginationSchema.extend({
  state: z.string().optional(),
  serviceType: z.string().optional(),
  mediaType: z.string().optional(),
  orgId: z.string().optional(), // filter by requestingOrg
  isTemporary: z.coerce.boolean().optional(),
  q: z.string().max(200).optional(), // search orderNumber / customerReference
});
export type ListOrdersInput = z.infer<typeof ListOrdersSchema>;

// ── Order lifecycle actions ───────────────────────────────────────────────────

export const RejectOrderSchema = z.object({
  rejectionReason: z.string().min(10).max(2000),
});
export type RejectOrderInput = z.infer<typeof RejectOrderSchema>;

export const CancelOrderSchema = z.object({
  cancelledReason: z.string().min(5).max(2000),
});
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;

export const ConfirmFeasibilitySchema = z.object({
  notes: z.string().max(2000).optional(),
});
export type ConfirmFeasibilityInput = z.infer<typeof ConfirmFeasibilitySchema>;

export const ApproveOrderSchema = z.object({
  notes: z.string().max(2000).optional(),
});
export type ApproveOrderInput = z.infer<typeof ApproveOrderSchema>;

// ── Approval ──────────────────────────────────────────────────────────────────

export const DecideApprovalSchema = z
  .object({
    decision: z.enum(['approved', 'rejected', 'deferred']),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.decision !== 'rejected' || (d.notes && d.notes.trim().length >= 10), {
    message: 'notes (rejection reason) required and must be at least 10 characters',
    path: ['notes'],
  });
export type DecideApprovalInput = z.infer<typeof DecideApprovalSchema>;

// ── Services ──────────────────────────────────────────────────────────────────

export const ListServicesSchema = PaginationSchema.extend({
  state: z.string().optional(),
  serviceType: z.string().optional(),
  orgId: z.string().optional(),
  isTemporary: z.coerce.boolean().optional(),
  q: z.string().max(200).optional(), // search serviceNumber
});
export type ListServicesInput = z.infer<typeof ListServicesSchema>;

export const DisconnectServiceSchema = z.object({
  reason: z.string().min(5).max(2000),
});
export type DisconnectServiceInput = z.infer<typeof DisconnectServiceSchema>;

export const SuspendServiceSchema = z.object({
  reason: z.string().min(5).max(2000),
});
export type SuspendServiceInput = z.infer<typeof SuspendServiceSchema>;

export const ExtendTemporaryServiceSchema = z.object({
  newExpiresAt: z.string().datetime(),
  reason: z.string().max(1000).optional(),
});
export type ExtendTemporaryServiceInput = z.infer<typeof ExtendTemporaryServiceSchema>;

// ── Cable Paths ───────────────────────────────────────────────────────────────

export const CreateCablePathSchema = z.object({
  pathRole: z.enum(['primary', 'diverse']).default('primary'),
  segments: z
    .array(
      z.object({
        sequence: z.number().int().min(1),
        fromPortId: z.string(),
        toPortId: z.string(),
        segmentType: z.enum(['patch', 'trunk', 'jumper', 'demarc_extension']),
        physicalCableLabel: z.string().max(100).nullable().optional(),
        physicalCableLength: z.number().positive().nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .min(1),
  notes: z.string().max(2000).optional(),
});
export type CreateCablePathInput = z.infer<typeof CreateCablePathSchema>;

export const MarkInstalledSchema = z.object({
  // techNotes recorded on the WO, not on the path itself
  installedAt: z.string().datetime().optional(), // defaults to now()
});
export type MarkInstalledInput = z.infer<typeof MarkInstalledSchema>;

// ── Work Orders ───────────────────────────────────────────────────────────────

export const CreateWorkOrderSchema = z.object({
  serviceId: z.string(),
  cablePathId: z.string().optional(),
  woType: z.enum(['install', 'disconnect', 'reroute', 'repair', 'audit_check']),
  priority: z.number().int().min(1).max(4).default(3),
  scheduledAt: z.string().datetime().optional(),
  dueBy: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;

export const AssignWorkOrderSchema = z.object({
  assignedToId: z.string(),
  scheduledAt: z.string().datetime().optional(),
});
export type AssignWorkOrderInput = z.infer<typeof AssignWorkOrderSchema>;

export const ProgressWorkOrderSchema = z.object({
  techNotes: z.string().min(1).max(5000),
  failureReason: z.string().max(2000).optional(), // required when moving back to in_progress
});
export type ProgressWorkOrderInput = z.infer<typeof ProgressWorkOrderSchema>;

export const CompleteWorkOrderSchema = z.object({
  techNotes: z.string().min(1).max(5000),
});
export type CompleteWorkOrderInput = z.infer<typeof CompleteWorkOrderSchema>;

export const CancelWorkOrderSchema = z.object({
  cancellationReason: z.string().min(5).max(2000),
});
export type CancelWorkOrderInput = z.infer<typeof CancelWorkOrderSchema>;

export const ListWorkOrdersSchema = PaginationSchema.extend({
  state: z.string().optional(),
  woType: z.string().optional(),
  serviceId: z.string().optional(),
  assignedToId: z.string().optional(),
  priority: z.coerce.number().int().min(1).max(4).optional(),
  q: z.string().max(200).optional(), // search woNumber
});
export type ListWorkOrdersInput = z.infer<typeof ListWorkOrdersSchema>;
