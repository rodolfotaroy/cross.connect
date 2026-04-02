import { z } from 'zod';
export declare const PaginationSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortDir: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
    sortDir: 'asc' | 'desc';
    sortBy?: string | undefined;
  },
  {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortDir?: 'asc' | 'desc' | undefined;
  }
>;
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
export declare const LoginSchema: z.ZodObject<
  {
    email: z.ZodString;
    password: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    email: string;
    password: string;
  },
  {
    email: string;
    password: string;
  }
>;
export type LoginInput = z.infer<typeof LoginSchema>;
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
    firstName: string;
    lastName: string;
  };
}
export declare const RefreshTokenSchema: z.ZodObject<
  {
    refreshToken: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    refreshToken: string;
  },
  {
    refreshToken: string;
  }
>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export declare const CreateOrganizationSchema: z.ZodObject<
  {
    name: z.ZodString;
    code: z.ZodString;
    orgType: z.ZodEnum<['operator', 'customer', 'carrier', 'cloud_provider', 'exchange']>;
    contactEmail: z.ZodOptional<z.ZodString>;
    contactPhone: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    code: string;
    orgType: 'operator' | 'customer' | 'carrier' | 'cloud_provider' | 'exchange';
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    notes?: string | undefined;
  },
  {
    name: string;
    code: string;
    orgType: 'operator' | 'customer' | 'carrier' | 'cloud_provider' | 'exchange';
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    notes?: string | undefined;
  }
>;
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export declare const UpdateOrganizationSchema: z.ZodObject<
  Omit<
    {
      name: z.ZodOptional<z.ZodString>;
      code: z.ZodOptional<z.ZodString>;
      orgType: z.ZodOptional<
        z.ZodEnum<['operator', 'customer', 'carrier', 'cloud_provider', 'exchange']>
      >;
      contactEmail: z.ZodOptional<z.ZodOptional<z.ZodString>>;
      contactPhone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
      notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    },
    'code' | 'orgType'
  >,
  'strip',
  z.ZodTypeAny,
  {
    name?: string | undefined;
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    notes?: string | undefined;
  },
  {
    name?: string | undefined;
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    notes?: string | undefined;
  }
>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export declare const ListOrganizationsSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortDir: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>;
  } & {
    orgType: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    q: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
    sortDir: 'asc' | 'desc';
    sortBy?: string | undefined;
    orgType?: string | undefined;
    isActive?: boolean | undefined;
    q?: string | undefined;
  },
  {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortDir?: 'asc' | 'desc' | undefined;
    orgType?: string | undefined;
    isActive?: boolean | undefined;
    q?: string | undefined;
  }
>;
export type ListOrganizationsInput = z.infer<typeof ListOrganizationsSchema>;
export declare const CreateUserSchema: z.ZodObject<
  {
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    role: z.ZodEnum<
      ['ops_manager', 'ops_technician', 'customer_admin', 'customer_orderer', 'customer_viewer']
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role:
      | 'ops_manager'
      | 'ops_technician'
      | 'customer_admin'
      | 'customer_orderer'
      | 'customer_viewer';
  },
  {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role:
      | 'ops_manager'
      | 'ops_technician'
      | 'customer_admin'
      | 'customer_orderer'
      | 'customer_viewer';
  }
>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export declare const CreateSiteSchema: z.ZodObject<
  {
    name: z.ZodString;
    code: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
    country: z.ZodString;
    timezone: z.ZodDefault<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    code: string;
    address: string;
    city: string;
    country: string;
    timezone: string;
    notes?: string | undefined;
    state?: string | undefined;
  },
  {
    name: string;
    code: string;
    address: string;
    city: string;
    country: string;
    notes?: string | undefined;
    state?: string | undefined;
    timezone?: string | undefined;
  }
>;
export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;
export declare const UpdateSiteSchema: z.ZodObject<
  Omit<
    {
      name: z.ZodOptional<z.ZodString>;
      code: z.ZodOptional<z.ZodString>;
      address: z.ZodOptional<z.ZodString>;
      city: z.ZodOptional<z.ZodString>;
      state: z.ZodOptional<z.ZodOptional<z.ZodString>>;
      country: z.ZodOptional<z.ZodString>;
      timezone: z.ZodOptional<z.ZodDefault<z.ZodString>>;
      notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    },
    'code'
  >,
  'strip',
  z.ZodTypeAny,
  {
    name?: string | undefined;
    notes?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    country?: string | undefined;
    timezone?: string | undefined;
  },
  {
    name?: string | undefined;
    notes?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    country?: string | undefined;
    timezone?: string | undefined;
  }
