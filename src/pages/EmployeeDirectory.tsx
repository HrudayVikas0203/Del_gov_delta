import { useState, useMemo } from 'react';
import { Users, Search, MapPin, Briefcase, Award, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Employee, RoleCategory } from '../types';

/* ─── helpers ─── */
const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const roleBadgeColor: Record<RoleCategory, string> = {
  'Studio Head':     'bg-purple-100 text-purple-700 ring-purple-300',
  'Program Manager': 'bg-indigo-100 text-indigo-700 ring-indigo-300',
  Manager:           'bg-sky-100 text-sky-700 ring-sky-300',
  Architect:         'bg-emerald-100 text-emerald-700 ring-emerald-300',
  Developer:         'bg-blue-100 text-blue-700 ring-blue-300',
  DevOps:            'bg-orange-100 text-orange-700 ring-orange-300',
  QA:                'bg-teal-100 text-teal-700 ring-teal-300',
  Intern:            'bg-gray-100 text-gray-600 ring-gray-300',
};

const availBadge: Record<Employee['availability'], string> = {
  Allocated: 'bg-emerald-50 text-emerald-700 ring-emerald-400',
  Available: 'bg-blue-50 text-blue-700 ring-blue-400',
  'On Leave': 'bg-amber-50 text-amber-700 ring-amber-400',
  Bench:     'bg-red-50 text-red-700 ring-red-400',
};

