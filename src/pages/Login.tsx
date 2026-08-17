import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiLogin } from '../services/api';

const DEMO_ACCOUNTS = [
  { label: 'Studio Head (Praveen)',          email: 'praveen.baburaya@delta.com',   color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-50 hover:border-purple-300' },
  { label: 'Program Mgr (Gowtham)',         email: 'gowtham.rallabandi@delta.com', color: 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300' },
  { label: 'Program Mgr (Rambabu)',         email: 'rambabu.bagati@delta.com',     color: 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300' },
  { label: 'Program Mgr (Kishor)',          email: 'kishor.babu@delta.com',        color: 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300' },
  { label: 'Project Mgr (Shanmukha)',       email: 'shanmukha.rewal@delta.com',    color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300' },
  { label: 'Project Mgr (Amrita)',          email: 'amrita.kumari@delta.com',      color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300' },
  { label: 'Project Mgr (Balakrishnan)',    email: 'balakrishnan@delta.com',       color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300' },
  { label: 'Architect (Suresh)',            email: 'suresh.babu@delta.com',        color: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-50 hover:border-teal-300' },
  { label: 'Developer (Sneha)',            email: 'sneha.patil@delta.com',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300' },
  { label: 'QA (Karthik)',                  email: 'karthik.venkat@delta.com',     color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300' },
  { label: 'Trimble PM (Maria)',            email: 'maria.chen@trimble.com',       color: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-50 hover:border-cyan-300' },
  { label: 'Trimble Architect (David)',    email: 'david.miles@trimble.com',      color: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-50 hover:border-violet-300' },
  { label: 'Trimble Frontend (Nina)',      email: 'nina.patel@trimble.com',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300' },
  { label: 'Trimble Backend (Omar)',       email: 'omar.hassan@trimble.com',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300' },
  { label: 'Trimble QA (Aisha)',           email: 'aisha.khan@trimble.com',       color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-50 hover:border-orange-300' },
] as const;

const VALID_EMAILS = new Set<string>(DEMO_ACCOUNTS.map(a => a.email));

export default function Login() {
  const navigate = useNavigate();
  const { login, setAuthToken, setCurrentUser } = useStore();

  const [email, setEmail] = useState('praveen.baburaya@delta.com');
  const [password, setPassword] = useState('Demo@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isSupportedDemoDomain = email.toLowerCase().endsWith('@delta.com') || email.toLowerCase().endsWith('@trimble.com');
    if (!isSupportedDemoDomain) {
      setError('Enter a valid @delta.com or @trimble.com email address.');
      return;
    }

    const emailLower = email.toLowerCase();
    if (!VALID_EMAILS.has(emailLower)) {
      setError('This email is not registered. Please use one of the demo accounts.');
      return;
    }

    if (password !== 'Demo@123') {
      setError('Incorrect password. Hint: Demo@123');
      return;
    }

    setIsLoading(true);
    try {
      const { access_token } = await apiLogin(emailLower, password);
      setAuthToken(access_token);
      
      const { apiMe } = await import('../services/api');
      const user = await apiMe(access_token);

      const mapRoleCategory = (role: string, department?: string) => {
        if (role === 'delivery_head') return 'Studio Head';
        if (role === 'program_manager') return 'Program Manager';
        if (role === 'project_manager') return 'Manager';
        if (role === 'team_lead') return 'Architect';
        if (role === 'developer') {
          if (department === 'Quality Assurance') return 'QA';
          if (department === 'Platform' || department === 'DevOps') return 'DevOps';
          return 'Developer';
        }
        if (role === 'qa') return 'QA';
        if (role === 'devops') return 'DevOps';
        if (role === 'intern') return 'Intern';
        return 'Developer';
      };

      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        roleCategory: mapRoleCategory(user.role, user.department) as any,
        dept: user.department,
        location: user.location,
        managerId: user.manager_id || '',
        managerName: '',
        projectId: '',
        skills: user.skills || [],
        experience: '5 years',
        joined: '2023-01-01',
        avatarColor: '#2563EB',
        availability: 'Allocated',
        bio: user.bio,
      });
      login(emailLower, access_token);
      
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate with backend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSO = async () => {
    setError('');
    const emailLower = email.toLowerCase();
    if (!VALID_EMAILS.has(emailLower)) {
      setError('Prefill a valid demo account first, then use SSO.');
      return;
    }

    setIsLoading(true);
    try {
      const { access_token } = await apiLogin(emailLower, 'Demo@123');
      setAuthToken(access_token);
      
      const { apiMe } = await import('../services/api');
      const user = await apiMe(access_token);

      const mapRoleCategory = (role: string, department?: string) => {
        if (role === 'delivery_head') return 'Studio Head';
        if (role === 'program_manager') return 'Program Manager';
        if (role === 'project_manager') return 'Manager';
        if (role === 'team_lead') return 'Architect';
        if (role === 'developer') {
          if (department === 'Quality Assurance') return 'QA';
          if (department === 'Platform' || department === 'DevOps') return 'DevOps';
          return 'Developer';
        }
        if (role === 'qa') return 'QA';
        if (role === 'devops') return 'DevOps';
        if (role === 'intern') return 'Intern';
        return 'Developer';
      };

      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        roleCategory: mapRoleCategory(user.role, user.department) as any,
        dept: user.department,
        location: user.location,
        managerId: user.manager_id || '',
        managerName: '',
        projectId: '',
        skills: user.skills || [],
        experience: '5 years',
        joined: '2023-01-01',
        avatarColor: '#2563EB',
        availability: 'Allocated',
        bio: user.bio,
      });
      login(emailLower, access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate with backend');
    } finally {
      setIsLoading(false);
    }
  };

  const selectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo@123');
    setError('');
  };

  /* ─── SSO loading screen ─── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-ink font-semibold text-lg mb-1">Authenticating…</p>
          <p className="text-ink-soft text-sm">Redirecting to Microsoft Entra&nbsp;ID</p>
        </div>
      </div>
    );
  }

  /* ─── Main layout ─── */
  return (
    <div className="min-h-screen flex bg-surface-alt">
      {/* ══════════ Left branding panel ══════════ */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-14 flex-col justify-between relative overflow-hidden text-white">
        {/* decorative radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_90%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />

        {/* logo */}
        <div className="flex items-center gap-2.5 font-display font-bold text-xl relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-blue-900/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          DeliveryGov
        </div>

        {/* tagline */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-display font-bold leading-tight mb-4 text-white">
            Delivery, made&nbsp;visible.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            One portal for weekly status, approvals and delivery health across every account&thinsp;—&thinsp;built for teams who need governance without the overhead.
          </p>
        </div>

        {/* stats */}
        <div className="flex gap-10 relative z-10">
          <div>
            <b className="block font-mono text-3xl font-bold tracking-tight">3</b>
            <span className="text-white/70 text-sm">Accounts</span>
          </div>
          <div>
            <b className="block font-mono text-3xl font-bold tracking-tight">5</b>
            <span className="text-white/70 text-sm">Projects</span>
          </div>
          <div>
            <b className="block font-mono text-3xl font-bold tracking-tight">9</b>
            <span className="text-white/70 text-sm">People</span>
          </div>
        </div>
      </div>

      {/* ══════════ Right form panel ══════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-ink">DeliveryGov</span>
          </div>

          <h2 className="text-2xl font-display font-semibold mb-1.5 text-ink">Sign in</h2>
          <p className="text-ink-soft text-sm mb-6">
            Enter your corporate email to access the Delivery Governance Portal.
          </p>

          {/* error banner */}
          {error && (
            <div className="bg-danger-bg text-danger border border-danger/30 px-4 py-3 rounded-lg text-sm mb-5 animate-[shake_0.3s_ease-in-out]">
              {error}
            </div>
          )}

          {/* ── quick demo accounts ── */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="font-semibold text-blue-800 text-sm mb-3">Quick Demo Accounts</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => selectDemoAccount(acct.email)}
                  className={`px-2.5 py-1 border rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${acct.color} ${email === acct.email ? 'ring-2 ring-blue-400 ring-offset-1 shadow-sm scale-[1.03]' : ''}`}
                >
                  {acct.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-faint mt-2.5">
              Click a role to prefill credentials. Password for all:&nbsp;
              <span className="font-mono font-bold text-blue-700">Demo@123</span>
            </p>
          </div>

          {/* ── login form ── */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-soft mb-1.5">
                Corporate email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@delta.com"
                className="w-full p-2.5 border border-border-strong rounded-lg bg-surface text-ink text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-shadow"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-ink-soft mb-1.5">
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border border-border-strong rounded-lg bg-surface text-ink text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none pr-10 transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-[34px] text-ink-faint hover:text-ink p-1 rounded transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* remember me + forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border-strong text-blue-600 accent-blue-600"
                  defaultChecked
                />
                Remember me
              </label>
              <button type="button" className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm shadow-blue-600/20 mt-1 cursor-pointer"
            >
              Sign in
            </button>
          </form>

          {/* divider */}
          <div className="flex items-center gap-3 my-6 text-ink-faint text-xs">
            <div className="flex-1 h-px bg-border" />
            OR
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* SSO button */}
          <button
            onClick={handleSSO}
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-border-strong text-ink font-semibold py-2.5 rounded-lg hover:bg-surface-alt hover:shadow-sm transition-all text-sm cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Continue with Microsoft Entra&nbsp;ID
          </button>

          <p className="mt-8 text-xs text-ink-faint text-center leading-relaxed">
            Protected by corporate SSO.&ensp;Sessions expire after 20&nbsp;minutes of inactivity.
          </p>
        </div>
      </div>
    </div>
  );
}