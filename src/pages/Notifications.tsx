import { Bell, CheckCheck, Trash2, Calendar, FileText, ShieldAlert, BadgeAlert } from 'lucide-react';
import { useStore } from '../store/useStore';

interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'alert' | 'comment';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

export default function Notifications() {
  const {
    notifications,
    toggleNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications
  } = useStore();

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  const handleToggleRead = (id: string) => {
    toggleNotificationRead(id);
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCheck className="text-success" size={16} />;
      case 'alert':
        return <BadgeAlert className="text-warning" size={16} />;
      case 'comment':
        return <ShieldAlert className="text-danger" size={16} />;
      default:
        return <FileText className="text-blue-500" size={16} />;
    }
  };

  const getNotifBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success-bg border-success/10';
      case 'alert':
        return 'bg-warning-bg border-warning/10';
      case 'comment':
        return 'bg-danger-bg border-danger/10';
      default:
        return 'bg-blue-50 border-blue-100/55';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink flex items-center gap-2">
            <Bell size={24} className="text-blue-600" />
            Notifications Center
            {unreadCount > 0 && (
              <span className="bg-danger text-white text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-ink-soft text-sm mt-1">Stay updated with reviews, deliverables alerts, and project status shifts.</p>
        </div>

        <div className="flex gap-2">
          {notifications.length > 0 && (
            <>
              <button 
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors cursor-pointer"
              >
                Mark all read
              </button>
              <button 
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink bg-surface-sunken px-3 py-1.5 rounded-lg border border-border transition-colors cursor-pointer"
              >
                <Trash2 size={12} /> Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-dashed border-border rounded-xl text-ink-faint text-sm flex flex-col items-center justify-center gap-3">
            <Bell size={36} className="text-border" />
            <p>You are all caught up! No notifications to display.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-4 border rounded-xl shadow-sm transition-all flex items-start justify-between gap-4 bg-surface ${
                !n.isRead ? 'border-l-4 border-l-blue-600 shadow-sm' : 'border-border opacity-75'
              }`}
            >
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${getNotifBg(n.type)}`}>
                  {getNotifIcon(n.type)}
                </div>
                <div className="space-y-1">
                  <h4 className={`text-sm font-semibold ${!n.isRead ? 'text-ink' : 'text-ink-soft'}`}>{n.title}</h4>
                  <p className="text-xs text-ink-soft leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-ink-faint flex items-center gap-1 font-mono">
                    <Calendar size={10} />
                    {n.time}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => handleToggleRead(n.id)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  !n.isRead 
                    ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' 
                    : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {n.isRead ? 'Mark Unread' : 'Dismiss'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
