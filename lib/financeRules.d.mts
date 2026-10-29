export type LedgerEffect = 'savings-deposit' | 'chama-unallocated-contribution' | 'none';

export interface FinanceTransaction {
  budgetMonth?: string;
  category?: string;
  amount?: number | string | null;
  [key: string]: unknown;
}

export interface MonthMetrics {
  transactions: FinanceTransaction[];
  totalRecovered: number;
  totalOutflows: number;
  netSpend: number;
  remainingBudget: number;
  categorySpend: Record<string, number>;
}

export function getLedgerEffectForCategory(category: unknown): LedgerEffect;
export function calculateMonthMetrics(
  transactions: FinanceTransaction[],
  selectedMonth: string,
  budgetTotal?: number,
): MonthMetrics;
