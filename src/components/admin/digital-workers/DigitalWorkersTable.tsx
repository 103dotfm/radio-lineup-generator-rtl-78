
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDigitalWorkers, DigitalWorker } from '@/hooks/useDigitalWorkers';

interface DigitalWorkersTableProps {
  onEdit?: (worker: DigitalWorker) => void;
  onDelete?: (workerId: string) => void;
}

const DigitalWorkersTable: React.FC<DigitalWorkersTableProps> = ({
  onEdit,
  onDelete
}) => {
  const { digitalWorkers, loading, error } = useDigitalWorkers();

  if (loading) {
    return (
      <div className="text-center py-4">טוען...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600">
        שגיאה בטעינת נתונים: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">עובדים דיגיטליים ({digitalWorkers.length})</h3>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>שם</TableHead>
            <TableHead>תפקיד</TableHead>
            <TableHead>מחלקה</TableHead>
            <TableHead>אימייל</TableHead>
            <TableHead>טלפון</TableHead>
            <TableHead>סטטוס</TableHead>
            <TableHead>פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {digitalWorkers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                לא נמצאו עובדים דיגיטליים
              </TableCell>
            </TableRow>
          ) : (
            digitalWorkers.map(worker => (
              <TableRow key={worker.id}>
                <TableCell className="font-medium">{worker.full_name}</TableCell>
                <TableCell>{worker.position || '-'}</TableCell>
                <TableCell>{worker.department || '-'}</TableCell>
                <TableCell>{worker.email || '-'}</TableCell>
                <TableCell>{worker.phone || '-'}</TableCell>
                <TableCell>
                  {worker.is_active ? (
                    <Badge className="bg-green-500">פעיל</Badge>
                  ) : (
                    <Badge variant="outline">לא פעיל</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {onEdit && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(worker)}
                      className="ml-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDelete(worker.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DigitalWorkersTable;
