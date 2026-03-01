export interface BlobMetadata {
  name: string;
  containerName: string;
  contentLength: number;
  contentType: string;
  lastModified: string;
  metadata?: Record<string, string>;
}

export interface UploadResponse {
  blobName: string;
  containerName: string;
  url: string;
  contentLength: number;
}

export interface Report {
  id: number;
  name: string;
  type: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  parameters?: Record<string, unknown>;
  resultPath?: string;
  errorMessage?: string;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataEntity {
  id: number;
  name: string;
  description?: string;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// Messaging types

export interface Channel {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
}

export interface Message {
  id: number;
  channel: Channel;
  author: string;
  content: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageRequest {
  channelId: number;
  author: string;
  content: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}

// Calendar types

export interface TeamMember {
  id: number;
  name: string;
  username?: string;
  role?: string;
  color: string;
  createdAt: string;
}

export interface Shift {
  id: number;
  teamMember: TeamMember;
  title?: string;
  shiftDate: string;
  startTime?: string;
  endTime?: string;
  shiftType: "DAY" | "SWING" | "NIGHT" | "ONCALL" | "OFF";
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ShiftEntry {
  teamMemberName: string;
  shiftDate: string;
  startTime?: string;
  endTime?: string;
  shiftType: "DAY" | "SWING" | "NIGHT" | "ONCALL" | "OFF";
  title?: string;
  notes?: string;
}

export interface ScheduleUploadRequest {
  weekOf: string;
  shifts: ShiftEntry[];
}
