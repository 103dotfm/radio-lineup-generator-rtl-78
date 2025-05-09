
import React from 'react';
import { Worker } from '@/lib/supabase/workers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, User } from 'lucide-react';

interface WorkerTableProps {
  workers: Worker[];
  loading: boolean;
  error: any;
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
  onSelect: (worker: Worker) => void;
}

const WorkerTable: React.FC<WorkerTableProps> = ({
  workers,
  loading,
  error,
  onEdit,
  onDelete,
  onSelect,
}) => {
  if (loading) {
    return <div className="text-center py-4">טוען...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        שגיאה בטעינת הנתונים: {error.message}
      </div>
    );
  }

  if (!workers || workers.length === 0) {
    return <div className="text-center py-4">לא נמצאו עובדים</div>;
  }

  return (
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
        {workers.map((worker) => (
          <TableRow key={worker.id}>
            <TableCell className="font-medium text-right">
              <Button 
                variant="ghost" 
                className="p-0 h-auto hover:bg-transparent hover:underline text-right"
                onClick={() => onSelect(worker)}
              >
                {worker.name}
              </Button>
            </TableCell>
            <TableCell className="text-right">{worker.department}</TableCell>
            <TableCell className="text-right">{worker.position}</TableCell>
            <TableCell className="text-right">{worker.email}</TableCell>
            <TableCell className="text-right">{worker.phone}</TableCell>
            <TableCell>
              <div className="flex gap-2 justify-start">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onSelect(worker)}
                >
                  <User className="h-4 w-4 mr-1" />
                  פרטים
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit(worker)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  עריכה
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onDelete(worker.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  מחיקה
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default WorkerTable;
