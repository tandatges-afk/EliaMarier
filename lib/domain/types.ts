// 'pending' is a READ-ONLY legacy value. All write validators accept only the three V7 statuses.
export type EventStatus = 'confirmed' | 'done' | 'cancelled' | 'pending';
export type RecordList<T> = Record<string, T> | T[] | null | undefined;
export interface Staff { id: string; name: string; role: string; authUid?: string; active?: boolean; }
export interface Assignment {
  id: string;
  cost: number;
  task: string;
  locType: string;
}
export interface StudioEvent {
  id: string;
  name: string;
  date: string; // local YYYY-MM-DD
  start: string;
  end: string;
  eventType: string;
  status: EventStatus;
  /** Original unsupported Firebase status; never auto-migrate on read. */
  legacyStatus?: string;
  needsStatusReview?: boolean;
  location: string;
  assignments: Assignment[];
  requiredCrew?: Record<string,number>;
  photoServiceType?: string;
  isRuocDau?: boolean;
  startTrai?: string;
  startGai?: string;
  sourcePackageId?: string;
  price: number;
  deposit: number;
  products: { id: string; name: string; mediaType: string }[];
  deliveryCompleted?: boolean;
  completedProductIds?: string[];
}
export interface PayrollPayment { advance: number; paid: number; }
export interface AuditEvent {
  id: string; action: string; message: string; createdAt: number; severity: string;
}
export interface DashboardData {
  month: string;
  staff: Staff[];
  events: StudioEvent[];
  payroll: Record<string, PayrollPayment>;
  audit: AuditEvent[];
  eventLimitReached: boolean;
  generatedAt: string;
}
