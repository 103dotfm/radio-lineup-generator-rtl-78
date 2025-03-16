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
    try {
      await onSave();
    } catch (error) {
      toast.error('שגיאה בשמירת הליינאפ');
    }
  };
  if (!isVisible) return null;
  return <div className="fixed top-0 left-0 right-0 bg-white z-50 shadow-md py-2 px-4 flex justify-between items-center print:hidden">
      <div className="flex items-center space-x-2 floatButtons">
        <Button variant="outline" size="sm" onClick={onBackToDashboard} className="flex items-center gap-1 ml-2">
          <Home className="h-4 w-4" />
          <span>מסך הבית</span>
        </Button>
        
        <Button variant="outline" size="sm" onClick={scrollToTop} className="flex items-center gap-1 ml-2">
          <ArrowUp className="h-4 w-4" />
          <span>למעלה</span>
        </Button>
        
        <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="flex items-center gap-1 bg-red-950 hover:bg-red-800">
          <Save className="h-4 w-4" />
          <span className="text-slate-50">{isSaving ? "שומר..." : "שמור"}</span>
        </Button>
      </div>
      
      <div className="text-lg font-semibold truncate mr-4 text-right floatShowName">
        {showName}
      </div>
    </div>;
};
export default FloatingHeader;