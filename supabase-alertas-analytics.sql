-- =========================================================
-- Rank CRM — Alertas (auditoria) + Analytics de acessos
-- Execute este script INTEIRO no SQL Editor do Supabase
-- Dashboard > SQL Editor > New query > colar > Run
-- =========================================================

-- ---------------------------------------------------------
-- 0. Função auxiliar: quem é admin
--    (verifica user_roles + fallback para o email do dono)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR auth.jwt() ->> 'email' = 'sandro.lopes@rankmyapp.com.br';
$$;

-- ---------------------------------------------------------
-- 1. AUDIT_LOG — a "câmera de segurança" (histórico imutável)
--    Cada linha = 1 evento. Ninguém edita/apaga pelo app.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_name TEXT NOT NULL,             -- qual tabela mudou
  record_id TEXT NOT NULL,              -- id do registro afetado
  record_label TEXT NOT NULL DEFAULT '',-- nome amigável (cliente — produto)
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  actor_id UUID,                        -- quem fez (id)
  actor_email TEXT NOT NULL DEFAULT '', -- quem fez (email)
  old_data JSONB,                       -- valor ANTES (null em cadastro)
  new_data JSONB                        -- valor DEPOIS (null em exclusão)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(table_name, record_id, created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Somente admin pode LER o histórico.
DROP POLICY IF EXISTS "Admin lê audit_log" ON public.audit_log;
CREATE POLICY "Admin lê audit_log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Sem policies de INSERT/UPDATE/DELETE para usuários comuns:
-- o histórico só é escrito pela trigger abaixo (privilégio interno do banco).

-- ---------------------------------------------------------
-- 2. Função da trigger — registra automaticamente cada
--    cadastro, edição ou exclusão (mesmo fora do app)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_label := TRIM(BOTH ' —' FROM COALESCE(to_jsonb(NEW) ->> 'cliente', '') || ' — ' || COALESCE(to_jsonb(NEW) ->> 'produto', ''));
    INSERT INTO public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::text, v_label, 'INSERT', auth.uid(),
            COALESCE(auth.jwt() ->> 'email', ''), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Ignora "salvar sem mudar nada" (evita alertas falsos)
    IF to_jsonb(OLD) - 'updated_at' IS NOT DISTINCT FROM to_jsonb(NEW) - 'updated_at' THEN
      RETURN NEW;
    END IF;
    v_label := TRIM(BOTH ' —' FROM COALESCE(to_jsonb(NEW) ->> 'cliente', '') || ' — ' || COALESCE(to_jsonb(NEW) ->> 'produto', ''));
    INSERT INTO public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::text, v_label, 'UPDATE', auth.uid(),
            COALESCE(auth.jwt() ->> 'email', ''), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_label := TRIM(BOTH ' —' FROM COALESCE(to_jsonb(OLD) ->> 'cliente', '') || ' — ' || COALESCE(to_jsonb(OLD) ->> 'produto', ''));
    INSERT INTO public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, old_data)
    VALUES (TG_TABLE_NAME, OLD.id::text, v_label, 'DELETE', auth.uid(),
            COALESCE(auth.jwt() ->> 'email', ''), to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------
-- 3. Gatilho vigilando a tabela oportunidades
-- ---------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_oportunidades ON public.oportunidades;
CREATE TRIGGER trg_audit_oportunidades
  AFTER INSERT OR UPDATE OR DELETE ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ---------------------------------------------------------
-- 4. ACCESS_LOGS — o "caderno de portaria" (só logins)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  event TEXT NOT NULL DEFAULT 'login',
  user_agent TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_access_logs_created ON public.access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id, created_at DESC);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado registra apenas o PRÓPRIO login
DROP POLICY IF EXISTS "Usuário registra próprio login" ON public.access_logs;
CREATE POLICY "Usuário registra próprio login"
  ON public.access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Somente admin pode LER os acessos
DROP POLICY IF EXISTS "Admin lê access_logs" ON public.access_logs;
CREATE POLICY "Admin lê access_logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------
-- 5. Tempo real para a página de Alertas (sem dar F5)
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
  END IF;
END
$$;

-- Fim do script ✅
