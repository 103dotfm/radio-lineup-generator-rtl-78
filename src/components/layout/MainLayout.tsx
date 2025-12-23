import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) return <Outlet />;

    const toggleSidebar = () => setCollapsed(!collapsed);
    const toggleMobile = () => setMobileOpen(!mobileOpen);

    return (
        <div className="min-h-screen modern-gradient flex flex-row-reverse" dir="rtl">
            {/* Mobile Toggle Button */}
            <div className="md:hidden fixed top-4 right-4 z-[60]">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMobile}
                    className="glass-card bg-white/70 backdrop-blur-md rounded-2xl h-12 w-12 shadow-2xl border-none"
                >
                    {mobileOpen ? <X className="h-6 w-6 text-primary" /> : <Menu className="h-6 w-6 text-primary" />}
                </Button>
            </div>

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-0 z-50 transition-opacity duration-300 md:relative md:flex",
                mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
            )}>
                {/* Backdrop for mobile */}
                <div
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />

                <Sidebar
                    collapsed={collapsed}
                    onToggle={toggleSidebar}
                    className={cn(
                        "transition-transform duration-300 transform",
                        mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
                    )}
                />
            </div>

            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 transition-all duration-300 ease-in-out min-h-screen flex flex-col w-full",
                    collapsed ? "md:mr-20" : "md:mr-64"
                )}
            >
                <div className="flex-1 responsive-container py-8 px-4 md:px-8 animate-in fade-in duration-700">
                    <Outlet />
                </div>

                <footer className="py-8 px-8 border-t border-slate-100/50 mt-auto bg-white/30 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-col items-center md:items-start text-center md:text-right">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">פלטפורמת ליינאפ חכמה</span>
                            <span className="text-sm font-bold text-slate-800">© 2025 103FM - כל הזכויות שמורות</span>
                        </div>
                        <img src="/storage/uploads/general/103fm-logo.png" alt="103FM" className="h-8 opacity-50 hover:opacity-100 transition-opacity" />
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default MainLayout;
