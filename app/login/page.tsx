"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Card, Field, SecurityNote, TextInput } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { useT } from "@/components/providers";
import { IconArrowLeft, IconSparkle } from "@/components/icons";
import { useDb, useHydrated, useSessionUserId } from "@/lib/hooks";
import { generateOtp, signIn } from "@/lib/session";
import { selectUserByMobile, trackEvent } from "@/lib/store";

type Step = "MOBILE" | "OTP";

export default function LoginPage() {
  const t = useT();
  const db = useDb();
  const router = useRouter();
  const hydrated = useHydrated();
  const sessionId = useSessionUserId();

  const [step, setStep] = useState<Step>("MOBILE");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [issuedOtp, setIssuedOtp] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hydrated && sessionId) router.replace("/home");
  }, [hydrated, sessionId, router]);

  useEffect(() => {
    if (step === "OTP") otpRef.current?.focus();
  }, [step]);

  function requestCode(value: string) {
    const user = selectUserByMobile(db, value);
    if (!user) {
      setError(t("login.unknownNumber"));
      return;
    }
    setError(null);
    setPendingUserId(user.id);
    setMobile(user.mobile_number);
    setIssuedOtp(generateOtp());
    setOtp("");
    setStep("OTP");
  }

  function verify() {
    if (otp.trim() !== issuedOtp) {
      setError(t("login.wrongOtp"));
      return;
    }
    if (!pendingUserId) return;
    signIn(pendingUserId);
    trackEvent("share2earn_home_viewed", pendingUserId);
    router.replace("/home");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-canvas px-5 pb-8 pt-10">
      <header className="mb-8">
        {/* The mark carries the name, so it is the heading rather than an
            ornament sitting above one. */}
        <h1>
          <BrandLogo height={52} />
        </h1>
        <p className="mt-4 max-w-[22rem] text-[17px] leading-snug text-ink-soft">
          {t("login.tagline")}
        </p>
      </header>

      {step === "MOBILE" ? (
        <Card className="space-y-4">
          <Field label={t("login.mobileLabel")} htmlFor="mobile">
            <TextInput
              id="mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("login.mobilePlaceholder")}
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && requestCode(mobile)}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </Field>
          {error ? (
            <p id="login-error" role="alert" className="text-[14px] font-medium text-red-500">
              {error}
            </p>
          ) : null}
          <Button onClick={() => requestCode(mobile)} disabled={mobile.trim().length < 6}>
            {t("login.sendOtp")}
          </Button>
        </Card>
      ) : (
        <Card className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep("MOBILE");
              setError(null);
            }}
            className="-ml-1 inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue-700"
          >
            <IconArrowLeft size={18} />
            {t("login.changeNumber")}
          </button>

          <div>
            <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
              {t("login.otpTitle")}
            </h2>
            <p className="mt-1 text-[15px] text-ink-soft">
              {t("login.otpSubtitle", { mobile })}
            </p>
          </div>

          <Field label={t("login.otpTitle")} htmlFor="otp">
            <TextInput
              id="otp"
              ref={otpRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              className="text-center text-[26px] font-bold tracking-[0.4em]"
              aria-invalid={!!error}
              aria-describedby="otp-hint"
            />
          </Field>

          <p
            id="otp-hint"
            className="flex items-center justify-between gap-3 rounded-tile bg-yellow-500/18 px-3.5 py-2.5 text-[14px] font-medium text-[#7A5A00]"
          >
            <span className="inline-flex items-center gap-1.5">
              <IconSparkle size={16} />
              {t("login.demoHint")}
            </span>
            <strong className="font-mono text-[17px] tracking-[0.18em] text-ink">
              {issuedOtp}
            </strong>
          </p>

          {error ? (
            <p role="alert" className="text-[14px] font-medium text-red-500">
              {error}
            </p>
          ) : null}

          <Button onClick={verify} disabled={otp.length !== 6}>
            {t("login.verify")}
          </Button>
          <Button variant="ghost" size="md" onClick={() => setIssuedOtp(generateOtp())}>
            {t("login.resend")}
          </Button>
        </Card>
      )}

      <div className="mt-6">
        <SecurityNote tone="lock">
          Sign-in uses a one-time code. Your password is never shared with anyone
          who helps you.
        </SecurityNote>
      </div>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-soft">
          {t("login.quickPick")}
        </h2>
        <ul className="space-y-2">
          {db.users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => requestCode(user.mobile_number)}
                className="flex w-full items-center gap-3 rounded-card bg-surface p-3 text-left shadow-soft transition hover:shadow-lift"
              >
                <Avatar name={user.name} accent={user.accent} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold text-ink">{user.name}</span>
                  <span className="block text-[14px] text-ink-soft">
                    {user.mobile_number} · {user.account_type}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-center text-[13px] text-ink-soft">
        Prototype · no real customer data ·{" "}
        <Link className="font-semibold text-blue-700 underline" href="/demo">
          presenter demo mode
        </Link>
      </p>
    </div>
  );
}
