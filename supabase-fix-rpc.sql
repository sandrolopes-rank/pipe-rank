-- =============================================
-- FIX: Recriar função RPC list_auth_users com permissões corretas
-- Execute este script no Supabase SQL Editor
-- =============================================

-- Remover função antiga se existir
DROP FUNCTION IF EXISTS public.list_auth_users();
DROP FUNCTION IF EXISTS list_auth_users();

-- Criar função com search_path correto (inclui 'auth' para acessar auth.users)
CREATE OR REPLACE FUNCTION public.list_auth_users()
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, auth'
AS $$
BEGIN
  -- Apenas o admin pode listar usuários
  IF LOWER(auth.jwt() ->> 'email') != 'sandro.lopes@rankmyapp.com.br' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT
  FROM auth.users u
  WHERE u.email IS NOT NULL
    AND u.email != ''
  ORDER BY u.email;
END;
$$;

-- Garantir permissão de execução para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION public.list_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_auth_users() TO anon;
GRANT EXECUTE ON FUNCTION public.list_auth_users() TO service_role;