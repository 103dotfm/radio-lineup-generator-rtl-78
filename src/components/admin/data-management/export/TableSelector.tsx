
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TableSelectorProps {
  selectedTables: Record<string, boolean>;
  setSelectedTables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  disabled: boolean;
}

const TableSelector: React.FC<TableSelectorProps> = ({
  selectedTables,
  setSelectedTables,
  disabled
}) => {
  return (
    <div>
      <div className="font-medium mb-3">טבלאות לייצוא</div>
      
      <div className="space-y-2">
        {Object.entries(selectedTables).map(([tableName, isSelected]) => (
          <div key={tableName} className="flex items-center space-x-2 space-x-reverse">
            <Checkbox 
              id={`export-${tableName}`} 
              checked={isSelected}
              onCheckedChange={(checked) => 
                setSelectedTables({...selectedTables, [tableName]: !!checked})
              }
              disabled={disabled}
            />
            <Label 
              htmlFor={`export-${tableName}`}
              className="cursor-pointer"
            >
              {tableName}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSelector;
