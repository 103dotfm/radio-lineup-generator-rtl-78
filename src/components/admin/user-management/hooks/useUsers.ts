
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
      console.log("Fetching all users...");
      
      // First try to get the auth users to ensure we have all users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching auth users:", authError);
      } else {
        console.log(`Found ${authUsers?.users?.length || 0} users in auth system`);
      }
      
      // Get users from the users table (includes both regular users and worker-created users)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
      
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
          const profileMap = profiles.reduce((acc: Record<string, any>, profile: any) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
          
          // Merge profile data with user data
          data.forEach((user: any) => {
            if (profileMap[user.id]) {
              user.avatar_url = profileMap[user.id].avatar_url;
              // Only use profile data when user data is missing
              if (!user.title && profileMap[user.id].title) {
                user.title = profileMap[user.id].title;
              }
              if (!user.full_name && profileMap[user.id].full_name) {
                user.full_name = profileMap[user.id].full_name;
              }
            }
          });
        }
        
        // Check for worker accounts that also have users
        try {
          const { data: workers, error: workersError } = await supabase
            .from('workers')
            .select('id, name, position, department, user_id')
            .not('user_id', 'is', null);
          
          if (!workersError && workers && workers.length > 0) {
            console.log(`Found ${workers.length} workers with user accounts`);
            
            // Check for any worker users that might not be in our users table yet
            let workerUserIds = workers.map(worker => worker.user_id).filter(Boolean);
            let existingUserIds = data.map(user => user.id);
            
            // Find worker users missing from our data
            let missingWorkerUserIds = workerUserIds.filter(id => 
              id && !existingUserIds.includes(id)
            );
            
            // If we have missing worker users, add them to our data
            if (missingWorkerUserIds.length > 0) {
              console.log(`Found ${missingWorkerUserIds.length} worker users missing from users table`);
              
              // Get the worker info for the missing users
              for (const workerId of missingWorkerUserIds) {
                const { data: workerData } = await supabase
                  .from('workers')
                  .select('*')
                  .eq('user_id', workerId)
                  .single();
                  
                if (workerData) {
                  // Create a new user entry from the worker data
                  data.push({
                    id: workerId,
                    email: workerData.email || '',
                    username: workerData.name || '',
                    full_name: workerData.name || '',
                    title: workerData.position || workerData.department || 'producer',
                    is_admin: false,
                    created_at: workerData.created_at
                  });
                }
              }
            }
            
            // Create a map of workers with user accounts for quick lookup
            const workerUserMap = workers.reduce((acc: Record<string, any>, worker: any) => {
              if (worker.user_id) {
                acc[worker.user_id] = worker;
              }
              return acc;
            }, {});
            
            // Add additional information from worker data if available
            data.forEach((user: any) => {
              if (workerUserMap[user.id]) {
                const worker = workerUserMap[user.id];
                if (!user.title) {
                  user.title = worker.position || worker.department || 'producer';
                }
                if (!user.full_name && worker.name) {
                  user.full_name = worker.name;
                }
                
                // Mark producers for visual identification
                if (!user.title || user.title === '') {
                  user.title = 'producer';
                }
              }
            });
          }
        } catch (workerError) {
          console.error("Error fetching worker data:", workerError);
        }
      } else {
        console.log("No users found or error fetching users");
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
      try {
        console.log(`Attempting to delete user ${userId}`);
        
        // First check if this user is linked to a worker
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!workerError && workerData) {
          console.log(`This user (${userId}) is linked to worker ${workerData.id}. Handling specially...`);
          // If this user is linked to a worker, just remove the link instead of deleting the user
          const { error: updateError } = await supabase
            .from('workers')
            .update({ 
              user_id: null,
              password_readable: null
            })
            .eq('user_id', userId);
            
          if (updateError) {
            console.error("Error updating worker:", updateError);
            throw updateError;
          }
          
          console.log("Successfully unlinked worker from user");
          
          // For worker-linked users, we'll skip deleting the auth entry
          // but still delete the users table entry
        }
        
        // Delete from users table
        const { error: profileError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
        
        if (profileError) {
          console.error("Error deleting from users table:", profileError);
          throw profileError;
        }
        
        console.log("Successfully deleted user from users table");

        // For regular users, we don't call auth.admin.deleteUser due to permissions issues
        // The user will remain in the auth system but will be removed from the users table
        // This is a workaround for the 403 Forbidden error
      } catch (error) {
        console.error("Error in deleteUserMutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "המשתמש נמחק בהצלחה" });
    },
    onError: (error: Error) => {
      console.error("Delete user mutation failed:", error);
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
