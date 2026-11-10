export interface AnalyticsSeriesPoint {
  key: string;
  label: string;
  realCents: number;
  simulatedCents: number;
  pendingCents: number;
  totalCents: number;
  appointmentsCount: number;
}

export interface AnalyticsPaymentRecord {
  amountCents: number;
  status: string;
  method?: string;
  isSimulated: boolean;
  createdAt: Date | string;
  confirmedAt?: Date | string | null;
}

export interface AnalyticsAppointmentRecord {
  startAt: Date | string;
  status: string;
}

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const PT_BR_SHORT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function resolveSafeTz(timezone?: string | null): string {
  const candidate = timezone?.trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function getDatePartsInTz(dateInput: Date | string, timezone?: string | null) {
  const tz = resolveSafeTz(timezone);
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value || date.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === "month")?.value || date.getUTCMonth() + 1);
  const day = Number(parts.find((p) => p.type === "day")?.value || date.getUTCDate());

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    year,
    month,
    day,
    dayKey: `${year}-${pad(month)}-${pad(day)}`,
    monthKey: `${year}-${pad(month)}`,
    shortDayLabel: `${pad(day)}/${pad(month)}`,
    shortMonthLabel: `${PT_BR_SHORT_MONTHS[(month - 1 + 12) % 12]}/${String(year).slice(-2)}`,
  };
}

function generateDailyBuckets(days: number, refYear: number, refMonth: number, refDay: number) {
  const buckets: AnalyticsSeriesPoint[] = [];
  const map = new Map<string, AnalyticsSeriesPoint>();
  const pad = (n: number) => String(n).padStart(2, "0");

  for (let offset = days - 1; offset >= 0; offset--) {
    const dt = new Date(Date.UTC(refYear, refMonth - 1, refDay - offset, 12, 0, 0));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    const key = `${y}-${pad(m)}-${pad(d)}`;
    const point: AnalyticsSeriesPoint = {
      key,
      label: `${pad(d)}/${pad(m)}`,
      realCents: 0,
      simulatedCents: 0,
      pendingCents: 0,
      totalCents: 0,
      appointmentsCount: 0,
    };
    buckets.push(point);
    map.set(key, point);
  }

  return { buckets, map };
}

function generateMonthlyBuckets(months: number, refYear: number, refMonth: number) {
  const buckets: AnalyticsSeriesPoint[] = [];
  const map = new Map<string, AnalyticsSeriesPoint>();
  const pad = (n: number) => String(n).padStart(2, "0");

  for (let offset = months - 1; offset >= 0; offset--) {
    const dt = new Date(Date.UTC(refYear, refMonth - 1 - offset, 15, 12, 0, 0));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const key = `${y}-${pad(m)}`;
    const point: AnalyticsSeriesPoint = {
      key,
      label: `${PT_BR_SHORT_MONTHS[m - 1]}/${String(y).slice(-2)}`,
      realCents: 0,
      simulatedCents: 0,
      pendingCents: 0,
      totalCents: 0,
      appointmentsCount: 0,
    };
    buckets.push(point);
    map.set(key, point);
  }

  return { buckets, map };
}

export function buildRevenueSeries({
  payments,
  appointments = [],
  timezone,
  referenceDate = new Date(),
}: {
  payments: AnalyticsPaymentRecord[];
  appointments?: AnalyticsAppointmentRecord[];
  timezone?: string | null;
  referenceDate?: Date;
}) {
  const tz = resolveSafeTz(timezone);
  const ref = getDatePartsInTz(referenceDate, tz);

  const d14 = generateDailyBuckets(14, ref.year, ref.month, ref.day);
  const d30 = generateDailyBuckets(30, ref.year, ref.month, ref.day);
  const m6 = generateMonthlyBuckets(6, ref.year, ref.month);

  for (const p of payments) {
    const eventTimestamp =
      p.status === "APPROVED" && p.confirmedAt ? p.confirmedAt : p.createdAt;
    const parts = getDatePartsInTz(eventTimestamp, tz);

    const targets = [
      d14.map.get(parts.dayKey),
      d30.map.get(parts.dayKey),
      m6.map.get(parts.monthKey),
    ];

    for (const bucket of targets) {
      if (!bucket) continue;
      if (p.status === "APPROVED") {
        if (p.isSimulated) {
          bucket.simulatedCents += p.amountCents;
        } else {
          bucket.realCents += p.amountCents;
        }
      } else if (p.status === "PENDING") {
        bucket.pendingCents += p.amountCents;
      }
      bucket.totalCents = bucket.realCents + bucket.simulatedCents + bucket.pendingCents;
    }
  }

  for (const appt of appointments) {
    if (appt.status === "CANCELLED") continue;
    const parts = getDatePartsInTz(appt.startAt, tz);
    const b14 = d14.map.get(parts.dayKey);
    const b30 = d30.map.get(parts.dayKey);
    const bm6 = m6.map.get(parts.monthKey);
    if (b14) b14.appointmentsCount += 1;
    if (b30) b30.appointmentsCount += 1;
    if (bm6) bm6.appointmentsCount += 1;
  }

  return {
    d14: d14.buckets,
    d30: d30.buckets,
    m6: m6.buckets,
  };
}
