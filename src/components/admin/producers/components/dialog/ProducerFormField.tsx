
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ProducerFormItem } from "../../hooks/useProducerForms";

interface ProducerFormFieldProps {
  index: number;
  producerForm: ProducerFormItem;
  updateProducerForm: (index: number, field: 'workerId' | 'role' | 'additionalText', value: string) => void;
  producers: any[];
  roles: any[];
  defaultRole?: string;
}

const ProducerFormField = ({
  index,
  producerForm,
  updateProducerForm,
  producers,
  roles,
  defaultRole
}: ProducerFormFieldProps) => {
  return (
    <div className="space-y-2 p-2 rounded border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <FormLabel htmlFor={`worker-${index}`}>מפיק</FormLabel>
          <Select
            value={producerForm.workerId || ""}
            onValueChange={(value) => updateProducerForm(index, 'workerId', value)}
          >
            <SelectTrigger id={`worker-${index}`}>
              <SelectValue placeholder="בחר מפיק" />
            </SelectTrigger>
            <SelectContent>
              {producers.map((producer) => (
                <SelectItem key={producer.id} value={producer.id}>
                  {producer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <FormLabel htmlFor={`role-${index}`}>תפקיד</FormLabel>
          <Select
            value={producerForm.role || defaultRole || ""}
            onValueChange={(value) => updateProducerForm(index, 'role', value)}
          >
            <SelectTrigger id={`role-${index}`}>
              <SelectValue placeholder={index === 0 ? "עריכה" : (index === 1 ? "הפקה" : "בחר תפקיד")} />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <FormLabel htmlFor={`notes-${index}`}>הערות (אופציונלי)</FormLabel>
        <Input
          id={`notes-${index}`}
          value={producerForm.additionalText || ""}
          onChange={(e) => updateProducerForm(index, 'additionalText', e.target.value)}
          placeholder="הערות נוספות"
        />
      </div>
    </div>
  );
};

export default ProducerFormField;
