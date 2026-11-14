import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Send,
  X,
} from 'lucide-react';
import {
  subscribeToTimeline,
  updateComplaintByAdmin,
} from '../services/campusService';
import {
  CATEGORIES,
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  PRIORITIES,
  STATUSES,
  TimelineEvent,
} from '../types/campus';
import {
  formatFullDateTime,
  getCategoryMeta,
  getStatusTextClass,
  PriorityInline,
} from './ComplaintHelpers';

interface ComplaintDetailModalProps {
  complaint: Complaint;
  currentUser: User;
  currentUserName: string;
  isAdminView: boolean;
  onClose: () => void;
}

export function ComplaintDetailModal({
  complaint,
  currentUser,
  currentUserName,
  isAdminView,
  onClose,
}: ComplaintDetailModalProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState<ComplaintStatus>(complaint.status);
  const [newPriority, setNewPriority] = useState<ComplaintPriority>(complaint.priority);
  const [newCategory, setNewCategory] = useState<ComplaintCategory>(complaint.category);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setNewStatus(complaint.status);
    setNewPriority(complaint.priority);
    setNewCategory(complaint.category);
  }, [complaint]);

  useEffect(() => {
    setTimelineLoading(true);
    setTimelineError(null);
    const unsub = subscribeToTimeline(
      complaint.id,
      currentUser.uid,
      isAdminView,
      (events) => {
        setTimeline(events);
        setTimelineLoading(false);
      },
      (err) => {
        setTimelineError(err.message);
        setTimelineLoading(false);
      }
    );
    return () => unsub();
  }, [complaint.id, currentUser.uid, isAdminView]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const catMeta = getCategoryMeta(complaint.category);
  const CatIcon = catMeta.icon;
  const activeStageIdx = STATUSES.indexOf(complaint.status);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      await updateComplaintByAdmin({
        complaint,
        newStatus,
        note: adminNote.trim() || `Marked as ${newStatus}.`,
        newPriority,
        newCategory,
        adminUser: currentUser,
        adminName: currentUserName,
      });
      setAdminNote('');
      setSaveMessage('Status and timeline note saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${catMeta.iconBg}`}
            >
              <CatIcon className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {complaint.ticketCode}
                </span>
                <span aria-hidden="true">·</span>
                <span>{complaint.category}</span>
                <span aria-hidden="true">·</span>
                <PriorityInline priority={complaint.priority} />
              </div>
              <h2
                id="complaint-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="truncate">{complaint.location}</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket details"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-5 space-y-6">
          {/* Status Stage Stepper */}
          <div>
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Resolution Stage
              </span>
              <span className={getStatusTextClass(complaint.status)}>
                {complaint.status}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {STATUSES.map((stage, idx) => {
                const completed = idx <= activeStageIdx;
                const isCurrent = idx === activeStageIdx;
                return (
                  <div key={stage} className="flex flex-col gap-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-colors ${
                        completed
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                    <span
                      className={`text-[11px] leading-tight truncate ${
                        isCurrent
                          ? 'font-semibold text-slate-900 dark:text-slate-100'
                          : completed
                          ? 'text-slate-600 dark:text-slate-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description & Triage Rationale */}
          <div className="space-y-3">
            <p className="text-sm sm:text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {complaint.description}
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Reported by {complaint.reporterName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{formatFullDateTime(complaint.createdAtMs)}</span>
            </div>
            {complaint.triageReason && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5">
                Auto-triage note: {complaint.triageReason}
              </p>
            )}
          </div>

          {/* Optional Photo */}
          {complaint.photoDataUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
              <img
                src={complaint.photoDataUrl}
                alt={`Attached photo for ${complaint.ticketCode}`}
                referrerPolicy="no-referrer"
                className="w-full max-h-64 object-cover"
              />
            </div>
          )}

          {/* Status Timeline */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Status Timeline
            </h3>

            {timelineLoading ? (
              <div className="space-y-3">
                <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
                <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
              </div>
            ) : timelineError ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                Could not load timeline events.
              </p>
            ) : timeline.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Initial submission recorded at {formatFullDateTime(complaint.createdAtMs)}.
              </p>
            ) : (
              <ol className="relative space-y-4">
                {timeline.map((evt, idx) => {
                  const isLast = idx === timeline.length - 1;
                  return (
                    <li key={evt.id} className="relative pl-7">
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[11px] top-6 bottom-[-18px] w-px bg-slate-200 dark:bg-slate-800"
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                          evt.status === 'Resolved'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {evt.status === 'Resolved' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className={getStatusTextClass(evt.status)}>
                          {evt.status}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {evt.actorName} ({evt.actorRole === 'admin' ? 'Admin' : 'Student'})
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="font-mono text-slate-400 dark:text-slate-500">
                          {formatFullDateTime(evt.createdAtMs)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                        {evt.note}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Admin Update Form */}
          {isAdminView && (
            <form
              onSubmit={handleAdminSubmit}
              className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Admin Status Update
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Adds entry to student timeline
                </span>
              </div>

              {/* Status segmented buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUSES.map((st) => {
                  const active = newStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="admin-category-select"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="admin-category-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ComplaintCategory)}
                    className="w-full min-h-[44px] px-3 rounded-xl text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="admin-priority-select"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Priority
                  </label>
                  <select
                    id="admin-priority-select"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as ComplaintPriority)}
                    className="w-full min-h-[44px] px-3 rounded-xl text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-update-note"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Update Note for Student
                </label>
                <textarea
                  id="admin-update-note"
                  rows={2}
                  maxLength={500}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Electrician dispatched to replace the faulty breaker; power restored."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {saveError && (
                <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
              )}
              {saveMessage && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{saveMessage}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{saving ? 'Saving Update...' : 'Save Status Update'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
