import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Mail, ToggleLeft, ToggleRight, MessageSquare, Shield, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Settings() {
  const { settings, updateSettings } = useStore();

  const [emailAlerts, setEmailAlerts] = useState(settings?.emailAlerts ?? true);
  const [slackAlerts, setSlackAlerts] = useState(settings?.slackAlerts ?? false);
  const [governanceReminders, setGovernanceReminders] = useState(settings?.governanceReminders ?? true);
  const [darkModeSim, setDarkModeSim] = useState(settings?.darkMode ?? false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setEmailAlerts(settings.emailAlerts);
      setSlackAlerts(settings.slackAlerts);
      setGovernanceReminders(settings.governanceReminders);
      setDarkModeSim(settings.darkMode);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      emailAlerts,
      slackAlerts,
      governanceReminders,
      darkMode: darkModeSim
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);

    if (darkModeSim) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-ink flex items-center gap-2">
          <SettingsIcon size={24} className="text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
          Account & Preferences
        </h1>
        <p className="text-ink-soft text-sm mt-1">Configure your notification preferences, integration parameters, and visual dashboard interface.</p>
      </div>

      {saveSuccess && (
        <div className="bg-success-bg text-success border border-success/20 p-4 rounded-xl text-sm font-semibold shadow-sm">
          Settings saved successfully!
        </div>
      )}

      {/* Settings Grid Panel */}
      <div className="bg-surface border border-border rounded-xl shadow-sm divide-y divide-border">
        {/* Section 1: Notifications */}
        <div className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
            <Bell size={14} className="text-slate-400" /> Notifications & Alerts
          </h3>
          
          <div className="space-y-3 text-sm">
            {/* Email Alerts */}
            <div className="flex justify-between items-center py-1">
              <div>
                <p className="font-semibold text-ink flex items-center gap-1.5"><Mail size={16} className="text-slate-400" /> Email Notifications</p>
                <p className="text-xs text-ink-soft">Receive digest of status approvals and direct manager feedback comments.</p>
              </div>
              <button onClick={() => setEmailAlerts(!emailAlerts)} className="text-blue-600 focus:outline-none cursor-pointer">
                {emailAlerts ? <ToggleRight size={38} className="text-blue-600" /> : <ToggleLeft size={38} className="text-slate-300" />}
              </button>
            </div>

            {/* Slack Integration */}
            <div className="flex justify-between items-center py-1 border-t border-border/50 pt-3">
              <div>
                <p className="font-semibold text-ink flex items-center gap-1.5"><MessageSquare size={16} className="text-slate-400" /> Slack Channel Alerts</p>
                <p className="text-xs text-ink-soft">Push status cycle reminders and escalation warning flags directly into project channels.</p>
              </div>
              <button onClick={() => setSlackAlerts(!slackAlerts)} className="text-blue-600 focus:outline-none cursor-pointer">
                {slackAlerts ? <ToggleRight size={38} className="text-blue-600" /> : <ToggleLeft size={38} className="text-slate-300" />}
              </button>
            </div>

            {/* Deadlines */}
            <div className="flex justify-between items-center py-1 border-t border-border/50 pt-3">
              <div>
                <p className="font-semibold text-ink flex items-center gap-1.5"><RefreshCw size={16} className="text-slate-400" /> Cycle Reminders</p>
                <p className="text-xs text-ink-soft">Send automatic warning alerts 24 hours prior to the Friday 5:00 PM status deadline.</p>
              </div>
              <button onClick={() => setGovernanceReminders(!governanceReminders)} className="text-blue-600 focus:outline-none cursor-pointer">
                {governanceReminders ? <ToggleRight size={38} className="text-blue-600" /> : <ToggleLeft size={38} className="text-slate-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Display preferences */}
        <div className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={14} className="text-slate-400" /> Interface Configurations
          </h3>

          <div className="space-y-3 text-sm">
            {/* Dark Mode Simulation */}
            <div className="flex justify-between items-center py-1">
              <div>
                <p className="font-semibold text-ink">Dark Mode (Simulation)</p>
                <p className="text-xs text-ink-soft">Simulate dark contrast stylesheet layout properties (Prototype Mode).</p>
              </div>
              <button onClick={() => setDarkModeSim(!darkModeSim)} className="text-blue-600 focus:outline-none cursor-pointer">
                {darkModeSim ? <ToggleRight size={38} className="text-blue-600" /> : <ToggleLeft size={38} className="text-slate-300" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
