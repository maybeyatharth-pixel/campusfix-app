import { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { updateUserProfile } from '../services/campusService';
import { ThemeMode, UserProfile } from '../types/campus';

interface ProfileViewProps {
  currentUser: User;
  profile: UserProfile | null;
  isAdmin: boolean;
  adminMode: boolean;
  onToggleAdminMode: (val: boolean) => void;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  onSignOut: () => void;
  onProfileUpdated: (name: string, department: string) => void;
}

export function ProfileView({
  currentUser,
  profile,
  isAdmin,
  adminMode,
  onToggleAdminMode,
  theme,
  onChangeTheme,
  onSignOut,
  onProfileUpdated,
}: ProfileViewProps) {
  const [displayName, setDisplayName] = useState(
    profile?.displayName || currentUser.displayName || 'Campus Member'
  );
  const [department, setDepartment] = useState(
    profile?.department || (isAdmin ? 'Campus Operations' : 'General Campus')
  );
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    setSavedToast(false);
    try {
      await updateUserProfile(currentUser.uid, {
        displayName: displayName.trim(),
        department: department.trim(),
        themePreference: theme,
      });
      onProfileUpdated(displayName.trim(), department.trim());
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Account & Preferences
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
          Profile
        </h1>
      </div>

      {/* User Identity Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/12 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          {isAdmin ? (
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          ) : (
            <UserIcon className="w-6 h-6" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
            {displayName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {currentUser.email} · {isAdmin ? 'Facilities Admin' : 'Student'}
          </p>
        </div>
      </div>

      {/* Appearance / Dark Mode */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Appearance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Switch between Light and Dark theme across CampusFix
          </p>
        </div>

        <div
          role="group"
          aria-label="Theme preference"
          className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => onChangeTheme('light')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTheme('dark')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              theme === 'dark'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Admin Workspace Switch */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Workspace Role View
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Switch between Admin Triage Dashboard and Student Portal
            </p>
          </div>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onToggleAdminMode(true)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                adminMode
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => onToggleAdminMode(false)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !adminMode
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Student
            </button>
          </div>
        </div>
      )}

      {/* Profile Details Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Campus Details
        </h2>

        <div>
          <label
            htmlFor="profile-name"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
          >
            Display Name
          </label>
          <input
            id="profile-name"
            type="text"
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full min-h-[44px] px-3.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="profile-department"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
          >
            Hostel / Department
          </label>
          <input
            id="profile-department"
            type="text"
            maxLength={80}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Hostel Block A or Computer Science"
            className="w-full min-h-[44px] px-3.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        {savedToast && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Profile saved to database.</span>
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Sign Out */}
      <button
        type="button"
        onClick={onSignOut}
        className="w-full min-h-[48px] px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="w-4 h-4" aria-hidden="true" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
