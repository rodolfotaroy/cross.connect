'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ListWorkOrdersSchema =
  exports.CancelWorkOrderSchema =
  exports.CompleteWorkOrderSchema =
  exports.ProgressWorkOrderSchema =
  exports.AssignWorkOrderSchema =
  exports.CreateWorkOrderSchema =
  exports.MarkInstalledSchema =
  exports.CreateCablePathSchema =
  exports.ExtendTemporaryServiceSchema =
  exports.SuspendServiceSchema =
  exports.DisconnectServiceSchema =
  exports.ListServicesSchema =
  exports.DecideApprovalSchema =
  exports.ApproveOrderSchema =
  exports.ConfirmFeasibilitySchema =
  exports.CancelOrderSchema =
  exports.RejectOrderSchema =
  exports.ListOrdersSchema =
  exports.CreateOrderSchema =
  exports.CreateDemarcPointSchema =
  exports.ListAvailablePortsSchema =
  exports.BulkCreatePortsSchema =
  exports.CreatePortSchema =
  exports.CreatePanelInRoomSchema =
  exports.CreatePanelInRackSchema =
  exports.CreateRackSchema =
  exports.CreateCageSchema =
  exports.CreateRoomSchema =
  exports.CreateBuildingSchema =
  exports.UpdateSiteSchema =
  exports.CreateSiteSchema =
  exports.CreateUserSchema =
  exports.ListOrganizationsSchema =
  exports.UpdateOrganizationSchema =
  exports.CreateOrganizationSchema =
  exports.RefreshTokenSchema =
  exports.LoginSchema =
  exports.PaginationSchema =
    void 0;
