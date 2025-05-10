
import React, { useEffect, useState, useMemo } from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DIVISION_TRANSLATIONS } from '@/hooks/useWorkerDivisions';
import { getDivisions } from '@/lib/supabase/divisions';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Division {
  id: string;
  name: string;
  description?: string;
}

interface WorkerFormProps {
  formData: Partial<Worker>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDivisionsChange?: (divisions: string[]) => void;
  selectedDivisions?: string[];
}

const WorkerForm: React.FC<WorkerFormProps> = ({ 
  formData, 
  onChange,
  onDivisionsChange,
  selectedDivisions = []
}) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  // Define the translation function BEFORE using it in useMemo
  const getDivisionTranslation = (name: string) => {
    return DIVISION_TRANSLATIONS[name.toLowerCase()] || 
           DIVISION_TRANSLATIONS[name] || 
           name;
  };

  // Pre-calculate division translations once
  const divisionTranslations = useMemo(() => {
    const translations: Record<string, string> = {};
    divisions.forEach(division => {
      translations[division.id] = getDivisionTranslation(division.name);
    });
    return translations;
  }, [divisions]);

  useEffect(() => {
    const loadDivisions = async () => {
      try {
        setLoading(true);
        // Try to get divisions from localStorage cache first
        const cachedData = localStorage.getItem('divisions-cache');
        let divisionsData: Division[] = [];
        
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            const cacheTime = parsed.timestamp || 0;
            // Cache valid for 10 minutes
            if (Date.now() - cacheTime < 10 * 60 * 1000) {
              divisionsData = parsed.data || [];
            }
          } catch (e) {
            console.error('Error parsing divisions cache:', e);
          }
        }

        // If no valid cache, fetch from API
        if (divisionsData.length === 0) {
          divisionsData = await getDivisions();
          // Save to cache
          localStorage.setItem('divisions-cache', JSON.stringify({
            data: divisionsData,
            timestamp: Date.now()
          }));
        }
        
        setDivisions(divisionsData);
      } catch (error) {
        console.error('Error loading divisions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDivisions();
  }, []);

  const handleDivisionChange = (divisionId: string, checked: boolean) => {
    if (!onDivisionsChange) return;

    if (checked) {
      onDivisionsChange([...selectedDivisions, divisionId]);
    } else {
      onDivisionsChange(selectedDivisions.filter(id => id !== divisionId));
    }
  };

  // No need to define getDivisionTranslation again here - removed the duplicate declaration

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">שם</Label>
        <Input
          id="name"
          name="name"
          value={formData.name || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>

      <div className="grid grid-cols-4 items-start gap-4">
        <Label className="text-right pt-2">מחלקות</Label>
        <div className="col-span-3 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500">טוען מחלקות...</p>
          ) : divisions.length === 0 ? (
            <p className="text-sm text-gray-500">אין מחלקות זמינות</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {divisions.map(division => (
                <div key={division.id} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={`division-${division.id}`}
                    checked={selectedDivisions.includes(division.id)}
                    onCheckedChange={(checked) => 
                      handleDivisionChange(division.id, checked === true)
                    }
                  />
                  <Label 
                    htmlFor={`division-${division.id}`} 
                    className="mr-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {divisionTranslations[division.id] || getDivisionTranslation(division.name)}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="position" className="text-right">תפקיד</Label>
        <Input
          id="position"
          name="position"
          value={formData.position || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">אימייל</Label>
        <Input
          id="email"
          name="email"
          value={formData.email || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="phone" className="text-right">טלפון</Label>
        <Input
          id="phone"
          name="phone"
          value={formData.phone || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="photo_url" className="text-right">תמונה (URL)</Label>
        <Input
          id="photo_url"
          name="photo_url"
          value={formData.photo_url || ''}
          onChange={onChange}
          className="col-span-3"
          placeholder="https://example.com/photo.jpg"
        />
      </div>
    </div>
  );
};

export default React.memo(WorkerForm);
