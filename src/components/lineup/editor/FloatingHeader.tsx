import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowUp, Save, Home } from "lucide-react";
import { toast } from "sonner";
interface FloatingHeaderProps {
  showName: string;
  onSave: () => Promise<void>;
  onBackToDashboard: () => void;
  isSaving?: boolean;
}
const FloatingHeader = ({
  showName,
  onSave,
  onBackToDashboard,
  isSaving = false
}: FloatingHeaderProps) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsVisible(scrollPosition > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  const handleSave = async () => {
    if (isSaving) return;
    try {
      await onSave();
    } catch (error) {
      toast.error('שגיאה בשמירת הליינאפ');
    }
  };
  if (!isVisible) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-5xl animate-in slide-in-from-top-8 duration-500 print:hidden">
      <div className="glass-card bg-white/70 backdrop-blur-2xl border-white/20 shadow-2xl shadow-slate-200/50 rounded-[2rem] py-3 px-8 flex justify-between items-center ring-1 ring-slate-900/5">
        <div className="text-xl font-black text-slate-800 truncate mr-8 text-right tracking-tight">
          {showName}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToDashboard}
            className="flex items-center gap-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">לוח בקרה</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToTop}
            className="flex items-center gap-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
          >
            <ArrowUp className="h-4 w-4" />
            <span className="hidden sm:inline">למעלה</span>
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-2"></div>

          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-black rounded-xl px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "שומר..." : "שמור שינויים"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
export default FloatingHeader;
