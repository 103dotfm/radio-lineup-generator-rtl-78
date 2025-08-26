
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { getInterviewees } from '@/lib/supabase/interviewees';
import { toast } from 'sonner';
import IntervieweeForm from './interviewees/IntervieweeForm';
import { getShowDisplay } from '@/utils/showDisplay';
import { sanitizeRichHtml } from "@/lib/sanitize";

interface RegularItemProps {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => void;
  isAuthenticated: boolean;
  showMinutes?: boolean;
}

const RegularItem = ({
  id,
  name,
  title,
  details,
  phone,
  duration,
  onDelete,
  onDurationChange,
  onEdit,
  isAuthenticated,
  showMinutes = false
}: RegularItemProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showIntervieweeInput, setShowIntervieweeInput] = useState(false);
  const [interviewees, setInterviewees] = useState<Interviewee[]>([]);
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
    loadInterviewees();
  }, [id]);

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

  return (
    <>
      <td className={`py-2 px-4 border border-gray-200 ${minHeightClass}`}>
        {/* Main item name */}
        <div className="text-right font-medium h-full flex flex-col">
          <div className={`flex-grow ${contentMinHeightClass}`}>{displayName}</div>
          
          {/* Interviewees table */}
          {interviewees.length > 0 && (
            <table className="w-full mt-2 border-t border-gray-100">
              <tbody>
                {interviewees.map((interviewee) => (
                  <tr key={interviewee.id} className="border-t border-gray-100">
                    <td className="py-1 text-right font-medium">{interviewee.name}</td>
                    <td className="py-1 w-14">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
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
                          className="h-5 w-5 p-0"
                          onClick={() => handleDeleteInterviewee(interviewee.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Interviewee input form */}
        {showIntervieweeInput && (
          <div className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded-md p-4 border z-10 min-w-[300px]">
            <IntervieweeForm 
              itemId={id} 
              duration={duration} 
              onAdd={handleAddInterviewee} 
              onClose={() => setShowIntervieweeInput(false)} 
            />
          </div>
        )}
      </td>
      <td className={`py-2 px-4 border border-gray-200 ${minHeightClass}`}>
        {/* Main item title */}
        <div className="text-right h-full flex flex-col">
          <div className={`flex-grow ${contentMinHeightClass}`}>{title}</div>
          
          {/* Interviewee titles */}
          {interviewees.length > 0 && (
            <table className="w-full mt-2 border-t border-gray-100">
              <tbody>
                {interviewees.map(interviewee => (
                  <tr key={interviewee.id} className="border-t border-gray-100">
                    <td className="py-1 text-right">{interviewee.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
      <td className={`py-2 px-4 border border-gray-200 align-top ${minHeightClass}`}>
        <div className={`${contentMinHeightClass}`} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(details || '') }} />
      </td>
      {isAuthenticated && (
        <td className={`py-2 px-4 border border-gray-200 ${minHeightClass}`}>
          {/* Main item phone */}
          <div className="text-right h-full flex flex-col">
            <div className={`flex-grow ${contentMinHeightClass}`}>{phone}</div>
            
            {/* Interviewee phones */}
            {interviewees.length > 0 && (
              <table className="w-full mt-2 border-t border-gray-100">
                <tbody>
                  {interviewees.map(interviewee => (
                    <tr key={interviewee.id} className="border-t border-gray-100">
                      <td className="py-1 text-right">{interviewee.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </td>
      )}
      {showMinutes && (
        <td className="py-2 px-4 border border-gray-200 w-24 text-center">
          <Input 
            type="number" 
            min="1" 
            value={duration} 
            onChange={e => onDurationChange(id, parseInt(e.target.value) || 5)} 
            className="w-20 text-center mx-auto" 
          />
        </td>
      )}
      <td className="py-2 px-4 border border-gray-200">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowIntervieweeInput(!showIntervieweeInput)}>
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
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
