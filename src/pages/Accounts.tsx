import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Building, Search, Globe, Shield, Coins, AlertCircle, Sparkles, Plus, X, Pencil } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Account } from '../types';
import { apiCreateAccount, apiCreateAccountWithTemplate, apiDeleteAccountTemplate, apiUpdateAccount, apiUpdateAccountWithTemplate } from '../services/api';

export default function Accounts() {
  const { accounts, projects, setAccounts, authToken } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHealth, setSelectedHealth] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountTemplateFile, setAccountTemplateFile] = useState<File | null>(null);
  const [accountTemplateStatus, setAccountTemplateStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newAccountData, setNewAccountData] = useState({
    name: '',
    industry: 'Financial Services',
    country: 'United States',
    businessUnit: 'Banking',
    contractValue: '0'
  });

  // Compute aggregated stats
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.status === 'Active').length;
  const redAlerts = accounts.filter(a => a.health === 'red').length + projects.filter(p => p.health === 'red').length;
  
  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          acc.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          acc.businessUnit.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHealth = selectedHealth === 'all' || acc.health === selectedHealth;
    const matchesIndustry = selectedIndustry === 'all' || acc.industry === selectedIndustry;
    return matchesSearch && matchesHealth && matchesIndustry;
  });

  // Extract unique industries for filter dropdown
  const industries = Array.from(new Set(accounts.map(a => a.industry)));

  const HealthBadge = ({ health }: { health: Account['health'] }) => {
    const styles = {
      green: 'bg-success-bg text-success border-success/20',
      amber: 'bg-warning-bg text-warning border-warning/20',
      red: 'bg-danger-bg text-danger border-danger/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[health]}`}>
        {health.toUpperCase()}
      </span>
    );
  };

  const resetAccountForm = () => {
    setNewAccountData({
      name: '',
      industry: 'Financial Services',
      country: 'United States',
      businessUnit: 'Banking',
      contractValue: '0'
    });
    setAccountTemplateFile(null);
    setAccountTemplateStatus(null);
    setEditingAccountId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;

    if (!newAccountData.name.trim()) {
      setAccountTemplateStatus('Account name is required.');
      return;
    }

    try {
      const payload = {
        name: newAccountData.name.trim(),
        industry: newAccountData.industry,
        country: newAccountData.country,
        business_unit: newAccountData.businessUnit,
        contract_value: Number(newAccountData.contractValue) || 0,
      };

      const saved = accountTemplateFile
        ? editingAccountId
          ? await apiUpdateAccountWithTemplate(editingAccountId, payload, accountTemplateFile, authToken)
          : await apiCreateAccountWithTemplate(payload, accountTemplateFile, authToken)
        : editingAccountId
          ? await apiUpdateAccount(editingAccountId, payload, authToken)
          : await apiCreateAccount(payload, authToken);

      const nextAccounts = editingAccountId
        ? accounts.map((account) => account.id === saved.id ? {
            ...account,
            name: saved.name,
            industry: saved.industry,
            country: saved.country,
            businessUnit: saved.business_unit,
            contractValue: `$${(Number(saved.contract_value || 0) / 1000000).toFixed(1)}M`,
            status: saved.status,
            health: saved.health,
            deliveryManagerId: saved.delivery_head_id || account.deliveryManagerId,
            pptTemplateId: saved.ppt_template_id || account.pptTemplateId,
            pptTemplateFilename: saved.ppt_template_filename || account.pptTemplateFilename,
            pptTemplateStatus: saved.ppt_template_status || account.pptTemplateStatus,
          } : account)
        : [
            ...accounts,
            {
              id: saved.id,
              name: saved.name,
              industry: saved.industry,
              country: saved.country,
              businessUnit: saved.business_unit,
              contractValue: `$${(Number(saved.contract_value || 0) / 1000000).toFixed(1)}M`,
              status: saved.status,
              health: saved.health,
              studioId: '',
              deliveryManagerId: saved.delivery_head_id || '',
              pptTemplateId: saved.ppt_template_id || null,
              pptTemplateFilename: saved.ppt_template_filename || null,
              pptTemplateStatus: saved.ppt_template_status || 'not_configured',
            }
          ];

      setAccounts(nextAccounts);

      setIsAddingAccount(false);
      resetAccountForm();
    } catch (err) {
      console.error(err);
      setAccountTemplateStatus(err instanceof Error ? err.message : 'Failed to save account');
    }
  };

  const openAccountEditor = (account?: Account) => {
    if (account) {
      setEditingAccountId(account.id);
      setNewAccountData({
        name: account.name,
        industry: account.industry,
        country: account.country,
        businessUnit: account.businessUnit,
        contractValue: String(Number(account.contractValue.replace(/[^0-9.]/g, '')) || 0),
      });
    } else {
      resetAccountForm();
    }
    setAccountTemplateStatus(null);
    setIsAddingAccount(true);
  };

  const removeAccountTemplate = async () => {
    if (!authToken || !editingAccountId) return;
    try {
      await apiDeleteAccountTemplate(editingAccountId, authToken);
      setAccounts(accounts.map((account) => account.id === editingAccountId ? {
        ...account,
        pptTemplateId: null,
        pptTemplateFilename: null,
        pptTemplateStatus: 'not_configured',
      } : account));
      setAccountTemplateStatus(null);
    } catch (err) {
      setAccountTemplateStatus(err instanceof Error ? err.message : 'Failed to remove template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Accounts & Projects</h1>
          <p className="text-ink-soft text-sm mt-1">Manage delivery health, financials, and project allocations across corporate client accounts.</p>
        </div>
        <button 
          onClick={() => {
            resetAccountForm();
            setIsAddingAccount(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Total Accounts</p>
            <p className="text-xl font-bold text-ink mt-0.5">{totalAccounts}</p>
            <p className="text-[11px] text-ink-faint">{activeAccounts} currently active</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Coins size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Contract Portfolio</p>
            <p className="text-xl font-bold text-ink mt-0.5">$9.5M</p>
            <p className="text-[11px] text-ink-faint">Across financial & tech domains</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Active Risks</p>
            <p className="text-xl font-bold text-ink mt-0.5">{redAlerts}</p>
            <p className="text-[11px] text-ink-faint">Requires PM escalation</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={16} />
          <input 
            type="text" 
            placeholder="Search account name, unit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-ink outline-none focus:bg-surface focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Health Filter */}
          <select 
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink-soft focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Health</option>
            <option value="green">Green</option>
            <option value="amber">Amber</option>
            <option value="red">Red</option>
          </select>

          {/* Industry Filter */}
          <select 
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink-soft focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Industries</option>
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Accounts List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAccounts.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-surface border border-dashed border-border rounded-xl text-ink-soft text-sm">
            No accounts found matching the current search criteria.
          </div>
        ) : (
          filteredAccounts.map(acc => {
            const accountProjects = projects.filter(p => p.accountId === acc.id);
            return (
              <div key={acc.id} className="bg-surface border border-border hover:border-border-strong rounded-xl p-5 shadow-sm space-y-4 hover:shadow transition-all relative overflow-hidden group">
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  acc.health === 'green' ? 'bg-success' :
                  acc.health === 'amber' ? 'bg-warning' : 'bg-danger'
                }`}></div>
                
                {/* Account Header */}
<div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-semibold text-base text-ink group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                        {acc.name}
                        {acc.status === 'Proposal' && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-slate-200">
                            <Sparkles size={8} /> Proposal
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-ink-faint mt-0.5">{acc.businessUnit} • {acc.industry}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openAccountEditor(acc)}
                        className="p-1.5 rounded-lg border border-border bg-surface text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors"
                        title="Edit account"
                      >
                        <Pencil size={14} />
                      </button>
                      <HealthBadge health={acc.health} />
                    </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-3 gap-2 bg-surface-alt/50 rounded-lg p-3 text-xs text-ink-soft">
                  <div className="space-y-1">
                    <p className="text-ink-faint font-semibold uppercase tracking-wider text-[9px]">Contract Value</p>
                    <p className="font-semibold text-ink flex items-center gap-1"><Coins size={12} className="text-slate-400" /> {acc.contractValue}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-ink-faint font-semibold uppercase tracking-wider text-[9px]">Geography</p>
                    <p className="font-semibold text-ink flex items-center gap-1"><Globe size={12} className="text-slate-400" /> {acc.country}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-ink-faint font-semibold uppercase tracking-wider text-[9px]">Delivery Manager</p>
                    <p className="font-semibold text-ink flex items-center gap-1"><Shield size={12} className="text-slate-400" /> Praveen Kumar Baburaya</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface-alt/40 px-3 py-2 text-xs">
                  <span className="font-semibold text-ink-soft">PPT template</span>
                  <span className={acc.pptTemplateStatus === 'configured' ? 'text-success font-semibold' : 'text-ink-faint'}>
                    {acc.pptTemplateStatus === 'configured' ? acc.pptTemplateFilename : 'Not configured'}
                  </span>
                </div>

                {/* Projects Section */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider text-[10px] border-b border-border pb-1">
                    Tracked Projects ({accountProjects.length})
                  </p>
                  {accountProjects.length === 0 ? (
                    <p className="text-xs text-ink-faint italic py-1">No active projects linked to this account.</p>
                  ) : (
                    <div className="space-y-3">
                      {accountProjects.map(proj => (
                        <div key={proj.id} className="p-3 border border-border bg-surface-alt/25 hover:bg-surface-alt/50 rounded-lg space-y-2 transition-all">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-ink">{proj.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                proj.risk === 'Low' ? 'bg-success/15 text-success' :
                                proj.risk === 'Medium' ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'
                              }`}>
                                {proj.risk} Risk
                              </span>
                              <span className="text-ink-faint">Sprint {proj.sprintNumber}</span>
                            </div>
                          </div>
                          <p className="text-xs text-ink-soft leading-relaxed">{proj.description}</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {proj.techStack.map(tech => (
                              <span key={tech} className="bg-white border border-border text-ink-soft text-[10px] px-2 py-0.5 rounded-full font-mono">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Add Account Modal */}
      {isAddingAccount && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-lg rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="font-semibold text-lg text-ink">{editingAccountId ? 'Edit Account' : 'Create New Account'}</h3>
              <button onClick={() => { setIsAddingAccount(false); resetAccountForm(); }} className="text-ink-faint hover:text-ink p-1 rounded-md transition-colors"><X size={18} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              <form id="createAccountForm" onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">Account Name</label>
                  <input type="text" required value={newAccountData.name} onChange={e => setNewAccountData({...newAccountData, name: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Acme Corp" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">Industry</label>
                    <input type="text" required value={newAccountData.industry} onChange={e => setNewAccountData({...newAccountData, industry: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">Business Unit</label>
                    <input type="text" required value={newAccountData.businessUnit} onChange={e => setNewAccountData({...newAccountData, businessUnit: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">Country</label>
                    <input type="text" required value={newAccountData.country} onChange={e => setNewAccountData({...newAccountData, country: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">Contract Value ($)</label>
                    <input type="number" min="0" step="10000" value={newAccountData.contractValue} onChange={e => setNewAccountData({...newAccountData, contractValue: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-2 border border-border rounded-xl p-3 bg-surface-alt/40">
                  <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider">Account PPT Template</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 border border-border rounded-lg text-xs font-semibold text-ink-soft hover:bg-surface transition-colors"
                  >
                    {accountTemplateFile ? 'Replace File' : 'Choose File'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file && !file.name.toLowerCase().endsWith('.pptx')) {
                        setAccountTemplateFile(null);
                        setAccountTemplateStatus('Only .pptx account templates are supported.');
                        e.target.value = '';
                        return;
                      }
                      if (file && file.size > 12 * 1024 * 1024) {
                        setAccountTemplateFile(null);
                        setAccountTemplateStatus('The PPTX template exceeds the 12 MB size limit.');
                        e.target.value = '';
                        return;
                      }
                      setAccountTemplateStatus(null);
                      setAccountTemplateFile(file);
                    }}
                    className="hidden"
                  />
                  {accountTemplateFile && (
                    <p className="text-[11px] text-ink-faint">Selected: {accountTemplateFile.name}</p>
                  )}
                  {!accountTemplateFile && editingAccountId && accounts.find((account) => account.id === editingAccountId)?.pptTemplateFilename && (
                    <div className="flex items-center justify-between gap-3 text-[11px] text-ink-faint">
                      <span>Current: {accounts.find((account) => account.id === editingAccountId)?.pptTemplateFilename}</span>
                      <button type="button" onClick={removeAccountTemplate} className="font-semibold text-danger hover:underline">
                        Remove template
                      </button>
                    </div>
                  )}
                </div>

                {accountTemplateStatus && (
                  <p className="text-xs text-danger font-medium">{accountTemplateStatus}</p>
                )}
              </form>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface-alt rounded-b-xl">
              <button type="button" onClick={() => { setIsAddingAccount(false); resetAccountForm(); }} className="px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink transition-colors">Cancel</button>
              <button type="submit" form="createAccountForm" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">{editingAccountId ? 'Save Changes' : 'Create Account'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
