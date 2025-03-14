
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow, TableBody } from "@/components/ui/table";

const UserListLoading: React.FC = () => {
  return (
    <TableBody>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

export default UserListLoading;
