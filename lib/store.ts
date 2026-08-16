"use client";

import { DB_VERSION, seedDatabase } from "./seed";
import { TASKS, buildOptions } from "./tasks";
import { INDEPENDENT_PLANS, allocatedGb } from "./family";
import type { DataRequest, EligibilityOutcome, TransferRequest } from "./family";
import type {
  AppNotification,
  AuditEntry,
  Database,
  HelpRequest,
  NotificationType,
  Recommendation,
  RequestContext,
  Reward,
  RequestStatus,
  TaskOption,
  TaskType,
  TrackedEvent,
  TrustedRelationship,
  User,
} from "./types";
import { TERMINAL_STATUSES } from "./types";

const STORAGE_KEY = "s2e.db.v1";
const CHANNEL_NAME = "s2e.sync";

/** Requests go stale after a day (DESIGN.md §24 — request expiry). */
const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

/** DESIGN.md §21 anti-abuse — at most this many rewarded tasks per month. */
export const MONTHLY_REWARD_CAP = 8;

export const XP_PER_LEVEL = 1000;

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

const isBrowser = typeof window !== "undefined";

/**
 * Snapshot handed to React. It is replaced (never mutated) on every write so
 * useSyncExternalStore sees a new reference exactly when something changed.
 */
let snapshot: Database = seedDatabase();
const serverSnapshot: Database = seedDatabase();

const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let initialised = false;

/**
 * The exact string currently in storage. Parsing is skipped when it has not
 * changed, which keeps every nested object identity stable across reads — React
 * effects keyed on a record (a user, a request) must not see a new object after
 * an unrelated write, or they re-fire and loop.
 */
let lastRaw: string | null = null;

function readFromStorage(): Database {
  if (!isBrowser) return seedDatabase();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDatabase();
    if (raw === lastRaw) return snapshot;
    const parsed = JSON.parse(raw) as Database;
    // A schema bump invalidates old demo data rather than trying to migrate it.
    if (parsed?.version !== DB_VERSION) return seedDatabase();
    lastRaw = raw;
    return parsed;
  } catch {
    return seedDatabase();
  }
}

function writeToStorage(db: Database) {
  if (!isBrowser) return;
  try {
    const raw = JSON.stringify(db);
    lastRaw = raw;
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Storage full or blocked (private mode): the in-memory snapshot still
    // works for the current session, so the demo keeps running.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/**
 * Pulls the latest state written by another tab or iframe. Panels in /demo run
 * in the same origin, so BroadcastChannel keeps them in sync in real time and
 * the storage event covers browsers where the channel is unavailable.
 */
function refreshFromStorage() {
  snapshot = readFromStorage();
  emit();
}

function ensureInit() {
  if (initialised || !isBrowser) return;
  initialised = true;
  snapshot = readFromStorage();
  writeToStorage(snapshot);

  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e: MessageEvent) => {
      if (e.data?.type === "db-changed") refreshFromStorage();
    };
  }

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) refreshFromStorage();
  });
}

