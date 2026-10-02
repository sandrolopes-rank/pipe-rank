-- Rank CRM - Schema do Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela de oportunidades
CREATE TABLE IF NOT EXISTS oportunidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel TEXT NOT NULL DEFAULT '',
  cliente TEXT NOT NULL DEFAULT '',
  produto TEXT DEFAULT '',
  receita_atual NUMERIC(12,2) DEFAULT 0,
  receita_negociacao NUMERIC(12,2) DEFAULT 0,
  upsell NUMERIC(12,2) DEFAULT 0,
  calor TEXT DEFAULT 'Morno' CHECK (calor IN ('Quente', 'Morno', 'Frio')),
  mes_atuacao TEXT DEFAULT '',
  status TEXT DEFAULT 'Negociação' CHECK (status IN (
    'Fechado', 'Perdido', 'Negociação', 'Envio de Proposta',
    'Em Assinatura', 'FUP', 'Aprovação do Contrato',
    'Confecção do Contrato', 'Proposta Perdida', 'Assinado'
  )),
  proposta_em TEXT DEFAULT '',
  data_fechamento TEXT DEFAULT '',
  observacoes_1 TEXT DEFAULT '',
  observacoes_2 TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_oportunidades_status ON oportunidades(status);
CREATE INDEX IF NOT EXISTS idx_oportunidades_responsavel ON oportunidades(responsavel);
CREATE INDEX IF NOT EXISTS idx_oportunidades_cliente ON oportunidades(cliente);
CREATE INDEX IF NOT EXISTS idx_oportunidades_created_at ON oportunidades(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE oportunidades ENABLE ROW LEVEL SECURITY;

-- Política: todos os usuários autenticados podem ler
CREATE POLICY "Todos autenticados podem ler oportunidades"
  ON oportunidades FOR SELECT
  TO authenticated
  USING (true);

-- Política: todos os usuários autenticados podem inserir
CREATE POLICY "Todos autenticados podem criar oportunidades"
  ON oportunidades FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: todos os usuários autenticados podem atualizar
CREATE POLICY "Todos autenticados podem atualizar oportunidades"
  ON oportunidades FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: todos os usuários autenticados podem deletar
CREATE POLICY "Todos autenticados podem deletar oportunidades"
  ON oportunidades FOR DELETE
  TO authenticated
  USING (true);

-- Realtime: habilitar para a tabela oportunidades
ALTER PUBLICATION supabase_realtime ADD TABLE oportunidades;

-- Dados de exemplo (opcional - remover após teste)
INSERT INTO oportunidades (responsavel, cliente, produto, receita_atual, receita_negociacao, upsell, calor, mes_atuacao, status, proposta_em, data_fechamento, observacoes_1) VALUES
('Aline', 'Pagbank', 'Mi Feature', 11000.00, 13640.00, 2640.00, 'Frio', 'Maio', 'Proposta Perdida', '', 'Junho', 'Cliente não demonstrou interesse'),
('Aline', 'Pagbank', 'DataRank', 11000.00, 14499.00, 3499.00, 'Frio', 'Maio', 'Proposta Perdida', '', 'Junho', 'Em conversa com o Eduardo Maróstica de DataRank optamos por co'),
('Aline', 'Trizy', 'Mi Feture', 5300.00, 6700.00, 1400.00, 'Frio', 'Maio', 'Proposta Perdida', '', 'Junho', 'Cliente declinou na última reunião.'),
('Aline', 'VR', 'Renovação de MI + Upsell em RI', 15000.00, 20080.00, 5080.00, 'Quente', 'Abril', 'Aprovação do Contrato', '', 'Maio', 'Aprovado com ordem de compra complementar, a VR trabalha com o'),
('Aline', 'Privalia', 'Cross Sell RI', 50.00, 11000.00, 11000.00, 'Frio', 'Maio', 'Envio de Proposta', '', 'Junho', 'Demora no retorno do poc que ficou de avaliar a proposta.'),
('Amanda', 'Grupo UOL', 'Renovação + upsell de UOL Play + RI', 9680.00, 21200.00, 11520.00, 'Quente', 'March/26', 'Aprovação do Contrato', '', 'March/26', 'Não foi assinado, mas foi pago o mês de abril. Faturado o mês de abril, e depois disso fomos para a proposta de ret'),
('Amanda', 'Retenção Grupo UOL', 'Retenção de Date Papo (renovação)', 9680.00, 10000.00, 320.00, 'Quente', 'April/26', 'Aprovação do Contrato', '', 'sem previsão', 'Aguardando validação do aditivo'),
('Amanda', 'Retenção Grupo UOL', 'Retenção de UOL Play (renovação)', 9680.00, 21200.00, 11520.00, 'Quente', 'April/26', 'Aprovação do Contrato', '', 'sem previsão', 'Aguardando validação do aditivo'),
('Amanda', 'Viaje Guanabara', 'Renovação + Retenção + aumento de tempo de co', 12000.00, 6000.00, -6000.00, 'Quente', 'April/26', 'Assinado', '', 'June/26', 'Assinado 03/06'),
('Amanda', 'Zui+', 'Renovação + reajuste monetário', 10600.00, 11070.54, 470.54, 'Quente', 'April/26', 'Assinado', '', 'June/26', 'Assinado 01/06'),
('Amanda', 'Marisa', 'Renovação + upsell de plano Android', 7228.40, 8614.20, 1385.80, 'Quente', 'April/26', 'Assinado', '', 'June/26', 'Assinado 12/06'),
('Amanda', 'Polishop', 'Contratação de plano MI', 0.00, 10000.00, 10000.00, 'Frio', 'April/26', 'Proposta Perdida', '', 'July/26', 'Declinou'),
('Amanda', 'B3', 'Contratação de plano MI', 0.00, 11600.00, 11600.00, 'Frio', 'May/26', 'FUP', '', 'October/26', 'Reunião realizada dia 21/05, aguardando retorno da proposta + a Médio prazo'),
('Amanda', 'Jeitto', 'Renovação + reajuste monetário', 11100.00, 11586.89, 486.89, 'Quente', 'May/26', 'Em Assinatura', '', 'September/26', 'Proposta enviada em 20/05, aguardando retorno do POC'),
('Amanda', 'Centouro', 'Renovação automática + reajuste IGPM', 9607.78, 9795.13, 187.35, 'Quente', 'May/26', 'Assinado', '', 'June/26', 'Renovação automática 01/06'),
('Amanda', 'Natura', 'MI', 14073.28, 17200.00, 3126.72, 'Morno', 'June/26', 'FUP', '', '', ''),
('Amanda', 'Zui+', 'Upsell Aplicativo do grupo - Estar Digital', 0.00, 10000.00, 10000.00, 'Quente', 'July/26', 'Em Assinatura', '', 'September/26', ''),
('Amanda', 'Koin', 'Renovação sem reajuste - 3 meses (RA)', 8331.20, 8331.20, 0.00, 'Quente', 'July/26', 'Assinado', '', 'August/26', 'Renovação automática'),
('Amanda', 'Livelo', 'Renovação MI (plano improve)', 13400.00, 14000.00, 600.00, 'Quente', 'July/26', 'FUP', '', 'October/26', ''),
('Amanda', 'Avenue', 'Renovação + upsell de plano', 18500.00, 22000.00, 3500.00, 'Quente', 'August/26', 'FUP', '', 'October/26', ''),
('Amanda', 'Sem Parar', 'Renovação + upsell de plano (Elite > Scale)', 18600.00, 19716.00, 1116.00, 'Quente', 'July/26', 'Confecção do Contrato', '', 'October/26', '');