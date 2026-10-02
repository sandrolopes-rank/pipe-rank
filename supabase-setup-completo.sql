-- =============================================
-- SETUP COMPLETO: owner_email + RLS + RPC
-- Execute este script inteiro no Supabase SQL Editor
-- =============================================

-- 1. Criar coluna owner_email
ALTER TABLE oportunidades
ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- 2. Preencher dados existentes (fallback para admin)
UPDATE oportunidades
SET owner_email = 'sandro.lopes@rankmyapp.com.br'
WHERE owner_email IS NULL;

-- 3. Tornar obrigatório
ALTER TABLE oportunidades
ALTER COLUMN owner_email SET NOT NULL;

-- 4. Índice de performance
CREATE INDEX IF NOT EXISTS idx_oportunidades_owner_email ON oportunidades(owner_email);

-- 5. Limpar políticas antigas
DROP POLICY IF EXISTS "Authenticated users can view all opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Authenticated users can delete opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Admin can view all opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Users can insert own opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Users can update own opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Users can delete own opportunities" ON oportunidades;

-- 6. Novas políticas de RLS (permissão por email)
CREATE POLICY "Admin can view all opportunities"
ON oportunidades FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br'
  OR owner_email = auth.jwt() ->> 'email'
);

CREATE POLICY "Users can insert own opportunities"
ON oportunidades FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br'
  OR owner_email = auth.jwt() ->> 'email'
);

CREATE POLICY "Users can update own opportunities"
ON oportunidades FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br'
  OR owner_email = auth.jwt() ->> 'email'
);

CREATE POLICY "Users can delete own opportunities"
ON oportunidades FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br'
  OR owner_email = auth.jwt() ->> 'email'
);

-- 7. Habilitar Realtime (ignora se já estiver na publicação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'oportunidades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE oportunidades;
  END IF;
END
$$;

-- 8. Função RPC para listar usuários (apenas admin)
-- search_path inclui 'auth' para resolver auth.users com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.list_auth_users()
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, auth'
AS $$
BEGIN
  -- Apenas o admin pode listar usuários
  IF auth.jwt() ->> 'email' != 'sandro.lopes@rankmyapp.com.br' THEN
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

-- Garantir permissão de execução para authenticated
GRANT EXECUTE ON FUNCTION public.list_auth_users() TO authenticated;