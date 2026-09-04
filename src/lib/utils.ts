import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(timestamp: any): string {
  if (!timestamp) return '—';
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch {
    // fallback
  }
  return '—';
}

export function getTimeGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const userName = name ? `, ${name}` : '';
  if (hour < 12) {
    return `Good morning${userName}`;
  } else if (hour < 18) {
    return `Good afternoon${userName}`;
  } else {
    return `Good evening${userName}`;
  }
}