export function subscribe(listener: () => void): () => void {
  ensureInit();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Database {
  return snapshot;
}

export function getServerSnapshot(): Database {
  return serverSnapshot;
}

/**
 * Applies a change. The current state is re-read from storage first so a write
 * from one demo panel never clobbers a write that just landed from the other.
 */
function mutate<T>(fn: (db: Database) => T): T {
  ensureInit();
  const db: Database = isBrowser ? readFromStorage() : snapshot;
  const result = fn(db);
  snapshot = { ...db };
  writeToStorage(snapshot);
  emit();
  channel?.postMessage({ type: "db-changed" });
  return result;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  const rand =
    isBrowser && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${idCounter}`;
  return `${prefix}_${rand}${idCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

function nextRequestId(db: Database): string {
  return `REQ-${10001 + db.help_requests.length}`;
}

function log(
  db: Database,
  actor_user_id: string,
  help_request_id: string,
  event: string,
  detail: string
) {
  const entry: AuditEntry = {
    id: uid("aud"),
    actor_user_id,
    help_request_id,
    event,
    detail,
    created_at: now(),
  };
  db.audit_log.unshift(entry);
}

function track(
  db: Database,
  name: string,
  user_id: string,
  help_request_id: string | null,
  task_type: TaskType | null
) {
  const evt: TrackedEvent = {
    id: uid("evt"),
    name,
    user_id,
    help_request_id,
    task_type,
    timestamp: now(),
  };
  db.events.unshift(evt);
}

function notify(
  db: Database,
  user_id: string,
  type: NotificationType,
  title: string,
  body: string,
  help_request_id: string
) {
  const n: AppNotification = {
    id: uid("ntf"),
    user_id,
    type,
    title,
    body,
    help_request_id,
    read: false,
    created_at: now(),
  };
  db.notifications.unshift(n);
}

function setStatus(
  db: Database,
  req: HelpRequest,
  status: RequestStatus,
  actor: string,
  detail: string
) {
  req.status = status;
  log(db, actor, req.id, `STATUS_${status}`, detail);
}

/** Flips anything past its expiry to EXPIRED. Called before every read-heavy view. */
function expireStale(db: Database): boolean {
  const t = Date.now();
  let changed = false;
  for (const req of db.help_requests) {
    if (TERMINAL_STATUSES.includes(req.status)) continue;
    if (new Date(req.expires_at).getTime() < t) {
      setStatus(db, req, "EXPIRED", "system", "Request passed its expiry window");
      changed = true;
    }
  }
  return changed;
}

export function runExpirySweep() {
  ensureInit();
  const db = isBrowser ? readFromStorage() : snapshot;
  if (expireStale(db)) {
    snapshot = { ...db };
    writeToStorage(snapshot);
    emit();
    channel?.postMessage({ type: "db-changed" });
  }
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export const selectUser = (db: Database, id: string | null) =>
  db.users.find((u) => u.id === id) ?? null;

export const selectUserByMobile = (db: Database, mobile: string) => {
  const digits = mobile.replace(/\D/g, "");
  return db.users.find((u) => u.mobile_number.replace(/\D/g, "") === digits) ?? null;
};

export const selectRequest = (db: Database, id: string | null) =>
  db.help_requests.find((r) => r.id === id) ?? null;

export const selectOptions = (db: Database, requestId: string): TaskOption[] =>
  db.task_options.filter((o) => o.help_request_id === requestId);

export const selectRecommendation = (
  db: Database,
  requestId: string
): Recommendation | null =>
  db.recommendations.find((r) => r.help_request_id === requestId) ?? null;

/** Active trusted contacts an owner may send a request to. */
export const selectHelpers = (db: Database, ownerId: string) =>
  db.trusted_relationships
    .filter((r) => r.owner_user_id === ownerId && r.status === "ACTIVE")
    .map((r) => ({ relationship: r, user: selectUser(db, r.trusted_user_id) }))
    .filter((x): x is { relationship: TrustedRelationship; user: User } => !!x.user);

export const selectRelationshipLabel = (
  db: Database,
  ownerId: string,
  helperId: string
) =>
  db.trusted_relationships.find(
    (r) => r.owner_user_id === ownerId && r.trusted_user_id === helperId
  )?.relationship_label ?? "Trusted contact";

/** Requests where the user is the account owner, newest first. */
export const selectRequestsAsOwner = (db: Database, userId: string) =>
  db.help_requests
    .filter((r) => r.owner_user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

/** Requests where the user is the helper, newest first. */
export const selectRequestsAsHelper = (db: Database, userId: string) =>
  db.help_requests
    .filter((r) => r.helper_user_id === userId && r.status !== "DRAFT")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

export const selectNotifications = (db: Database, userId: string) =>
  db.notifications.filter((n) => n.user_id === userId);

export const selectUnreadCount = (db: Database, userId: string) =>
  db.notifications.filter((n) => n.user_id === userId && !n.read).length;

export const selectRewards = (db: Database, userId: string) =>
  db.rewards.filter((r) => r.user_id === userId && r.status === "ISSUED");

export const selectProgress = (db: Database, userId: string) =>
  db.helper_progress.find((p) => p.user_id === userId) ?? {
    user_id: userId,
    successful_assists: 0,
    xp: 0,
    level: 1,
  };

export const selectAuditForRequest = (db: Database, requestId: string) =>
  db.audit_log
    .filter((a) => a.help_request_id === requestId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

/** Anything the user still needs to act on, across both roles. */
export function selectActionable(db: Database, userId: string) {
  const asHelper = db.help_requests.filter(
    (r) =>
      r.helper_user_id === userId &&
      ["SENT", "HELPER_VIEWED", "HELPER_ACCEPTED"].includes(r.status)
  );
  const asOwner = db.help_requests.filter(
    (r) =>
      r.owner_user_id === userId &&
      ["RECOMMENDATION_SENT", "OWNER_REVIEWING"].includes(r.status)
  );
  return { asHelper, asOwner };
}

export function levelFromXp(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  return { level, intoLevel, toNext: XP_PER_LEVEL - intoLevel };
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export function trackEvent(
  name: string,
  userId: string,
  requestId: string | null = null,
  taskType: TaskType | null = null
) {
  mutate((db) => track(db, name, userId, requestId, taskType));
}

export function markNotificationsRead(userId: string, requestId?: string) {
  mutate((db) => {
    db.notifications.forEach((n) => {
      if (n.user_id !== userId) return;
      if (requestId && n.help_request_id !== requestId) return;
      n.read = true;
    });
  });
}

export interface CreateRequestInput {
  ownerId: string;
  helperId: string;
  taskType: TaskType;
  context: RequestContext;
}

export function createHelpRequest(input: CreateRequestInput): HelpRequest {
  return mutate((db) => {
    const def = TASKS[input.taskType];
    const owner = selectUser(db, input.ownerId);
    const created = now();
    const req: HelpRequest = {
      id: nextRequestId(db),
      owner_user_id: input.ownerId,
      helper_user_id: input.helperId,
      task_type: input.taskType,
      status: "SENT",
      risk_level: def.risk,
      permissions: def.permissions,
      context_json: input.context,
      created_at: created,
      expires_at: new Date(Date.now() + REQUEST_TTL_MS).toISOString(),
    };
    db.help_requests.push(req);

    // Options are generated at request time so the helper only ever sees a set
    // derived from what the owner chose to share.
    buildOptions(input.taskType, input.context).forEach((seed) => {
      const option: TaskOption = {
        ...seed,
        id: uid("opt"),
        help_request_id: req.id,
      };
      db.task_options.push(option);
    });

    log(
      db,
      input.ownerId,
      req.id,
      "REQUEST_CREATED",
      `${def.label} request sent, permissions: ${def.permissions.join(", ")}`
    );
    track(db, "help_request_sent", input.ownerId, req.id, input.taskType);
    notify(
      db,
      input.helperId,
      "HELP_REQUEST_CREATED",
      `${owner?.name ?? "Someone"} needs your help`,
      input.context.headline,
      req.id
    );
    return req;
  });
}

export function markRequestViewed(requestId: string, helperId: string) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req || req.helper_user_id !== helperId) return;
    track(db, "helper_opened_request", helperId, req.id, req.task_type);
    if (req.status !== "SENT") return;
    setStatus(db, req, "HELPER_VIEWED", helperId, "Helper opened the request");
  });
}

export function acceptRequest(requestId: string, helperId: string) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req || req.helper_user_id !== helperId) return;
    if (!["SENT", "HELPER_VIEWED"].includes(req.status)) return;
    setStatus(db, req, "HELPER_ACCEPTED", helperId, "Helper accepted the request");
    track(db, "trusted_help_selected", helperId, req.id, req.task_type);
  });
}

