
import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  smtp_host: z.string().min(2, {
    message: "SMTP Host must be at least 2 characters.",
  }),
  smtp_port: z.string().min(1, {
    message: "SMTP Port must be at least 1 character.",
  }),
  smtp_user: z.string().min(2, {
    message: "SMTP User must be at least 2 characters.",
  }),
  smtp_pass: z.string().min(2, {
    message: "SMTP Password must be at least 2 characters.",
  }),
  from_email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  test_recipient: z.string().email({
    message: "Please enter a valid email address for testing.",
  }),
  email_subject: z.string().min(2, {
    message: "Email Subject must be at least 2 characters.",
  }),
  email_body: z.string().min(2, {
    message: "Email Body must be at least 2 characters.",
  }),
  enable_emails: z.boolean().default(false),
});

const EmailSettings = () => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      smtp_host: "",
      smtp_port: "",
      smtp_user: "",
      smtp_pass: "",
      from_email: "",
      test_recipient: "",
      email_subject: "",
      email_body: "",
      enable_emails: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // First, check if there's already an entry in the email_settings table
      const { data: existingSettings, error: fetchError } = await supabase
        .from('email_settings')
        .select('id')
        .limit(1);

      if (fetchError) {
        console.error("Error fetching email settings:", fetchError);
        toast({
          title: "Error",
          description: "Failed to check existing email settings.",
          variant: "destructive",
        });
        return;
      }

      // Prepare the settings record
      const emailSettings = {
        sender_email: values.from_email,
        sender_name: "Radio Lineup System",
        smtp_host: values.smtp_host,
        smtp_port: parseInt(values.smtp_port),
        smtp_user: values.smtp_user,
        smtp_password: values.smtp_pass,
        body_template: values.email_body,
        subject_template: values.email_subject
      };

      let settingsError;

      if (existingSettings && existingSettings.length > 0) {
        // Update existing record
        const { error } = await supabase
          .from('email_settings')
          .update(emailSettings)
          .eq('id', existingSettings[0].id);
        
        settingsError = error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('email_settings')
          .insert([emailSettings]);
        
        settingsError = error;
      }

      if (settingsError) {
        console.error("Error updating email settings:", settingsError);
        toast({
          title: "Error",
          description: "Failed to update email settings.",
          variant: "destructive",
        });
        return;
      }

      // Update enable_emails setting in system_settings table
      const { error: enableError } = await supabase
        .from('system_settings')
        .upsert([
          { key: 'enable_emails', value: values.enable_emails.toString() }
        ], { onConflict: 'key' });

      if (enableError) {
        console.error("Error updating enable_emails setting:", enableError);
        toast({
          title: "Error",
          description: "Failed to update email sending status.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Email settings updated successfully.",
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }

  const sendTestEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          recipient: form.getValues("test_recipient"),
        },
      });

      if (error) {
        console.error("Function invoke error:", error);
        toast({
          title: "Error",
          description: `Failed to send test email: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        console.error("Function returned error:", data.error);
        toast({
          title: "Error",
          description: `Failed to send test email: ${data.error}`,
          variant: "destructive",
        });
        return;
      }
      
      const { data: latestShow, error: showError } = await supabase
        .from('shows_backup')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (showError) {
        console.error("Error fetching latest show:", showError);
        toast({
          title: "Error",
          description: "Failed to fetch latest show details.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Test email sent!",
        description: `Test email was sent successfully to ${form.getValues("test_recipient")}.`,
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending the test email.",
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    const fetchEmailSettings = async () => {
      try {
        // Fetch email settings
        const { data: emailSettings, error: emailError } = await supabase
          .from('email_settings')
          .select('*')
          .limit(1)
          .single();

        if (emailError && emailError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error("Error fetching email settings:", emailError);
          toast({
            title: "Error",
            description: "Failed to fetch email settings.",
            variant: "destructive",
          });
          return;
        }

        if (emailSettings) {
          form.setValue("smtp_host", emailSettings.smtp_host || "");
          form.setValue("smtp_port", emailSettings.smtp_port?.toString() || "");
          form.setValue("smtp_user", emailSettings.smtp_user || "");
          form.setValue("smtp_pass", emailSettings.smtp_password || "");
          form.setValue("from_email", emailSettings.sender_email || "");
          form.setValue("email_subject", emailSettings.subject_template || "");
          form.setValue("email_body", emailSettings.body_template || "");
        }

        // Fetch enable_emails setting from system_settings table
        const { data: enableData, error: enableError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'enable_emails')
          .single();

        if (enableError && enableError.code !== 'PGRST116') {
          console.error("Error fetching enable_emails setting:", enableError);
          toast({
            title: "Error",
            description: "Failed to fetch email sending status.",
            variant: "destructive",
          });
          return;
        }

        if (enableData) {
          form.setValue("enable_emails", enableData.value === 'true');
        }

      } catch (error) {
        console.error("Unexpected error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while fetching email settings.",
          variant: "destructive",
        });
      }
    };

    fetchEmailSettings();
  }, [form, toast]);

  return (
    <div className="container py-12">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="enable_emails"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Sending Emails</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="smtp_host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Host</FormLabel>
                <FormControl>
                  <Input placeholder="smtp.example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="smtp_port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Port</FormLabel>
                <FormControl>
                  <Input placeholder="587" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="smtp_user"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP User</FormLabel>
                <FormControl>
                  <Input placeholder="user@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="smtp_pass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="from_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Email</FormLabel>
                <FormControl>
                  <Input placeholder="your-email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="test_recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test Recipient Email</FormLabel>
                <FormControl>
                  <Input placeholder="test-recipient@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email_subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Subject</FormLabel>
                <FormControl>
                  <Input placeholder="Subject of the email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email_body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Body</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Body of the email"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-between">
            <Button type="submit">Update Settings</Button>
            <Button type="button" variant="secondary" onClick={sendTestEmail}>
              Send Test Email
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EmailSettings;
