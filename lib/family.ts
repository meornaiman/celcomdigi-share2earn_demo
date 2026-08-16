/**
 * Family Mobility, powered by Adaptive Identity.
 *
 * The customer-facing half is a lifecycle move: a supplementary line leaves the
 * family account and becomes its own CelcomDigi account, keeping its number.
 * The security half decides how much proof that move needs — reusing trust the
 * customer already established, and stepping up only where the action itself
 * adds risk.
 */

/* ------------------------------------------------------------------ */
/* Assurance                                                           */
/* ------------------------------------------------------------------ */

/**
 * Three levels, deliberately named for what they mean to a customer rather
 * than for an assurance standard — this is the line a boardroom remembers.
 *
 *   ROUTINE  → don't interrupt me
 *   CHANGE   → confirm it's me
 *   OWNERSHIP→ prove it's me
 */
export type AssuranceLevel = "ROUTINE" | "CHANGE" | "OWNERSHIP";

export interface AssuranceDefinition {
  level: AssuranceLevel;
  /** 1, 2, 3 — shown as the rung number on the ladder. */
  rung: number;
  name: string;
  promise: string;
  /** What the customer is doing at this level. */
  examples: string[];
  /** What the system asks for in return. */
  checks: string[];
}

export const ASSURANCE: Record<AssuranceLevel, AssuranceDefinition> = {
  ROUTINE: {
    level: "ROUTINE",
    rung: 1,
    name: "Routine",
    promise: "Don't interrupt me",
    examples: [
      "View usage",
      "Browse plans",
      "Check a bill",
      "View rewards",
      "Compare add-ons",
    ],
    checks: ["Existing signed-in session", "Trusted device"],
  },
  CHANGE: {
    level: "CHANGE",
    rung: 2,
    name: "Account change",
    promise: "Confirm it's me",
    examples: [
      "Change plan",
      "Enable auto-billing",
      "Buy an add-on",
      "Invite a family member",
    ],
    checks: ["Face ID or fingerprint", "One-time code", "Device authentication"],
  },
  OWNERSHIP: {
    level: "OWNERSHIP",
    rung: 3,
    name: "Identity or ownership",
    promise: "Prove it's me",
    examples: [
      "Supplementary to independent",
      "Account ownership transfer",
      "Sensitive account recovery",
      "High-risk SIM or eSIM replacement",
    ],
    checks: [
      "Existing verified identity",
      "Trusted device status",
      "Biometric or liveness",
      "Account eligibility",
      "Current owner consent",
      "Full eKYC only where required",
    ],
  },
};

export const ASSURANCE_ORDER: AssuranceLevel[] = ["ROUTINE", "CHANGE", "OWNERSHIP"];

/* ------------------------------------------------------------------ */
/* Trust signals                                                       */
/* ------------------------------------------------------------------ */

/**
 * What CelcomDigi already knows, established before this journey started. The
 * point of the Identity Check screen is that these are reused rather than
 * re-collected.
 */
export interface TrustSignal {
  id: string;
  label: string;
  detail: string;
  /** Established signals are reused; the pending one is the single step-up. */
  state: "ESTABLISHED" | "REQUIRED";
}

export const TRUST_SIGNALS: TrustSignal[] = [
  {
    id: "mobile",
    label: "Mobile number verified",
    detail: "Verified on this line and still active",
    state: "ESTABLISHED",
  },
  {
    id: "identity",
    label: "CelcomDigi identity previously verified",
    detail: "Documents checked when the line was registered",
    state: "ESTABLISHED",
  },
  {
    id: "device",
    label: "Trusted device recognised",
    detail: "This phone has been signed in for over a year",
    state: "ESTABLISHED",
  },
  {
    id: "biometric",
    label: "Biometric confirmation",
    detail: "Needed because this changes who owns the account",
    state: "REQUIRED",
  },
];

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

/**
 * The exception states from the brief. The prototype can be switched into any
 * of them from the presenter toolbar, because how a concept handles the
 * unhappy path is the part a board actually questions.
 */
export type EligibilityOutcome =
  | "ELIGIBLE"
  | "ACTIVE_CONTRACT"
  | "OUTSTANDING_BALANCE"
  | "IDENTITY_CONFIDENCE"
  | "NOT_DIGITAL";

export interface EligibilityCase {
  outcome: EligibilityOutcome;
  title: string;
  body: string;
  cta: string;
  /** A blocked case never dead-ends; it always names the way forward. */
  blocks: boolean;
  /** Extra routes offered when the digital path alone cannot finish the job. */
  alternatives?: string[];
}

