-- Função RPC v3 - CORRIGIDA para erro 42P13 (cannot change return type)
-- O PostgreSQL exige DROP antes de CREATE quando o tipo de retorno muda
-- Execute este SQL no Supabase SQL Editor

-- 1. Remove a versão antiga da função
DROP FUNCTION IF EXISTS public.list_all_auth_users();

-- 2. Cria a nova versão com banned_until
CREATE FUNCTION public.list_all_auth_users()
RETURNS TABLE (
    id uuid,
    email text,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    email_confirmed_at timestamptz,
    raw_user_meta_data jsonb,
    banned_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email::text,
        u.created_at,
        u.last_sign_in_at,
        u.email_confirmed_at,
        u.raw_user_meta_data,
        u.banned_until
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;