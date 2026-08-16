import type {
  Permission,
  RequestContext,
  RewardType,
  RiskLevel,
  TaskOption,
  TaskType,
} from "./types";

export type OptionSeed = Omit<TaskOption, "id" | "help_request_id">;

export interface TaskDefinition {
  type: TaskType;
  label: string;
  /** Question the owner is really asking, shown on the task tile. */
  blurb: string;
  risk: RiskLevel;
  permissions: Permission[];
  /** Copy shown to the helper so the boundary of their role is unambiguous. */
  helperBoundary: string;
  /** Wording of the helper's primary action. */
  helperCta: string;
  reward: { type: RewardType; value: number };
  /** Commercial value booked when the task completes, for the admin dashboard. */
  conversionValue: number;
}

/**
 * DESIGN.md §12 — GREEN needs no purchase, AMBER always needs owner approval,
 * RED is out of scope for the MVP and is never offered as a task.
 */
export const TASKS: Record<TaskType, TaskDefinition> = {
  BILL: {
    type: "BILL",
    label: "Bill",
    blurb: "Why is my bill higher?",
    risk: "GREEN",
    permissions: ["VIEW_BILL_SUMMARY", "VIEW_BILL_COMPARISON", "EXPLAIN_BILL"],
    helperBoundary: "You are explaining, not changing anything on the account.",
    helperCta: "Send explanation",
    reward: { type: "POINTS", value: 100 },
    conversionValue: 0,
  },
  ROAMING: {
    type: "ROAMING",
    label: "Roaming",
    blurb: "Which pass suits my trip?",
    risk: "AMBER",
    permissions: [
      "VIEW_TRAVEL_CONTEXT",
      "VIEW_ELIGIBLE_ROAMING_OPTIONS",
      "RECOMMEND_OPTION",
    ],
    helperBoundary: "You are recommending, not purchasing.",
    helperCta: "Recommend to",
    reward: { type: "DATA_MB", value: 500 },
    conversionValue: 38,
  },
  PLAN: {
    type: "PLAN",
    label: "Plan",
    blurb: "Is there a better plan for me?",
    risk: "AMBER",
    permissions: [
      "VIEW_CURRENT_PLAN_SUMMARY",
      "VIEW_ELIGIBLE_PLANS",
      "RECOMMEND_OPTION",
    ],
    helperBoundary: "You are recommending, not changing the plan.",
    helperCta: "Recommend to",
    reward: { type: "POINTS", value: 500 },
    conversionValue: 65,
  },
  ESIM: {
    type: "ESIM",
    label: "eSIM",
    blurb: "Can I switch to eSIM?",
    risk: "AMBER",
    permissions: [
      "VIEW_DEVICE_COMPATIBILITY",
      "VIEW_ONBOARDING_STEPS",
      "RECOMMEND_OPTION",
    ],
    helperBoundary: "You are recommending, not activating the eSIM.",
    helperCta: "Recommend to",
    // DESIGN.md §21 lists rewards for four tasks; eSIM follows the plan-change
    // tier because it carries the same AMBER approval weight.
    reward: { type: "POINTS", value: 500 },
    conversionValue: 0,
  },
  ONBOARDING: {
    type: "ONBOARDING",
    label: "Onboarding",
    blurb: "Help me get set up digitally",
    risk: "AMBER",
    permissions: ["VIEW_ONBOARDING_STEPS", "RECOMMEND_OPTION"],
    helperBoundary:
      "You are guiding only. Identity verification is always done by the new customer.",
    helperCta: "Recommend to",
    reward: { type: "DATA_MB", value: 2048 },
    conversionValue: 45,
  },
};

export const TASK_ORDER: TaskType[] = [
  "BILL",
  "ROAMING",
  "PLAN",
  "ESIM",
  "ONBOARDING",
];

/** Slug used in /task/[type] URLs, kept lowercase for readable links. */
export const taskSlug = (t: TaskType) => t.toLowerCase();

export function taskFromSlug(slug: string): TaskType | null {
  const match = TASK_ORDER.find((t) => taskSlug(t) === slug.toLowerCase());
  return match ?? null;
}

export const DESTINATIONS = [
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
];

export const DEVICES = [
  "iPhone 15",
  "iPhone 13",
  "Samsung Galaxy S24",
  "Samsung Galaxy A55",
  "Google Pixel 8",
];

/**
 * Builds the option set a helper may choose from. Options are derived on the
 * server side of the real product; here they are generated from the same task
 * context the owner submitted so the helper never sees anything the owner did
 * not deliberately share.
 */
