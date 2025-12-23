import React from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar, { AdminSectionKey, AdminSubKey } from './AdminSidebar';

interface AdminLayoutProps {
  section: AdminSectionKey;
  sub?: AdminSubKey;
  onNavigate: (section: AdminSectionKey, sub?: AdminSubKey) => void;
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ section, sub, onNavigate, children }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex flex-col md:flex-row gap-8" dir="rtl">
      {/* Mobile header with hamburger */}
      <div className="md:hidden flex items-center justify-between glass-card p-4 rounded-xl mb-4">
        <h2 className="text-lg font-bold text-slate-800">תחומי ניהול</h2>
        <button
          type="button"
          aria-label="פתח תפריט"
          className="p-2 rounded-xl border-none bg-primary/10 text-primary hover:bg-primary/20 transition-all font-bold"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar for desktop */}
      <div className="hidden md:block shrink-0">
        <AdminSidebar
          currentSection={section}
          currentSub={sub}
          onNavigate={onNavigate}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(prev => !prev)}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-4/5 bg-white shadow-2xl overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">תפריט ניהול</h3>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400">✕</button>
            </div>
            <div className="p-4">
              <AdminSidebar
                currentSection={section}
                currentSub={sub}
                onNavigate={(sec, subKey) => { onNavigate(sec, subKey); setMobileOpen(false); }}
                collapsed={false}
                onToggleCollapse={() => { }}
              />
            </div>
          </div>
        </div>
      )}

      <section className="flex-1 min-w-0">
        <div className="glass-card rounded-2xl p-6 md:p-8 border-none premium-shadow animate-in">
          {children}
        </div>
      </section>
    </div>
  );
};

export default AdminLayout;


