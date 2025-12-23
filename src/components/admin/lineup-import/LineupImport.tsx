import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SingleFileParser from './SingleFileParser';
import MultiFileParser from './MultiFileParser';

const LineupImport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>ייבוא ליינאפים מקבצי Word</CardTitle>
          <CardDescription>
            ייבא ליינאפים מקבצי Word ישנים (.doc או .docx). ניתן לייבא קובץ בודד לבדיקה או מספר קבצים לייבוא אוטומטי.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'multi')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">קובץ בודד</TabsTrigger>
              <TabsTrigger value="multi">ייבוא מרובה</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="mt-6">
              <SingleFileParser />
            </TabsContent>
            <TabsContent value="multi" className="mt-6">
              <MultiFileParser />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LineupImport;



