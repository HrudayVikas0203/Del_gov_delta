import { useEffect, useState } from 'react';
import { 
  FolderKanban, Search, TrendingUp, Users, ChevronDown, ChevronUp, 
  Plus, Trash2, Calendar, DollarSign, ClipboardList, Pencil
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiCreateTask, apiListTasks, apiUpdateProject } from '../services/api';
import type { DeliveryTask, Employee, TaskPriority } from '../types';

type AllocationRoleKey = 'program' | 'projectManager' | 'architect' | 'developer' | 'qa' | 'devops' | 'intern';

const allocationRoleGroups: Array<{
  key: AllocationRoleKey;
  label: string;
  projectRole: string;
  employeeRoles: Employee['roleCategory'][];
  designation: string;
}> = [
  { key: 'program', label: 'Program Managers / Directors', projectRole: 'Program Manager', employeeRoles: ['Program Manager'], designation: 'Program Manager / Director' },
  { key: 'projectManager', label: 'Project Managers', projectRole: 'Project Manager', employeeRoles: ['Manager'], designation: 'Project Manager' },
  { key: 'architect', label: 'Architects', projectRole: 'Technical Architect', employeeRoles: ['Architect'], designation: 'Technical Architect' },
  { key: 'developer', label: 'Developers', projectRole: 'Developer', employeeRoles: ['Developer'], designation: 'Software Developer' },
  { key: 'qa', label: 'QA Engineers', projectRole: 'QA Engineer', employeeRoles: ['QA'], designation: 'QA Engineer' },
  { key: 'devops', label: 'DevOps Engineers', projectRole: 'DevOps Engineer', employeeRoles: ['DevOps'], designation: 'DevOps Engineer' },
  { key: 'intern', label: 'Interns', projectRole: 'Intern', employeeRoles: ['Intern'], designation: 'Intern' },
];

