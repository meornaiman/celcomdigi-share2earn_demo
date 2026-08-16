"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  PageTitle,
  SectionTitle,
  SecurityNote,
  Select,
  Sheet,
  TextInput,
} from "@/components/ui";
import { IconPlus, IconTrash, IconUsers } from "@/components/icons";
import { useLang, useT } from "@/components/providers";
import { useCurrentUser, useDb } from "@/lib/hooks";
import { addTrustedHelper, revokeTrustedHelper, selectHelpers } from "@/lib/store";
import { signOut, isPinnedSession } from "@/lib/session";
import { LANGS } from "@/lib/i18n";

export default function ProfilePage() {
  const t = useT();
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const { lang, setLang } = useLang();

  const [addOpen, setAddOpen] = useState(false);
  const [newHelperId, setNewHelperId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState<{
    id: string;
    name: string;
  } | null>(null);

  if (!user) return null;

  const helpers = selectHelpers(db, user.id);
  const candidates = db.users.filter(
    (u) => u.id !== user.id && !helpers.some((h) => h.user.id === u.id)
  );

  return (
    <div className="space-y-6">
      <PageTitle>{t("profile.title")}</PageTitle>

      <Card className="flex items-center gap-4">
        <Avatar name={user.name} accent={user.accent} size={58} />
        <div className="min-w-0">
          <p className="text-[20px] font-bold text-ink">{user.name}</p>
          <p className="text-[14px] text-ink-soft">{user.mobile_number}</p>
          <p className="text-[13px] text-ink-soft">
            {user.account_type} · {user.plan_name} · {user.customer_id}
          </p>
        </div>
      </Card>

      <section>
        <SectionTitle
          action={
            candidates.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setNewHelperId(candidates[0].id);
                  setNewLabel("");
                  setAddOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[15px] font-semibold text-blue-700"
              >
                <IconPlus size={17} />
                {t("profile.add")}
              </button>
            ) : null
          }
        >
          {t("profile.trusted")}
        </SectionTitle>

        <p className="mb-3 text-[14px] text-ink-soft">{t("profile.trustedHint")}</p>

        {helpers.length === 0 ? (
          <EmptyState icon={<IconUsers size={22} />} title={t("helpers.empty")} />
        ) : (
          <ul className="space-y-2">
            {helpers.map(({ user: h, relationship }) => (
              <li key={relationship.id}>
                <Card className="flex items-center gap-3">
                  <Avatar name={h.name} accent={h.accent} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold text-ink">{h.name}</p>
                    <p className="text-[14px] text-ink-soft">
                      {relationship.relationship_label} · {h.mobile_number}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmRevoke({ id: relationship.id, name: h.name })
                    }
                    aria-label={`${t("profile.revoke")} ${h.name}`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-red-500/10 hover:text-red-500"
                  >
                    <IconTrash size={19} />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <SecurityNote tone="lock">
            Removing someone takes effect immediately and cancels any open
            request with them.
          </SecurityNote>
        </div>
      </section>

      <section>
        <SectionTitle>{t("profile.settings")}</SectionTitle>
        <Card className="space-y-4">
          <Field label={t("common.language")} htmlFor="lang">
            <Select
              id="lang"
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "ms")}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      </section>

      {!isPinnedSession() ? (
        <div className="space-y-2.5">
          <Button
            variant="outline"
            onClick={() => {
              signOut();
              router.replace("/login");
            }}
          >
            {t("profile.switchAccount")}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              signOut();
              router.replace("/login");
            }}
          >
            {t("profile.signOut")}
          </Button>
        </div>
      ) : null}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t("profile.add")}>
        <div className="space-y-4">
          <Field label="Contact" htmlFor="new-helper">
            <Select
              id="new-helper"
              value={newHelperId}
              onChange={(e) => setNewHelperId(e.target.value)}
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.mobile_number}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Relationship" htmlFor="new-label">
            <TextInput
              id="new-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Daughter, Friend, Neighbour…"
              maxLength={30}
            />
          </Field>
          <Button
            variant="primary"
            disabled={!newHelperId}
            onClick={() => {
              addTrustedHelper(user.id, newHelperId, newLabel || "Trusted contact");
              setAddOpen(false);
            }}
          >
            {t("profile.add")}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        title={t("profile.revoke")}
      >
        <p className="mb-4 text-[16px] leading-snug text-ink-soft">
          {t("profile.revokeConfirm", { name: confirmRevoke?.name ?? "" })}
        </p>
        <div className="space-y-2.5">
          <Button
            variant="danger"
            onClick={() => {
              if (confirmRevoke) revokeTrustedHelper(confirmRevoke.id, user.id);
              setConfirmRevoke(null);
            }}
          >
            {t("profile.revoke")}
          </Button>
          <Button variant="ghost" size="md" onClick={() => setConfirmRevoke(null)}>
            {t("common.cancel")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