>;
export type UpdateSiteInput = z.infer<typeof UpdateSiteSchema>;
export declare const CreateBuildingSchema: z.ZodObject<
  {
    name: z.ZodString;
    code: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    code: string;
    notes?: string | undefined;
  },
  {
    name: string;
    code: string;
    notes?: string | undefined;
  }
>;
export type CreateBuildingInput = z.infer<typeof CreateBuildingSchema>;
export declare const CreateRoomSchema: z.ZodObject<
  {
    name: z.ZodString;
    code: z.ZodString;
    roomType: z.ZodEnum<['standard', 'mmr', 'telco_closet', 'common_area']>;
    floor: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    code: string;
    roomType: 'standard' | 'mmr' | 'telco_closet' | 'common_area';
    notes?: string | undefined;
    floor?: string | undefined;
  },
  {
    name: string;
    code: string;
    roomType: 'standard' | 'mmr' | 'telco_closet' | 'common_area';
    notes?: string | undefined;
    floor?: string | undefined;
  }
>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export declare const CreateCageSchema: z.ZodObject<
  {
    name: z.ZodString;
    code: z.ZodString;
    ownerOrgId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    code: string;
    notes?: string | undefined;
    ownerOrgId?: string | undefined;
  },
  {
    name: string;
    code: string;
    notes?: string | undefined;
    ownerOrgId?: string | undefined;
  }
>;
export type CreateCageInput = z.infer<typeof CreateCageSchema>;
export declare const CreateRackSchema: z.ZodObject<
  {
    name: z.ZodString;
    code: z.ZodString;
    uSize: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    code: string;
    uSize: number;
    notes?: string | undefined;
  },
  {
    name: string;
    code: string;
    notes?: string | undefined;
    uSize?: number | undefined;
  }
>;
export type CreateRackInput = z.infer<typeof CreateRackSchema>;
export declare const CreatePanelInRackSchema: z.ZodObject<
  {
    name: z.ZodString;
    code: z.ZodString;
    panelType: z.ZodEnum<['patch_panel', 'odf', 'fdf', 'demarc', 'splice_enclosure']>;
    portCount: z.ZodNumber;
    uPosition: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    code: string;
    panelType: 'patch_panel' | 'odf' | 'fdf' | 'demarc' | 'splice_enclosure';
    portCount: number;
    notes?: string | undefined;
    uPosition?: number | undefined;
  },
  {
    name: string;
    code: string;
    panelType: 'patch_panel' | 'odf' | 'fdf' | 'demarc' | 'splice_enclosure';
    portCount: number;
    notes?: string | undefined;
    uPosition?: number | undefined;
  }
>;
export type CreatePanelInRackInput = z.infer<typeof CreatePanelInRackSchema>;
export declare const CreatePanelInRoomSchema: z.ZodObject<
  Omit<
    {
      name: z.ZodString;
      code: z.ZodString;
      panelType: z.ZodEnum<['patch_panel', 'odf', 'fdf', 'demarc', 'splice_enclosure']>;
      portCount: z.ZodNumber;
      uPosition: z.ZodOptional<z.ZodNumber>;
      notes: z.ZodOptional<z.ZodString>;
    },
    'uPosition'
  >,
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    code: string;
    panelType: 'patch_panel' | 'odf' | 'fdf' | 'demarc' | 'splice_enclosure';
    portCount: number;
    notes?: string | undefined;
  },
  {
    name: string;
    code: string;
    panelType: 'patch_panel' | 'odf' | 'fdf' | 'demarc' | 'splice_enclosure';
    portCount: number;
    notes?: string | undefined;
  }
