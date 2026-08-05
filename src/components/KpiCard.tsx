import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

export default function KpiCard({ title, value, subtitle, icon: Icon, colorClass, bgClass }: KpiCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-wider">{title}</h3>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass} ${colorClass}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-mono font-medium text-ink mb-1">{value}</div>
      <div className="text-xs text-ink-faint">{subtitle}</div>
    </div>
  );
}