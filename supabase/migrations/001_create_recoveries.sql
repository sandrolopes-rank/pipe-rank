-- Migration: Create recoveries table for Recupera/Churn management
-- Run this in your Supabase SQL Editor: https://qhmfifnkxqharwilccka.supabase.co/project/default/sql/new

CREATE TABLE IF NOT EXISTS public.recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel TEXT NOT NULL,
  cliente TEXT NOT NULL,
  receita_em_risco NUMERIC(12, 2) NOT NULL DEFAULT 0,
  receita_recuperada NUMERIC(12, 2),
  tipo_recupera TEXT NOT NULL CHECK (tipo_recupera IN ('Preditivo', 'Churn')),
  data_pedido_churn TEXT,
  status_recupera TEXT NOT NULL CHECK (status_recupera IN ('Em andamento', 'Recuperado', 'Perdido')),
  ja_na_projecao BOOLEAN NOT NULL DEFAULT false,
  data_prevista_churn TEXT,
  proposta_enviada BOOLEAN NOT NULL DEFAULT false,
  proposta_com_reducao BOOLEAN NOT NULL DEFAULT false,
  status_proposta TEXT CHECK (status_proposta IN ('Enviada', 'Sem retorno', 'Recusada', 'Aprovada parcialmente', 'Em análise', 'Em produção')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recoveries ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all recoveries
CREATE POLICY "Allow authenticated read" ON public.recoveries
  FOR SELECT TO authenticated USING (true);

-- Policy: Allow authenticated users to insert recoveries
CREATE POLICY "Allow authenticated insert" ON public.recoveries
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: Allow authenticated users to update recoveries
CREATE POLICY "Allow authenticated update" ON public.recoveries
  FOR UPDATE TO authenticated USING (true);

-- Policy: Allow authenticated users to delete recoveries
CREATE POLICY "Allow authenticated delete" ON public.recoveries
  FOR DELETE TO authenticated USING (true);

-- Index for faster queries
CREATE INDEX idx_recoveries_responsavel ON public.recoveries(responsavel);
CREATE INDEX idx_recoveries_cliente ON public.recoveries(cliente);
CREATE INDEX idx_recoveries_status ON public.recoveries(status_recupera);
CREATE INDEX idx_recoveries_tipo ON public.recoveries(tipo_recupera);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recoveries_updated_at
  BEFORE UPDATE ON public.recoveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();