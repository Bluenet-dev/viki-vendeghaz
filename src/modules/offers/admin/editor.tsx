"use client";

// Ajánlat-szerkesztő: bal oldalt a kérés és a beállítások, jobb oldalt élő előnézet
// pontosan úgy, ahogy a vendég kapja (ugyanaz a levél-komponens, iframe-ben).
// Minden változásra a közös árazómotor számol újra.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MEAL_LABEL, ROOM_SCOPES, formatFt, targetLabel, type Meal } from "@/lib/booking/constants";
import { addDays, fmtLong, fmtShort } from "@/lib/booking/dates";
import { COMBOS, computeQuote, deserializeBookingData, type Problem, type SerializedBookingData } from "@/lib/booking/quote";
import { declineOfferAction, findAlternativesAction, saveOfferAction, sendOfferAction } from "@/app/admin/(protected)/ajanlatok/actions";
import { applyOverrides, quoteInput, requestUrl } from "../pricing";
import type { OfferDraft, OfferRequest, Window } from "../types";
import { buildOfferView, guestBreakdown, type Brand } from "../view";
import { PreviewFrame } from "./preview";

export interface EditorOffer {
  id: number;
  number: string;
  name: string;
  email: string | null;
  phone: string | null;
  checkIn: string;
  checkOut: string;
  source: string;
  message: string | null;
  createdAt: string;
}

const TARGETS = ["egesz_haz", ...ROOM_SCOPES, ...COMBOS];

const box = "rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4";
const h2 = "mb-3 text-[15px] font-semibold text-[var(--text)]";
const primary = "rounded-md bg-[var(--accent)] px-5 py-2.5 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50";
const secondary = "rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[15px] text-[var(--text)] hover:border-[var(--text3)] disabled:opacity-50";

function Counter({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[14px] text-[var(--text)]">{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" aria-label={`${label}: kevesebb`} disabled={value <= min} onClick={() => onChange(value - 1)}
          className="h-8 w-8 rounded-full border border-[var(--border)] text-[17px] disabled:opacity-30">−</button>
        <span className="w-6 text-center text-[15px] font-semibold">{value}</span>
        <button type="button" aria-label={`${label}: több`} disabled={value >= max} onClick={() => onChange(value + 1)}
          className="h-8 w-8 rounded-full border border-[var(--border)] text-[17px] disabled:opacity-30">+</button>
      </span>
    </div>
  );
}

// Miért nem foglalható – az adminnak érthetően.
function adminProblem(p: Problem): string {
  switch (p.kind) {
    case "closed":
      return `Foglalt: ${p.dates.map(fmtShort).join(", ")}`;
    case "not_released":
      return p.opensOn ? `Szobánként csak ${fmtShort(p.opensOn)}-tól foglalható` : "Szobánként még nem foglalható";
    case "whole_house_only":
      return "Ezekre a napokra csak egész ház";
    case "capacity":
      return `Legfeljebb ${p.max} fő fér el`;
    case "min_nights":
      return `Legalább ${p.min} éjszaka kell`;
    case "no_rate":
      return "Nincs ár a naptárban";
    case "package":
      return p.reason;
    default:
      return "Így nem foglalható";
  }
}

