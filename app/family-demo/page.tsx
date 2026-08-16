"use client";

import { Presenter } from "@/components/presenter";

/**
 * The same dashboard, opening on Family Mobility. Kept as its own URL so a
 * presenter can jump straight to that story without switching tracks on stage.
 */
export default function FamilyDemoPage() {
  return <Presenter defaultTrack="family" />;
}
