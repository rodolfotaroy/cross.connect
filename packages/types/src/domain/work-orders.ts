import type { DocumentType, WorkOrderState, WorkOrderType } from '../enums';

export interface WorkOrderDto {
  id: string;
  woNumber: string;
  serviceId: string;
  cablePathId: string | null;
  woType: WorkOrderType;
  state: WorkOrderState;
  assignedToId: string | null;
  assignedToName: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  techNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDto {
  id: string;
  filename: string;
  docType: DocumentType;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string; // presigned S3 URL
  createdAt: string;
}