const zod_1 = require('zod');
exports.PaginationSchema = zod_1.z.object({
  page: zod_1.z.coerce.number().int().min(1).default(1),
  limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
  sortBy: zod_1.z.string().optional(),
  sortDir: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.LoginSchema = zod_1.z.object({
  email: zod_1.z.string().email(),
  password: zod_1.z.string().min(8),
});
exports.RefreshTokenSchema = zod_1.z.object({
  refreshToken: zod_1.z.string().min(1),
});
exports.CreateOrganizationSchema = zod_1.z.object({
  name: zod_1.z.string().min(2).max(200),
  code: zod_1.z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, 'code must be uppercase alphanumeric'),
  orgType: zod_1.z.enum(['operator', 'customer', 'carrier', 'cloud_provider', 'exchange']),
  contactEmail: zod_1.z.string().email().optional(),
  contactPhone: zod_1.z.string().max(30).optional(),
  notes: zod_1.z.string().max(1000).optional(),
});
exports.UpdateOrganizationSchema = exports.CreateOrganizationSchema.partial().omit({
  code: true,
  orgType: true,
});
exports.ListOrganizationsSchema = exports.PaginationSchema.extend({
  orgType: zod_1.z.string().optional(),
  isActive: zod_1.z.coerce.boolean().optional(),
  q: zod_1.z.string().max(100).optional(),
});
exports.CreateUserSchema = zod_1.z.object({
  email: zod_1.z.string().email().max(255),
  password: zod_1.z.string().min(12).max(128),
  firstName: zod_1.z.string().min(1).max(100),
  lastName: zod_1.z.string().min(1).max(100),
  role: zod_1.z.enum([
    'ops_manager',
    'ops_technician',
    'customer_admin',
    'customer_orderer',
    'customer_viewer',
  ]),
});
exports.CreateSiteSchema = zod_1.z.object({
  name: zod_1.z.string().min(2).max(200),
  code: zod_1.z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/),
  address: zod_1.z.string().min(5).max(300),
  city: zod_1.z.string().min(2).max(100),
  state: zod_1.z.string().max(50).optional(),
  country: zod_1.z.string().length(2).toUpperCase(),
  timezone: zod_1.z.string().max(50).default('UTC'),
  notes: zod_1.z.string().max(500).optional(),
});
exports.UpdateSiteSchema = exports.CreateSiteSchema.partial().omit({ code: true });
exports.CreateBuildingSchema = zod_1.z.object({
  name: zod_1.z.string().min(1).max(200),
  code: zod_1.z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/),
  notes: zod_1.z.string().max(500).optional(),
});
exports.CreateRoomSchema = zod_1.z.object({
  name: zod_1.z.string().min(1).max(100),
  code: zod_1.z.string().min(1).max(50),
  roomType: zod_1.z.enum(['standard', 'mmr', 'telco_closet', 'common_area']),
  floor: zod_1.z.string().max(20).optional(),
  notes: zod_1.z.string().max(500).optional(),
});
exports.CreateCageSchema = zod_1.z.object({
  name: zod_1.z.string().min(1).max(100),
  code: zod_1.z.string().min(1).max(50),
  ownerOrgId: zod_1.z.string().optional(),
  notes: zod_1.z.string().max(500).optional(),
});
exports.CreateRackSchema = zod_1.z.object({
  name: zod_1.z.string().min(1).max(100),
  code: zod_1.z.string().min(1).max(50),
  uSize: zod_1.z.number().int().min(1).max(100).default(42),
  notes: zod_1.z.string().max(500).optional(),
});
exports.CreatePanelInRackSchema = zod_1.z.object({
  name: zod_1.z.string().min(1).max(100),
  code: zod_1.z.string().min(1).max(50),
  panelType: zod_1.z.enum(['patch_panel', 'odf', 'fdf', 'demarc', 'splice_enclosure']),
  portCount: zod_1.z.number().int().min(1).max(1000),
  uPosition: zod_1.z.number().int().min(1).max(200).optional(),
  notes: zod_1.z.string().max(500).optional(),
});
exports.CreatePanelInRoomSchema = exports.CreatePanelInRackSchema.omit({ uPosition: true });
exports.CreatePortSchema = zod_1.z.object({
  label: zod_1.z.string().min(1).max(20),
  position: zod_1.z.number().int().min(1),
  mediaType: zod_1.z.enum(['smf', 'mmf', 'cat6', 'coax', 'dac']),
  connectorType: zod_1.z.enum(['lc', 'sc', 'mtp_mpo', 'rj45', 'fc']),
  strandRole: zod_1.z.enum(['tx', 'rx', 'unspecified']).default('unspecified'),
  notes: zod_1.z.string().max(500).optional(),
});
exports.BulkCreatePortsSchema = zod_1.z.object({
  count: zod_1.z.number().int().min(1).max(1000),
  mediaType: zod_1.z.enum(['smf', 'mmf', 'cat6', 'coax', 'dac']),
  connectorType: zod_1.z.enum(['lc', 'sc', 'mtp_mpo', 'rj45', 'fc']),
  labelPrefix: zod_1.z.string().max(10).default(''),
  alternateTxRx: zod_1.z.boolean().default(false),
  startPosition: zod_1.z.number().int().min(1).default(1),
});
exports.ListAvailablePortsSchema = zod_1.z.object({
  mediaType: zod_1.z.enum(['smf', 'mmf', 'cat6', 'coax', 'dac']).optional(),
  connectorType: zod_1.z.enum(['lc', 'sc', 'mtp_mpo', 'rj45', 'fc']).optional(),
  strandRole: zod_1.z.enum(['tx', 'rx', 'unspecified']).optional(),
  minCount: zod_1.z.coerce.number().int().min(1).optional(),
});
exports.CreateDemarcPointSchema = zod_1.z.object({
  name: zod_1.z.string().min(1).max(200),
  demarcType: zod_1.z.enum(['customer', 'carrier', 'cloud_onramp', 'exchange', 'internal']),
  organizationId: zod_1.z.string(),
  roomId: zod_1.z.string().optional(),
  panelId: zod_1.z.string().optional(),
  loaReference: zod_1.z.string().max(100).optional(),
  cfaReference: zod_1.z.string().max(100).optional(),
  notes: zod_1.z.string().max(500).optional(),
});
const EndpointInputSchema = zod_1.z.object({
  endpointType: zod_1.z.enum(['customer', 'carrier', 'cloud_onramp', 'exchange', 'internal']),
  organizationId: zod_1.z.string().optional(),
  desiredPanelId: zod_1.z.string().optional(),
  demarcPointId: zod_1.z.string().optional(),
  loaNumber: zod_1.z.string().max(100).optional(),
  cfaNumber: zod_1.z.string().max(100).optional(),
  demarcDescription: zod_1.z.string().max(500).optional(),
});
exports.CreateOrderSchema = zod_1.z
  .object({
    serviceType: zod_1.z.enum([
      'customer_to_carrier',
      'customer_to_customer',
      'customer_to_cloud',
      'exchange',
    ]),
    mediaType: zod_1.z.enum(['smf', 'mmf', 'cat6', 'coax', 'dac']),
    speedGbps: zod_1.z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .nullable()
      .optional(),
    isTemporary: zod_1.z.boolean().default(false),
    requestedActiveAt: zod_1.z.string().datetime().nullable().optional(),
    requestedExpiresAt: zod_1.z.string().datetime().nullable().optional(),
    customerReference: zod_1.z.string().max(100).nullable().optional(),
    notes: zod_1.z.string().max(2000).nullable().optional(),
    aSide: EndpointInputSchema,
    zSide: EndpointInputSchema,
  })
  .refine((d) => !d.isTemporary || !!d.requestedExpiresAt, {
    message: 'requestedExpiresAt is required for temporary cross-connects',
    path: ['requestedExpiresAt'],
  });
