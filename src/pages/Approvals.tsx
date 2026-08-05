import { useState } from 'react';
import { Check, X, ClipboardList, User, ShieldAlert, Award, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { WeeklyStatus } from '../types';
import { canReviewSubmission, getVisibleSubmissions } from '../utils/governance';

export default function Approvals() {
  const { submissions, employees, approveStatus, rejectStatus, currentUser, projects, allocations } = useStore();

  const visibleSubmissions = getVisibleSubmissions(currentUser, submissions, employees, projects, allocations);
  const pendingSubmissions = visibleSubmissions.filter(s => s.status === 'submitted' && canReviewSubmission(currentUser, s, employees, projects, allocations));
  const mySubmissions = submissions.filter(s => s.employeeId === currentUser?.id);
  const canReview = pendingSubmissions.length > 0 || ['Manager', 'Program Manager', 'Studio Head'].includes(currentUser?.roleCategory || '');
  
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [managerComment, setManagerComment] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Active submission for details inspection
  const activeSub = submissions.find(s => s.id === selectedSubId);
  const activeSubEmployee = activeSub ? employees.find(e => e.id === activeSub.employeeId) : null;

  // Handle Approve Action
  const handleApproveAction = (id: string) => {
    approveStatus(id, managerComment);
    setManagerComment('');
    setSelectedSubId('');
    showFeedback('Submission approved successfully.');
  };

  // Handle Reject / Request Changes Action
  const handleRejectAction = (id: string, isChangesRequested: boolean) => {
    rejectStatus(id, managerComment || (isChangesRequested ? 'Changes requested. Please review deliverables.' : 'Rejected. Please review deliverables.'), isChangesRequested);
    setManagerComment('');
    setSelectedSubId('');
    showFeedback(isChangesRequested ? 'Changes requested. Feedback sent back to engineer.' : 'Submission rejected.');
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  const getStatusBadge = (status: WeeklyStatus['status']) => {
    const maps = {
      approved: 'bg-success-bg text-success border-success/20',
      submitted: 'bg-blue-50 text-blue-600 border-blue-100',
      rejected: 'bg-danger-bg text-danger border-danger/30',
      draft: 'bg-slate-100 text-slate-600 border-slate-200',
      not_started: 'bg-amber-50 text-amber-600 border-amber-200/50',
      changes_requested: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${maps[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-display font-bold text-ink">
          {canReview ? "Approvals Queue" : "My Submission Status"}
        </h1>
        <p className="text-ink-soft text-sm mt-1">
          {canReview 
            ? "Review, critique, and sign off on weekly status sheets submitted within your delivery hierarchy." 
            : "Monitor review history, comments, and approvals for your status sheets."}
        </p>
      </div>

      {feedbackMessage && (
        <div className="bg-success-bg text-success border border-success/20 p-4 rounded-xl text-sm font-semibold shadow-sm animate-pulse">
          {feedbackMessage}
        </div>
      )}

      {canReview ? (
        /* ==================== MANAGER VIEW ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pending Submissions Queue */}
          <div className="col-span-1 lg:col-span-5 bg-surface border border-border rounded-xl p-4 shadow-sm h-fit space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="font-semibold text-ink text-xs uppercase tracking-wider">Awaiting Sign-off ({pendingSubmissions.length})</h3>
              <ClipboardList size={16} className="text-ink-faint" />
            </div>

            <div className="space-y-2">
              {pendingSubmissions.length === 0 ? (
                <div className="text-center py-12 text-ink-faint text-sm">
                  🎉 All submissions are reviewed! No pending approvals.
                </div>
              ) : (
                pendingSubmissions.map(sub => {
                  const emp = employees.find(e => e.id === sub.employeeId);
                  const isSelected = sub.id === selectedSubId;
                  
                  return (
                    <button
                      key={sub.id}
                      onClick={() => { setSelectedSubId(sub.id); setManagerComment(''); }}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center justify-between group ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                          : 'border-border bg-surface hover:bg-surface-alt hover:border-border-strong'
                      }`}
                    >
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between gap-1 w-full">
                          <p className="font-semibold text-ink flex items-center gap-1.5 text-xs truncate max-w-[150px]">
                            <User size={12} className="text-slate-400 shrink-0" />
                            {emp?.name}
                          </p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            sub.fields.overallStatus === 'Red' ? 'bg-danger-bg text-danger' :
                            sub.fields.overallStatus === 'Amber' ? 'bg-warning-bg text-warning' :
                            'bg-success-bg text-success'
                          }`}>
                            Risk: {sub.fields.overallStatus || 'Green'}
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-soft">Project: <span className="font-medium text-ink">{sub.fields.project || 'Unassigned'}</span></p>
                        <p className="text-[10px] text-ink-faint">
                          Freq: <span className="font-medium text-ink-soft">{sub.fields.frequency || 'Weekly'}</span> ({sub.weekLabelStr.split(' ')[0]} {sub.weekLabelStr.split(' ')[1] || ''})
                        </p>
                        <p className="text-[10px] text-ink-faint font-mono font-bold">{sub.fields.hoursWorked || 0} hours reported</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Details & Review Panel */}
          <div className="col-span-1 lg:col-span-7 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
            {!activeSub ? (
              <div className="text-center py-24 text-ink-faint text-sm flex flex-col items-center justify-center gap-3">
                <FileText size={40} className="text-border" />
                <p>Select a pending status sheet from the queue to start review.</p>
              </div>
            ) : (
              <>
                {/* Details Header */}
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-ink">{activeSubEmployee?.name}</h3>
                    <p className="text-xs text-ink-soft mt-0.5">{activeSubEmployee?.title} • week of {activeSub.weekLabelStr}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-warning-bg text-warning text-xs font-semibold rounded-lg border border-warning/10">
                    Awaiting Review
                  </span>
                </div>

                {/* Grid fields */}
                <div className="space-y-4 text-sm max-h-[400px] overflow-y-auto pr-2 scrollbar-none">
                  {/* Hours */}
                  <div className="bg-surface-alt/50 p-3 rounded-lg flex justify-between items-center">
                    <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">Reported Hours</span>
                    <span className="font-mono font-bold text-ink text-base">{activeSub.fields.hoursWorked || 0} Hours</span>
                  </div>

                  {/* Achievements */}
                  {activeSub.fields.achievements && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Accomplishments</p>
                      <p className="p-3 bg-surface-alt/30 border border-border rounded-lg text-ink leading-relaxed">{activeSub.fields.achievements}</p>
                    </div>
                  )}

                  {/* Completed & Pending */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSub.fields.completedTasks && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Completed Tasks</p>
                        <p className="p-3 bg-surface-alt/30 border border-border rounded-lg text-ink leading-relaxed text-xs">{activeSub.fields.completedTasks}</p>
                      </div>
                    )}
                    {activeSub.fields.pendingTasks && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">In-Progress Tasks</p>
                        <p className="p-3 bg-surface-alt/30 border border-border rounded-lg text-ink leading-relaxed text-xs">{activeSub.fields.pendingTasks}</p>
                      </div>
                    )}
                  </div>

                  {/* Blockers & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSub.fields.blockers && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1">
                          <ShieldAlert size={12} /> Blockers
                        </p>
                        <p className="p-3 bg-danger-bg/50 border border-danger/25 rounded-lg text-ink leading-relaxed text-xs">{activeSub.fields.blockers}</p>
                      </div>
                    )}
                    {activeSub.fields.risks && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-warning uppercase tracking-wider flex items-center gap-1">
                          <ShieldAlert size={12} /> Risks
                        </p>
                        <p className="p-3 bg-warning-bg border border-warning/20 rounded-lg text-ink leading-relaxed text-xs">{activeSub.fields.risks}</p>
                      </div>
                    )}
                  </div>

                  {/* Next Week Plan */}
                  {activeSub.fields.nextWeekPlan && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Next Week Backlog Focus</p>
                      <p className="p-3 bg-surface-alt/30 border border-border rounded-lg text-ink leading-relaxed text-xs">{activeSub.fields.nextWeekPlan}</p>
                    </div>
                  )}

                  {/* Support Required */}
                  {activeSub.fields.supportRequired && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Support Required</p>
                      <p className="p-3 bg-blue-50/30 border border-blue-100 rounded-lg text-ink leading-relaxed text-xs">{activeSub.fields.supportRequired}</p>
                    </div>
                  )}
                </div>

                {/* Manager Critique Form */}
                <div className="space-y-3 border-t border-border pt-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Feedback Comments</label>
                    <textarea
                      rows={2}
                      placeholder="Add critique, recommendations, or sign-off notes..."
                      value={managerComment}
                      onChange={(e) => setManagerComment(e.target.value)}
                      className="w-full p-2.5 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end flex-wrap">
                    <button
                      onClick={() => handleRejectAction(activeSub.id, false)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <X size={14} /> Reject Report
                    </button>
                    <button
                      onClick={() => handleRejectAction(activeSub.id, true)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <X size={14} /> Request Changes
                    </button>
                    <button
                      onClick={() => handleApproveAction(activeSub.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-success text-white hover:bg-success/90 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Check size={14} /> Approve Status
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ==================== EMPLOYEE VIEW ==================== */
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-ink text-sm border-b border-border pb-2 flex items-center gap-1.5">
            <Award size={18} className="text-blue-600" />
            Sign-off Logs & History
          </h3>

          <div className="space-y-3">
            {mySubmissions.length === 0 ? (
              <div className="text-center py-12 text-ink-faint text-sm">No submissions recorded.</div>
            ) : (
              mySubmissions.map(sub => (
                <div key={sub.id} className="p-4 border border-border rounded-xl hover:border-border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface hover:shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm">{sub.weekLabelStr}</span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <p className="text-xs text-ink-soft">Reported Hours: <span className="font-semibold font-mono text-ink">{sub.fields.hoursWorked || 0} hrs</span></p>
                    {sub.submittedAt && (
                      <p className="text-[10px] text-ink-faint">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                    )}
                  </div>

                  {sub.managerComment && (
                    <div className="flex-1 md:mx-6 p-3 bg-surface-alt/60 rounded-lg border border-border text-xs text-ink-soft space-y-1">
                      <p className="font-semibold text-[10px] uppercase text-ink-soft tracking-wider">Manager comment:</p>
                      <p className="italic">"{sub.managerComment}"</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
