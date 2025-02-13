import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { addInterviewee, deleteInterviewee, getInterviewees } from '@/lib/supabase/interviewees';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import IntervieweeSearch from './form/IntervieweeSearch';
import { saveShow } from '@/lib/supabase/shows';
import { useParams } from 'react-router-dom';

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
  const { id: showId } = useParams();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showIntervieweeInput, setShowIntervieweeInput] = useState(false);
  const [interviewees, setInterviewees] = useState<Interviewee[]>([]);
  const [editingInterviewee, setEditingInterviewee] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState({
    name: '',
    title: '',
    phone: ''
  });
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
      
      // First ensure the item exists in show_items
      const item = {
        id,
        name,
        title,
        details,
        phone,
        duration,
        is_break: false,
        is_note: false
      };
      
      // Use the current show ID when saving
      const result = await saveShow(
        { name: name, time: "", date: new Date().toISOString() },
        [item],
        showId // Pass the current show ID
      );

      // Now add the interviewee using the existing item ID
      const newInterviewee = {
        item_id: id, // Use the existing item ID since we know it exists
        name: guest.name,
        title: guest.title,
        phone: guest.phone,
        duration,
      };
      
      await addInterviewee(newInterviewee);
      await loadInterviewees();
      setShowIntervieweeInput(false);
      setManualInput({ name: '', title: '', phone: '' });
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
        <div className="flex items-center gap-2">
          <span>{name}</span>
        </div>
        {interviewees.map((interviewee) => (
          <div key={interviewee.id} className="mt-2 border-t pt-2">
            {editingInterviewee === interviewee.id ? (
              <Input
                value={manualInput.name || interviewee.name}
                onChange={(e) => setManualInput(prev => ({ ...prev, name: e.target.value }))}
                className="w-full"
                onBlur={async () => {
                  if (manualInput.name) {
                    await handleAddInterviewee({
                      ...interviewee,
                      name: manualInput.name,
                      title: manualInput.title || interviewee.title,
                      phone: manualInput.phone || interviewee.phone
                    });
                    setEditingInterviewee(null);
                  }
                }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span>{interviewee.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingInterviewee(interviewee.id)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteInterviewee(interviewee.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {showIntervieweeInput && (
          <div className="mt-2 space-y-2">
            <IntervieweeSearch onAdd={handleAddInterviewee} />
            <div className="text-sm text-gray-500">או הוספה ידנית:</div>
            <div className="space-y-2">
              <Input
                placeholder="שם"
                value={manualInput.name}
                onChange={(e) => setManualInput(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="קרדיט"
                value={manualInput.title}
                onChange={(e) => setManualInput(prev => ({ ...prev, title: e.target.value }))}
              />
              <Input
                placeholder="טלפון"
                value={manualInput.phone}
                onChange={(e) => setManualInput(prev => ({ ...prev, phone: e.target.value }))}
              />
              <Button
                onClick={() => {
                  if (manualInput.name) {
                    handleAddInterviewee(manualInput);
                  }
                }}
                disabled={!manualInput.name}
              >
                הוסף
              </Button>
            </div>
          </div>
        )}
      </td>
      <td className="py-2 px-4 border border-gray-200 align-top">
        <div>{title}</div>
        {interviewees.map((interviewee) => (
          <div key={interviewee.id} className="mt-2 border-t pt-2">
            {editingInterviewee === interviewee.id ? (
              <Input
                value={manualInput.title || interviewee.title}
                onChange={(e) => setManualInput(prev => ({ ...prev, title: e.target.value }))}
                className="w-full"
              />
            ) : (
              interviewee.title
            )}
          </div>
        ))}
      </td>
      <td className="py-2 px-4 border border-gray-200 prose prose-sm max-w-none align-top overflow-visible" rowSpan={(interviewees.length || 0) + 1} dangerouslySetInnerHTML={{ __html: details }} />
      {isAuthenticated && (
        <td className="py-2 px-4 border border-gray-200 align-top">
          <div>{phone}</div>
          {interviewees.map((interviewee) => (
            <div key={interviewee.id} className="mt-2 border-t pt-2">
              {editingInterviewee === interviewee.id ? (
                <Input
                  value={manualInput.phone || interviewee.phone}
                  onChange={(e) => setManualInput(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full"
                />
              ) : (
                interviewee.phone
              )}
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
