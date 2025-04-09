
import React from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from 'lucide-react';

interface WorkerTableProps {
  workers: Worker[];
  loading: boolean;
  error: string | null;
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
  return (
    <Table>
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
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mb-2"></div>
                <div>טוען נתונים...</div>
              </div>
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4 text-red-500">
              {error}
            </TableCell>
          </TableRow>
        ) : workers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center">אין עובדים להצגה</TableCell>
          </TableRow>
        ) : (
          workers.map((worker) => (
            <TableRow key={worker.id}>
              <TableCell className="font-medium">{worker.name}</TableCell>
              <TableCell>{worker.department || '-'}</TableCell>
              <TableCell>{worker.position || '-'}</TableCell>
              <TableCell>{worker.email || '-'}</TableCell>
              <TableCell>{worker.phone || '-'}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(worker)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(worker.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default WorkerTable;
