-- CORREÇÃO DEFINITIVA para erro 42804 (varchar vs text)
-- Este SQL resolve o problema de tipo mismatch entre auth.users.email (varchar 255)
-- e o retorno declarado das funções (TEXT)
--
-- INSTRUCOES: Rode este SQL COMPLETO no SQL Editor do Supabase Dashboard
-- https://qhmfifnkxqharwilccka.supabase.co/project/default/sql/new
--
-- O segredo: DROP FUNCTION primeiro (obrigatorio para mudar tipo de retorno),
-- depois CREATE com VARCHAR(255) para casar exatamente com auth.users.email

-- Passo 1: Drop das funcoes existentes
DROP FUNCTION IF EXISTS public.list_users_with_roles();
DROP FUNCTION IF EXISTS public.list_auth_users();

-- Passo 2: Recriar list_users_with_roles com VARCHAR(255) para email
CREATE FUNCTION public.list_users_with_roles()
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    COALESCE(r.role, 'user')::TEXT as role
  FROM auth.users u
  LEFT JOIN public.user_roles r ON u.id = r.user_id
  ORDER BY u.created_at DESC;
END;
$$;

-- Passo 3: Recriar list_auth_users com VARCHAR(255) para email
CREATE FUNCTION public.list_auth_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Passo 4: Atualizar role do admin com ID correto
INSERT INTO public.user_roles (user_id, role)
VALUES ('7674a27f-6e19-43d4-a8e6-fc1eb80ec987', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Passo 5: Recarregar schema cache do PostgREST (opcional mas recomendado)
NOTIFY pgrst, 'reload schema';