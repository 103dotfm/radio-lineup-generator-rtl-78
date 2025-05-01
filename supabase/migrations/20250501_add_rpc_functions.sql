
-- Create a function to get WhatsApp settings that our TypeScript code can call
CREATE OR REPLACE FUNCTION public.get_whatsapp_settings_generic()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(t))
    FROM (
      SELECT * FROM public.whatsapp_settings LIMIT 1
    ) t
  );
END;
$$;

-- Create a function to update WhatsApp settings
CREATE OR REPLACE FUNCTION public.update_whatsapp_settings_generic(p_id UUID, p_settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.whatsapp_settings
  SET
    whatsapp_enabled = (p_settings->>'whatsapp_enabled')::boolean,
    whatsapp_api_type = p_settings->>'whatsapp_api_type',
    whatsapp_group_id = p_settings->>'whatsapp_group_id',
    twilio_account_sid = p_settings->>'twilio_account_sid',
    twilio_auth_token = p_settings->>'twilio_auth_token',
    twilio_phone_number = p_settings->>'twilio_phone_number',
    whatsapp_api_key = p_settings->>'whatsapp_api_key',
    updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create a function to insert new WhatsApp settings
CREATE OR REPLACE FUNCTION public.insert_whatsapp_settings_generic(p_settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.whatsapp_settings (
    whatsapp_enabled,
    whatsapp_api_type,
    whatsapp_group_id,
    twilio_account_sid,
    twilio_auth_token,
    twilio_phone_number,
    whatsapp_api_key
  ) VALUES (
    (p_settings->>'whatsapp_enabled')::boolean,
    p_settings->>'whatsapp_api_type',
    p_settings->>'whatsapp_group_id',
    p_settings->>'twilio_account_sid',
    p_settings->>'twilio_auth_token',
    p_settings->>'twilio_phone_number',
    p_settings->>'whatsapp_api_key'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- Create a generic query execution function for our export functionality
CREATE OR REPLACE FUNCTION public.execute_generic_query(p_query TEXT, p_params JSONB DEFAULT '[]'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE p_query INTO result USING p_params;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
