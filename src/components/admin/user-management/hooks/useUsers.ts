
import { useGetUsers } from './useGetUsers';
import { useUserMutations } from './useUserMutations';
import { useUserDeleteMutations } from './useUserDeleteMutations';

export const useUsers = () => {
  const { data: users, isLoading, error } = useGetUsers();
  const { createUserMutation, updateUserMutation, resetPasswordMutation } = useUserMutations();
  const { deleteUserMutation, deleteUserByEmailMutation } = useUserDeleteMutations();

  return {
    users,
    isLoading,
    error,
    createUserMutation,
    updateUserMutation,
    resetPasswordMutation,
    deleteUserMutation,
    deleteUserByEmailMutation
  };
};
