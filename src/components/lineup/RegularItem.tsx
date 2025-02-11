
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus, Users } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { addInterviewee, deleteInterviewee, getInterviewees } from '@/lib/supabase/interviewees';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  const [showInterviewees, setShowInterviewees] = useState(false);
  const [interviewees, setInterviewees] = useState<Interviewee[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (showInterviewees) {
      loadInterviewees();
    }
  }, [showInterviewees]);

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

  const handleAddInterviewee = async () => {
    try {
      console.log('Adding interviewee for item:', id);
      const newInterviewee = {
        item_id: id,
        name,
        title,
        phone,
        duration,
      };
      
      await addInterviewee(newInterviewee);
      toast.success('מרואיין נוסף בהצלחה');
      await loadInterviewees(); // Reload the interviewees list
    } catch (error: any) {
      console.error('Error adding interviewee:', error);
      toast.error('שגיאה בהוספת מרואיין');
    }
  };

  const handleDeleteInterviewee = async (intervieweeId: string) => {
    try {
      await deleteInterviewee(intervieweeId);
      toast.success('מרואיין נמחק בהצלחה');
      await loadInterviewees(); // Reload the interviewees list
    } catch (error: any) {
      console.error('Error deleting interviewee:', error);
      toast.error('שגיאה במחיקת מרואיין');
    }
  };

  return (
    <>
      <td className="py-2 px-4 border border-gray-200 align-top">{name}</td>
      <td className="py-2 px-4 border border-gray-200 align-top">{title}</td>
      <td className="py-2 px-4 border border-gray-200 prose prose-sm max-w-none align-top" dangerouslySetInnerHTML={{ __html: details }} />
      {isAuthenticated && (
        <td className="py-2 px-4 border border-gray-200 align-top">{phone}</td>
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
            onClick={() => setShowInterviewees(!showInterviewees)}
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAddInterviewee}
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

        {showInterviewees && interviewees && interviewees.length > 0 && (
          <div className="mt-2 space-y-2">
            {interviewees.map((interviewee) => (
              <div key={interviewee.id} className="flex items-center gap-2 text-sm">
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
          </div>
        )}
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

