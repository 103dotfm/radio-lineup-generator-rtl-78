import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { User } from '../types';

export const useGetUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.query('/auth/users');
      return data as User[];
    },
  });
};
