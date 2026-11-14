import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  ClipboardList,
  HelpCircle,
  Home,
  LogIn,
  Moon,
  PlusCircle,
  Sun,
  User as UserIcon,
  Wrench,
} from 'lucide-react';
import campusQuadHero from './assets/images/campus_quad_hero_1794663837276.jpg';
import { ComplaintDetailModal } from './components/ComplaintDetailModal';
import { HelpView } from './components/HelpView';
import { HomeView } from './components/HomeView';
import { ProfileView } from './components/ProfileView';
import { ReportView } from './components/ReportView';
import { TrackView } from './components/TrackView';
import { auth, googleProvider } from './lib/firebase';
import {
  subscribeToComplaints,
  syncUserOnSignIn,
  updateUserProfile,
} from './services/campusService';
import {
  AppTab,
  Complaint,
  ComplaintCategory,
  ThemeMode,
  UserProfile,
} from './types/campus';

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  icon: typeof Home;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'report', label: 'Report', icon: PlusCircle },
  { id: 'track', label: 'Track', icon: ClipboardList },
  { id: 'help', label: 'Help', icon: HelpCircle },
  { id: 'profile', label: 'Profile', icon: UserIcon },
];

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('campusfix_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // ignore storage errors
  }
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [prefillCategory, setPrefillCategory] = useState<ComplaintCategory | undefined>(
    undefined
  );

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Apply .dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('campusfix_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const handleChangeTheme = useCallback(
    (nextTheme: ThemeMode) => {
      setTheme(nextTheme);
      if (currentUser) {
        void updateUserProfile(currentUser.uid, { themePreference: nextTheme }).catch(
          () => {
            // Non-blocking theme preference sync
          }
        );
      }
    },
    [currentUser]
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setProfile(null);
        setIsAdmin(false);
        setAdminMode(false);
        setComplaints([]);
        setAuthReady(true);
        return;
      }

      try {
        const synced = await syncUserOnSignIn(user, theme);
        setProfile(synced.profile);
        setIsAdmin(synced.isAdmin);
        setAdminMode(synced.isAdmin);
        if (
          synced.profile.themePreference === 'dark' ||
          synced.profile.themePreference === 'light'
        ) {
          setTheme(synced.profile.themePreference);
        }
        setAuthError(null);
      } catch (err) {
        setAuthError(
          err instanceof Error
            ? 'Could not sync your campus profile. Please retry.'
            : 'Authentication sync error.'
        );
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to Firestore complaints once authenticated
  useEffect(() => {
    if (!authReady || !currentUser) return;
    setComplaintsLoading(true);
    setComplaintsError(null);

    const unsub = subscribeToComplaints(
      currentUser.uid,
      adminMode,
      (items) => {
        setComplaints(items);
        setComplaintsLoading(false);
      },
      (err) => {
        setComplaintsError(err.message);
        setComplaintsLoading(false);
      }
    );

    return () => unsub();
  }, [authReady, currentUser, adminMode]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveTab('home');
    setSelectedComplaintId(null);
  };

  const handleNavigateTab = (tab: AppTab, categoryHint?: ComplaintCategory) => {
    if (tab === 'report') {
      setPrefillCategory(categoryHint);
    } else {
      setPrefillCategory(undefined);
    }
    setActiveTab(tab);
  };

  const activeUserName =
    profile?.displayName ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Campus Member';

  const selectedComplaint =
    complaints.find((c) => c.id === selectedComplaintId) || null;

  // Loading splash while Firebase Auth initializes
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <Wrench className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading CampusFix...
          </p>
        </div>
      </div>
    );
  }

  // Signed-out Welcome / Help-accessible view
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        <header className="sticky top-0 z-30 h-[52px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
              CampusFix
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'help' ? 'home' : 'help')}
              className="min-h-[40px] px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {activeTab === 'help' ? 'Back to Sign In' : 'Emergency & Help'}
            </button>
            <button
              type="button"
              onClick={() => handleChangeTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {activeTab === 'help' ? (
            <HelpView />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    University Facilities & Safety Portal
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Report campus issues in seconds. Track every fix.
                  </h1>
                  <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    Log electrical faults, water leaks, Wi-Fi drops, cleanliness, safety hazards, or dining concerns with location and optional photos. CampusFix auto-categorises urgency and keeps you updated on a live timeline.
                  </p>
                </div>

                <div className="space-y-3 max-w-sm">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={signingIn}
                    className="w-full min-h-[50px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors shadow-sm"
                  >
                    <LogIn className="w-4 h-4" aria-hidden="true" />
                    <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
                  </button>

                  {authError && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {authError}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Need urgent campus assistance right now?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('help')}
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View 24/7 emergency numbers
                    </button>
                  </p>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-64 sm:h-80 lg:h-full min-h-[280px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-200 dark:bg-slate-900">
                  {!heroImgFailed ? (
                    <img
                      src={campusQuadHero}
                      alt="Modern university campus quadrangle and academic buildings"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600/20 via-slate-100 to-slate-200 dark:from-blue-900/30 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
                      <Wrench className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent flex items-end p-5">
                    <div className="text-white space-y-1">
                      <p className="text-xs font-mono text-blue-300">
                        Electrical · Water · Internet · Cleanliness · Safety · Food
                      </p>
                      <p className="text-sm font-semibold">
                        Automated priority triage and real-time repair timelines
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Left Navigation Rail */}
      <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 md:fixed md:inset-y-0 md:left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleNavigateTab('home')}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
              CampusFix
            </span>
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigateTab(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => handleChangeTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full min-h-[42px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors"
          >
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-blue-400" aria-hidden="true" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
            )}
          </button>
          <div className="px-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {activeUserName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isAdmin ? 'Facilities Admin' : 'Student Account'}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Sticky Top Bar (52px) */}
      <header className="md:hidden sticky top-0 z-30 h-[52px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleNavigateTab('home')}
          className="flex items-center gap-2 text-left"
        >
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight whitespace-nowrap">
            CampusFix
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleChangeTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-60 lg:pl-64 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5">
          {complaintsError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-4 py-3 text-xs text-red-700 dark:text-red-300"
            >
              Unable to sync live tickets: {complaintsError}
            </div>
          )}

          {activeTab === 'home' && (
            <HomeView
              currentUser={currentUser}
              userName={activeUserName}
              isAdmin={isAdmin}
              adminMode={adminMode}
              onToggleAdminMode={(val) => setAdminMode(val)}
              complaints={complaints}
              loading={complaintsLoading}
              onNavigateTab={handleNavigateTab}
              onSelectComplaint={(c) => setSelectedComplaintId(c.id)}
            />
          )}

          {activeTab === 'report' && (
            <ReportView
              currentUser={currentUser}
              userName={activeUserName}
              initialCategory={prefillCategory}
              onSubmitted={(tab) => handleNavigateTab(tab)}
            />
          )}

          {activeTab === 'track' && (
            <TrackView
              complaints={complaints}
              loading={complaintsLoading}
              isAdminView={adminMode}
              onSelectComplaint={(c) => setSelectedComplaintId(c.id)}
              onNavigateTab={handleNavigateTab}
            />
          )}

          {activeTab === 'help' && <HelpView />}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              profile={profile}
              isAdmin={isAdmin}
              adminMode={adminMode}
              onToggleAdminMode={(val) => setAdminMode(val)}
              theme={theme}
              onChangeTheme={handleChangeTheme}
              onSignOut={handleSignOut}
              onProfileUpdated={(name, department) => {
                setProfile((prev) =>
                  prev
                    ? { ...prev, displayName: name, department }
                    : {
                        uid: currentUser.uid,
                        displayName: name,
                        role: isAdmin ? 'admin' : 'student',
                        department,
                        themePreference: theme,
                      }
                );
              }}
            />
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Tab Bar (64px) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigateTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-[22px] h-[22px] ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-medium tracking-tight leading-none whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Complaint Detail & Timeline Modal */}
      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          currentUser={currentUser}
          currentUserName={activeUserName}
          isAdminView={adminMode}
          onClose={() => setSelectedComplaintId(null)}
        />
      )}
    </div>
  );
}
