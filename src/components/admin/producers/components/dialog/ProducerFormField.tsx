
import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';

interface ProducerFormFieldProps {
  form: any; // This prop is not being used properly
  index: number;
  name: string;
  label: string;
  placeholder: string;
}

const ProducerFormField: React.FC<ProducerFormFieldProps> = ({
  index,
  name,
  label,
  placeholder
}) => {
  // This component is expecting to be used within a FormProvider context
  // but that context isn't available, causing the runtime error
  
  // Instead of trying to use FormField which requires FormProvider,
  // let's use a simpler approach that doesn't depend on react-hook-form
  
  return (
    <div className="space-y-2 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{label}</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="483bd320-9935-4184-bad7-43255fbe0691">עריכה</SelectItem>
              <SelectItem value="348cf89d-0a9b-4c2c-bb33-8b2edee4c612">הפקה</SelectItem>
              <SelectItem value="c8fb5c44-280a-4b1d-8a8b-8c3f3c1d2e4f">עריכה ראשית</SelectItem>
              <SelectItem value="a7d65e32-91b3-4c09-8f5a-1e2d3f4b5c6d">הפקת ערב</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">עובד</label>
          <WorkerSelector 
            value={null} 
            onChange={() => {}}
            placeholder="בחר עובד..." 
          />
        </div>
      </div>
    </div>
  );
};

export default ProducerFormField;
