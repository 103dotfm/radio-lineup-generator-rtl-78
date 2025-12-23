import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Briefcase, Users, Mail, Database, HardDrive, FileCode, Cog, ChevronLeft, ChevronRight, Radio, Languages, Clock, Archive, FileText } from 'lucide-react';

export type AdminSectionKey =
  | 'general'
  | 'schedule'
  | 'studio-schedule'
  | 'arrangements'
  | 'workers'
  | 'email'
  | 'data'
  | 'database'
  | 'storage'
  | 'rds'
  | 'lineup-import';

export type AdminSubKey =
  | 'timezone'
  | 'domain'
  | 'management'
  | 'users'
  | 'producers'
  | 'engineers'
  | 'digital'
  | 'import'
  | 'export'
  | 'backup'
  | 'schedule-export'
  | 'rds-settings'
  | 'translations'
  | 'pending-requests'
  | 'sync-status'
  | 'approvers'
  | undefined;

export interface SidebarItem {
  key: AdminSectionKey;
  label: string;
  icon: React.ReactNode;
  children?: Array<{ key: AdminSubKey; label: string }>; // optional sub-items
}

const items: SidebarItem[] = [
  {
    key: 'general',
    label: 'כללי',
    icon: <Cog className="h-4 w-4" />,
    children: [
      { key: 'timezone', label: 'אזור זמן' },
      { key: 'domain', label: 'שם מתחם' },
    ],
  },
  { key: 'schedule', label: 'לוח שידורים', icon: <Calendar className="h-4 w-4" /> },
  {
    key: 'studio-schedule',
    label: 'לוח אולפנים',
    icon: <Clock className="h-4 w-4" />,
    children: [
      { key: 'pending-requests', label: 'בקשות ממתינות' },
      { key: 'sync-status', label: 'סטטוס סנכרון' },
      { key: 'approvers', label: 'ניהול מאשרים' },
    ],
  },
  {
    key: 'arrangements',
    label: 'סידורי עבודה',
    icon: <Briefcase className="h-4 w-4" />,
    children: [
      { key: 'producers', label: 'עורך סידור הפקה' },
      { key: 'engineers', label: 'עורך סידור טכנאים' },
      { key: 'digital', label: 'עורך סידור דיגיטל' },
    ],
  },
  {
    key: 'workers',
    label: 'ניהול עובדים',
    icon: <Users className="h-4 w-4" />,
    children: [
      { key: 'management', label: 'ניהול עובדים' },
      { key: 'users', label: 'ניהול משתמשים' },
    ],
  },
  {
    key: 'email',
    label: 'דואר אלקטרוני',
    icon: <Mail className="h-4 w-4" />,
    children: [
      { key: 'recipients', label: 'נמענים' },
      { key: 'settings', label: 'הגדרות שליחה' },
      { key: 'template', label: 'תבנית הודעה' },
    ],
  },
  {
    key: 'data',
    label: 'ניהול נתונים',
    icon: <Database className="h-4 w-4" />,
    children: [
      { key: 'export', label: 'ייצוא נתונים' },
      { key: 'import', label: 'ייבוא נתונים' },
      { key: 'backup', label: 'גיבוי ושחזור' },
      { key: 'schedule-export', label: 'ייצוא לוח שידורים' },
    ],
  },
  { key: 'database', label: 'בסיס נתונים', icon: <HardDrive className="h-4 w-4" /> },
  { key: 'storage', label: 'ניהול אחסון', icon: <Archive className="h-4 w-4" /> },
  {
    key: 'rds',
    label: 'RDS',
    icon: <Radio className="h-4 w-4" />,
    children: [
      { key: 'rds-settings', label: 'הגדרות RDS כלליות' },
      { key: 'translations', label: 'תרגומים' },
    ],
  },
  { key: 'lineup-import', label: 'ייבוא ליינאפים', icon: <FileText className="h-4 w-4" /> },
];

interface AdminSidebarProps {
  currentSection: AdminSectionKey;
  currentSub?: AdminSubKey;
  onNavigate: (section: AdminSectionKey, sub?: AdminSubKey) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentSection, currentSub, onNavigate, collapsed = false, onToggleCollapse }) => {
  return (
    <aside className={cn("w-full shrink-0 transition-all", collapsed ? "md:w-16 md:min-w-16" : "md:w-64 md:min-w-64")}> 
      <nav className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          {!collapsed && <span className="text-sm font-medium text-slate-700">תפריט</span>}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-slate-100 text-slate-600"
            aria-label="כווץ תפריט"
            title="כווץ תפריט"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const isActiveSection = currentSection === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-4 py-3 text-right transition-colors',
                    isActiveSection ? 'bg-[#3fc9c5] text-white' : 'hover:bg-slate-50'
                  )}
                  onClick={() => onNavigate(item.key, item.children?.[0]?.key)}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn('inline-flex items-center justify-center rounded-sm', isActiveSection ? 'text-white' : 'text-slate-600')}>
                      {item.icon}
                    </span>
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </span>
                </button>

                {item.children && isActiveSection && !collapsed && (
                  <ul className="bg-slate-50/60 py-1">
                    {item.children.map((child) => {
                      const isActiveChild = currentSub === child.key;
                      return (
                        <li key={child.key}>
                          <button
                            type="button"
                            className={cn(
                              'w-full text-right px-6 py-2 text-sm transition-colors',
                              isActiveChild ? 'text-[#3fc9c5] font-semibold' : 'text-slate-700 hover:text-slate-900'
                            )}
                            onClick={() => onNavigate(item.key, child.key)}
                          >
                            {child.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;