export function declineRequest(requestId: string, helperId: string, reason: string) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req || req.helper_user_id !== helperId) return;
    if (TERMINAL_STATUSES.includes(req.status)) return;
    setStatus(db, req, "DECLINED_BY_HELPER", helperId, reason || "No reason given");
    const helper = selectUser(db, helperId);
    notify(
      db,
      req.owner_user_id,
      "HELPER_DECLINED",
      `${helper?.name ?? "Your helper"} can't help right now`,
      "You can ask someone else you trust.",
      req.id
    );
  });
}

export function sendRecommendation(
  requestId: string,
  helperId: string,
  optionId: string,
  message: string
) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req || req.helper_user_id !== helperId) return;
    if (TERMINAL_STATUSES.includes(req.status)) return;

    db.task_options
      .filter((o) => o.help_request_id === requestId)
      .forEach((o) => (o.recommended = o.id === optionId));

    const existing = db.recommendations.find((r) => r.help_request_id === requestId);
    if (existing) {
      existing.selected_option_id = optionId;
      existing.message = message;
      existing.created_at = now();
    } else {
      db.recommendations.push({
        id: uid("rec"),
        help_request_id: requestId,
        helper_user_id: helperId,
        selected_option_id: optionId,
        message,
        created_at: now(),
      });
    }

    req.helper_response_ms = Date.now() - new Date(req.created_at).getTime();
    setStatus(
      db,
      req,
      "RECOMMENDATION_SENT",
      helperId,
      `Recommended option ${optionId}`
    );
    track(db, "recommendation_sent", helperId, req.id, req.task_type);

    const helper = selectUser(db, helperId);
    const option = db.task_options.find((o) => o.id === optionId);
    notify(
      db,
      req.owner_user_id,
      "RECOMMENDATION_SENT",
      `${helper?.name ?? "Your helper"} has replied`,
      option ? `Suggests ${option.title}` : "A recommendation is ready for you.",
      req.id
    );
  });
}

