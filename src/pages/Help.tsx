import { useState } from 'react';
import { HelpCircle, ChevronDown, BookOpen, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

export default function Help() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: 'What is the reporting cycle schedule?',
      a: 'Status reporting cycles run weekly. Engineers must submit their weekly logs by Friday at 5:00 PM local time. Delivery managers review and sign off or request changes by Monday afternoon.'
    },
    {
      q: 'How are risk scores and AI Delivery indices calculated?',
      a: 'The Risk Score aggregates blockers, delayed milestones, and high risk flags from linked projects. The AI Delivery index evaluates prompt submission times, completion percentages of planned tasks, and delivery velocity.'
    },
    {
      q: 'How do I handle project blockers or escalations?',
      a: 'If a task is blocked, write a detailed description in the Blockers field of the status form. If you require client intervention or hardware/software upgrades, outline it in the "Support Required" section to flag it for your Delivery Manager.'
    },
    {
      q: 'Can I edit status reports after submission?',
      a: 'No. Once a status report is submitted, it is locked in the Approvals Queue for manager review. If changes are required, your manager can request changes, which unlocks the sheet for edit, or you can contact them to reject it back to draft.'
    }
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-ink flex items-center gap-2">
          <HelpCircle size={24} className="text-blue-600" />
          Help & Governance Manual
        </h1>
        <p className="text-ink-soft text-sm mt-1">Guidelines, FAQs, cycle deadlines, and escalation instructions for Delivery Governance.</p>
      </div>

      {/* Guidelines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-2">
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Weekly Deadlines</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Submit: Friday 5:00 PM<br />
            Review: Monday 5:00 PM
          </p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-2">
          <div className="w-8 h-8 rounded bg-warning-bg text-warning flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Risk Flagging</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Flag blockers early. Unaddressed red health projects automatically escalate to BU heads.
          </p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-2">
          <div className="w-8 h-8 rounded bg-success-bg text-success flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Best Practices</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            List measurable metrics and clear dependency tags to accelerate approval cycles.
          </p>
        </div>
      </div>

      {/* FAQs section */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-ink text-sm border-b border-border pb-2 flex items-center gap-1.5">
          <BookOpen size={16} className="text-slate-400" />
          Frequently Asked Questions
        </h3>

        <div className="divide-y divide-border">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-semibold text-ink text-sm py-1 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={16} className={`text-ink-faint transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </button>
                {isOpen && (
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed pl-1 border-l-2 border-blue-500">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
