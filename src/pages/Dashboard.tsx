import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, CheckCircle, Clock, Users, AlertTriangle, ArrowRight, FileText, 
  Building, ShieldAlert, TrendingUp, DollarSign, FolderKanban, ChevronDown, ChevronUp,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import KpiCard from '../components/KpiCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { previewRole, currentUser, submissions, employees, projects, accounts, allocations } = useStore();
  
  const isManager = previewRole === 'manager';
  const isStudioHead = previewRole === 'studio_head';
  const isProjectDirector = previewRole === 'project_director';

  // ==================== WEEKS & COMPLIANCE STATE ====================
  // Get all unique weeks available in the status entries
  const weekOptions = Array.from(new Set(submissions.map(s => s.weekKeyStr)))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
  
  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0] || '2024-05-20');

  // Collapsible Tree state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'acc-01': true,
    'acc-02': true,
    'acc-03': true
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // ==================== HIERARCHY COMPUTATIONS ====================
  // Contributors are developers, QA, architects, and interns (everyone except Studio Head, Program Manager, Project Manager)
  const contributors = employees.filter(
    e => e.roleCategory !== 'Studio Head' && e.roleCategory !== 'Program Manager' && e.roleCategory !== 'Manager'
  );

  // Status lookup for a contributor in a specific week
  const getDeveloperStatusForWeek = (empId: string, week: string) => {
    const sub = submissions.find(s => s.employeeId === empId && s.weekKeyStr === week);
    if (!sub) return { label: 'Missed / Not Started', color: 'text-rose-700 bg-rose-50 border-rose-150', icon: '🔴', statusKey: 'not_started' };
    
    switch(sub.status) {
      case 'approved':
        return { label: 'Approved', color: 'text-success bg-success-bg border-success/20', icon: '🟢', statusKey: 'approved' };
      case 'submitted':
        return { label: 'Submitted', color: 'text-blue-700 bg-blue-50 border-blue-150', icon: '🔵', statusKey: 'submitted' };
      case 'draft':
        return { label: 'Draft Saved', color: 'text-amber-700 bg-amber-50 border-amber-150', icon: '🟡', statusKey: 'draft' };
      case 'changes_requested':
        return { label: 'Revision Required', color: 'text-purple-700 bg-purple-50 border-purple-150', icon: '🟣', statusKey: 'changes_requested' };
      case 'rejected':
        return { label: 'Rejected', color: 'text-rose-700 bg-rose-50 border-rose-150', icon: '🔴', statusKey: 'rejected' };
      default:
        return { label: 'Missed / Not Started', color: 'text-rose-700 bg-rose-50 border-rose-150', icon: '🔴', statusKey: 'not_started' };
    }
  };

  // Calculate missed list for the selected week
  const complianceData = contributors.map(emp => {
    const statusInfo = getDeveloperStatusForWeek(emp.id, selectedWeek);
    const manager = employees.find(m => m.id === emp.managerId);
    return {
      employee: emp,
      status: statusInfo.label,
      statusKey: statusInfo.statusKey,
      icon: statusInfo.icon,
      colorClass: statusInfo.color,
      managerName: manager ? manager.name : 'Unknown Manager',
      managerId: emp.managerId
    };
  });

  const missedList = complianceData.filter(c => c.statusKey === 'not_started');

  // ==================== STATS COMPUTATION ====================

  // Employee Specific
  const mySubmissions = submissions.filter(s => s.employeeId === currentUser?.id);
  const myDrafts = mySubmissions.filter(s => s.status === 'draft').length;
  const mySubmitted = mySubmissions.filter(s => s.status === 'submitted').length;
  const myApproved = mySubmissions.filter(s => s.status === 'approved').length;
  const myCompliance = mySubmissions.length > 0
    ? Math.round(((myApproved + mySubmitted) / mySubmissions.length) * 100)
    : 100;
  
  const totalHours = mySubmissions.reduce((acc, curr) => acc + (curr.fields.hoursWorked || 0), 0);
  const avgHours = mySubmissions.length > 0 ? (totalHours / mySubmissions.length).toFixed(1) : '0.0';

  const currentWeekSubmission = mySubmissions.find(s => s.weekKeyStr === selectedWeek);
  const currentWeekStatusStr = currentWeekSubmission 
    ? currentWeekSubmission.status.charAt(0).toUpperCase() + currentWeekSubmission.status.slice(1).replace('_', ' ')
    : 'Not Started';

  // Manager Specific ( রাহুল মেহতা বা অন্য পিএম)
  const pendingApprovals = submissions.filter(s => s.status === 'submitted').length;
  const myTeamEmployees = employees.filter(e => e.managerId === currentUser?.id);
  const teamSize = myTeamEmployees.length;
  
  const teamCompliance = teamSize > 0
    ? Math.round(((submissions.filter(s => (s.status === 'submitted' || s.status === 'approved') && submissions.some(sub => sub.employeeId === s.employeeId && sub.weekKeyStr === selectedWeek)).length) / (teamSize || 1)) * 100)
    : 100;

  const missingSubmissionsCount = myTeamEmployees.filter(emp => {
    const sub = submissions.find(s => s.employeeId === emp.id && s.weekKeyStr === selectedWeek);
    return !sub || sub.status === 'not_started';
  }).length;
  
  const flaggedManagerRisks = projects.filter(p => p.managerId === currentUser?.id && (p.risk === 'High' || p.risk === 'Critical' || p.health === 'red')).length;

  // Studio Head Specific
  const totalProjects = projects.length;
  const totalAccounts = accounts.length;
  const totalEmployees = employees.length;

  const greenProjects = projects.filter(p => p.health === 'green').length;
  const amberProjects = projects.filter(p => p.health === 'amber').length;
  const redProjects = projects.filter(p => p.health === 'red').length;
  
  const portfolioHealthScore = totalProjects > 0
    ? Math.round((greenProjects / totalProjects) * 100)
    : 100;

  const weeklyComplianceIndex = totalEmployees > 0
    ? Math.round((submissions.filter(s => s.weekKeyStr === selectedWeek && (s.status === 'approved' || s.status === 'submitted')).length / contributors.length) * 100)
    : 100;

  const lowRisks = projects.filter(p => p.risk === 'Low').length;
  const mediumRisks = projects.filter(p => p.risk === 'Medium').length;
  const highRisks = projects.filter(p => p.risk === 'High').length;
  const criticalRisks = projects.filter(p => p.risk === 'Critical').length;

  // Project Director Specific
  const directorBudgetTotal = Number(projects.reduce((acc, p) => acc + Number(p.budgetTotal || 0), 0)).toFixed(1);
  const directorBudgetUsed = Number(projects.reduce((acc, p) => acc + Number(p.budgetUsed || 0), 0)).toFixed(1);
  const budgetUtilizationRate = Math.round((parseFloat(directorBudgetUsed) / parseFloat(directorBudgetTotal)) * 100);

  // Renders role-specific summaries and premium inline SVG visualizations
  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">
            {isStudioHead && "Executive Studio Dashboard"}
            {isProjectDirector && "Portfolio Director Dashboard"}
            {isManager && "Manager Delivery Dashboard"}
            {!isStudioHead && !isProjectDirector && !isManager && "My Developer Dashboard"}
          </h1>
          <p className="text-ink-soft text-sm mt-1">
            {isStudioHead && "Inspect delivery metrics, overall allocations and compliance reports across accounts."}
            {isProjectDirector && "Cross-portfolio delivery health, budget utilization rate, and manager velocities."}
            {isManager && `Oversight of submission workflows, active milestones, and approvals under manager: ${currentUser?.name}.`}
            {!isStudioHead && !isProjectDirector && !isManager && `Welcome back, ${currentUser?.name.split(' ')[0]}. Fill drafts and submit reporting cards.`}
          </p>
        </div>
        
        {/* Cycle & Context Switcher Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {(isStudioHead || isProjectDirector || isManager) && (
            <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-xs font-semibold text-ink-soft">Review Cycle:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="text-xs font-bold text-blue-600 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
              >
                {weekOptions.map(week => (
                  <option key={week} value={week}>
                    {week === '2024-05-20' ? '20 May - 26 May 2024 (Current)' : week === '2024-05-13' ? '13 May - 19 May 2024' : week === '2024-05-06' ? '06 May - 12 May 2024' : `Week ${week}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-150 rounded-full w-fit">
            Logged Context: <span className="font-bold">{currentUser?.name}</span> ({currentUser?.title})
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. STUDIO HEAD VIEW */}
      {isStudioHead && (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
          {/* Studio Head KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Portfolio Health Index" 
              value={`${portfolioHealthScore}%`} 
              subtitle={`${greenProjects} of ${totalProjects} Projects Green`} 
              icon={TrendingUp} 
              colorClass="text-success" 
              bgClass="bg-success-bg" 
            />
            <KpiCard 
              title="Corporate Engagements" 
              value={totalAccounts} 
              subtitle="Client accounts active" 
              icon={Building} 
              colorClass="text-blue-600" 
              bgClass="bg-blue-50" 
            />
            <KpiCard 
              title="Governance Index" 
              value={`${weeklyComplianceIndex}%`} 
              subtitle={`For week: ${selectedWeek}`} 
              icon={CheckCircle} 
              colorClass="text-purple-600" 
              bgClass="bg-purple-50" 
            />
            <KpiCard 
              title="Critical Blockers" 
              value={criticalRisks} 
              subtitle="High & critical risk alerts" 
              icon={AlertTriangle} 
              colorClass={criticalRisks > 0 ? "text-danger animate-pulse" : "text-ink-faint"} 
              bgClass="bg-danger-bg" 
            />
          </div>

          {/* Missed Status Reports Alert Panel */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <AlertCircle size={16} className="text-rose-500" />
              Compliance Alerts: Missed Status Updates for Cycle ({selectedWeek})
            </h3>
            {missedList.length === 0 ? (
              <p className="text-xs text-success font-semibold">🟢 Great! Everyone in the studio has started or submitted their status reports for this cycle.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {missedList.map(item => (
                  <div key={item.employee.id} className="p-3 border border-rose-100 rounded-lg bg-rose-50/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-ink">{item.employee.name}</p>
                      <p className="text-ink-soft text-[10px]">{item.employee.title} • {item.employee.dept}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded font-bold text-[9px] uppercase">Missed Update</span>
                      <p className="text-[9px] text-ink-faint mt-1">Reports to: {item.managerName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual Analytics & Hierarchy tree */}
            <div className="col-span-1 lg:col-span-8 space-y-6">
              
              {/* ORGANIZATIONAL HIERARCHY TREE */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-ink text-sm">Delta Studio Hierarchy & Status Compliance</h3>
                  <p className="text-xs text-ink-soft">Expand corporate accounts to inspect managers, project phase milestones, and developer updates.</p>
                </div>

                <div className="space-y-3">
                  {accounts.map(acc => {
                    const isExpanded = expandedNodes[acc.id];
                    const accProjects = projects.filter(p => p.accountId === acc.id);
                    return (
                      <div key={acc.id} className="border border-border rounded-xl overflow-hidden bg-surface-alt/10">
                        {/* Account Row */}
                        <div 
                          onClick={() => toggleNode(acc.id)}
                          className="flex items-center justify-between p-3.5 bg-surface border-b border-border cursor-pointer hover:bg-surface-alt transition-colors select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                              <Building size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink">{acc.name}</p>
                              <p className="text-[10px] text-ink-soft">{acc.industry} • Contract Value: <span className="font-semibold text-blue-600">{acc.contractValue}</span></p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-ink-soft border border-border rounded-full font-semibold">
                              {accProjects.length} Projects
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
                          </div>
                        </div>

                        {/* Collapsible Projects Grid */}
                        {isExpanded && (
                          <div className="p-3.5 space-y-3 bg-white divide-y divide-slate-100">
                            {accProjects.length === 0 ? (
                              <p className="text-xs text-ink-faint italic p-2">No projects configured under this corporate account.</p>
                            ) : (
                              accProjects.map(proj => {
                                const pm = employees.find(e => e.id === proj.managerId);
                                const director = employees.find(e => e.id === pm?.managerId);
                                const projAllocations = allocations.filter(a => a.projectId === proj.id);

                                return (
                                  <div key={proj.id} className="pt-3 first:pt-0 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 text-xs">
                                        <FolderKanban size={14} className="text-indigo-600" />
                                        <span className="font-bold text-ink">{proj.name}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white ${
                                          proj.health === 'green' ? 'bg-success' : proj.health === 'amber' ? 'bg-warning' : 'bg-danger'
                                        }`}>
                                          {proj.phase}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-ink-faint flex gap-3">
                                        <span>Director: <strong>{director?.name || 'Gowtham Rallabandi'}</strong></span>
                                        <span>PM: <strong>{pm?.name || 'Shanmukha Rewal'}</strong></span>
                                      </div>
                                    </div>

                                    {/* Developers allocated and status list */}
                                    <div className="ml-5 pl-3 border-l border-slate-150 space-y-1.5">
                                      {projAllocations.length === 0 ? (
                                        <p className="text-[10px] text-ink-faint italic">No staff members allocated to this project.</p>
                                      ) : (
                                        projAllocations.map(alloc => {
                                          const devStatus = getDeveloperStatusForWeek(alloc.employeeId, selectedWeek);
                                          return (
                                            <div key={alloc.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-b-0">
                                              <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-600 uppercase border border-border">
                                                  {alloc.employeeName.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                  <span className="font-semibold text-ink">{alloc.employeeName}</span>
                                                  <span className="text-[9px] text-ink-soft ml-1.5">({alloc.projectRole} • {alloc.allocationPercent}%)</span>
                                                </div>
                                              </div>
                                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${devStatus.color}`}>
                                                {devStatus.icon} {devStatus.label}
                                              </span>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Health and Risk Charts */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-6">
                <div>
                  <h3 className="font-semibold text-ink text-sm">Portfolio Distribution & Risk Posture</h3>
                  <p className="text-xs text-ink-soft">Aggregated real-time metrics feeding directly from allocations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-surface-alt/10 p-4 rounded-xl border border-border">
                  <div className="flex justify-center">
                    <svg width="180" height="180" viewBox="0 0 100 100" className="rotate-[-90deg]">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                      <circle 
                        cx="50" cy="50" r="40" fill="transparent" 
                        stroke="#10b981" strokeWidth="8" 
                        strokeDasharray={`${(greenProjects / (totalProjects || 1)) * 251.2} 251.2`} 
                      />
                      <circle 
                        cx="50" cy="50" r="40" fill="transparent" 
                        stroke="#f59e0b" strokeWidth="8" 
                        strokeDasharray={`${(amberProjects / (totalProjects || 1)) * 251.2} 251.2`} 
                        strokeDashoffset={`-${(greenProjects / (totalProjects || 1)) * 251.2}`}
                      />
                      <circle 
                        cx="50" cy="50" r="40" fill="transparent" 
                        stroke="#ef4444" strokeWidth="8" 
                        strokeDasharray={`${(redProjects / (totalProjects || 1)) * 251.2} 251.2`} 
                        strokeDashoffset={`-${((greenProjects + amberProjects) / (totalProjects || 1)) * 251.2}`}
                      />
                    </svg>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-ink uppercase tracking-wider">Project Health Mix</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-success inline-block"></span>On Track (Green)</span>
                        <span className="font-bold text-ink">{greenProjects}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-warning inline-block"></span>At Risk (Amber)</span>
                        <span className="font-bold text-ink">{amberProjects}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-danger inline-block"></span>Blocked (Red)</span>
                        <span className="font-bold text-ink">{redProjects}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Risk Distribution Grid</p>
                  <div className="flex items-end justify-between gap-6 h-40 pt-4 px-6 bg-surface-alt/30 border border-border rounded-xl">
                    {[
                      { label: 'Low', count: lowRisks, color: '#10b981' },
                      { label: 'Medium', count: mediumRisks, color: '#f59e0b' },
                      { label: 'High', count: highRisks, color: '#f97316' },
                      { label: 'Critical', count: criticalRisks, color: '#ef4444' }
                    ].map((r, idx) => {
                      const maxVal = Math.max(1, lowRisks, mediumRisks, highRisks, criticalRisks);
                      const heightPercent = (r.count / maxVal) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end pb-2">
                          <span className="text-[10px] text-ink-soft font-bold mb-1">{r.count}</span>
                          <div 
                            className="w-12 rounded-t-lg transition-all duration-300 hover:brightness-95 cursor-pointer shadow-sm"
                            style={{ 
                              height: `${Math.max(5, heightPercent)}%`, 
                              backgroundColor: r.color 
                            }}
                          />
                          <span className="text-[10px] text-ink font-semibold mt-2">{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Studio Head Controls */}
            <div className="col-span-1 lg:col-span-4 space-y-4">
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-ink text-sm">Studio Controls</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => navigate('/reports')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>Download Executive Reports</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                  <button 
                    onClick={() => navigate('/weekly-status')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>Inspect Status Worksheets</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                  <button 
                    onClick={() => navigate('/projects')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>Manage Resource Allocations</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Department Roster Allocation Distribution */}
              <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-slate-700 rounded-xl p-5 shadow-sm text-white space-y-3">
                <h3 className="font-semibold text-sm">Delivery Matrix Summary</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-white/10">
                    <span className="text-slate-400">Total Engineering Roster</span>
                    <span className="font-semibold">{totalEmployees}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/10">
                    <span className="text-slate-400">Governance Index</span>
                    <span className="font-semibold text-success">{portfolioHealthScore}% Green</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/10">
                    <span className="text-slate-400">Status Compliance Rate</span>
                    <span className="font-semibold text-purple-400">{weeklyComplianceIndex}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. PROJECT DIRECTOR VIEW */}
      {isProjectDirector && (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
          {/* Director KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Vertical Budget Pool" 
              value={`$${directorBudgetTotal}M`} 
              subtitle="Aggregated total budget" 
              icon={DollarSign} 
              colorClass="text-blue-600" 
              bgClass="bg-blue-50" 
            />
            <KpiCard 
              title="Budget Utilization" 
              value={`${budgetUtilizationRate}%`} 
              subtitle={`$${directorBudgetUsed}M used out of $${directorBudgetTotal}M`} 
              icon={TrendingUp} 
              colorClass="text-cyan-600" 
              bgClass="bg-cyan-50" 
            />
            <KpiCard 
              title="Active Staffing Ratio" 
              value={allocations.length} 
              subtitle="Project resource allocations" 
              icon={Users} 
              colorClass="text-purple-600" 
              bgClass="bg-purple-50" 
            />
            <KpiCard 
              title="Governance Score" 
              value={`${weeklyComplianceIndex}%`} 
              subtitle={`Compliance rate for: ${selectedWeek}`} 
              icon={CheckCircle} 
              colorClass="text-success" 
              bgClass="bg-success-bg" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual Analytics */}
            <div className="col-span-1 lg:col-span-8 space-y-6">
              
              {/* DIRECTOR'S PROGRAM HIERARCHY TREE */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-ink text-sm">Program Manager Hierarchy & Compliance</h3>
                  <p className="text-xs text-ink-soft">Review projects and developer updates under your supervising Project Managers.</p>
                </div>

                <div className="space-y-3">
                  {/* Find Project Managers who report to Program Managers */}
                  {employees.filter(e => e.managerId === currentUser?.id).map(pm => {
                    const pmProjects = projects.filter(p => p.managerId === pm.id);
                    return (
                      <div key={pm.id} className="border border-border rounded-xl overflow-hidden bg-surface-alt/10">
                        <div className="p-3 bg-slate-50 border-b border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-ink">{pm.name}</span>
                            <span className="text-[10px] text-ink-soft">({pm.title})</span>
                          </div>
                          <span className="text-[10px] font-semibold text-blue-600">{pmProjects.length} Projects supervised</span>
                        </div>

                        <div className="p-3 space-y-3 bg-white">
                          {pmProjects.length === 0 ? (
                            <p className="text-xs text-ink-faint italic">No projects assigned under this manager.</p>
                          ) : (
                            pmProjects.map(proj => {
                              const projAllocations = allocations.filter(a => a.projectId === proj.id);
                              return (
                                <div key={proj.id} className="space-y-2 border-b border-slate-100 last:border-b-0 pb-3 last:pb-0">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-indigo-700 flex items-center gap-1.5">
                                      <FolderKanban size={13} /> {proj.name}
                                    </span>
                                    <span className="text-[10px] text-ink-soft font-mono">Sprint {proj.sprintNumber} • {proj.completionPercent}% Complete</span>
                                  </div>

                                  <div className="ml-4 pl-3 border-l border-slate-200 space-y-1.5">
                                    {projAllocations.map(alloc => {
                                      const devStatus = getDeveloperStatusForWeek(alloc.employeeId, selectedWeek);
                                      return (
                                        <div key={alloc.id} className="flex items-center justify-between text-xs py-0.5">
                                          <span>{alloc.employeeName} <span className="text-[9px] text-ink-faint">({alloc.projectRole})</span></span>
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${devStatus.color}`}>
                                            {devStatus.icon} {devStatus.label}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gantt and manager performance */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-6">
                <div>
                  <h3 className="font-semibold text-ink text-sm">Vertical Deliverables & Sprints Timeline</h3>
                  <p className="text-xs text-ink-soft">Delivery phase mapping across active projects.</p>
                </div>

                <div className="p-4 bg-surface-alt/10 border border-border rounded-xl space-y-4">
                  <p className="text-[10px] font-bold text-ink uppercase tracking-wider">Project Timeline Overview</p>
                  <div className="space-y-3">
                    {projects.map((p, idx) => (
                      <div key={p.id} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center font-semibold text-ink">
                          <span>{p.name}</span>
                          <span className="font-mono text-ink-soft">Sprint {p.sprintNumber} ({p.completionPercent || 0}%)</span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-border relative">
                          <div 
                            style={{ 
                              marginLeft: `${idx * 15}%`, 
                              width: `${Math.min(100 - (idx * 15), 65)}%` 
                            }}
                            className="bg-cyan-500 h-full rounded-full flex items-center justify-end px-3 text-[9px] text-white font-bold"
                          >
                            {p.phase}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Manager Compliance Velocities</p>
                  <div className="p-4 bg-surface-alt/30 border border-border rounded-xl space-y-4">
                    {[
                      { name: 'Gowtham Rallabandi', rate: 94, color: 'bg-blue-500', dept: 'Program Office' },
                      { name: 'Shanmukha Rewal', rate: 89, color: 'bg-indigo-500', dept: 'Delivery Operations' }
                    ].map((mgr, idx) => (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="flex justify-between font-bold text-ink">
                          <span>{mgr.name} <span className="font-normal text-ink-faint">({mgr.dept})</span></span>
                          <span className="font-mono text-blue-600">{mgr.rate}% Velocity</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-border">
                          <div style={{ width: `${mgr.rate}%` }} className={`h-full rounded-full ${mgr.color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Actions & AI Summary */}
            <div className="col-span-1 lg:col-span-4 space-y-4">
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
                <h3 className="font-semibold text-ink text-sm">Director Controls</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => navigate('/reports')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>Portfolio Executive Reports</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                  <button 
                    onClick={() => navigate('/weekly-status')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>Status Approval Dashboard</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm text-white space-y-2">
                <div className="flex items-center gap-1 text-cyan-400 font-bold text-xs">
                  <Activity size={14} /> AI Portfolio Governance Summary
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed italic">
                  "Delta portfolio health is currently stable at 75% Green. Compliance shows minor delay in healthcare pod uploads due to credential dependencies. Overall team utilization rate is high at 88%."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. MANAGER VIEW */}
      {isManager && (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
          {/* Manager KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Team Size" 
              value={teamSize} 
              subtitle="Staff members allocated" 
              icon={Users} 
              colorClass="text-blue-600" 
              bgClass="bg-blue-50" 
            />
            <KpiCard 
              title="Pending Approvals" 
              value={pendingApprovals} 
              subtitle={pendingApprovals > 0 ? "Reviews outstanding" : "All cycles approved"} 
              icon={Clock} 
              colorClass={pendingApprovals > 0 ? "text-warning animate-pulse" : "text-ink-faint"} 
              bgClass="bg-warning-bg" 
            />
            <KpiCard 
              title="Team Compliance" 
              value={`${teamCompliance}%`} 
              subtitle={`For cycle week: ${selectedWeek}`} 
              icon={CheckCircle} 
              colorClass="text-success" 
              bgClass="bg-success-bg" 
            />
            <KpiCard 
              title="Missing Submissions" 
              value={missingSubmissionsCount} 
              subtitle="Expected uploads overdue" 
              icon={AlertTriangle} 
              colorClass={missingSubmissionsCount > 0 ? "text-danger animate-bounce" : "text-ink-faint"} 
              bgClass="bg-danger-bg" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Manager Hierarchy and activity */}
            <div className="col-span-1 lg:col-span-8 space-y-6">
              
              {/* MANAGER'S TEAM COMPLIANCE LIST */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-ink text-sm">My Team Status Compliance Monitor ({selectedWeek})</h3>
                  <p className="text-xs text-ink-soft">Review compliance status of developers reporting directly to you.</p>
                </div>

                <div className="space-y-2">
                  {myTeamEmployees.length === 0 ? (
                    <p className="text-xs text-ink-faint italic">No developers reporting to your manager ID.</p>
                  ) : (
                    myTeamEmployees.map(emp => {
                      const devStatus = getDeveloperStatusForWeek(emp.id, selectedWeek);
                      return (
                        <div key={emp.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface hover:bg-surface-alt transition-colors text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs uppercase border border-border text-slate-700">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-bold text-ink">{emp.name}</p>
                              <p className="text-[10px] text-ink-soft">{emp.title} • {emp.dept}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${devStatus.color}`}>
                            {devStatus.icon} {devStatus.label}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Team submissions queue list */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-ink text-sm">Team Weekly Activity Logs</h3>
                <div className="space-y-3">
                  {submissions.length === 0 ? (
                    <div className="text-center py-10 text-ink-faint text-xs">No status submissions found.</div>
                  ) : (
                    submissions.map(sub => {
                      const employee = employees.find(e => e.id === sub.employeeId);
                      return (
                        <div key={sub.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface-alt/50 hover:bg-surface-alt transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                              {employee?.name ? employee.name.split(' ').map(n => n[0]).join('') : 'EM'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink">{employee?.name}</p>
                              <p className="text-xs text-ink-soft">Period: {sub.weekLabelStr}</p>
                              <p className="text-[10px] text-ink-faint">Frequency: {sub.fields.frequency || 'Weekly'} • Project: {sub.fields.project || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-[10px] border ${
                              sub.status === 'approved' ? 'bg-success-bg text-success border-success/15' :
                              sub.status === 'submitted' ? 'bg-blue-50 text-blue-600 border-blue-150' :
                              sub.status === 'rejected' ? 'bg-danger-bg text-danger border-danger/15' :
                              sub.status === 'changes_requested' ? 'bg-purple-50 text-purple-700 border-purple-150' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {sub.status.replace('_', ' ')}
                            </span>
                            {sub.status === 'submitted' && (
                              <button 
                                onClick={() => navigate('/approvals')}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                title="Go to Approval Queue"
                              >
                                <ArrowRight size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Actions column */}
            <div className="col-span-1 lg:col-span-4 space-y-4">
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-ink text-sm">Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => navigate('/approvals')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>Approval Reviews ({pendingApprovals})</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                  <button 
                    onClick={() => navigate('/weekly-status')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>Fill Status sheet</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Risk Cards */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
                <h3 className="font-semibold text-ink text-sm flex items-center gap-1.5">
                  <ShieldAlert size={16} className="text-danger" />
                  Pod Health Alerts ({flaggedManagerRisks})
                </h3>
                {flaggedManagerRisks === 0 ? (
                  <p className="text-xs text-ink-faint italic">No critical risks in your pod.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {projects.filter(p => p.managerId === currentUser?.id && (p.risk === 'High' || p.risk === 'Critical' || p.health === 'red')).map(p => (
                      <div key={p.id} className="p-2.5 border border-border rounded-lg bg-danger-bg/25">
                        <p className="font-semibold text-ink">{p.name}</p>
                        <p className="text-ink-soft text-[10px] mt-0.5">Client: {p.client} • Health: <span className="text-danger font-bold uppercase">{p.health}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 4. EMPLOYEE VIEW */}
      {!isStudioHead && !isProjectDirector && !isManager && (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
          {/* Employee KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Current Report Status" 
              value={currentWeekStatusStr} 
              subtitle={currentWeekSubmission ? `Period: ${currentWeekSubmission.weekLabelStr.split(' ')[0]} ${currentWeekSubmission.weekLabelStr.split(' ')[1]}` : "No cycle started"} 
              icon={Activity} 
              colorClass={
                currentWeekSubmission?.status === 'approved' ? 'text-success' :
                currentWeekSubmission?.status === 'submitted' ? 'text-blue-600' :
                currentWeekSubmission?.status === 'rejected' ? 'text-danger' :
                currentWeekSubmission?.status === 'changes_requested' ? 'text-purple-600' : 'text-warning'
              } 
              bgClass={
                currentWeekSubmission?.status === 'approved' ? 'bg-success-bg' :
                currentWeekSubmission?.status === 'submitted' ? 'bg-blue-50' :
                currentWeekSubmission?.status === 'rejected' ? 'bg-danger-bg' :
                currentWeekSubmission?.status === 'changes_requested' ? 'bg-purple-50' : 'bg-warning-bg'
              } 
            />
            <KpiCard 
              title="Drafts Saved" 
              value={myDrafts} 
              subtitle="Pending submissions" 
              icon={FileText} 
              colorClass="text-warning" 
              bgClass="bg-warning-bg" 
            />
            <KpiCard 
              title="Reporting Compliance" 
              value={`${myCompliance}%`} 
              subtitle="Signed off cycles ratio" 
              icon={CheckCircle} 
              colorClass="text-success" 
              bgClass="bg-success-bg" 
            />
            <KpiCard 
              title="Average Worked Hours" 
              value={avgHours} 
              subtitle="Hours logged per period" 
              icon={Clock} 
              colorClass="text-blue-600" 
              bgClass="bg-blue-50" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Hours worked line graph */}
            <div className="col-span-1 lg:col-span-8 bg-surface border border-border rounded-xl p-5 shadow-sm space-y-6">
              <h3 className="font-semibold text-ink text-sm">Worked Hours & Submissions Trend Chart</h3>
              
              <div className="p-4 bg-surface-alt/20 border border-border rounded-xl flex items-center justify-center">
                {mySubmissions.length === 0 ? (
                  <div className="text-center py-10 text-ink-faint text-xs">No status logs to visualize.</div>
                ) : (
                  <svg width="100%" height="200" viewBox="0 0 500 160" preserveAspectRatio="none" className="overflow-visible text-xs">
                    <line x1="40" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                    <line x1="40" y1="70" x2="480" y2="70" stroke="#e2e8f0" strokeDasharray="3 3" />
                    <line x1="40" y1="120" x2="480" y2="120" stroke="#e2e8f0" strokeDasharray="3 3" />
                    
                    <text x="10" y="24" fill="#94a3b8" className="font-mono text-[9px]">40h</text>
                    <text x="10" y="74" fill="#94a3b8" className="font-mono text-[9px]">20h</text>
                    <text x="10" y="124" fill="#94a3b8" className="font-mono text-[9px]">0h</text>

                    <path
                      d={mySubmissions.slice().reverse().map((sub, idx) => {
                        const x = 40 + (idx * (440 / Math.max(1, mySubmissions.length - 1)));
                        const y = 120 - ((sub.fields.hoursWorked || 0) * 2.5);
                        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none" stroke="#2563eb" strokeWidth="3"
                    />

                    {mySubmissions.slice().reverse().map((sub, idx) => {
                      const x = 40 + (idx * (440 / Math.max(1, mySubmissions.length - 1)));
                      const y = 120 - ((sub.fields.hoursWorked || 0) * 2.5);
                      return (
                        <circle 
                          key={idx} cx={x} cy={y} r="4" 
                          fill={
                            sub.status === 'approved' ? '#10b981' :
                            sub.status === 'submitted' ? '#2563eb' : '#f59e0b'
                          } 
                          className="cursor-pointer hover:r-6 transition-all"
                        />
                      );
                    })}
                  </svg>
                )}
              </div>

              {/* Text submission log items */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Historical Logs</p>
                {mySubmissions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-2.5 border border-border rounded-lg text-xs bg-surface hover:bg-surface-alt/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-ink-soft" />
                      <div>
                        <span className="font-bold text-ink">{sub.weekLabelStr}</span>
                        <span className="text-[10px] text-ink-faint ml-2">Freq: {sub.fields.frequency || 'Weekly'} • {sub.fields.hoursWorked || 0} hrs reported</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.managerComment && (
                        <span className="text-[10px] text-ink-soft italic max-w-xs truncate hidden md:inline" title={sub.managerComment}>
                          "{sub.managerComment}"
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                        sub.status === 'approved' ? 'bg-success-bg text-success border-success/15' :
                        sub.status === 'submitted' ? 'bg-blue-50 text-blue-600 border-blue-150' :
                        sub.status === 'rejected' ? 'bg-danger-bg text-danger border-danger/15' :
                        sub.status === 'changes_requested' ? 'bg-purple-50 text-purple-700 border-purple-150' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="col-span-1 lg:col-span-4 space-y-4">
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-ink text-sm">Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => navigate('/weekly-status')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>Update Weekly & Daily Status</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                  <button 
                    onClick={() => navigate('/projects')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-surface-sunken hover:border-border-strong transition-colors text-xs font-semibold text-ink flex items-center justify-between group cursor-pointer"
                  >
                    <span>View Allocated Project Info</span>
                    <ArrowRight size={14} className="text-ink-faint group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Roster Allocation Focus details */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm text-white space-y-3">
                <h3 className="font-semibold text-sm">Design Allocation details</h3>
                <div className="space-y-2 text-xs">
                  <p className="text-slate-400">Assigned Pod:</p>
                  <div className="p-3 bg-white/10 rounded-lg border border-white/10 space-y-1">
                    <p className="font-bold text-sm text-blue-400">Retail Banking Portal</p>
                    <p className="text-slate-300">Client: Meridian Bank</p>
                    <p className="text-[10px] text-slate-400 font-mono">Assigned Allocation Ratio: 100%</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}