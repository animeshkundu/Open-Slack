import { UserStatus } from '../types';

export interface StatusPreset {
  id: string;
  emoji: string;
  text: string;
  defaultDurationMinutes?: number | null; // null = don't clear
}

export const STATUS_PRESETS: StatusPreset[] = [
  { id: 'meeting', emoji: '📅', text: 'In a meeting', defaultDurationMinutes: 60 },
  { id: 'commuting', emoji: '🚌', text: 'Commuting', defaultDurationMinutes: 30 },
  { id: 'sick', emoji: '🤒', text: 'Out sick', defaultDurationMinutes: 1440 }, // Today (24h)
  { id: 'vacation', emoji: '🌴', text: 'Vacationing', defaultDurationMinutes: 7200 }, // 5 days
  { id: 'remote', emoji: '🏡', text: 'Working remotely', defaultDurationMinutes: 480 }, // Today (8h)
  { id: 'focus', emoji: '🎯', text: 'Focusing', defaultDurationMinutes: 120 }, // 2h
  { id: 'lunch', emoji: '🍔', text: 'Out for lunch', defaultDurationMinutes: 30 },
];

export const EXPIRY_OPTIONS = [
  { label: "Don't clear", minutes: null },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: 'Today', minutes: 720 },
  { label: 'This week', minutes: 10080 },
];

export function isStatusExpired(statusDetails?: UserStatus): boolean {
  if (!statusDetails?.expiresAt) return false;
  try {
    const expiry = new Date(statusDetails.expiresAt).getTime();
    return !isNaN(expiry) && expiry <= Date.now();
  } catch {
    return false;
  }
}

export function computeExpiryIso(minutes: number | null): string | undefined {
  if (minutes === null || minutes === undefined) return undefined;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function formatStatusDisplay(statusDetails?: UserStatus, legacyStatus?: string): string {
  if (statusDetails && !isStatusExpired(statusDetails)) {
    const emoji = statusDetails.customEmoji || '';
    const text = statusDetails.customText || statusDetails.customMessage || '';
    if (emoji && text) return `${emoji} ${text}`;
    if (emoji) return emoji;
    if (text) return text;
  }
  return legacyStatus || '';
}
