-- ============================================
-- TABELA DE ROLES DE USUÁRIO
-- Rode este SQL no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Criar tabela de roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Drop policies existentes para evitar conflito
DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- 4. Policy: qualquer usuário autenticado pode ler roles
CREATE POLICY "Anyone can read roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (true);

-- 5. Policy: apenas admins podem inserir/atualizar/deletar roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Inserir o admin principal
INSERT INTO public.user_roles (user_id, role)
VALUES ('7674a27f-6e19-43d4-a8e6-fc1eb80ec987', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 6. Função RPC: listar todos os usuários com seus roles
DROP FUNCTION IF EXISTS public.list_users_with_roles();
CREATE OR REPLACE FUNCTION public.list_users_with_roles()
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

-- 7. Função RPC: definir role de um usuário
CREATE OR REPLACE FUNCTION public.set_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se quem chama é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar privilégios';
  END IF;

  -- Validar role
  IF new_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Role inválida. Use admin ou user';
  END IF;

  -- Upsert
  INSERT INTO public.user_roles (user_id, role, updated_at)
  VALUES (target_user_id, new_role, now())
  ON CONFLICT (user_id) DO UPDATE
  SET role = new_role, updated_at = now();
END;
$$;

-- 8. Função RPC: criar usuário com email auto-confirmado
DROP FUNCTION IF EXISTS public.create_auth_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_auth_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verificar se quem chama é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar usuários';
  END IF;

  -- Criar usuário no auth com email confirmado automaticamente
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),  -- Auto-confirmar email
    '',
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  )
  RETURNING id INTO new_user_id;

  -- Criar identidade
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id, user_email)::jsonb,
    'email',
    user_email,
    now(),
    now(),
    now()
  );

  -- Definir role como 'user' por padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'user');

  RETURN new_user_id;
END;
$$;

-- 9. Função RPC: deletar usuário
DROP FUNCTION IF EXISTS public.delete_auth_user(UUID);
CREATE OR REPLACE FUNCTION public.delete_auth_user(
  user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se quem chama é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários';
  END IF;

  -- Deletar role primeiro
  DELETE FROM public.user_roles WHERE user_roles.user_id = delete_auth_user.user_id;

  -- Deletar identidades
  DELETE FROM auth.identities WHERE identities.user_id = delete_auth_user.user_id;

  -- Deletar usuário
  DELETE FROM auth.users WHERE users.id = delete_auth_user.user_id;
END;
$$;

-- 10. Função RPC: listar usuários (versão simples compatível)
-- DROP primeiro porque a assinatura pode ter mudado
DROP FUNCTION IF EXISTS public.list_auth_users();
CREATE OR REPLACE FUNCTION public.list_auth_users()
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