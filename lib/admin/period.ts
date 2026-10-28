// The spans the dashboard and Analytics show: the last 7, 30 or 90 days, 30 unless asked.
export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export const periodFrom = (value: unknown): Period => PERIODS.find((period) => period === Number(value)) ?? 30;