export function markOwnerReviewing(requestId: string, ownerId: string) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req || req.owner_user_id !== ownerId) return;
    if (req.status !== "RECOMMENDATION_SENT") return;
    setStatus(db, req, "OWNER_REVIEWING", ownerId, "Owner opened the recommendation");
  });
}

export function rejectRecommendation(
  requestId: string,
  ownerId: string,
  mode: "ASK_AGAIN" | "DECLINE"
) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req || req.owner_user_id !== ownerId) return;
    if (TERMINAL_STATUSES.includes(req.status)) return;
    const owner = selectUser(db, ownerId);

    if (mode === "ASK_AGAIN") {
      // The request goes back to the helper rather than ending, so the owner
      // can ask for a different suggestion without starting over.
      setStatus(db, req, "HELPER_ACCEPTED", ownerId, "Owner asked for another option");
      db.task_options
        .filter((o) => o.help_request_id === requestId)
        .forEach((o) => (o.recommended = false));
      db.recommendations = db.recommendations.filter(
        (r) => r.help_request_id !== requestId
      );
      notify(
        db,
        req.helper_user_id,
        "OWNER_REJECTED",
        `${owner?.name ?? "They"} asked for another look`,
        "Have another go at the options.",
        req.id
      );
    } else {
      setStatus(db, req, "DECLINED_BY_OWNER", ownerId, "Owner declined the recommendation");
      notify(
        db,
        req.helper_user_id,
        "OWNER_REJECTED",
        `${owner?.name ?? "They"} declined this time`,
        "No action was taken on the account.",
        req.id
      );
    }
    track(db, "owner_rejected", ownerId, req.id, req.task_type);
  });
}

export function approveRecommendation(requestId: string, ownerId: string) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req || req.owner_user_id !== ownerId) return;
    if (!["RECOMMENDATION_SENT", "OWNER_REVIEWING"].includes(req.status)) return;
    setStatus(db, req, "OWNER_APPROVED", ownerId, "Owner approved the recommendation");
    track(db, "owner_approved", ownerId, req.id, req.task_type);
    notify(
      db,
      req.helper_user_id,
      "OWNER_APPROVED",
      "Recommendation approved",
      "Your suggestion is being applied.",
      req.id
    );
    // Approval hands over to execution; completeRequest finishes the job.
    setStatus(db, req, "EXECUTING", "system", "Applying the approved action");
  });
}

/** Issues a reward unless an anti-abuse rule blocks it (DESIGN.md §21). */
function issueReward(db: Database, req: HelpRequest, userId: string): Reward {
  const def = TASKS[req.task_type];
  const month = new Date().toISOString().slice(0, 7);

  const alreadyForTask = db.rewards.some(
    (r) => r.user_id === userId && r.help_request_id === req.id && r.status === "ISSUED"
  );
  const issuedThisMonth = db.rewards.filter(
    (r) => r.user_id === userId && r.status === "ISSUED" && r.created_at.startsWith(month)
  ).length;

  let status: Reward["status"] = "ISSUED";
  if (alreadyForTask) status = "BLOCKED_DUPLICATE";
  else if (issuedThisMonth >= MONTHLY_REWARD_CAP) status = "BLOCKED_CAP";

  const reward: Reward = {
    id: uid("rwd"),
    user_id: userId,
    help_request_id: req.id,
    reward_type: def.reward.type,
    reward_value: def.reward.value,
    status,
    created_at: now(),
  };
  db.rewards.unshift(reward);
  log(
    db,
    "system",
    req.id,
    status === "ISSUED" ? "REWARD_ISSUED" : "REWARD_BLOCKED",
    `${userId}: ${def.reward.value} ${def.reward.type}${
      status === "ISSUED" ? "" : ` (${status})`
    }`
  );
  if (status === "ISSUED") track(db, "reward_issued", userId, req.id, req.task_type);
  return reward;
}

