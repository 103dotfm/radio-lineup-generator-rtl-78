
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";

export const useUserDeleteMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      try {
        // First check if this user is linked to a worker
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!workerError && workerData) {
          // If this user is linked to a worker, just remove the link instead of deleting the user
          const { error: updateError } = await supabase
            .from('workers')
            .update({ 
              user_id: null,
              password_readable: null
            })
            .eq('user_id', userId);
            
          if (updateError) {
            throw updateError;
          }
        }
        
        // Delete from users table
        const { error: profileError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
        
        if (profileError) {
          throw profileError;
        }

        // For regular users, we don't call auth.admin.deleteUser due to permissions issues
        // The user will remain in the auth system but will be removed from the users table
      } catch (error) {
        throw error;
      }
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
      try {
        // First find the user in the users table
        const { data: userData, error: userFindError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (userFindError) {
          throw userFindError;
        }
        
        if (!userData) {
          // If we couldn't find in users table, try to get from auth users
          // This is for handling users that might exist in auth but not in users table
          try {
            // Try to find the user in auth.users (this might fail due to permissions)
            const { data: authUserList, error: authError } = await supabase.auth.admin.listUsers();
            
            if (!authError && authUserList && authUserList.users) {
              // Define a type for the auth user to avoid TypeScript errors
              type AuthUser = {
                id: string;
                email?: string;
                [key: string]: any;
              };
              
              // Find the user with the matching email in the returned list
              // Cast to the AuthUser type to work with the properties safely
              const authUser = authUserList.users.find(user => {
                const typedUser = user as AuthUser;
                return typedUser && typedUser.email === email;
              }) as AuthUser | undefined;
              
              if (authUser) {
                const userId = authUser.id;
                
                // Try to delete the auth user (might fail due to permissions)
                try {
                  await supabase.auth.admin.deleteUser(userId);
                  return { message: "User deleted from auth system" };
                } catch (authDeleteError) {
                  throw new Error("Could not delete auth user: " + (authDeleteError as Error).message);
                }
              } else {
                throw new Error("User not found in auth system");
              }
            } else {
              throw new Error("Error accessing auth users");
            }
          } catch (error) {
            throw new Error("User not found in the system");
          }
        }
        
        // If user was found in users table, delete using the existing function
        return await deleteUserMutation.mutateAsync(userData.id);
      } catch (error) {
        throw error;
      }
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
