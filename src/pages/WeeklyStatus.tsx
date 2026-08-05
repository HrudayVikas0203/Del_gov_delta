import { useState, useEffect } from 'react';
import { Calendar, Save, Send, AlertTriangle, HelpCircle, CheckCircle, ChevronRight, Plus, FileText, Presentation, Paperclip, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { WeeklyStatus } from '../types';
import { canReviewSubmission, getManageableEmployees, getVisibleSubmissions } from '../utils/governance';

export default function WeeklyStatus() {
  const { previewRole, currentUser, submissions, employees, submitWeeklyStatus, saveDraftStatus, addNewWeeklyStatus, deleteWeeklyStatus, accounts, projects, allocations } = useStore();
  const isStudioHead = previewRole === 'studio_head';
  const manageableEmployees = getManageableEmployees(currentUser, employees, projects, allocations);

  // Filter states
  const [filterProject, setFilterProject] = useState('All');
  const [filterEmployee, setFilterEmployee] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterFrequency, setFilterFrequency] = useState('All');
  const [filterPeriod, setFilterPeriod] = useState<'All' | 'Today' | 'Weekly' | 'Daily' | 'Monthly'>('All');
  const [filterAccount, setFilterAccount] = useState('All');
  const [filterRisk, setFilterRisk] = useState('All');

  const visibleSubmissions = getVisibleSubmissions(currentUser, submissions, employees, projects, allocations);

  const filteredSubmissions = visibleSubmissions.filter(sub => {
    if (filterProject !== 'All' && sub.fields.project !== filterProject) {
      return false;
    }
    if (filterEmployee !== 'All' && sub.employeeId !== filterEmployee) {
      return false;
    }
    if (filterStatus !== 'All' && sub.status !== filterStatus) {
      return false;
    }
    if (filterAccount !== 'All' && sub.fields.account !== filterAccount) {
      return false;
    }
    if (filterRisk !== 'All' && sub.fields.overallStatus !== filterRisk) {
      return false;
    }
    if (filterFrequency !== 'All') {
      const freq = sub.fields.frequency || 'Weekly';
      if (freq !== filterFrequency) return false;
    }
    if (filterPeriod !== 'All') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const subDate = new Date(sub.updatedAt);
      
      if (filterPeriod === 'Today') {
        const subDateStr = subDate.toISOString().split('T')[0];
        if (subDateStr !== todayStr) return false;
      } else if (filterPeriod === 'Weekly') {
        const diffTime = Math.abs(today.getTime() - subDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (filterPeriod === 'Monthly') {
        const diffTime = Math.abs(today.getTime() - subDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return false;
      } else if (filterPeriod === 'Daily') {
        if ((sub.fields.frequency || 'Weekly') !== 'Daily') return false;
      }
    }
    return true;
  });

  // Selected submission ID
  const [selectedSubId, setSelectedSubId] = useState<string>('');

  // Form states
  const [achievements, setAchievements] = useState('');
  const [completedTasks, setCompletedTasks] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [blockers, setBlockers] = useState('');
  const [risks, setRisks] = useState('');
  const [dependencies, setDependencies] = useState('');
  const [hoursWorked, setHoursWorked] = useState<number>(40);
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [comments, setComments] = useState('');

  // Extended form states
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly'>('Weekly');
  const [dateStr, setDateStr] = useState('');
  const [account, setAccount] = useState('');
  const [project, setProject] = useState('');
  const [sprint, setSprint] = useState('');
  const [tasksInProgress, setTasksInProgress] = useState('');
  const [pendingWork, setPendingWork] = useState('');
  const [clientDependencies, setClientDependencies] = useState('');
  const [plannedWork, setPlannedWork] = useState('');
  const [overallStatus, setOverallStatus] = useState<'Green' | 'Amber' | 'Red'>('Green');
  const [completionPercent, setCompletionPercent] = useState<number>(0);
  const [attachmentsSimulated, setAttachmentsSimulated] = useState<string[]>([]);
  const [newAttachment, setNewAttachment] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalFrequency, setModalFrequency] = useState<'Daily' | 'Weekly'>('Weekly');
  const [modalWeekNumber, setModalWeekNumber] = useState('');
  const [modalWeekStartDate, setModalWeekStartDate] = useState('');
  const [modalWeekEndDate, setModalWeekEndDate] = useState('');
  const [modalCurrentDate, setModalCurrentDate] = useState('');
  const [modalAccount, setModalAccount] = useState('');
  const [modalProject, setModalProject] = useState('');
  const [modalSprint, setModalSprint] = useState('');
  const [modalModule, setModalModule] = useState('');
  const [modalTaskName, setModalTaskName] = useState('');
  const [modalAchievements, setModalAchievements] = useState('');
  const [modalCompletedTasks, setModalCompletedTasks] = useState('');
  const [modalWorkInProgress, setModalWorkInProgress] = useState('');
  const [modalPendingTasks, setModalPendingTasks] = useState('');
  const [modalRisks, setModalRisks] = useState('');
  const [modalBlockers, setModalBlockers] = useState('');
  const [modalDependencies, setModalDependencies] = useState('');
  const [modalClientDependencies, setModalClientDependencies] = useState('');
  const [modalSupportRequired, setModalSupportRequired] = useState('');
  const [modalNextWeekPlan, setModalNextWeekPlan] = useState('');
  const [modalOverallComments, setModalOverallComments] = useState('');
  const [modalOverallStatus, setModalOverallStatus] = useState<'Green' | 'Amber' | 'Red'>('Green');
  const [modalCompletionPercent, setModalCompletionPercent] = useState<number>(0);
  const [modalHoursWorked, setModalHoursWorked] = useState<number>(40);
  const [modalPriority, setModalPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [modalAttachments, setModalAttachments] = useState<string[]>([]);
  const [modalNewAttachment, setModalNewAttachment] = useState('');
  const [modalEmployeeNotes, setModalEmployeeNotes] = useState('');

  // Notification feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Active submission object
  const activeSubmission = submissions.find(s => s.id === selectedSubId);

  // Default select first filtered submission on load or change
  useEffect(() => {
    if (filteredSubmissions.length > 0) {
      if (!selectedSubId || !filteredSubmissions.find(s => s.id === selectedSubId)) {
        setSelectedSubId(filteredSubmissions[0].id);
      }
    }
  }, [filteredSubmissions, selectedSubId]);

  // Load selected submission fields into form
  useEffect(() => {
    if (activeSubmission) {
      const f = activeSubmission.fields || {};
      setAchievements(f.achievements || '');
      setCompletedTasks(f.completedTasks || '');
      setPendingTasks(f.pendingTasks || '');
      setBlockers(f.blockers || '');
      setRisks(f.risks || '');
      setDependencies(f.dependencies || '');
      setHoursWorked(f.hoursWorked !== undefined ? f.hoursWorked : 40);
      setNextWeekPlan(f.nextWeekPlan || '');
      setSupportRequired(f.supportRequired || '');
      setComments(f.comments || f.overallComments || '');
      // New fields
      setFrequency(f.reportingFrequency || f.frequency || 'Weekly');
      setDateStr(f.currentDate || f.dateStr || activeSubmission.weekKeyStr || '');
      setAccount(f.account || '');
      setProject(f.project || '');
      setSprint(f.sprint || '');
      setTasksInProgress(f.workInProgress || f.tasksInProgress || '');
      setPendingWork(f.pendingWork || '');
      setClientDependencies(f.clientDependencies || '');
      setPlannedWork(f.plannedWork || '');
      setOverallStatus(f.overallStatus || 'Green');
      setCompletionPercent(f.completionPercent || 0);
      setAttachmentsSimulated(f.attachmentsSimulated || []);
      setNewAttachment('');
    }
  }, [activeSubmission]);

  // Handle submit status report
  const handleSubmit = () => {
    if (!selectedSubId) return;
    if (hoursWorked < 0) {
      showFeedback('error', 'Please enter a valid number of hours worked.');
      return;
    }
    if (completionPercent < 0 || completionPercent > 100) {
      showFeedback('error', 'Please enter a valid completion percentage (0 - 100).');
      return;
    }
    submitWeeklyStatus(selectedSubId, {
      achievements,
      completedTasks,
      pendingTasks,
      blockers,
      risks,
      dependencies,
      hoursWorked,
      nextWeekPlan,
      supportRequired,
      comments,
      frequency,
      dateStr,
      account,
      project,
      sprint,
      tasksInProgress,
      pendingWork,
      clientDependencies,
      plannedWork,
      overallStatus,
      completionPercent,
      attachmentsSimulated
    });
    showFeedback('success', 'Status report submitted for review.');
  };

  // Helper to show brief feedback notifications
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Delete draft report
  const handleDeleteDraft = () => {
    if (!selectedSubId) return;
    if (confirm('Are you sure you want to delete this draft status report?')) {
      deleteWeeklyStatus(selectedSubId);
      setSelectedSubId('');
      showFeedback('success', 'Draft deleted successfully.');
    }
  };

  // Handle opening modal for creation
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setModalFrequency('Weekly');
    setModalWeekNumber('');
    setModalWeekStartDate('');
    setModalWeekEndDate('');
    setModalCurrentDate('');
    
    const empProj = projects.find(p => p.managerId === currentUser?.id || p.teamIds.includes(currentUser?.id || ''));
    setModalAccount(empProj ? accounts.find(a => a.id === empProj.accountId)?.name || '' : '');
    setModalProject(empProj ? empProj.name : '');
    
    setModalSprint('');
    setModalModule('');
    setModalTaskName('');
    setModalAchievements('');
    setModalCompletedTasks('');
    setModalWorkInProgress('');
    setModalPendingTasks('');
    setModalRisks('');
    setModalBlockers('');
    setModalDependencies('');
    setModalClientDependencies('');
    setModalSupportRequired('');
    setModalNextWeekPlan('');
    setModalOverallComments('');
    setModalOverallStatus('Green');
    setModalCompletionPercent(0);
    setModalHoursWorked(40);
    setModalPriority('Medium');
    setModalAttachments([]);
    setModalNewAttachment('');
    setModalEmployeeNotes('');
    setIsModalOpen(true);
  };

  // Handle opening modal for editing
  const handleOpenEditModal = () => {
    if (!activeSubmission) return;
    const f = activeSubmission.fields || {};
    setModalMode('edit');
    setModalFrequency(f.reportingFrequency || f.frequency || 'Weekly');
    setModalWeekNumber(f.weekNumber || '');
    setModalWeekStartDate(f.weekStartDate || activeSubmission.weekKeyStr || '');
    setModalWeekEndDate(f.weekEndDate || '');
    setModalCurrentDate(f.currentDate || activeSubmission.weekKeyStr || '');
    setModalAccount(f.account || '');
    setModalProject(f.project || '');
    setModalSprint(f.sprint || '');
    setModalModule(f.module || '');
    setModalTaskName(f.taskName || '');
    setModalAchievements(f.achievements || '');
    setModalCompletedTasks(f.completedTasks || '');
    setModalWorkInProgress(f.workInProgress || f.tasksInProgress || '');
    setModalPendingTasks(f.pendingTasks || '');
    setModalRisks(f.risks || '');
    setModalBlockers(f.blockers || '');
    setModalDependencies(f.dependencies || '');
    setModalClientDependencies(f.clientDependencies || '');
    setModalSupportRequired(f.supportRequired || '');
    setModalNextWeekPlan(f.nextWeekPlan || '');
    setModalOverallComments(f.overallComments || f.comments || '');
    setModalOverallStatus(f.overallStatus || 'Green');
    setModalCompletionPercent(f.completionPercent || 0);
    setModalHoursWorked(f.hoursWorked !== undefined ? f.hoursWorked : 40);
    setModalPriority(f.priority || 'Medium');
    setModalAttachments(f.attachmentsSimulated || []);
    setModalNewAttachment('');
    setModalEmployeeNotes(f.employeeNotes || '');
    setIsModalOpen(true);
  };

  // Save modal updates
  const handleSaveModal = (isSubmit: boolean) => {
    if (!currentUser) return;
    if (modalHoursWorked < 0) {
      showFeedback('error', 'Please enter a valid number of hours worked.');
      return;
    }
    if (modalCompletionPercent < 0 || modalCompletionPercent > 100) {
      showFeedback('error', 'Please enter a completion percentage between 0 and 100.');
      return;
    }

    let weekKey = '';
    let weekLabel = '';
    
    if (modalFrequency === 'Weekly') {
      if (!modalWeekStartDate || !modalWeekEndDate) {
        showFeedback('error', 'Please enter both week start and end dates.');
        return;
      }
      weekKey = modalWeekStartDate;
      const startD = new Date(modalWeekStartDate);
      const endD = new Date(modalWeekEndDate);
      const formatDay = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      weekLabel = `${formatDay(startD)} - ${formatDay(endD)} ${endD.getFullYear()} (${modalWeekNumber || 'Weekly'})`;
    } else {
      if (!modalCurrentDate) {
        showFeedback('error', 'Please enter a date for daily status.');
        return;
      }
      weekKey = modalCurrentDate;
      const currD = new Date(modalCurrentDate);
      weekLabel = `Daily Status - ${currD.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    const fieldsData = {
      reportingFrequency: modalFrequency,
      weekNumber: modalWeekNumber,
      weekStartDate: modalWeekStartDate,
      weekEndDate: modalWeekEndDate,
      currentDate: modalCurrentDate,
      account: modalAccount,
      project: modalProject,
      sprint: modalSprint,
      module: modalModule,
      taskName: modalTaskName,
      achievements: modalAchievements,
      completedTasks: modalCompletedTasks,
      workInProgress: modalWorkInProgress,
      pendingTasks: modalPendingTasks,
      risks: modalRisks,
      blockers: modalBlockers,
      dependencies: modalDependencies,
      clientDependencies: modalClientDependencies,
      supportRequired: modalSupportRequired,
      nextWeekPlan: modalNextWeekPlan,
      overallComments: modalOverallComments,
      overallStatus: modalOverallStatus,
      completionPercent: modalCompletionPercent,
      hoursWorked: modalHoursWorked,
      priority: modalPriority,
      attachmentsSimulated: modalAttachments,
      employeeNotes: modalEmployeeNotes,
      frequency: modalFrequency,
      dateStr: modalFrequency === 'Daily' ? modalCurrentDate : undefined,
    };

    if (modalMode === 'create') {
      // Check if slot already exists
      const existing = submissions.find(s => s.employeeId === currentUser.id && s.weekKeyStr === weekKey);
      if (existing) {
        showFeedback('error', 'A status sheet already exists for this week/date.');
        return;
      }

      addNewWeeklyStatus(currentUser.id, weekKey, weekLabel, modalFrequency);
      
      const newlyCreatedSub = useStore.getState().submissions.find(
        s => s.employeeId === currentUser.id && s.weekKeyStr === weekKey
      );
      
      if (!newlyCreatedSub) {
        showFeedback('error', 'Failed to initialize status record.');
        return;
      }
      
      if (isSubmit) {
        submitWeeklyStatus(newlyCreatedSub.id, fieldsData);
      } else {
        saveDraftStatus(newlyCreatedSub.id, fieldsData);
      }
      setSelectedSubId(newlyCreatedSub.id);
    } else {
      if (!selectedSubId) return;
      if (isSubmit) {
        submitWeeklyStatus(selectedSubId, fieldsData);
      } else {
        saveDraftStatus(selectedSubId, fieldsData);
      }
    }

    setIsModalOpen(false);
    showFeedback('success', isSubmit ? 'Status report submitted successfully!' : 'Draft status report saved.');
  };

  const downloadSingleReport = (sub: WeeklyStatus, format: 'PDF' | 'PPT') => {
    const employee = employees.find(e => e.id === sub.employeeId);
    const employeeName = employee?.name || 'Employee';
    const employeeTitle = employee?.title || 'Engineer';
    
    if (format === 'PDF') {
      const jspdfModule = (window as any).jspdf;
      if (!jspdfModule) {
        alert("jsPDF library is still loading. Please try again in a moment.");
        return;
      }
      const { jsPDF } = jspdfModule;
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(37, 99, 235); // primary blue
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.text("DELIVERY GOVERNANCE PORTAL", 15, 25);
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.text("STATUS REPORT CARD", 15, 52);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Employee: ${employeeName} (${employeeTitle})`, 15, 62);
      doc.text(`Report Period: ${sub.weekLabelStr}`, 15, 69);
      doc.text(`Hours Reported: ${sub.fields.hoursWorked || 0} hrs`, 15, 76);
      doc.text(`Submission Status: ${sub.status.toUpperCase()}`, 15, 83);
      
      let y = 98;
      
      const addSection = (title: string, contentStr: string) => {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        doc.text(title.toUpperCase(), 15, y);
        y += 6;
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        
        const textLines = doc.splitTextToSize(contentStr || "None reported.", 180);
        doc.text(textLines, 15, y);
        y += (textLines.length * 5) + 12;
      };
      
      addSection("Key Accomplishments", sub.fields.achievements || "");
      addSection("Tasks Completed", sub.fields.completedTasks || "");
      addSection("Tasks In Flight", sub.fields.pendingTasks || "");
      addSection("Blockers Flagged", sub.fields.blockers || "");
      addSection("Risks & Dependencies", sub.fields.risks || "");
      addSection("Next Cycle Plan", sub.fields.nextWeekPlan || "");
      if (sub.managerComment) {
        addSection("Manager Comments", sub.managerComment || "");
      }

      doc.save(`${employeeName.replace(/\s+/g, '_')}_Status_${sub.weekKeyStr}.pdf`);
    } else {
      const PptxClass = (window as any).PptxGenJS;
      if (!PptxClass) {
        alert("PptxGenJS library is still loading. Please try again in a moment.");
        return;
      }
      const pptx = new PptxClass();
      
      // Slide 1: Cover
      let slide1 = pptx.addSlide();
      slide1.background = { color: "1E293B" };
      
      slide1.addText("DELIVERY GOVERNANCE PORTAL", {
        x: 0.5, y: 1.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "3B82F6", fontFace: "Arial"
      });
      
      slide1.addText(`Status Report Card: ${employeeName}\nRole: ${employeeTitle}\nPeriod: ${sub.weekLabelStr}\nHours: ${sub.fields.hoursWorked || 0} hrs`, {
        x: 0.5, y: 2.5, w: 9, h: 2,
        fontSize: 16, color: "F1F5F9", fontFace: "Arial", lineSpacing: 24
      });

      // Slide 2: Achievements
      let slide2 = pptx.addSlide();
      slide2.addText("ACCOMPLISHMENTS & DELIVERABLES", {
        x: 0.5, y: 0.5, w: 9, h: 0.6, fontSize: 20, bold: true, color: "1E3A8A"
      });
      slide2.addText(`Key Accomplishments:\n${sub.fields.achievements || "None reported."}\n\nCompleted Tasks:\n${sub.fields.completedTasks || "None"}\n\nIn-Progress Tasks:\n${sub.fields.pendingTasks || "None"}`, {
        x: 0.5, y: 1.2, w: 9, h: 4.5, fontSize: 13, color: "334155"
      });

      // Slide 3: Blockers & Planning
      let slide3 = pptx.addSlide();
      slide3.addText("BLOCKERS, RISKS & NEXT STEPS", {
        x: 0.5, y: 0.5, w: 9, h: 0.6, fontSize: 20, bold: true, color: "1E3A8A"
      });
      slide3.addText(`Blockers Flagged:\n${sub.fields.blockers || "None reported."}\n\nRisks & Dependencies:\n${sub.fields.risks || "None"}\n\nNext Period Plan:\n${sub.fields.nextWeekPlan || "None"}`, {
        x: 0.5, y: 1.2, w: 9, h: 4.5, fontSize: 13, color: "334155"
      });

      pptx.writeFile({ fileName: `${employeeName.replace(/\s+/g, '_')}_Status_${sub.weekKeyStr}.pptx` });
    }
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
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${maps[status]}`}>
        {status.toUpperCase().replace('_', ' ')}
      </span>
    );
  };

  const canReviewActiveSubmission = canReviewSubmission(currentUser, activeSubmission, employees, projects, allocations);
  const isReadOnly = canReviewActiveSubmission || (activeSubmission && (activeSubmission.status === 'submitted' || activeSubmission.status === 'approved'));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Weekly & Daily Status Logs</h1>
          <p className="text-ink-soft text-sm mt-1">
            {manageableEmployees.length > 1
              ? "Review and manage weekly or daily activity across your delivery hierarchy." 
              : "Submit weekly metrics, highlight blockers, and report daily status logs."}
          </p>
        </div>
        
        {/* Action Controls to create weekly or daily status slots */}
        {!isStudioHead && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer hover:scale-102 active:scale-98"
            >
              <Plus size={16} /> Add Status
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-semibold border shadow-sm animate-bounce ${
          feedback.type === 'success' ? 'bg-success-bg text-success border-success/20' : 'bg-danger-bg text-danger border-danger/20'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Main Grid split: Sidebar of weeks, and status details form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weeks Selector Sidebar */}
        <div className="col-span-1 lg:col-span-4 bg-surface border border-border rounded-xl p-4 shadow-sm h-fit space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="font-semibold text-ink text-sm uppercase tracking-wider text-[11px]">Reporting Cycles</h3>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-ink-soft font-bold font-mono">
              {filteredSubmissions.length} cycles
            </span>
          </div>
          
          {/* Filters section */}
          <div className="space-y-3 pb-3 border-b border-border bg-surface-alt/10 p-2.5 rounded-lg">
            <p className="text-[10px] font-bold text-ink uppercase tracking-widest mb-1.5">Filters & History</p>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-ink-soft uppercase tracking-wider mb-1">Frequency</label>
                <select
                  value={filterFrequency}
                  onChange={(e) => setFilterFrequency(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg p-1.5 text-xs text-ink-soft focus:outline-none focus:border-blue-600"
                >
                  <option value="All">All Freq</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-ink-soft uppercase tracking-wider mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg p-1.5 text-xs text-ink-soft focus:outline-none focus:border-blue-600 font-mono"
                >
                  <option value="All">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-ink-soft uppercase tracking-wider mb-1">History Timeline</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as any)}
                className="w-full bg-surface border border-border rounded-lg p-1.5 text-xs text-ink-soft focus:outline-none focus:border-blue-600"
              >
                <option value="All">All Periods</option>
                <option value="Today">Today's Logs</option>
                <option value="Weekly">Weekly History (7d)</option>
                <option value="Monthly">Monthly History (30d)</option>
                <option value="Daily">Daily Logs Only</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-ink-soft uppercase tracking-wider mb-1">Project Filter</label>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg p-1.5 text-xs text-ink-soft focus:outline-none focus:border-blue-600"
                >
                  <option value="All">All Projects</option>
                  {Array.from(new Set(visibleSubmissions.map(s => s.fields.project).filter(Boolean))).map(projName => (
                    <option key={projName} value={projName}>{projName}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[9px] font-bold text-ink-soft uppercase tracking-wider mb-1">Account Filter</label>
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg p-1.5 text-xs text-ink-soft focus:outline-none focus:border-blue-600"
                >
                  <option value="All">All Accounts</option>
                  {Array.from(new Set(visibleSubmissions.map(s => s.fields.account).filter(Boolean))).map(accName => (
                    <option key={accName} value={accName}>{accName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-ink-soft uppercase tracking-wider mb-1">Risk Level</label>
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg p-1.5 text-xs text-ink-soft focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="All">All Risks</option>
                  <option value="Green" className="text-success">🟢 Green</option>
                  <option value="Amber" className="text-warning">🟡 Amber</option>
                  <option value="Red" className="text-danger">🔴 Red</option>
                </select>
              </div>

              {manageableEmployees.length > 1 && (
                <div>
                  <label className="block text-[9px] font-bold text-ink-soft uppercase tracking-wider mb-1">Employee Filter</label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg p-1.5 text-xs text-ink-soft focus:outline-none focus:border-blue-600"
                  >
                    <option value="All">All Employees</option>
                    {manageableEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {filteredSubmissions.length === 0 ? (
              <p className="text-xs text-ink-faint italic text-center py-6">No status entries match filters.</p>
            ) : (
              filteredSubmissions.map(sub => {
                const isSelected = sub.id === selectedSubId;
                const employee = employees.find(e => e.id === sub.employeeId);
                
                return (
                  <button
                    key={sub.id}
                    onClick={() => { setSelectedSubId(sub.id); }}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center justify-between group ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                        : 'border-border bg-surface hover:bg-surface-alt hover:border-border-strong'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-ink flex items-center gap-1.5">
                        <Calendar size={14} className={isSelected ? 'text-blue-600' : 'text-ink-soft'} />
                        {sub.weekLabelStr}
                      </p>
                      {isStudioHead && (
                        <p className="text-[11px] text-ink-soft">By: <span className="font-medium text-ink">{employee?.name}</span></p>
                      )}
                      <p className="text-[11px] text-ink-faint font-mono">Hours: {sub.fields.hoursWorked || 0} hrs</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {getStatusBadge(sub.status)}
                      <ChevronRight size={14} className="text-ink-faint group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Status Form Pane */}
        <div className="col-span-1 lg:col-span-8 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6 relative">
          {!activeSubmission ? (
            <div className="text-center py-20 text-ink-soft text-sm">
              Select a reporting cycle from the left to view or edit status details.
            </div>
          ) : (
            <>
              {/* Form Header */}
              <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                  <h2 className="font-bold text-lg text-ink">{activeSubmission.weekLabelStr}</h2>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {isReadOnly 
                      ? "Status report is in read-only mode." 
                      : "Fill in the fields below. Changes can be saved as draft."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(activeSubmission.status)}
                </div>
              </div>

              {/* Warnings / Comments Box */}
              {activeSubmission.managerComment && (
                <div className={`p-4 rounded-lg border text-sm space-y-1 ${
                  activeSubmission.status === 'approved' ? 'bg-success-bg text-success border-success/20' : 'bg-danger-bg text-danger border-danger/20'
                }`}>
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle size={16} /> Manager Feedback:
                  </p>
                  <p className="italic">"{activeSubmission.managerComment}"</p>
                </div>
              )}

              {/* Status form fields */}
              <div className="space-y-6">
                
                {/* Section 1: Metadata Grid */}
                <div className="bg-surface-alt/20 p-4 rounded-xl border border-border space-y-4">
                  <p className="text-xs font-bold text-ink uppercase tracking-wider border-b border-border pb-1.5">Cycle Details</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Reporting Frequency & Date */}
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Reporting Frequency</label>
                      <select
                        disabled={true}
                        value={frequency}
                        className="w-full p-2 border border-border rounded-lg text-sm bg-surface-alt text-ink-soft outline-none"
                      >
                        <option value="Weekly">Weekly Status</option>
                        <option value="Daily">Daily Status</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                        {frequency === 'Daily' ? 'Calendar Date' : 'Week Period'}
                      </label>
                      <input
                        type="text"
                        disabled={true}
                        value={frequency === 'Daily' ? dateStr : activeSubmission.weekLabelStr}
                        className="w-full p-2 border border-border rounded-lg text-sm bg-surface-alt text-ink-soft outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Sprint Number</label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        placeholder="e.g. Sprint 14"
                        value={sprint}
                        onChange={(e) => setSprint(e.target.value)}
                        className="w-full p-2 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Account Name</label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        placeholder="e.g. Meridian Bank"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        className="w-full p-2 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Project Name</label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        placeholder="e.g. Retail Banking Portal"
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        className="w-full p-2 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Overall Delivery Health</label>
                      <select
                        disabled={isReadOnly}
                        value={overallStatus}
                        onChange={(e) => setOverallStatus(e.target.value as any)}
                        className={`w-full p-2 border rounded-lg text-sm bg-surface focus:outline-none focus:border-blue-600 font-semibold cursor-pointer ${
                          overallStatus === 'Green' ? 'text-success' : overallStatus === 'Amber' ? 'text-warning' : 'text-danger'
                        }`}
                      >
                        <option value="Green" className="text-success font-semibold">🟢 Green - On Track</option>
                        <option value="Amber" className="text-warning font-semibold">🟡 Amber - At Risk</option>
                        <option value="Red" className="text-danger font-semibold">🔴 Red - Blocked</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Completion %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={isReadOnly}
                        value={completionPercent}
                        onChange={(e) => setCompletionPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full p-2 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Hours Logged</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={hoursWorked}
                        onChange={(e) => setHoursWorked(parseInt(e.target.value) || 0)}
                        className="w-full p-2 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Accomplishments & Progress */}
                <div className="space-y-4">
                  <p className="text-xs font-bold text-ink uppercase tracking-wider border-b border-border pb-1">Accomplishments & Progress</p>
                  
                  <div>
                    <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Key Accomplishments & Milestones</label>
                    <textarea
                      rows={2}
                      disabled={isReadOnly}
                      placeholder="Describe main tasks completed and milestones hit..."
                      value={achievements}
                      onChange={(e) => setAchievements(e.target.value)}
                      className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Tasks Completed</label>
                      <textarea
                        rows={3}
                        disabled={isReadOnly}
                        placeholder="List specific items completed this cycle..."
                        value={completedTasks}
                        onChange={(e) => setCompletedTasks(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Tasks In Progress</label>
                      <textarea
                        rows={3}
                        disabled={isReadOnly}
                        placeholder="List tasks currently in development..."
                        value={tasksInProgress}
                        onChange={(e) => setTasksInProgress(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Pending Work</label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="List items carry-forwarded or delayed..."
                        value={pendingWork}
                        onChange={(e) => setPendingWork(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Planned Work</label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="List high-priority sprint backlog items planned..."
                        value={plannedWork}
                        onChange={(e) => setPlannedWork(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Blockers, Risks & Support */}
                <div className="space-y-4">
                  <p className="text-xs font-bold text-ink uppercase tracking-wider border-b border-border pb-1">Blockers, Risks & Dependencies</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 flex items-center gap-1">
                        Blockers <span title="Issues halting work"><HelpCircle size={12} className="text-ink-faint" /></span>
                      </label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="Mention any issues halting progress..."
                        value={blockers}
                        onChange={(e) => setBlockers(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 flex items-center gap-1">
                        Risks <span title="Potential timeline risks"><AlertTriangle size={12} className="text-ink-faint" /></span>
                      </label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="Identify potential timeline risks..."
                        value={risks}
                        onChange={(e) => setRisks(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Technical Dependencies</label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="Specify key technical dependencies..."
                        value={dependencies}
                        onChange={(e) => setDependencies(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Client Dependencies</label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="Highlight client decisions or credentials pending..."
                        value={clientDependencies}
                        onChange={(e) => setClientDependencies(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Support / Manager Intervention Required</label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="Describe support needed from leadership..."
                        value={supportRequired}
                        onChange={(e) => setSupportRequired(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Next Week Plan</label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="Describe focus backlog for next cycle..."
                        value={nextWeekPlan}
                        onChange={(e) => setNextWeekPlan(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none disabled:bg-surface-alt disabled:text-ink-soft"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Attachments Simulator */}
                <div className="bg-surface-alt/10 p-4 rounded-xl border border-border space-y-3">
                  <p className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip size={14} /> Attachments (Simulated)
                  </p>
                  
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter file name (e.g. architecture_diagram.png)"
                        value={newAttachment}
                        onChange={(e) => setNewAttachment(e.target.value)}
                        className="flex-1 p-2 border border-border rounded-lg text-sm bg-surface text-ink focus:border-blue-600 outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!newAttachment.trim()) return;
                          setAttachmentsSimulated([...attachmentsSimulated, newAttachment.trim()]);
                          setNewAttachment('');
                          showFeedback('success', 'File attached successfully.');
                        }}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
                      >
                        Attach File
                      </button>
                    </div>
                  )}

                  {attachmentsSimulated.length === 0 ? (
                    <p className="text-xs text-ink-faint italic">No attachments uploaded.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {attachmentsSimulated.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium text-ink-soft shadow-xs">
                          <Paperclip size={12} className="text-blue-500" />
                          <span className="cursor-pointer hover:underline text-blue-600" onClick={() => alert(`Simulated download of file: ${file}`)}>{file}</span>
                          {!isReadOnly && (
                            <button
                              onClick={() => {
                                setAttachmentsSimulated(attachmentsSimulated.filter((_, i) => i !== idx));
                              }}
                              className="text-danger hover:bg-danger-bg p-0.5 rounded transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Action Controls */}
              {!isReadOnly && (
                <div className="flex justify-end gap-3 border-t border-border pt-4">
                  <button
                    onClick={handleDeleteDraft}
                    className="flex items-center gap-1.5 px-4 py-2 border border-danger/30 text-danger hover:bg-danger-bg rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer hover:scale-102"
                  >
                    <Trash2 size={16} /> Delete Draft
                  </button>
                  <button
                    onClick={handleOpenEditModal}
                    className="flex items-center gap-1.5 px-4 py-2 border border-border-strong text-ink hover:bg-surface-sunken rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer hover:scale-102"
                  >
                    <Save size={16} /> Edit Report
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer hover:scale-102"
                  >
                    <Send size={16} /> Submit Report
                  </button>
                </div>
              )}

              {canReviewActiveSubmission && (
                <div className="flex justify-end gap-3 border-t border-border pt-4">
                  <button
                    onClick={() => downloadSingleReport(activeSubmission, 'PDF')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer hover:scale-102"
                  >
                    <FileText size={16} /> Download PDF
                  </button>
                  <button
                    onClick={() => downloadSingleReport(activeSubmission, 'PPT')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer hover:scale-102"
                  >
                    <Presentation size={16} /> Download PPTX
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Entry Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease]">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-alt/40">
              <h2 className="font-bold text-base text-ink flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                {modalMode === 'create' ? 'Create Project Status Report' : 'Edit Draft Status Report'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-ink-soft hover:bg-surface-sunken p-1 rounded-lg text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Section 1: Cycle Details */}
              <div className="bg-surface-alt/25 p-4 rounded-xl border border-border space-y-4">
                <p className="text-[10px] font-bold text-ink uppercase tracking-wider border-b border-border pb-1">1. Cycle Details</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Reporting Frequency</label>
                    <select
                      value={modalFrequency}
                      onChange={(e) => {
                        setModalFrequency(e.target.value as 'Daily' | 'Weekly');
                        if (e.target.value === 'Daily') {
                          setModalCurrentDate(new Date().toISOString().split('T')[0]);
                        }
                      }}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    >
                      <option value="Weekly">Weekly Status</option>
                      <option value="Daily">Daily Status</option>
                    </select>
                  </div>

                  {modalFrequency === 'Weekly' ? (
                    <>
                      <div>
                        <label className="block font-bold text-ink-soft uppercase mb-1">Week Number / Sprint</label>
                        <input
                          type="text"
                          placeholder="e.g. Week 23 or Sprint 14"
                          value={modalWeekNumber}
                          onChange={(e) => setModalWeekNumber(e.target.value)}
                          className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-ink-soft uppercase mb-1">Start Date</label>
                          <input
                            type="date"
                            value={modalWeekStartDate}
                            onChange={(e) => setModalWeekStartDate(e.target.value)}
                            className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-ink-soft uppercase mb-1">End Date</label>
                          <input
                            type="date"
                            value={modalWeekEndDate}
                            onChange={(e) => setModalWeekEndDate(e.target.value)}
                            className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block font-bold text-ink-soft uppercase mb-1">Current Date</label>
                      <input
                        type="date"
                        value={modalCurrentDate}
                        onChange={(e) => setModalCurrentDate(e.target.value)}
                        className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Account Name</label>
                    <select
                      value={modalAccount}
                      onChange={(e) => setModalAccount(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Project Name</label>
                    <select
                      value={modalProject}
                      onChange={(e) => setModalProject(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Sprint Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Sprint 14"
                      value={modalSprint}
                      onChange={(e) => setModalSprint(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Project Module</label>
                    <input
                      type="text"
                      placeholder="e.g. Authentication, Billing, Dashboard"
                      value={modalModule}
                      onChange={(e) => setModalModule(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Task Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Fix login session leak, refactor SVG donut charts"
                      value={modalTaskName}
                      onChange={(e) => setModalTaskName(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Progress & Deliverables */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-ink uppercase tracking-wider border-b border-border pb-1">2. Status & Progress Details</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Overall Delivery Health</label>
                    <select
                      value={modalOverallStatus}
                      onChange={(e) => setModalOverallStatus(e.target.value as any)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none font-semibold cursor-pointer"
                    >
                      <option value="Green" className="text-success">Green - On Track</option>
                      <option value="Amber" className="text-warning">Amber - At Risk</option>
                      <option value="Red" className="text-danger">Red - Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Completion %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={modalCompletionPercent}
                      onChange={(e) => setModalCompletionPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Hours Logged</label>
                    <input
                      type="number"
                      value={modalHoursWorked}
                      onChange={(e) => setModalHoursWorked(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Priority</label>
                    <select
                      value={modalPriority}
                      onChange={(e) => setModalPriority(e.target.value as any)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    >
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Employee Notes</label>
                    <input
                      type="text"
                      placeholder="Additional personal observations..."
                      value={modalEmployeeNotes}
                      onChange={(e) => setModalEmployeeNotes(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-ink-soft uppercase mb-1">Achievements & Key Milestones</label>
                  <textarea
                    rows={2}
                    placeholder="List major accomplishments hit..."
                    value={modalAchievements}
                    onChange={(e) => setModalAchievements(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Completed Tasks</label>
                    <textarea
                      rows={2}
                      placeholder="Detail completed tickets..."
                      value={modalCompletedTasks}
                      onChange={(e) => setModalCompletedTasks(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Work In Progress (WIP)</label>
                    <textarea
                      rows={2}
                      placeholder="Detail tasks currently in development..."
                      value={modalWorkInProgress}
                      onChange={(e) => setModalWorkInProgress(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Pending Tasks</label>
                    <textarea
                      rows={2}
                      placeholder="Describe tasks carry-forwarded or delayed..."
                      value={modalPendingTasks}
                      onChange={(e) => setModalPendingTasks(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Planned Work (Next Cycle)</label>
                    <textarea
                      rows={2}
                      placeholder="Highlight items queued for next week..."
                      value={modalNextWeekPlan}
                      onChange={(e) => setModalNextWeekPlan(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Blockers, Risks & Support */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-ink uppercase tracking-wider border-b border-border pb-1">3. Risks, Blockers & Support</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Blockers</label>
                    <textarea
                      rows={2}
                      placeholder="Issues actively halting work..."
                      value={modalBlockers}
                      onChange={(e) => setModalBlockers(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Risks</label>
                    <textarea
                      rows={2}
                      placeholder="Issues that could delay timelines..."
                      value={modalRisks}
                      onChange={(e) => setModalRisks(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Technical Dependencies</label>
                    <textarea
                      rows={2}
                      placeholder="Architecture pending..."
                      value={modalDependencies}
                      onChange={(e) => setModalDependencies(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Client Dependencies</label>
                    <textarea
                      rows={2}
                      placeholder="Credentials or feedback pending..."
                      value={modalClientDependencies}
                      onChange={(e) => setModalClientDependencies(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Support Required</label>
                    <textarea
                      rows={2}
                      placeholder="Management intervention required..."
                      value={modalSupportRequired}
                      onChange={(e) => setModalSupportRequired(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink-soft uppercase mb-1">Overall Comments</label>
                    <textarea
                      rows={2}
                      placeholder="Summarize cycle delivery health..."
                      value={modalOverallComments}
                      onChange={(e) => setModalOverallComments(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                {/* Section 4: Attachments Simulator */}
                <div className="bg-surface-alt/10 p-4 rounded-xl border border-border space-y-3">
                  <p className="font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                    <Paperclip size={12} /> Attachments (Simulated)
                  </p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="File name (e.g. database_schema.pdf)"
                      value={modalNewAttachment}
                      onChange={(e) => setModalNewAttachment(e.target.value)}
                      className="flex-1 p-2 border border-border rounded-lg bg-surface text-ink focus:border-blue-600 outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!modalNewAttachment.trim()) return;
                        setModalAttachments([...modalAttachments, modalNewAttachment.trim()]);
                        setModalNewAttachment('');
                      }}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Attach
                    </button>
                  </div>

                  {modalAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {modalAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded-lg text-xs text-ink-soft">
                          <Paperclip size={10} className="text-blue-500" />
                          <span>{file}</span>
                          <button
                            onClick={() => setModalAttachments(modalAttachments.filter((_, i) => i !== idx))}
                            className="text-danger hover:bg-danger-bg p-0.5 rounded transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 5: Manager Feedback (Read Only) */}
                {modalMode === 'edit' && activeSubmission?.managerComment && (
                  <div className="p-3.5 bg-yellow-50/50 border border-yellow-200 rounded-xl space-y-1">
                    <p className="font-bold text-yellow-800 uppercase tracking-wider text-[9px]">Manager Feedback Notes (Read Only)</p>
                    <p className="italic text-yellow-900 leading-relaxed font-medium">"{activeSubmission.managerComment}"</p>
                  </div>
                )}

              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-surface-alt/40 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-border text-ink hover:bg-surface-sunken rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveModal(false)}
                className="px-4 py-2 bg-slate-700 text-white hover:bg-slate-800 rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Save size={14} /> Save Draft
              </button>
              <button
                onClick={() => handleSaveModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Send size={14} /> Submit Status
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
