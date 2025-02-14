
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { addInterviewee, deleteInterviewee, getInterviewees } from '@/lib/supabase/interviewees';
import { toast } from 'sonner';
import IntervieweeSearch from './form/IntervieweeSearch';
import { useParams, useLocation } from 'react-router-dom';

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
  const { id: showId } = useParams<{ id: string }>();
  const location = useLocation();
  const isNewShow = location.pathname === '/new';
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showIntervieweeInput, setShowIntervieweeInput] = useState(false);
  const [interviewees, setInterviewees] = useState<Interviewee[]>([]);
  const [editingInterviewee, setEditingInterviewee] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState({
    name: '',
    title: '',
    phone: ''
  });

  // Load interviewees when the component mounts or when id changes
  useEffect(() => {
    const loadData = async () => {
      if (!isNewShow && id) {
        try {
          console.log('Loading interviewees for item:', id);
          const fetchedInterviewees = await getInterviewees(id);
          console.log('Fetched interviewees for item', id, ':', fetchedInterviewees);
          setInterviewees(fetchedInterviewees);
        } catch (error) {
          console.error('Error loading interviewees:', error);
          toast.error('שגיאה בטעינת מרואיינים');
        }
      }
    };

    loadData();
  }, [id, isNewShow]);

  const handleAddInterviewee = async (guest: { name: string; title: string; phone: string }) => {
    try {
      console.log('Adding interviewee for item:', id, guest);

      // First, add to database if not a new show
      let dbInterviewee = null;
      if (!isNewShow && showId) {
        dbInterviewee = await addInterviewee({
          item_id: id,
          name: guest.name,
          title: guest.title,
          phone: guest.phone,
          duration
        });
      }

      // Add to local state
      const newInterviewee: Interviewee = dbInterviewee || {
        id: crypto.randomUUID(),
        item_id: id,
        name: guest.name,
        title: guest.title,
        phone: guest.phone,
        duration,
        created_at: new Date().toISOString()
      };

      const updatedInterviewees = [...interviewees, newInterviewee];
      setInterviewees(updatedInterviewees);
      setShowIntervieweeInput(false);
      setManualInput({ name: '', title: '', phone: '' });

      // Update parent component
      const updatedItem = {
        id,
        name,
        title,
        details,
        phone,
        duration,
        interviewees: updatedInterviewees
      };
      
      console.log('Updating item with new interviewees:', updatedItem);
      await onEdit(id, updatedItem);

    } catch (error: any) {
      console.error('Error adding interviewee:', error);
      toast.error('שגיאה בהוספת מרואיין');
    }
  };

  const handleDeleteInterviewee = async (intervieweeId: string) => {
    try {
      // Delete from database if not a new show
      if (!isNewShow && showId) {
        await deleteInterviewee(intervieweeId);
      }
      
      // Update local state
      const updatedInterviewees = interviewees.filter(i => i.id !== intervieweeId);
      setInterviewees(updatedInterviewees);
      
      // Update parent component
      await onEdit(id, {
        id,
        name,
        title,
        details,
        phone,
        duration,
        interviewees: updatedInterviewees
      });
    } catch (error) {
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
          <div key={interviewee.id} className="mt-2 border-t pt-2 min-h-[3rem] flex items-center">
            {editingInterviewee === interviewee.id ? (
              <Input
                value={manualInput.name || interviewee.name}
                onChange={(e) => setManualInput(prev => ({ ...prev, name: e.target.value }))}
                className="w-full"
                onBlur={() => {
                  if (manualInput.name) {
                    const updatedInterviewees = interviewees.map(i =>
                      i.id === interviewee.id
                        ? { ...i, name: manualInput.name }
                        : i
                    );
                    setInterviewees(updatedInterviewees);
                    setEditingInterviewee(null);
                    onEdit(id, {
                      id,
                      name,
                      title,
                      details,
                      phone,
                      duration,
                      interviewees: updatedInterviewees
                    });
                  }
                }}
              />
            ) : (
              <div className="flex items-center gap-2 w-full">
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
          <div key={interviewee.id} className="mt-2 border-t pt-2 min-h-[3rem] flex items-center">
            {editingInterviewee === interviewee.id ? (
              <Input
                value={manualInput.title || interviewee.title}
                onChange={(e) => setManualInput(prev => ({ ...prev, title: e.target.value }))}
                className="w-full"
              />
            ) : (
              <span>{interviewee.title}</span>
            )}
          </div>
        ))}
      </td>
      <td className="py-2 px-4 border border-gray-200 prose prose-sm max-w-none align-top overflow-visible" rowSpan={(interviewees.length || 0) + 1} dangerouslySetInnerHTML={{ __html: details }} />
      {isAuthenticated && (
        <td className="py-2 px-4 border border-gray-200 align-top">
          <div>{phone}</div>
          {interviewees.map((interviewee) => (
            <div key={interviewee.id} className="mt-2 border-t pt-2 min-h-[3rem] flex items-center">
              {editingInterviewee === interviewee.id ? (
                <Input
                  value={manualInput.phone || interviewee.phone}
                  onChange={(e) => setManualInput(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full"
                />
              ) : (
                <span>{interviewee.phone}</span>
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
        onSave={onEdit}
      />
    </>
  );
};

export default RegularItem;
