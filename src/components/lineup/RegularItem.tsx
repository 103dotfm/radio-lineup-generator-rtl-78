import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus, X } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { getInterviewees } from '@/lib/supabase/interviewees';
import { toast } from 'sonner';
import IntervieweeForm from './interviewees/IntervieweeForm';
import { getShowDisplay } from '@/utils/showDisplay';
import { sanitizeShowDetails } from '@/utils/sanitize';

interface RegularItemProps {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  interviewees?: Array<{
    id: string;
    item_id: string;
    name: string;
    title?: string;
    phone?: string;
    duration?: number;
    created_at?: string;
  }>;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => void;
  isAuthenticated: boolean;
  showMinutes?: boolean;
  isBackupShow?: boolean;
}

const RegularItem = ({
  id,
  name,
  title,
  details,
  phone,
  duration,
  interviewees: propInterviewees,
  onDelete,
  onDurationChange,
  onEdit,
  isAuthenticated,
  showMinutes = false,
  isBackupShow = false
}: RegularItemProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showIntervieweeInput, setShowIntervieweeInput] = useState(false);
  const [interviewees, setInterviewees] = useState<Interviewee[]>(propInterviewees || []);
  const {
    displayName,
    displayHost
  } = getShowDisplay(name, title);

  // Determine min-height based on interviewees titles
  const getMinHeightClass = () => {
    // Only apply min-height if we have multiple interviewees
    if (!interviewees || interviewees.length <= 1) {
      return '';
    }

    // Find the longest title among interviewees
    const longestTitleLength = Math.max(...interviewees.map(i => (i.title || '').length), 0);

    // Apply different min-heights based on title length
    if (longestTitleLength <= 50) return 'min-h-[85px]';
    if (longestTitleLength <= 80) return 'min-h-[110px]';
    if (longestTitleLength <= 150) return 'min-h-[135px]';
    return 'min-h-[160px]';
  };

  const minHeightClass = getMinHeightClass();

  // Create a default min-height for items with multiple interviewees
  const contentMinHeightClass = interviewees && interviewees.length > 1 ? 'min-h-[75px]' : '';

  useEffect(() => {
    if (propInterviewees) {
      setInterviewees(propInterviewees);
    } else {
      loadInterviewees();
    }
  }, [id, propInterviewees]);

  const loadInterviewees = async () => {
    try {
      const fetchedInterviewees = await getInterviewees(id);
      setInterviewees(fetchedInterviewees);
    } catch (error) {
      console.error('Error loading interviewees:', error);
      toast.error('שגיאה בטעינת מרואיינים');
    }
  };

  const handleDeleteInterviewee = (intervieweeId: string) => {
    const updatedInterviewees = interviewees.filter(i => i.id !== intervieweeId);
    updateInterviewees(updatedInterviewees);
    toast.success('מרואיין נמחק בהצלחה');
  };

  const handleEditInterviewee = (intervieweeId: string, updatedData: Partial<Interviewee>) => {
    const updatedInterviewees = interviewees.map(i => i.id === intervieweeId ? {
      ...i,
      ...updatedData
    } : i);
    updateInterviewees(updatedInterviewees);
    toast.success('מרואיין עודכן בהצלחה');
  };

  const handleAddInterviewee = (newInterviewee: Interviewee) => {
    const updatedInterviewees = [...interviewees, newInterviewee];
    updateInterviewees(updatedInterviewees);
  };

  const updateInterviewees = (updatedInterviewees: Interviewee[]) => {
    setInterviewees(updatedInterviewees);
    const updatedItem = {
      name,
      title,
      details,
      phone,
      duration,
      interviewees: updatedInterviewees
    };
    onEdit(id, updatedItem);
  };

  const handleIntervieweeButtonClick = () => {
    setShowIntervieweeInput(!showIntervieweeInput);
  };

  return (
    <>
      <td className={`py-4 px-6 border-b border-slate-100 group-hover:bg-slate-50/50 transition-all ${minHeightClass}`}>
        <div className="text-right font-black text-slate-800 h-full flex flex-col justify-center">
          <div className={`text-lg leading-tight ${contentMinHeightClass}`}>{displayName}</div>

          {interviewees.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
              {interviewees.map((interviewee) => (
                <div key={interviewee.id} className="flex items-center justify-between text-sm group/interviewee">
                  <span className="font-bold text-slate-600">{interviewee.name}</span>
                  {!isBackupShow && (
                    <div className="flex gap-1 opacity-0 group-hover/interviewee:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                        onClick={() => handleEditInterviewee(interviewee.id, {
                          name: prompt('שם חדש:', interviewee.name) || interviewee.name,
                          title: prompt('תפקיד חדש:', interviewee.title) || interviewee.title,
                          phone: prompt('טלפון חדש:', interviewee.phone) || interviewee.phone,
                        })}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        onClick={() => handleDeleteInterviewee(interviewee.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>

      <td className={`py-4 px-6 border-b border-slate-100 group-hover:bg-slate-50/50 transition-all ${minHeightClass}`}>
        <div className="text-right h-full flex flex-col justify-center">
          <div className={`text-slate-500 font-bold leading-tight ${contentMinHeightClass}`}>{title}</div>

          {interviewees.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
              {interviewees.map(interviewee => (
                <div key={interviewee.id} className="text-xs font-medium text-slate-400 h-6 flex items-center">
                  {interviewee.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>

      <td className={`py-4 px-6 border-b border-slate-100 group-hover:bg-slate-50/50 transition-all align-top ${minHeightClass}`}>
        <div className="text-slate-600 leading-relaxed text-sm">
          <div className={`${contentMinHeightClass}`} dangerouslySetInnerHTML={{ __html: sanitizeShowDetails(details || '') }} />

          {showIntervieweeInput && (
            <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">הוספת מרואיין</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-xl hover:bg-slate-50"
                  onClick={() => setShowIntervieweeInput(false)}
                >
                  <X className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
              <IntervieweeForm
                itemId={id}
                duration={duration}
                onAdd={handleAddInterviewee}
                onClose={() => setShowIntervieweeInput(false)}
              />
            </div>
          )}
        </div>
      </td>

      {isAuthenticated && (
        <td className={`py-4 px-6 border-b border-slate-100 group-hover:bg-slate-50/50 transition-all ${minHeightClass}`}>
          <div className="text-right h-full flex flex-col justify-center">
            <div className={`font-mono text-slate-500 font-medium ${contentMinHeightClass}`}>{phone}</div>

            {interviewees.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                {interviewees.map(interviewee => (
                  <div key={interviewee.id} className="text-xs font-mono text-slate-400 h-6 flex items-center">
                    {interviewee.phone}
                  </div>
                ))}
              </div>
            )}
          </div>
        </td>
      )}

      {showMinutes && (
        <td className="py-4 px-4 border-b border-slate-100 w-24 text-center group-hover:bg-slate-50/50">
          <div className="relative inline-block">
            <Input
              type="number"
              min="1"
              value={duration}
              onChange={e => onDurationChange(id, parseInt(e.target.value) || 5)}
              className="w-16 h-10 text-center mx-auto bg-white/50 border-slate-100 rounded-xl font-black text-primary focus:ring-4 focus:ring-primary/5 transition-all"
            />
          </div>
        </td>
      )}

      <td className="py-4 px-6 border-b border-slate-100 text-center group-hover:bg-slate-50/50">
        <div className="flex justify-center gap-1">
          {!isBackupShow && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleIntervieweeButtonClick}
                className={cn(
                  "h-10 w-10 rounded-xl transition-all",
                  showIntervieweeInput ? "bg-primary/10 text-primary shadow-inner" : "text-slate-400 hover:text-primary hover:bg-primary/5"
                )}
                title="הוסף מרואיין נוסף"
              >
                <UserPlus className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEditDialog(true)}
                className="h-10 w-10 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
              >
                <Edit2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(id)}
                className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </td>

      {showEditDialog && (
        <EditItemDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          item={{
            id,
            name,
            title,
            details,
            phone,
            duration,
            interviewees
          }}
          onSave={updatedItem => {
            const itemWithInterviewees = {
              ...updatedItem,
              interviewees
            };
            onEdit(id, itemWithInterviewees);
          }}
        />
      )}
    </>
  );
};

export default RegularItem;