>;
export type CreatePanelInRoomInput = z.infer<typeof CreatePanelInRoomSchema>;
export declare const CreatePortSchema: z.ZodObject<
  {
    label: z.ZodString;
    position: z.ZodNumber;
    mediaType: z.ZodEnum<['smf', 'mmf', 'cat6', 'coax', 'dac']>;
    connectorType: z.ZodEnum<['lc', 'sc', 'mtp_mpo', 'rj45', 'fc']>;
    strandRole: z.ZodDefault<z.ZodEnum<['tx', 'rx', 'unspecified']>>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    label: string;
    position: number;
    mediaType: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac';
    connectorType: 'lc' | 'sc' | 'mtp_mpo' | 'rj45' | 'fc';
    strandRole: 'tx' | 'rx' | 'unspecified';
    notes?: string | undefined;
  },
  {
    label: string;
    position: number;
    mediaType: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac';
    connectorType: 'lc' | 'sc' | 'mtp_mpo' | 'rj45' | 'fc';
    notes?: string | undefined;
    strandRole?: 'tx' | 'rx' | 'unspecified' | undefined;
  }
>;
export type CreatePortInput = z.infer<typeof CreatePortSchema>;
export declare const BulkCreatePortsSchema: z.ZodObject<
  {
    count: z.ZodNumber;
    mediaType: z.ZodEnum<['smf', 'mmf', 'cat6', 'coax', 'dac']>;
    connectorType: z.ZodEnum<['lc', 'sc', 'mtp_mpo', 'rj45', 'fc']>;
    labelPrefix: z.ZodDefault<z.ZodString>;
    alternateTxRx: z.ZodDefault<z.ZodBoolean>;
    startPosition: z.ZodDefault<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    mediaType: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac';
    connectorType: 'lc' | 'sc' | 'mtp_mpo' | 'rj45' | 'fc';
    count: number;
    labelPrefix: string;
    alternateTxRx: boolean;
    startPosition: number;
  },
  {
    mediaType: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac';
    connectorType: 'lc' | 'sc' | 'mtp_mpo' | 'rj45' | 'fc';
    count: number;
    labelPrefix?: string | undefined;
    alternateTxRx?: boolean | undefined;
    startPosition?: number | undefined;
  }
>;
export type BulkCreatePortsInput = z.infer<typeof BulkCreatePortsSchema>;
export declare const ListAvailablePortsSchema: z.ZodObject<
  {
    mediaType: z.ZodOptional<z.ZodEnum<['smf', 'mmf', 'cat6', 'coax', 'dac']>>;
    connectorType: z.ZodOptional<z.ZodEnum<['lc', 'sc', 'mtp_mpo', 'rj45', 'fc']>>;
    strandRole: z.ZodOptional<z.ZodEnum<['tx', 'rx', 'unspecified']>>;
    minCount: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    mediaType?: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac' | undefined;
    connectorType?: 'lc' | 'sc' | 'mtp_mpo' | 'rj45' | 'fc' | undefined;
    strandRole?: 'tx' | 'rx' | 'unspecified' | undefined;
    minCount?: number | undefined;
  },
  {
    mediaType?: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac' | undefined;
    connectorType?: 'lc' | 'sc' | 'mtp_mpo' | 'rj45' | 'fc' | undefined;
    strandRole?: 'tx' | 'rx' | 'unspecified' | undefined;
    minCount?: number | undefined;
  }
>;
export type ListAvailablePortsInput = z.infer<typeof ListAvailablePortsSchema>;
export declare const CreateDemarcPointSchema: z.ZodObject<
  {
    name: z.ZodString;
    demarcType: z.ZodEnum<['customer', 'carrier', 'cloud_onramp', 'exchange', 'internal']>;
    organizationId: z.ZodString;
    roomId: z.ZodOptional<z.ZodString>;
    panelId: z.ZodOptional<z.ZodString>;
    loaReference: z.ZodOptional<z.ZodString>;
    cfaReference: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    demarcType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
    organizationId: string;
    notes?: string | undefined;
    roomId?: string | undefined;
    panelId?: string | undefined;
    loaReference?: string | undefined;
    cfaReference?: string | undefined;
  },
  {
    name: string;
    demarcType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
    organizationId: string;
    notes?: string | undefined;
    roomId?: string | undefined;
    panelId?: string | undefined;
    loaReference?: string | undefined;
    cfaReference?: string | undefined;
  }
