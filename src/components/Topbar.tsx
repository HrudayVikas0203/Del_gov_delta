import { Menu, Search, Bell, Moon, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { previewRole, logout, currentUser, submissions, settings, updateSettings } = useStore();
  const navigate = useNavigate();
  const isManager = previewRole === 'manager' || previewRole === 'project_director' || previewRole === 'studio_head';

  const unreadCount = isManager
    ? submissions.filter(s => s.status === 'submitted').length
    : submissions.filter(s => s.employeeId === currentUser?.id && s.status === 'rejected').length;

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('')
    : '??';

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1">
        <button onClick={toggleSidebar} className="text-ink-soft hover:bg-surface-sunken p-1.5 rounded-md cursor-pointer">
          <Menu size={18} />
        </button>

        <div className="relative w-full max-w-sm hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
          <input
            type="text"
            placeholder="Search projects, accounts, people..."
            className="w-full bg-surface-alt border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-ink focus:bg-surface focus:border-blue-600 outline-none"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-ink-faint border border-border rounded px-1 bg-surface">/</span>
        </div>
      </div>

      <div className="flex items-center gap-2">


        <button
          onClick={() => {
            const nextMode = !settings?.darkMode;
            updateSettings({ ...settings, darkMode: nextMode });
          }}
          className={`p-1.5 rounded-md cursor-pointer transition-colors ${settings?.darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-ink-soft hover:bg-surface-sunken'}`}
          title="Toggle Dark Mode"
        >
          <Moon size={16} fill={settings?.darkMode ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => navigate('/notifications')}
          className="text-ink-soft hover:bg-surface-sunken p-1.5 rounded-md relative cursor-pointer"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-danger rounded-full border-2 border-surface"></span>
          )}
        </button>

        <div className="h-5 w-px bg-border mx-0.5"></div>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-2 hover:bg-surface-sunken p-1 pr-2 rounded-full cursor-pointer"
        >
          <div
            style={{ backgroundColor: currentUser?.avatarColor || '#2563EB' }}
            className="w-7 h-7 rounded-full text-white flex items-center justify-center font-display font-bold text-[10px]"
          >
            {userInitials}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-ink leading-tight">{currentUser?.name || 'User'}</div>
            <div className="text-[10px] text-ink-faint leading-tight">{currentUser?.roleCategory}</div>
          </div>
          <ChevronDown size={12} className="text-ink-faint hidden sm:block" />
        </button>
      </div>
    </header>
  );
}