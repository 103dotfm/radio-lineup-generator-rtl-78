import React, { useEffect, useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getProducerRolesOrdered } from '@/lib/supabase/producers';
import { ProducerRole } from '@/lib/supabase/producers/roles';

interface ProducerFormFieldProps {
  form: any;
  index: number;
  name: string;
  label: string;
  placeholder: string;
  isDisabled?: boolean;
}

const ProducerFormField: React.FC<ProducerFormFieldProps> = ({
  form,
  index,
  name,
  label,
  placeholder,
  isDisabled = false
}) => {
  const [roles, setRoles] = useState<ProducerRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoading(true);
      try {
        const rolesData = await getProducerRolesOrdered();
        setRoles(rolesData);
      } catch (error) {
        console.error('Error fetching producer roles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return (
    <FormField
      control={form.control}
      name={`${name}.${index}.role`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select
              disabled={isDisabled || isLoading}
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ProducerFormField;
