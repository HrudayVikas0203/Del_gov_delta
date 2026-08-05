import { NavLink } from 'react-router-dom';
import { Activity, Grid, Building, Calendar, CheckCircle, Bell, User, Settings, HelpCircle, Users, Cpu, FileText, Shield, FolderKanban } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { previewRole, submissions } = useStore();
  const isManager = previewRole === 'manager' || previewRole === 'project_director' || previewRole === 'studio_head';
  const isStudioHead = previewRole === 'studio_head';

  const pendingCount = submissions.filter(s => s.status === 'submitted').length;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Grid, show: true },
    { path: '/accounts', label: 'Accounts', icon: Building, show: true },
    { path: '/projects', label: 'Projects', icon: FolderKanban, show: true },
    { path: '/employees', label: 'People', icon: Users, show: isManager },
    { path: '/weekly-status', label: 'Weekly Status', icon: Calendar, show: true },
    {
      path: '/approvals',
      label: isManager ? 'Approval Queue' : 'My Approvals',
      icon: CheckCircle,
      badgeCount: isManager ? pendingCount : 0,
      show: true
    },
    { path: '/ai-insights', label: 'AI Insights', icon: Cpu, show: isManager },
    { path: '/reports', label: 'Reports', icon: FileText, show: isManager },
    { path: '/notifications', label: 'Notifications', icon: Bell, show: true },
  ];

  const bottomNavItems = [
    { path: '/audit-logs', label: 'Audit Logs', icon: Shield, show: isStudioHead || previewRole === 'manager' },
    { path: '/profile', label: 'Profile', icon: User, show: true },
    { path: '/settings', label: 'Settings', icon: Settings, show: true },
    { path: '/help', label: 'Help', icon: HelpCircle, show: true },
  ];

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    if (!item.show) return null;
    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          `flex items-center justify-between px-3 py-2 rounded-lg mb-0.5 transition-all text-[13px] ${
            isActive
              ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
              : 'text-ink-soft font-medium hover:bg-surface-sunken hover:text-ink'
          } ${collapsed ? 'justify-center' : ''}`
        }
        title={collapsed ? item.label : undefined}
      >
        <div className="flex items-center gap-2.5">
          <item.icon size={17} className="shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </div>
        {!collapsed && 'badgeCount' in item && (item as any).badgeCount > 0 && (
          <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono min-w-[18px] text-center">
            {(item as any).badgeCount}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className={`bg-surface border-r border-border flex flex-col transition-all duration-200 shrink-0 ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}>
      <div className={`h-16 flex items-center px-4 border-b border-border shrink-0 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Activity size={16} />
        </div>
        {!collapsed && (
          <div>
            <span className="font-display font-bold text-sm tracking-tight text-ink block leading-none">DeliveryGov</span>
            <span className="text-[9px] text-ink-faint font-medium">AI-Powered Governance</span>
          </div>
        )}
      </div>

      <div className="flex-1 py-3 px-2.5 overflow-y-auto scrollbar-none">
        {!collapsed && <div className="text-[9px] uppercase tracking-widest font-bold text-ink-faint px-3 pb-1.5 pt-2">Workspace</div>}
        {navItems.map(item => <NavItem key={item.path} item={item} />)}

        {!collapsed && <div className="text-[9px] uppercase tracking-widest font-bold text-ink-faint px-3 pb-1.5 pt-5">System</div>}
        {bottomNavItems.map(item => <NavItem key={item.path} item={item} />)}
      </div>

      {/* Role indicator */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-border">
          <div className={`text-[10px] font-bold uppercase tracking-wider text-center py-1.5 rounded-md ${
            previewRole === 'studio_head' ? 'bg-purple-50 text-purple-700' :
            previewRole === 'manager' ? 'bg-blue-50 text-blue-700' :
            'bg-slate-50 text-slate-600'
          }`}>
            {previewRole === 'studio_head' ? '◆ Studio Head View' :
             previewRole === 'project_director' ? '◆ Director View' :
             previewRole === 'manager' ? '◆ Manager View' : '◆ Employee View'}
          </div>
        </div>
      )}
    </div>
  );
}