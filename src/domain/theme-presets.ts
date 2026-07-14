import type { PresetTheme } from './types';

export interface EditableVarDef {
  key: string;
  label: string;
}

export const EDITABLE_VARS: EditableVarDef[] = [
  { key: '--navy', label: 'الخلفية الرئيسية' },
  { key: '--navy2', label: 'الخلفية الثانوية' },
  { key: '--blue', label: 'اللون الأساسي (أزرق)' },
  { key: '--blue-lt', label: 'الأزرق الفاتح' },
  { key: '--green', label: 'اللون الأخضر' },
  { key: '--red', label: 'اللون الأحمر' },
  { key: '--orange', label: 'اللون البرتقالي' },
  { key: '--card', label: 'لون الكارد' },
  { key: '--card2', label: 'لون الكارد الثانوي' },
  { key: '--border', label: 'لون الحدود' },
  { key: '--text', label: 'لون النص الرئيسي' },
  { key: '--text2', label: 'لون النص الثانوي' },
];

export const PRESET_THEMES: PresetTheme[] = [
  {
    name: '🌑 داكن (افتراضي)',
    vars: {
      '--navy': '#0B1929', '--navy2': '#122338', '--blue': '#1A6FD4', '--blue-lt': '#2E8AF0',
      '--green': '#0D9E5C', '--red': '#E53E3E', '--orange': '#DD6B20',
      '--card': '#132030', '--card2': '#0F1E2E', '--border': '#1E3347',
      '--text': '#E8F0FA', '--text2': '#8BA8C2',
    },
  },
  {
    name: '🌿 أخضر',
    vars: {
      '--navy': '#0A1F14', '--navy2': '#112A1C', '--blue': '#16A34A', '--blue-lt': '#22C55E',
      '--green': '#15803D', '--red': '#DC2626', '--orange': '#D97706',
      '--card': '#0F2218', '--card2': '#0A1A12', '--border': '#1A3825',
      '--text': '#ECFDF5', '--text2': '#86EFAC',
    },
  },
  {
    name: '🟣 بنفسجي',
    vars: {
      '--navy': '#0F0A1E', '--navy2': '#1A1030', '--blue': '#7C3AED', '--blue-lt': '#A78BFA',
      '--green': '#059669', '--red': '#EF4444', '--orange': '#F59E0B',
      '--card': '#160D2A', '--card2': '#100820', '--border': '#2D1B5E',
      '--text': '#F5F3FF', '--text2': '#C4B5FD',
    },
  },
  {
    name: '🔴 أحمر',
    vars: {
      '--navy': '#1A0A0A', '--navy2': '#2A1010', '--blue': '#DC2626', '--blue-lt': '#F87171',
      '--green': '#16A34A', '--red': '#991B1B', '--orange': '#EA580C',
      '--card': '#200C0C', '--card2': '#180808', '--border': '#3B1515',
      '--text': '#FFF1F2', '--text2': '#FECACA',
    },
  },
  {
    name: '🌊 مائي',
    vars: {
      '--navy': '#042F2E', '--navy2': '#064E3B', '--blue': '#0D9488', '--blue-lt': '#2DD4BF',
      '--green': '#059669', '--red': '#E11D48', '--orange': '#D97706',
      '--card': '#065F46', '--card2': '#044039', '--border': '#0F766E',
      '--text': '#F0FDFA', '--text2': '#99F6E4',
    },
  },
  {
    name: '🌙 رمادي',
    vars: {
      '--navy': '#111827', '--navy2': '#1F2937', '--blue': '#6366F1', '--blue-lt': '#818CF8',
      '--green': '#10B981', '--red': '#EF4444', '--orange': '#F59E0B',
      '--card': '#1F2937', '--card2': '#111827', '--border': '#374151',
      '--text': '#F9FAFB', '--text2': '#9CA3AF',
    },
  },
];

export function rgbToHex(str: string | null | undefined): string {
  if (!str) return '#000000';
  if (str.startsWith('#')) {
    let h = str.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return '#' + h.padEnd(6, '0').slice(0, 6);
  }
  const m = str.match(/\d+/g);
  if (!m || m.length < 3) return '#000000';
  return '#' + m.slice(0, 3).map((n) => parseInt(n).toString(16).padStart(2, '0')).join('');
}
