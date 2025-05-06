
import React, { useState } from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Trash2, UserCog, Users } from 'lucide-react';
import WorkerDetailDialog from './WorkerDetailDialog';
import { Badge } from '@/components/ui/badge';

interface WorkerTableProps {
  workers: Worker[];
  loading: boolean;
  error: string | null;
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
  onSelect
}) => {
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleOpenDetails = (worker: Worker) => {
    setSelectedWorker(worker);
    setDetailsOpen(true);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">שם</TableHead>
            <TableHead className="text-right">מחלקה</TableHead>
            <TableHead className="text-right">תפקיד</TableHead>
            <TableHead className="text-right">אימייל</TableHead>
            <TableHead className="text-right">טלפון</TableHead>
            <TableHead className="text-right">משתמש</TableHead>
            <TableHead className="text-right">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mb-2"></div>
                  <div>טוען נתונים...</div>
                </div>
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4 text-red-500">
                {error}
              </TableCell>
            </TableRow>
          ) : workers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">אין עובדים להצגה</TableCell>
            </TableRow>
          ) : (
            workers.map((worker) => (
              <TableRow key={worker.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onSelect(worker)}>
                <TableCell>
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={worker.photo_url} />
                      <AvatarFallback>
                        {worker.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{worker.name}</span>
                  </div>
                </TableCell>
                <TableCell>{worker.department || '-'}</TableCell>
                <TableCell>{worker.position || '-'}</TableCell>
                <TableCell>{worker.email || '-'}</TableCell>
                <TableCell>{worker.phone || '-'}</TableCell>
                <TableCell>
                  {worker.user_id ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                      <UserCog className="mr-1 h-3 w-3" />
                      יש משתמש
                    </Badge>
                  ) : (
                    <Badge variant="outline">אין משתמש</Badge>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetails(worker);
                    }}>
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      onEdit(worker);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      onDelete(worker.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <WorkerDetailDialog
        worker={selectedWorker}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
};

export default WorkerTable;
