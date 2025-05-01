
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

// This helper function uses type assertions to bypass TypeScript restrictions
export const getWhatsAppSettings = async (): Promise<WhatsAppSettings | null> => {
  try {
    // Use type assertion to bypass TypeScript limitations
    const { data, error } = await (supabase
      .from('whatsapp_settings' as any)
      .select('*')
      .limit(1)
      .single() as any);
    
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
      // Update existing settings with type assertion
      result = await (supabase
        .from('whatsapp_settings' as any)
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
        .eq('id', settings.id) as any);
    } else {
      // Insert new settings with type assertion
      result = await (supabase
        .from('whatsapp_settings' as any)
        .insert({
          whatsapp_enabled: settings.whatsapp_enabled,
          whatsapp_api_type: settings.whatsapp_api_type,
          whatsapp_group_id: settings.whatsapp_group_id,
          twilio_account_sid: settings.twilio_account_sid,
          twilio_auth_token: settings.twilio_auth_token,
          twilio_phone_number: settings.twilio_phone_number,
          whatsapp_api_key: settings.whatsapp_api_key
        } as any) as any);
    }
    
    if (result.error) {
      return { success: false, error: result.error };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

// Helper to get WhatsApp number formatting
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  // Remove any non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Ensure the number starts with a plus if it doesn't already
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};
