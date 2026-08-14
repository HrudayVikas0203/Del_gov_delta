import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Projects = lazy(() => import('./pages/Projects'));
const EmployeeDirectory = lazy(() => import('./pages/EmployeeDirectory'));
const WeeklyStatus = lazy(() => import('./pages/WeeklyStatus'));
const Approvals = lazy(() => import('./pages/Approvals'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const TaskTracker = lazy(() => import('./pages/TaskTracker'));
const BRDStudio = lazy(() => import('./pages/BRDStudio'));
const Reports = lazy(() => import('./pages/Reports'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));

function PageLoader() {
  return (
    <div className="min-h-[320px] flex items-center justify-center text-sm text-ink-soft">
      Loading...
    </div>
  );
}

function App() {
  const { isAuthenticated, settings } = useStore();

  useEffect(() => {
    if (settings?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings?.darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />}
        />

        <Route
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}
        >
          <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="/accounts" element={<Suspense fallback={<PageLoader />}><Accounts /></Suspense>} />
          <Route path="/projects" element={<Suspense fallback={<PageLoader />}><Projects /></Suspense>} />
          <Route path="/employees" element={<Suspense fallback={<PageLoader />}><EmployeeDirectory /></Suspense>} />
          <Route path="/weekly-status" element={<Suspense fallback={<PageLoader />}><WeeklyStatus /></Suspense>} />
          <Route path="/approvals" element={<Suspense fallback={<PageLoader />}><Approvals /></Suspense>} />
          <Route path="/ai-insights" element={<Suspense fallback={<PageLoader />}><AIInsights /></Suspense>} />
          <Route path="/tasks" element={<Suspense fallback={<PageLoader />}><TaskTracker /></Suspense>} />
          <Route path="/brd-studio" element={<Suspense fallback={<PageLoader />}><BRDStudio /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
          <Route path="/audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
          <Route path="/help" element={<Suspense fallback={<PageLoader />}><Help /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
