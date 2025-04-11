
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { DAYS_OF_WEEK, CustomRow } from './types';
import { useArrangement } from './ArrangementContext';

interface CustomRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomRow: CustomRow | null;
  onSuccess: () => void;
}

const CustomRowDialog: React.FC<CustomRowDialogProps> = ({ 
  open, 
  onOpenChange, 
  editingCustomRow, 
  onSuccess 
}) => {
  const { arrangement, currentSection } = useArrangement();
  const { toast } = useToast();
  const [customRowContent, setCustomRowContent] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    if (editingCustomRow) {
      setCustomRowContent(editingCustomRow.contents);
    } else {
      const initialContents: Record<number, string> = {};
      for (let i = 0; i < 6; i++) {
        initialContents[i] = '';
      }
      setCustomRowContent(initialContents);
    }
  }, [editingCustomRow, open]);

  const handleSaveCustomRow = async () => {
    if (!arrangement) return;
    
    try {
      if (editingCustomRow) {
        const { error } = await supabase
          .from('digital_shift_custom_rows')
          .update({
            section_name: currentSection,
            contents: customRowContent
          })
          .eq('id', editingCustomRow.id);
        
        if (error) throw error;
        
        toast({
          title: "בוצע",
          description: "השורה עודכנה בהצלחה"
        });
      } else {
        // Get position for the new custom row
        const { data: existingRows } = await supabase
          .from('digital_shift_custom_rows')
          .select('*')
          .eq('arrangement_id', arrangement.id)
          .eq('section_name', currentSection);
          
        const position = existingRows ? existingRows.length : 0;
        
        const { error } = await supabase
          .from('digital_shift_custom_rows')
          .insert({
            arrangement_id: arrangement.id,
            section_name: currentSection,
            contents: customRowContent,
            position: position
          });
        
        if (error) throw error;
        
        toast({
          title: "בוצע",
          description: "השורה נוצרה בהצלחה"
        });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving custom row:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את השורה",
        variant: "destructive"
      });
    }
  };

  const closeDialog = () => {
    document.body.style.pointerEvents = '';
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          document.body.style.pointerEvents = '';
        }
        onOpenChange(open);
      }}
    >
      <DialogContent 
        className="max-w-4xl bg-background" 
        onEscapeKeyDown={closeDialog}
        onPointerDownOutside={closeDialog}
        onInteractOutside={(e) => {
          e.preventDefault();
          closeDialog();
        }}
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>
            {editingCustomRow ? 'עריכת שורה מותאמת אישית' : 'הוספת שורה מותאמת אישית'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-6 gap-4 py-4">
          {[0, 1, 2, 3, 4, 5].map((day) => (
            <div key={day} className="flex flex-col">
              <Label className="mb-2 text-center">{DAYS_OF_WEEK[day]}</Label>
              <Textarea
                value={customRowContent[day] || ''}
                onChange={(e) => setCustomRowContent({...customRowContent, [day]: e.target.value})}
                className="min-h-[100px] bg-background"
                placeholder="הזן טקסט..."
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSaveCustomRow}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomRowDialog;
