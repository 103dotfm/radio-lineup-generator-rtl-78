import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { User, NewUser } from '../types';
import { useToast } from "@/hooks/use-toast";

export const useUserMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async (userData: NewUser) => {
      const { data, error } = await api.mutate('/auth/users', userData);
      if (error) {
        // Handle specific error cases
        if (error.response?.status === 409) {
          throw new Error('משתמש עם כתובת אימייל זו כבר קיים במערכת');
        } else if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        } else {
          throw new Error('שגיאה ביצירת המשתמש');
        }
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "המשתמש נוצר בהצלחה" });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const { data } = await api.mutate(`/auth/users/${userData.id}`, userData, 'PUT');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "המשתמש עודכן בהצלחה" });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון המשתמש: " + error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.mutate(`/auth/users/${userId}/reset-password`, {}, 'POST');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ 
        title: "הסיסמה אופסה בהצלחה",
        description: `הסיסמה החדשה: ${data.password}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה",
        description: "שגיאה באיפוס הסיסמה: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createUserMutation,
    updateUserMutation,
    resetPasswordMutation
  };
};