const emptyAllocationSelections = (): Record<AllocationRoleKey, string[]> => ({
  program: [],
  projectManager: [],
  architect: [],
  developer: [],
  qa: [],
  devops: [],
  intern: [],
});
export default function Projects() {
  const { 
    previewRole, currentUser, authToken, projects, accounts, employees, allocations, 
    setProjects, setAllocations
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [projectTab, setProjectTab] = useState<'portfolio' | 'allocations' | 'tasks'>('portfolio');

  // Form states for creating project
  const [isCreateProjOpen, setIsCreateProjOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjAccount, setNewProjAccount] = useState('');
  const [newProjPhase, setNewProjPhase] = useState<'Planning' | 'Development' | 'Beta Testing' | 'UAT' | 'Production' | 'Maintenance'>('Planning');
  const [newProjBudget, setNewProjBudget] = useState<number>(1.0);
  const [newProjDescription, setNewProjDescription] = useState('');
  const [newProjTechStack, setNewProjTechStack] = useState('');
  const [newProjStartDate, setNewProjStartDate] = useState('');
  const [newProjManagerId, setNewProjManagerId] = useState('');
  const [newProjArchitectId, setNewProjArchitectId] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjClient, setEditProjClient] = useState('');
  const [editProjAccount, setEditProjAccount] = useState('');
  const [editProjPhase, setEditProjPhase] = useState<'Planning' | 'Development' | 'Beta Testing' | 'UAT' | 'Production' | 'Maintenance'>('Planning');
  const [editProjBudget, setEditProjBudget] = useState<number>(1.0);
  const [editProjDescription, setEditProjDescription] = useState('');
  const [editProjTechStack, setEditProjTechStack] = useState('');
  const [editProjStartDate, setEditProjStartDate] = useState('');
  const [editProjManagerId, setEditProjManagerId] = useState('');
  const [editProjArchitectId, setEditProjArchitectId] = useState('');

  // Form states for allocating resource
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocProjId, setAllocProjId] = useState('');
  const [allocationSelections, setAllocationSelections] = useState<Record<AllocationRoleKey, string[]>>(emptyAllocationSelections);
  const [allocPercent, setAllocPercent] = useState<number>(100);
  const [allocDate, setAllocDate] = useState('');
  const [allocManager, setAllocManager] = useState('');
  const [allocStatus, setAllocStatus] = useState<'Active' | 'Inactive'>('Active');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [projectTasks, setProjectTasks] = useState<DeliveryTask[]>([]);
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Helper colors
  const healthColor = (h: string) => h === 'green' ? 'bg-success' : h === 'amber' ? 'bg-warning' : 'bg-danger';
  const riskStyle = (r: string) => r === 'Low' ? 'bg-success/15 text-success' : r === 'Medium' ? 'bg-warning/15 text-warning' : r === 'High' ? 'bg-danger/15 text-danger' : 'bg-red-950/20 text-red-700';

  // 1. PROJECT CREATION SUBMIT
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    if (!newProjName || !newProjClient || !newProjAccount) {
      showFeedback('error', 'Please fill in Project Name, Client, and select an Account.');
      return;
    }

    try {
      const { apiCreateProject } = await import('../services/api');
      const created = await apiCreateProject({
        account_id: newProjAccount,
        name: newProjName,
        phase: newProjPhase.toLowerCase().replace(' ', '_'),
        client: newProjClient,
        budget_used: 0,
        budget_total: newProjBudget,
        program_manager_id: newProjManagerId || null,
        project_manager_id: newProjManagerId || null,
        team_lead_id: newProjArchitectId || null,
        tech_stack: newProjTechStack ? newProjTechStack.split(',').map(s => s.trim()) : ['React', 'Node.js'],
        sprint_number: 1,
        description: newProjDescription,
        start_date: newProjStartDate || new Date().toISOString().split('T')[0],
        completion_percent: 0
      }, authToken);
      
      setProjects([...projects, {
        id: created.id,
        accountId: created.account_id,
        name: created.name,
        phase: created.phase,
        health: created.health,
        risk: created.risk,
        budgetUsed: created.budget_used || 0,
        budgetTotal: created.budget_total || 0,
        managerId: created.project_manager_id,
        architectId: created.team_lead_id,
        teamIds: [],
        techStack: created.tech_stack ? created.tech_stack.split(',') : [],
        sprintNumber: created.sprint_number || 1,
        description: created.description,
        startDate: created.start_date,
        completionPercent: created.completion_percent || 0,
        client: newProjClient
      }]);
      showFeedback('success', `Created project "${newProjName}" successfully.`);
      setIsCreateProjOpen(false);
      // Reset fields
      setNewProjName('');
      setNewProjClient('');
      setNewProjAccount('');
      setNewProjPhase('Planning');
      setNewProjBudget(1.0);
      setNewProjDescription('');
      setNewProjTechStack('');
      setNewProjStartDate('');
    } catch (err) {
      console.error(err);
      showFeedback('error', 'Failed to create project.');
    }
  };

  const openProjectEditor = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    setEditingProjectId(projectId);
    setEditProjName(project.name);
    setEditProjClient(project.client);
    setEditProjAccount(project.accountId);
    setEditProjPhase(project.phase);
    setEditProjBudget(project.budgetTotal);
    setEditProjDescription(project.description);
    setEditProjTechStack(project.techStack.join(', '));
    setEditProjStartDate(project.startDate || '');
    setEditProjManagerId(project.managerId || '');
    setEditProjArchitectId(project.architectId || '');
  };

  const handleUpdateProjectSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authToken || !editingProjectId) return;

    try {
      const updated = await apiUpdateProject(editingProjectId, {
        account_id: editProjAccount,
        name: editProjName,
        phase: editProjPhase.toLowerCase().replace(' ', '_'),
        client: editProjClient,
        budget_total: editProjBudget,
        program_manager_id: editProjManagerId || null,
        project_manager_id: editProjManagerId || null,
        team_lead_id: editProjArchitectId || null,
        tech_stack: editProjTechStack ? editProjTechStack.split(',').map((item) => item.trim()).filter(Boolean) : [],
        sprint_number: 1,
        description: editProjDescription,
        start_date: editProjStartDate || new Date().toISOString().split('T')[0],
        completion_percent: 0,
      }, authToken);

      setProjects(projects.map((project) => project.id === editingProjectId ? {
        ...project,
        accountId: updated.account_id,
        name: updated.name,
        phase: updated.phase,
        client: updated.client || project.client,
        budgetTotal: Number(updated.budget_total || project.budgetTotal),
        managerId: updated.project_manager_id || project.managerId,
        architectId: updated.team_lead_id || project.architectId,
        techStack: updated.tech_stack ? String(updated.tech_stack).split(',').map((item) => item.trim()).filter(Boolean) : project.techStack,
        sprintNumber: updated.sprint_number || project.sprintNumber,
        description: updated.description || project.description,
        startDate: updated.start_date || project.startDate,
        completionPercent: updated.completion_percent ?? project.completionPercent,
      } : project));

      showFeedback('success', `Updated project "${editProjName}" successfully.`);
      setEditingProjectId(null);
      setEditProjName('');
      setEditProjClient('');
      setEditProjAccount('');
      setEditProjPhase('Planning');
      setEditProjBudget(1.0);
      setEditProjDescription('');
      setEditProjTechStack('');
      setEditProjStartDate('');
      setEditProjManagerId('');
      setEditProjArchitectId('');
    } catch (err) {
      console.error(err);
      showFeedback('error', err instanceof Error ? err.message : 'Failed to update project.');
    }
  };

  // 2. RESOURCE ALLOCATION SUBMIT

  const toggleAllocationSelection = (roleKey: AllocationRoleKey, employeeId: string) => {
    setAllocationSelections((current) => {
      const wasSelected = current[roleKey].includes(employeeId);
      const next = Object.fromEntries(
        Object.entries(current).map(([key, ids]) => [key, ids.filter((id) => id !== employeeId)]),
      ) as Record<AllocationRoleKey, string[]>;
      if (!wasSelected) {
        next[roleKey] = [...next[roleKey], employeeId];
      }
      return next;
    });
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    if (!allocProjId) {
      showFeedback('error', 'Please select a target project.');
      return;
    }

    const selectedAssignments = allocationRoleGroups.flatMap((group) =>
      allocationSelections[group.key].map((employeeId) => ({ group, employeeId })),
    );
    const uniqueAssignments = [...new Map(selectedAssignments.map((item) => [item.employeeId, item])).values()];

    if (uniqueAssignments.length === 0) {
      showFeedback('error', 'Please select at least one person from a role dropdown.');
      return;
    }

    const proj = projects.find(p => p.id === allocProjId);
    if (!proj) {
      showFeedback('error', 'Invalid project choice.');
      return;
    }

    try {
      const { apiCreateAllocation } = await import('../services/api');
      let allocatedCount = 0;
      const newAllocations = [];
      for (const { group, employeeId } of uniqueAssignments) {
        const emp = employees.find(e => e.id === employeeId);
        if (!emp) continue;
        
        // Backend mapping
        let backendRole = group.projectRole.toLowerCase().replace(' ', '_');
        if (backendRole === 'technical_architect') backendRole = 'architect';
        if (backendRole === 'qa_engineer') backendRole = 'qa';
        if (backendRole === 'devops_engineer') backendRole = 'devops';
        
        const created = await apiCreateAllocation({
          project_id: allocProjId,
          employee_id: employeeId,
          allocation_role: backendRole,
          allocation_percent: allocPercent,
          start_date: allocDate || new Date().toISOString().split('T')[0],
          reporting_manager_id: currentUser?.id
        }, authToken);
        
        newAllocations.push({
          id: created.id,
          projectId: allocProjId,
          projectName: created.project_name || proj.name,
          employeeId: employeeId,
          employeeName: created.employee_name || emp.name,
          designation: created.employee_title || emp.title,
          department: created.department || emp.dept,
          email: created.employee_email || emp.email,
          projectRole: created.allocation_role,
          allocationDate: created.start_date,
          allocationPercent: created.allocation_percent,
          reportingManager: created.reporting_manager_id || allocManager || 'Unassigned',
          projectStatus: allocStatus
        });
        allocatedCount++;
      }
      
      const updatedAllocationKeys = new Set(newAllocations.map((allocation) => `${allocation.projectId}:${allocation.employeeId}`));
      setAllocations([
        ...allocations.filter((allocation) => !updatedAllocationKeys.has(`${allocation.projectId}:${allocation.employeeId}`)),
        ...newAllocations,
      ]);
      showFeedback('success', `Allocated or updated ${allocatedCount} team member${allocatedCount === 1 ? '' : 's'} to ${proj.name}.`);
      setIsAllocateOpen(false);
      setAllocProjId('');
      setAllocationSelections(emptyAllocationSelections());
      setAllocPercent(100);
      setAllocDate('');
      setAllocManager('');
      setAllocStatus('Active');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to allocate resources.';
      showFeedback('error', msg);
    }
  };
  // 3. RESOURCE DEALLOCATION
  const handleDeallocate = async (allocId: string, empName: string, projName: string) => {
    if (confirm(`Are you sure you want to deallocate ${empName} from ${projName}?`)) {
      if (!authToken) return;
      try {
        const { apiDeleteAllocation } = await import('../services/api');
        await apiDeleteAllocation(allocId, authToken);
        setAllocations(allocations.filter(a => a.id !== allocId));
        showFeedback('success', `Deallocated ${empName} from ${projName}.`);
      } catch (err) {
        console.error(err);
        showFeedback('error', 'Failed to deallocate resource.');
      }
    }
  };

  // 4. FILTERING LOGIC
  const getFilteredProjects = () => {
    let list = projects;
    
    // Filter based on previewRole
    if (previewRole === 'employee') {
      const myAllocIds = allocations.filter(a => a.employeeId === currentUser?.id).map(a => a.projectId);
      list = projects.filter(p => myAllocIds.includes(p.id));
    } else if (previewRole === 'manager') {
      list = projects.filter(p => p.managerId === currentUser?.id || allocations.some(a => a.projectId === p.id && a.employeeId === currentUser?.id && a.projectRole.toLowerCase().includes('manager')));
    }

    return list.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPhase = phaseFilter === 'all' || p.phase === phaseFilter;
      return matchesSearch && matchesPhase;
    });
  };

  const activeFilteredProjects = getFilteredProjects();
  const phases = Array.from(new Set(projects.map(p => p.phase)));
  const selectedTaskProject = projects.find((project) => project.id === taskProjectId);
  const taskProjectTeam = taskProjectId
    ? allocations
      .filter((allocation) => {
        const role = String(allocation.projectRole).toLowerCase();
        return allocation.projectId === taskProjectId && !role.includes('manager') && !role.includes('architect');
      })
      .map((allocation) => employees.find((employee) => employee.id === allocation.employeeId))
      .filter(Boolean) as Employee[]
    : [];
  const canCreateProjectTasks = Boolean(
    currentUser && taskProjectId && (
      currentUser.roleCategory === 'Studio Head' ||
      currentUser.roleCategory === 'Program Manager' ||
      selectedTaskProject?.managerId === currentUser.id ||
      allocations.some((allocation) =>
        allocation.projectId === taskProjectId &&
        allocation.employeeId === currentUser.id &&
        String(allocation.projectRole).toLowerCase().includes('architect')
      )
    )
  );

  useEffect(() => {
    if (!authToken) return;
    apiListTasks(authToken, taskProjectId ? { projectId: taskProjectId } : {})
      .then((tasks) => setProjectTasks(tasks.filter((task) => !taskProjectId || task.project_id === taskProjectId)))
      .catch((error) => showFeedback('error', error instanceof Error ? error.message : 'Unable to load project tasks.'));
  }, [authToken, taskProjectId]);

  useEffect(() => {
    if (!taskProjectId && activeFilteredProjects.length > 0) {
      setTaskProjectId(activeFilteredProjects[0].id);
    }
  }, [activeFilteredProjects, taskProjectId]);

  const handleProjectTaskSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authToken || !taskProjectId) return;
    if (!canCreateProjectTasks) {
      showFeedback('error', 'Only the project manager, program manager, studio head, or allocated technical architect can create project tasks.');
      return;
    }
    if (!taskAssigneeId) {
      showFeedback('error', 'Select an allocated team member before creating a task.');
      return;
    }
    try {
      const created = await apiCreateTask({
        project_id: taskProjectId,
        title: taskTitle,
        description: taskDescription,
        assignee_id: taskAssigneeId,
        assignee_ids: [taskAssigneeId],
        priority: taskPriority,
        due_date: taskDueDate || null,
        labels: ['Project Task'],
        estimate_hours: 8,
      }, authToken);
      setProjectTasks((current) => [created, ...current]);
      setTaskTitle('');
      setTaskDescription('');
      setTaskAssigneeId('');
      setTaskPriority('medium');
      setTaskDueDate('');
      showFeedback('success', 'Project task created and synced to Task Tracker.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Task creation failed.');
    }
  };

  // RENDERING BY ROLE
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink flex items-center gap-2">
            <FolderKanban size={24} className="text-blue-600" />
            {previewRole === 'employee' && "My Allocated Projects"}
            {previewRole === 'manager' && "My Delivery Pod"}
            {previewRole === 'project_director' && "Director Delivery Governance"}
            {previewRole === 'studio_head' && "Studio Resource Allocation & Portfolio"}
          </h1>
          <p className="text-ink-soft text-sm mt-1">
            {previewRole === 'employee' && "Review your active design allocations, teammates, role specifics, and sprints."}
            {previewRole === 'manager' && "Oversee deliverables, team allocations, project metrics, and approvals under your management pod."}
            {previewRole === 'project_director' && "Track timeline tracking, delivery rates, and manager performance indicators across accounts."}
            {previewRole === 'studio_head' && "Configure project setups, allocate organizational resources, and inspect corporate client maps."}
          </p>
        </div>

        {/* Project Workflow Tabs */}
        {previewRole !== 'employee' && (
          <div className="flex bg-surface-alt border border-border p-1 rounded-xl text-xs font-semibold self-start">
            <button
              onClick={() => setProjectTab('portfolio')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${projectTab === 'portfolio' ? 'bg-purple-600 text-white shadow-xs' : 'text-ink-soft hover:text-ink'}`}
            >
              Portfolio List
            </button>
            <button
              onClick={() => setProjectTab('allocations')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${projectTab === 'allocations' ? 'bg-purple-600 text-white shadow-xs' : 'text-ink-soft hover:text-ink'}`}
            >
              Resource Allocation Tab
            </button>
            <button
              onClick={() => setProjectTab('tasks')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${projectTab === 'tasks' ? 'bg-purple-600 text-white shadow-xs' : 'text-ink-soft hover:text-ink'}`}
            >
              Project Tasks
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`fixed top-24 right-8 z-50 min-w-[300px] p-4 rounded-xl text-sm font-semibold border shadow-lg animate-[slideDown_0.3s_ease] ${
          feedback.type === 'success' ? 'bg-success border-success text-white' : 'bg-danger border-danger text-white'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* RENDER VIEW SCHEMES */}

      {/* SCHEME A: ALLOCATIONS MANAGEMENT (Studio Head Tab 2) */}
      {previewRole !== 'employee' && projectTab === 'allocations' ? (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
          {/* Allocation Actions Control */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-surface border border-border rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <Users size={16} className="text-purple-600" />
              Organizational Allocation Registry
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCreateProjOpen(!isCreateProjOpen)}
                className="flex items-center gap-1 px-3 py-1.5 border border-border hover:bg-surface-sunken text-ink text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Plus size={14} /> Create Project
              </button>
              <button
                onClick={() => setIsAllocateOpen(!isAllocateOpen)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Plus size={14} /> Allocate Resource
              </button>
            </div>
          </div>

          {/* PROJECT CREATION FORM CONTAINER */}
          {isCreateProjOpen && (
            <form onSubmit={handleCreateProjectSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4 animate-[slideDown_0.2s_ease]">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-border pb-1.5">Setup New Client Project</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Project Name</label>
                  <input
                    type="text"
                    required
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="e.g. Retail Banking Portal"
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Client Name</label>
                  <input
                    type="text"
                    required
                    value={newProjClient}
                    onChange={(e) => setNewProjClient(e.target.value)}
                    placeholder="e.g. Meridian Bank"
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Corporate Account Map</label>
                  <select
                    value={newProjAccount}
                    onChange={(e) => setNewProjAccount(e.target.value)}
                    required
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.industry})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Sprint Delivery Phase</label>
                  <select
                    value={newProjPhase}
                    onChange={(e) => setNewProjPhase(e.target.value as any)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Development">Development</option>
                    <option value="Beta Testing">Beta Testing</option>
                    <option value="UAT">UAT</option>
                    <option value="Production">Production</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Budget Total ($M)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newProjBudget}
                    onChange={(e) => setNewProjBudget(parseFloat(e.target.value) || 1.0)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Target Manager</label>
                  <select
                    value={newProjManagerId}
                    onChange={(e) => setNewProjManagerId(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="">Select Manager</option>
                    {employees.filter(e => e.roleCategory === 'Manager' || e.roleCategory === 'Program Manager').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Target Architect</label>
                  <select
                    value={newProjArchitectId}
                    onChange={(e) => setNewProjArchitectId(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="">Select Architect</option>
                    {employees.filter(e => e.roleCategory === 'Architect').map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={newProjStartDate}
                    onChange={(e) => setNewProjStartDate(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-ink-soft mb-1 font-semibold">Technology Stack (Comma separated)</label>
                <input
                  type="text"
                  value={newProjTechStack}
                  onChange={(e) => setNewProjTechStack(e.target.value)}
                  placeholder="e.g. React, Node.js, AWS, Postgres"
                  className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                />
              </div>

              <div className="text-xs">
                <label className="block text-ink-soft mb-1 font-semibold">Project Description</label>
                <textarea
                  rows={2}
                  value={newProjDescription}
                  onChange={(e) => setNewProjDescription(e.target.value)}
                  placeholder="Add detailed information about sprint targets..."
                  className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateProjOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-ink hover:bg-surface-sunken cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Save Project
                </button>
              </div>
            </form>
          )}

          {editingProjectId && (
            <form onSubmit={handleUpdateProjectSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4 animate-[slideDown_0.2s_ease]">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-border pb-1.5">Update Project Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Project Name</label>
                  <input type="text" required value={editProjName} onChange={(e) => setEditProjName(e.target.value)} className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none" />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Client Name</label>
                  <input type="text" required value={editProjClient} onChange={(e) => setEditProjClient(e.target.value)} className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none" />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Corporate Account Map</label>
                  <select value={editProjAccount} onChange={(e) => setEditProjAccount(e.target.value)} required className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer">
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name} ({account.industry})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Sprint Delivery Phase</label>
                  <select value={editProjPhase} onChange={(e) => setEditProjPhase(e.target.value as any)} className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer">
                    <option value="Planning">Planning</option>
                    <option value="Development">Development</option>
                    <option value="Beta Testing">Beta Testing</option>
                    <option value="UAT">UAT</option>
                    <option value="Production">Production</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Budget Total ($M)</label>
                  <input type="number" step="0.1" min="0.1" value={editProjBudget} onChange={(e) => setEditProjBudget(parseFloat(e.target.value) || 1.0)} className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none" />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Target Manager</label>
                  <select value={editProjManagerId} onChange={(e) => setEditProjManagerId(e.target.value)} className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer">
                    <option value="">Select Manager</option>
                    {employees.filter((employee) => employee.roleCategory === 'Manager' || employee.roleCategory === 'Program Manager').map((manager) => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Target Architect</label>
                  <select value={editProjArchitectId} onChange={(e) => setEditProjArchitectId(e.target.value)} className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer">
                    <option value="">Select Architect</option>
                    {employees.filter((employee) => employee.roleCategory === 'Architect').map((architect) => (
                      <option key={architect.id} value={architect.id}>{architect.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Start Date</label>
                  <input type="date" value={editProjStartDate} onChange={(e) => setEditProjStartDate(e.target.value)} className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none" />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-ink-soft mb-1 font-semibold">Technology Stack (Comma separated)</label>
                <input type="text" value={editProjTechStack} onChange={(e) => setEditProjTechStack(e.target.value)} placeholder="e.g. React, Node.js, AWS, Postgres" className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none" />
              </div>

              <div className="text-xs">
                <label className="block text-ink-soft mb-1 font-semibold">Project Description</label>
                <textarea rows={2} value={editProjDescription} onChange={(e) => setEditProjDescription(e.target.value)} placeholder="Add detailed information about sprint targets..." className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none" />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button type="button" onClick={() => setEditingProjectId(null)} className="px-4 py-2 border border-border rounded-lg text-ink hover:bg-surface-sunken cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold cursor-pointer">Save Project</button>
              </div>
            </form>
          )}

          {/* RESOURCE ALLOCATION FORM CONTAINER */}
          {isAllocateOpen && (
            <form onSubmit={handleAllocateSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4 animate-[slideDown_0.2s_ease]">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-border pb-1.5">Allocate Employee to Project Pod</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Target Project</label>
                  <select
                    required
                    value={allocProjId}
                    onChange={(e) => setAllocProjId(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Allocation % (10 - 100)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    step="10"
                    value={allocPercent}
                    onChange={(e) => setAllocPercent(parseInt(e.target.value) || 100)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Allocation Date</label>
                  <input
                    type="date"
                    value={allocDate}
                    onChange={(e) => setAllocDate(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-xs">
                {allocationRoleGroups.map((group) => {
                  const roleEmployees = employees.filter(emp => group.employeeRoles.includes(emp.roleCategory));
                  const selectedIds = allocationSelections[group.key];
                  const selectedPeople = roleEmployees.filter((emp) => selectedIds.includes(emp.id));
                  return (
                    <div key={group.key} className="border border-border rounded-xl bg-surface-alt/40 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-ink-soft font-semibold">{group.label}</label>
                        <span className="text-[10px] text-ink-faint">{selectedIds.length} selected</span>
                      </div>

                      {selectedPeople.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPeople.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => toggleAllocationSelection(group.key, emp.id)}
                              className="rounded-full bg-purple-50 border border-purple-200 px-2 py-1 text-[10px] font-semibold text-purple-700 hover:bg-purple-100"
                            >
                              {emp.name} x
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {roleEmployees.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border bg-surface p-2 text-[11px] text-ink-faint">No people available for this role.</p>
                        ) : roleEmployees.map((emp) => {
                          const isSelected = selectedIds.includes(emp.id);
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => toggleAllocationSelection(group.key, emp.id)}
                              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-50 text-purple-800 shadow-sm'
                                  : 'border-border bg-surface text-ink hover:border-purple-200 hover:bg-purple-50/40'
                              }`}
                            >
                              <span className="block font-semibold">{emp.name}</span>
                              <span className="block text-[10px] text-ink-faint">{emp.title} - {emp.availability}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-ink-soft mb-1 font-semibold">Reporting Manager Name</label>
                  <input
                    type="text"
                    value={allocManager}
                    onChange={(e) => setAllocManager(e.target.value)}
                    placeholder="Defaults to current user"
                    className="w-full p-2 border border-border rounded-lg bg-surface text-ink focus:border-purple-600 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setIsAllocateOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-ink hover:bg-surface-sunken cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          )}

          {/* ALLOCATIONS REGISTRY TABLE */}
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-alt/70 border-b border-border text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-5">Project Name</th>
                    <th className="p-3.5">Employee Name</th>
                    <th className="p-3.5">Designation (Role)</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5 text-center">Alloc %</th>
                    <th className="p-3.5">Reporting Manager</th>
                    <th className="p-3.5">Assigned Date</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink-soft">
                  {allocations.map(alloc => (
                    <tr key={alloc.id} className="hover:bg-surface-alt/25 transition-colors">
                      <td className="p-3.5 pl-5 font-bold text-ink">{alloc.projectName}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-ink">{alloc.employeeName}</div>
                        <div className="text-[10px] text-ink-faint">{alloc.email}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-ink">{alloc.designation}</div>
                        <div className="text-[10px] text-purple-600 font-semibold">{alloc.projectRole}</div>
                      </td>
                      <td className="p-3.5">{alloc.department}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full font-mono bg-purple-50 text-purple-700 font-bold border border-purple-100">
                          {alloc.allocationPercent}%
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">{alloc.reportingManager}</td>
                      <td className="p-3.5 text-ink-faint font-mono">{alloc.allocationDate}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleDeallocate(alloc.id, alloc.employeeName, alloc.projectName)}
                          className="p-1.5 text-danger hover:bg-danger-bg rounded-lg transition-colors cursor-pointer"
                          title="Remove Resource Allocation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : previewRole !== 'employee' && projectTab === 'tasks' ? (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <ClipboardList size={16} className="text-purple-600" />
                Project-Specific Task Allocation
              </h3>
              <p className="text-xs text-ink-soft mt-1">
                Create tasks under a selected project. These are stored in the common backend task table and appear automatically in Task Tracker dashboard, table, kanban, reports, and review flow.
              </p>
            </div>
            <select
              value={taskProjectId}
              onChange={(event) => {
                setTaskProjectId(event.target.value);
                setTaskAssigneeId('');
              }}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-purple-600"
            >
              <option value="">Select governed project</option>
              {activeFilteredProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleProjectTaskSubmit} className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_150px_150px] gap-3">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                required
                minLength={3}
                placeholder="Task title for selected project"
                className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-purple-600"
              />
              <select
                value={taskAssigneeId}
                onChange={(event) => setTaskAssigneeId(event.target.value)}
                required
                className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-purple-600"
              >
                <option value="">Assign allocated team member</option>
                {taskProjectTeam.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name} - {employee.title}</option>
                ))}
              </select>
              <select
                value={taskPriority}
                onChange={(event) => setTaskPriority(event.target.value as TaskPriority)}
                className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-purple-600"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input
                type="date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
                className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-purple-600"
              />
            </div>
            <textarea
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
              rows={3}
              placeholder="Describe expected output, acceptance criteria, dependencies, and status reporting expectations."
              className="w-full resize-none rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-purple-600"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-ink-faint">
                {canCreateProjectTasks
                  ? `${taskProjectTeam.length} allocated team member${taskProjectTeam.length === 1 ? '' : 's'} available for task assignment.`
                  : 'Task creation is restricted to project/program managers, studio head, or allocated technical architects.'}
              </p>
              <button
                disabled={!canCreateProjectTasks || !taskProjectId}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Create Project Task
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-bold text-ink">Tasks For {selectedTaskProject?.name || 'Selected Project'}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-[10px] uppercase tracking-wider text-ink-faint">
                  <tr>
                    <th className="px-4 py-3 text-left">Task</th>
                    <th className="px-4 py-3 text-left">Assignee</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectTasks.filter((task) => !taskProjectId || task.project_id === taskProjectId).map((task) => (
                    <tr key={task.id} className="hover:bg-purple-50/30">
                      <td className="px-4 py-3 font-semibold text-ink">{task.title}</td>
                      <td className="px-4 py-3 text-ink-soft">{task.assignee_name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-ink-soft">{task.priority}</td>
                      <td className="px-4 py-3 text-ink-soft">{task.status.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-ink-soft">{task.due_date || '-'}</td>
                    </tr>
                  ))}
                  {projectTasks.filter((task) => !taskProjectId || task.project_id === taskProjectId).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft">No tasks created for this project yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* SCHEME B: PROJECT PORTFOLIO LISTING */
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Active Projects</p>
              <p className="text-2xl font-bold text-ink mt-1">{activeFilteredProjects.length}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">In Development</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{activeFilteredProjects.filter(p => p.phase === 'Development').length}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">High Risk Count</p>
              <p className="text-2xl font-bold text-danger mt-1">{activeFilteredProjects.filter(p => p.risk === 'High' || p.risk === 'Critical').length}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Avg Completion</p>
              <p className="text-2xl font-bold text-success mt-1">
                {activeFilteredProjects.length > 0 
                  ? `${Math.round(activeFilteredProjects.reduce((a, p) => a + (p.completionPercent || 0), 0) / activeFilteredProjects.length)}%`
                  : 'N/A'
                }
              </p>
            </div>
          </div>

          {/* Search Filters Row */}
          <div className="flex flex-wrap gap-3 items-center bg-surface border border-border rounded-xl p-3 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
              <input 
                type="text" 
                placeholder="Search project or client..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-surface-alt border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-ink outline-none focus:border-blue-600" 
              />
            </div>
            <select 
              value={phaseFilter} 
              onChange={e => setPhaseFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-ink-soft focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">All Phases</option>
              {phases.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Projects Cards Iteration */}
          {activeFilteredProjects.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-ink-soft">
              <FolderKanban size={32} className="mx-auto text-ink-faint mb-2" />
              <p className="font-semibold text-sm">No allocated projects found.</p>
              <p className="text-xs text-ink-faint mt-0.5">Please check with your Studio Head to verify assignments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeFilteredProjects.map(proj => {
                const account = accounts.find(a => a.id === proj.accountId);
                const manager = employees.find(e => e.id === proj.managerId);
                const architect = employees.find(e => e.id === proj.architectId);
                
                // Get team member allocations for this project
                const projAllocations = allocations.filter(a => a.projectId === proj.id);
                const isExpanded = expandedId === proj.id;
                const budgetPercent = Math.round((proj.budgetUsed / proj.budgetTotal) * 100);

                // Check employee's own assignment
                const mySpecificAlloc = allocations.find(
                  a => a.projectId === proj.id && a.employeeId === currentUser?.id
                );

                return (
                  <div key={proj.id} className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden hover:shadow transition-all">
                    {/* Health colored accent bar */}
                    <div className={`h-1.5 ${healthColor(proj.health)}`} />

                    <div className="p-5 space-y-4">
                      {/* Header Title */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3.5 h-3.5 rounded-full ${healthColor(proj.health)} shrink-0`} />
                          <div>
                            <h3 className="font-bold text-ink text-base flex items-center gap-2">
                              {proj.name}
                              {mySpecificAlloc && (
                                <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                  Your Project ({mySpecificAlloc.projectRole})
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-ink-faint">{account?.name} â€¢ {proj.phase} â€¢ Client: {proj.client}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openProjectEditor(proj.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-alt px-2 py-1 text-[10px] font-semibold text-ink-soft hover:text-ink hover:bg-surface transition-colors"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${riskStyle(proj.risk)}`}>{proj.risk} Risk</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">Sprint {proj.sprintNumber}</span>
                          <button 
                            onClick={() => setExpandedId(isExpanded ? null : proj.id)} 
                            className="text-ink-faint hover:text-ink cursor-pointer p-1 bg-surface-alt rounded-full hover:bg-surface-sunken"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* KPI Numbers Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-ink-faint uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp size={10} /> Sprint Progress
                          </p>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${proj.completionPercent || 0}%` }} 
                              className={`h-full transition-all duration-700 ${(proj.completionPercent || 0) > 70 ? 'bg-success' : (proj.completionPercent || 0) > 40 ? 'bg-warning' : 'bg-danger'}`} 
                            />
                          </div>
                          <p className="text-xs font-mono font-bold text-ink">{proj.completionPercent || 0}% Complete</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-ink-faint uppercase tracking-wider flex items-center gap-1">
                            <DollarSign size={10} /> Budget Allocation
                          </p>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${budgetPercent}%` }} 
                              className={`h-full transition-all duration-700 ${budgetPercent > 85 ? 'bg-danger' : budgetPercent > 65 ? 'bg-warning' : 'bg-blue-600'}`} 
                            />
                          </div>
                          <p className="text-xs font-mono font-bold text-ink">${proj.budgetUsed}M / ${proj.budgetTotal}M ({budgetPercent}%)</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-ink-faint uppercase tracking-wider flex items-center gap-1">
                            <Users size={10} /> Allocated Staff
                          </p>
                          <p className="text-xs font-bold text-ink">{projAllocations.length} Assigned Pod Members</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-ink-faint uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={10} /> Start Date
                          </p>
                          <p className="text-xs font-bold text-ink font-mono">{proj.startDate || "Unset"}</p>
                        </div>
                      </div>

                      {/* Tech stack badge list */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {proj.techStack.map(t => (
                          <span key={t} className="bg-surface-alt border border-border text-ink-soft text-[10px] px-2 py-0.5 rounded-md font-mono">{t}</span>
                        ))}
                      </div>

                      {/* Expanding Content Block (Details, Teammates, Specific allocations) */}
                      {isExpanded && (
                        <div className="border-t border-border pt-4 space-y-4 animate-[fadeIn_0.3s_ease] text-xs">
                          <div className="space-y-1">
                            <p className="font-bold text-ink-soft text-[10px] uppercase tracking-wider">Project Focus & Targets</p>
                            <p className="text-ink-soft leading-relaxed text-xs">{proj.description}</p>
                          </div>

                          {/* TEAMMATE CARD BLOCK */}
                          <div className="space-y-2">
                            <p className="font-bold text-ink-soft text-[10px] uppercase tracking-wider flex items-center gap-1">
                              <Users size={12} className="text-blue-600" /> Allocated Team Roster
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Manager Card */}
                              <div className="bg-surface-alt border border-border rounded-xl p-3 flex gap-2.5 items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-display font-bold text-xs uppercase shadow-xs shrink-0">
                                  {manager?.name ? manager.name.split(' ').map(n=>n[0]).join('') : 'PM'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-ink truncate text-xs">{manager?.name || 'Unassigned'}</div>
                                  <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Project Manager</div>
                                  <div className="text-[10px] text-ink-faint truncate">{manager?.email}</div>
                                </div>
                              </div>

                              {/* Architect Card */}
                              <div className="bg-surface-alt border border-border rounded-xl p-3 flex gap-2.5 items-center">
                                <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-display font-bold text-xs uppercase shadow-xs shrink-0">
                                  {architect?.name ? architect.name.split(' ').map(n=>n[0]).join('') : 'TA'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-ink truncate text-xs">{architect?.name || 'Unassigned'}</div>
                                  <div className="text-[10px] text-cyan-600 font-semibold uppercase tracking-wider">Technical Architect</div>
                                  <div className="text-[10px] text-ink-faint truncate">{architect?.email}</div>
                                </div>
                              </div>

                              {/* Teammates iteration from allocations */}
                              {projAllocations.filter(a => a.employeeId !== manager?.id && a.employeeId !== architect?.id).map(alloc => (
                                <div key={alloc.id} className="bg-surface border border-border rounded-xl p-3 flex gap-2.5 items-center">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-display font-bold text-xs uppercase shadow-xs shrink-0">
                                    {alloc.employeeName.split(' ').map(n=>n[0]).join('')}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-ink truncate text-xs flex items-center justify-between gap-1">
                                      <span className="truncate">{alloc.employeeName}</span>
                                      <span className="text-[9px] bg-slate-100 text-slate-700 font-mono px-1 rounded">{alloc.allocationPercent}%</span>
                                    </div>
                                    <div className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">{alloc.projectRole}</div>
                                    <div className="text-[10px] text-ink-faint truncate">{alloc.email}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* PERSONAL SPECIFIC DESIGNATION INDICATOR FOR EMPLOYEE VIEW */}
                          {previewRole === 'employee' && mySpecificAlloc && (
                            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                              <p className="font-bold text-blue-800 uppercase tracking-widest text-[9px]">Your Custom Allocation Sheet</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-ink-soft text-[11px]">
                                <div><span className="font-semibold text-ink">Designation:</span> {mySpecificAlloc.designation}</div>
                                <div><span className="font-semibold text-ink">Allocated Role:</span> {mySpecificAlloc.projectRole}</div>
                                <div><span className="font-semibold text-ink">Allocation Ratio:</span> {mySpecificAlloc.allocationPercent}%</div>
                                <div><span className="font-semibold text-ink">Reporting Manager:</span> {mySpecificAlloc.reportingManager}</div>
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}