>;
export type CreateDemarcPointInput = z.infer<typeof CreateDemarcPointSchema>;
export declare const CreateOrderSchema: z.ZodEffects<
  z.ZodObject<
    {
      serviceType: z.ZodEnum<
        ['customer_to_carrier', 'customer_to_customer', 'customer_to_cloud', 'exchange']
      >;
      mediaType: z.ZodEnum<['smf', 'mmf', 'cat6', 'coax', 'dac']>;
      speedGbps: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      isTemporary: z.ZodDefault<z.ZodBoolean>;
      requestedActiveAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      requestedExpiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      customerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      aSide: z.ZodObject<
        {
          endpointType: z.ZodEnum<['customer', 'carrier', 'cloud_onramp', 'exchange', 'internal']>;
          organizationId: z.ZodOptional<z.ZodString>;
          desiredPanelId: z.ZodOptional<z.ZodString>;
          demarcPointId: z.ZodOptional<z.ZodString>;
          loaNumber: z.ZodOptional<z.ZodString>;
          cfaNumber: z.ZodOptional<z.ZodString>;
          demarcDescription: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
          organizationId?: string | undefined;
          desiredPanelId?: string | undefined;
          demarcPointId?: string | undefined;
          loaNumber?: string | undefined;
          cfaNumber?: string | undefined;
          demarcDescription?: string | undefined;
        },
        {
          endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
          organizationId?: string | undefined;
          desiredPanelId?: string | undefined;
          demarcPointId?: string | undefined;
          loaNumber?: string | undefined;
          cfaNumber?: string | undefined;
          demarcDescription?: string | undefined;
        }
      >;
      zSide: z.ZodObject<
        {
          endpointType: z.ZodEnum<['customer', 'carrier', 'cloud_onramp', 'exchange', 'internal']>;
          organizationId: z.ZodOptional<z.ZodString>;
          desiredPanelId: z.ZodOptional<z.ZodString>;
          demarcPointId: z.ZodOptional<z.ZodString>;
          loaNumber: z.ZodOptional<z.ZodString>;
          cfaNumber: z.ZodOptional<z.ZodString>;
          demarcDescription: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
          organizationId?: string | undefined;
          desiredPanelId?: string | undefined;
          demarcPointId?: string | undefined;
          loaNumber?: string | undefined;
          cfaNumber?: string | undefined;
          demarcDescription?: string | undefined;
        },
        {
          endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
          organizationId?: string | undefined;
          desiredPanelId?: string | undefined;
          demarcPointId?: string | undefined;
          loaNumber?: string | undefined;
          cfaNumber?: string | undefined;
          demarcDescription?: string | undefined;
        }
      >;
    },
    'strip',
    z.ZodTypeAny,
    {
      mediaType: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac';
      serviceType:
        | 'exchange'
        | 'customer_to_carrier'
        | 'customer_to_customer'
        | 'customer_to_cloud';
      isTemporary: boolean;
      aSide: {
        endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
        organizationId?: string | undefined;
        desiredPanelId?: string | undefined;
        demarcPointId?: string | undefined;
        loaNumber?: string | undefined;
        cfaNumber?: string | undefined;
        demarcDescription?: string | undefined;
      };
      zSide: {
        endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
        organizationId?: string | undefined;
        desiredPanelId?: string | undefined;
        demarcPointId?: string | undefined;
        loaNumber?: string | undefined;
        cfaNumber?: string | undefined;
        demarcDescription?: string | undefined;
      };
      notes?: string | null | undefined;
      speedGbps?: string | null | undefined;
      requestedActiveAt?: string | null | undefined;
      requestedExpiresAt?: string | null | undefined;
      customerReference?: string | null | undefined;
    },
    {
      mediaType: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac';
      serviceType:
        | 'exchange'
        | 'customer_to_carrier'
        | 'customer_to_customer'
        | 'customer_to_cloud';
      aSide: {
        endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
        organizationId?: string | undefined;
        desiredPanelId?: string | undefined;
        demarcPointId?: string | undefined;
        loaNumber?: string | undefined;
        cfaNumber?: string | undefined;
        demarcDescription?: string | undefined;
      };
      zSide: {
        endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
        organizationId?: string | undefined;
        desiredPanelId?: string | undefined;
        demarcPointId?: string | undefined;
        loaNumber?: string | undefined;
        cfaNumber?: string | undefined;
        demarcDescription?: string | undefined;
      };
      notes?: string | null | undefined;
      speedGbps?: string | null | undefined;
      isTemporary?: boolean | undefined;
      requestedActiveAt?: string | null | undefined;
      requestedExpiresAt?: string | null | undefined;
      customerReference?: string | null | undefined;
    }
  >,
  {
    mediaType: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac';
    serviceType: 'exchange' | 'customer_to_carrier' | 'customer_to_customer' | 'customer_to_cloud';
    isTemporary: boolean;
    aSide: {
      endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
      organizationId?: string | undefined;
      desiredPanelId?: string | undefined;
      demarcPointId?: string | undefined;
      loaNumber?: string | undefined;
      cfaNumber?: string | undefined;
      demarcDescription?: string | undefined;
    };
    zSide: {
      endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
      organizationId?: string | undefined;
      desiredPanelId?: string | undefined;
      demarcPointId?: string | undefined;
      loaNumber?: string | undefined;
      cfaNumber?: string | undefined;
      demarcDescription?: string | undefined;
    };
    notes?: string | null | undefined;
    speedGbps?: string | null | undefined;
    requestedActiveAt?: string | null | undefined;
    requestedExpiresAt?: string | null | undefined;
    customerReference?: string | null | undefined;
  },
  {
    mediaType: 'smf' | 'mmf' | 'cat6' | 'coax' | 'dac';
    serviceType: 'exchange' | 'customer_to_carrier' | 'customer_to_customer' | 'customer_to_cloud';
    aSide: {
      endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
      organizationId?: string | undefined;
      desiredPanelId?: string | undefined;
      demarcPointId?: string | undefined;
      loaNumber?: string | undefined;
      cfaNumber?: string | undefined;
      demarcDescription?: string | undefined;
    };
    zSide: {
      endpointType: 'customer' | 'carrier' | 'exchange' | 'cloud_onramp' | 'internal';
      organizationId?: string | undefined;
      desiredPanelId?: string | undefined;
      demarcPointId?: string | undefined;
      loaNumber?: string | undefined;
      cfaNumber?: string | undefined;
      demarcDescription?: string | undefined;
    };
    notes?: string | null | undefined;
    speedGbps?: string | null | undefined;
    isTemporary?: boolean | undefined;
    requestedActiveAt?: string | null | undefined;
    requestedExpiresAt?: string | null | undefined;
    customerReference?: string | null | undefined;
  }
