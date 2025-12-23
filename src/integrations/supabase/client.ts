// Supabase client removed. This file is now a placeholder to avoid import errors.
export const supabase = {};

export const getAppDomain = async (): Promise<string> => {
  return window.location.origin;
};