export function completeRequest(requestId: string) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req) return;
    if (req.status !== "EXECUTING" && req.status !== "OWNER_APPROVED") return;

    setStatus(db, req, "COMPLETED", "system", "Task executed successfully");
    req.completed_at = now();

    issueReward(db, req, req.owner_user_id);
    issueReward(db, req, req.helper_user_id);

    // Helper progress: AMBER work is weighted above GREEN explanations.
    const progress = db.helper_progress.find((p) => p.user_id === req.helper_user_id);
    const gain = TASKS[req.task_type].risk === "GREEN" ? 100 : 250;
    if (progress) {
      progress.successful_assists += 1;
      progress.xp += gain;
      progress.level = levelFromXp(progress.xp).level;
    } else {
      db.helper_progress.push({
        user_id: req.helper_user_id,
        successful_assists: 1,
        xp: gain,
        level: levelFromXp(gain).level,
      });
    }

    // Applying the approved action to the owner's account, for the demo only.
    const owner = db.users.find((u) => u.id === req.owner_user_id);
    const chosen = db.task_options.find(
      (o) => o.help_request_id === req.id && o.recommended
    );
    if (owner && chosen && req.task_type === "PLAN") {
      owner.plan_name = chosen.title;
      owner.plan_price = chosen.price;
    }

    track(db, "task_completed", req.owner_user_id, req.id, req.task_type);
    [req.owner_user_id, req.helper_user_id].forEach((uid) =>
      notify(
        db,
        uid,
        "TASK_COMPLETED",
        "Share2Earn completed",
        "Your reward has been added.",
        req.id
      )
    );
  });
}

export function cancelRequest(requestId: string, ownerId: string) {
  mutate((db) => {
    const req = selectRequest(db, requestId);
    if (!req || req.owner_user_id !== ownerId) return;
    if (TERMINAL_STATUSES.includes(req.status)) return;
    setStatus(db, req, "CANCELLED", ownerId, "Owner cancelled the request");
  });
}

export function addTrustedHelper(
  ownerId: string,
  helperUserId: string,
  label: string
) {
  mutate((db) => {
    const existing = db.trusted_relationships.find(
      (r) => r.owner_user_id === ownerId && r.trusted_user_id === helperUserId
    );
    if (existing) {
      existing.status = "ACTIVE";
      existing.relationship_label = label;
      return;
    }
    db.trusted_relationships.push({
      id: uid("tr"),
      owner_user_id: ownerId,
      trusted_user_id: helperUserId,
      relationship_label: label,
      status: "ACTIVE",
      created_at: now(),
    });
  });
}

/** Revocation takes effect immediately (DESIGN.md §24). */
export function revokeTrustedHelper(relationshipId: string, ownerId: string) {
  mutate((db) => {
    const rel = db.trusted_relationships.find((r) => r.id === relationshipId);
    if (!rel || rel.owner_user_id !== ownerId) return;
    rel.status = "REVOKED";
    // Any in-flight request to that helper loses its permission grant too.
    db.help_requests
      .filter(
        (r) =>
          r.owner_user_id === ownerId &&
          r.helper_user_id === rel.trusted_user_id &&
          !TERMINAL_STATUSES.includes(r.status)
      )
      .forEach((r) =>
        setStatus(db, r, "CANCELLED", ownerId, "Trusted access was revoked")
      );
  });
}

/* ------------------------------------------------------------------ */
/* Family Mobility                                                     */
/* ------------------------------------------------------------------ */

export const selectFamilyGroup = (db: Database, userId: string) =>
  db.family_groups.find((g) => g.members.some((m) => m.user_id === userId)) ?? null;

export const selectFamilyMember = (db: Database, userId: string) =>
  selectFamilyGroup(db, userId)?.members.find((m) => m.user_id === userId) ?? null;

