import { useState, useEffect } from 'react';
import { User, MapPin, Briefcase, Calendar, Shield, Cpu, Gauge, CheckSquare, Plus, Award } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Profile() {
  const { currentUser, updateProfile } = useStore();
  
  const [bioText, setBioText] = useState(currentUser?.bio || 'No biography entered.');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (currentUser) {
      setBioText(currentUser.bio || 'No biography entered.');
    }
  }, [currentUser]);

  const handleSaveBio = () => {
    setIsEditingBio(false);
    updateProfile(bioText, currentUser?.skills || []);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && currentUser) {
      const currentSkills = currentUser.skills || [];
      if (!currentSkills.includes(newSkill.trim())) {
        const updatedSkills = [...currentSkills, newSkill.trim()];
        updateProfile(currentUser.bio || '', updatedSkills);
        setNewSkill('');
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (currentUser) {
      const currentSkills = currentUser.skills || [];
      const updatedSkills = currentSkills.filter(s => s !== skillToRemove);
      updateProfile(currentUser.bio || '', updatedSkills);
    }
  };

  const getPercentageColor = (val: number, type: 'success' | 'danger' | 'info') => {
    if (type === 'success') {
      return val > 80 ? 'bg-success' : val > 50 ? 'bg-warning' : 'bg-danger';
    } else if (type === 'danger') {
      return val > 75 ? 'bg-danger' : val > 30 ? 'bg-warning' : 'bg-success';
    }
    return 'bg-blue-600';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cover / Profile Banner Card */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Decorative Gradient Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.1),transparent_55%)]"></div>
        </div>

        {/* Profile Info Overlay Row */}
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 mb-4 gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              {/* Avatar Box */}
              <div 
                style={{ backgroundColor: currentUser?.avatarColor || '#2F5AF3' }}
                className="w-28 h-28 rounded-2xl text-white font-display font-bold text-3xl flex items-center justify-center border-4 border-surface shadow-md shrink-0"
              >
                {currentUser?.name.split(' ').map(n => n[0]).join('')}
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-ink flex items-center gap-1.5 justify-center sm:justify-start">
                  {currentUser?.name}
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                    {currentUser?.availability}
                  </span>
                </h2>
                <p className="text-sm font-semibold text-ink-soft flex items-center gap-1 justify-center sm:justify-start">
                  <Briefcase size={14} className="text-slate-400" />
                  {currentUser?.title}
                </p>
                <p className="text-xs text-ink-faint flex items-center gap-1 justify-center sm:justify-start">
                  <MapPin size={12} className="text-slate-400" />
                  {currentUser?.location}
                </p>
              </div>
            </div>

            {/* Department info */}
            <div className="text-center sm:text-right text-xs bg-slate-50 border border-border p-2.5 rounded-xl self-center sm:self-end">
              <p className="text-ink-faint font-semibold uppercase tracking-wider text-[9px]">Department</p>
              <p className="font-bold text-ink mt-0.5">{currentUser?.dept}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Metadata Details & Metrics */}
        <div className="col-span-1 md:col-span-7 space-y-6">
          {/* Metadata details card */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-ink text-sm uppercase tracking-wider text-[11px] border-b border-border pb-2">Employment Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-ink-faint flex items-center gap-1"><Calendar size={12} /> Joined Date</span>
                <span className="font-semibold text-ink block">{currentUser?.joined || '12 Mar 2022'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-ink-faint flex items-center gap-1"><User size={12} /> Experience</span>
                <span className="font-semibold text-ink block">{currentUser?.experience || '4.5 years'}</span>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-ink-faint flex items-center gap-1"><Shield size={12} /> Direct Manager</span>
                <span className="font-semibold text-ink block">{currentUser?.managerName || 'Praveen Kumar Baburaya'}</span>
              </div>
            </div>
          </div>

          {/* Governance Metric Scores Card */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-5">
            <h3 className="font-semibold text-ink text-sm uppercase tracking-wider text-[11px] border-b border-border pb-2 flex items-center gap-1">
              <Award size={14} className="text-indigo-600" />
              Delivery & Governance Scores
            </h3>

            <div className="space-y-4">
              {/* AI Score */}
              {currentUser?.aiScore !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-ink flex items-center gap-1"><Cpu size={12} className="text-blue-500" /> AI Delivery Index</span>
                    <span className="font-mono text-blue-600">{currentUser.aiScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${currentUser.aiScore}%` }} 
                      className={`h-full transition-all duration-1000 ${getPercentageColor(currentUser.aiScore, 'success')}`}
                    ></div>
                  </div>
                  <p className="text-[10px] text-ink-faint">Measure of milestone accuracy and prompt delivery cycles.</p>
                </div>
              )}

              {/* Completion Rate */}
              {currentUser?.completionRate !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-ink flex items-center gap-1"><CheckSquare size={12} className="text-green-500" /> On-Time Submission Rate</span>
                    <span className="font-mono text-green-600">{currentUser.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${currentUser.completionRate}%` }} 
                      className={`h-full transition-all duration-1000 ${getPercentageColor(currentUser.completionRate, 'success')}`}
                    ></div>
                  </div>
                  <p className="text-[10px] text-ink-faint">Metric representing adherence to weekly reporting deadlines.</p>
                </div>
              )}

              {/* Risk Score */}
              {currentUser?.riskScore !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-ink flex items-center gap-1"><Gauge size={12} className="text-red-500" /> Project Delivery Risk</span>
                    <span className="font-mono text-red-600">{currentUser.riskScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${currentUser.riskScore}%` }} 
                      className={`h-full transition-all duration-1000 ${getPercentageColor(currentUser.riskScore, 'danger')}`}
                    ></div>
                  </div>
                  <p className="text-[10px] text-ink-faint">Aggregated client escalation risks (lower is better).</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Bio Editor & Skills Tag Cloud */}
        <div className="col-span-1 md:col-span-5 space-y-6">
          {/* Bio card */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="font-semibold text-ink text-sm uppercase tracking-wider text-[11px]">Biography</h3>
              {!isEditingBio ? (
                <button 
                  onClick={() => setIsEditingBio(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Edit
                </button>
              ) : (
                <button 
                  onClick={handleSaveBio}
                  className="text-xs font-semibold text-success hover:text-success/90 cursor-pointer"
                >
                  Save
                </button>
              )}
            </div>
            
            {!isEditingBio ? (
              <p className="text-xs text-ink-soft leading-relaxed italic">"{bioText}"</p>
            ) : (
              <textarea
                rows={4}
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                className="w-full p-2 border border-border rounded-lg text-xs bg-surface text-ink focus:border-blue-600 outline-none"
              />
            )}
          </div>

          {/* Skills tags card */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-ink text-sm uppercase tracking-wider text-[11px] border-b border-border pb-2">Skills & Technologies</h3>
            
            {/* Tag cloud */}
            <div className="flex flex-wrap gap-1.5">
              {(currentUser?.skills || []).map(skill => (
                <span 
                  key={skill} 
                  className="bg-slate-50 border border-border text-ink-soft text-xs px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 group"
                >
                  {skill}
                  <button 
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-ink-faint hover:text-danger font-bold text-[10px] ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Remove ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add skill form */}
            <form onSubmit={handleAddSkill} className="flex gap-2 pt-2 border-t border-border">
              <input
                type="text"
                placeholder="Add skill tag..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-border rounded-lg text-xs bg-surface text-ink focus:border-blue-600 outline-none"
              />
              <button 
                type="submit" 
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={12} /> Add
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
