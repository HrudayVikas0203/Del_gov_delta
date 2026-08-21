import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useStore } from '../store/useStore';
import { apiListEmployees, apiListAccounts, apiListProjects, apiListAllocations, apiListStatuses } from '../services/api';
import type { RoleCategory } from '../types';

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { authToken, logout, setEmployees, setAccounts, setProjects, setAllocations, setSubmissions } = useStore();

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('deliverygov:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('deliverygov:unauthorized', handleUnauthorized);
  }, [logout, navigate]);

  useEffect(() => {
    async function loadData() {
      if (!authToken) return;
      try {
        const [emp, acc, proj, alloc, status] = await Promise.all([
          apiListEmployees(authToken),
          apiListAccounts(authToken),
          apiListProjects(authToken),
          apiListAllocations(authToken),
          apiListStatuses(authToken)
        ]);
        setEmployees(emp.map(e => {
          let rc: RoleCategory = 'Developer';
          if (e.role === 'delivery_head') rc = 'Studio Head';
          else if (e.role === 'program_manager') rc = 'Program Manager';
          else if (e.role === 'project_manager') rc = 'Manager';
          else if (e.role === 'team_lead') rc = 'Architect';
          else if (e.role === 'developer') {
            if (e.department === 'Quality Assurance') rc = 'QA';
            else if (e.department === 'Platform' || e.department === 'DevOps') rc = 'DevOps';
            else rc = 'Developer';
          }
          else if (e.role === 'qa') rc = 'QA';
          else if (e.role === 'devops') rc = 'DevOps';
          else if (e.role === 'intern') rc = 'Intern';

          const colors = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#DB2777'];
          const colorIdx = e.name ? e.name.charCodeAt(0) % colors.length : 0;

          return {
            id: e.id,
            name: e.name,
            email: e.email,
            title: e.title,
            roleCategory: rc,
            dept: e.department || 'Delivery',
            location: e.location || 'Hyderabad',
            managerId: e.manager_id || '',
            managerName: '',
            projectId: '',
            skills: Array.isArray(e.skills) ? e.skills : [],
            experience: '',
            joined: '',
            avatarColor: colors[colorIdx],
            availability: e.availability === 'allocated' ? 'Allocated' : e.availability === 'on_leave' ? 'On Leave' : e.availability === 'bench' ? 'Bench' : 'Available',
            avatarUrl: `https://i.pravatar.cc/150?u=${e.email}`,
          };
        }));
        setAccounts(acc.map(a => ({
          id: a.id,
          name: a.name,
          industry: a.industry,
          country: a.country,
          businessUnit: a.business_unit,
          contractValue: a.contract_value ? `$${(Number(a.contract_value) / 1000000).toFixed(1)}M` : '$0',
          status: a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : 'Active',
          health: a.health || 'green',
          deliveryManagerId: a.delivery_head_id || '',
          studioId: '',
          pptTemplateId: a.ppt_template_id || null,
          pptTemplateFilename: a.ppt_template_filename || null,
          pptTemplateStatus: a.ppt_template_status || 'not_configured',
        })));
        setProjects(proj.map(p => ({
          id: p.id,
          accountId: p.account_id,
          name: p.name,
          phase: p.phase ? p.phase.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Planning',
          health: p.health || 'green',
          risk: p.risk ? p.risk.charAt(0).toUpperCase() + p.risk.slice(1) : 'Low',
          client: p.client || '',
          budgetUsed: Number(p.budget_used) || 0,
          budgetTotal: Number(p.budget_total) || 0,
          managerId: p.project_manager_id || p.program_manager_id || '',
          architectId: p.team_lead_id || '',
          teamIds: [],
          techStack: p.tech_stack ? p.tech_stack.split(',') : [],
          sprintNumber: p.sprint_number || 0,
          description: p.description || '',
          startDate: p.start_date,
          completionPercent: p.completion_percent || 0,
        })));
        
        const mappedAllocations = alloc.map(a => ({
          id: a.id,
          projectId: a.project_id,
          projectName: a.project_name || '',
          employeeId: a.employee_id,
          employeeName: a.employee_name || '',
          designation: a.employee_title || '',
          department: a.department || '',
          email: a.employee_email || '',
          projectRole: a.allocation_role,
          allocationDate: a.start_date,
          allocationPercent: a.allocation_percent,
          reportingManager: a.reporting_manager_id || '',
          projectStatus: 'Active' as const
        }));
        setAllocations(mappedAllocations);
        
        const mappedStatuses = status.map(s => ({
          id: s.id,
          employeeId: s.employee_id,
          weekKeyStr: s.week_start,
          weekStart: s.week_start,
          weekLabelStr: s.week_start, // Could be formatted
          status: s.status,
          fields: s.fields,
          managerComment: s.manager_comment,
          submittedAt: s.submitted_at,
          updatedAt: s.updated_at
        }));
        setSubmissions(mappedStatuses);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('inactive') || errorMsg.includes('Invalid token') || errorMsg.includes('401')) {
          logout();
          navigate('/login', { replace: true });
        }
      }
    }
    loadData();
  }, [authToken, logout, navigate, setEmployees, setAccounts, setProjects, setAllocations, setSubmissions]);

  return (
    <div className="flex min-h-screen bg-surface-alt">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