>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export declare const ListOrdersSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortDir: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>;
  } & {
    state: z.ZodOptional<z.ZodString>;
    serviceType: z.ZodOptional<z.ZodString>;
    mediaType: z.ZodOptional<z.ZodString>;
    orgId: z.ZodOptional<z.ZodString>;
    isTemporary: z.ZodOptional<z.ZodBoolean>;
    q: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
    sortDir: 'asc' | 'desc';
    sortBy?: string | undefined;
    q?: string | undefined;
    state?: string | undefined;
    mediaType?: string | undefined;
    serviceType?: string | undefined;
    isTemporary?: boolean | undefined;
    orgId?: string | undefined;
  },
  {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortDir?: 'asc' | 'desc' | undefined;
    q?: string | undefined;
    state?: string | undefined;
    mediaType?: string | undefined;
    serviceType?: string | undefined;
    isTemporary?: boolean | undefined;
    orgId?: string | undefined;
  }
>;
export type ListOrdersInput = z.infer<typeof ListOrdersSchema>;
export declare const RejectOrderSchema: z.ZodObject<
  {
    rejectionReason: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    rejectionReason: string;
  },
  {
    rejectionReason: string;
  }
>;
export type RejectOrderInput = z.infer<typeof RejectOrderSchema>;
export declare const CancelOrderSchema: z.ZodObject<
  {
    cancelledReason: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    cancelledReason: string;
  },
  {
    cancelledReason: string;
  }
>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
export declare const ConfirmFeasibilitySchema: z.ZodObject<
  {
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    notes?: string | undefined;
  },
  {
    notes?: string | undefined;
  }
