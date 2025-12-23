import axios from 'axios';

// Use environment variable for API URL, fallback to relative path
const BASE_URL = import.meta.env.VITE_API_URL || (() => {
  // Auto-detect the current host and use the appropriate API URL
  const currentHost = window.location.hostname;
  const currentPort = window.location.port;
  
  console.log('API Client - Current host:', currentHost);
  console.log('API Client - Current port:', currentPort);
  console.log('API Client - Full URL:', window.location.href);
  
  // If we're on a remote URL, use the same protocol, host and port for API
  if (currentHost === '212.179.162.102' || currentHost === 'logger.103.fm' || currentHost === 'l.103.fm') {
    const protocol = window.location.protocol;
    const apiUrl = `${protocol}//${currentHost}:${currentPort || '8080'}`;
    console.log('API Client - Using remote API URL:', apiUrl);
    return apiUrl;
  }
  
  // For local development, use the same protocol, host and port for API
  if (currentHost === '192.168.10.121' || currentHost === 'localhost' || currentHost === '127.0.0.1') {
    const protocol = window.location.protocol;
    const apiUrl = `${protocol}//${currentHost}:${currentPort || '8080'}`;
    console.log('API Client - Using local API URL:', apiUrl);
    return apiUrl;
  }
  
  // Fallback to relative path for same-origin requests
  console.log('API Client - Using relative path');
  return '';
})();

// Create axios instance
console.log('API Client - Final BASE_URL:', BASE_URL);
console.log('API Client - Final baseURL:', `${BASE_URL}/api`);

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for cookie-based auth
});

// Add request interceptor for error handling
apiClient.interceptors.request.use(
  config => {
    // Serialize query parameters
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        if (typeof value === 'object' && value !== null) {
          config.params[key] = JSON.stringify(value);
        }
      }
    }
    
    // For FormData, remove Content-Type header so browser can set it with boundary
    if (config.data instanceof FormData) {
      // Delete Content-Type to let browser set it automatically with boundary
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }
    
    // Add Authorization header if token exists (works in both dev and production)
    // Also check cookies for production cookie-based auth
    const token = localStorage.getItem('auth_token') || document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
    if (token) {
      // Ensure headers object exists and merge with existing headers
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ERR_NETWORK') {
      console.error('Network Error - Is the server running?', error);
    } else if (error.response) {
      console.error('API Response Error:', error.response.data);
      
      // Add status code to error for better handling
      error.status = error.response.status;
    } else {
      console.error('API Error:', error);
    }
    return Promise.reject(error);
  }
);

// Generic query function
export async function query(endpoint: string, params?: any) {
  try {
    const response = await apiClient.get(endpoint, { params });
    return { data: response.data, error: null };
  } catch (error) {
    console.error('API query error:', error);
    return { data: null, error };
  }
}

// Generic mutation function
export async function mutate(endpoint: string, data: any, method: 'POST' | 'PUT' | 'DELETE' = 'POST') {
  try {
    const response = await apiClient({
      method,
      url: endpoint,
      data,
    });
    return { data: response.data, error: null };
  } catch (error) {
    console.error('API mutation error:', error);
    return { data: null, error };
  }
}

// Storage functions
export async function uploadFile(bucket: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await apiClient.post(`/storage/upload/${bucket}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return { data: response.data, error: null };
  } catch (error) {
    console.error('File upload error:', error);
    return { data: null, error };
  }
}

export async function getFileUrl(bucket: string, path: string) {
  return `${BASE_URL}/storage/${bucket}/${path}`;
}

export async function deleteFile(bucket: string, path: string) {
  try {
    const response = await apiClient.delete(`/storage/${bucket}/${path}`);
    return { data: response.data, error: null };
  } catch (error) {
    console.error('File deletion error:', error);
    return { data: null, error };
  }
}

// Database functions
export async function switchDatabase(type: 'local' | 'supabase', config: any) {
  try {
    const response = await apiClient.post('/admin/database/switch', { type, config });
    return { data: response.data, error: null };
  } catch (error) {
    console.error('Database switch error:', error);
    return { data: null, error };
  }
}

export const api = {
  query,
  mutate,
  storage: {
    upload: uploadFile,
    getUrl: getFileUrl,
    delete: deleteFile,
  },
  admin: {
    switchDatabase,
  },
}; 