export const selectTransfer = (db: Database, id: string | null) =>
  db.transfer_requests.find((t) => t.id === id) ?? null;

/** The live transfer for a member, if one is in flight or finished. */
export const selectTransferForMember = (db: Database, userId: string) =>
  db.transfer_requests.find((t) => t.member_user_id === userId) ?? null;

/** Transfers waiting on this principal's consent. */
export const selectTransfersAwaiting = (db: Database, principalId: string) =>
  db.transfer_requests.filter(
    (t) => t.principal_user_id === principalId && t.status === "AWAITING_PRINCIPAL"
  );

function notifyTransfer(
  db: Database,
  user_id: string,
  type: NotificationType,
  title: string,
  body: string,
  transfer_id: string
) {
  db.notifications.unshift({
    id: uid("ntf"),
    user_id,
    type,
    title,
    body,
    help_request_id: "",
    transfer_id,
    read: false,
    created_at: now(),
  });
}

function logTransfer(
  db: Database,
  actor: string,
  transferId: string,
  event: string,
  detail: string
) {
  db.audit_log.unshift({
    id: uid("aud"),
    actor_user_id: actor,
    help_request_id: transferId,
    event,
    detail,
    created_at: now(),
  });
}

/**
 * Opens a transfer and records the eligibility outcome. The outcome is passed
 * in rather than computed so the presenter can demonstrate the exception
 * states, which is where the concept's handling of the unhappy path shows.
 */
export function startTransfer(
  memberId: string,
  eligibility: EligibilityOutcome = "ELIGIBLE"
): TransferRequest | null {
  return mutate((db) => {
    const group = selectFamilyGroup(db, memberId);
    const member = group?.members.find((m) => m.user_id === memberId);
    if (!group || !member) return null;

    // One transfer per member; restarting replaces the previous attempt.
    db.transfer_requests = db.transfer_requests.filter(
      (t) => t.member_user_id !== memberId
    );

    const transfer: TransferRequest = {
      id: `TRF-${20001 + db.transfer_requests.length}`,
      member_user_id: memberId,
      principal_user_id: group.principal_user_id,
      msisdn: member.msisdn,
      status: eligibility === "ELIGIBLE" ? "ELIGIBILITY_CHECKED" : "BLOCKED",
      eligibility,
      reused_signals: [],
      created_at: now(),
    };
    db.transfer_requests.push(transfer);

    logTransfer(
      db,
      memberId,
      transfer.id,
      "TRANSFER_STARTED",
      `Eligibility: ${eligibility}`
    );
    track(db, "family_transfer_started", memberId, transfer.id, null);
    return transfer;
  });
}

/** Presenter override so any exception state can be shown on demand. */
export function setTransferEligibility(id: string, outcome: EligibilityOutcome) {
  mutate((db) => {
    const t = selectTransfer(db, id);
    if (!t) return;
    t.eligibility = outcome;
    t.status = outcome === "ELIGIBLE" ? "ELIGIBILITY_CHECKED" : "BLOCKED";
    logTransfer(db, "system", t.id, "ELIGIBILITY_SET", outcome);
  });
}

/**
 * The adaptive-identity moment: the signals already held are recorded as
 * reused, and exactly one step-up is added because ownership is changing.
 */
export function confirmTransferIdentity(
  id: string,
  method: string,
  reusedSignals: string[]
) {
  mutate((db) => {
    const t = selectTransfer(db, id);
    if (!t || t.status === "BLOCKED") return;
    t.status = "IDENTITY_CONFIRMED";
    t.reused_signals = reusedSignals;
    t.stepped_up_with = method;
    logTransfer(
      db,
      t.member_user_id,
      t.id,
      "IDENTITY_CONFIRMED",
      `Reused: ${reusedSignals.join(", ")} · stepped up with ${method}`
    );
    track(db, "adaptive_identity_step_up", t.member_user_id, t.id, null);
  });
}

export function configureTransfer(id: string, planId: string, paymentMethod: string) {
  mutate((db) => {
    const t = selectTransfer(db, id);
    if (!t) return;
    t.chosen_plan_id = planId;
    t.payment_method = paymentMethod;
    t.status = "ACCOUNT_CONFIGURED";
    logTransfer(db, t.member_user_id, t.id, "ACCOUNT_CONFIGURED", `${planId} · ${paymentMethod}`);
  });
}

