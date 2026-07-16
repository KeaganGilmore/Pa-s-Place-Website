// The booking engine: availability calendar → live quote → guest details →
// payment → confirmation. Fully client-side demo — availability is seeded
// deterministically and "payment" is simulated, but the flow, validation
// and states behave like the real thing so the site works end to end.
import { useMemo, useState } from 'react';

type Kind = 'stay' | 'venue';

interface Props {
  kind: Kind;
  phone?: string;
  phoneLink?: string;
  whatsapp?: string;
}

/* ---------- date helpers ---------- */

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
// local-date key (toISOString would shift a day for SAST evenings)
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => new Date(`${s}T00:00:00`);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};
const fmtLong = (s: string) =>
  fromISO(s).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// Deterministic "bookings": hash each date; block out ~1 in 5 future days in
// clumps so the calendar looks genuinely lived-in.
const isBooked = (d: Date) => {
  const s = iso(d);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  const r = ((h >>> 0) % 100) / 100;
  const clump = ((Math.floor(d.getTime() / DAY) >> 2) * 2654435761) >>> 0;
  return r < 0.1 || clump % 9 === 3;
};

const rand5 = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

/* ---------- pricing ---------- */

const RATE_STAY = 200; // pp / night
const RATE_VENUE = 80; // pp
const VENUE_DEPOSIT = 500;
const fmtR = (n: number) => `R${n.toLocaleString('en-ZA')}`;

/* ---------- calendar ---------- */

