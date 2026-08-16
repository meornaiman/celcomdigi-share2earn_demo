"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHydrated, useSessionUserId } from "@/lib/hooks";

/**
 * Entry point. A static export has no server to redirect, so the decision is
 * made in the browser as soon as the stored session is readable.
 */
export default function Index() {
  const router = useRouter();
  const hydrated = useHydrated();
  const userId = useSessionUserId();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(userId ? "/home" : "/login");
  }, [hydrated, userId, router]);

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-[18px] bg-navy-900 text-[17px] font-bold text-yellow-500">
          CD
        </span>
        <p className="text-[15px] font-semibold text-ink-soft">AIdealist</p>
      </div>
    </div>
  );
}