export function OfferEditor(props: {
  offer: EditorOffer;
  request: OfferRequest;
  initial: OfferDraft;
  data: SerializedBookingData;
  brand: Brand;
  acceptUrl: string;
  siteUrl: string;
  alternatives: Window[];
  declineTemplate: string;
  today: string;
}) {
  const { offer } = props;
  const router = useRouter();
  const data = useMemo(() => deserializeBookingData(props.data), [props.data]);
  const [draft, setDraft] = useState<OfferDraft>(props.initial);
  const [alternatives, setAlternatives] = useState<Window[]>(props.alternatives);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [failedSend, setFailedSend] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineText, setDeclineText] = useState(props.declineTemplate);
  const [pending, start] = useTransition();

  const set = <K extends keyof OfferDraft>(k: K, v: OfferDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const paying = draft.party.adults + draft.party.teens + draft.party.children;
  const isHouse = draft.scope === "egesz_haz";

  const quote = computeQuote(quoteInput(offer, draft), data);
  const totals = applyOverrides(quote, draft.overrides);
  const nights = quote.nights;

  const options = TARGETS.map((t) => ({ t, q: computeQuote(quoteInput(offer, { ...draft, scope: t, packageSlug: t === "egesz_haz" ? draft.packageSlug : null }), data) }));
  const packages = isHouse && quote.regime === "2027"
    ? data.packages.filter((p) => p.active && computeQuote(quoteInput(offer, { ...draft, packageSlug: p.slug }), data).problems.every((x) => x.kind !== "package"))
    : [];

  const view = buildOfferView(
    {
      number: offer.number,
      kind: draft.kind,
      name: offer.name,
      checkIn: offer.checkIn,
      checkOut: offer.checkOut,
      party: draft.party,
      scope: draft.scope,
      meal: draft.meal,
      mealGuests: draft.mealGuests,
      lines: totals.lines,
      total: totals.total,
      deposit: totals.deposit,
      depositPercent: totals.depositPercent,
      personalMessage: draft.personalMessage,
      validUntil: addDays(props.today, draft.validDays),
      validDays: draft.validDays,
      acceptUrl: props.acceptUrl,
      alternatives,
      requestUrlFor: (w) => requestUrl(props.siteUrl, w, draft.party),
    },
    props.brand,
  );

  function setOverride(key: string, raw: string, engineAmount: number) {
    const clean = raw.replace(/[^\d-]/g, "");
    setDraft((d) => {
      const overrides = { ...d.overrides };
      if (clean === "" || clean === "-" || Number(clean) === engineAmount) delete overrides[key];
      else overrides[key] = Number(clean);
      return { ...d, overrides };
    });
  }

  function chooseKind(kind: OfferDraft["kind"]) {
    set("kind", kind);
    if (kind === "betelt" && alternatives.length === 0) {
      start(async () => setAlternatives(await findAlternativesAction(offer.id)));
    }
  }

  function save() {
    setMsg({});
    start(async () => {
      const r = await saveOfferAction(offer.id, draft);
      setMsg(r.error ? { error: r.error } : { ok: r.message });
    });
  }

  function send() {
    setMsg({});
    setConfirmSend(false);
    start(async () => {
      const r = await sendOfferAction(offer.id, draft);
      if (r.error) {
        setFailedSend(true);
        setMsg({ error: r.error });
        return;
      }
      router.refresh();
    });
  }

  function decline() {
    setMsg({});
    start(async () => {
      const r = await declineOfferAction(offer.id, declineText);
      if (r.error) setMsg({ error: r.error });
      else router.refresh();
    });
  }

  const req = props.request;
  const engineByKey = new Map(quote.lines.map((l, i) => [l.key ?? `sor:${i}`, l.amount]));

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,640px)]">
      <div className="space-y-4">
        {/* A kérés – változatlanul */}
        <section className={box}>
          <h2 className={h2}>A kérés</h2>
          <dl className="grid gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[130px_1fr]">
            <dt className="text-[var(--text2)]">Vendég</dt>
            <dd className="text-[var(--text)]">{offer.name}</dd>
            <dt className="text-[var(--text2)]">Elérhetőség</dt>
            <dd className="text-[var(--text)]">
              {offer.email ?? "nincs e-mail"}
              {offer.phone ? ` · ${offer.phone}` : ""}
            </dd>
            <dt className="text-[var(--text2)]">Időpont</dt>
            <dd className="text-[var(--text)]">
              {fmtLong(offer.checkIn)} – {fmtLong(offer.checkOut)} ({nights} éj)
            </dd>
            <dt className="text-[var(--text2)]">Kért szállás</dt>
            <dd className="text-[var(--text)]">{targetLabel(req.scope)}</dd>
            <dt className="text-[var(--text2)]">Vendégek</dt>
            <dd className="text-[var(--text)]">{guestBreakdown(req.party)}</dd>
            {req.packageSlug && (
              <>
                <dt className="text-[var(--text2)]">Csomag</dt>
                <dd className="text-[var(--text)]">{data.packages.find((p) => p.slug === req.packageSlug)?.name ?? req.packageSlug}</dd>
              </>
            )}
            {(req.extras.saunaDays || req.extras.tubCount) ? (
              <>
                <dt className="text-[var(--text2)]">Extrák</dt>
                <dd className="text-[var(--text)]">
                  {[req.extras.saunaDays ? `Szaunanap: ${req.extras.saunaDays} nap` : null, req.extras.tubCount ? `Dézsa: ${req.extras.tubCount}×` : null].filter(Boolean).join(", ")}
                </dd>
              </>
            ) : null}
            {req.meal !== "nincs" && (
              <>
                <dt className="text-[var(--text2)]">Étkezés</dt>
                <dd className="text-[var(--text)]">{MEAL_LABEL[req.meal]}, {req.mealGuests} fő</dd>
              </>
            )}
            {offer.message && (
              <>
                <dt className="text-[var(--text2)]">Üzenet</dt>
                <dd className="whitespace-pre-line text-[var(--text)]">{offer.message}</dd>
              </>
            )}
          </dl>
        </section>

        {/* Mit küldünk? */}
        <section className={box}>
          <h2 className={h2}>Mit küldünk?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["ajanlat", "Ajánlatot", "árral, elfogadás gombbal"],
              ["betelt", "Betelt levelet", "a 2 legközelebbi szabad időponttal"],
            ] as const).map(([k, label, hint]) => (
              <label key={k} className={`cursor-pointer rounded-lg border p-3 ${draft.kind === k ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)]"}`}>
                <input type="radio" name="kind" className="sr-only" checked={draft.kind === k} onChange={() => chooseKind(k)} />
                <span className="block text-[15px] font-medium text-[var(--text)]">{label}</span>
                <span className="block text-[13px] text-[var(--text2)]">{hint}</span>
              </label>
            ))}
          </div>
          {draft.kind === "betelt" && (
            <div className="mt-3 text-[14px] text-[var(--text)]">
              {pending && alternatives.length === 0 ? (
                <p className="text-[var(--text2)]">Szabad időpontok keresése…</p>
              ) : alternatives.length ? (
                <ul className="list-disc pl-5">
                  {alternatives.map((w) => (
                    <li key={w.checkIn}>{fmtLong(w.checkIn)} – {fmtLong(w.checkOut)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--text2)]">Fél éven belül nincs hasonló szabad időszak. A levél a telefonszámot ajánlja.</p>
              )}
            </div>
          )}
        </section>

        {draft.kind === "ajanlat" && (
          <>
            {/* Szállás */}
            <section className={box}>
              <h2 className={h2}>Szállás</h2>
              {draft.scope !== req.scope && (
                <p className="mb-3 rounded-md bg-[#FFF6DB] px-3 py-2 text-[13px] text-[#7A5B00]">
                  A vendég {targetLabel(req.scope)} szállást kért. Mivel az nem szabad, a tervezet ezt ajánlja: {targetLabel(draft.scope)}.
                </p>
              )}
              <div className="space-y-1.5">
                {options.map(({ t, q }) => {
                  const free = q.ok;
                  const why = q.problems[0];
                  return (
                    <label key={t} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 ${draft.scope === t ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)]"}`}>
                      <span className="flex items-center gap-2.5">
                        <input type="radio" name="scope" checked={draft.scope === t} onChange={() => set("scope", t)} />
                        <span className="text-[14px] text-[var(--text)]">{targetLabel(t)}</span>
                      </span>
                      <span className={`text-right text-[13px] ${free ? "text-[#3A5A3C]" : "text-[var(--text3)]"}`}>
                        {free ? `szabad · ${q.total != null ? formatFt(q.total) : "egyedi ár"}` : why ? adminProblem(why) : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Vendégek, csomag, extrák, étkezés */}
            <section className={box}>
              <h2 className={h2}>Vendégek</h2>
              <Counter label="Felnőtt (18 év felett)" value={draft.party.adults} min={1} max={12} onChange={(v) => set("party", { ...draft.party, adults: v })} />
              <Counter label="Gyerek (13–17 év)" value={draft.party.teens} min={0} max={12} onChange={(v) => set("party", { ...draft.party, teens: v })} />
              <Counter label="Gyerek (3–12 év)" value={draft.party.children} min={0} max={12} onChange={(v) => set("party", { ...draft.party, children: v })} />
              <Counter label="Baba (0–2 év)" value={draft.party.infants} min={0} max={6} onChange={(v) => set("party", { ...draft.party, infants: v })} />

              {packages.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[14px] font-medium text-[var(--text)]">Csomag</p>
                  <select value={draft.packageSlug ?? ""} onChange={(e) => set("packageSlug", e.target.value || null)} className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[14px]">
                    <option value="">Csomag nélkül</option>
                    {packages.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {quote.regime === "2027" && (
                <div className="mt-4">
                  <p className="mb-1 text-[14px] font-medium text-[var(--text)]">Extrák</p>
                  {isHouse && (
                    <Counter label="Szaunanap" value={draft.extras.saunaDays ?? 0} min={0} max={nights} onChange={(v) => set("extras", { ...draft.extras, saunaDays: v })} />
                  )}
                  <Counter label="Dézsafürdő (felfűtés)" value={draft.extras.tubCount ?? 0} min={0} max={nights * 2} onChange={(v) => set("extras", { ...draft.extras, tubCount: v })} />
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-[14px] font-medium text-[var(--text)]">Étkezés</span>
                <select value={draft.meal} onChange={(e) => set("meal", e.target.value as Meal)} className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[14px]">
                  {(["nincs", "reggeli", "vacsora", "felpanzio"] as const).map((m) => (
                    <option key={m} value={m}>{m === "felpanzio" ? "Félpanzió" : MEAL_LABEL[m]}</option>
                  ))}
                </select>
                {draft.meal !== "nincs" && (
                  <select value={draft.mealGuests} onChange={(e) => set("mealGuests", Number(e.target.value))} className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[14px]">
                    {Array.from({ length: paying + draft.party.infants }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} fő</option>
                    ))}
                  </select>
                )}
              </div>
            </section>

            {/* Tételek – bármelyik összeg átírható */}
            <section className={box}>
              <h2 className={h2}>Tételek</h2>
              {quote.problems.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {quote.problems.map((p, i) => (
                    <li key={i} className="rounded-md bg-[#FFF6DB] px-3 py-2 text-[13px] text-[#7A5B00]">{adminProblem(p)}</li>
                  ))}
                </ul>
              )}
              {totals.total == null ? (
                <p className="text-[14px] text-[var(--text2)]">Erre az időszakra nincs ár a naptárban.</p>
              ) : (
                <table className="w-full text-[14px]">
                  <tbody>
                    {totals.lines.map((l) => {
                      const engine = engineByKey.get(l.key) ?? l.amount;
                      return (
                        <tr key={l.key} className="border-b-[0.5px] border-[var(--border)]">
                          <td className="py-2 pr-3 text-[var(--text)]">
                            {l.label}
                            {l.qtyText && (
                              <span className="block text-[12px] text-[var(--text2)]">
                                {l.qtyText}
                                {l.unitPrice != null && !l.manual ? ` × ${formatFt(l.unitPrice)}` : ""}
                              </span>
                            )}
                            {l.manual && (
                              <span className="mt-0.5 flex items-center gap-2 text-[12px] text-[#8A4A22]">
                                kézzel módosítva (eredetileg {formatFt(engine)})
                                <button type="button" className="underline" onClick={() => setOverride(l.key, String(engine), engine)}>visszaállítás</button>
                              </span>
                            )}
                          </td>
                          <td className="w-36 py-2 text-right">
                            <span className="flex items-center justify-end gap-1">
                              <input
                                aria-label={`${l.label} összege`}
                                inputMode="numeric"
                                value={String(l.amount)}
                                onChange={(e) => setOverride(l.key, e.target.value, engine)}
                                className={`w-28 rounded-md border px-2 py-1 text-right text-[14px] ${l.manual ? "border-[#E8A882] bg-[#FFF4EC]" : "border-[var(--border)] bg-white"}`}
                              />
                              <span className="text-[13px] text-[var(--text2)]">Ft</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="font-semibold">
                      <td className="pt-3 text-[16px]">Összesen</td>
                      <td className="pt-3 text-right text-[16px]">{formatFt(totals.total)}</td>
                    </tr>
                    <tr>
                      <td className="pt-1 text-[13px] text-[var(--text2)]">Foglaló ({totals.depositPercent}%)</td>
                      <td className="pt-1 text-right text-[13px] text-[var(--text2)]">{totals.deposit != null ? formatFt(totals.deposit) : ""}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}

        {/* Személyes szöveg, érvényesség */}
        <section className={box}>
          <label className="block">
            <span className={h2}>Személyes üzenet (nem kötelező)</span>
            <textarea
              rows={4}
              value={draft.personalMessage}
              onChange={(e) => set("personalMessage", e.target.value)}
              placeholder="Pl.: Nagyon örülünk, hogy újra hozzánk jönnének!"
              className="mt-2 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[15px]"
            />
          </label>
          {draft.kind === "ajanlat" && (
            <label className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-[var(--text)]">
              Az ajánlat érvényes
              <input
                inputMode="numeric"
                value={draft.validDays}
                onChange={(e) => set("validDays", Math.min(60, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))}
                className="w-14 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-center"
              />
              napig ({fmtLong(addDays(props.today, draft.validDays))} végéig, ha ma küldi)
            </label>
          )}
        </section>

        {/* Gombok */}
        <section className={box}>
          {msg.error && <p className="mb-3 rounded-md bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{msg.error}</p>}
          {msg.ok && <p className="mb-3 rounded-md bg-[var(--accent-bg)] px-3 py-2 text-[14px] text-[#3A5A3C]">{msg.ok}</p>}
          {!offer.email && <p className="mb-3 text-[14px] text-[#7A5B00]">A vendégnek nincs e-mail címe, ezért levél nem küldhető.</p>}

          {confirmSend ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] text-[var(--text)]">Elküldöm erre a címre: {offer.email}?</span>
              <button type="button" disabled={pending} onClick={send} className={primary}>{pending ? "Küldés…" : "Igen, küldöm"}</button>
              <button type="button" onClick={() => setConfirmSend(false)} className={secondary}>Mégse</button>
            </div>
          ) : declining ? (
            <div>
              <p className="mb-2 text-[14px] font-medium text-[var(--text)]">Elutasító levél (átírható)</p>
              <textarea rows={5} value={declineText} onChange={(e) => setDeclineText(e.target.value)} className="w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[15px]" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={decline} className={primary}>{pending ? "Küldés…" : offer.email ? "Elutasítás elküldése" : "Elutasítom"}</button>
                <button type="button" onClick={() => setDeclining(false)} className={secondary}>Mégse</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending || !offer.email} onClick={() => setConfirmSend(true)} className={primary}>
                {failedSend ? "Újraküldés" : "Küldés"}
              </button>
              <button type="button" disabled={pending} onClick={save} className={secondary}>Mentés később</button>
              <button type="button" disabled={pending} onClick={() => setDeclining(true)} className={`${secondary} text-[#B23B3B]`}>Elutasítás</button>
            </div>
          )}
        </section>
      </div>

      {/* Élő előnézet */}
      <div className="xl:sticky xl:top-6">
        <p className="mb-2 text-[13px] text-[var(--text2)]">Előnézet: így kapja a vendég{draft.kind === "ajanlat" ? " (PDF-ben is csatolva)" : ""}</p>
        <PreviewFrame view={view} />
      </div>
    </div>
  );
}
