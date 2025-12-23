
import React, { useEffect, useState, useMemo } from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Key, UserCheck, AlertCircle, Info } from 'lucide-react';
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
  onCreateUserAccount?: (email: string) => Promise<void>;
  onResetPassword?: () => Promise<void>;
  isCreatingUser?: boolean;
  isResettingPassword?: boolean;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ 
  formData, 
  onChange,
  onDivisionsChange,
  selectedDivisions = [],
  onCreateUserAccount,
  onResetPassword,
  isCreatingUser = false,
  isResettingPassword = false
}) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(formData.email || '');

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

  const handleCreateUserAccount = async () => {
    if (onCreateUserAccount && userEmail) {
      await onCreateUserAccount(userEmail);
    }
  };

  const handleResetPassword = async () => {
    if (onResetPassword) {
      await onResetPassword();
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

      {/* User Account Management Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">חשבון משתמש</CardTitle>
        </CardHeader>
        <CardContent>
          {!formData.user_id ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="user_email" className="text-right">אימייל למשתמש</Label>
                <Input
                  id="user_email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="הזן כתובת אימייל עבור המשתמש"
                />
              </div>
              
              <Button 
                onClick={handleCreateUserAccount}
                disabled={isCreatingUser || !userEmail}
                className="w-full"
              >
                {isCreatingUser ? (
                  <>
                    <UserPlus className="mr-2 h-4 w-4 animate-spin" />
                    יוצר חשבון...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    יצירת חשבון משתמש
                  </>
                )}
              </Button>
              
              <p className="text-sm text-gray-500 text-center">
                יצירת חשבון תשלח לכתובת האימייל הזו סיסמה זמנית.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertDescription>
                  לעובד זה יש חשבון משתמש פעיל במערכת.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleResetPassword}
                disabled={isResettingPassword}
                variant="outline"
                className="w-full"
              >
                {isResettingPassword ? (
                  <>
                    <Key className="mr-2 h-4 w-4 animate-spin" />
                    מאפס סיסמה...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    איפוס סיסמה
                  </>
                )}
              </Button>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  הסיסמה הזמנית תוצג רק פעם אחת בעת יצירת החשבון או איפוס הסיסמה.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(WorkerForm);