/** Consent is never assumed: the principal is asked, explicitly. */
export function requestPrincipalApproval(id: string) {
  mutate((db) => {
    const t = selectTransfer(db, id);
    if (!t) return;
    t.status = "AWAITING_PRINCIPAL";
    const member = selectUser(db, t.member_user_id);
    logTransfer(db, t.member_user_id, t.id, "APPROVAL_REQUESTED", t.principal_user_id);
    track(db, "transfer_approval_requested", t.member_user_id, t.id, null);
    notifyTransfer(
      db,
      t.principal_user_id,
      "TRANSFER_APPROVAL_REQUESTED",
      `${member?.name ?? "A family member"} wants to become independent`,
      `${t.msisdn} would move to their own account.`,
      t.id
    );
  });
}

export function principalDecide(id: string, principalId: string, approve: boolean) {
  mutate((db) => {
    const t = selectTransfer(db, id);
    if (!t || t.principal_user_id !== principalId) return;
    if (t.status !== "AWAITING_PRINCIPAL") return;

    t.status = approve ? "PRINCIPAL_APPROVED" : "PRINCIPAL_DECLINED";
    logTransfer(
      db,
      principalId,
      t.id,
      approve ? "PRINCIPAL_APPROVED" : "PRINCIPAL_DECLINED",
      `Owner consent ${approve ? "given" : "withheld"}`
    );
    track(db, approve ? "transfer_approved" : "transfer_declined", principalId, t.id, null);
    notifyTransfer(
      db,
      t.member_user_id,
      approve ? "TRANSFER_APPROVED" : "TRANSFER_DECLINED",
      approve ? "Transfer approved" : "Transfer not approved",
      approve
        ? "Setting up your own account now."
        : "The account owner declined this time.",
      t.id
    );
  });
}

/** Applies the move: the line leaves the family group and keeps its number. */
export function completeTransfer(id: string) {
  mutate((db) => {
    const t = selectTransfer(db, id);
    if (!t || t.status !== "PRINCIPAL_APPROVED") return;

    const group = selectFamilyGroup(db, t.member_user_id);
    const member = group?.members.find((m) => m.user_id === t.member_user_id);
    if (group && member) {
      group.members = group.members.filter((m) => m.user_id !== t.member_user_id);
      group.monthly_total = Math.max(
        0,
        group.monthly_total - member.bill_contribution
      );
    }

    const user = selectUser(db, t.member_user_id);
    const plan = INDEPENDENT_PLANS.find((p) => p.id === t.chosen_plan_id);
    if (user && plan) {
      user.plan_name = plan.name;
      user.plan_price = plan.price;
    }

    t.status = "COMPLETED";
    t.completed_at = now();
    logTransfer(db, "system", t.id, "TRANSFER_COMPLETED", `${t.msisdn} is now independent`);
    track(db, "transfer_completed", t.member_user_id, t.id, null);

    [t.member_user_id, t.principal_user_id].forEach((u) =>
      notifyTransfer(
        db,
        u,
        "TRANSFER_COMPLETED",
        "Transfer completed",
        `${t.msisdn} now has its own CelcomDigi account.`,
        t.id
      )
    );
  });
}

/* ------------------------------------------------------------------ */
/* Family data sharing                                                 */
/* ------------------------------------------------------------------ */

export const selectDataRequest = (db: Database, id: string | null) =>
  db.data_requests.find((r) => r.id === id) ?? null;

