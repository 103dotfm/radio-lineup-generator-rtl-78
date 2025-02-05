import React from 'react';
import { Input } from "@/components/ui/input";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const formatPhoneNumber = (value: string) => {
  // Remove all non-digit characters
  let cleaned = value.replace(/\D/g, '');
  
  // Replace +972 with 0
  if (cleaned.startsWith('972')) {
    cleaned = '0' + cleaned.slice(3);
  }
  
  // Add dash after third digit if there are more than 3 digits
  if (cleaned.length > 3) {
    cleaned = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
  }
  
  return cleaned;
};

const PhoneInput = ({ value, onChange }: PhoneInputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    onChange(formattedPhone);
  };

  return (
    <Input
      placeholder="טלפון"
      type="tel"
      value={value}
      onChange={handleChange}
      required
      autoComplete="off"
      name="guest-phone"
      className="lineup-form-input-phone"
    />
  );
};

export default PhoneInput;