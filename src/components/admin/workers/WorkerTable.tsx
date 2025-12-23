import React, { useState, useEffect, useMemo } from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, User } from 'lucide-react';
import { useWorkerDivisions, DIVISION_TRANSLATIONS } from '@/hooks/useWorkerDivisions';
import { getDivisions, getWorkerDivisions } from '@/lib/supabase/divisions';

interface Division {
  id: string;
  name: string;
  description?: string;
}

interface WorkerTableProps {
  workers: Worker[];
  loading: boolean;
  error: any;
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
}

const WorkerTable: React.FC<WorkerTableProps> = ({
  workers,
  loading,
  error,
  onEdit,
  onDelete
}) => {
  const [workerDivisions, setWorkerDivisions] = useState<Record<string, Division[]>>({});
  const [divisionsLoaded, setDivisionsLoaded] = useState(false);

  // Pre-load and cache all division translations
  const divisionTranslations = useMemo(() => {
    return DIVISION_TRANSLATIONS;
  }, []);

  // Define the translation function
  const getDivisionTranslation = (name: string) => {
    return divisionTranslations[name.toLowerCase()] || 
           divisionTranslations[name] || 
           name;
  };

  useEffect(() => {
    const loadAllWorkerDivisions = async () => {
      if (workers && workers.length > 0) {
        const divisionsMap: Record<string, Division[]> = {};
        
        // First try to load from session storage
        const cacheKey = 'all-worker-divisions';
        const cachedData = sessionStorage.getItem(cacheKey);
        let shouldFetch = true;
        
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            const cacheTime = parsed.timestamp || 0;
            if (Date.now() - cacheTime < 5 * 60 * 1000) { // 5 minutes cache
              setWorkerDivisions(parsed.divisions || {});
              setDivisionsLoaded(true);
              shouldFetch = false;
            }
          } catch (e) {
            console.error('Error parsing worker divisions cache:', e);
          }
        }
        
        if (shouldFetch) {
          for (const worker of workers) {
            try {
              const divisions = await getWorkerDivisions(worker.id);
              divisionsMap[worker.id] = divisions;
            } catch (error) {
              console.error(`Error loading divisions for worker ${worker.id}:`, error);
              divisionsMap[worker.id] = [];
            }
          }
          
          // Save to cache
          sessionStorage.setItem(cacheKey, JSON.stringify({
            divisions: divisionsMap,
            timestamp: Date.now()
          }));
          
          setWorkerDivisions(divisionsMap);
          setDivisionsLoaded(true);
        }
      }
    };

    loadAllWorkerDivisions();
  }, [workers]);

  if (loading) {
    return <div className="text-center py-4">טוען...</div>;
  }
  if (error) {
    return <div className="text-center py-4 text-red-500">
        שגיאה בטעינת הנתונים: {error.message}
      </div>;
  }
  if (!workers || workers.length === 0) {
    return <div className="text-center py-4">לא נמצאו עובדים</div>;
  }
  
  if (!Array.isArray(workers)) {
    console.error('Workers is not an array:', workers);
    return <div className="text-center py-4 text-red-500">שגיאה: נתוני העובדים אינם תקינים</div>;
  }
  
  return (
    <div className="w-full overflow-auto">
      <Table dir="rtl">
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">שם</TableHead>
            <TableHead className="text-right">מחלקה</TableHead>
            <TableHead className="text-right">תפקיד</TableHead>
            <TableHead className="text-right">אימייל</TableHead>
            <TableHead className="text-right">טלפון</TableHead>
            <TableHead className="text-right">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.map(worker => {
            const divisions = workerDivisions[worker.id] || [];
            const divisionNames = divisions.map(d => getDivisionTranslation(d.name)).join(', ');
            
            return (
              <TableRow key={worker.id}>
                <TableCell className="font-medium text-right">
                  {worker.name}
                </TableCell>
                <TableCell className="text-right">{divisionNames || worker.department || '-'}</TableCell>
                <TableCell className="text-right">{worker.position}</TableCell>
                <TableCell className="text-right">{worker.email}</TableCell>
                <TableCell className="text-right">{worker.phone}</TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-start">
                    <Button variant="outline" size="sm" onClick={() => onEdit(worker)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      עריכה
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDelete(worker.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4 mr-1" />
                      מחיקה
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default React.memo(WorkerTable);
