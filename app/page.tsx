"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHydrated, useSessionUserId } from "@/lib/hooks";
import { BrandLogo } from "@/components/brand-logo";

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
        <BrandLogo height={40} />
      </div>
    </div>
  );
}
