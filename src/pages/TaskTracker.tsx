import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Columns3,
  Download,
  Filter,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  apiAddTaskComment,
  apiCancelScheduledEmail,
  apiCreateTask,
  apiDeleteTask,
  apiEmailConfig,
  apiEmailTemplates,
  apiListScheduledEmails,
  apiListTaskComments,
  apiListTasks,
  apiScheduleEmail,
  apiRetryScheduledEmail,
  apiSubmitTaskForReview,
  apiTaskApproval,
  apiUpdateTaskStatus,
} from '../services/api';
import type { DeliveryTask, TaskComment, TaskPriority, TaskStatus } from '../types';

type TaskView = 'dashboard' | 'table' | 'kanban' | 'emails' | 'reports';

const statusColumns: Array<{ key: TaskStatus; label: string; tone: string; color: string }> = [
  { key: 'todo', label: 'To Do', tone: 'border-slate-300', color: '#94a3b8' },
  { key: 'in_progress', label: 'In Progress', tone: 'border-blue-400', color: '#2563eb' },
  { key: 'review', label: 'Review', tone: 'border-violet-400', color: '#8b5cf6' },
  { key: 'blocked', label: 'Blocked', tone: 'border-red-400', color: '#ef4444' },
  { key: 'done', label: 'Done', tone: 'border-emerald-400', color: '#10b981' },
];

const priorityClass: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
};

const tabMeta: Array<{ key: TaskView; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'table', label: 'Task Directory', icon: Table2 },
  { key: 'kanban', label: 'Kanban Board', icon: Columns3 },
  { key: 'emails', label: 'Email Scheduler', icon: Mail },
  { key: 'reports', label: 'Reports', icon: Download },
];

function taskNumber(tasks: DeliveryTask[], taskId: string) {
  const index = tasks.findIndex((task) => task.id === taskId);
  return `T-${String(index + 1).padStart(3, '0')}`;
}

