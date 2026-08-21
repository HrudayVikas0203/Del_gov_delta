import { useEffect, useState } from 'react';
import { FileText, Download, FileSpreadsheet, Presentation, File, Filter, Plus, Loader2, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiCreateReport, apiDownloadReport, apiListProviders, apiListReports } from '../services/api';
import type { Employee, GeneratedReport, LLMProvider } from '../types';
import { getManageableEmployees, getManageableProjects, getProjectTeam } from '../utils/governance';

type ReportRoleKey = 'program' | 'projectManager' | 'architect' | 'developer' | 'qa' | 'devops' | 'intern';

const reportRoleGroups: Array<{
  key: ReportRoleKey;
  label: string;
  employeeRoles: Employee['roleCategory'][];
}> = [
  { key: 'program', label: 'Program Managers / Directors', employeeRoles: ['Program Manager'] },
  { key: 'projectManager', label: 'Project Managers', employeeRoles: ['Manager'] },
  { key: 'architect', label: 'Architects', employeeRoles: ['Architect'] },
  { key: 'developer', label: 'Developers', employeeRoles: ['Developer'] },
  { key: 'qa', label: 'QA Engineers', employeeRoles: ['QA'] },
  { key: 'devops', label: 'DevOps Engineers', employeeRoles: ['DevOps'] },
  { key: 'intern', label: 'Interns', employeeRoles: ['Intern'] },
];
const reportTemplates = [
  {
    label: 'Executive Summary',
    format: 'PDF' as const,
    type: 'Executive Summary' as const,
    description: 'High-level overview of delivery health, risks, and milestones across all active projects.',
    icon: FileText,
    gradient: 'from-rose-500 to-orange-500',
    bgGlow: 'bg-rose-50',
    scope: 'All Projects',
  },
  {
    label: 'Client Report',
    format: 'PPT' as const,
    type: 'Client Report' as const,
    description: 'Presentation-ready slides with sprint progress, burndown charts, and stakeholder updates.',
    icon: Presentation,
    gradient: 'from-violet-500 to-purple-600',
    bgGlow: 'bg-violet-50',
    scope: 'Per Account',
  },
  {
    label: 'Team Utilization',
    format: 'Excel' as const,
    type: 'Portfolio Report' as const,
    description: 'Detailed spreadsheet of team allocation, bench time, and capacity planning metrics.',
    icon: FileSpreadsheet,
    gradient: 'from-emerald-500 to-teal-600',
    bgGlow: 'bg-emerald-50',
    scope: 'Studio-Wide',
  },
];

const formatConfig: Record<string, { color: string; bg: string; icon: typeof File }> = {
  PDF: { color: 'text-rose-600', bg: 'bg-rose-50', icon: FileText },
  PPT: { color: 'text-violet-600', bg: 'bg-violet-50', icon: Presentation },
  Excel: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: FileSpreadsheet },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' Â· ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