function Month({
  year,
  month,
  arrive,
  depart,
  onPick,
}: {
  year: number;
  month: number;
  arrive: string | null;
  depart: string | null;
  onPick: (s: string) => void;
}) {
  const first = new Date(year, month, 1);
  const label = first.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const daysIn = new Date(year, month + 1, 0).getDate();
  const today = startOfToday();

  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysIn }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div className="w-full">
      <p className="text-center font-display text-lg font-semibold text-bark-900">{label}</p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.68rem] font-extrabold uppercase tracking-wider text-bark-700/60">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />;
          const s = iso(d);
          const past = d < today;
          const booked = !past && isBooked(d);
          const isStart = arrive === s;
          const isEnd = depart === s;
          const inRange = arrive && depart && s > arrive && s < depart;
          const cls = past
            ? 'text-bark-700/25 cursor-default'
            : booked
              ? 'text-bark-700/35 line-through decoration-ember/60 cursor-not-allowed bg-cream-100/60'
              : isStart || isEnd
                ? 'bg-marigold-400 text-bark-950 font-extrabold shadow-[0.12rem_0.15rem_0_rgb(51_41_28/0.85)] cursor-pointer'
                : inRange
                  ? 'bg-marigold-300/40 text-bark-900 cursor-pointer'
                  : 'text-bark-900 hover:bg-cream-200 cursor-pointer';
          return (
            <button
              key={s}
              type="button"
              disabled={past || booked}
              onClick={() => onPick(s)}
              aria-label={`${fmtLong(s)}${booked ? ' — booked' : ''}`}
              className={`aspect-square rounded-lg text-sm transition ${cls}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- the engine ---------- */

export default function BookingEngine({ kind, phone, phoneLink, whatsapp }: Props) {
  const isStay = kind === 'stay';
  const minPeople = isStay ? 4 : 10;

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [arrive, setArrive] = useState<string | null>(null);
  const [depart, setDepart] = useState<string | null>(null);
  const [people, setPeople] = useState(minPeople);
  const [warn, setWarn] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [payMethod, setPayMethod] = useState<'card' | 'eft'>('card');
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paying, setPaying] = useState(false);
  const [ref] = useState(() => `PAS-${rand5()}`);

  const today = startOfToday();
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const next = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 1);

  const nights = arrive && depart ? Math.round((fromISO(depart).getTime() - fromISO(arrive).getTime()) / DAY) : 0;
  const total = isStay ? nights * people * RATE_STAY : people * RATE_VENUE;
  const deposit = isStay ? Math.ceil(total / 2 / 50) * 50 : VENUE_DEPOSIT;
  const balance = Math.max(0, total - deposit);

  const rangeClear = (a: string, b: string) => {
    for (let d = fromISO(a); iso(d) < b; d = addDays(d, 1)) if (isBooked(d)) return false;
    return true;
  };

  const pick = (s: string) => {
    setWarn('');
    if (!isStay) {
      setArrive(s);
      setDepart(s);
      return;
    }
    if (!arrive || (arrive && depart)) {
      setArrive(s);
      setDepart(null);
    } else if (s <= arrive) {
      setArrive(s);
    } else if (!rangeClear(arrive, s)) {
      setWarn('Those dates include booked nights — try a clear stretch.');
    } else {
      setDepart(s);
    }
  };

  const datesDone = isStay ? Boolean(arrive && depart && nights > 0) : Boolean(arrive);
  const detailsDone = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && guestPhone.trim().length >= 9;
  const cardDone =
    cardNum.replace(/\s/g, '').length >= 15 && cardName.trim().length > 1 && /^\d\d\/\d\d$/.test(cardExp) && cardCvc.length >= 3;

  const payNow = () => {
    setPaying(true);
    window.setTimeout(() => {
      setPaying(false);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1900);
  };

  const steps = ['Dates', 'Details', 'Payment', 'Booked'];

  /* ---------- summary panel ---------- */
  const summary = (
    <aside className="relative h-fit rounded-[1.4rem] border-2 border-bark-900/10 bg-cream-100 p-6 lg:sticky lg:top-24">
      <span className="tape" aria-hidden="true"></span>
      <h3 className="font-display text-xl font-semibold text-bark-900">Your {isStay ? 'stay' : 'event'}</h3>
      <dl className="mt-4 space-y-2.5 text-[0.95rem] text-cocoa/85">
        {isStay ? (
          <>
            <div className="flex justify-between gap-4">
              <dt>Arrive</dt>
              <dd className="text-right font-bold text-bark-900">{arrive ? fmtLong(arrive) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Leave</dt>
              <dd className="text-right font-bold text-bark-900">{depart ? fmtLong(depart) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Nights</dt>
              <dd className="font-bold text-bark-900">{nights || '—'}</dd>
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-4">
            <dt>Date</dt>
            <dd className="text-right font-bold text-bark-900">{arrive ? fmtLong(arrive) : '—'}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt>People</dt>
          <dd className="font-bold text-bark-900">{people}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t-2 border-dashed border-cream-300 pt-4 text-[0.95rem]">
        <div className="flex justify-between text-cocoa/85">
          <span>{isStay ? `${people} × ${nights || 0} nights × ${fmtR(RATE_STAY)}` : `${people} × ${fmtR(RATE_VENUE)}`}</span>
          <span className="font-bold text-bark-900">{total ? fmtR(total) : '—'}</span>
        </div>
        <div className="mt-2 flex justify-between text-cocoa/85">
          <span>Deposit due now{isStay ? ' (50%)' : ''}</span>
          <span className="font-bold text-bark-900">{total ? fmtR(deposit) : '—'}</span>
        </div>
        <div className="mt-1 flex justify-between text-cocoa/70">
          <span>Balance {isStay ? 'on arrival' : 'on the day'}</span>
          <span>{total ? fmtR(balance) : '—'}</span>
        </div>
      </div>
      <p className="hand mt-4 text-lg leading-snug text-marigold-600">
        every rand of profit funds a child's seaside holiday
      </p>
    </aside>
  );

  /* ---------- confirmation ---------- */
  if (step === 3) {
    return (
      <div className="relative mx-auto max-w-2xl rounded-[1.6rem] border-2 border-bark-900/10 bg-[#fffdf6] p-8 text-center shadow-[0_26px_52px_-28px_rgb(24_18_10/0.5)] sm:p-10">
        <span className="tape" aria-hidden="true"></span>
        <svg className="mx-auto h-20 w-20" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <circle cx="50" cy="50" r="34" fill="#f7ae3c" />
          <g stroke="#f0931f" strokeWidth="4" strokeLinecap="round">
            <path d="M50 6v8M50 86v8M6 50h8M86 50h8M19 19l6 6M75 75l6 6M81 19l-6 6M25 75l-6 6" />
          </g>
          <path d="M36 51l10 10 19-22" stroke="#33291c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="mt-4 font-display text-3xl font-semibold text-bark-900">You're booked!</h3>
        <p className="hand mt-2 text-2xl text-marigold-600">reference {ref}</p>
        <p className="mx-auto mt-4 max-w-md text-cocoa/85">
          {isStay
            ? `${fmtLong(arrive!)} → ${fmtLong(depart!)} · ${people} people · deposit of ${fmtR(deposit)} received.`
            : `${fmtLong(arrive!)} · ${people} guests · deposit of ${fmtR(deposit)} received.`}{' '}
          A confirmation with directions and your balance ({fmtR(balance)}) is on its way to{' '}
          <strong className="text-bark-900">{email}</strong>.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-cocoa/70">
          {phone && (
            <>
              Need to change anything? Call {phone} and quote your reference.
            </>
          )}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-4">
          <a href="/" className="btn btn-marigold">Back to the beach</a>
          <a href="/our-story" className="btn btn-paper">Read our story</a>
        </div>
        <p className="mt-6 text-[0.7rem] uppercase tracking-widest text-bark-700/40">demo booking — no payment was processed</p>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="relative rounded-[1.6rem] border-2 border-bark-900/10 bg-[#fffdf6] p-6 shadow-[0_26px_52px_-28px_rgb(24_18_10/0.5)] sm:p-8">
        <span className="tape" aria-hidden="true"></span>

        {/* step indicator */}
        <ol className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full border-2 text-[0.8rem] ${
                  i < step
                    ? 'border-marigold-500 bg-marigold-400 text-bark-950'
                    : i === step
                      ? 'border-bark-950 bg-marigold-400 text-bark-950'
                      : 'border-bark-900/20 text-bark-700/50'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span className={i === step ? 'text-bark-900' : 'text-bark-700/50'}>{s}</span>
              {i < steps.length - 1 && <span className="mx-1 h-[2px] w-5 bg-bark-900/15" aria-hidden="true"></span>}
            </li>
          ))}
        </ol>

        {/* ============ STEP 0: DATES ============ */}
        {step === 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                disabled={monthOffset === 0}
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-bark-900/15 text-bark-900 transition hover:bg-cream-100 disabled:opacity-30"
                aria-label="Previous month"
              >
                ←
              </button>
              <p className="hand text-xl text-bark-700/80">
                {isStay ? 'pick your arrival, then your departure' : 'pick your event day'}
              </p>
              <button
                type="button"
                onClick={() => setMonthOffset((m) => Math.min(10, m + 1))}
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-bark-900/15 text-bark-900 transition hover:bg-cream-100"
                aria-label="Next month"
              >
                →
              </button>
            </div>

            <div className="mt-4 grid gap-8 sm:grid-cols-2">
              <Month year={base.getFullYear()} month={base.getMonth()} arrive={arrive} depart={depart} onPick={pick} />
              <div className="hidden sm:block">
                <Month year={next.getFullYear()} month={next.getMonth()} arrive={arrive} depart={depart} onPick={pick} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-bark-700/60">
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-marigold-400"></span> selected</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-cream-100 line-through"></span> <s>booked</s></span>
            </div>

            {warn && <p className="mt-3 rounded-lg bg-ember/10 px-4 py-2 text-sm font-bold text-ember">{warn}</p>}

            <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
              <label className="block">
                <span className="text-sm font-bold text-bark-900">{isStay ? `People (min ${minPeople})` : `Guests (min ${minPeople})`}</span>
                <div className="mt-1.5 flex items-center gap-3">
                  <button type="button" onClick={() => setPeople((p) => Math.max(minPeople, p - 1))} className="grid h-10 w-10 place-items-center rounded-full border-2 border-bark-900/15 text-lg font-bold text-bark-900 hover:bg-cream-100">−</button>
                  <span className="w-8 text-center text-lg font-extrabold text-bark-900">{people}</span>
                  <button type="button" onClick={() => setPeople((p) => Math.min(40, p + 1))} className="grid h-10 w-10 place-items-center rounded-full border-2 border-bark-900/15 text-lg font-bold text-bark-900 hover:bg-cream-100">+</button>
                </div>
              </label>
              <button type="button" disabled={!datesDone} onClick={() => setStep(1)} className="btn btn-marigold disabled:cursor-not-allowed disabled:opacity-40">
                Continue {total > 0 && `· ${fmtR(total)}`}
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 1: DETAILS ============ */}
        {step === 1 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-bark-900">Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} type="text" autoComplete="name" className="frm mt-1.5" placeholder="Nomsa Dlamini" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-bark-900">Email (for confirmation)</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="frm mt-1.5" placeholder="you@example.co.za" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-bark-900">Phone</span>
              <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} type="tel" autoComplete="tel" className="frm mt-1.5" placeholder="073 …" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-bold text-bark-900">Anything we should know?</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="frm mt-1.5" placeholder={isStay ? 'small kids, a gran who loves birds…' : 'a 60th birthday, long tables for 30…'} />
            </label>
            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <button type="button" onClick={() => setStep(0)} className="font-bold text-bark-700/70 underline-offset-4 hover:underline">← Dates</button>
              <button type="button" disabled={!detailsDone} onClick={() => setStep(2)} className="btn btn-marigold disabled:cursor-not-allowed disabled:opacity-40">
                Continue to payment
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 2: PAYMENT ============ */}
        {step === 2 && (
          <div className="mt-6">
            <div className="flex gap-2">
              {(['card', 'eft'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`rounded-full border-2 px-5 py-2 text-sm font-extrabold transition ${
                    payMethod === m ? 'border-bark-950 bg-marigold-400 text-bark-950' : 'border-bark-900/15 text-bark-700/70 hover:bg-cream-100'
                  }`}
                >
                  {m === 'card' ? 'Card' : 'Instant EFT'}
                </button>
              ))}
              <span className="ml-auto self-center text-[0.65rem] font-bold uppercase tracking-widest text-bark-700/40">sandbox</span>
            </div>

            {payMethod === 'card' ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-bark-900">Card number</span>
                  <input
                    value={cardNum}
                    onChange={(e) => setCardNum(e.target.value.replace(/[^\d]/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))}
                    inputMode="numeric"
                    className="frm mt-1.5 tracking-widest"
                    placeholder="4242 4242 4242 4242"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-bark-900">Name on card</span>
                  <input value={cardName} onChange={(e) => setCardName(e.target.value)} className="frm mt-1.5" placeholder="N DLAMINI" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-bark-900">Expiry</span>
                  <input
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value.replace(/[^\d]/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/, '$1/'))}
                    inputMode="numeric"
                    className="frm mt-1.5"
                    placeholder="08/27"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-bark-900">CVC</span>
                  <input value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} inputMode="numeric" className="frm mt-1.5" placeholder="123" />
                </label>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border-2 border-dashed border-cream-300 bg-paper p-5 text-cocoa/85">
                <p>
                  You'll be taken to your bank to approve an instant EFT of <strong className="text-bark-900">{fmtR(deposit)}</strong> —
                  reference <strong className="text-bark-900">{ref}</strong>. It clears immediately and your dates are locked in.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <button type="button" onClick={() => setStep(1)} className="font-bold text-bark-700/70 underline-offset-4 hover:underline">← Details</button>
              <button
                type="button"
                disabled={paying || (payMethod === 'card' && !cardDone)}
                onClick={payNow}
                className="btn btn-marigold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {paying ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3.5" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                    </svg>
                    Processing…
                  </span>
                ) : (
                  `Pay deposit · ${fmtR(deposit)}`
                )}
              </button>
            </div>
            <p className="mt-4 flex items-center justify-end gap-1.5 text-xs text-bark-700/50">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <rect x="4" y="10" width="16" height="10" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              secured payment · your details never leave this page
            </p>
          </div>
        )}
      </div>

      {summary}
    </div>
  );
}
