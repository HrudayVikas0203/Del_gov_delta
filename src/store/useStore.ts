import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee, Account, Project, WeeklyStatus, ResourceAllocation, AuditLog, AIInsight, GeneratedReport, NotificationItem, AppSettings } from '../types';

interface AppState {
  isAuthenticated: boolean;
  currentUser: Employee | null;
  previewRole: 'employee' | 'manager' | 'project_director' | 'studio_head';

  employees: Employee[];
  accounts: Account[];
  projects: Project[];
  submissions: WeeklyStatus[];
  allocations: ResourceAllocation[];
  auditLogs: AuditLog[];
  aiInsights: AIInsight[];
  reports: GeneratedReport[];
  notifications: NotificationItem[];
  settings: AppSettings;

  login: (email: string, token: string | null) => void;
  logout: () => void;
  setPreviewRole: (role: 'employee' | 'manager' | 'project_director' | 'studio_head') => void;
  submitWeeklyStatus: (statusId: string, fields: WeeklyStatus['fields']) => void;
  saveDraftStatus: (statusId: string, fields: WeeklyStatus['fields']) => void;
  addNewWeeklyStatus: (employeeId: string, weekKeyStr: string, weekLabelStr: string, frequency?: 'Daily' | 'Weekly' | 'Monthly') => void;
  approveStatus: (statusId: string, comment: string) => void;
  rejectStatus: (statusId: string, comment: string, isChangesRequested?: boolean) => void;
  addAuditLog: (userId: string, userName: string, action: string, module: string, details: string) => void;
  
  // New actions
  updateProfile: (bio: string, skills: string[]) => void;
  generateReport: (report: GeneratedReport) => void;
  updateSettings: (settings: AppSettings) => void;
  toggleNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;

  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  setReports: (reports: GeneratedReport[]) => void;

  createProject: (project: Omit<Project, 'id'>) => void;
  allocateResource: (allocation: Omit<ResourceAllocation, 'id'>) => void;
  deallocateResource: (allocationId: string) => void;
  deleteWeeklyStatus: (statusId: string) => void;

  setEmployees: (employees: Employee[]) => void;
  setAccounts: (accounts: Account[]) => void;
  setProjects: (projects: Project[]) => void;
  setAllocations: (allocations: ResourceAllocation[]) => void;
  setSubmissions: (submissions: WeeklyStatus[]) => void;
  setCurrentUser: (user: Employee) => void;
}

const defaultNotifications: NotificationItem[] = [
  {
    id: 'sys-001',
    type: 'info',
    title: 'Portal Launch',
    message: 'Welcome to the new Delivery Governance Portal. Report metrics every Friday.',
    time: '2 hours ago',
    isRead: false
  },
  {
    id: 'notif-sub-sub-a03',
    type: 'alert',
    title: 'Status Sheet Submitted',
    message: 'Ananya Rao submitted their weekly status for 13 May - 19 May 2024 and is awaiting your review.',
    time: '3 hours ago',
    isRead: false
  },
  {
    id: 'notif-app-sub-a01',
    type: 'success',
    title: 'Status Sheet Approved',
    message: 'Your status report for week 29 Apr - 05 May 2024 has been approved by Rahul Mehta.',
    time: 'Yesterday',
    isRead: false
  },
  {
    id: 'notif-mgr-risk',
    type: 'alert',
    title: 'Project Health Warning',
    message: 'Apex Logistics Fleet Dispatch Engine health has changed from Green to Amber.',
    time: '1 day ago',
    isRead: true
  }
];

