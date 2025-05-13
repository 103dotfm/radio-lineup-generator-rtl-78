import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '../types';
import { useToast } from "@/hooks/use-toast";

export const useUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Get users from the users table (includes both regular users and worker-created users)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Enhance user data with any additional profile info if needed
      if (data && data.length > 0) {
        console.log(`Found ${data.length} users in the users table`);
        
        // Get profile information for all users
        const userIds = data.map(user => user.id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
          
        if (!profilesError && profiles) {
          // Create a map of profiles for quick lookup
          const profileMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
          
          // Merge profile data with user data
          data.forEach(user => {
            if (profileMap[user.id]) {
              user.avatar_url = profileMap[user.id].avatar_url;
              // Only use profile data when user data is missing
              if (!user.title && profileMap[user.id].title) {
                user.title = profileMap[user.id].title;
              }
            }
          });
        }
      }
      
      return data as User[];
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: Partial<User> & { password: string }) => {
      // Get the app domain for the redirect URL
      const appDomain = window.location.origin;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email!,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            full_name: userData.full_name,
            is_admin: userData.is_admin,
          },
          emailRedirectTo: `${appDomain}/login`
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned');

      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: userData.email,
            username: userData.username,
            full_name: userData.full_name,
            is_admin: userData.is_admin,
          },
        ]);

      if (profileError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "המשתמש נוצר בהצלחה" });
    },
    onError: (error: Error) => {
      console.error('Error creating user:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה ביצירת המשתמש: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const { error } = await supabase
        .from('users')
        .update({
          email: userData.email,
          username: userData.username,
          full_name: userData.full_name,
          is_admin: userData.is_admin,
        })
        .eq('id', userData.id);

      if (error) throw error;
      return userData;
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
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
          
        if (updateError) throw updateError;
      }
      
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (profileError) throw profileError;

      // For worker-linked users, we may want to keep their auth entry
      // But for regular users, delete the auth entry
      if (!workerData) {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) throw authError;
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
    users,
    isLoading,
    createUserMutation,
    updateUserMutation,
    deleteUserMutation
  };
};
