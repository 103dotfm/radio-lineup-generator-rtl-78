
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '../types';

export const useGetUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Get users from the users table
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
            // Check for any worker users that might not be in our users table yet
            let workerUserIds = workers.map(worker => worker.user_id).filter(Boolean);
            let existingUserIds = data.map(user => user.id);
            
            // Find worker users missing from our data
            let missingWorkerUserIds = workerUserIds.filter(id => 
              id && !existingUserIds.includes(id)
            );
            
            // If we have missing worker users, add them to our data
            if (missingWorkerUserIds.length > 0) {
              // Get the worker info for the missing users
              for (const workerId of missingWorkerUserIds) {
                const { data: workerData } = await supabase
                  .from('workers')
                  .select('*')
                  .eq('user_id', workerId)
                  .single();
                  
                if (workerData) {
                  // Create a new user entry from the worker data
                  const newUser: User = {
                    id: workerId,
                    email: workerData.email || '',
                    username: workerData.name || '',
                    full_name: workerData.name || '',
                    title: workerData.position || workerData.department || 'producer',
                    is_admin: false,
                    created_at: workerData.created_at || new Date().toISOString(),
                    avatar_url: workerData.photo_url || undefined
                  };
                
                  data.push(newUser);
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
              }
            });
          }
        } catch (error) {
          console.error("Error fetching worker data:", error);
        }
      }
      
      return data as User[];
    },
  });
};
