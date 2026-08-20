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
  pptTemplateId?: string | null;
  pptTemplateFilename?: string | null;
  pptTemplateStatus?: 'configured' | 'not_configured';
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
    frequency?: 'Daily' | 'Weekly' | 'Monthly';
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
    reportingFrequency?: 'Daily' | 'Weekly' | 'Monthly';
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
  account_id?: string | null;
  project_id?: string | null;
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

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface DeliveryTask {
  id: string;
  project_id: string;
  project_name?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_ids?: string[];
  reporter_id?: string | null;
  due_date?: string | null;
  estimate_hours: number;
  actual_hours: number;
  labels: string[];
  tags?: string[];
  checklist?: Array<Record<string, unknown> | string>;
  blocker_reason?: string | null;
  rejection_reason?: string | null;
  submitted_for_review_at?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id?: string | null;
  body: string;
  created_at: string;
  author_name?: string | null;
}

export interface BRDDocument {
  id: string;
  project_id: string;
  project_name?: string | null;
  filename: string;
  document_type: string;
  storage_path?: string | null;
  content_type?: string | null;
  size_bytes: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  uploaded_by_id?: string | null;
  uploaded_at: string;
}

export interface BRDRequirementSet {
  id: string;
  document_id: string;
  project_id: string;
  version: number;
  overview?: string | null;
  functional: Array<Record<string, unknown> | string>;
  non_functional: Array<Record<string, unknown> | string>;
  assumptions: Array<Record<string, unknown> | string>;
  created_by: string;
  created_at: string;
}

export interface BRDArtifact {
  id: string;
  project_id: string;
  document_id?: string | null;
  artifact_type: 'business_flow' | 'architecture' | 'database_design';
  version: number;
  title: string;
  payload: Record<string, unknown>;
  ai_provider?: string | null;
  model_used?: string | null;
  created_by_id?: string | null;
  created_at: string;
}
