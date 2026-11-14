import { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Filter,
  MapPin,
  PlusCircle,
  Search,
} from 'lucide-react';
import { seedSampleComplaintsForAdmin } from '../services/campusService';
import {
  AppTab,
  CATEGORIES,
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  PRIORITIES,
  STATUSES,
} from '../types/campus';
import { CategoryChart } from './CategoryChart';
import {
  formatRelativeTime,
  getCategoryMeta,
  getStatusTextClass,
  PriorityInline,
} from './ComplaintHelpers';

interface HomeViewProps {
  currentUser: User;
  userName: string;
  isAdmin: boolean;
  adminMode: boolean;
  onToggleAdminMode: (val: boolean) => void;
  complaints: Complaint[];
  loading: boolean;
  onNavigateTab: (tab: AppTab, prefillCategory?: ComplaintCategory) => void;
  onSelectComplaint: (complaint: Complaint) => void;
}

export function HomeView({
  currentUser,
  userName,
  isAdmin,
  adminMode,
  onToggleAdminMode,
  complaints,
  loading,
  onNavigateTab,
  onSelectComplaint,
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'All'>('All');
  const [seeding, setSeeding] = useState(false);

  const stats = useMemo(() => {
    const total = complaints.length;
    const open = complaints.filter((c) => c.status !== 'Resolved').length;
    const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
    const highPriorityOpen = complaints.filter(
      (c) => c.priority === 'High' && c.status !== 'Resolved'
    ).length;
    const resolved = complaints.filter((c) => c.status === 'Resolved').length;
    return { total, open, inProgress, highPriorityOpen, resolved };
  }, [complaints]);

  const filteredAdminComplaints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return complaints.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && c.priority !== priorityFilter) return false;
      if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
      if (q) {
        const hay = `${c.ticketCode} ${c.location} ${c.description} ${c.category} ${c.reporterName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [complaints, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const handleSeedSamples = async () => {
    setSeeding(true);
    try {
      await seedSampleComplaintsForAdmin(currentUser, userName);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting & Admin Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {adminMode ? 'Facilities Operations Console' : 'Campus Maintenance Portal'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
            {adminMode ? 'Campus Triage Dashboard' : `Welcome back, ${userName.split(' ')[0]}`}
          </h1>
        </div>

        {isAdmin && (
          <div
            role="group"
            aria-label="Workspace mode"
            className="inline-flex p-1 rounded-xl bg-slate-200/75 dark:bg-slate-800/80 self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() => onToggleAdminMode(true)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                adminMode
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Admin Dashboard
            </button>
            <button
              type="button"
              onClick={() => onToggleAdminMode(false)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                !adminMode
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Student View
            </button>
          </div>
        )}
      </div>

      {adminMode ? (
        /* ================= ADMIN DASHBOARD ================= */
        <div className="space-y-6">
          {/* KPI Count Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Reports
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Open Queue
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
                {stats.open}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                <span>High Priority Open</span>
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400 mt-1">
                {stats.highPriorityOpen}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Resolved
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.resolved}
              </p>
            </div>
          </div>

          {/* Chart by Category + Search/Filter Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5">
              <CategoryChart
                complaints={complaints}
                selectedCategory={categoryFilter}
                onSelectCategory={setCategoryFilter}
              />
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Manage Complaints ({filteredAdminComplaints.length})
                </h2>
                {complaints.length === 0 && !loading && (
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedSamples}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{seeding ? 'Loading...' : 'Load Sample Campus Issues'}</span>
                  </button>
                )}
              </div>

              {/* Search & Filters */}
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
                    placeholder="Search ticket ID, location, student, or keyword..."
                    aria-label="Search complaints"
                    className="w-full min-h-[44px] pl-10 pr-4 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status filter tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(['All', ...STATUSES] as const).map((st) => {
                    const active = statusFilter === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>

                {/* Priority filter row */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                    Priority:
                  </span>
                  {(['All', ...PRIORITIES] as const).map((pr) => {
                    const active = priorityFilter === pr;
                    return (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => setPriorityFilter(pr)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          active
                            ? 'bg-blue-600 text-white dark:bg-blue-500'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {pr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Complaint List */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredAdminComplaints.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {complaints.length === 0
                      ? 'No campus complaints recorded yet.'
                      : 'No complaints match your current filters.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {complaints.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('All');
                          setPriorityFilter('All');
                          setCategoryFilter('All');
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      >
                        Reset All Filters
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleSeedSamples}
                          disabled={seeding}
                          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {seeding ? 'Loading Sample Data...' : 'Load Sample Campus Issues'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('report')}
                          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          Submit First Report
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAdminComplaints.map((c) => {
                    const meta = getCategoryMeta(c.category);
                    const Icon = meta.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectComplaint(c)}
                        className="w-full text-left py-3.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 group"
                      >
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.iconBg}`}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {c.ticketCode}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{c.category}</span>
                            <span aria-hidden="true">·</span>
                            <PriorityInline priority={c.priority} />
                            <span aria-hidden="true">·</span>
                            <span className={getStatusTextClass(c.status)}>{c.status}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">
                            {c.location}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {c.description}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                            {c.reporterName} · {formatRelativeTime(c.updatedAtMs)}
                          </p>
                        </div>
                        <ChevronRight
                          className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 mt-3"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================= STUDENT HOME ================= */
        <div className="space-y-6">
          {/* Primary Action Card */}
          <section className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Spot something broken or unsafe on campus?
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Submit a location, description, and optional photo. CampusFix automatically categorises the issue and assigns urgency so maintenance crews respond fast.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('report')}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0 transition-colors active:scale-[0.99]"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Report a Problem</span>
            </button>
          </section>

          {/* Student Status Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {stats.open}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                {stats.inProgress}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Resolved</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.resolved}
              </p>
            </div>
          </div>

          {/* Quick Report Categories */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Quick Report by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((category) => {
                const meta = getCategoryMeta(category);
                const Icon = meta.icon;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onNavigateTab('report', category)}
                    className="min-h-[60px] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors flex items-center gap-3 text-left"
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {category}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent Reports */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Your Recent Reports
              </h2>
              {complaints.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('track')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 hover:underline min-h-[36px]"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
                <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
              </div>
            ) : complaints.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You have not submitted any campus complaints yet.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('report')}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  Submit Your First Report
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {complaints.slice(0, 4).map((c) => {
                  const meta = getCategoryMeta(c.category);
                  const Icon = meta.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectComplaint(c)}
                      className="w-full text-left py-3.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3"
                    >
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.iconBg}`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {c.ticketCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{c.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`inline-flex items-center gap-1 ${getStatusTextClass(c.status)}`}>
                            {c.status === 'Resolved' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            {c.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="truncate">{c.location}</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {c.latestNote}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 mt-1">
                        {formatRelativeTime(c.updatedAtMs)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
