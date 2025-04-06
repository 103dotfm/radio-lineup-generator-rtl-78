
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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks } from "date-fns";
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
import { supabase } from "@/lib/supabase";
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
  const [weekDate, setWeekDate] = useState<Date>(new Date());
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

  const startOfWeek = (date: Date, options: { weekStartsOn: number }) => {
    const result = new Date(date);
    const day = result.getDay();
    const diff = (day < options.weekStartsOn ? 7 : 0) + day - options.weekStartsOn;
    result.setDate(result.getDate() - diff);
    return result;
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const file = values.pdf_file[0];
    handleFileUpload(file);
  }

  const handleFileUpload = async (file: File) => {
    try {
      const weekStartStr = format(weekDate, 'yyyy-MM-dd');
      const filePath = `work-arrangements/${fileType}/${weekStartStr}/${file.name}`;
      const { data, error } = await supabase.storage
        .from('lovable')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Error uploading file: ", error);
        toast({
          title: "Error",
          description: "Failed to upload file.",
          variant: "destructive",
        });
        return;
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lovable/${data.path}`;
      setFileUrl(url);
      setFilename(file.name);

      await saveFileToDatabase(url, file.name, weekStartStr);

      toast({
        title: "Success",
        description: "File uploaded successfully.",
      });
    } catch (error) {
      console.error("Error during file upload: ", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during file upload.",
        variant: "destructive",
      });
    }
  };

  const saveFileToDatabase = async (url: string, filename: string, weekStart: string) => {
    try {
      const { data, error } = await supabase
        .from('work_arrangements')
        .upsert({
          filename: filename,
          url: url,
          type: fileType,
          week_start: weekStart,
        }, { onConflict: 'type, week_start' });

      if (error) {
        console.error("Error saving file info to database: ", error);
        toast({
          title: "Error",
          description: "Failed to save file information to the database.",
          variant: "destructive",
        });
      } else {
        console.log("File info saved to database: ", data);
        toast({
          title: "Success",
          description: "File information saved to the database.",
        });
      }
    } catch (error) {
      console.error("Error saving file info to database: ", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving file information.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center">Admin: Work Arrangements</h1>
        <p className="text-muted-foreground text-center">Manage work schedules and upload related files.</p>
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
                            <DatePicker
                              onSelect={(date) => {
                                form.setValue("week_start", date!)
                                setWeekDate(date!)
                              }}
                              date={form.getValues("week_start")}
                            />
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
                                <SelectItem value="producers">Producers</SelectItem>
                                <SelectItem value="engineers">Engineers</SelectItem>
                                <SelectItem value="digital">Digital</SelectItem>
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
                      <Button type="submit">Submit</Button>
                    </form>
                  </Form>
                </CardContent>
              </CardHeader>
              
              <CardFooter className="flex flex-col items-start">
                <CardTitle className="mb-3 text-lg">Public Schedule Links</CardTitle>
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <span>Previous Week:</span>
                    <a 
                      href={publicLinks.previous} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {publicLinks.previous}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Current Week:</span>
                    <a 
                      href={publicLinks.current} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {publicLinks.current}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Next Week:</span>
                    <a 
                      href={publicLinks.next} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {publicLinks.next}
                    </a>
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
