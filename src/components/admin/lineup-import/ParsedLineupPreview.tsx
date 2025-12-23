import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParsedLineupData, ParsedLineupItem } from './types';

interface ParsedLineupPreviewProps {
  data: ParsedLineupData;
  onDataChange: (data: ParsedLineupData) => void;
}

const ParsedLineupPreview: React.FC<ParsedLineupPreviewProps> = ({ data, onDataChange }) => {
  const handleShowNameChange = (value: string) => {
    onDataChange({ ...data, showName: value });
  };

  const handleShowDateChange = (value: string) => {
    onDataChange({ ...data, showDate: value || null });
  };

  const handleShowTimeChange = (value: string) => {
    onDataChange({ ...data, showTime: value || null });
  };

  const handleItemChange = (index: number, field: keyof ParsedLineupItem, value: string) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };
    onDataChange({ ...data, items: newItems });
  };

  const handleAddItem = () => {
    const newItems = [...data.items, { name: '', title: '', phone: '' }];
    onDataChange({ ...data, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    onDataChange({ ...data, items: newItems });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>פרטי התוכנית</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="show-name">שם התוכנית</Label>
            <Input
              id="show-name"
              value={data.showName}
              onChange={(e) => handleShowNameChange(e.target.value)}
              placeholder="שם התוכנית"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="show-date">תאריך</Label>
              <Input
                id="show-date"
                type="date"
                value={data.showDate || ''}
                onChange={(e) => handleShowDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="show-time">שעה</Label>
              <Input
                id="show-time"
                type="time"
                value={data.showTime || ''}
                onChange={(e) => handleShowTimeChange(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>פריטי הליינאפ ({data.items.length})</CardTitle>
          <button
            onClick={handleAddItem}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + הוסף פריט
          </button>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">לא נמצאו פריטים</p>
          ) : (
            <div className="overflow-x-auto">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">תפקיד/תואר</TableHead>
                    <TableHead className="text-right">טלפון</TableHead>
                    <TableHead className="text-right w-20">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="שם המרואיין"
                          className="min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.title}
                          onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                          placeholder="תפקיד/תואר"
                          className="min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.phone}
                          onChange={(e) => handleItemChange(index, 'phone', e.target.value)}
                          placeholder="טלפון"
                          className="min-w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          מחק
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data.warnings && data.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">אזהרות</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
              {data.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParsedLineupPreview;



