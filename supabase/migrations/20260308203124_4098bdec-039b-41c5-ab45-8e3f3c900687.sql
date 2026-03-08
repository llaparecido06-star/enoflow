
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan_key text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  max_locations integer NOT NULL DEFAULT 5,
  max_wines integer DEFAULT NULL,
  max_staff integer DEFAULT NULL,
  commission_rate numeric NOT NULL DEFAULT 0,
  enabled_modules text[] NOT NULL DEFAULT ARRAY['tasting', 'restaurant', 'shop'],
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "No direct insert on subscription_plans" ON public.subscription_plans FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on subscription_plans" ON public.subscription_plans FOR UPDATE USING (false);
CREATE POLICY "No direct delete on subscription_plans" ON public.subscription_plans FOR DELETE USING (false);

-- Seed default plans
INSERT INTO public.subscription_plans (name, plan_key, price, max_locations, max_wines, max_staff, commission_rate, features) VALUES
  ('Bronze', 'bronze', 0, 3, 20, 3, 5, ARRAY['Degustação básica', 'Até 3 pontos de captura', 'Até 20 vinhos']),
  ('Silver', 'silver', 299, 5, 50, 10, 3, ARRAY['Tudo do Bronze', 'Sommelier Digital', 'Relatórios avançados', 'Até 50 vinhos']),
  ('Gold', 'gold', 599, 20, NULL, NULL, 1, ARRAY['Tudo do Silver', 'Locais ilimitados', 'Vinhos ilimitados', 'Staff ilimitado', 'API & integrações']);
