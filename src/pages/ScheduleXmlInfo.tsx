
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

const ScheduleXmlInfo = () => {
  const { toast } = useToast();
  const xmlBaseEndpoint = "https://yyrmodgbnzqbmatlypuc.supabase.co/functions/v1/schedule-xml";
  
  // Function to get the current week's date in YYYY-MM-DD format
  const getCurrentWeekDate = () => {
    const now = new Date();
    // Don't adjust the date - we want today's date to get the current week
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  const xmlEndpoint = `${xmlBaseEndpoint}?date=${getCurrentWeekDate()}`;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "URL copied",
      description: "The URL has been copied to your clipboard."
    });
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Schedule XML Feed</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Public XML Feed URL</CardTitle>
          <CardDescription>
            This XML feed is refreshed every 10 minutes and provides the current weekly schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-100 rounded-md overflow-x-auto">
            <code className="text-sm break-all">{xmlEndpoint}</code>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Query Parameters</h3>
            <p className="text-sm text-gray-600 mb-2">You can specify a different week by adding a date parameter:</p>
            <div className="p-3 bg-gray-100 rounded-md overflow-x-auto">
              <code className="text-sm">{xmlBaseEndpoint}?date=YYYY-MM-DD</code>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              The date should be any day in the week you want to view. The schedule will show the full week containing that date.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => window.open(xmlEndpoint, '_blank')}
            className="mr-4"
          >
            Open XML Feed
          </Button>
          <Button 
            variant="outline"
            onClick={() => copyToClipboard(xmlEndpoint)}
          >
            Copy URL
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>XML Structure</CardTitle>
          <CardDescription>
            The XML feed provides the following information for each show in the schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">title</TableCell>
                <TableCell>The name of the show</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">host</TableCell>
                <TableCell>The name of the host(s)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">startTime</TableCell>
                <TableCell>The show's start time (24-hour format)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">endTime</TableCell>
                <TableCell>The show's end time (24-hour format)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">isPrerecorded</TableCell>
                <TableCell>Whether the show is pre-recorded (true/false)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">isCollection</TableCell>
                <TableCell>Whether the show is a collection (true/false)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleXmlInfo;
