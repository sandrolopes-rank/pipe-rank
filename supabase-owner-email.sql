-- Adicionar coluna owner_email para controle de permissões por usuário
ALTER TABLE oportunidades
ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Preencher owner_email com base no campo responsavel para registros existentes
-- (ajuste conforme necessário após criar os usuários no Supabase Auth)
UPDATE oportunidades
SET owner_email = CASE
  WHEN LOWER(responsavel) LIKE '%aline%' THEN 'aline.oliveira@rankmyapp.com.br'
  WHEN LOWER(responsavel) LIKE '%amanda%' THEN 'amanda.halmata@rankmyapp.com.br'
  ELSE 'sandro.lopes@rankmyapp.com.br'
END
WHERE owner_email IS NULL;

-- Tornar owner_email obrigatório para novos registros
ALTER TABLE oportunidades
ALTER COLUMN owner_email SET NOT NULL;

-- Criar índice para buscas eficientes por owner_email
CREATE INDEX IF NOT EXISTS idx_oportunidades_owner_email ON oportunidades(owner_email);

-- Remover políticas de RLS anteriores (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view all opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON oportunidades;
DROP POLICY IF EXISTS "Authenticated users can delete opportunities" ON oportunidades;

-- Nova política: Admin vê tudo, outros veem apenas seus próprios registros
CREATE POLICY "Admin can view all opportunities"
ON oportunidades FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br'
  OR owner_email = auth.jwt() ->> 'email'
);

-- Admin pode inserir qualquer registro, outros só podem inserir com seu próprio email
CREATE POLICY "Users can insert own opportunities"
ON oportunidades FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br'
  OR owner_email = auth.jwt() ->> 'email'
);

-- Admin pode atualizar qualquer registro, outros só podem atualizar seus próprios
CREATE POLICY "Users can update own opportunities"
ON oportunidades FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br'
  OR owner_email = auth.jwt() ->> 'email'
);

-- Admin pode deletar qualquer registro, outros só podem deletar seus próprios
CREATE POLICY "Users can delete own opportunities"
ON oportunidades FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br'
  OR owner_email = auth.jwt() ->> 'email'
);

-- Garantir que realtime está habilitado
ALTER PUBLICATION supabase_realtime ADD TABLE oportunidades;