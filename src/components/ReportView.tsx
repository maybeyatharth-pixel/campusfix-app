import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Send,
  Trash2,
  Wand2,
} from 'lucide-react';
import { compressImageFile } from '../lib/imageUtils';
import { createComplaint, requestAutoTriage } from '../services/campusService';
import {
  AppTab,
  CATEGORIES,
  ComplaintCategory,
  ComplaintPriority,
  PRIORITIES,
  QUICK_LOCATIONS,
} from '../types/campus';
import { getCategoryMeta, PriorityInline } from './ComplaintHelpers';

interface ReportViewProps {
  currentUser: User;
  userName: string;
  initialCategory?: ComplaintCategory;
  onSubmitted: (tab: AppTab) => void;
}

export function ReportView({
  currentUser,
  userName,
  initialCategory,
  onSubmitted,
}: ReportViewProps) {
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoProcessing, setPhotoProcessing] = useState(false);

  const [triageLoading, setTriageLoading] = useState(false);
  const [triagePreview, setTriagePreview] = useState<{
    category: ComplaintCategory;
    priority: ComplaintPriority;
    reason: string;
  } | null>(
    initialCategory
      ? {
          category: initialCategory,
          priority: 'Medium',
          reason: `Pre-selected ${initialCategory} category; priority will refine automatically on submit.`,
        }
      : null
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketCode: string;
    category: ComplaintCategory;
    priority: ComplaintPriority;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (initialCategory) {
      setTriagePreview({
        category: initialCategory,
        priority: 'Medium',
        reason: `Pre-selected ${initialCategory} category; priority will refine automatically on submit.`,
      });
    }
  }, [initialCategory]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhotoProcessing(true);
    try {
      const compressed = await compressImageFile(file);
      setPhotoDataUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process photo.');
    } finally {
      setPhotoProcessing(false);
      e.target.value = '';
    }
  };

  const handleAutoAnalyze = async () => {
    if (description.trim().length < 5) {
      setError('Please describe the issue (at least 5 characters) before analysing.');
      return;
    }
    setError(null);
    setTriageLoading(true);
    try {
      const result = await requestAutoTriage({
        location: location.trim() || 'Campus',
        description: description.trim(),
        photoDataUrl,
      });
      setTriagePreview({
        category: result.category,
        priority: result.priority,
        reason: result.reason,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-categorisation failed.');
    } finally {
      setTriageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (location.trim().length < 2) {
      setError('Please enter where the problem is located.');
      return;
    }
    if (description.trim().length < 5) {
      setError('Please provide a description of at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      let finalTriage = triagePreview;
      // If user hasn't manually triggered preview (or used initial placeholder), run auto-triage now
      if (!finalTriage || finalTriage.reason.startsWith('Pre-selected ')) {
        const res = await requestAutoTriage({
          location: location.trim(),
          description: description.trim(),
          photoDataUrl,
        });
        finalTriage = {
          category: res.category,
          priority: res.priority,
          reason: res.reason,
        };
      }

      const { ticketCode } = await createComplaint({
        user: currentUser,
        reporterName: userName,
        location: location.trim(),
        description: description.trim(),
        category: finalTriage.category,
        priority: finalTriage.priority,
        triageReason: finalTriage.reason,
        photoDataUrl,
      });

      setSubmittedTicket({
        ticketCode,
        category: finalTriage.category,
        priority: finalTriage.priority,
        reason: finalTriage.reason,
      });
      setLocation('');
      setDescription('');
      setPhotoDataUrl(undefined);
      setTriagePreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedTicket) {
    const meta = getCategoryMeta(submittedTicket.category);
    const Icon = meta.icon;
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {submittedTicket.ticketCode}
            </p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Complaint Submitted
            </h1>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${meta.iconBg}`}>
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {submittedTicket.category}
            </span>
            <span aria-hidden="true">·</span>
            <PriorityInline priority={submittedTicket.priority} />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {submittedTicket.reason}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => onSubmitted('track')}
            className="flex-1 min-h-[48px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            View Status Timeline
          </button>
          <button
            type="button"
            onClick={() => setSubmittedTicket(null)}
            className="flex-1 min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
          >
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          New Maintenance Ticket
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
          Report a Campus Issue
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5"
      >
        {/* Location */}
        <div className="space-y-2">
          <label
            htmlFor="report-location"
            className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Location
          </label>
          <div className="relative">
            <MapPin
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="report-location"
              type="text"
              required
              maxLength={120}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Building, floor, room number, or outdoor area"
              className="w-full min-h-[46px] pl-10 pr-4 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick location buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocation(loc)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  location === loc
                    ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="report-description"
              className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Problem Description
            </label>
            <span className="text-xs font-mono text-slate-400">
              {description.length}/2000
            </span>
          </div>
          <textarea
            id="report-description"
            required
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, how severe it is, and whether anyone is at risk..."
            className="w-full px-3.5 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Optional Photo Upload */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
            Photo (Optional)
          </span>

          {photoDataUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
              <img
                src={photoDataUrl}
                alt="Complaint attachment preview"
                className="w-full max-h-56 object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoDataUrl(undefined)}
                aria-label="Remove attached photo"
                className="absolute top-2.5 right-2.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-950/80 text-white text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-950"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Remove</span>
              </button>
            </div>
          ) : (
            <label className="min-h-[72px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-950/60 px-4 py-4 flex items-center justify-center gap-3 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="sr-only"
              />
              {photoProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Optimising photo...
                  </span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Take photo or upload image
                  </span>
                </>
              )}
            </label>
          )}
        </div>

        {/* Auto-Categorisation Preview Panel */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Smart Auto-Categorisation & Priority
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically detects category and urgency when you submit
              </p>
            </div>
            <button
              type="button"
              onClick={handleAutoAnalyze}
              disabled={triageLoading || description.trim().length < 5}
              className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
            >
              {triageLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              )}
              <span>{triageLoading ? 'Analysing...' : 'Preview Classification'}</span>
            </button>
          </div>

          {triagePreview && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="preview-category"
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Detected Category
                  </label>
                  <select
                    id="preview-category"
                    value={triagePreview.category}
                    onChange={(e) =>
                      setTriagePreview((prev) =>
                        prev ? { ...prev, category: e.target.value as ComplaintCategory } : prev
                      )
                    }
                    className="w-full min-h-[40px] px-3 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
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
                    htmlFor="preview-priority"
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Assigned Priority
                  </label>
                  <select
                    id="preview-priority"
                    value={triagePreview.priority}
                    onChange={(e) =>
                      setTriagePreview((prev) =>
                        prev ? { ...prev, priority: e.target.value as ComplaintPriority } : prev
                      )
                    }
                    className="w-full min-h-[40px] px-3 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {triagePreview.reason}
              </p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || photoProcessing}
          className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Categorising & Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>Submit Complaint</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
