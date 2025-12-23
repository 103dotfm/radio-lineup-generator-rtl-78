
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { searchGuests } from '@/lib/supabase/guests';
import { cn } from "@/lib/utils";

interface GuestSearchProps {
  onGuestSelect: (guest: { name: string; title: string; phone: string }) => void;
  onNameChange: (name: string) => void;
  value?: string;
  clearValue?: () => void;
  className?: string;
}

const GuestSearch = ({ onGuestSelect, onNameChange, value = '', clearValue, className }: GuestSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ name: string; title: string; phone: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isTyping) return;

    const fetchResults = async () => {
      if (value && value.trim()) {
        try {
          const results = await searchGuests(value);
          setSearchResults(results || []);
          setOpen(results && results.length > 0);
        } catch (error) {
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
        className={cn("w-full", className)}
        onFocus={() => setIsTyping(true)}
      />
      {open && searchResults.length > 0 && (
        <div className="absolute w-full z-50 mt-1 bg-white rounded-md shadow-lg overflow-hidden">
          <div className="p-2">
            {searchResults.map((guest) => (
              <div
                key={guest.name}
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
