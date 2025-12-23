import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { translateShowText } from "@/lib/api/rds";
import { Languages, Send, Check, AlertTriangle } from "lucide-react";

interface RDSFieldsProps {
  show_name: string;
  host_name: string;
  rds_pty: number;
  rds_ms: number;
  rds_radio_text: string;
  rds_radio_text_translated: string;
  onRDSChange: (field: string, value: any) => void;
  onSendRDS?: () => void;
  showSendButton?: boolean;
}

const PTY_OPTIONS = [
  { value: 1, label: "NEWS" },
  { value: 4, label: "SPORTS" },
  { value: 21, label: "PHONE-IN" },
  { value: 26, label: "NATIONAL MUSIC" },
  { value: 17, label: "FINANCE" },
  { value: 0, label: "NONE" },
];

const MS_OPTIONS = [
  { value: 0, label: "SPEECH ONLY" },
  { value: 1, label: "MUSIC PROGRAMMING" },
];

const RDSFields: React.FC<RDSFieldsProps> = ({
  show_name,
  host_name,
  rds_pty,
  rds_ms,
  rds_radio_text,
  rds_radio_text_translated,
  onRDSChange,
  onSendRDS,
  showSendButton = false,
}) => {
  const [translating, setTranslating] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<'none' | 'success' | 'warning'>('none');
  const { toast } = useToast();

  const handleTranslate = async () => {
    if (!show_name) {
      toast({
        title: "שגיאה",
        description: "שם התוכנית נדרש לתרגום",
        variant: "destructive",
      });
      return;
    }

    try {
      setTranslating(true);
      const result = await translateShowText(show_name, host_name || '');
      
      // Directly populate the Radio Text field with translated text
      onRDSChange('rds_radio_text', result.translated_text);
      
      // Set translation status based on result
      if (result.all_strings_found) {
        setTranslationStatus('success');
        toast({
          title: "הצלחה",
          description: "כל המחרוזות תורגמו בהצלחה",
        });
      } else {
        setTranslationStatus('warning');
        toast({
          title: "אזהרה",
          description: "חלק מהמחרוזות לא תורגמו - נדרש עריכה ידנית",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error translating text:', error);
      setTranslationStatus('warning');
      toast({
        title: "שגיאה",
        description: "שגיאה בתרגום הטקסט",
        variant: "destructive",
      });
    } finally {
      setTranslating(false);
    }
  };

  const handleRadioTextChange = (value: string) => {
    const limitedValue = value.substring(0, 64);
    onRDSChange('rds_radio_text', limitedValue);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Send className="h-5 w-5" />
        הגדרות RDS
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        הגדרות Radio Data System לשידור
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rds-pty">PTY - סוג התוכנית</Label>
          <Select
            value={rds_pty.toString()}
            onValueChange={(value) => onRDSChange('rds_pty', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג תוכנית" />
            </SelectTrigger>
            <SelectContent>
              {PTY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rds-ms">MS - מוזיקה/דיבור</Label>
          <Select
            value={rds_ms.toString()}
            onValueChange={(value) => onRDSChange('rds_ms', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג תוכן" />
            </SelectTrigger>
            <SelectContent>
              {MS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rds-radio-text">Radio Text - טקסט רדיו</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Textarea
            id="rds-radio-text"
            value={rds_radio_text}
            onChange={(e) => handleRadioTextChange(e.target.value)}
            placeholder="Radio text (up to 64 characters)"
            maxLength={64}
            rows={2}
            dir="ltr"
            className="flex-1 resize-none"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleTranslate}
            disabled={translating || !show_name}
            className="flex-shrink-0 w-full sm:w-auto"
          >
            <Languages className="h-4 w-4 mr-2" />
            {translating ? 'מייצר...' : 'Generate'}
          </Button>
          {translationStatus === 'success' && (
            <Check className="h-5 w-5 text-green-500" />
          )}
          {translationStatus === 'warning' && (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {rds_radio_text.length}/64 תווים
        </p>
      </div>

      {showSendButton && onSendRDS && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            type="button"
            onClick={onSendRDS}
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Send className="h-4 w-4" />
            שלח ל-RDS עכשיו
          </Button>
        </div>
      )}
    </div>
  );
};

export default RDSFields;
