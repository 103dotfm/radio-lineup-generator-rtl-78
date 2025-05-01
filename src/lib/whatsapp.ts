
import { supabase } from './supabase';

export interface WhatsAppSettings {
  id: string;
  whatsapp_enabled: boolean;
  whatsapp_api_type: string;
  whatsapp_group_id: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  whatsapp_api_key?: string;
  created_at?: string;
  updated_at?: string;
}

// This helper function uses a direct SQL query approach to bypass TypeScript restrictions
export const getWhatsAppSettings = async (): Promise<WhatsAppSettings | null> => {
  try {
    // Use rpc to call a custom query instead of using .from() directly
    const { data, error } = await supabase.rpc('get_whatsapp_settings_generic');
    
    if (error) {
      console.error('Error fetching WhatsApp settings:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    return data[0] as WhatsAppSettings;
  } catch (error) {
    console.error('Exception fetching WhatsApp settings:', error);
    return null;
  }
};

export const saveWhatsAppSettings = async (settings: WhatsAppSettings): Promise<{ success: boolean; error?: any }> => {
  try {
    let result;
    
    if (settings.id) {
      // Update existing settings using a custom RPC function
      result = await supabase.rpc('update_whatsapp_settings_generic', {
        p_id: settings.id,
        p_settings: settings
      });
    } else {
      // Insert new settings using a custom RPC function
      result = await supabase.rpc('insert_whatsapp_settings_generic', {
        p_settings: settings
      });
    }
    
    if (result.error) {
      return { success: false, error: result.error };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};
