
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useArrangement } from './ArrangementContext';

interface FooterTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footerText: string;
  setFooterText: (text: string) => void;
  onSuccess: () => void;
}

const FooterTextDialog: React.FC<FooterTextDialogProps> = ({ 
  open, 
  onOpenChange, 
  footerText, 
  setFooterText, 
  onSuccess 
}) => {
  const { arrangement } = useArrangement();
  const { toast } = useToast();

  const handleSaveFooterText = async () => {
    if (!arrangement) return;
    
    try {
      const { error } = await supabase
        .from('digital_work_arrangements')
        .update({ footer_text: footerText })
        .eq('id', arrangement.id);
      
      if (error) throw error;
      
      toast({
        title: "בוצע",
        description: "הטקסט עודכן בהצלחה"
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating footer text:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את הטקסט",
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
        className="bg-background" 
        onEscapeKeyDown={closeDialog}
        onPointerDownOutside={closeDialog}
        onInteractOutside={(e) => {
          e.preventDefault();
          closeDialog();
        }}
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>טקסט תחתון</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="הזן טקסט תחתון..."
            className="min-h-[200px] bg-background"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSaveFooterText}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FooterTextDialog;