exports.ListOrdersSchema = exports.PaginationSchema.extend({
  state: zod_1.z.string().optional(),
  serviceType: zod_1.z.string().optional(),
  mediaType: zod_1.z.string().optional(),
  orgId: zod_1.z.string().optional(),
  isTemporary: zod_1.z.coerce.boolean().optional(),
  q: zod_1.z.string().max(200).optional(),
});
exports.RejectOrderSchema = zod_1.z.object({
  rejectionReason: zod_1.z.string().min(10).max(2000),
});
exports.CancelOrderSchema = zod_1.z.object({
  cancelledReason: zod_1.z.string().min(5).max(2000),
});
exports.ConfirmFeasibilitySchema = zod_1.z.object({
  notes: zod_1.z.string().max(2000).optional(),
});
exports.ApproveOrderSchema = zod_1.z.object({
  notes: zod_1.z.string().max(2000).optional(),
});
exports.DecideApprovalSchema = zod_1.z
  .object({
    decision: zod_1.z.enum(['approved', 'rejected', 'deferred']),
    notes: zod_1.z.string().max(2000).optional(),
  })
  .refine((d) => d.decision !== 'rejected' || (d.notes && d.notes.trim().length >= 10), {
    message: 'notes (rejection reason) required and must be at least 10 characters',
    path: ['notes'],
  });
exports.ListServicesSchema = exports.PaginationSchema.extend({
  state: zod_1.z.string().optional(),
  serviceType: zod_1.z.string().optional(),
  orgId: zod_1.z.string().optional(),
  isTemporary: zod_1.z.coerce.boolean().optional(),
  q: zod_1.z.string().max(200).optional(),
});
exports.DisconnectServiceSchema = zod_1.z.object({
  reason: zod_1.z.string().min(5).max(2000),
});
exports.SuspendServiceSchema = zod_1.z.object({
  reason: zod_1.z.string().min(5).max(2000),
});
exports.ExtendTemporaryServiceSchema = zod_1.z.object({
  newExpiresAt: zod_1.z.string().datetime(),
  reason: zod_1.z.string().max(1000).optional(),
});
exports.CreateCablePathSchema = zod_1.z.object({
  pathRole: zod_1.z.enum(['primary', 'diverse']).default('primary'),
  segments: zod_1.z
    .array(
      zod_1.z.object({
        sequence: zod_1.z.number().int().min(1),
        fromPortId: zod_1.z.string(),
        toPortId: zod_1.z.string(),
        segmentType: zod_1.z.enum(['patch', 'trunk', 'jumper', 'demarc_extension']),
        physicalCableLabel: zod_1.z.string().max(100).nullable().optional(),
        physicalCableLength: zod_1.z.number().positive().nullable().optional(),
        notes: zod_1.z.string().max(500).nullable().optional(),
      }),
    )
    .min(1),
  notes: zod_1.z.string().max(2000).optional(),
});
exports.MarkInstalledSchema = zod_1.z.object({
  installedAt: zod_1.z.string().datetime().optional(),
});
exports.CreateWorkOrderSchema = zod_1.z.object({
  serviceId: zod_1.z.string(),
  cablePathId: zod_1.z.string().optional(),
  woType: zod_1.z.enum(['install', 'disconnect', 'reroute', 'repair', 'audit_check']),
  priority: zod_1.z.number().int().min(1).max(4).default(3),
  scheduledAt: zod_1.z.string().datetime().optional(),
  dueBy: zod_1.z.string().datetime().optional(),
  notes: zod_1.z.string().max(2000).optional(),
});
exports.AssignWorkOrderSchema = zod_1.z.object({
  assignedToId: zod_1.z.string(),
  scheduledAt: zod_1.z.string().datetime().optional(),
});
exports.ProgressWorkOrderSchema = zod_1.z.object({
  techNotes: zod_1.z.string().min(1).max(5000),
  failureReason: zod_1.z.string().max(2000).optional(),
});
exports.CompleteWorkOrderSchema = zod_1.z.object({
  techNotes: zod_1.z.string().min(1).max(5000),
});
exports.CancelWorkOrderSchema = zod_1.z.object({
  cancellationReason: zod_1.z.string().min(5).max(2000),
});
exports.ListWorkOrdersSchema = exports.PaginationSchema.extend({
  state: zod_1.z.string().optional(),
  woType: zod_1.z.string().optional(),
  serviceId: zod_1.z.string().optional(),
  assignedToId: zod_1.z.string().optional(),
  priority: zod_1.z.coerce.number().int().min(1).max(4).optional(),
  q: zod_1.z.string().max(200).optional(),
});
//# sourceMappingURL=schemas.js.map
