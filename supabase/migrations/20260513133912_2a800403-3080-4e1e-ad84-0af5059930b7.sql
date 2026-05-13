-- Clientes B2B (empresa contratante)
CREATE TABLE public.b2b_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid REFERENCES public.wineries(id) ON DELETE SET NULL,
  legal_name text NOT NULL,
  trade_name text,
  cnpj text NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  responsible_name text,
  responsible_cpf text,
  responsible_role text,
  responsible_email text,
  responsible_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_b2b_clients_winery ON public.b2b_clients(winery_id);
CREATE INDEX idx_b2b_clients_cnpj ON public.b2b_clients(cnpj);

-- Contratos
CREATE TABLE public.b2b_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.b2b_clients(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'Plano Base',
  setup_fee numeric NOT NULL DEFAULT 1800,
  monthly_fee numeric NOT NULL DEFAULT 900,
  postsales_active boolean NOT NULL DEFAULT false,
  postsales_commission_pct numeric NOT NULL DEFAULT 5,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  contract_url text,
  signed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_b2b_contracts_client ON public.b2b_contracts(client_id);

-- Boletos / cobranças manuais
CREATE TABLE public.b2b_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.b2b_contracts(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_at date,
  status text NOT NULL DEFAULT 'pending',
  payment_link text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_b2b_invoices_contract ON public.b2b_invoices(contract_id);
CREATE INDEX idx_b2b_invoices_due ON public.b2b_invoices(due_date);

-- RLS: bloqueia acesso direto, tudo via Edge Function (master-only)
ALTER TABLE public.b2b_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no direct select" ON public.b2b_clients FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.b2b_clients FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.b2b_clients FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.b2b_clients FOR DELETE USING (false);

CREATE POLICY "no direct select" ON public.b2b_contracts FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.b2b_contracts FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.b2b_contracts FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.b2b_contracts FOR DELETE USING (false);

CREATE POLICY "no direct select" ON public.b2b_invoices FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.b2b_invoices FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.b2b_invoices FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.b2b_invoices FOR DELETE USING (false);

-- Triggers de updated_at
CREATE TRIGGER trg_b2b_clients_updated BEFORE UPDATE ON public.b2b_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_b2b_contracts_updated BEFORE UPDATE ON public.b2b_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_b2b_invoices_updated BEFORE UPDATE ON public.b2b_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();