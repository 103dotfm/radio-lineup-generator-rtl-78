
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { DigitalWorkArrangement } from '@/types/schedule';

interface ComicSketchGeneratorProps {
  initialText: string;
  initialImageUrl?: string | null;
  arrangementId?: string;
  onTextChange: (text: string) => void;
  onImageGenerated?: (imageUrl: string) => void;
}

const ComicSketchGenerator: React.FC<ComicSketchGeneratorProps> = ({
  initialText,
  initialImageUrl,
  arrangementId,
  onTextChange,
  onImageGenerated
}) => {
  const [text, setText] = useState(initialText);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [image, setImage] = useState<string | null>(initialImageUrl || null);
  const { toast } = useToast();

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useEffect(() => {
    setImage(initialImageUrl || null);
  }, [initialImageUrl]);

  // Cleanup function when component unmounts
  useEffect(() => {
    return () => {
      // Ensure all UI interactions are properly cleaned up
      document.body.style.pointerEvents = '';
    };
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTextChange(e.target.value);
  };

  const generatePrompt = () => {
    const basePrompt = "צייר קומיקס מצחיק המבוסס על הטקסט הבא: ";
    setPrompt(basePrompt + text);
    toast({
      title: "נוצר פרומפט",
      description: "עריך את הפרומפט לפני יצירת התמונה"
    });
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "לא ניתן ליצור תמונה",
        description: "נא להזין פרומפט לפני יצירת התמונה",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const imageUrl = "https://placehold.co/600x400/e2e8f0/1e293b?text=AI+Comic+Sketch";
      setImage(imageUrl);
      
      if (arrangementId && onImageGenerated) {
        try {
          const updateData = {
            comic_image_url: imageUrl
          };
          
          const { error } = await supabase
            .from('digital_work_arrangements')
            .update(updateData)
            .eq('id', arrangementId);
            
          if (error) {
            throw error;
          }
          
          onImageGenerated(imageUrl);
        } catch (error) {
          console.error("Error saving image URL:", error);
          toast({
            title: "שגיאה בשמירת הקישור",
            description: "אירעה שגיאה בשמירת קישור התמונה",
            variant: "destructive"
          });
        }
      }
      
      toast({
        title: "נוצרה תמונה",
        description: "האיור נוצר בהצלחה",
      });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "שגיאה ביצירת התמונה",
        description: "אירעה שגיאה ביצירת התמונה. נסה שנית.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!image) return;
    
    const link = document.createElement('a');
    link.href = image;
    link.download = 'comic-sketch.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 comic-sketch-generator">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4 comic-sketch-text-panel">
          <Textarea 
            value={text} 
            onChange={handleTextChange} 
            placeholder="הזן טקסט לסידור עבודה..." 
            className="min-h-[200px] text-right comic-sketch-textarea"
            dir="rtl"
          />
          
          <div className="flex flex-col space-y-2 comic-sketch-controls">
            <Button 
              onClick={generatePrompt} 
              variant="outline" 
              type="button"
              className="comic-sketch-prompt-btn"
            >
              <Wand2 className="ml-2 h-4 w-4" />
              יצירת פרומפט אוטומטי
            </Button>
            
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="פרומפט ליצירת קומיקס..."
              className="text-right comic-sketch-prompt-input"
              dir="rtl"
            />
            
            <Button 
              onClick={generateImage} 
              disabled={isGenerating || !prompt.trim()}
              className={`comic-sketch-generate-btn ${isGenerating ? "opacity-80" : ""}`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                  יוצר איור...
                </>
              ) : (
                <>
                  <Wand2 className="ml-2 h-4 w-4" />
                  יצירת איור קומיקס
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Card className="flex flex-col items-center justify-center p-4 min-h-[200px] comic-sketch-preview-card">
          <CardContent className="p-0 w-full comic-sketch-preview-content">
            {image ? (
              <div className="space-y-2 comic-sketch-image-container">
                <div className="relative aspect-auto w-full h-auto">
                  <img 
                    src={image} 
                    alt="Comic sketch" 
                    className="w-full h-auto rounded-md comic-sketch-preview"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={downloadImage} 
                  className="w-full comic-sketch-download-btn"
                >
                  <Download className="ml-2 h-4 w-4" />
                  שמור תמונה
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] comic-sketch-empty">
                <p className="text-gray-500">תצוגה מקדימה תופיע כאן</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComicSketchGenerator;
