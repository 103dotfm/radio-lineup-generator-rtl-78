
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Show } from "@/types/show";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResultsTableProps {
  shows: Show[];
  isLoading?: boolean;
}

const SearchResultsTable = ({ shows, isLoading = false }: SearchResultsTableProps) => {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right font-bold">מרואיינ/ת</TableHead>
              <TableHead className="text-right font-bold">כותרת</TableHead>
              <TableHead className="text-right font-bold">טלפון</TableHead>
              <TableHead className="text-right font-bold">שם תוכנית</TableHead>
              <TableHead className="text-right font-bold">תאריך</TableHead>
              <TableHead className="text-right font-bold">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-8 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  return (
    <div className="mb-8">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right font-bold">מרואיינ/ת</TableHead>
            <TableHead className="text-right font-bold">כותרת</TableHead>
            <TableHead className="text-right font-bold">טלפון</TableHead>
            <TableHead className="text-right font-bold">שם תוכנית</TableHead>
            <TableHead className="text-right font-bold">תאריך</TableHead>
            <TableHead className="text-right font-bold">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shows.flatMap(show => 
            show.items?.filter(item => !item.is_break && !item.is_note).map((item, index) => (
              <TableRow key={`${show.id}-${index}`}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.phone}</TableCell>
                <TableCell>{show.name}</TableCell>
                <TableCell>
                  {show.date ? format(new Date(show.date), 'dd/MM/yyyy') : 'ללא תאריך'}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/show/${show.id}`)}>
                    צפייה בליינאפ
                  </Button>
                </TableCell>
              </TableRow>
            )) || []
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default SearchResultsTable;