async function downloadBackendReport(report: GeneratedReport, token: string | null) {
  if (!token) {
    alert('Please sign in before downloading reports.');
    return;
  }

  try {
    const blob = await apiDownloadReport(report.id, token);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const extension = report.format === 'PDF' ? 'pdf' : report.format === 'PPT' ? 'pptx' : 'xlsx';
    anchor.download = `${report.title.replace(/\s+/g, '_')}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Report download failed:', error);
    alert(error instanceof Error ? error.message : 'Failed to download report.');
  }
}

export default function Reports() {
  const { reports, currentUser, authToken, setReports, addAuditLog, accounts, projects, employees, allocations } = useStore();
  const [filterFormat, setFilterFormat] = useState<'All' | 'PDF' | 'PPT' | 'Excel'>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [generating, setGenerating] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [selectedScopeAccount, setSelectedScopeAccount] = useState<string>('All Accounts');
  const [reportScopeMode, setReportScopeMode] = useState<'portfolio' | 'project' | 'individual'>('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedReportRole, setSelectedReportRole] = useState<ReportRoleKey>('developer');
  const [statusFrequency, setStatusFrequency] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('weekly');
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [selectedProviderName, setSelectedProviderName] = useState<string>('');
  const [selectedProviderModel, setSelectedProviderModel] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    setLoadError(null);
    apiListReports(authToken)
      .then((backendReports) => setReports(backendReports))
      .catch((error) => {
        console.error('Failed to load reports:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load reports from backend');
      });
  }, [authToken, setReports]);

  useEffect(() => {
    if (!authToken) return;

    apiListProviders(authToken)
      .then((backendProviders) => {
        setProviders(backendProviders);
        const preferred = backendProviders.find((provider) => provider.name === 'groq' && provider.configured)
          ?? backendProviders.find((provider) => provider.configured)
          ?? backendProviders[0];
        setSelectedProviderName((current) => {
          const currentProvider = backendProviders.find((provider) => provider.name === current);
          return currentProvider?.configured ? current : preferred?.name ?? '';
        });
        setSelectedProviderModel((current) => {
          if (current && preferred?.models.includes(current)) return current;
          return preferred?.default_model ?? preferred?.models[0] ?? null;
        });
      })
      .catch((error) => {
        console.error('Failed to load LLM providers:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load LLM providers');
      });
  }, [authToken]);

  useEffect(() => {
    if (!selectedProviderName || providers.length === 0) return;
    const provider = providers.find((item) => item.name === selectedProviderName);
    if (!provider) return;
    setSelectedProviderModel((current) => current && provider.models.includes(current) ? current : provider.default_model);
  }, [selectedProviderName, providers]);

  const currentProvider = providers.find((p) => p.name === selectedProviderName);
  const canGenerateReports = !!authToken && ['manager', 'program manager', 'studio head'].some(r => (currentUser?.roleCategory || '').toLowerCase() === r);
  const manageableProjects = getManageableProjects(currentUser, projects, allocations);
  const manageableAccountIds = new Set(manageableProjects.map((project) => project.accountId));
  const visibleAccounts = accounts.filter((account) => manageableAccountIds.has(account.id) || currentUser?.roleCategory === 'Studio Head');
  const accountFilteredProjects = selectedScopeAccount === 'All Accounts'
    ? manageableProjects
    : manageableProjects.filter((project) => accounts.find((account) => account.name === selectedScopeAccount)?.id === project.accountId);
  const projectFilteredEmployees = selectedProjectId
    ? getProjectTeam(selectedProjectId, employees, projects, allocations)
    : getManageableEmployees(currentUser, employees, projects, allocations);
  const manageableEmployees = projectFilteredEmployees.filter((employee) => employee.id !== currentUser?.id);
  const selectedReportRoleGroup = reportRoleGroups.find((group) => group.key === selectedReportRole) ?? reportRoleGroups[3];
  const roleFilteredReportEmployees = manageableEmployees.filter((employee) => selectedReportRoleGroup.employeeRoles.includes(employee.roleCategory));
  const selectedProject = projects.find((item) => item.id === selectedProjectId);
  const selectedEmployee = employees.find((item) => item.id === selectedEmployeeId);
  const selectedAccount = selectedProject
    ? accounts.find((account) => account.id === selectedProject.accountId)
    : accounts.find((account) => account.name === selectedScopeAccount);

  const handleGenerate = async (template: typeof reportTemplates[number]) => {
    if (!authToken) {
      alert('Please sign in before generating reports.');
      return;
    }
    if (!canGenerateReports) {
      setLoadError('Report generation is available for Project Managers, Directors, and Studio Head.');
      return;
    }
    if (reportScopeMode === 'project' && !selectedProjectId) {
      setLoadError('Select a project before generating a project rollup report.');
      return;
    }
    if (reportScopeMode === 'individual' && !selectedProjectId) {
      setLoadError('Select the project allocation group before choosing an individual status report.');
      return;
    }
    if (reportScopeMode === 'individual' && !selectedEmployeeId) {
      setLoadError('Select a team member before generating an individual status report.');
      return;
    }

    if (template.format === 'PPT' && !selectedAccount) {
      setLoadError('Select one account before generating a PPT report.');
      return;
    }
    if (template.format === 'PPT' && selectedAccount?.pptTemplateStatus !== 'configured') {
      setLoadError('Account PPT template is not configured.');
      return;
    }
    const geminiProvider = providers.find((provider) => provider.name === 'gemini' && provider.configured);
    if (template.format === 'PPT' && !geminiProvider) {
      setLoadError('Gemini PPT mapping is not configured.');
      return;
    }

    const key = template.label;
    setGenerating(key);
    setLoadError(null);

    const finalScope =
      reportScopeMode === 'project' && selectedProject
        ? `Project Rollup: ${selectedProject.name}`
        : reportScopeMode === 'individual' && selectedEmployee
          ? `Individual Status: ${selectedEmployee.name}`
          : selectedScopeAccount === 'All Accounts'
            ? template.scope
            : selectedScopeAccount;
    const titleSuffix =
      reportScopeMode === 'project' && selectedProject
        ? ` (${selectedProject.name})`
        : reportScopeMode === 'individual' && selectedEmployee
          ? ` (${selectedEmployee.name})`
          : selectedScopeAccount === 'All Accounts'
            ? ''
            : ` (${selectedScopeAccount})`;

    const formatMap = {
      PDF: 'pdf',
      PPT: 'pptx',
      Excel: 'xlsx',
    } as const;

    const reportTypeMap = {
      'Executive Summary': 'executive_summary',
      'Client Report': 'client_report',
      'Portfolio Report': 'portfolio_report',
    } as const;

    const requestedFormat = formatMap[template.format];
    const payload = {
      title: `${template.label}${titleSuffix} — ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
      report_type: reportTypeMap[template.type] || 'executive_summary',
      report_format: requestedFormat,
      scope: finalScope,
      account_id: selectedAccount?.id,
      project_id: (reportScopeMode === 'project' || reportScopeMode === 'individual') ? selectedProjectId : undefined,
      employee_id: reportScopeMode === 'individual' ? selectedEmployeeId : undefined,
      status_frequency: statusFrequency === 'all' ? undefined : statusFrequency,
      llm: (() => {
        const pptProvider = template.format === 'PPT' ? geminiProvider : undefined;
        const provider = pptProvider ?? currentProvider;
        return provider?.configured ? { provider: provider.name, model: provider.default_model } : undefined;
      })(),
      use_celery: false,
    };

    try {
      const created = await apiCreateReport(payload, authToken);
      setReports([created, ...reports]);
      addAuditLog(
        currentUser?.id || 'sys',
        currentUser?.name || 'System',
        'Report Generated',
        'Reports',
        `Generated report: "${created.title}" (${created.format})`
      );
      setJustGenerated(key);
      setTimeout(() => setJustGenerated(null), 2000);
    } catch (error) {
      console.error('Failed to create report:', error);
      setLoadError(error instanceof Error ? error.message : 'Unable to create report');
    } finally {
      setGenerating(null);
    }
  };

  const types = ['All', ...Array.from(new Set(reports.map(r => r.type)))];

  const filtered = reports.filter(r => {
    if (filterFormat !== 'All' && r.format !== filterFormat) return false;
    if (filterType !== 'All' && r.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">Report Center</h1>
            <p className="text-ink-soft text-sm">Generate, manage, and download delivery reports.</p>
          </div>
        </div>
<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-ink-faint">
            <div className="flex items-center gap-2">
              <File size={14} />
              <span>{reports.length} report{reports.length !== 1 ? 's' : ''} generated</span>
            </div>
            {loadError && (
              <div className="rounded-full bg-danger/10 border border-danger/20 px-3 py-1 text-danger text-xs font-medium">
                {loadError}
              </div>
            )}
        </div>
      </div>

      {/* Generate New Report Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-ink-soft" />
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">Generate New Report</h2>
        </div>

        {/* Target Scope Dropdown */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-ink">Select Target Scope for New Reports</h3>
            <p className="text-xs text-ink-soft">The generated slides and PDF covers will be filtered specifically to the selected client account.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-soft">Target Account:</label>
            <select
              value={selectedScopeAccount}
              onChange={(e) => {
                setSelectedScopeAccount(e.target.value);
                setSelectedProjectId('');
                setSelectedEmployeeId('');
              }}
              className="text-xs px-3 py-2 rounded-lg border border-border bg-surface text-ink font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              <option value="All Accounts">All Accounts & Projects (Studio-Wide)</option>
              {visibleAccounts.map(acc => (
                <option key={acc.id} value={acc.name}>{acc.name} ({acc.industry})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink">Report Coverage</h3>
            <p className="text-xs text-ink-soft">Generate individual developer reports or full project rollups from all submitted statuses.</p>
          </div>
          <div className="grid gap-2 max-w-sm">
            <label className="text-xs font-semibold text-ink-soft">Status period included in PPT/PDF</label>
            <select
              value={statusFrequency}
              onChange={(e) => setStatusFrequency(e.target.value as typeof statusFrequency)}
              className="text-xs px-3 py-2 rounded-lg border border-border bg-surface text-ink font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">All submitted status cycles</option>
              <option value="daily">Daily statuses only</option>
              <option value="weekly">Weekly statuses only</option>
              <option value="monthly">Monthly statuses only</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { value: 'portfolio', label: 'Portfolio / account' },
              { value: 'project', label: 'Complete project' },
              { value: 'individual', label: 'Individual status' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReportScopeMode(option.value as typeof reportScopeMode)}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                  reportScopeMode === option.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-border bg-surface text-ink-soft hover:border-border-strong'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {(reportScopeMode === 'project' || reportScopeMode === 'individual') && (
            <div className="grid gap-2 max-w-md">
              <label className="text-xs font-semibold text-ink-soft">Project / allocation group</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedEmployeeId('');
                }}
                className="text-xs px-3 py-2 rounded-lg border border-border bg-surface text-ink font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Select project</option>
                {accountFilteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name} ({project.client})</option>
                ))}
              </select>
            </div>
          )}

          {reportScopeMode === 'individual' && (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] max-w-5xl">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-soft">Designation</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {reportRoleGroups.map((group) => {
                    const isSelected = selectedReportRole === group.key;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => {
                          setSelectedReportRole(group.key);
                          setSelectedEmployeeId('');
                        }}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-border bg-surface text-ink-soft hover:border-blue-200 hover:bg-blue-50/40'
                        }`}
                      >
                        {group.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-ink-soft">Available {selectedReportRoleGroup.label}</label>
                  {selectedEmployee && (
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeId('')}
                      className="rounded-full bg-blue-50 border border-blue-200 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Selected: {selectedEmployee.name} x
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roleFilteredReportEmployees.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border bg-surface p-3 text-xs text-ink-faint sm:col-span-2">
                      No people are available for this designation in the selected project.
                    </p>
                  ) : roleFilteredReportEmployees.map((employee) => {
                    const isSelected = selectedEmployeeId === employee.id;
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => setSelectedEmployeeId(employee.id)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                            : 'border-border bg-surface text-ink hover:border-blue-200 hover:bg-blue-50/40'
                        }`}
                      >
                        <span className="block font-semibold">{employee.name}</span>
                        <span className="block text-[10px] text-ink-faint">{employee.title}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-ink-faint">
                  {selectedProjectId ? 'Filtered to people allocated to the selected project.' : 'Select a project to restrict this list to that project team.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Account PPT template</h3>
              <p className="text-xs text-ink-soft">Project reports automatically use the selected account's stored template.</p>
              {!selectedAccount ? (
                <p className="text-xs text-ink-faint">Select an account to see its template configuration.</p>
              ) : (
                <div className="rounded-lg border border-border bg-surface-alt/40 px-3 py-2 text-xs">
                  {selectedAccount.pptTemplateStatus === 'configured' ? (
                    <span className="text-success font-semibold">
                      Configured: {selectedAccount.pptTemplateFilename}
                    </span>
                  ) : (
                    <span className="text-warning font-semibold">No PPT template configured for this account.</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">LLM provider</h3>
              <p className="text-xs text-ink-soft">Pick a configured provider to enrich report narrative generation.</p>
              <div className="grid gap-3">
                <select
                  value={selectedProviderName}
                  onChange={(e) => setSelectedProviderName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-surface text-ink font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {providers.map((provider) => (
                    <option key={provider.name} value={provider.name} disabled={!provider.configured}>
                      {provider.display_name} {provider.configured ? '' : '(Not configured)'}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedProviderModel ?? ''}
                  onChange={(e) => setSelectedProviderModel(e.target.value)}
                  disabled={!currentProvider}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-surface text-ink font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {currentProvider?.models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reportTemplates.map((t) => {
            const isLoading = generating === t.label;
            const isDone = justGenerated === t.label;
            const Icon = t.icon;

            return (
              <div
                key={t.label}
                className={`relative group bg-surface border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-border-strong transition-all duration-300 overflow-hidden ${isLoading ? 'pointer-events-none' : ''}`}
              >
                {/* Glow blob */}
                <div className={`absolute -top-8 -right-8 w-32 h-32 ${t.bgGlow} rounded-full opacity-60 blur-2xl group-hover:opacity-100 transition-opacity`} />

                <div className="relative z-10 space-y-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon size={22} className="text-white" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-ink text-base">{t.label}</h3>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-ink/5 text-ink-soft">
                      {t.format}
                    </span>
                  </div>

                  <p className="text-sm text-ink-soft leading-relaxed">{t.description}</p>

                  <button
                    onClick={() => handleGenerate(t)}
                    disabled={isLoading || !canGenerateReports}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                      isDone
                        ? 'bg-success/10 text-success border border-success/20'
                      : isLoading
                        ? 'bg-ink/5 text-ink-soft border border-border cursor-wait'
                      : !canGenerateReports
                        ? 'bg-ink/5 text-ink-faint border border-border cursor-not-allowed'
                        : `bg-gradient-to-r ${t.gradient} text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`
                    }`}
                  >
                    {isDone ? (
                      <>
                        <Check size={16} className="animate-bounce" />
                        Generated!
                      </>
                    ) : isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Generatingâ€¦
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        {canGenerateReports ? 'Generate' : 'Manager only'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 text-ink-soft">
            <Filter size={16} />
            <span className="text-sm font-semibold">Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Format Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-ink-faint font-medium">Format:</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(['All', 'PDF', 'PPT', 'Excel'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterFormat(f)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      filterFormat === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-surface text-ink-soft hover:bg-surface-alt'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-ink-faint font-medium">Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-surface text-ink font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all cursor-pointer"
              >
                {types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:ml-auto text-xs text-ink-faint">
            Showing {filtered.length} of {reports.length} reports
          </div>
        </div>
      </div>
 
      {/* Reports Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt/60 border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">Format</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">Scope</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">Generated At</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">Size</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-ink/5 flex items-center justify-center">
                        <FileText size={24} className="text-ink-faint" />
                      </div>
                      <p className="text-ink-faint text-sm">No reports match your filters.</p>
                      <button
                        onClick={() => { setFilterFormat('All'); setFilterType('All'); }}
                        className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((report, i) => {
                  const fc = formatConfig[report.format] || formatConfig.PDF;
                  const FormatIcon = fc.icon;
 
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-surface-alt/40 transition-colors group"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {/* Title */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${fc.bg} flex items-center justify-center shrink-0`}>
                            <FormatIcon size={16} className={fc.color} />
                          </div>
                          <span className="font-semibold text-ink truncate max-w-[220px]">{report.title}</span>
                        </div>
                      </td>
 
                      {/* Type badge */}
                      <td className="px-5 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {report.type}
                        </span>
                      </td>
 
                      {/* Format */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${fc.bg} ${fc.color}`}>
                          <FormatIcon size={12} />
                          {report.format}
                        </span>
                      </td>
 
                      {/* Scope */}
                      <td className="px-5 py-4 text-ink-soft text-xs">{report.scope}</td>
 
                      {/* Generated At */}
                      <td className="px-5 py-4 text-ink-soft text-xs font-mono whitespace-nowrap">{formatDate(report.generatedAt)}</td>
 
                      {/* Size */}
                      <td className="px-5 py-4 text-ink-soft text-xs font-mono">{report.size}</td>
 
                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          report.status === 'Ready'
                            ? 'bg-success-bg text-success'
                            : report.status === 'Generating'
                            ? 'bg-warning-bg text-warning'
                            : 'bg-danger-bg text-danger'
                        }`}>
                          {report.status === 'Ready' && <Check size={10} />}
                          {report.status === 'Generating' && <Loader2 size={10} className="animate-spin" />}
                          {report.status}
                        </span>
                      </td>
 
                      {/* Download */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            downloadBackendReport(report, authToken);
                            addAuditLog(
                              currentUser?.id || 'sys',
                              currentUser?.name || 'System',
                              'Report Downloaded',
                              'Reports',
                              `Downloaded report: "${report.title}" (${report.format})`
                            );
                          }}
                          disabled={report.status !== 'Ready'}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                            report.status === 'Ready'
                              ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow-md hover:scale-105 active:scale-95'
                              : 'bg-ink/5 text-ink-faint cursor-not-allowed'
                          }`}
                        >
                          <Download size={13} />
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}









