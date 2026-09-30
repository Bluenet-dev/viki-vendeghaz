"use client";

import { useActionState } from "react";
import { gmailTestAction, saveSettingsAction } from "./actions";

type Values = Record<string, string | number>;

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

function Field({ name, label, values, suffix }: { name: string; label: string; values: Values; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-[var(--text2)]">{label}</span>
      <span className="flex items-center gap-2">
        <input name={name} defaultValue={String(values[name] ?? "")} className={input} />
        {suffix && <span className="shrink-0 text-[13px] text-[var(--text2)]">{suffix}</span>}
      </span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="mb-4 text-[15px] font-semibold text-[var(--text)]">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function SettingsForm({ values }: { values: Values }) {
  const [state, action, pending] = useActionState(saveSettingsAction, {});
  return (
    <form action={action} className="space-y-5">
      <Section title="Árak">
        <Field name="breakfastPrice" label="Reggeli" suffix="Ft / fő / nap" values={values} />
        <Field name="dinnerPrice" label="Vacsora" suffix="Ft / fő / nap" values={values} />
        <Field name="halfBoardPrice" label="Félpanzió" suffix="Ft / fő / nap" values={values} />
        <Field name="over10FeePerNight" label="Egész ház: 10 fő feletti felár" suffix="Ft / fő / éj" values={values} />
        <Field name="ifaPerPersonPerNight" label="Idegenforgalmi adó" suffix="Ft / fő / éj" values={values} />
      </Section>

      <Section title="Előleg">
        <Field name="depositPercent" label="Előleg mértéke" suffix="%" values={values} />
        <Field name="depositDueDays" label="Utalási határidő" suffix="nap" values={values} />
        <Field name="bankBeneficiary" label="Kedvezményezett" values={values} />
        <Field name="bankName" label="Bank" values={values} />
        <Field name="bankAccount" label="Számlaszám" values={values} />
        <Field name="bankIban" label="IBAN" values={values} />
      </Section>

      <Section title="Érkezés, távozás">
        <Field name="checkInFrom" label="Érkezés ettől" values={values} />
        <Field name="checkOutUntil" label="Távozás eddig" values={values} />
      </Section>

      <Section title="Elérhetőség (a levelekben is ez szerepel)">
        <Field name="propertyName" label="Szállás neve" values={values} />
        <Field name="phone" label="Telefon" values={values} />
        <Field name="email" label="E-mail" values={values} />
        <Field name="address" label="Cím" values={values} />
      </Section>

      {state.error && <p className="rounded-md bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{state.error}</p>}
      {state.ok && <p className="rounded-md bg-[var(--accent-bg)] px-3 py-2 text-[14px] text-[#3A5A3C]">Elmentve.</p>}

      <button type="submit" disabled={pending} className="rounded-md bg-[var(--nav-bg)] px-5 py-2.5 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
        {pending ? "Mentés…" : "Mentés"}
      </button>
    </form>
  );
}

export function GmailTest({ configured, user }: { configured: boolean; user: string | null }) {
  const [state, action, pending] = useActionState(gmailTestAction, {});
  return (
    <section className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="mb-1 text-[15px] font-semibold text-[var(--text)]">Gmail-kapcsolat</h2>
      <p className="mb-4 text-[14px] text-[var(--text2)]">
        {configured ? `A vendégeknek szóló levelek innen mennek: ${user}` : "Nincs beállítva – a vendégeknek szóló levelek nem mennek ki."}
      </p>
      <form action={action}>
        <button type="submit" disabled={pending} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[14px] text-[var(--text)] hover:border-[var(--text3)] disabled:opacity-50">
          {pending ? "Küldés…" : "Gmail-kapcsolat teszt"}
        </button>
      </form>
      {state.ok && <p className="mt-3 text-[14px] text-[#3A5A3C]">A próbalevél elment – nézze meg a postafiókban.</p>}
      {state.error && <p className="mt-3 text-[14px] text-[#B23B3B]">{state.error}</p>}
    </section>
  );
}
