
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchGuests } from '@/lib/supabase/guests';

interface GuestSearchProps {
  onGuestSelect: (guest: { name: string; title: string; phone: string }) => void;
  onNameChange: (name: string) => void;
  value?: string;
  clearValue?: () => void;
}

const GuestSearch = ({ onGuestSelect, onNameChange, value = '', clearValue }: GuestSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ name: string; title: string; phone: string; created_at: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isTyping) return;

    const fetchResults = async () => {
      if (value && value.trim()) {
        try {
          console.log('Searching for guests with query:', value);
          const results = await searchGuests(value);
          console.log('Search results:', results);
          setSearchResults(results || []);
          setOpen(results && results.length > 0);
        } catch (error) {
          console.error('Error searching guests:', error);
          setSearchResults([]);
          setOpen(false);
        }
      } else {
        setSearchResults([]);
        setOpen(false);
      }
    };

    fetchResults();
  }, [value, isTyping]);

  const handleSelect = (guest: { name: string; title: string; phone: string }) => {
    onGuestSelect(guest);
    setOpen(false);
    setSearchResults([]);
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTyping(true);
    onNameChange(e.target.value);
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        placeholder="שם מרואיינ/ת"
        value={value}
        onChange={handleInputChange}
        required
        autoComplete="new-password"
        aria-autocomplete="none"
        name="off"
        className="w-full"
        onFocus={() => setIsTyping(true)}
      />
      {open && searchResults.length > 0 && (
        <div className="absolute w-full z-50 mt-1 bg-white rounded-md shadow-lg overflow-hidden">
          <div className="p-2">
            {searchResults.map((guest) => (
              <div
                key={`${guest.created_at}-${guest.name}`}
                className="flex flex-col p-2 hover:bg-gray-100 cursor-pointer rounded"
                onClick={() => handleSelect(guest)}
              >
                <div className="font-bold">{guest.name}</div>
                <div className="text-sm text-gray-500">{guest.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestSearch;
