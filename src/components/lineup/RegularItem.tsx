
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus, Users } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { addInterviewee, deleteInterviewee, getInterviewees } from '@/lib/supabase/interviewees';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import IntervieweeSearch from './form/IntervieweeSearch';

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
  const { user } = useAuth();

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

  const handleSave = (updatedItem: any) => {
    console.log('RegularItem: Handling save with updated item:', updatedItem);
    onEdit(id, updatedItem);
  };

  const handleAddInterviewee = async (guest: { name: string; title: string; phone: string }) => {
    try {
      console.log('Adding interviewee for item:', id, guest);
      const newInterviewee = {
        item_id: id,
        name: guest.name,
        title: guest.title,
        phone: guest.phone,
        duration,
      };
      
      await addInterviewee(newInterviewee);
      await loadInterviewees();
      setShowIntervieweeInput(false);
      toast.success('מרואיין נוסף בהצלחה');
    } catch (error: any) {
      console.error('Error adding interviewee:', error);
      toast.error('שגיאה בהוספת מרואיין');
    }
  };

  const handleDeleteInterviewee = async (intervieweeId: string) => {
    try {
      await deleteInterviewee(intervieweeId);
      toast.success('מרואיין נמחק בהצלחה');
      await loadInterviewees();
    } catch (error: any) {
      console.error('Error deleting interviewee:', error);
      toast.error('שגיאה במחיקת מרואיין');
    }
  };

  return (
    <>
      <td className="py-2 px-4 border border-gray-200 align-top">
        <div>{name}</div>
        {interviewees.map((interviewee) => (
          <div key={interviewee.id} className="mt-2 flex items-center gap-2">
            <span>{interviewee.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteInterviewee(interviewee.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {showIntervieweeInput && (
          <div className="mt-2">
            <IntervieweeSearch onAdd={handleAddInterviewee} />
          </div>
        )}
      </td>
      <td className="py-2 px-4 border border-gray-200 align-top">
        <div>{title}</div>
        {interviewees.map((interviewee) => (
          <div key={interviewee.id} className="mt-2 text-gray-600">
            {interviewee.title}
          </div>
        ))}
      </td>
      <td className="py-2 px-4 border border-gray-200 prose prose-sm max-w-none align-top" rowSpan={interviewees.length + 1} dangerouslySetInnerHTML={{ __html: details }} />
      {isAuthenticated && (
        <td className="py-2 px-4 border border-gray-200 align-top">
          <div>{phone}</div>
          {interviewees.map((interviewee) => (
            <div key={interviewee.id} className="mt-2 text-gray-600">
              {interviewee.phone}
            </div>
          ))}
        </td>
      )}
      <td className="py-2 px-4 border border-gray-200 align-top">
        <Input
          type="number"
          min="1"
          value={duration}
          onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 5)}
          className="w-20"
        />
      </td>
      <td className="py-2 px-4 border border-gray-200 align-top">
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
              console.log('Opening edit dialog for item:', { id, name, title, details, phone, duration });
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
        item={{ id, name, title, details, phone, duration }}
        onSave={handleSave}
      />
    </>
  );
};

export default RegularItem;
