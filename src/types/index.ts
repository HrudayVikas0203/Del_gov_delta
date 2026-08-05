export type RoleCategory =
  | 'Developer'
  | 'QA'
  | 'Architect'
  | 'Intern'
  | 'DevOps'
  | 'Manager'
  | 'Program Manager'
  | 'Studio Head';

export interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  roleCategory: RoleCategory;
  dept: string;
  location: string;
  managerId: string;
  managerName: string;
  projectId: string;
  skills: string[];
  experience: string;
  joined: string;
  avatarColor: string;
  availability: 'Allocated' | 'Available' | 'On Leave' | 'Bench';
  aiScore?: number;
  riskScore?: number;
  completionRate?: number;
  bio?: string;
  status?: string;
}

export interface Account {
  id: string;
  studioId: string;
  name: string;
  industry: string;
  country: string;
  businessUnit: string;
  contractValue: string;
  status: 'Active' | 'Proposal' | 'Completed' | 'On Hold';
  health: 'green' | 'amber' | 'red';
  deliveryManagerId: string;
  startDate?: string;
  endDate?: string;
}

export interface Project {
  id: string;
  accountId: string;
  name: string;
  phase: 'Planning' | 'Development' | 'Beta Testing' | 'UAT' | 'Production' | 'Maintenance';
  health: 'green' | 'amber' | 'red';
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  client: string;
  budgetUsed: number;
  budgetTotal: number;
  managerId: string;
  architectId: string;
  teamIds: string[];
  techStack: string[];
  sprintNumber: number;
  description: string;
  startDate?: string;
  endDate?: string;
  completionPercent?: number;
}

export type SubmissionStatus =
  | 'not_started'
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export interface WeeklyStatus {
  id: string;
  employeeId: string;
  weekKeyStr: string;
  weekStart: string;
  weekLabelStr: string;
  status: SubmissionStatus;
  fields: {
    achievements?: string;
    completedTasks?: string;
    pendingTasks?: string;
    blockers?: string;
    risks?: string;
    dependencies?: string;
    hoursWorked?: number;
    nextWeekPlan?: string;
    supportRequired?: string;
    comments?: string;
    // New fields
    frequency?: 'Daily' | 'Weekly';
    dateStr?: string; // Calendar Date for Daily status
    account?: string;
    project?: string;
    sprint?: string;
    tasksInProgress?: string;
    pendingWork?: string;
    clientDependencies?: string;
    plannedWork?: string;
    overallStatus?: 'Green' | 'Amber' | 'Red';
    completionPercent?: number;
    attachmentsSimulated?: string[]; // simulate only

    // Enterprise-specific additions
    reportingFrequency?: 'Daily' | 'Weekly';
    weekNumber?: string;
    weekStartDate?: string;
    weekEndDate?: string;
    currentDate?: string;
    module?: string;
    taskName?: string;
    workInProgress?: string;
    overallComments?: string;
    priority?: 'High' | 'Medium' | 'Low';
    employeeNotes?: string;
  };
  submittedAt: string | null;
  updatedAt: string;
  managerComment?: string;
  riskFlag?: {
    level: string;
    note: string;
    escalated: boolean;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
}

export interface AIInsight {
  id: string;
  projectId: string;
  projectName: string;
  weekKeyStr: string;
  generatedAt: string;
  executiveSummary: string;
  riskAnalysis: {
    level: 'Low' | 'Medium' | 'High' | 'Critical';
    risks: string[];
    recommendations: string[];
  };
  healthScore: number;
  sentimentScore: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  keyMetrics: {
    teamUtilization: number;
    onTimeDelivery: number;
    blockerCount: number;
    avgHoursWorked: number;
  };
  clientNarrative: string;
}

export interface GeneratedReport {
  id: string;
  title: string;
  type: 'Executive Summary' | 'Project Report' | 'Portfolio Report' | 'Client Report';
  format: 'PDF' | 'PPT' | 'Excel';
  generatedAt: string;
  generatedBy: string;
  scope: string;
  status: 'Ready' | 'Generating' | 'Failed';
  size?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  file_path: string;
  file_type: 'pptx' | 'pdf';
  uploaded_by_id?: string;
  uploaded_at: string;
}

export interface LLMProvider {
  name: string;
  display_name: string;
  configured: boolean;
  default_model: string;
  models: string[];
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'alert' | 'comment';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

export interface AppSettings {
  emailAlerts: boolean;
  slackAlerts: boolean;
  governanceReminders: boolean;
  darkMode: boolean;
}

export interface ResourceAllocation {
  id: string;
  projectId: string;
  projectName: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  email: string;
  projectRole: string;
  allocationDate: string;
  allocationPercent: number;
  reportingManager: string;
  projectStatus: 'Active' | 'Inactive';
}