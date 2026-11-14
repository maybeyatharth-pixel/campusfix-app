import { CATEGORIES, Complaint, ComplaintCategory } from '../types/campus';
import { getCategoryMeta } from './ComplaintHelpers';

interface CategoryChartProps {
  complaints: Complaint[];
  selectedCategory: ComplaintCategory | 'All';
  onSelectCategory: (category: ComplaintCategory | 'All') => void;
}

export function CategoryChart({
  complaints,
  selectedCategory,
  onSelectCategory,
}: CategoryChartProps) {
  const counts = CATEGORIES.map((category) => {
    const matching = complaints.filter((c) => c.category === category);
    const openCount = matching.filter((c) => c.status !== 'Resolved').length;
    return {
      category,
      total: matching.length,
      open: openCount,
    };
  });

  const maxCount = Math.max(1, ...counts.map((c) => c.total));
  const totalComplaints = complaints.length;

  return (
    <section
      aria-label="Complaints by category chart"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Reports by Category
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tap any bar to filter the queue below
          </p>
        </div>
        {selectedCategory !== 'All' && (
          <button
            type="button"
            onClick={() => onSelectCategory('All')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline min-h-[36px] px-2 whitespace-nowrap shrink-0"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {counts.map(({ category, total, open }) => {
          const meta = getCategoryMeta(category);
          const Icon = meta.icon;
          const pct = totalComplaints > 0 ? Math.round((total / totalComplaints) * 100) : 0;
          const barWidth = total > 0 ? Math.max(6, Math.round((total / maxCount) * 100)) : 0;
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(isSelected ? 'All' : category)}
              className={`w-full text-left rounded-xl p-2 -mx-1 transition-colors min-h-[44px] flex flex-col justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {category}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
                  <span>{open} open</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {total}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 w-9 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${meta.barColor}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
