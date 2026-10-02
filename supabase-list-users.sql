-- Função RPC para listar usuários autenticados (apenas admin pode chamar)
CREATE OR REPLACE FUNCTION list_auth_users()
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  ORDER BY u.email;
END;
$$;

-- Atualizar RLS da tabela oportunidades para usar owner_email com base no JWT
DROP POLICY IF EXISTS "Admin can view all opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Users can insert own opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Users can update own opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Users can delete own opportunities" ON oportunidades;

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