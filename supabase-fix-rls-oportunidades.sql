-- =========================================================
-- CORREÇÃO DE SEGURANÇA — oportunidades
-- =========================================================
-- Contexto: o script original (supabase-schema.sql) criou 4
-- políticas permissivas ("USING (true)") que NUNCA foram
-- removidas. Como políticas do Postgres somam permissões,
-- elas anulam as regras por responsável (owner_email) criadas
-- depois. Resultado provado em teste: um usuário comum
-- conseguiu EDITAR a oportunidade de outra pessoa.
--
-- Este script:
-- 1. Remove as políticas legadas permissivas
-- 2. Recria as políticas granulares (admin OU dono do item),
--    agora usando is_admin() (vale para qualquer admin, não
--    só o email fixo)
-- Execute INTEIRO no SQL Editor do Supabase.
-- =========================================================

-- 1. Remover políticas legadas permissivas (geração 1)
DROP POLICY IF EXISTS "Todos autenticados podem ler oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Todos autenticados podem criar oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Todos autenticados podem atualizar oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Todos autenticados podem deletar oportunidades" ON public.oportunidades;

-- 2. Remover geração antiga com email fixo (serão recriadas com is_admin())
DROP POLICY IF EXISTS "Admin can view all opportunities" ON public.oportunidades;
DROP POLICY IF EXISTS "Users can insert own opportunities" ON public.oportunidades;
DROP POLICY IF EXISTS "Users can update own opportunities" ON public.oportunidades;
DROP POLICY IF EXISTS "Users can delete own opportunities" ON public.oportunidades;
-- (nomes que o setup antigo tentou remover, por garantia)
DROP POLICY IF EXISTS "Authenticated users can view all opportunities" ON public.oportunidades;
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON public.oportunidades;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON public.oportunidades;
DROP POLICY IF EXISTS "Authenticated users can delete opportunities" ON public.oportunidades;

-- 3. Recriar políticas corretas: admin (qualquer um com role admin)
--    OU o dono do registro (owner_email = email logado)
CREATE POLICY "oportunidades_select"
  ON public.oportunidades FOR SELECT TO authenticated
  USING (public.is_admin() OR owner_email = auth.jwt() ->> 'email');

CREATE POLICY "oportunidades_insert"
  ON public.oportunidades FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR owner_email = auth.jwt() ->> 'email');

CREATE POLICY "oportunidades_update"
  ON public.oportunidades FOR UPDATE TO authenticated
  USING (public.is_admin() OR owner_email = auth.jwt() ->> 'email')
  WITH CHECK (public.is_admin() OR owner_email = auth.jwt() ->> 'email');

CREATE POLICY "oportunidades_delete"
  ON public.oportunidades FOR DELETE TO authenticated
  USING (public.is_admin() OR owner_email = auth.jwt() ->> 'email');

-- 4. Verificação: deve listar APENAS estas 4 políticas novas
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'oportunidades'
ORDER BY policyname;