export function buildOptions(
  taskType: TaskType,
  ctx: RequestContext
): OptionSeed[] {
  switch (taskType) {
    case "ROAMING": {
      const where = ctx.destination ?? "your destination";
      const pass = (
        days: number,
        gb: number,
        price: number,
        calls: string
      ): OptionSeed => ({
        title: `${days}-Day Pass`,
        subtitle: `${gb}GB data in ${where}`,
        price,
        badge: `${days} DAY`,
        features: [
          `${gb}GB high speed data`,
          "Unlimited social",
          `Valid for ${days * 24} hours`,
          `${calls} of calls`,
        ],
        highlights: [
          { icon: "data", title: `${gb}GB`, caption: "High speed data" },
          { icon: "social", title: "Unlimited", caption: "Social apps" },
          { icon: "time", title: `${days * 24} hours`, caption: "Validity" },
        ],
        metadata_json: { days, data_gb: gb, calls, sms: "Unlimited" },
        recommended: false,
      });
      return [pass(3, 3, 38, "30 min"), pass(7, 6, 68, "60 min"), pass(14, 12, 118, "120 min")];
    }

    case "PLAN": {
      const current = ctx.current_plan_price ?? 65;
      const saving = (price: number) => Math.max(0, current - price);
      const plan = (
        price: number,
        data: string,
        hotspot: string,
        extra: string
      ): OptionSeed => ({
        title: `Postpaid ${price}`,
        subtitle: `${data}, unlimited calls`,
        price,
        badge: data.replace(/\s/g, ""),
        features: [
          `${data} each month`,
          "Unlimited calls and SMS",
          `${hotspot} hotspot`,
          saving(price) > 0 ? `Saves ${formatMoney(saving(price))} a month` : extra,
        ],
        highlights: [
          { icon: "data", title: data, caption: "Each month" },
          { icon: "calls", title: "Unlimited", caption: "Calls and SMS" },
          saving(price) > 0
            ? {
                icon: "save" as const,
                title: formatMoney(saving(price)),
                caption: "Saved monthly",
              }
            : { icon: "social" as const, title: hotspot, caption: "Hotspot" },
        ],
        metadata_json: { saving: saving(price), hotspot },
        recommended: false,
      });
      return [
        plan(40, "30GB", "10GB", "Best value entry plan"),
        plan(65, "70GB", "25GB", "Most popular"),
        plan(100, "Unlimited", "Unlimited", "5G priority access"),
      ];
    }

    case "ESIM": {
      const device = ctx.device ?? "your phone";
      return [
        {
          title: "Switch to eSIM now",
          subtitle: `${device} supports eSIM`,
          price: 0,
          badge: "eSIM",
          features: [
            "Keeps the same number",
            "No SIM card to collect",
            "About 5 minutes of downtime",
          ],
          metadata_json: { downtime: "About 5 minutes", keeps_number: true },
          recommended: false,
        },
        {
          title: "Keep physical SIM",
          subtitle: "Stay as you are",
          price: 0,
          badge: "SIM",
          features: ["Nothing changes", "No downtime", "Switch any time later"],
          metadata_json: { downtime: "None", keeps_number: true },
          recommended: false,
        },
      ];
    }

    case "ONBOARDING": {
      return [
        {
          title: "Start with the app basics",
          subtitle: "Sign in, check balance, pay a bill",
          price: 0,
          badge: "5 MIN",
          features: ["Three short steps", "Covers the everyday tasks"],
          metadata_json: { steps: 3, minutes: 5 },
          recommended: false,
        },
        {
          title: "Set up autopay first",
          subtitle: "Never miss a due date again",
          price: 0,
          badge: "3 MIN",
          features: ["Two short steps", "No more late payments"],
          metadata_json: { steps: 2, minutes: 3 },
          recommended: false,
        },
        {
          title: "Turn on usage alerts",
          subtitle: "Get a nudge before data runs out",
          price: 0,
          badge: "2 MIN",
          features: ["Two short steps", "Alerts at 80% and 100%"],
          metadata_json: { steps: 2, minutes: 2 },
          recommended: false,
        },
      ];
    }

    case "BILL":
    default: {
      // A GREEN task: the helper picks the explanation that fits, never a purchase.
      const lines = ctx.bill_lines ?? [];
      const biggest = [...lines].sort(
        (a, b) => b.current - b.previous - (a.current - a.previous)
      )[0];
      const seeds: OptionSeed[] = [
        {
          title: "One-off roaming charge",
          subtitle: "Data used overseas outside a pass",
          price: 0,
          features: ["A one-time charge", "Next month goes back to normal"],
          metadata_json: { category: "roaming" },
          recommended: false,
        },
        {
          title: "Extra data purchase",
          subtitle: "A data add-on bought mid-cycle",
          price: 0,
          features: ["Bought once, not recurring", "Can be avoided with a bigger plan"],
          metadata_json: { category: "addon" },
          recommended: false,
        },
        {
          title: "Subscription add-on",
          subtitle: "A recurring service billed monthly",
          price: 0,
          features: ["Charged every month", "Can be cancelled in the app"],
          metadata_json: { category: "subscription" },
          recommended: false,
        },
      ];
      if (biggest && biggest.current > biggest.previous) {
        const delta = biggest.current - biggest.previous;
        seeds.unshift({
          title: biggest.label,
          subtitle: `Up ${formatMoney(delta)} versus last month`,
          price: 0,
          badge: `+${formatMoney(delta)}`,
          features: [
            `Was ${formatMoney(biggest.previous)}, now ${formatMoney(biggest.current)}`,
            "The biggest single change on this bill",
          ],
          metadata_json: { category: "line_item", delta },
          recommended: false,
        });
      }
      return seeds;
    }
  }
}

/** Human label for a reward amount, e.g. "500MB" or "500 points". */
export function formatReward(type: RewardType, value: number): string {
  if (type === "DATA_MB") {
    return value >= 1024 ? `${(value / 1024).toFixed(0)}GB` : `${value}MB`;
  }
  return `${value.toLocaleString("en-MY")} points`;
}

export function formatMoney(amount: number): string {
  return `RM${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}
