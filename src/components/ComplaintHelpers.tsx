import {
  AlertTriangle,
  Droplets,
  ShieldAlert,
  Sparkles,
  Utensils,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '../types/campus';

export function getCategoryMeta(category: ComplaintCategory) {
  switch (category) {
    case 'Electrical':
      return {
        icon: Zap,
        iconBg: 'bg-amber-500/12 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
        barColor: 'bg-amber-500 dark:bg-amber-400',
      };
    case 'Water':
      return {
        icon: Droplets,
        iconBg: 'bg-sky-500/12 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400',
        barColor: 'bg-sky-500 dark:bg-sky-400',
      };
    case 'Internet':
      return {
        icon: Wifi,
        iconBg: 'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400',
        barColor: 'bg-indigo-500 dark:bg-indigo-400',
      };
    case 'Cleanliness':
      return {
        icon: Sparkles,
        iconBg: 'bg-teal-500/12 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400',
        barColor: 'bg-teal-500 dark:bg-teal-400',
      };
    case 'Safety':
      return {
        icon: ShieldAlert,
        iconBg: 'bg-rose-500/12 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400',
        barColor: 'bg-rose-500 dark:bg-rose-400',
      };
    case 'Food':
      return {
        icon: Utensils,
        iconBg: 'bg-orange-500/12 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400',
        barColor: 'bg-orange-500 dark:bg-orange-400',
      };
  }
}

export function getPriorityTextClass(priority: ComplaintPriority): string {
  switch (priority) {
    case 'High':
      return 'text-red-600 dark:text-red-400 font-semibold';
    case 'Medium':
      return 'text-amber-600 dark:text-amber-400 font-medium';
    case 'Low':
      return 'text-slate-600 dark:text-slate-400 font-medium';
  }
}

export function getStatusTextClass(status: ComplaintStatus): string {
  switch (status) {
    case 'Submitted':
      return 'text-blue-600 dark:text-blue-400 font-medium';
    case 'Assigned':
      return 'text-violet-600 dark:text-violet-400 font-medium';
    case 'In Progress':
      return 'text-amber-600 dark:text-amber-400 font-semibold';
    case 'Resolved':
      return 'text-emerald-600 dark:text-emerald-400 font-semibold';
  }
}

export function formatRelativeTime(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PriorityInline({ priority }: { priority: ComplaintPriority }) {
  return (
    <span className={`inline-flex items-center gap-1 ${getPriorityTextClass(priority)}`}>
      {priority === 'High' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{priority} Priority</span>
    </span>
  );
}
