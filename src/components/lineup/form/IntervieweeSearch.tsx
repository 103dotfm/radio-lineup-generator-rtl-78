
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { searchGuests } from '@/lib/supabase/guests';
import { toast } from "sonner";
import { formatPhoneNumber } from './PhoneInput';

interface IntervieweeSearchProps {
  onAdd: (guest: { name: string; title: string; phone: string }) => void;
}

const IntervieweeSearch = ({ onAdd }: IntervieweeSearchProps) => {
  const [suggestions, setSuggestions] = useState<Array<{ name: string; title: string; phone: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setInputValue(newName);
    
    if (newName.length > 2) {
      setIsSearching(true);
      try {
        const guests = await searchGuests(newName);
        setSuggestions(guests.map(guest => ({
          name: guest.name,
          title: guest.title,
          phone: guest.phone || ''
        })));
      } catch (error) {
        toast.error('שגיאה בחיפוש אורחים');
      } finally {
        setIsSearching(false);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (suggestion: { name: string; title: string; phone: string }) => {
    setInputValue('');
    onAdd({
      ...suggestion,
      phone: formatPhoneNumber(suggestion.phone)
    });
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <Input
        placeholder="הוספת מרואיין נוסף"
        onChange={handleNameChange}
        value={inputValue}
        autoComplete="off"
        className="w-48"
      />
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div>{suggestion.name}</div>
              <div className="text-sm text-gray-500">{suggestion.title}</div>
            </div>
          ))}
        </div>
      )}
      {isSearching && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 p-2 text-center text-gray-500">
          מחפש...
        </div>
      )}
    </div>
  );
};

export default IntervieweeSearch;
