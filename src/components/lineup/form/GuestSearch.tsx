
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchGuests } from '@/lib/supabase/guests';

interface GuestSearchProps {
  onGuestSelect: (guest: { name: string; title: string; phone: string }) => void;
  onNameChange: (name: string) => void;
}

const GuestSearch = ({ onGuestSelect, onNameChange }: GuestSearchProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      const search = async () => {
        console.log('Searching for guests with query:', value);
        const results = await searchGuests(value);
        console.log('Search results:', results);
        setSearchResults(results || []);
      };
      search();
    } else {
      setSearchResults([]);
    }
  }, [value]);

  const handleSelect = (guest: { name: string; title: string; phone: string }) => {
    onGuestSelect(guest);
    setValue(guest.name);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="w-full">
          <Input
            ref={inputRef}
            placeholder="שם מרואיינ/ת"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onNameChange(e.target.value);
            }}
            required
            autoComplete="off"
            name="guest-name"
            className="w-full"
          />
        </div>
      </PopoverTrigger>
      {searchResults.length > 0 && (
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>
            <CommandGroup>
              {searchResults.map((guest) => (
                <CommandItem
                  key={guest.created_at}
                  onSelect={() => handleSelect(guest)}
                  className="flex flex-col items-start"
                >
                  <div className="font-bold">{guest.name}</div>
                  <div className="text-sm text-gray-500">{guest.title}</div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
};

export default GuestSearch;
