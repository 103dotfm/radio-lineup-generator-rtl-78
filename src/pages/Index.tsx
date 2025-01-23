import React, { useState } from 'react';
import LineupForm from '../components/LineupForm';
import LineupItem from '../components/LineupItem';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Share2, Search } from "lucide-react";
import { toast } from "sonner";

interface LineupItemType {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
}

const Index = () => {
  const [items, setItems] = useState<LineupItemType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = (newItem: Omit<LineupItemType, 'id'>) => {
    const item = {
      ...newItem,
      id: Date.now().toString(),
    };
    setItems([...items, item]);
    toast.success('פריט נוסף בהצלחה');
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('פריט נמחק בהצלחה');
  };

  const handleDurationChange = (id: string, duration: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, duration } : item
    ));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'ליינאפ רדיו',
        text: items.map(item => 
          `${item.name} - ${item.title} (${item.duration} דקות)`
        ).join('\n')
      });
    } catch (error) {
      toast.error('לא ניתן לשתף כרגע');
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-right">ליינאפ רדיו</h1>
      
      <div className="mb-8">
        <LineupForm onAdd={handleAdd} />
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="ml-2 h-4 w-4" />
            הדפסה
          </Button>
          <Button onClick={handleShare} variant="outline">
            <Share2 className="ml-2 h-4 w-4" />
            שיתוף
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="חיפוש..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredItems.map((item) => (
          <LineupItem
            key={item.id}
            {...item}
            onDelete={handleDelete}
            onDurationChange={handleDurationChange}
          />
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-4 text-right text-sm text-gray-600">
          סה"כ זמן: {totalDuration} דקות
        </div>
      )}
    </div>
  );
};

export default Index;