export default function TaskTracker() {
  const { authToken, currentUser, projects, employees, previewRole } = useStore();
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [view, setView] = useState<TaskView>('dashboard');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'id' | 'title' | 'project_name' | 'assignee_name' | 'due_date' | 'priority' | 'status'>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assigneeId: '',
    extraAssigneeIds: [] as string[],
    priority: 'medium' as TaskPriority,
    status: 'todo' as TaskStatus,
    dueDate: '',
    estimateHours: 8,
    labels: 'Task',
  });
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<Array<{ id: string; label: string; subject: string }>>([]);
  const [emailTemplate, setEmailTemplate] = useState('custom');
  const [emailTaskId, setEmailTaskId] = useState('');
  const [emailSubject, setEmailSubject] = useState('Weekly project task update');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailBody, setEmailBody] = useState('Please review the current project tasks, blockers, and review items before the governance sync.');
  const [emailDateTime, setEmailDateTime] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const canManage = previewRole === 'manager' || previewRole === 'project_director' || previewRole === 'studio_head';
  const pageSize = 10;

  useEffect(() => {
    async function loadTasks() {
      if (!authToken) return;
      const loaded = await apiListTasks(authToken, selectedProjectId ? { projectId: selectedProjectId } : {});
      setTasks(loaded);
    }
    loadTasks().catch((err) => setFeedback(err instanceof Error ? err.message : 'Unable to load tasks.'));
  }, [authToken, selectedProjectId]);

  useEffect(() => {
    async function loadEmailState() {
      if (!authToken || !canManage) return;
      const [config, emails, templates] = await Promise.all([apiEmailConfig(authToken), apiListScheduledEmails(authToken), apiEmailTemplates(authToken)]);
      setSmtpConfigured(config.smtp_configured);
      setScheduledEmails(emails);
      setEmailTemplates(templates);
    }
    loadEmailState().catch(() => undefined);
  }, [authToken, canManage]);

  useEffect(() => {
    if (!selectedTask || !authToken) return;
    apiListTaskComments(selectedTask.id, authToken)
      .then(setComments)
      .catch(() => setComments([]));
  }, [authToken, selectedTask]);

  useEffect(() => {
    if (!form.projectId && projects.length > 0) {
      setForm((current) => ({ ...current, projectId: selectedProjectId || projects[0].id }));
    }
  }, [form.projectId, projects, selectedProjectId]);

  const visibleTasks = useMemo(() => {
    let filtered = previewRole === 'employee' && currentUser ? tasks.filter((task) => task.assignee_id === currentUser.id || task.assignee_ids?.includes(currentUser.id)) : tasks;
    if (statusFilter !== 'all') filtered = filtered.filter((task) => task.status === statusFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter((task) => task.priority === priorityFilter);
    if (assigneeFilter) filtered = filtered.filter((task) => task.assignee_id === assigneeFilter || task.assignee_ids?.includes(assigneeFilter));
    if (searchQuery.trim()) {
      const needle = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(needle) ||
        task.id.toLowerCase().includes(needle) ||
        taskNumber(tasks, task.id).toLowerCase().includes(needle) ||
        (task.project_name || '').toLowerCase().includes(needle) ||
        (task.assignee_name || '').toLowerCase().includes(needle),
      );
    }
    return [...filtered].sort((a, b) => {
      const left = sortKey === 'id' ? taskNumber(tasks, a.id) : String((a as any)[sortKey] || '');
      const right = sortKey === 'id' ? taskNumber(tasks, b.id) : String((b as any)[sortKey] || '');
      return sortDirection === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    });
  }, [assigneeFilter, currentUser, previewRole, priorityFilter, searchQuery, sortDirection, sortKey, statusFilter, tasks]);

  const metrics = {
    open: visibleTasks.filter((task) => task.status !== 'done').length,
    blocked: visibleTasks.filter((task) => task.status === 'blocked').length,
    review: visibleTasks.filter((task) => task.status === 'review').length,
    done: visibleTasks.filter((task) => task.status === 'done').length,
    overdue: visibleTasks.filter((task) => task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()).length,
  };

  const paginatedTasks = visibleTasks.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / pageSize));

  const refreshTask = (updated: DeliveryTask) => {
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedTask((current) => current?.id === updated.id ? updated : current);
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!authToken || !form.projectId) return;
    const labels = form.labels.split(',').map((label) => label.trim()).filter(Boolean);
    const created = await apiCreateTask({
      project_id: form.projectId,
      title: form.title,
      description: form.description,
      assignee_id: form.assigneeId || null,
      assignee_ids: [form.assigneeId, ...form.extraAssigneeIds].filter(Boolean),
      priority: form.priority,
      status: form.status,
      due_date: form.dueDate || null,
      estimate_hours: Number(form.estimateHours) || 0,
      labels,
      tags: labels,
      checklist: [],
    }, authToken);
    setTasks((current) => [created, ...current]);
    setForm((current) => ({ ...current, title: '', description: '', assigneeId: '', extraAssigneeIds: [], priority: 'medium', status: 'todo', dueDate: '', estimateHours: 8, labels: 'Task' }));
    setIsFormOpen(false);
    setFeedback('Task created.');
  };

  const handleStatusChange = async (task: DeliveryTask, nextStatus: TaskStatus) => {
    if (!authToken) return;
    const updated = await apiUpdateTaskStatus(task.id, { status: nextStatus }, authToken);
    refreshTask(updated);
  };

  const handleDrop = async (targetStatus: TaskStatus) => {
    if (!draggedTaskId || !authToken) return;
    const task = tasks.find((item) => item.id === draggedTaskId);
    if (!task || task.status === targetStatus) return;
    try {
      await handleStatusChange(task, targetStatus);
      setFeedback(`Moved "${task.title}" to ${statusColumns.find((status) => status.key === targetStatus)?.label}.`);
    } finally {
      setDraggedTaskId(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!authToken) return;
    await apiDeleteTask(taskId, authToken);
    setTasks((current) => current.filter((task) => task.id !== taskId));
    if (selectedTask?.id === taskId) setSelectedTask(null);
  };

  const handleWorkflow = async (task: DeliveryTask, action: 'submit' | 'approve' | 'reject' | 'block' | 'unblock') => {
    if (!authToken) return;
    const updated = action === 'submit'
      ? await apiSubmitTaskForReview(task.id, { note: commentBody || null }, authToken)
      : await apiTaskApproval(task.id, { action, comment: commentBody || null }, authToken);
    refreshTask(updated);
    setCommentBody('');
    setFeedback(`Task ${action === 'submit' ? 'submitted for review' : `${action}d`}.`);
  };

  const handleAddComment = async () => {
    if (!authToken || !selectedTask || !commentBody.trim()) return;
    const created = await apiAddTaskComment(selectedTask.id, { body: commentBody.trim() }, authToken);
    setComments((current) => [...current, created]);
    setCommentBody('');
  };

  const handleScheduleEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!authToken) return;
    const recipients = emailRecipients.split(',').map((item) => item.trim()).filter(Boolean);
    const selectedEmailTask = tasks.find((task) => task.id === emailTaskId);
    const scheduled = await apiScheduleEmail({
      recipients,
      subject: emailSubject || null,
      body: emailBody || null,
      email_type: emailTemplate,
      delivery: emailDateTime ? 'schedule' : 'send_now',
      project_id: selectedProjectId || null,
      task_id: selectedEmailTask?.id || null,
      scheduled_at: emailDateTime ? new Date(emailDateTime).toISOString() : null,
    }, authToken);
    setScheduledEmails((current) => [scheduled, ...current]);
    setFeedback(emailDateTime ? 'Email scheduled.' : 'Email send attempted. Check status below.');
  };

  const updateEmailDraft = (templateId: string, taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const template = emailTemplates.find((item) => item.id === templateId);
    setEmailTemplate(templateId);
    setEmailTaskId(taskId);
    if (template && template.subject) setEmailSubject(template.subject);
    if (task && templateId !== 'custom') setEmailBody(`${task.title}\n\n${task.description || 'No description provided.'}\n\nDeadline: ${task.due_date || 'Not set'}\nPriority: ${task.priority}\nAssigned person: ${task.assignee_name || 'Unassigned'}`);
  };

  const handleCancelEmail = async (emailId: string) => {
    if (!authToken) return;
    await apiCancelScheduledEmail(emailId, authToken);
    setScheduledEmails((current) => current.map((email) => email.id === emailId ? { ...email, status: 'cancelled' } : email));
  };

  const handleRetryEmail = async (emailId: string) => {
    if (!authToken) return;
    const retried = await apiRetryScheduledEmail(emailId, authToken);
    setScheduledEmails((current) => current.map((email) => email.id === emailId ? retried : email));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink flex items-center gap-2">
            <ClipboardList size={24} className="text-blue-600" />
            Task Tracker
          </h1>
          <p className="text-sm text-ink-soft mt-1">Project dashboard, task directory, kanban workflow, reviews, comments, reports, and scheduled email updates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setPage(1); }} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-blue-600">
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          {canManage && (
            <button onClick={() => setIsFormOpen((open) => !open)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              <Plus size={14} /> New Task
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabMeta.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setView(tab.key)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${view === tab.key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-border bg-surface text-ink-soft hover:bg-surface-alt'}`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {feedback && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">{feedback}</div>}

      {isFormOpen && (
        <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength={3} placeholder="Task title" className="md:col-span-2 bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600" />
            <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value, assigneeId: '', extraAssigneeIds: [] })} className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600">
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value, extraAssigneeIds: form.extraAssigneeIds.filter((id) => id !== event.target.value) })} className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600">
              <option value="">Primary assignee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
            <select multiple value={form.extraAssigneeIds} onChange={(event) => setForm({ ...form, extraAssigneeIds: Array.from(event.target.selectedOptions, (option) => option.value) })} className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 min-h-10">
              {employees.filter((employee) => employee.id !== form.assigneeId).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })} className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })} className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600">
              {statusColumns.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_auto] gap-3">
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" rows={3} className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 resize-none" />
            <input value={form.labels} onChange={(event) => setForm({ ...form, labels: event.target.value })} placeholder="Labels" className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 h-10" />
            <input type="number" min={0} value={form.estimateHours} onChange={(event) => setForm({ ...form, estimateHours: Number(event.target.value) })} className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 h-10" />
            <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Create</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Open', value: metrics.open, icon: Clock, color: 'text-blue-600' },
          { label: 'In Review', value: metrics.review, icon: MessageSquare, color: 'text-violet-600' },
          { label: 'Blocked', value: metrics.blocked, icon: AlertTriangle, color: 'text-danger' },
          { label: 'Done', value: metrics.done, icon: Check, color: 'text-success' },
          { label: 'Overdue', value: metrics.overdue, icon: AlertTriangle, color: 'text-warning' },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-surface border border-border rounded-xl p-4">
              <Icon size={17} className={`${metric.color} mb-2`} />
              <p className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">{metric.label}</p>
              <p className={`text-2xl font-bold mt-1 ${metric.color}`}>{metric.value}</p>
            </div>
          );
        })}
      </div>

      {view !== 'emails' && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }} placeholder="Search tasks..." className="w-full rounded-lg border border-border bg-surface-alt pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-600" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TaskStatus | 'all')} className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-xs">
            <option value="all">All statuses</option>
            {statusColumns.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | 'all')} className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-xs">
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-xs">
            <option value="">All assignees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
          <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-surface-alt"><Filter size={14} /> Clear</button>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          <section className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-ink mb-4">Workload by Status</h2>
            <div className="space-y-3">
              {statusColumns.map((status) => {
                const count = visibleTasks.filter((task) => task.status === status.key).length;
                const percent = visibleTasks.length ? Math.round((count / visibleTasks.length) * 100) : 0;
                return (
                  <div key={status.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-ink-soft">{status.label}</span>
                      <span className="font-mono text-ink-faint">{count} / {visibleTasks.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: status.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-ink mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {visibleTasks.slice(0, 6).map((task) => (
                <button key={task.id} onClick={() => setSelectedTask(task)} className="w-full rounded-lg border border-border bg-surface-alt p-3 text-left hover:border-blue-200">
                  <p className="text-xs font-bold text-ink truncate">{task.title}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">{taskNumber(tasks, task.id)} / {task.project_name || 'Project'} / {statusColumns.find((status) => status.key === task.status)?.label}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === 'table' && (
        <section className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-alt text-[10px] uppercase tracking-wider text-ink-faint">
                <tr>
                  {[
                    ['id', 'ID'],
                    ['title', 'Title'],
                    ['project_name', 'Project'],
                    ['assignee_name', 'Assignee'],
                    ['due_date', 'Due Date'],
                    ['priority', 'Priority'],
                    ['status', 'Status'],
                  ].map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key as typeof sortKey)} className="px-4 py-3 text-left font-bold cursor-pointer whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown size={12} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTasks.map((task) => (
                  <tr key={task.id} onClick={() => setSelectedTask(task)} className="hover:bg-blue-50/40 cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs text-ink-faint">{taskNumber(tasks, task.id)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{task.title}</td>
                    <td className="px-4 py-3 text-ink-soft">{task.project_name || '-'}</td>
                    <td className="px-4 py-3 text-ink-soft">{task.assignee_name || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-ink-soft">{task.due_date || '-'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityClass[task.priority]}`}>{task.priority.toUpperCase()}</span></td>
                    <td className="px-4 py-3"><span className="rounded-full bg-surface-alt border border-border px-2 py-0.5 text-[10px] font-bold text-ink-soft">{statusColumns.find((status) => status.key === task.status)?.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-ink-soft">
            <span>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, visibleTasks.length)} of {visibleTasks.length}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
              <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </section>
      )}

      {view === 'kanban' && (
        <div className="flex w-full max-w-none flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-ink">Kanban Board</h2>
            <p className="mt-1 text-sm text-ink-soft">Visual task management</p>
          </div>

          <div className="grid w-full grid-cols-[repeat(5,minmax(220px,1fr))] items-start gap-2 overflow-x-auto pb-4">
            {statusColumns.map((column) => {
              const columnTasks = visibleTasks.filter((task) => task.status === column.key);
              return (
                <section
                  key={column.key}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(column.key);
                  }}
                  className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-alt transition-colors"
                  style={{ maxHeight: 'calc(100vh - 180px)' }}
                >
                  <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2.5" style={{ borderTop: `3px solid ${column.color}` }}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
                      <h3 className="truncate text-[13px] font-semibold text-ink">{column.label}</h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                    {columnTasks.map((task) => {
                      const assignee = employees.find((employee) => employee.id === task.assignee_id);
                      const isDragged = draggedTaskId === task.id;
                      const canDrag = previewRole !== 'employee' || task.assignee_id === currentUser?.id;
                      return (
                        <article
                          key={task.id}
                          draggable={canDrag}
                          onDragStart={(event) => {
                            if (!canDrag) {
                              event.preventDefault();
                              return;
                            }
                            setDraggedTaskId(task.id);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', task.id);
                          }}
                          onDragEnd={() => setDraggedTaskId(null)}
                          onClick={() => setSelectedTask(task)}
                          className="relative flex min-w-0 cursor-grab flex-col gap-2 rounded-md border border-border bg-surface p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(15,23,42,0.09)]"
                          style={{
                            transform: isDragged ? 'rotate(2deg) scale(1.02)' : undefined,
                            boxShadow: isDragged ? '0 8px 16px rgba(15, 23, 42, 0.15)' : undefined,
                            opacity: isDragged ? 0.9 : 1,
                            zIndex: isDragged ? 10 : 1,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="truncate text-[13px] font-semibold leading-snug text-ink" title={task.title}>{task.title}</h4>
                            {canManage && (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDelete(task.id);
                                }}
                                className="shrink-0 text-ink-faint hover:text-danger"
                                title="Delete task"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-soft">{task.description || 'No description captured.'}</p>

                          <div className="flex flex-col gap-1">
                            <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityClass[task.priority]}`}>
                              {task.priority.toUpperCase()}
                            </span>
                            <span className="text-[11px] font-semibold text-ink-soft">
                              Due: {task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString() : 'Not set'}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              {assignee ? (
                                <>
                                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
                                    {assignee.name.substring(0, 2).toUpperCase()}
                                  </span>
                                  <span className="truncate text-[11px] font-medium text-ink-soft" title={assignee.name}>
                                    {assignee.name.split(' ')[0]}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[11px] italic text-ink-faint">Unassigned</span>
                              )}
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                task.status === 'done' ? 'bg-emerald-50 text-emerald-700' :
                                task.status === 'blocked' ? 'bg-red-50 text-red-700' :
                                task.status === 'review' ? 'bg-amber-50 text-amber-700' :
                                task.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {column.label}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                    {columnTasks.length === 0 && (
                      <div className="rounded-md border border-dashed border-border bg-surface/60 px-3 py-8 text-center text-xs text-ink-faint">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {view === 'emails' && canManage && (
        <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-ink flex items-center gap-2"><Mail size={16} className="text-blue-600" /> Email Scheduling</h2>
            <p className="text-xs text-ink-soft mt-1">SMTP is {smtpConfigured ? 'configured' : 'not configured yet'}. Emails are stored in the backend and dispatched by the scheduler.</p>
          </div>
          <form onSubmit={handleScheduleEmail} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <select value={emailTemplate} onChange={(event) => updateEmailDraft(event.target.value, emailTaskId)} className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-600">
              {emailTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
            </select>
            <select value={emailTaskId} onChange={(event) => updateEmailDraft(emailTemplate, event.target.value)} className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-600">
              <option value="">Select a task (optional for custom email)</option>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
            <input value={emailRecipients} onChange={(event) => setEmailRecipients(event.target.value)} required placeholder="Recipient emails, separated by commas" className="lg:col-span-2 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-600" />
            <input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} required placeholder="Subject" className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-600" />
            <input type="datetime-local" value={emailDateTime} onChange={(event) => setEmailDateTime(event.target.value)} className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-600" />
            <textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} required rows={5} placeholder="Email body preview" className="lg:col-span-2 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-600 resize-none" />
            <div className="lg:col-span-2 flex flex-wrap justify-end gap-2">
              {!emailDateTime && <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Send Now</button>}
              {emailDateTime && <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Schedule Email</button>}
            </div>
          </form>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-surface-alt text-ink-faint"><tr><th className="p-3">Template</th><th className="p-3">Recipient(s)</th><th className="p-3">Subject</th><th className="p-3">Scheduled</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
              <tbody>
            {scheduledEmails.map((email) => (
              <tr key={email.id} className="border-t border-border"><td className="p-3">{email.email_type}</td><td className="p-3">{email.recipients.join(', ')}</td><td className="p-3 font-semibold">{email.subject}</td><td className="p-3">{email.scheduled_at ? new Date(email.scheduled_at).toLocaleString() : 'Immediate'}</td><td className="p-3">{email.status}{email.error_message && <span className="block text-danger">{email.error_message}</span>}</td><td className="p-3"><div className="flex gap-2">{email.status === 'scheduled' && <button type="button" onClick={() => handleCancelEmail(email.id)} className="text-danger hover:underline">Cancel</button>}{email.status === 'failed' && <button type="button" onClick={() => handleRetryEmail(email.id)} className="text-blue-600 hover:underline">Retry</button>}</div></td></tr>
            ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === 'reports' && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold text-ink mb-4">Task Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-surface-alt p-4">
              <p className="text-xs font-bold text-ink">Priority Mix</p>
              {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => <p key={priority} className="mt-2 text-xs text-ink-soft">{priority}: {visibleTasks.filter((task) => task.priority === priority).length}</p>)}
            </div>
            <div className="rounded-lg border border-border bg-surface-alt p-4">
              <p className="text-xs font-bold text-ink">Effort Summary</p>
              <p className="mt-2 text-xs text-ink-soft">Estimated: {visibleTasks.reduce((sum, task) => sum + task.estimate_hours, 0)}h</p>
              <p className="mt-2 text-xs text-ink-soft">Actual: {visibleTasks.reduce((sum, task) => sum + task.actual_hours, 0)}h</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-alt p-4">
              <p className="text-xs font-bold text-ink">Review Workflow</p>
              <p className="mt-2 text-xs text-ink-soft">Submitted: {visibleTasks.filter((task) => task.submitted_for_review_at).length}</p>
              <p className="mt-2 text-xs text-ink-soft">Approved: {visibleTasks.filter((task) => task.approved_at).length}</p>
            </div>
          </div>
        </section>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedTask(null)}>
          <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div>
                <p className="text-[10px] font-mono uppercase text-ink-faint">{taskNumber(tasks, selectedTask.id)} / {selectedTask.project_name}</p>
                <h2 className="mt-1 text-lg font-bold text-ink">{selectedTask.title}</h2>
              </div>
              <button onClick={() => setSelectedTask(null)} className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-alt"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 p-5">
              <div className="space-y-4">
                <p className="text-sm text-ink-soft">{selectedTask.description || 'No description captured.'}</p>
                <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} rows={3} placeholder="Comment, review note, or rejection/blocker reason" className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-600 resize-none" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleAddComment} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-surface-alt">Add Comment</button>
                  <button onClick={() => handleWorkflow(selectedTask, 'submit')} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white">Submit Review</button>
                  {canManage && <button onClick={() => handleWorkflow(selectedTask, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve</button>}
                  {canManage && <button onClick={() => handleWorkflow(selectedTask, 'reject')} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Reject</button>}
                  {canManage && <button onClick={() => handleWorkflow(selectedTask, selectedTask.status === 'blocked' ? 'unblock' : 'block')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">{selectedTask.status === 'blocked' ? 'Unblock' : 'Block'}</button>}
                </div>
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-border bg-surface-alt p-3">
                      <p className="text-xs text-ink">{comment.body}</p>
                      <p className="mt-1 text-[10px] text-ink-faint">{comment.author_name || 'User'} / {new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <select value={selectedTask.status} onChange={(event) => handleStatusChange(selectedTask, event.target.value as TaskStatus)} className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2">
                  {statusColumns.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
                </select>
                <div className="rounded-lg border border-border bg-surface-alt p-3">
                  <p className="font-bold text-ink">Assignee</p>
                  <p className="mt-1 text-ink-soft">{selectedTask.assignee_name || 'Unassigned'}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-alt p-3">
                  <p className="font-bold text-ink">Due / Effort</p>
                  <p className="mt-1 text-ink-soft">{selectedTask.due_date || '-'} / {selectedTask.estimate_hours}h est / {selectedTask.actual_hours}h actual</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-alt p-3">
                  <p className="font-bold text-ink">Labels</p>
                  <p className="mt-1 text-ink-soft">{selectedTask.labels?.join(', ') || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
