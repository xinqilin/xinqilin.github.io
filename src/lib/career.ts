// Work history: the profile card's years and the /about/ experience list read from here. Newest first.
type YearMonth = [number, number];

export interface Job {
  company: string;
  role: string;
  place: string;
  start: YearMonth;
  end?: YearMonth;
  /** HTML; <strong> marks the metric. */
  bullets: string[];
  chips: string[];
}

export const JOBS: Job[] = [
  {
    company: '104 Corporation',
    role: 'Software Engineer',
    place: 'New Taipei City, Taiwan',
    start: [2021, 7],
    bullets: [
      'Built and maintained the billing &amp; payment platform serving <strong>7 business units</strong>.',
      'Led on-prem &rarr; AWS migration; cut weekly maintenance incidents <strong>2&ndash;3&times;</strong>.',
      'Built E2E tests with WebdriverIO; eliminated <strong>30+ min</strong> manual QA per release.',
      'Internal speaker (<strong>200+ engineers</strong>): Kotlin migration, GraalVM, API-first design.',
    ],
    chips: ['Spring Boot', 'MySQL', 'AWS', 'Kotlin', 'TypeScript'],
  },
  {
    company: 'CASHIER TECH. CORP., LTD.',
    role: 'Software Engineer',
    place: 'Xizhi, New Taipei',
    start: [2020, 8],
    end: [2021, 3],
    bullets: ['Spring Boot backend for a kiosk ordering system across 50 stores.'],
    chips: ['Spring Boot', 'Android', 'Kotlin'],
  },
  {
    company: 'Hongyang Tech',
    role: 'Software Engineer',
    place: 'on-site at Far EasTone',
    start: [2019, 9],
    end: [2020, 7],
    bullets: ['Lease management forms and CRUD APIs at a telecom client site.'],
    chips: ['Java', 'Oracle'],
  },
  {
    company: 'Eagle Industry Taiwan',
    role: 'Software Engineer',
    place: 'Kaohsiung',
    start: [2018, 1],
    end: [2019, 1],
    bullets: ['Internal e-portal for a 500-person company.'],
    chips: ['Java', 'JSP', 'Servlet'],
  },
];

const monthIndex = ([y, m]: YearMonth) => y * 12 + m - 1;
export const thisMonth = (now = new Date()): YearMonth => [now.getFullYear(), now.getMonth() + 1];

/** Past jobs count both end months (as on the old CV); the current job counts whole months so far. */
export const monthsOf = (job: Job, now = thisMonth()) =>
  job.end ? monthIndex(job.end) - monthIndex(job.start) + 1 : monthIndex(now) - monthIndex(job.start);

/** Computed at build time; the site is rebuilt on every push. */
export const totalYears = (now = thisMonth()) => Math.floor(JOBS.reduce((n, j) => n + monthsOf(j, now), 0) / 12);

export function formatSpan(months: number) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ');
}

const formatMonth = ([y, m]: YearMonth) => `${y}/${String(m).padStart(2, '0')}`;
export const period = (job: Job) => `${formatMonth(job.start)} — ${job.end ? formatMonth(job.end) : 'Present'}`;
