"use client";

import { Card, EmptyState, PageTitle, Pill, SectionTitle, Stat } from "@/components/ui";
import { IconRewards, IconSparkle } from "@/components/icons";
import { useLang, useT } from "@/components/providers";
import { timeAgo, useCurrentUser, useDb } from "@/lib/hooks";
import { MONTHLY_REWARD_CAP, XP_PER_LEVEL, levelFromXp, selectProgress } from "@/lib/store";
import { TASKS, formatReward } from "@/lib/tasks";

export default function RewardsPage() {
  const t = useT();
  const { lang } = useLang();
  const db = useDb();
  const user = useCurrentUser();

  if (!user) return null;

  const all = db.rewards.filter((r) => r.user_id === user.id);
  const issued = all.filter((r) => r.status === "ISSUED");

  const dataMb = issued
    .filter((r) => r.reward_type === "DATA_MB")
    .reduce((sum, r) => sum + r.reward_value, 0);
  const points = issued
    .filter((r) => r.reward_type === "POINTS")
    .reduce((sum, r) => sum + r.reward_value, 0);

  const progress = selectProgress(db, user.id);
  const { level, intoLevel } = levelFromXp(progress.xp);

  return (
    <div className="space-y-5">
      <PageTitle>{t("rewards.title")}</PageTitle>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat
          label={t("rewards.balanceData")}
          value={formatReward("DATA_MB", dataMb)}
          tone="brand"
        />
        <Stat
          label={t("rewards.balancePoints")}
          value={points.toLocaleString("en-MY")}
          tone="brand"
        />
      </div>

      <Card className="bg-navy-900 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-yellow-500 text-navy-900">
            <IconSparkle size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-bold leading-tight">
              {t("rewards.progressTitle", { level })}
            </p>
            <p className="text-[14px] text-white/70">
              {t("rewards.assists", { n: progress.successful_assists })}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-[13px] text-white/75">
            <span>{t("rewards.progressXp", { into: intoLevel, total: XP_PER_LEVEL })}</span>
            <span>
              {t("rewards.toNext", {
                n: XP_PER_LEVEL - intoLevel,
                level: level + 1,
              })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={intoLevel}
            aria-valuemin={0}
            aria-valuemax={XP_PER_LEVEL}
            aria-label={t("rewards.progressTitle", { level })}
            className="h-2.5 w-full overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full rounded-full bg-yellow-500 transition-[width] duration-500"
              style={{ width: `${(intoLevel / XP_PER_LEVEL) * 100}%` }}
            />
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle>{t("rewards.historyTitle")}</SectionTitle>
        {all.length === 0 ? (
          <EmptyState icon={<IconRewards size={22} />} title={t("rewards.empty")} />
        ) : (
          <ul className="space-y-2">
            {all.map((r) => {
              const req = db.help_requests.find((x) => x.id === r.help_request_id);
              const label = req ? TASKS[req.task_type].label : "Task";
              return (
                <li key={r.id}>
                  <Card className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-bold text-ink">
                        {label} · {r.help_request_id}
                      </p>
                      <p className="text-[13px] text-ink-soft">
                        {timeAgo(r.created_at, lang)}
                      </p>
                    </div>
                    {r.status === "ISSUED" ? (
                      <p className="shrink-0 text-[18px] font-bold text-green-500">
                        +{formatReward(r.reward_type, r.reward_value)}
                      </p>
                    ) : (
                      <Pill tone="neutral">
                        {r.status === "BLOCKED_CAP"
                          ? t("rewards.blockedCap")
                          : t("rewards.blockedDuplicate")}
                      </Pill>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-center text-[13px] text-ink-soft">
          {t("rewards.capNote", { n: MONTHLY_REWARD_CAP })}
        </p>
      </section>
    </div>
  );
}
