
import React from "react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase, getStorageUrl } from "@/lib/supabase";
import DigitalWorkArrangement from "./DigitalWorkArrangement";

const formSchema = z.object({
  week_start: z.date(),
  type: z.enum(["producers", "engineers", "digital"]),
  pdf_file: z
    .any()
    .refine((files) => files?.length > 0, "PDF File is required.")
    .refine(
      (files) => files?.[0]?.size <= 2000000,
      `Max file size is 2MB.`
    )
    .refine(
      (files) => files?.[0]?.type === "application/pdf",
      "Only PDF files are accepted."
    ),
});

export default function WorkArrangements() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"producers" | "engineers" | "digital">("producers");
  const [weekDate, setWeekDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const { toast } = useToast();
  const [publicLinks, setPublicLinks] = useState<{
    current: string;
    next: string;
    previous: string;
  }>({
    current: "",
    next: "",
    previous: "",
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      week_start: weekDate,
      type: fileType,
      pdf_file: null,
    },
  });

  useEffect(() => {
    generatePublicLinks(weekDate);
  }, [weekDate]);

  const generatePublicLinks = (date: Date) => {
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 });
    const nextWeekStart = addWeeks(currentWeekStart, 1);
    const prevWeekStart = subWeeks(currentWeekStart, 1);

    setPublicLinks({
      current: `/schedule/${format(currentWeekStart, 'yyyy-MM-dd')}`,
      next: `/schedule/${format(nextWeekStart, 'yyyy-MM-dd')}`,
      previous: `/schedule/${format(prevWeekStart, 'yyyy-MM-dd')}`,
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subWeeks(weekDate, 1) 
      : addWeeks(weekDate, 1);
    
    setWeekDate(newDate);
    form.setValue("week_start", newDate);
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(window.location.origin + link)
      .then(() => {
        setCopiedLink(link);
        toast({
          title: "Success",
          description: "Link copied to clipboard",
        });
        
        setTimeout(() => {
          setCopiedLink(null);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      });
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const file = values.pdf_file[0];
    handleFileUpload(file);
  }

  const handleFileUpload = async (file: File) => {
    try {
      const weekStartStr = format(weekDate, 'yyyy-MM-dd');
      // Use a simple filename with no subdirectories - just like your manual test
      const fileName = `${fileType}_${weekStartStr}.pdf`;
      
      console.log("Attempting to upload file to:", fileName);
      
      // First upload the file to the root of the bucket
      const { data, error: uploadError } = await supabase.storage
        .from('lovable')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        toast({
          title: "Error",
          description: `Failed to upload file: ${uploadError.message}`,
          variant: "destructive",
        });
        return;
      }
      
      // Construct the direct URL to the file - exactly as in your manual example
      const storageUrl = getStorageUrl();
      const fileUrl = `${storageUrl}/${fileName}`;
      
      console.log("File uploaded successfully, URL:", fileUrl);
      
      // Now insert the database record with the full direct URL
      const { error: dbError } = await supabase
        .from('work_arrangements')
        .insert({
          filename: fileName,
          url: fileUrl,  // Store the full URL, not just the path
          type: fileType,
          week_start: weekStartStr,
        });
        
      if (dbError) {
        console.error("Error saving to database:", dbError);
        toast({
          title: "Error",
          description: `Failed to save file information: ${dbError.message}`,
          variant: "destructive",
        });
        return;
      }
      
      setFileUrl(fileUrl);
      setFilename(fileName);
      
      toast({
        title: "Success",
        description: "File uploaded and saved successfully.",
      });
      
    } catch (error: any) {
      console.error("Error during file upload:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred during file upload.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center">סידורי עבודה</h1>
      </div>

      <div className="py-6">
        <Tabs defaultValue="file-upload">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="file-upload">העלאת קובץ PDF</TabsTrigger>
            <TabsTrigger value="digital-editor">עורך סידור דיגיטל</TabsTrigger>
          </TabsList>
          <TabsContent value="file-upload" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Work Arrangement PDF</CardTitle>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      <FormField
                        control={form.control}
                        name="week_start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Week</FormLabel>
                            <div className="flex items-center gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                onClick={() => navigateWeek('prev')}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={"outline"}
                                className="w-[240px] justify-start text-left font-normal bg-white border"
                              >
                                <CalendarIcon className="ml-2 h-4 w-4" />
                                {format(weekDate, "dd/MM/yyyy") + " - " + format(addWeeks(weekDate, 1), "dd/MM/yyyy")}
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                onClick={() => navigateWeek('next')}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                setFileType(value as "producers" | "engineers" | "digital");
                              }} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="producers">עורכים ומפיקים</SelectItem>
                                <SelectItem value="engineers">טכנאים</SelectItem>
                                <SelectItem value="digital">דיגיטל (��א בשימוש)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pdf_file"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PDF File</FormLabel>
                            <FormControl>
                              <Input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files) {
                                    field.onChange(files);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit">העלאה</Button>
                    </form>
                  </Form>
                </CardContent>
              </CardHeader>
              
              <CardFooter className="flex flex-col items-start">
                <CardTitle className="mb-3 text-lg">קישורים לעמודי לוח שידורים</CardTitle>
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <span>השבוע הקודם:</span>
                    <div className="flex items-center">
                      <a 
                        href={publicLinks.previous} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline mr-2"
                      >
                        {publicLinks.previous}
                      </a>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(publicLinks.previous)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedLink === publicLinks.previous ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>השבוע הנוכחי:</span>
                    <div className="flex items-center">
                      <a 
                        href={publicLinks.current} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline mr-2"
                      >
                        {publicLinks.current}
                      </a>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(publicLinks.current)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedLink === publicLinks.current ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>השבוע הבא:</span>
                    <div className="flex items-center">
                      <a 
                        href={publicLinks.next} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline mr-2"
                      >
                        {publicLinks.next}
                      </a>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(publicLinks.next)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedLink === publicLinks.next ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="digital-editor" className="py-4">
            <DigitalWorkArrangement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
