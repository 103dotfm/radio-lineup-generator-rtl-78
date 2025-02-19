
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { getInterviewees } from '@/lib/supabase/interviewees';
import { toast } from 'sonner';
import IntervieweeList from './interviewees/IntervieweeList';
import IntervieweeForm from './interviewees/IntervieweeForm';

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
}: RegularItemProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showIntervieweeInput, setShowIntervieweeInput] = useState(false);
  const [interviewees, setInterviewees] = useState<Interviewee[]>([]);

  useEffect(() => {
    loadInterviewees();
  }, [id]);

  const loadInterviewees = async () => {
    try {
      const fetchedInterviewees = await getInterviewees(id);
      console.log('Fetched interviewees:', fetchedInterviewees);
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
    const updatedInterviewees = interviewees.map(i => 
      i.id === intervieweeId ? { ...i, ...updatedData } : i
    );
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
      <td className="py-2 px-4 border border-gray-200 w-1/5 relative">
        <div className="flex flex-col gap-1">
          <div>{name}</div>
          {interviewees.length > 0 && (
            <IntervieweeList
              interviewees={interviewees}
              onEdit={handleEditInterviewee}
              onDelete={handleDeleteInterviewee}
            />
          )}
        </div>
        
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
      <td className="py-2 px-4 border border-gray-200 w-1/5">
        <div className="flex flex-col gap-1">
          <div>{title}</div>
          {interviewees.length > 0 && (
            <div className="space-y-2">
              {interviewees.map((interviewee) => (
                <div key={interviewee.id} className="py-1">
                  {interviewee.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="py-2 px-4 border border-gray-200 w-[30%] align-top" 
          dangerouslySetInnerHTML={{ __html: details }} />
      {isAuthenticated && (
        <td className="py-2 px-4 border border-gray-200 w-[10%]">
          <div className="flex flex-col gap-1">
            <div>{phone}</div>
            {interviewees.length > 0 && (
              <div className="space-y-2">
                {interviewees.map((interviewee) => (
                  <div key={interviewee.id} className="py-1">
                    {interviewee.phone}
                  </div>
                ))}
              </div>
            )}
          </div>
        </td>
      )}
      <td className="py-2 px-4 border border-gray-200 w-[10%]">
        <Input
          type="number"
          min="1"
          value={duration}
          onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 5)}
          className="w-20"
        />
      </td>
      <td className="py-2 px-4 border border-gray-200 w-[10%]">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowIntervieweeInput(!showIntervieweeInput)}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log('Opening edit dialog for item:', { id, name, title, details, phone, duration, interviewees });
              setShowEditDialog(true);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>

      <EditItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={{ id, name, title, details, phone, duration, interviewees }}
        onSave={(updatedItem) => {
          const itemWithInterviewees = {
            ...updatedItem,
            interviewees
          };
          console.log('RegularItem: Handling save with updated item:', itemWithInterviewees);
          onEdit(id, itemWithInterviewees);
        }}
      />
    </>
  );
};

export default RegularItem;