export const ELIGIBILITY: Record<EligibilityOutcome, EligibilityCase> = {
  ELIGIBLE: {
    outcome: "ELIGIBLE",
    title: "This line can move",
    body: "No contract, no outstanding balance, and your identity is already verified.",
    cta: "Continue",
    blocks: false,
  },
  ACTIVE_CONTRACT: {
    outcome: "ACTIVE_CONTRACT",
    title: "We found an active contract on this line",
    body: "This line has 7 months left on a device contract. The contract moves with the line or can be settled first.",
    cta: "Review contract",
    blocks: true,
  },
  OUTSTANDING_BALANCE: {
    outcome: "OUTSTANDING_BALANCE",
    title: "An outstanding balance needs attention",
    body: "RM128.40 is due on the family account before this transfer can continue.",
    cta: "View balance",
    blocks: true,
  },
  IDENTITY_CONFIDENCE: {
    outcome: "IDENTITY_CONFIDENCE",
    title: "We need one more identity check",
    body: "Some of what we hold is out of date, so this transfer needs full verification rather than a quick confirmation.",
    cta: "Continue verification",
    blocks: true,
  },
  NOT_DIGITAL: {
    outcome: "NOT_DIGITAL",
    title: "This transfer needs additional assistance",
    body: "We can prepare everything now and finish it with a person. Your progress is saved.",
    cta: "Prepare my transfer",
    blocks: true,
    alternatives: [
      "See the documents you'll need",
      "Book a store appointment",
      "Talk to support",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Transfer                                                            */
/* ------------------------------------------------------------------ */

/** The lifecycle of one supplementary-to-independent move. */
export type TransferStatus =
  | "NOT_STARTED"
  | "ELIGIBILITY_CHECKED"
  | "IDENTITY_CONFIRMED"
  | "ACCOUNT_CONFIGURED"
  | "AWAITING_PRINCIPAL"
  | "PRINCIPAL_APPROVED"
  | "COMPLETED"
  | "PRINCIPAL_DECLINED"
  | "BLOCKED";

export interface TransferRequest {
  id: string;
  /** The supplementary user becoming independent. */
  member_user_id: string;
  /** The current family account owner whose consent is required. */
  principal_user_id: string;
  msisdn: string;
  status: TransferStatus;
  eligibility: EligibilityOutcome;
  /** Plan the member picked for their own account. */
  chosen_plan_id?: string;
  payment_method?: string;
  /** Signals reused at the identity step, recorded for the audit trail. */
  reused_signals: string[];
  stepped_up_with?: string;
  created_at: string;
  completed_at?: string;
}

export interface FamilyMember {
  user_id: string;
  msisdn: string;
  role: "PRINCIPAL" | "SUPPLEMENTARY";
  plan_name: string;
  /** What this line contributes to the family bill each month. */
  bill_contribution: number;
  data_used_gb: number;
  data_quota_gb: number;
  /** This line's slice of the shared family pool. */
  data_limit_gb: number;
  /** The principal can stop a line drawing from the pool without removing it. */
  data_paused?: boolean;
}

export interface FamilyGroup {
  id: string;
  principal_user_id: string;
  members: FamilyMember[];
  monthly_total: number;
  /** Total data the family plan provides each month, shared across the lines. */
  shared_pool_gb: number;
}

/* ------------------------------------------------------------------ */
/* Data sharing                                                        */
/* ------------------------------------------------------------------ */

/**
 * A supplementary line asking the principal for a bigger slice of the pool.
 *
 * Deliberately sits at the CHANGE rung, not OWNERSHIP: giving a family member
 * more data is a commercial change, so it asks the owner to confirm it's them
 * and nothing more. Contrasting this with the transfer journey is how the demo
 * shows that assurance tracks the action rather than the screen.
 */
export type DataRequestStatus = "PENDING" | "APPROVED" | "DECLINED";

export interface DataRequest {
  id: string;
  member_user_id: string;
  principal_user_id: string;
  requested_gb: number;
  reason: string;
  status: DataRequestStatus;
  created_at: string;
  decided_at?: string;
}

/** Amounts offered when asking for more, so nobody types a number. */
export const DATA_TOPUP_STEPS = [5, 10, 20];

export const DATA_REQUEST_REASONS = [
  "Working from home this month",
  "Travelling and streaming more",
  "Ran out before the cycle ends",
  "Studying online",
];

/** Sum of what every line is allowed to draw. */
export function allocatedGb(group: FamilyGroup): number {
  return group.members.reduce((sum, m) => sum + m.data_limit_gb, 0);
}

/** Pool left to hand out. Never negative, even if the principal over-allocates. */
export function unallocatedGb(group: FamilyGroup): number {
  return Math.max(0, group.shared_pool_gb - allocatedGb(group));
}

export function usedGb(group: FamilyGroup): number {
  return group.members.reduce((sum, m) => sum + m.data_used_gb, 0);
}

/* ------------------------------------------------------------------ */
/* Plans offered on the new independent account                        */
/* ------------------------------------------------------------------ */

export interface IndependentPlan {
  id: string;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  recommended?: boolean;
}

export const INDEPENDENT_PLANS: IndependentPlan[] = [
  {
    id: "plan_80",
    name: "Postpaid 5G 80",
    price: 80,
    tagline: "Best for everyday use",
    features: ["100GB 5G data", "Unlimited calls and SMS", "20GB hotspot"],
    recommended: true,
  },
  {
    id: "plan_100",
    name: "Postpaid 5G 100",
    price: 100,
    tagline: "More data and benefits",
    features: ["Unlimited 5G data", "Unlimited calls and SMS", "40GB hotspot"],
  },
];

export const PAYMENT_METHODS = [
  { id: "card", label: "Debit or credit card", detail: "Visa, Mastercard" },
  { id: "fpx", label: "Online banking", detail: "FPX" },
  { id: "wallet", label: "Digital wallet", detail: "Touch 'n Go, GrabPay" },
];

/** The one sentence the demo is built to land (brief §19). */
export const DEMO_MESSAGE =
  "Don't make customers leave CelcomDigi just because they're ready to leave the family account.";

export const CUSTOMER_LINE = "Same number. Your account. Your next chapter.";
