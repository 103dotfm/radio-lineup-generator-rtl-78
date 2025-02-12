
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { getInterviewees } from '@/lib/supabase/interviewees';
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
  onIntervieweesChange: (id: string, interviewees: Interviewee[]) => void;
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
  onIntervieweesChange,
  isAuthenticated,
}: RegularItemProps) => {
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
      setInterviewees(fetchedInterviewees);
      onIntervieweesChange(id, fetchedInterviewees);
    } catch (error) {
      console.error('Error loading interviewees:', error);
      toast.error('שגיאה בטעינת מרואיינים');
    }
  };

  const handleSave = (updatedItem: any) => {
    onEdit(id, updatedItem);
  };

  const handleAddInterviewee = (guest: { name: string; title: string; phone: string }) => {
    const newInterviewee: Omit<Interviewee, 'id'> = {
      item_id: id,
      name: guest.name,
      title: guest.title || '',
      phone: guest.phone || '',
      duration: duration,
    };
    
    const updatedInterviewees = [...interviewees, { ...newInterviewee, id: crypto.randomUUID() }];
    setInterviewees(updatedInterviewees);
    onIntervieweesChange(id, updatedInterviewees);
    setShowIntervieweeInput(false);
    setManualInput({ name: '', title: '', phone: '' });
  };

  const handleDeleteInterviewee = (intervieweeId: string) => {
    const updatedInterviewees = interviewees.filter(i => i.id !== intervieweeId);
    setInterviewees(updatedInterviewees);
    onIntervieweesChange(id, updatedInterviewees);
  };

  const handleUpdateInterviewee = (intervieweeId: string, updates: Partial<Interviewee>) => {
    const updatedInterviewees = interviewees.map(i => 
      i.id === intervieweeId ? { ...i, ...updates } : i
    );
    setInterviewees(updatedInterviewees);
    onIntervieweesChange(id, updatedInterviewees);
    setEditingInterviewee(null);
    setManualInput({ name: '', title: '', phone: '' });
  };

  return (
    <>
      <td className="py-2 px-4 border border-gray-200 align-top">
        <div className="flex items-center gap-2">
          <span>{name}</span>
        </div>
        {interviewees.map((interviewee) => (
          <div key={interviewee.id} className="mt-2 border-t pt-2 flex items-start gap-2">
            {editingInterviewee === interviewee.id ? (
              <Input
                value={manualInput.name || interviewee.name}
                onChange={(e) => setManualInput(prev => ({ ...prev, name: e.target.value }))}
                className="w-full"
                onBlur={() => {
                  if (manualInput.name) {
                    handleUpdateInterviewee(interviewee.id, { name: manualInput.name });
                  }
                }}
              />
            ) : (
              <>
                <span>{interviewee.name}</span>
                <div className="flex gap-1">
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
              </>
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
                onBlur={() => {
                  if (manualInput.title) {
                    handleUpdateInterviewee(interviewee.id, { title: manualInput.title });
                  }
                }}
              />
            ) : (
              interviewee.title
            )}
          </div>
        ))}
      </td>
      <td className="py-2 px-4 border border-gray-200 prose prose-sm max-w-none align-top break-words whitespace-normal h-full overflow-hidden" rowSpan={(interviewees.length || 0) + 1} dangerouslySetInnerHTML={{ __html: details }} />
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
                  onBlur={() => {
                    if (manualInput.phone) {
                      handleUpdateInterviewee(interviewee.id, { phone: manualInput.phone });
                    }
                  }}
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
