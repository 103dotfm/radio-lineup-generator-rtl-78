import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from "@/hooks/use-toast";

export const useUserDeleteMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.mutate(`/auth/users/${userId}`, {}, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "המשתמש נמחק בהצלחה" });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה",
        description: "שגיאה במחיקת המשתמש: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserByEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      await api.mutate(`/auth/users/email/${email}`, {}, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "המשתמש נמחק בהצלחה" });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה",
        description: "שגיאה במחיקת המשתמש: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    deleteUserMutation,
    deleteUserByEmailMutation
  };
};
