
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface ComicSketchGeneratorProps {
  initialText: string;
  onTextChange: (text: string) => void;
}

const ComicSketchGenerator: React.FC<ComicSketchGeneratorProps> = ({
  initialText,
  onTextChange
}) => {
  const [text, setText] = useState(initialText);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTextChange(e.target.value);
  };

  const generatePrompt = () => {
    // Generate a prompt based on the text
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
      // This is a mockup - in a real implementation, you'd call an AI image generator API
      // For now, we'll just simulate a delay and use a placeholder
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Use a placeholder image for now
      setImage("https://placehold.co/600x400/e2e8f0/1e293b?text=AI+Comic+Sketch");
      
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Textarea 
            value={text} 
            onChange={handleTextChange} 
            placeholder="הזן טקסט לסידור עבודה..." 
            className="min-h-[200px] text-right"
            dir="rtl"
          />
          
          <div className="flex flex-col space-y-2">
            <Button onClick={generatePrompt} variant="outline" type="button">
              <Wand2 className="ml-2 h-4 w-4" />
              יצירת פרומפט אוטומטי
            </Button>
            
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="פרומפט ליצירת קומיקס..."
              className="text-right"
              dir="rtl"
            />
            
            <Button 
              onClick={generateImage} 
              disabled={isGenerating || !prompt.trim()}
              className={isGenerating ? "opacity-80" : ""}
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
        
        {/* Image preview area */}
        <Card className="flex flex-col items-center justify-center p-4 min-h-[200px]">
          <CardContent className="p-0 w-full">
            {image ? (
              <div className="space-y-2">
                <div className="relative aspect-auto w-full h-auto">
                  <img 
                    src={image} 
                    alt="Comic sketch" 
                    className="w-full h-auto rounded-md"
                  />
                </div>
                <Button variant="outline" onClick={downloadImage} className="w-full">
                  <Download className="ml-2 h-4 w-4" />
                  שמור תמונה
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px]">
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
