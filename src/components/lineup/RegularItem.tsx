
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, UserPlus } from "lucide-react";
import EditItemDialog from './EditItemDialog';
import { Interviewee } from '@/types/show';
import { getInterviewees } from '@/lib/supabase/interviewees';
import { toast } from 'sonner';
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
  const [editingInterviewee, setEditingInterviewee] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState({
    name: '',
    title: '',
    phone: ''
  });

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

  return (
    <>
      <td className="py-2 px-4 border border-gray-200 w-1/5">
        <div className="flex flex-col gap-1">
          <div>{name}</div>
          {interviewees.length > 0 && (
            <div className="text-sm text-gray-600">
              {interviewees.map((interviewee, index) => (
                <div key={interviewee.id} className="pl-4">
                  {interviewee.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="py-2 px-4 border border-gray-200 w-1/5">
        <div className="flex flex-col gap-1">
          <div>{title}</div>
          {interviewees.length > 0 && (
            <div className="text-sm text-gray-600">
              {interviewees.map((interviewee, index) => (
                <div key={interviewee.id} className="pl-4">
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
              <div className="text-sm text-gray-600">
                {interviewees.map((interviewee, index) => (
                  <div key={interviewee.id} className="pl-4">
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

        {showIntervieweeInput && (
          <div className="absolute mt-2 bg-white shadow-lg rounded-md p-4 border z-10">
            <div className="space-y-2">
              <IntervieweeSearch onAdd={async (guest) => {
                try {
                  console.log('Adding interviewee for item:', id, guest);
                  const newInterviewee = {
                    id: crypto.randomUUID(),
                    item_id: id,
                    name: guest.name,
                    title: guest.title,
                    phone: guest.phone,
                    duration,
                  };
                  
                  const updatedInterviewees = [...interviewees, newInterviewee];
                  setInterviewees(updatedInterviewees);
                  setShowIntervieweeInput(false);
                  setManualInput({ name: '', title: '', phone: '' });
                  
                  const updatedItem = {
                    name,
                    title,
                    details,
                    phone,
                    duration,
                    interviewees: updatedInterviewees
                  };
                  onEdit(id, updatedItem);
                  
                  toast.success('מרואיין נוסף בהצלחה');
                } catch (error: any) {
                  console.error('Error adding interviewee:', error);
                  toast.error('שגיאה בהוספת מרואיין');
                }
              }} />
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
                      const guest = {
                        name: manualInput.name,
                        title: manualInput.title,
                        phone: manualInput.phone
                      };
                      const newInterviewee = {
                        id: crypto.randomUUID(),
                        item_id: id,
                        ...guest,
                        duration,
                      };
                      
                      const updatedInterviewees = [...interviewees, newInterviewee];
                      setInterviewees(updatedInterviewees);
                      setShowIntervieweeInput(false);
                      setManualInput({ name: '', title: '', phone: '' });
                      
                      const updatedItem = {
                        name,
                        title,
                        details,
                        phone,
                        duration,
                        interviewees: updatedInterviewees
                      };
                      onEdit(id, updatedItem);
                      
                      toast.success('מרואיין נוסף בהצלחה');
                    }
                  }}
                  disabled={!manualInput.name}
                >
                  הוסף
                </Button>
              </div>
            </div>
          </div>
        )}
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
