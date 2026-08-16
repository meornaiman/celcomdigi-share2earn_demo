"use client";

import {
  IconBill,
  IconEsim,
  IconOnboarding,
  IconPlan,
  IconRoaming,
} from "./icons";
import type { TaskType } from "@/lib/types";

const MAP = {
  BILL: IconBill,
  ROAMING: IconRoaming,
  PLAN: IconPlan,
  ESIM: IconEsim,
  ONBOARDING: IconOnboarding,
} as const;

export function TaskIcon({ type, size = 22 }: { type: TaskType; size?: number }) {
  const Icon = MAP[type];
  return <Icon size={size} />;
}
