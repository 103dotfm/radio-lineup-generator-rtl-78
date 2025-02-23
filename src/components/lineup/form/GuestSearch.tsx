
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
  }, [value]);

  const handleSelect = (guest: { name: string; title: string; phone: string }) => {
    onGuestSelect(guest);
    setOpen(false);
    setSearchResults([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="w-full">
          <Input
            ref={inputRef}
            placeholder="שם מרואיינ/ת"
            value={value}
            onChange={(e) => onNameChange(e.target.value)}
            required
            autoComplete="off"
            name="guest-name"
            className="w-full"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false} className="overflow-hidden rounded-md bg-popover text-popover-foreground">
          <CommandInput className="border-none focus:ring-0" value={value} readOnly />
          <CommandGroup className="overflow-hidden p-1">
            {searchResults.length === 0 && value ? (
              <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>
            ) : (
              searchResults.map((guest) => (
                <CommandItem
                  key={`${guest.created_at}-${guest.name}`}
                  value={guest.name}
                  onSelect={() => handleSelect(guest)}
                  className="flex flex-col items-start cursor-pointer"
                >
                  <div className="font-bold">{guest.name}</div>
                  <div className="text-sm text-gray-500">{guest.title}</div>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default GuestSearch;
