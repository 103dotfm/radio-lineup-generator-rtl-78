
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { searchGuests } from '@/lib/supabase/guests';
import { toast } from "sonner";
import { formatPhoneNumber } from './PhoneInput';
import { Loader2 } from 'lucide-react';

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
        console.error('Error searching guests:', error);
        toast.error('שגיאה בחיפוש אורחים');
        setSuggestions([]);
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
      <div className="relative">
        <Input
          placeholder="חפש מרואיין קיים..."
          onChange={handleNameChange}
          value={inputValue}
          autoComplete="off"
          className="w-full text-right pr-8 text-sm"
          size={1}
        />
        {isSearching && (
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
          </div>
        )}
      </div>
      
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-32 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="font-medium text-gray-900 text-sm">{suggestion.name}</div>
              {suggestion.title && (
                <div className="text-xs text-gray-600">{suggestion.title}</div>
              )}
              {suggestion.phone && (
                <div className="text-xs text-gray-500">{suggestion.phone}</div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {inputValue.length > 0 && inputValue.length <= 2 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 p-2 text-center text-gray-500 text-xs">
          הזן לפחות 3 תווים לחיפוש
        </div>
      )}
    </div>
  );
};

export default IntervieweeSearch;
