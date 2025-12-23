import { api } from './api-client';

// Create a Supabase-like query builder
class QueryBuilder {
  private table: string;
  private selectFields: string = '*';
  private conditions: Record<string, any> = {};
  private orderByField?: string;
  private orderDirection?: 'asc' | 'desc';
  private limitCount?: number;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string) {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any) {
    this.conditions[field] = { eq: value };
    return this;
  }

  lte(field: string, value: any) {
    this.conditions[field] = { lte: value };
    return this;
  }

  gte(field: string, value: any) {
    this.conditions[field] = { gte: value };
    return this;
  }

  order(field: string, { ascending = true } = {}) {
    this.orderByField = field;
    this.orderDirection = ascending ? 'asc' : 'desc';
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async single() {
    try {
      const response = await api.query(this.table, {
        select: this.selectFields,
        where: this.conditions,
        order: this.orderByField ? { [this.orderByField]: this.orderDirection } : undefined,
        limit: this.limitCount,
        single: true
      });

      // Ensure we return null if no data
      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        return { data: null, error: null };
      }

      // If we got an array, take the first item
      if (Array.isArray(response.data)) {
        return { data: response.data[0], error: null };
      }

      return { data: response.data, error: null };
    } catch (error) {
      console.error(`Error in single() for ${this.table}:`, error);
      return { data: null, error };
    }
  }

  async get() {
    try {
      const response = await api.query(this.table, {
        select: this.selectFields,
        where: this.conditions,
        order: this.orderByField ? { [this.orderByField]: this.orderDirection } : undefined,
        limit: this.limitCount
      });

      // Always ensure we return an array
      if (!response.data) {
        return { data: [], error: null };
      }

      // If we got a single object, wrap it in an array
      if (!Array.isArray(response.data)) {
        return { data: [response.data], error: null };
      }

      return { data: response.data, error: null };
    } catch (error) {
      console.error(`Error in get() for ${this.table}:`, error);
      return { data: [], error };
    }
  }
}

// Create a mock Supabase client
export const supabase = {
  from: (table: string) => new QueryBuilder(table),
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        try {
          const response = await api.storage.upload(bucket, file);
          return { data: response, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      getPublicUrl: async (path: string) => {
        try {
          const url = await api.storage.getUrl(bucket, path);
          return { data: { publicUrl: url }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      remove: async (paths: string[]) => {
        try {
          const results = await Promise.all(
            paths.map(path => api.storage.delete(bucket, path))
          );
          return { data: results, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      download: async (path: string) => {
        try {
          const url = await api.storage.getUrl(bucket, path);
          const response = await fetch(url);
          if (!response.ok) throw new Error('File not found');
          const blob = await response.blob();
          return { data: blob, error: null };
        } catch (error) {
          return { data: null, error };
        }
      }
    })
  },
  rpc: (func: string, params: any) => {
    return api.mutate(`/rpc/${func}`, params);
  }
};

// Get the storage URL from environment variables or configuration
export const getStorageUrl = () => {
  // Using the storage URL from environment variables if available
  // Otherwise, fallback to the new storage system
  const storageUrl = import.meta.env.VITE_STORAGE_URL || 
                     import.meta.env.VITE_SUPABASE_URL ? 
                     `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/lovable` : 
                     'http://localhost:5174/storage';
                     
  return storageUrl;
};

// Check if a file exists in the specified path
export const checkFileExists = async (path: string) => {
  try {
    // If using custom storage implementation
    if (import.meta.env.VITE_STORAGE_URL) {
      const response = await fetch(`${import.meta.env.VITE_STORAGE_URL}/check/${path}`);
      return response.ok;
    }
    
    // Default Supabase implementation
    const { data, error } = await supabase
      .storage
      .from('lovable')
      .download(path);
    
    if (error) {
      console.log("File doesn't exist:", path);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking file existence:", error);
    return false;
  }
};

// Helper to get WhatsApp number formatting
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  // Remove any non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Ensure the number starts with a plus if it doesn't already
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