const progressColor = (v: number, invert = false) => {
  const t = invert ? 100 - v : v;
  if (t >= 75) return 'bg-emerald-500';
  if (t >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

/* ─── Org hierarchy ─── */
const orgLevels = [
  { label: 'Studio Head', icon: '👑' },
  { label: 'Program Manager', icon: '📋' },
  { label: 'Sr. Project Manager', icon: '📊' },
  { label: 'Architect', icon: '🏗️' },
  { label: 'Developer', icon: '💻' },
  { label: 'Intern', icon: '🎓' },
];

function OrgHierarchy() {
  return (
    <div className="relative mb-8 rounded-2xl border border-white/60 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70 p-6 shadow-sm backdrop-blur">
      <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Organization Hierarchy
      </h3>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {orgLevels.map((lvl, i) => (
          <div key={lvl.label} className="flex items-center">
            {/* card */}
            <div className="flex min-w-[130px] flex-col items-center rounded-xl border border-white bg-white/80 px-4 py-3 shadow-md transition-transform hover:scale-105 hover:shadow-lg">
              <span className="text-2xl">{lvl.icon}</span>
              <span className="mt-1 text-center text-xs font-semibold text-slate-700 leading-tight">
                {lvl.label}
              </span>
            </div>
            {/* arrow connector */}
            {i < orgLevels.length - 1 && (
              <div className="mx-1 flex items-center text-indigo-300">
                <div className="h-[2px] w-6 bg-gradient-to-r from-indigo-300 to-purple-300" />
                <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="-ml-px">
                  <path d="M1 1L8 7L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, sub, gradient }: { label: string; value: string | number; sub?: string; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-md ${gradient}`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <p className="text-xs font-medium uppercase tracking-wider text-white/80">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/70">{sub}</p>}
    </div>
  );
}

/* ─── Mini progress bar ─── */
function MiniBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[11px] text-slate-500 truncate">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${progressColor(value, invert)}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-[11px] font-semibold text-slate-600">{value}%</span>
    </div>
  );
}

/* ─── Employee Card ─── */
function EmployeeCard({ emp, isExpanded, onToggle }: { emp: Employee; isExpanded: boolean; onToggle: () => void }) {
  const shownSkills = emp.skills.slice(0, 4);
  const moreCount = emp.skills.length - 4;

  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-200">
      {/* main card */}
      <button onClick={onToggle} className="w-full cursor-pointer p-5 text-left focus:outline-none">
        {/* top row */}
        <div className="flex items-start gap-4">
          {/* avatar */}
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner ring-2 ring-white"
            style={{ backgroundColor: emp.avatarColor }}
          >
            {initials(emp.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
              {emp.name}
            </p>
            <p className="truncate text-xs text-slate-500">{emp.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${roleBadgeColor[emp.roleCategory]}`}>
                {emp.roleCategory}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${availBadge[emp.availability]}`}>
                {emp.availability}
              </span>
            </div>
          </div>
          <span className="mt-1 text-slate-400 transition-transform duration-200">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>

        {/* info row */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span title="Department"><Briefcase size={12} /></span> {emp.dept}
          </span>
          <span className="flex items-center gap-1">
            <span title="Location"><MapPin size={12} /></span> {emp.location}
          </span>
          <span className="flex items-center gap-1">
            <span title="Experience"><Award size={12} /></span> {emp.experience}
          </span>
        </div>

        {/* skills */}
        <div className="mt-3 flex flex-wrap gap-1">
          {shownSkills.map(s => (
            <span key={s} className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              {s}
            </span>
          ))}
          {moreCount > 0 && (
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 ring-1 ring-inset ring-indigo-200">
              +{moreCount} more
            </span>
          )}
        </div>

        {/* progress bars */}
        <div className="mt-3 space-y-1.5">
          <MiniBar label="AI Score" value={emp.aiScore ?? 0} />
          <MiniBar label="Risk Score" value={emp.riskScore ?? 0} invert />
          <MiniBar label="Completion" value={emp.completionRate ?? 0} />
        </div>

        {/* manager */}
        {emp.managerName && (
          <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
            <span title="Manager"><Star size={11} /></span> Managed by <span className="font-semibold text-slate-600">{emp.managerName}</span>
          </p>
        )}
      </button>

      {/* expanded detail panel */}
      {isExpanded && (
        <div className="border-t border-dashed border-slate-200 bg-slate-50/60 px-5 py-4 rounded-b-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Bio</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {emp.bio || 'No bio available for this team member.'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Details</h4>
              <div className="space-y-1 text-xs text-slate-600">
                <p><span className="font-medium text-slate-500">Email:</span> {emp.email}</p>
                <p><span className="font-medium text-slate-500">Joined:</span> {emp.joined}</p>
                <p><span className="font-medium text-slate-500">Status:</span> {emp.status || emp.availability}</p>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">All Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {emp.skills.map(s => (
                <span key={s} className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 shadow-sm">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   EmployeeDirectory – main page
   ═══════════════════════════════════════════ */
export default function EmployeeDirectory() {
  const employees = useStore(s => s.employees);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [availFilter, setAvailFilter] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* derived data */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.roleCategory.toLowerCase().includes(q) ||
        e.skills.some(s => s.toLowerCase().includes(q));
      const matchRole = roleFilter === 'All' || e.roleCategory === roleFilter;
      const matchAvail = availFilter === 'All' || e.availability === availFilter;
      return matchSearch && matchRole && matchAvail;
    });
  }, [employees, search, roleFilter, availFilter]);

  const totalEmployees = employees.length;
  const allocatedCount = employees.filter(e => e.availability === 'Allocated').length;
  const benchCount = employees.filter(e => e.availability === 'Bench').length;
  const avgAI = employees.length
    ? Math.round(employees.reduce((acc, e) => acc + (e.aiScore ?? 0), 0) / employees.length)
    : 0;

  const roles: string[] = ['All', ...Array.from(new Set(employees.map(e => e.roleCategory)))];
  const avails: string[] = ['All', 'Allocated', 'Available', 'On Leave', 'Bench'];

  return (
    <div className="min-h-screen space-y-8">
      {/* ── header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">People &amp; Organization</h1>
            <p className="text-sm text-slate-500">Explore your team, roles, skills and availability</p>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Employees" value={totalEmployees} sub="across all departments" gradient="bg-gradient-to-br from-indigo-500 to-indigo-700" />
        <KpiCard label="Active (Allocated)" value={allocatedCount} sub={`${Math.round((allocatedCount / totalEmployees) * 100)}% utilization`} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <KpiCard label="On Bench" value={benchCount} sub="available for staffing" gradient="bg-gradient-to-br from-rose-500 to-rose-700" />
        <KpiCard label="Avg AI Score" value={`${avgAI}%`} sub="team performance index" gradient="bg-gradient-to-br from-amber-500 to-amber-700" />
      </div>

      {/* ── org hierarchy ── */}
      <OrgHierarchy />

      {/* ── search & filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* search */}
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, role or skill…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />
        </div>

        {/* role filter */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
        >
          {roles.map(r => (
            <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>
          ))}
        </select>

        {/* availability filter */}
        <select
          value={availFilter}
          onChange={e => setAvailFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
        >
          {avails.map(a => (
            <option key={a} value={a}>{a === 'All' ? 'All Availability' : a}</option>
          ))}
        </select>

        {/* count badge */}
        <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
          {filtered.length} found
        </span>
      </div>

      {/* ── employee grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <Users size={40} className="text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-400">No employees match your filters</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(emp => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              isExpanded={expandedId === emp.id}
              onToggle={() => setExpandedId(prev => (prev === emp.id ? null : emp.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
