// The booking engine: choose an option (rooms / whole house / venue) →
// availability calendar → live quote → guest details → payment →
// confirmation. Fully client-side demo — availability is seeded
// deterministically per option and "payment" is simulated, but the flow,
// validation and states behave like the real thing.
import { useState } from 'react';

interface Props {
  defaultOption?: string;
  phone?: string;
}

/* ---------- the inventory ---------- */

interface Option {
  id: string;
  name: string;
  blurb: string;
  sleeps: string;
  minPeople: number;
  maxPeople: number;
  rate: number;
  rateLabel: string;
  kind: 'stay' | 'venue';
  icon: string;
}

const OPTIONS: Option[] = [
  {
    id: 'whole-house',
    name: 'The Whole House',
    blurb: 'every room, the veranda, the garden — all yours',
    sleeps: 'sleeps up to 12',
    minPeople: 4,
    maxPeople: 12,
    rate: 200,
    rateLabel: 'R200 pp / night',
    kind: 'stay',
    icon: `<svg viewBox="0 0 48 48" class="h-9 w-9" fill="none" aria-hidden="true"><path d="M8 22 L24 9 L40 22 v16 a3 3 0 0 1-3 3 H11 a3 3 0 0 1-3-3 Z" fill="#f6ead1" stroke="#423424" stroke-width="2.6" stroke-linejoin="round"/><rect x="20" y="28" width="8" height="13" rx="3" fill="#5c4a36"/><rect x="12" y="26" width="6" height="6" rx="1" fill="#b4dceb" stroke="#423424" stroke-width="1.8"/><rect x="30" y="26" width="6" height="6" rx="1" fill="#b4dceb" stroke="#423424" stroke-width="1.8"/></svg>`,
  },
  {
    id: 'family-room',
    name: "The Dove's Nest",
    blurb: 'the quiet family room with the garden window',
    sleeps: 'sleeps 2–4',
    minPeople: 2,
    maxPeople: 4,
    rate: 200,
    rateLabel: 'R200 pp / night',
    kind: 'stay',
    icon: `<svg viewBox="0 0 48 48" class="h-9 w-9" fill="none" aria-hidden="true"><rect x="6" y="24" width="36" height="12" rx="3" fill="#f6ead1" stroke="#423424" stroke-width="2.6"/><path d="M6 36 v5 M42 36 v5" stroke="#423424" stroke-width="2.6" stroke-linecap="round"/><rect x="9" y="17" width="13" height="8" rx="4" fill="#fbc968" stroke="#423424" stroke-width="2.2"/><path d="M6 24 v-8" stroke="#423424" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'bunk-room',
    name: 'The Rock Pool',
    blurb: 'bunk beds, big windows — backpacker style',
    sleeps: 'sleeps 2–6',
    minPeople: 2,
    maxPeople: 6,
    rate: 160,
    rateLabel: 'R160 pp / night',
    kind: 'stay',
    icon: `<svg viewBox="0 0 48 48" class="h-9 w-9" fill="none" aria-hidden="true"><path d="M8 8 v32 M40 8 v32" stroke="#423424" stroke-width="2.6" stroke-linecap="round"/><rect x="8" y="12" width="32" height="7" rx="2.5" fill="#4f93a3" stroke="#423424" stroke-width="2.2"/><rect x="8" y="27" width="32" height="7" rx="2.5" fill="#fbc968" stroke="#423424" stroke-width="2.2"/></svg>`,
  },
  {
    id: 'venue',
    name: 'Venue & Day Events',
    blurb: 'the lawn, playground and long tables for the day',
    sleeps: '10–40 guests',
    minPeople: 10,
    maxPeople: 40,
    rate: 80,
    rateLabel: 'R80 pp / day',
    kind: 'venue',
    icon: `<svg viewBox="0 0 48 48" class="h-9 w-9" fill="none" aria-hidden="true"><g stroke="#b4dceb" stroke-width="2.4" stroke-linecap="round"><path d="M19 12 c-1.6-3 1.6-4.4 0-7.5"/><path d="M28 12 c-1.6-3 1.6-4.4 0-7.5"/></g><ellipse cx="24" cy="19" rx="13" ry="3" fill="#33291c"/><path d="M11 19 h26 v4.5 a13 9 0 0 1-26 0 Z" fill="#423424" stroke="#33291c" stroke-width="2"/><path d="M8 41 h32" stroke="#7d9a6a" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  },
];

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

