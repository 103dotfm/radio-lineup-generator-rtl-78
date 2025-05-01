
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
    // Use a direct SQL query instead of RPC to avoid TypeScript issues
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching WhatsApp settings:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return data as WhatsAppSettings;
  } catch (error) {
    console.error('Exception fetching WhatsApp settings:', error);
    return null;
  }
};

export const saveWhatsAppSettings = async (settings: WhatsAppSettings): Promise<{ success: boolean; error?: any }> => {
  try {
    let result;
    
    if (settings.id) {
      // Update existing settings
      result = await supabase
        .from('whatsapp_settings')
        .update({
          whatsapp_enabled: settings.whatsapp_enabled,
          whatsapp_api_type: settings.whatsapp_api_type,
          whatsapp_group_id: settings.whatsapp_group_id,
          twilio_account_sid: settings.twilio_account_sid,
          twilio_auth_token: settings.twilio_auth_token,
          twilio_phone_number: settings.twilio_phone_number,
          whatsapp_api_key: settings.whatsapp_api_key,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);
    } else {
      // Insert new settings
      result = await supabase
        .from('whatsapp_settings')
        .insert({
          whatsapp_enabled: settings.whatsapp_enabled,
          whatsapp_api_type: settings.whatsapp_api_type,
          whatsapp_group_id: settings.whatsapp_group_id,
          twilio_account_sid: settings.twilio_account_sid,
          twilio_auth_token: settings.twilio_auth_token,
          twilio_phone_number: settings.twilio_phone_number,
          whatsapp_api_key: settings.whatsapp_api_key
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
