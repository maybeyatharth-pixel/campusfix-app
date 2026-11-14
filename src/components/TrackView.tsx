import { useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  MapPin,
  Search,
} from 'lucide-react';
import {
  AppTab,
  Complaint,
  ComplaintStatus,
  STATUSES,
} from '../types/campus';
import {
  formatRelativeTime,
  getCategoryMeta,
  getStatusTextClass,
  PriorityInline,
} from './ComplaintHelpers';

interface TrackViewProps {
  complaints: Complaint[];
  loading: boolean;
  isAdminView: boolean;
  onSelectComplaint: (complaint: Complaint) => void;
  onNavigateTab: (tab: AppTab) => void;
}

export function TrackView({
  complaints,
  loading,
  isAdminView,
  onSelectComplaint,
  onNavigateTab,
}: TrackViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'All'>('All');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return complaints.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (q) {
        const hay = `${c.ticketCode} ${c.location} ${c.description} ${c.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [complaints, searchQuery, statusFilter]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {isAdminView ? 'All Campus Tickets' : 'Live Status Timeline'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
          Track Complaints
        </h1>
      </div>

      {/* Search & Status Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket code, location, or description..."
            aria-label="Search tracked complaints"
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['All', ...STATUSES] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {complaints.length === 0
                ? 'No complaints submitted yet.'
                : 'No tickets match your search or status filter.'}
            </p>
            {complaints.length === 0 ? (
              <button
                type="button"
                onClick={() => onNavigateTab('report')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Report an Issue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((c) => {
              const meta = getCategoryMeta(c.category);
              const Icon = meta.icon;
              const stageIdx = STATUSES.indexOf(c.status);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectComplaint(c)}
                  className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3.5"
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.iconBg}`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {c.ticketCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{c.category}</span>
                      <span aria-hidden="true">·</span>
                      <PriorityInline priority={c.priority} />
                      <span aria-hidden="true">·</span>
                      <span className={getStatusTextClass(c.status)}>{c.status}</span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">{c.location}</span>
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {c.latestNote || c.description}
                    </p>

                    {/* Mini timeline progress bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="grid grid-cols-4 gap-1 flex-1 max-w-xs">
                        {STATUSES.map((st, idx) => (
                          <div
                            key={st}
                            className={`h-1 rounded-full ${
                              idx <= stageIdx
                                ? 'bg-blue-600 dark:bg-blue-500'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 inline-flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {formatRelativeTime(c.updatedAtMs)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-3" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
