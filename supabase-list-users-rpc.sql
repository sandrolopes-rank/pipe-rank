-- Função RPC CORRIGIDA para listar todos os usuários auth
-- ERRO ANTERIOR: "Returned type character varying(255) does not match expected type text in column 2"
-- CAUSA: auth.users.email é varchar(255), mas a função declarava retorno como text
-- SOLUÇÃO: usar email::text no SELECT para fazer o cast explícito
--
-- Execute este SQL no Supabase SQL Editor (substitui a versão anterior)

CREATE OR REPLACE FUNCTION public.list_all_auth_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb
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
    u.raw_user_meta_data
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;