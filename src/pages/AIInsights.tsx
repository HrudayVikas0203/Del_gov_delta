import { useState } from 'react';
import {
  Brain,
  Sparkles,
  ShieldAlert,
  HeartPulse,
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  Zap,
  Database,
  ShieldCheck,
  Layers,
  Cpu,
  FileText,
  BarChart3,
  CircleDot,
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function AIInsights() {
  const { aiInsights, reports } = useStore();
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [expandedNarratives, setExpandedNarratives] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) =>
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleNarrative = (id: string) =>
    setExpandedNarratives(prev => ({ ...prev, [id]: !prev[id] }));

  // KPI computations
  const avgHealth =
    aiInsights.length > 0
      ? Math.round(aiInsights.reduce((s, i) => s + i.healthScore, 0) / aiInsights.length)
      : 0;

  const activeRisks = aiInsights.filter(
    i => i.riskAnalysis.level === 'High' || i.riskAnalysis.level === 'Critical'
  ).length;

  const avgSentiment =
    aiInsights.length > 0
      ? (aiInsights.reduce((s, i) => s + i.sentimentScore, 0) / aiInsights.length).toFixed(1)
      : '0.0';

  const reportsGenerated = reports.length;

  const healthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const healthBarColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-400 to-emerald-500';
    if (score >= 60) return 'bg-gradient-to-r from-amber-400 to-amber-500';
    return 'bg-gradient-to-r from-red-400 to-red-500';
  };

  const riskBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'High':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const trendIcon = (dir: string) => {
    switch (dir) {
      case 'improving':
        return <TrendingUp size={14} className="text-emerald-400" />;
      case 'declining':
        return <TrendingDown size={14} className="text-red-400" />;
      default:
        return <Minus size={14} className="text-amber-400" />;
    }
  };

  const trendBadgeClass = (dir: string) => {
    switch (dir) {
      case 'improving':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'declining':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
  };

  const pipelineSteps = [
    { icon: Database, label: 'Data Collection', desc: 'Weekly statuses' },
    { icon: ShieldCheck, label: 'Validation', desc: 'Quality checks' },
    { icon: Layers, label: 'Embedding', desc: 'Vector encoding' },
    { icon: Cpu, label: 'LLM Analysis', desc: 'GPT-4 reasoning' },
    { icon: FileText, label: 'Summary', desc: 'Narrative gen' },
    { icon: BarChart3, label: 'Reports', desc: 'PDF / PPT export' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-900 border border-violet-800/40 p-8 shadow-2xl">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
            <Brain size={28} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-white">AI Insights Engine</h1>
              <Sparkles size={20} className="text-violet-300 animate-pulse" />
            </div>
            <p className="text-violet-300/80 text-sm mt-1">
              AI-powered delivery intelligence — real-time risk analysis, health scoring, and narrative generation across your portfolio.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Health Score */}
        <div className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 p-5 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Portfolio Health</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <HeartPulse size={18} className="text-emerald-400" />
              </div>
            </div>
            <p className={`text-3xl font-bold font-mono ${healthColor(avgHealth)}`}>{avgHealth}<span className="text-lg text-slate-500">/100</span></p>
            <div className="mt-2 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${healthBarColor(avgHealth)}`} style={{ width: `${avgHealth}%` }} />
            </div>
          </div>
        </div>

        {/* Active Risks */}
        <div className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 p-5 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Risks</span>
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                <ShieldAlert size={18} className="text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-red-400">{activeRisks}</p>
            <p className="text-xs text-slate-500 mt-1">High / Critical severity projects</p>
          </div>
        </div>

        {/* Sentiment Index */}
        <div className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 p-5 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sentiment Index</span>
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Sparkles size={18} className="text-violet-400" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-violet-400">{avgSentiment}<span className="text-lg text-slate-500">/10</span></p>
            <p className="text-xs text-slate-500 mt-1">Aggregated team sentiment</p>
          </div>
        </div>

        {/* Reports Generated */}
        <div className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 p-5 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reports Generated</span>
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <FileBarChart size={18} className="text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-blue-400">{reportsGenerated}</p>
            <p className="text-xs text-slate-500 mt-1">PDF, PPT & Excel exports</p>
          </div>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-violet-400" />
          <h2 className="text-lg font-display font-bold text-ink">Project Intelligence Cards</h2>
          <span className="text-xs text-ink-faint ml-1">({aiInsights.length} projects analyzed)</span>
        </div>

        {aiInsights.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-surface border border-border">
            <Brain size={48} className="mx-auto text-ink-faint mb-3 opacity-30" />
            <p className="text-ink-soft text-sm">No AI insights available yet. Insights will appear once weekly statuses are processed.</p>
          </div>
        ) : (
          aiInsights.map(insight => {
            const isExpanded = expandedCards[insight.id] ?? true;
            const narrativeOpen = expandedNarratives[insight.id] ?? false;

            return (
              <div
                key={insight.id}
                className="rounded-2xl bg-surface border border-border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
              >
                {/* Card Header */}
                <button
                  onClick={() => toggleCard(insight.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-surface-alt/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
                      <CircleDot size={20} className="text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink">{insight.projectName}</h3>
                      <p className="text-xs text-ink-faint mt-0.5">
                        Week: {insight.weekKeyStr} · Generated {new Date(insight.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Health Score Mini */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${healthBarColor(insight.healthScore)}`}
                          style={{ width: `${insight.healthScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold font-mono ${healthColor(insight.healthScore)}`}>
                        {insight.healthScore}
                      </span>
                    </div>

                    {/* Trend Badge */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${trendBadgeClass(insight.trendDirection)}`}>
                      {trendIcon(insight.trendDirection)}
                      <span className="capitalize">{insight.trendDirection}</span>
                    </span>

                    {/* Risk Badge */}
                    <span className={`hidden md:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${riskBadge(insight.riskAnalysis.level)}`}>
                      {insight.riskAnalysis.level}
                    </span>

                    {isExpanded ? (
                      <ChevronUp size={18} className="text-ink-faint" />
                    ) : (
                      <ChevronDown size={18} className="text-ink-faint" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border px-5 pb-6 space-y-6">
                    {/* Executive Summary */}
                    <div className="pt-5">
                      <h4 className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText size={13} className="text-violet-400" />
                        Executive Summary
                      </h4>
                      <p className="text-sm text-ink leading-relaxed bg-violet-50/50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/10 rounded-xl p-4">
                        {insight.executiveSummary}
                      </p>
                    </div>

                    {/* Risk Analysis Section */}
                    <div>
                      <h4 className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-amber-400" />
                        Risk Analysis
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Risks */}
                        <div className="rounded-xl bg-red-50/60 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 p-4">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                            Identified Risks ({insight.riskAnalysis.risks.length})
                          </p>
                          <ul className="space-y-2">
                            {insight.riskAnalysis.risks.map((risk, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-ink">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Recommendations */}
                        <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-4">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            Recommendations ({insight.riskAnalysis.recommendations.length})
                          </p>
                          <ul className="space-y-2">
                            {insight.riskAnalysis.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-ink">
                                <CheckCircle2 size={14} className="mt-0.5 text-emerald-500 shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div>
                      <h4 className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <BarChart3 size={13} className="text-blue-400" />
                        Key Metrics
                      </h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-xl bg-surface-alt/50 border border-border p-4 text-center">
                          <Users size={18} className="mx-auto text-blue-500 mb-1.5" />
                          <p className="text-2xl font-bold font-mono text-ink">{insight.keyMetrics.teamUtilization}<span className="text-sm text-ink-faint">%</span></p>
                          <p className="text-[11px] text-ink-faint mt-0.5">Team Utilization</p>
                        </div>
                        <div className="rounded-xl bg-surface-alt/50 border border-border p-4 text-center">
                          <CheckCircle2 size={18} className="mx-auto text-emerald-500 mb-1.5" />
                          <p className="text-2xl font-bold font-mono text-ink">{insight.keyMetrics.onTimeDelivery}<span className="text-sm text-ink-faint">%</span></p>
                          <p className="text-[11px] text-ink-faint mt-0.5">On-Time Delivery</p>
                        </div>
                        <div className="rounded-xl bg-surface-alt/50 border border-border p-4 text-center">
                          <AlertTriangle size={18} className="mx-auto text-amber-500 mb-1.5" />
                          <p className="text-2xl font-bold font-mono text-ink">{insight.keyMetrics.blockerCount}</p>
                          <p className="text-[11px] text-ink-faint mt-0.5">Blocker Count</p>
                        </div>
                        <div className="rounded-xl bg-surface-alt/50 border border-border p-4 text-center">
                          <Clock size={18} className="mx-auto text-violet-500 mb-1.5" />
                          <p className="text-2xl font-bold font-mono text-ink">{insight.keyMetrics.avgHoursWorked}<span className="text-sm text-ink-faint">h</span></p>
                          <p className="text-[11px] text-ink-faint mt-0.5">Avg Hours / Week</p>
                        </div>
                      </div>
                    </div>

                    {/* Client Narrative (Collapsible) */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <button
                        onClick={() => toggleNarrative(insight.id)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-surface-alt/30 hover:bg-surface-alt/60 transition-colors text-left"
                      >
                        <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                          <FileBarChart size={13} className="text-indigo-400" />
                          Client-Ready Narrative
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-ink-faint bg-indigo-100 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full font-medium">Sanitized</span>
                          {narrativeOpen ? <ChevronUp size={16} className="text-ink-faint" /> : <ChevronDown size={16} className="text-ink-faint" />}
                        </div>
                      </button>
                      {narrativeOpen && (
                        <div className="px-4 py-4 border-t border-border">
                          <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                            {insight.clientNarrative}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Processing Pipeline */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-8 shadow-xl overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <Cpu size={18} className="text-violet-400" />
            <h2 className="text-lg font-display font-bold text-white">Processing Pipeline</h2>
            <span className="text-xs text-slate-500 ml-1">AI Workflow</span>
          </div>

          {/* Desktop Pipeline */}
          <div className="hidden md:flex items-center justify-between">
            {pipelineSteps.map((step, idx) => (
              <div key={step.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center text-center group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center mb-3 group-hover:from-violet-500/30 group-hover:to-indigo-500/30 group-hover:border-violet-400/50 group-hover:shadow-lg group-hover:shadow-violet-500/10 transition-all duration-300">
                    <step.icon size={22} className="text-violet-300 group-hover:text-violet-200 transition-colors" />
                  </div>
                  <p className="text-xs font-semibold text-white">{step.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{step.desc}</p>
                </div>
                {idx < pipelineSteps.length - 1 && (
                  <div className="flex-1 flex items-center justify-center px-1 -mt-6">
                    <div className="w-full h-px bg-gradient-to-r from-violet-500/40 via-indigo-500/60 to-violet-500/40 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[5px] border-l-indigo-400/60 border-y-[3px] border-y-transparent" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Pipeline */}
          <div className="md:hidden space-y-3">
            {pipelineSteps.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <step.icon size={18} className="text-violet-300" />
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <div className="w-px h-4 bg-gradient-to-b from-violet-500/40 to-transparent mt-1" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-700/50">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs text-slate-400 font-medium">Pipeline active · Last processed 2 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