export const selectDataRequestsFor = (db: Database, memberId: string) =>
  db.data_requests
    .filter((r) => r.member_user_id === memberId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

/** Requests a principal still has to answer. */
export const selectPendingDataRequests = (db: Database, principalId: string) =>
  db.data_requests.filter(
    (r) => r.principal_user_id === principalId && r.status === "PENDING"
  );

/**
 * A member asks for a bigger slice of the shared pool. Nothing changes on the
 * account until the principal says yes — the same consent rule the transfer
 * journey follows, at a lower assurance level.
 */
export function requestFamilyData(
  memberId: string,
  gb: number,
  reason: string
): DataRequest | null {
  return mutate((db) => {
    const group = selectFamilyGroup(db, memberId);
    if (!group) return null;

    const request: DataRequest = {
      id: `DAT-${30001 + db.data_requests.length}`,
      member_user_id: memberId,
      principal_user_id: group.principal_user_id,
      requested_gb: gb,
      reason,
      status: "PENDING",
      created_at: now(),
    };
    db.data_requests.push(request);

    const member = selectUser(db, memberId);
    logTransfer(db, memberId, request.id, "DATA_REQUESTED", `${gb}GB — ${reason}`);
    track(db, "family_data_requested", memberId, request.id, null);
    notifyTransfer(
      db,
      group.principal_user_id,
      "DATA_REQUESTED",
      `${member?.name ?? "A family member"} needs more data`,
      `Asking for ${gb}GB — ${reason}`,
      request.id
    );
    return request;
  });
}

export function decideFamilyData(
  id: string,
  principalId: string,
  approve: boolean
) {
  mutate((db) => {
    const request = selectDataRequest(db, id);
    if (!request || request.principal_user_id !== principalId) return;
    if (request.status !== "PENDING") return;

    request.status = approve ? "APPROVED" : "DECLINED";
    request.decided_at = now();

    if (approve) {
      const group = selectFamilyGroup(db, request.member_user_id);
      const member = group?.members.find((m) => m.user_id === request.member_user_id);
      if (group && member) {
        member.data_limit_gb += request.requested_gb;
        // The pool grows with the top-up rather than starving the other lines.
        if (allocatedGb(group) > group.shared_pool_gb) {
          group.shared_pool_gb = allocatedGb(group);
        }
      }
    }

    logTransfer(
      db,
      principalId,
      request.id,
      approve ? "DATA_APPROVED" : "DATA_DECLINED",
      `${request.requested_gb}GB`
    );
    track(db, approve ? "family_data_approved" : "family_data_declined", principalId, request.id, null);
    notifyTransfer(
      db,
      request.member_user_id,
      approve ? "DATA_APPROVED" : "DATA_DECLINED",
      approve ? "More data added" : "Data request declined",
      approve
        ? `${request.requested_gb}GB added to your line.`
        : "Your allowance is unchanged.",
      request.id
    );
  });
}

/** Principal adjusts a line's slice directly. */
export function setMemberDataLimit(
  principalId: string,
  memberId: string,
  gb: number
) {
  mutate((db) => {
    const group = selectFamilyGroup(db, principalId);
    if (!group || group.principal_user_id !== principalId) return;
    const member = group.members.find((m) => m.user_id === memberId);
    if (!member) return;
    const next = Math.max(0, Math.round(gb));
    if (next === member.data_limit_gb) return;
    logTransfer(
      db,
      principalId,
      group.id,
      "DATA_LIMIT_CHANGED",
      `${memberId}: ${member.data_limit_gb}GB → ${next}GB`
    );
    member.data_limit_gb = next;
    if (allocatedGb(group) > group.shared_pool_gb) {
      group.shared_pool_gb = allocatedGb(group);
    }
  });
}

/** Stops or resumes a line drawing from the pool, without removing the line. */
export function toggleMemberDataPause(principalId: string, memberId: string) {
  mutate((db) => {
    const group = selectFamilyGroup(db, principalId);
    if (!group || group.principal_user_id !== principalId) return;
    const member = group.members.find((m) => m.user_id === memberId);
    if (!member) return;
    member.data_paused = !member.data_paused;
    logTransfer(
      db,
      principalId,
      group.id,
      member.data_paused ? "DATA_PAUSED" : "DATA_RESUMED",
      memberId
    );
  });
}

/** Presenter action: wipes every request, reward and log back to the seed. */
export function resetDemo() {
  mutate((db) => {
    const fresh = seedDatabase();
    db.version = fresh.version;
    db.users = fresh.users;
    db.trusted_relationships = fresh.trusted_relationships;
    db.help_requests = fresh.help_requests;
    db.task_options = fresh.task_options;
    db.recommendations = fresh.recommendations;
    db.notifications = fresh.notifications;
    db.rewards = fresh.rewards;
    db.helper_progress = fresh.helper_progress;
    db.audit_log = fresh.audit_log;
    db.events = fresh.events;
    db.family_groups = fresh.family_groups;
    db.transfer_requests = fresh.transfer_requests;
    db.data_requests = fresh.data_requests;
  });
}