// Deterministic per-option "bookings" so each room has its own lived-in calendar.
const isBooked = (d: Date, salt: string) => {
  const s = `${salt}:${iso(d)}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  const r = ((h >>> 0) % 100) / 100;
  const clump = (((Math.floor(d.getTime() / DAY) + salt.length * 7) >> 2) * 2654435761) >>> 0;
  return r < 0.09 || clump % 9 === 3;
};

const rand5 = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const fmtR = (n: number) => `R${n.toLocaleString('en-ZA')}`;
const VENUE_DEPOSIT = 500;

/* ---------- calendar month ---------- */

function Month({
  year,
  month,
  arrive,
  depart,
  salt,
  onPick,
}: {
  year: number;
  month: number;
  arrive: string | null;
  depart: string | null;
  salt: string;
  onPick: (s: string) => void;
}) {
  const first = new Date(year, month, 1);
  const label = first.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const lead = (first.getDay() + 6) % 7;
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
          const booked = !past && isBooked(d, salt);
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

export default function BookingEngine({ defaultOption, phone }: Props) {
  const [optionId, setOptionId] = useState<string | null>(defaultOption ?? null);
  const option = OPTIONS.find((o) => o.id === optionId) ?? null;
  const isStay = option?.kind !== 'venue';

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [arrive, setArrive] = useState<string | null>(null);
  const [depart, setDepart] = useState<string | null>(null);
  const [people, setPeople] = useState(defaultOption ? (OPTIONS.find((o) => o.id === defaultOption)?.minPeople ?? 4) : 4);
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
  const salt = option?.id ?? 'x';

  const nights = arrive && depart ? Math.round((fromISO(depart).getTime() - fromISO(arrive).getTime()) / DAY) : 0;
  const total = option ? (isStay ? nights * people * option.rate : people * option.rate) : 0;
  const deposit = option ? (isStay ? Math.ceil(total / 2 / 50) * 50 : VENUE_DEPOSIT) : 0;
  const balance = Math.max(0, total - deposit);

  const chooseOption = (o: Option) => {
    setOptionId(o.id);
    setArrive(null);
    setDepart(null);
    setWarn('');
    setPeople((p) => Math.min(Math.max(p, o.minPeople), o.maxPeople));
  };

  const rangeClear = (a: string, b: string) => {
    for (let d = fromISO(a); iso(d) < b; d = addDays(d, 1)) if (isBooked(d, salt)) return false;
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
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1900);
  };

  const steps = ['Choose', 'Dates', 'Details', 'Payment', 'Booked'];

  /* ---------- summary panel ---------- */
  const summary = (
    <aside className="relative h-fit rounded-[1.4rem] border-2 border-bark-900/10 bg-cream-100 p-6 lg:sticky lg:top-24">
      <span className="tape" aria-hidden="true"></span>
      <h3 className="font-display text-xl font-semibold text-bark-900">Your booking</h3>
      <dl className="mt-4 space-y-2.5 text-[0.95rem] text-cocoa/85">
        <div className="flex justify-between gap-4">
          <dt>Option</dt>
          <dd className="text-right font-bold text-bark-900">{option?.name ?? '—'}</dd>
        </div>
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
          <dd className="font-bold text-bark-900">{option ? people : '—'}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t-2 border-dashed border-cream-300 pt-4 text-[0.95rem]">
        <div className="flex justify-between text-cocoa/85">
          <span>
            {option
              ? isStay
                ? `${people} × ${nights || 0} nights × ${fmtR(option.rate)}`
                : `${people} × ${fmtR(option.rate)}`
              : 'Total'}
          </span>
          <span className="font-bold text-bark-900">{total ? fmtR(total) : '—'}</span>
        </div>
        <div className="mt-2 flex justify-between text-cocoa/85">
          <span>Deposit due now{isStay && option ? ' (50%)' : ''}</span>
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
  if (step === 4 && option) {
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
          <strong className="text-bark-900">{option.name}</strong> ·{' '}
          {isStay ? `${fmtLong(arrive!)} → ${fmtLong(depart!)} · ${people} people` : `${fmtLong(arrive!)} · ${people} guests`} ·
          deposit of {fmtR(deposit)} received. A confirmation with directions and your balance ({fmtR(balance)}) is on its way to{' '}
          <strong className="text-bark-900">{email}</strong>.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-cocoa/70">
          {phone && <>Need to change anything? Call {phone} and quote your reference.</>}
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
              <span className={`${i === step ? 'text-bark-900' : 'text-bark-700/50'} hidden sm:inline`}>{s}</span>
              {i < steps.length - 1 && <span className="mx-0.5 h-[2px] w-4 bg-bark-900/15" aria-hidden="true"></span>}
            </li>
          ))}
        </ol>

        {/* ============ STEP 0: CHOOSE ============ */}
        {step === 0 && (
          <div className="mt-6">
            <p className="hand text-xl text-bark-700/80">what kind of visit is this?</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {OPTIONS.map((o) => {
                const active = optionId === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => chooseOption(o)}
                    aria-pressed={active}
                    className={`relative rounded-[1.2rem] border-2 p-5 text-left transition ${
                      active
                        ? 'border-bark-950 bg-marigold-400/25 shadow-[0.2rem_0.25rem_0_rgb(51_41_28/0.85)]'
                        : 'border-bark-900/12 bg-paper hover:border-bark-900/30 hover:bg-cream-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span dangerouslySetInnerHTML={{ __html: o.icon }} />
                      {active && (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-marigold-400 text-sm font-extrabold text-bark-950 ring-2 ring-bark-950">✓</span>
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-xl font-semibold text-bark-900">{o.name}</h3>
                    <p className="hand mt-0.5 text-lg leading-snug text-bark-700/85">{o.blurb}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.78rem] font-bold">
                      <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-bark-900">{o.rateLabel}</span>
                      <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-bark-700/80">{o.sleeps}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" disabled={!option} onClick={() => setStep(1)} className="btn btn-marigold disabled:cursor-not-allowed disabled:opacity-40">
                {option ? `Continue with ${option.name}` : 'Pick an option to continue'}
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 1: DATES ============ */}
        {step === 1 && option && (
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
                {isStay ? `${option.name} — arrival, then departure` : 'pick your event day'}
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
              <Month year={base.getFullYear()} month={base.getMonth()} arrive={arrive} depart={depart} salt={salt} onPick={pick} />
              <div className="hidden sm:block">
                <Month year={next.getFullYear()} month={next.getMonth()} arrive={arrive} depart={depart} salt={salt} onPick={pick} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-bark-700/60">
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-marigold-400"></span> selected</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-cream-100"></span> <s>booked</s></span>
            </div>

            {warn && <p className="mt-3 rounded-lg bg-ember/10 px-4 py-2 text-sm font-bold text-ember">{warn}</p>}

            <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
              <label className="block">
                <span className="text-sm font-bold text-bark-900">
                  {isStay ? 'People' : 'Guests'} (min {option.minPeople}, max {option.maxPeople})
                </span>
                <div className="mt-1.5 flex items-center gap-3">
                  <button type="button" onClick={() => setPeople((p) => Math.max(option.minPeople, p - 1))} className="grid h-10 w-10 place-items-center rounded-full border-2 border-bark-900/15 text-lg font-bold text-bark-900 hover:bg-cream-100">−</button>
                  <span className="w-8 text-center text-lg font-extrabold text-bark-900">{people}</span>
                  <button type="button" onClick={() => setPeople((p) => Math.min(option.maxPeople, p + 1))} className="grid h-10 w-10 place-items-center rounded-full border-2 border-bark-900/15 text-lg font-bold text-bark-900 hover:bg-cream-100">+</button>
                </div>
              </label>
              <div className="flex items-center gap-5">
                <button type="button" onClick={() => setStep(0)} className="font-bold text-bark-700/70 underline-offset-4 hover:underline">← Options</button>
                <button type="button" disabled={!datesDone} onClick={() => setStep(2)} className="btn btn-marigold disabled:cursor-not-allowed disabled:opacity-40">
                  Continue {total > 0 && `· ${fmtR(total)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 2: DETAILS ============ */}
        {step === 2 && (
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
              <button type="button" onClick={() => setStep(1)} className="font-bold text-bark-700/70 underline-offset-4 hover:underline">← Dates</button>
              <button type="button" disabled={!detailsDone} onClick={() => setStep(3)} className="btn btn-marigold disabled:cursor-not-allowed disabled:opacity-40">
                Continue to payment
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 3: PAYMENT ============ */}
        {step === 3 && (
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
                  reference <strong className="text-bark-900">{ref}</strong>. It clears immediately and your booking is locked in.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <button type="button" onClick={() => setStep(2)} className="font-bold text-bark-700/70 underline-offset-4 hover:underline">← Details</button>
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
