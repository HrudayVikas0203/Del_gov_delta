import type { Employee, Project, ResourceAllocation, WeeklyStatus } from '../types';

const roleRank: Record<Employee['roleCategory'], number> = {
  Intern: 10,
  Developer: 20,
  QA: 20,
  DevOps: 20,
  Architect: 30,
  Manager: 40,
  'Program Manager': 50,
  'Studio Head': 60,
};

function isProjectLeadershipRole(role: string) {
  const normalized = role.toLowerCase();
  return normalized.includes('director') || normalized.includes('program') || normalized.includes('delivery manager') || normalized.includes('project manager');
}

function isProjectManagerRole(role: string) {
  const normalized = role.toLowerCase();
  return normalized.includes('project manager') || normalized.includes('delivery manager');
}

function projectHasManager(projectId: string, allocations: ResourceAllocation[]) {
  return allocations.some((allocation) => allocation.projectId === projectId && isProjectManagerRole(allocation.projectRole));
}

export function getGovernedProjects(actor: Employee | null, projects: Project[], allocations: ResourceAllocation[] = []) {
  if (!actor) return [];
  if (actor.roleCategory === 'Studio Head') return projects;

  const allocationProjectIds = new Set(
    allocations
      .filter((allocation) => allocation.employeeId === actor.id && isProjectLeadershipRole(allocation.projectRole))
      .map((allocation) => allocation.projectId),
  );

  if (actor.roleCategory === 'Program Manager') {
    if (allocationProjectIds.size > 0) {
      return projects.filter((project) => project.managerId === actor.id || allocationProjectIds.has(project.id));
    }
    return projects;
  }

  if (actor.roleCategory === 'Manager') {
    return projects.filter((project) => project.managerId === actor.id || allocationProjectIds.has(project.id));
  }

  return projects.filter((project) => (
    project.managerId === actor.id ||
    project.architectId === actor.id ||
    project.teamIds.includes(actor.id) ||
    allocations.some((allocation) => allocation.projectId === project.id && allocation.employeeId === actor.id)
  ));
}

export function getProjectTeam(projectId: string, employees: Employee[], projects: Project[], allocations: ResourceAllocation[] = []) {
  const project = projects.find((item) => item.id === projectId);
  const employeeIds = new Set<string>();
  if (project) {
    employeeIds.add(project.managerId);
    employeeIds.add(project.architectId);
    project.teamIds.forEach((id) => employeeIds.add(id));
  }
  allocations.filter((allocation) => allocation.projectId === projectId).forEach((allocation) => employeeIds.add(allocation.employeeId));
  employeeIds.delete('');
  return employees.filter((employee) => employeeIds.has(employee.id));
}

export function canManageEmployee(actor: Employee | null, target: Employee | undefined, projects: Project[], allocations: ResourceAllocation[] = []) {
  if (!actor || !target) return false;
  if (actor.id === target.id) return true;
  if (actor.roleCategory === 'Studio Head') return true;

  const actorRank = roleRank[actor.roleCategory] ?? 0;
  const targetRank = roleRank[target.roleCategory] ?? 0;
  const governedProjects = getGovernedProjects(actor, projects, allocations);
  const targetProjectIds = new Set(
    allocations
      .filter((allocation) => allocation.employeeId === target.id)
      .map((allocation) => allocation.projectId),
  );
  projects
    .filter((project) => project.managerId === target.id || project.architectId === target.id || project.teamIds.includes(target.id))
    .forEach((project) => targetProjectIds.add(project.id));

  if (actor.roleCategory === 'Program Manager') {
    return targetRank < actorRank && governedProjects.some((project) => targetProjectIds.has(project.id));
  }

  if (actor.roleCategory === 'Manager') {
    return targetRank < actorRank && governedProjects.some((project) => {
      if (!targetProjectIds.has(project.id)) return false;
      const hasDedicatedManager = projectHasManager(project.id, allocations) || Boolean(project.managerId);
      return hasDedicatedManager;
    });
  }

  return false;
}

export function getManageableEmployees(actor: Employee | null, employees: Employee[], projects: Project[], allocations: ResourceAllocation[] = []) {
  return employees.filter((employee) => canManageEmployee(actor, employee, projects, allocations));
}

export function getManageableProjects(actor: Employee | null, projects: Project[], allocations: ResourceAllocation[] = []) {
  return getGovernedProjects(actor, projects, allocations);
}

export function getVisibleSubmissions(
  actor: Employee | null,
  submissions: WeeklyStatus[],
  employees: Employee[],
  projects: Project[],
  allocations: ResourceAllocation[] = [],
) {
  const manageableEmployees = new Set(getManageableEmployees(actor, employees, projects, allocations).map((employee) => employee.id));
  return submissions.filter((submission) => manageableEmployees.has(submission.employeeId));
}

export function canReviewSubmission(
  actor: Employee | null,
  submission: WeeklyStatus | undefined,
  employees: Employee[],
  projects: Project[],
  allocations: ResourceAllocation[] = [],
) {
  if (!actor || !submission) return false;
  const employee = employees.find((item) => item.id === submission.employeeId);
  if (!employee || employee.id === actor.id) return false;
  return canManageEmployee(actor, employee, projects, allocations);
}