>;
export type ConfirmFeasibilityInput = z.infer<typeof ConfirmFeasibilitySchema>;
export declare const ApproveOrderSchema: z.ZodObject<
  {
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    notes?: string | undefined;
  },
  {
    notes?: string | undefined;
  }
>;
export type ApproveOrderInput = z.infer<typeof ApproveOrderSchema>;
export declare const DecideApprovalSchema: z.ZodEffects<
  z.ZodObject<
    {
      decision: z.ZodEnum<['approved', 'rejected', 'deferred']>;
      notes: z.ZodOptional<z.ZodString>;
    },
    'strip',
    z.ZodTypeAny,
    {
      decision: 'approved' | 'rejected' | 'deferred';
      notes?: string | undefined;
    },
    {
      decision: 'approved' | 'rejected' | 'deferred';
      notes?: string | undefined;
    }
  >,
  {
    decision: 'approved' | 'rejected' | 'deferred';
    notes?: string | undefined;
  },
  {
    decision: 'approved' | 'rejected' | 'deferred';
    notes?: string | undefined;
  }
>;
export type DecideApprovalInput = z.infer<typeof DecideApprovalSchema>;
export declare const ListServicesSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortDir: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>;
  } & {
    state: z.ZodOptional<z.ZodString>;
    serviceType: z.ZodOptional<z.ZodString>;
    orgId: z.ZodOptional<z.ZodString>;
    isTemporary: z.ZodOptional<z.ZodBoolean>;
    q: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
    sortDir: 'asc' | 'desc';
    sortBy?: string | undefined;
    q?: string | undefined;
    state?: string | undefined;
    serviceType?: string | undefined;
    isTemporary?: boolean | undefined;
    orgId?: string | undefined;
  },
  {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortDir?: 'asc' | 'desc' | undefined;
    q?: string | undefined;
    state?: string | undefined;
    serviceType?: string | undefined;
    isTemporary?: boolean | undefined;
    orgId?: string | undefined;
  }
>;
export type ListServicesInput = z.infer<typeof ListServicesSchema>;
export declare const DisconnectServiceSchema: z.ZodObject<
  {
    reason: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    reason: string;
  },
  {
    reason: string;
  }
>;
export type DisconnectServiceInput = z.infer<typeof DisconnectServiceSchema>;
export declare const SuspendServiceSchema: z.ZodObject<
  {
    reason: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    reason: string;
  },
  {
    reason: string;
  }
>;
export type SuspendServiceInput = z.infer<typeof SuspendServiceSchema>;
export declare const ExtendTemporaryServiceSchema: z.ZodObject<
  {
    newExpiresAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    newExpiresAt: string;
    reason?: string | undefined;
  },
  {
    newExpiresAt: string;
    reason?: string | undefined;
  }
>;
export type ExtendTemporaryServiceInput = z.infer<typeof ExtendTemporaryServiceSchema>;
export declare const CreateCablePathSchema: z.ZodObject<
  {
    pathRole: z.ZodDefault<z.ZodEnum<['primary', 'diverse']>>;
    segments: z.ZodArray<
      z.ZodObject<
        {
          sequence: z.ZodNumber;
          fromPortId: z.ZodString;
          toPortId: z.ZodString;
          segmentType: z.ZodEnum<['patch', 'trunk', 'jumper', 'demarc_extension']>;
          physicalCableLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          physicalCableLength: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          sequence: number;
          fromPortId: string;
          toPortId: string;
          segmentType: 'patch' | 'trunk' | 'jumper' | 'demarc_extension';
          notes?: string | null | undefined;
          physicalCableLabel?: string | null | undefined;
          physicalCableLength?: number | null | undefined;
        },
        {
          sequence: number;
          fromPortId: string;
          toPortId: string;
          segmentType: 'patch' | 'trunk' | 'jumper' | 'demarc_extension';
          notes?: string | null | undefined;
          physicalCableLabel?: string | null | undefined;
          physicalCableLength?: number | null | undefined;
        }
      >,
      'many'
    >;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    pathRole: 'primary' | 'diverse';
    segments: {
      sequence: number;
      fromPortId: string;
      toPortId: string;
      segmentType: 'patch' | 'trunk' | 'jumper' | 'demarc_extension';
      notes?: string | null | undefined;
      physicalCableLabel?: string | null | undefined;
      physicalCableLength?: number | null | undefined;
    }[];
    notes?: string | undefined;
  },
  {
    segments: {
      sequence: number;
      fromPortId: string;
      toPortId: string;
      segmentType: 'patch' | 'trunk' | 'jumper' | 'demarc_extension';
      notes?: string | null | undefined;
      physicalCableLabel?: string | null | undefined;
      physicalCableLength?: number | null | undefined;
    }[];
    notes?: string | undefined;
    pathRole?: 'primary' | 'diverse' | undefined;
  }
