/**
 * Domain model for Share2Earn. Mirrors the database model in DESIGN.md §14 so
 * the browser store can be swapped for Postgres/Supabase without reshaping the
 * UI layer.
 */

import type { DataRequest, FamilyGroup, TransferRequest } from "./family";

export type TaskType = "BILL" | "ROAMING" | "PLAN" | "ESIM" | "ONBOARDING";

export type RiskLevel = "GREEN" | "AMBER" | "RED";

/** DESIGN.md §10 — happy path. */
export type RequestStatus =
  | "DRAFT"
  | "SENT"
  | "HELPER_VIEWED"
  | "HELPER_ACCEPTED"
  | "RECOMMENDATION_SENT"
  | "OWNER_REVIEWING"
  | "OWNER_APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  /** DESIGN.md §10 — alternative states. */
  | "DECLINED_BY_HELPER"
  | "DECLINED_BY_OWNER"
  | "EXPIRED"
  | "CANCELLED"
  | "FAILED";

/** Statuses that mean the request is finished and can no longer be acted on. */
export const TERMINAL_STATUSES: RequestStatus[] = [
  "COMPLETED",
  "DECLINED_BY_HELPER",
  "DECLINED_BY_OWNER",
  "EXPIRED",
  "CANCELLED",
  "FAILED",
];

/**
 * Task-scoped capabilities granted to a helper for the lifetime of one request
 * (DESIGN.md §11). Nothing outside this list is ever readable by a helper.
 */
export type Permission =
  | "VIEW_BILL_SUMMARY"
  | "VIEW_BILL_COMPARISON"
  | "EXPLAIN_BILL"
  | "VIEW_ELIGIBLE_ROAMING_OPTIONS"
  | "VIEW_TRAVEL_CONTEXT"
  | "VIEW_CURRENT_PLAN_SUMMARY"
  | "VIEW_ELIGIBLE_PLANS"
  | "VIEW_DEVICE_COMPATIBILITY"
  | "VIEW_ONBOARDING_STEPS"
  | "RECOMMEND_OPTION";

export interface User {
  id: string;
  name: string;
  mobile_number: string;
  email: string;
  avatar_url: string;
  customer_id: string;
  created_at: string;
  /** Prototype-only account colouring used by the avatar component. */
  accent: string;
  account_type: "Postpaid" | "Prepaid";
  plan_name: string;
  plan_price: number;
  data_balance_gb: number;
}

export type RelationshipStatus = "ACTIVE" | "REVOKED";

export interface TrustedRelationship {
  id: string;
  owner_user_id: string;
  trusted_user_id: string;
  relationship_label: string;
  status: RelationshipStatus;
  created_at: string;
}

/** Per-task payload the owner supplies when creating a request. */
export interface RequestContext {
  /** Short human summary rendered at the top of the helper's review screen. */
  headline: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  bill_month?: string;
  bill_previous?: number;
  bill_current?: number;
  bill_lines?: { label: string; previous: number; current: number }[];
  current_plan?: string;
  current_plan_price?: number;
  device?: string;
  note?: string;
}

export interface HelpRequest {
  id: string;
  owner_user_id: string;
  helper_user_id: string;
  task_type: TaskType;
  status: RequestStatus;
  risk_level: RiskLevel;
  permissions: Permission[];
  context_json: RequestContext;
  created_at: string;
  expires_at: string;
  /** Set once the flow reaches COMPLETED; drives the admin conversion metric. */
  completed_at?: string;
  /** Milliseconds between SENT and RECOMMENDATION_SENT, for response-time stats. */
  helper_response_ms?: number;
}

/**
 * The three facts that decide an option, shown as an icon row on the approval
 * screen. Structured rather than parsed out of the feature strings so the row
 * stays predictable in both languages.
 */
export interface OptionHighlight {
  icon: "data" | "social" | "time" | "calls" | "save";
  title: string;
  caption: string;
}

export interface TaskOption {
  id: string;
  help_request_id: string;
  title: string;
  subtitle: string;
  price: number;
  /**
   * Short tile shown on the left of the option card — "3 DAY", "70GB". Gives
   * the card a scannable anchor before any reading happens.
   */
  badge?: string;
  /**
   * Human-readable selling points, e.g. "3GB high speed data". Rendered as a
   * bullet list; `metadata_json` stays the machine-readable record.
   */
  features: string[];
  /** Up to three; omitted when an option has no numbers worth surfacing. */
  highlights?: OptionHighlight[];
  metadata_json: Record<string, string | number | boolean>;
  recommended: boolean;
}

export interface Recommendation {
  id: string;
  help_request_id: string;
  helper_user_id: string;
  selected_option_id: string;
  message: string;
  created_at: string;
}

export type NotificationType =
  | "HELP_REQUEST_CREATED"
  | "RECOMMENDATION_SENT"
  | "OWNER_APPROVED"
  | "OWNER_REJECTED"
  | "HELPER_DECLINED"
  | "TASK_COMPLETED"
  | "TRANSFER_APPROVAL_REQUESTED"
  | "TRANSFER_APPROVED"
  | "TRANSFER_DECLINED"
  | "TRANSFER_COMPLETED"
  | "DATA_REQUESTED"
  | "DATA_APPROVED"
  | "DATA_DECLINED";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  help_request_id: string;
  /** Set instead of help_request_id when the notification is about a transfer. */
  transfer_id?: string;
  read: boolean;
  created_at: string;
}

export type RewardType = "DATA_MB" | "POINTS";

export interface Reward {
  id: string;
  user_id: string;
  help_request_id: string;
  reward_type: RewardType;
  reward_value: number;
  status: "ISSUED" | "BLOCKED_CAP" | "BLOCKED_DUPLICATE";
  created_at: string;
}

export interface HelperProgress {
  user_id: string;
  successful_assists: number;
  xp: number;
  level: number;
}

export interface AuditEntry {
  id: string;
  actor_user_id: string;
  help_request_id: string;
  event: string;
  detail: string;
  created_at: string;
}

/** DESIGN.md §23 — every event carries the same four fields. */
export interface TrackedEvent {
  id: string;
  name: string;
  user_id: string;
  help_request_id: string | null;
  task_type: TaskType | null;
  timestamp: string;
}

/** The single serialisable blob the browser store persists. */
export interface Database {
  version: number;
  users: User[];
  /** Family Mobility — see lib/family.ts for the domain rules. */
  family_groups: FamilyGroup[];
  transfer_requests: TransferRequest[];
  data_requests: DataRequest[];
  trusted_relationships: TrustedRelationship[];
  help_requests: HelpRequest[];
  task_options: TaskOption[];
  recommendations: Recommendation[];
  notifications: AppNotification[];
  rewards: Reward[];
  helper_progress: HelperProgress[];
  audit_log: AuditEntry[];
  events: TrackedEvent[];
}
