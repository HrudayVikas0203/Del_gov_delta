import { useState, useMemo } from 'react';
import { Shield, Search, Clock, User, Filter } from 'lucide-react';
import { useStore } from '../store/useStore';

const ACTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Login':              { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Status Submitted':   { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  'Status Approved':    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Report Downloaded':  { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500' },
  'AI Insights Viewed': { bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
  'Project Updated':    { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
};

const AVATAR_PALETTE = [
  'bg-violet-600', 'bg-sky-600', 'bg-rose-600', 'bg-emerald-600',
  'bg-amber-600', 'bg-indigo-600', 'bg-pink-600', 'bg-teal-600',
];

const MODULES = ['All Modules', 'Authentication', 'Weekly Status', 'Approvals', 'Reports', 'AI Engine', 'Projects'] as const;
const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'All'] as const;

function avatarColor(userId: string) {
  let hash = 0;
  for (const ch of userId) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

function isWithinDays(iso: string, days: number) {
  const now = Date.now();
  return now - new Date(iso).getTime() <= days * 86_400_000;
}

export default function AuditLogs() {
  const auditLogs = useStore((s) => s.auditLogs);

  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('All Modules');
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]>('All');

  /* ── derived data ────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((l) => {
        if (q && !l.userName.toLowerCase().includes(q) && !l.action.toLowerCase().includes(q)) return false;
        if (moduleFilter !== 'All Modules' && l.module !== moduleFilter) return false;
        if (dateRange === 'Last 7 days' && !isWithinDays(l.timestamp, 7)) return false;
        if (dateRange === 'Last 30 days' && !isWithinDays(l.timestamp, 30)) return false;
        return true;
      });
  }, [auditLogs, search, moduleFilter, dateRange]);

  const totalActions = filtered.length;
  const uniqueUsers = new Set(filtered.map((l) => l.userId)).size;
  const modulesCovered = new Set(filtered.map((l) => l.module)).size;

  /* ── render ──────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 lg:p-10">
      {/* ── Header ──────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit &amp; Activity Logs</h1>
            <p className="text-sm text-slate-500">
              Full compliance trail — every action across the portal is recorded for governance and audit readiness.
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Actions', value: totalActions, icon: Clock, gradient: 'from-indigo-500 to-blue-500', shadow: 'shadow-indigo-200' },
          { label: 'Unique Users', value: uniqueUsers, icon: User, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
          { label: 'Modules Covered', value: modulesCovered, icon: Filter, gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-200' },
        ].map((s) => (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} shadow-lg ${s.shadow}`}
              >
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              </div>
            </div>
            {/* decorative blob */}
            <div
              className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${s.gradient} opacity-[0.06]`}
            />
          </div>
        ))}
      </div>

      {/* ── Filter Toolbar ──────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 mb-8">
        {/* search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user name or action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
          />
        </div>

        {/* module filter */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="appearance-none pl-10 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition cursor-pointer"
          >
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* date range toggle */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {DATE_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                dateRange === r
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Shield className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm font-medium">No audit logs match your filters.</p>
        </div>
      ) : (
        <div className="relative pl-8 lg:pl-10">
          {/* vertical timeline line */}
          <div className="absolute left-[15px] lg:left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-300 via-slate-200 to-transparent" />

          <div className="space-y-4">
            {filtered.map((log, idx) => {
              const colors = ACTION_COLORS[log.action] ?? { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500' };
              const ts = formatTimestamp(log.timestamp);

              return (
                <div key={log.id} className="relative group">
                  {/* timeline dot */}
                  <span
                    className={`absolute -left-8 lg:-left-10 top-5 w-3 h-3 rounded-full ${colors.dot} ring-4 ring-white shadow-sm group-hover:scale-125 transition-transform duration-200`}
                  />

                  {/* card */}
                  <div
                    className="rounded-2xl bg-white border border-slate-200/60 p-4 lg:p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* avatar */}
                      <div
                        className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-white text-xs font-bold ${avatarColor(log.userId)}`}
                      >
                        {initials(log.userName)}
                      </div>

                      {/* main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-900">{log.userName}</span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold rounded-full ${colors.bg} ${colors.text}`}
                          >
                            {log.action}
                          </span>
                          <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-500">
                            {log.module}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{log.details}</p>
                      </div>

                      {/* timestamp */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-semibold text-slate-700">{ts.date}</p>
                        <p className="text-[11px] text-slate-400">{ts.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Footer count ────────────────────────────── */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{' '}
          <span className="font-semibold text-slate-600">{auditLogs.length}</span> log entries
        </p>
      </div>
    </div>
  );
}