const defaultSettings: AppSettings = {
  emailAlerts: true,
  slackAlerts: false,
  governanceReminders: true,
  darkMode: false,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentUser: null,
      previewRole: 'employee',
      authToken: null,

      employees: [],
      accounts: [],
      projects: [],
      submissions: [],
      allocations: [],
      auditLogs: [],
      aiInsights: [],
      reports: [],
      notifications: defaultNotifications,
      settings: defaultSettings,

      setCurrentUser: (user: Employee) => set(() => {
        const role = user.roleCategory === 'Studio Head' ? 'studio_head'
          : (user.roleCategory === 'Manager' || user.roleCategory === 'Program Manager') ? 'manager'
          : 'employee';
        
        return {
          isAuthenticated: true,
          currentUser: user,
          previewRole: role
        };
      }),

      login: (_email: string, token: string | null = null) => set((state) => {
        // Now login is handled via API in Login.tsx and setCurrentUser is called
        return { isAuthenticated: !!token, authToken: token ?? state.authToken };
      }),

      logout: () => set((state) => {
        const userId = state.currentUser?.id || 'sys';
        const userName = state.currentUser?.name || 'System';
        
        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId,
          userName,
          action: 'Logout',
          module: 'Authentication',
          details: `User logged out of the session.`
        };

        return {
          isAuthenticated: false,
          authToken: null,
          currentUser: null,
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      setAuthToken: (token) => set(() => ({ authToken: token })),
      setReports: (reports) => set(() => ({ reports })),
      setEmployees: (employees) => set(() => ({ employees })),
      setAccounts: (accounts) => set(() => ({ accounts })),
      setProjects: (projects) => set(() => ({ projects })),
      setAllocations: (allocations) => set(() => ({ allocations })),
      setSubmissions: (submissions) => set(() => ({ submissions })),

      setPreviewRole: (role) => set((state) => {
        let newUser = state.currentUser;
        if (role === 'studio_head') {
          newUser = state.employees.find(e => e.roleCategory === 'Studio Head') || state.currentUser;
        } else if (role === 'project_director') {
          newUser = state.employees.find(e => e.roleCategory === 'Program Manager') || state.currentUser;
        } else if (role === 'manager') {
          newUser = state.employees.find(e => e.roleCategory === 'Manager') || state.currentUser;
        } else if (role === 'employee') {
          newUser = state.employees.find(e => e.roleCategory !== 'Studio Head' && e.roleCategory !== 'Manager' && e.roleCategory !== 'Program Manager') || state.currentUser;
        }

        const userId = state.currentUser?.id || 'sys';
        const userName = state.currentUser?.name || 'System';

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId,
          userName,
          action: 'Role Switched',
          module: 'Role Switcher',
          details: `Switched preview role view to ${role} (active context: ${newUser?.name})`
        };

        return {
          previewRole: role,
          currentUser: newUser,
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      submitWeeklyStatus: (statusId, fields) => set((state) => {
        const sub = state.submissions.find(s => s.id === statusId);
        if (!sub) return {};

        const emp = state.employees.find(e => e.id === sub.employeeId) || state.currentUser;
        const userName = emp?.name || 'Unknown User';
        const userId = emp?.id || 'unknown';

        const updatedSubmissions = state.submissions.map(s =>
          s.id === statusId
            ? {
                ...s,
                status: 'submitted' as const,
                fields,
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                managerComment: undefined
              }
            : s
        );

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId,
          userName,
          action: 'Status Submitted',
          module: 'Weekly Status',
          details: `Submitted weekly status for ${sub.weekLabelStr}. Hours worked: ${fields.hoursWorked || 0}`
        };

        const managers = state.employees.filter(e => e.roleCategory === 'Manager' || e.roleCategory === 'Program Manager' || e.roleCategory === 'Studio Head');
        const newNotifs: NotificationItem[] = managers.map(mgr => ({
          id: `notif-sub-${statusId}-${mgr.id}-${Date.now()}`,
          type: 'alert' as const,
          title: 'Status Sheet Submitted',
          message: `${userName} submitted weekly status for ${sub.weekLabelStr} and is awaiting review.`,
          time: 'Just now',
          isRead: false
        }));

        return {
          submissions: updatedSubmissions,
          auditLogs: [newLog, ...state.auditLogs],
          notifications: [...newNotifs, ...state.notifications]
        };
      }),

      saveDraftStatus: (statusId, fields) => set((state) => {
        const sub = state.submissions.find(s => s.id === statusId);
        if (!sub) return {};

        const emp = state.employees.find(e => e.id === sub.employeeId) || state.currentUser;
        const userName = emp?.name || 'Unknown User';
        const userId = emp?.id || 'unknown';

        const updatedSubmissions = state.submissions.map(s =>
          s.id === statusId
            ? { ...s, status: 'draft' as const, fields, updatedAt: new Date().toISOString() }
            : s
        );

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId,
          userName,
          action: 'Draft Saved',
          module: 'Weekly Status',
          details: `Saved weekly status draft for ${sub.weekLabelStr}`
        };

        return {
          submissions: updatedSubmissions,
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      addNewWeeklyStatus: (employeeId, weekKeyStr, weekLabelStr, frequency) => set((state) => {
        const existing = state.submissions.find(s => s.employeeId === employeeId && s.weekKeyStr === weekKeyStr);
        if (existing) return {};

        const emp = state.employees.find(e => e.id === employeeId);
        const userName = emp?.name || 'System';

        const proj = state.projects.find(p => p.id === emp?.projectId);
        const acc = proj ? state.accounts.find(a => a.id === proj.accountId) : null;

        const newSub: WeeklyStatus = {
          id: `sub-${Math.random().toString(36).substring(2, 11)}`,
          employeeId,
          weekKeyStr,
          weekStart: `${weekKeyStr}T00:00:00Z`,
          weekLabelStr,
          status: 'not_started',
          fields: {
            frequency: frequency || 'Weekly',
            dateStr: frequency === 'Daily' ? weekKeyStr : undefined,
            project: proj ? proj.name : '',
            account: acc ? acc.name : '',
            overallStatus: 'Green',
            completionPercent: 0,
            hoursWorked: 40
          },
          submittedAt: null,
          updatedAt: new Date().toISOString()
        };

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId: employeeId,
          userName,
          action: 'Status Week Added',
          module: 'Weekly Status',
          details: `Created new status slot for week ${weekLabelStr}`
        };

        return {
          submissions: [newSub, ...state.submissions],
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      approveStatus: (statusId, comment) => set((state) => {
        const sub = state.submissions.find(s => s.id === statusId);
        if (!sub) return {};

        const emp = state.employees.find(e => e.id === sub.employeeId);
        const employeeName = emp?.name || 'Unknown Engineer';
        const managerName = state.currentUser?.name || 'Manager';
        const managerId = state.currentUser?.id || 'mgr';

        const updatedSubmissions = state.submissions.map(s =>
          s.id === statusId
            ? { ...s, status: 'approved' as const, managerComment: comment || 'Approved.', updatedAt: new Date().toISOString() }
            : s
        );

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId: managerId,
          userName: managerName,
          action: 'Status Approved',
          module: 'Approvals',
          details: `Approved weekly status for ${employeeName} (${sub.weekLabelStr}). Comment: "${comment || 'Approved'}"`
        };

        const newNotif: NotificationItem = {
          id: `notif-app-${statusId}-${Date.now()}`,
          type: 'success' as const,
          title: 'Status Sheet Approved',
          message: `Your status report for week ${sub.weekLabelStr} has been approved by ${managerName}.`,
          time: 'Just now',
          isRead: false
        };

        return {
          submissions: updatedSubmissions,
          auditLogs: [newLog, ...state.auditLogs],
          notifications: [newNotif, ...state.notifications]
        };
      }),

      rejectStatus: (statusId, comment, isChangesRequested) => set((state) => {
        const sub = state.submissions.find(s => s.id === statusId);
        if (!sub) return {};

        const emp = state.employees.find(e => e.id === sub.employeeId);
        const employeeName = emp?.name || 'Unknown Engineer';
        const managerName = state.currentUser?.name || 'Manager';
        const managerId = state.currentUser?.id || 'mgr';

        const targetStatus = isChangesRequested ? ('changes_requested' as const) : ('rejected' as const);

        const updatedSubmissions = state.submissions.map(s =>
          s.id === statusId
            ? { ...s, status: targetStatus, managerComment: comment || (isChangesRequested ? 'Changes requested.' : 'Rejected.'), updatedAt: new Date().toISOString() }
            : s
        );

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId: managerId,
          userName: managerName,
          action: isChangesRequested ? 'Status Changes Requested' : 'Status Rejected',
          module: 'Approvals',
          details: `${isChangesRequested ? 'Requested changes on' : 'Rejected'} weekly status for ${employeeName} (${sub.weekLabelStr}). Comment: "${comment || 'No comment'}"`
        };

        const newNotif: NotificationItem = {
          id: `notif-rej-${statusId}-${Date.now()}`,
          type: 'comment' as const,
          title: isChangesRequested ? 'Changes Requested' : 'Status Report Rejected',
          message: `Manager ${managerName} requested changes on status report for ${sub.weekLabelStr}. Comment: "${comment || 'Changes requested.'}"`,
          time: 'Just now',
          isRead: false
        };

        return {
          submissions: updatedSubmissions,
          auditLogs: [newLog, ...state.auditLogs],
          notifications: [newNotif, ...state.notifications]
        };
      }),

      addAuditLog: (userId, userName, action, module, details) => set((state) => ({
        auditLogs: [{
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(), userId, userName, action, module, details
        }, ...state.auditLogs]
      })),

      // New store action implementations
      updateProfile: (bio: string, skills: string[]) => set((state) => {
        if (!state.currentUser) return {};

        const userId = state.currentUser.id;
        const userName = state.currentUser.name;

        const updatedCurrentUser = {
          ...state.currentUser,
          bio,
          skills
        };

        const updatedEmployees = state.employees.map(emp =>
          emp.id === userId ? updatedCurrentUser : emp
        );

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId,
          userName,
          action: 'Profile Updated',
          module: 'Profile',
          details: `Updated personal biography and technical skills tag set.`
        };

        return {
          currentUser: updatedCurrentUser,
          employees: updatedEmployees,
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      generateReport: (report: GeneratedReport) => set((state) => {
        const userId = state.currentUser?.id || 'sys';
        const userName = state.currentUser?.name || 'System';

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId,
          userName,
          action: 'Report Generated',
          module: 'Reports',
          details: `Generated new report: "${report.title}" (${report.type}, format: ${report.format})`
        };

        return {
          reports: [report, ...state.reports],
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      updateSettings: (settings: AppSettings) => set((state) => {
        const userId = state.currentUser?.id || 'sys';
        const userName = state.currentUser?.name || 'System';

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId,
          userName,
          action: 'Settings Updated',
          module: 'Settings',
          details: `Updated application preferences (Email: ${settings.emailAlerts ? 'ON' : 'OFF'}, Slack: ${settings.slackAlerts ? 'ON' : 'OFF'}, Reminders: ${settings.governanceReminders ? 'ON' : 'OFF'}, Dark Mode: ${settings.darkMode ? 'ON' : 'OFF'})`
        };

        return {
          settings,
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      toggleNotificationRead: (id: string) => set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: !n.isRead } : n
        )
      })),

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      })),

      clearAllNotifications: () => set({ notifications: [] }),

      createProject: (newProjFields) => set((state) => {
        const id = `proj-${Math.random().toString(36).substring(2, 7)}`;
        const newProj: Project = {
          ...newProjFields,
          id,
          teamIds: newProjFields.teamIds || [],
          techStack: newProjFields.techStack || ['React', 'Node.js'],
          sprintNumber: newProjFields.sprintNumber || 1,
          health: newProjFields.health || 'green',
          risk: newProjFields.risk || 'Low',
          completionPercent: newProjFields.completionPercent || 0
        };

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId: state.currentUser?.id || 'sys',
          userName: state.currentUser?.name || 'System',
          action: 'Project Created',
          module: 'Project Governance',
          details: `Created new project "${newProj.name}" for client "${newProj.client}"`
        };

        return {
          projects: [...state.projects, newProj],
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      allocateResource: (allocFields) => set((state) => {
        const id = `alloc-${Math.random().toString(36).substring(2, 7)}`;
        const newAlloc: ResourceAllocation = {
          ...allocFields,
          id
        };

        // Also update teamIds in the project
        const updatedProjects = state.projects.map(p => {
          if (p.id === allocFields.projectId) {
            const teamIds = p.teamIds.includes(allocFields.employeeId) 
              ? p.teamIds 
              : [...p.teamIds, allocFields.employeeId];
            return { ...p, teamIds };
          }
          return p;
        });

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId: state.currentUser?.id || 'sys',
          userName: state.currentUser?.name || 'System',
          action: 'Resource Allocated',
          module: 'Resource Allocation',
          details: `Allocated ${newAlloc.employeeName} to project "${newAlloc.projectName}" as ${newAlloc.projectRole} (${newAlloc.allocationPercent}%)`
        };

        return {
          allocations: [...state.allocations, newAlloc],
          projects: updatedProjects,
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      deallocateResource: (allocationId) => set((state) => {
        const alloc = state.allocations.find(a => a.id === allocationId);
        if (!alloc) return {};

        // Remove employee from project teamIds if no other allocations exist for this project
        const remainingAllocationsForProject = state.allocations.filter(a => a.id !== allocationId && a.projectId === alloc.projectId && a.employeeId === alloc.employeeId);
        
        const updatedProjects = state.projects.map(p => {
          if (p.id === alloc.projectId && remainingAllocationsForProject.length === 0) {
            return {
              ...p,
              teamIds: p.teamIds.filter(id => id !== alloc.employeeId)
            };
          }
          return p;
        });

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId: state.currentUser?.id || 'sys',
          userName: state.currentUser?.name || 'System',
          action: 'Resource Deallocated',
          module: 'Resource Allocation',
          details: `Deallocated ${alloc.employeeName} from project "${alloc.projectName}"`
        };

        return {
          allocations: state.allocations.filter(a => a.id !== allocationId),
          projects: updatedProjects,
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),

      deleteWeeklyStatus: (statusId) => set((state) => {
        const sub = state.submissions.find(s => s.id === statusId);
        if (!sub) return {};

        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          userId: state.currentUser?.id || 'sys',
          userName: state.currentUser?.name || 'System',
          action: 'Status Log Deleted',
          module: 'Status Submissions',
          details: `Deleted draft status log for period: "${sub.weekLabelStr}"`
        };

        return {
          submissions: state.submissions.filter(s => s.id !== statusId),
          auditLogs: [newLog, ...state.auditLogs]
        };
      }),
    }),
    {
      name: 'delivery-governance-portal-storage-v3',
    }
  )
);
