import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Calendar,
    PlusCircle,
    Users,
    Trophy,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    User,
    Radio
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    className?: string;
}

const Sidebar = ({ collapsed, onToggle, className }: SidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin, signOut, user } = useAuth();

    const menuItems = [
        { icon: LayoutDashboard, label: 'דאשבורד', path: '/' },
        { icon: PlusCircle, label: 'ליינאפ חדש', path: '/new' },
        { icon: Calendar, label: 'לוח שידורים', path: '/schedule' },
        { icon: Radio, label: 'לוח אולפנים', path: '/studio-schedule' },
        { icon: Trophy, label: 'פרסים', path: '/prizes' },
    ];

    if (isAdmin) {
        menuItems.push({ icon: Settings, label: 'ניהול מערכת', path: '/admin' });
    }

    const isActive = (path: string) => {
        if (path === '/' && location.pathname !== '/') return false;
        return location.pathname.startsWith(path);
    };

    return (
        <aside
            className={cn(
                "glass-sidebar fixed top-0 right-0 h-full z-50 transition-all duration-300 ease-in-out flex flex-col",
                collapsed ? "w-20" : "w-64",
                className
            )}
            dir="rtl"
        >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <img src="/storage/uploads/general/103fm-logo.png" alt="103FM" className="h-8 shadow-sm" />
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="hover:bg-primary/10 text-primary/70"
                >
                    {collapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                            isActive(item.path)
                                ? "bg-primary text-white shadow-lg premium-shadow"
                                : "hover:bg-white/40 text-slate-700 hover:text-primary backdrop-blur-sm"
                        )}
                    >
                        <item.icon className={cn(
                            "h-5 w-5 shrink-0",
                            isActive(item.path) ? "text-white" : "group-hover:scale-110 transition-transform"
                        )} />
                        {!collapsed && <span className="font-bold text-sm whitespace-nowrap">{item.label}</span>}

                        {isActive(item.path) && !collapsed && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                        )}
                    </button>
                ))}
            </nav>

            <div className="mt-auto p-4 border-t border-white/10 space-y-2">
                <button
                    onClick={() => navigate('/profile')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-white/40 text-slate-700 hover:text-primary group backdrop-blur-sm",
                        collapsed && "justify-center"
                    )}
                >
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url.startsWith('http') ? user.avatar_url : `/storage-new/${user.avatar_url}`}
                            alt={user.full_name}
                            className="h-10 w-10 rounded-full border-2 border-white shadow-md object-cover"
                        />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
                            <User className="h-5 w-5 text-slate-500" />
                        </div>
                    )}
                    {!collapsed && (
                        <div className="flex flex-col items-start overflow-hidden text-right" dir="rtl">
                            <span className="font-bold text-sm truncate w-full">{user?.full_name || 'פרופיל'}</span>
                            <span className="text-[10px] text-slate-500 font-medium truncate w-full">{user?.title || user?.email}</span>
                        </div>
                    )}
                </button>

                <button
                    onClick={signOut}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-red-500/10 text-slate-600 hover:text-red-600 group",
                        collapsed && "justify-center"
                    )}
                >
                    <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    {!collapsed && <span className="font-bold text-sm">התנתקות מהמערכת</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
