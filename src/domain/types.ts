export type ObligationType = 'دائم' | 'مؤقت-أشهر' | 'مؤقت-تاريخ';

export type ObligationStatus = 'مدفوع' | 'متأخر' | 'قادم' | 'منتهي';

export type ObligationCategory =
  | 'إيجار'
  | 'فواتير'
  | 'أقساط'
  | 'تأمين'
  | 'اشتراكات'
  | 'مصاريف ثابتة'
  | 'أخرى';

export interface Obligation {
  id: number;
  name: string;
  cat: string;
  amount: number;
  amountHistory?: Array<{ fromMonth: string; amount: number }>;
  dueDay: number;
  dueDayHistory?: Array<{ fromMonth: string; dueDay: number }>;
  type: ObligationType;
  startMonth?: string;
  totalMonths?: number;
  remainingMonths?: number;
  initialMonths?: number;
  endDate?: string | null;
  notes: string;
  lastPaidMonth: string | null;
  partialPaidAmount?: number;
  partialPaidMonth?: string | null;
  paymentLedgerVersion?: 1;
  finished: boolean;
  createdAt: string;
}

export interface HistoryEntry {
  id: number;
  oblId: number;
  name: string;
  cat: string;
  amount: number;
  method: string;
  paidDate: string;
  monthLabel: string;
  paymentMonth?: string;
}

export interface PaymentResult {
  completed: boolean;
  paidTotal: number;
  remaining: number;
  targetMonth: string;
}

export interface ThemeVars {
  [cssVar: string]: string;
}

export interface PresetTheme {
  name: string;
  vars: ThemeVars;
}

export interface BackupPayload {
  obligations: Obligation[];
  history: HistoryEntry[];
  salary: number | null;
  theme: ThemeVars | null;
  exportedAt: string;
  version: 1;
}
