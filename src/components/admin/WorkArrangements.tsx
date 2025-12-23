import React from "react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Copy, Check, Upload, FileText } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api-client";
import { storageService } from "@/lib/storage";
import DigitalWorkArrangement from "./DigitalWorkArrangement";
import ProducerWorkArrangement from "./producers/ProducerWorkArrangement";
import { ScrollProvider } from "@/contexts/ScrollContext";

type WorkArrangementMode = "producers" | "engineers" | "digital";

interface WorkArrangementsProps {
  mode?: WorkArrangementMode;
}

const formSchema = z.object({
  week_start: z.date(),
  type: z.enum(["producers", "engineers", "digital"]),
  pdf_file: z.any().refine(files => files?.length > 0, "PDF File is required.").refine(files => files?.[0]?.size <= 2000000, `Max file size is 2MB.`).refine(files => files?.[0]?.type === "application/pdf", "Only PDF files are accepted.")
});

export default function WorkArrangements({ mode = "producers" }: WorkArrangementsProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"producers" | "engineers" | "digital">(
    mode === "engineers" ? "engineers" : mode === "digital" ? "digital" : "producers"
  );
  const [weekDate, setWeekDate] = useState<Date>(startOfWeek(new Date(), {
    weekStartsOn: 0
  }));
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const {
    toast
  } = useToast();
  const [publicLinks, setPublicLinks] = useState<{
    current: string;
    next: string;
    previous: string;
  }>({
    current: "",
    next: "",
    previous: ""
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      week_start: weekDate,
      type: fileType,
      pdf_file: null
    }
  });
  
  // Keep fileType in sync with selected mode and form state
  useEffect(() => {
    const nextType = mode === "engineers" ? "engineers" : mode === "digital" ? "digital" : "producers";
    setFileType(nextType);
    form.setValue("type", nextType);
  }, [mode]);

  useEffect(() => {
    form.setValue("type", fileType);
  }, [fileType]);
  useEffect(() => {
    generatePublicLinks(weekDate);
  }, [weekDate]);
  const generatePublicLinks = (date: Date) => {
    const currentWeekStart = startOfWeek(date, {
      weekStartsOn: 0
    });
    const nextWeekStart = addWeeks(currentWeekStart, 1);
    const prevWeekStart = subWeeks(currentWeekStart, 1);
    setPublicLinks({
      current: `/schedule/${format(currentWeekStart, 'yyyy-MM-dd')}`,
      next: `/schedule/${format(nextWeekStart, 'yyyy-MM-dd')}`,
      previous: `/schedule/${format(prevWeekStart, 'yyyy-MM-dd')}`
    });
  };
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subWeeks(weekDate, 1) : addWeeks(weekDate, 1);
    setWeekDate(newDate);
    form.setValue("week_start", newDate);
  };
  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(window.location.origin + link).then(() => {
      setCopiedLink(link);
      toast({
        title: "Success",
        description: "Link copied to clipboard"
      });
      setTimeout(() => {
        setCopiedLink(null);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
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
      console.log("Attempting to upload file using new storage system");
      
      // Upload file using the new storage service
      const uploadResult = await storageService.uploadFile(file, 'work-arrangements');
      
      console.log("File uploaded successfully:", uploadResult);
      setFileUrl(uploadResult.path);
      setFilename(uploadResult.filename);
      
      // Save to database with the new path
      const { error: dbError } = await api.mutate('/work-arrangements', {
        filename: uploadResult.originalName,
        url: uploadResult.path,
        type: fileType,
        week_start: weekStartStr
      });
      
      if (dbError) {
        console.error("Error saving file info to database:", dbError);
        toast({
          title: "Warning",
          description: `File uploaded, but failed to save information to database: ${dbError.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "File uploaded and saved successfully."
        });
      }
    } catch (error: any) {
      console.error("Error during file upload:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred during file upload.",
        variant: "destructive"
      });
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      setSelectedFile(pdfFile);
      form.setValue("pdf_file", [pdfFile]);
      toast({
        title: "File selected",
        description: `Selected: ${pdfFile.name}`
      });
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a PDF file",
        variant: "destructive"
      });
    }
  }, [form, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        form.setValue("pdf_file", [file]);
        toast({
          title: "File selected",
          description: `Selected: ${file.name}`
        });
      } else {
        toast({
          title: "Invalid file",
          description: "Please select a PDF file",
          variant: "destructive"
        });
      }
    }
  }, [form, toast]);

  const renderEngineersUpload = () => (
    <Card>
      <CardHeader>
        <CardTitle>העלאת קובץ PDF</CardTitle>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField control={form.control} name="week_start" render={({ field }) => (
                <FormItem>
                  <FormLabel>בחר שבוע</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal bg-white border">
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {format(weekDate, "dd/MM/yyyy") + " - " + format(addWeeks(weekDate, 1), "dd/MM/yyyy")}
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => navigateWeek('next')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              
              {/* Hidden type field - force engineers */}
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input type="hidden" value={"engineers"} readOnly />
                  </FormControl>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="pdf_file" render={({ field }) => (
                <FormItem>
                  <FormLabel>קובץ PDF</FormLabel>
                  <FormControl>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                        isDragOver 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-300 hover:border-gray-400",
                        selectedFile ? "border-green-500 bg-green-50" : ""
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center space-y-4">
                        {selectedFile ? (
                          <>
                            <FileText className="h-12 w-12 text-green-500" />
                            <div>
                              <p className="text-sm font-medium text-green-600">{selectedFile.name}</p>
                              <p className="text-xs text-gray-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedFile(null);
                                form.setValue("pdf_file", null);
                              }}
                            >
                              החלף קובץ
                            </Button>
                          </>
                        ) : (
                          <>
                            <Upload className="h-12 w-12 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                גרור קובץ PDF לכאן או לחץ לבחירה
                              </p>
                              <p className="text-xs text-gray-500">
                                רק קבצי PDF עד 2MB
                              </p>
                            </div>
                            <Input
                              type="file"
                              accept="application/pdf"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('file-upload')?.click()}
                            >
                              בחר קובץ
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <Button 
                type="submit" 
                disabled={!selectedFile}
                className="w-full"
              >
                העלאה
              </Button>
            </form>
          </Form>
        </CardContent>
      </CardHeader>
    </Card>
  );

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center">סידורי עבודה</h1>
      </div>
      <div className="py-6">
        {mode === "engineers" && renderEngineersUpload()}
        {mode === "producers" && (
          <div className="py-4">
            <ScrollProvider>
              <ProducerWorkArrangement />
            </ScrollProvider>
          </div>
        )}
        {mode === "digital" && (
          <div className="py-4">
            <DigitalWorkArrangement />
          </div>
        )}
      </div>
    </div>
  );
}