>;
export type CreateCablePathInput = z.infer<typeof CreateCablePathSchema>;
export declare const MarkInstalledSchema: z.ZodObject<
  {
    installedAt: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    installedAt?: string | undefined;
  },
  {
    installedAt?: string | undefined;
  }
>;
export type MarkInstalledInput = z.infer<typeof MarkInstalledSchema>;
export declare const CreateWorkOrderSchema: z.ZodObject<
  {
    serviceId: z.ZodString;
    cablePathId: z.ZodOptional<z.ZodString>;
    woType: z.ZodEnum<['install', 'disconnect', 'reroute', 'repair', 'audit_check']>;
    priority: z.ZodDefault<z.ZodNumber>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    dueBy: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    serviceId: string;
    woType: 'install' | 'disconnect' | 'reroute' | 'repair' | 'audit_check';
    priority: number;
    notes?: string | undefined;
    cablePathId?: string | undefined;
    scheduledAt?: string | undefined;
    dueBy?: string | undefined;
  },
  {
    serviceId: string;
    woType: 'install' | 'disconnect' | 'reroute' | 'repair' | 'audit_check';
    notes?: string | undefined;
    cablePathId?: string | undefined;
    priority?: number | undefined;
    scheduledAt?: string | undefined;
    dueBy?: string | undefined;
  }
>;
export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;
export declare const AssignWorkOrderSchema: z.ZodObject<
  {
    assignedToId: z.ZodString;
    scheduledAt: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    assignedToId: string;
    scheduledAt?: string | undefined;
  },
  {
    assignedToId: string;
    scheduledAt?: string | undefined;
  }
>;
export type AssignWorkOrderInput = z.infer<typeof AssignWorkOrderSchema>;
export declare const ProgressWorkOrderSchema: z.ZodObject<
  {
    techNotes: z.ZodString;
    failureReason: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    techNotes: string;
    failureReason?: string | undefined;
  },
  {
    techNotes: string;
    failureReason?: string | undefined;
  }
>;
export type ProgressWorkOrderInput = z.infer<typeof ProgressWorkOrderSchema>;
export declare const CompleteWorkOrderSchema: z.ZodObject<
  {
    techNotes: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    techNotes: string;
  },
  {
    techNotes: string;
  }
>;
export type CompleteWorkOrderInput = z.infer<typeof CompleteWorkOrderSchema>;
export declare const CancelWorkOrderSchema: z.ZodObject<
  {
    cancellationReason: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    cancellationReason: string;
  },
  {
    cancellationReason: string;
  }
>;
export type CancelWorkOrderInput = z.infer<typeof CancelWorkOrderSchema>;
export declare const ListWorkOrdersSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortDir: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>;
  } & {
    state: z.ZodOptional<z.ZodString>;
    woType: z.ZodOptional<z.ZodString>;
    serviceId: z.ZodOptional<z.ZodString>;
    assignedToId: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodNumber>;
    q: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
    sortDir: 'asc' | 'desc';
    serviceId?: string | undefined;
    sortBy?: string | undefined;
    q?: string | undefined;
    state?: string | undefined;
    woType?: string | undefined;
    priority?: number | undefined;
    assignedToId?: string | undefined;
  },
  {
    serviceId?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortDir?: 'asc' | 'desc' | undefined;
    q?: string | undefined;
    state?: string | undefined;
    woType?: string | undefined;
    priority?: number | undefined;
    assignedToId?: string | undefined;
  }
>;
export type ListWorkOrdersInput = z.infer<typeof ListWorkOrdersSchema>;
