
-- Plan levels enum
CREATE TYPE public.plan_level AS ENUM ('bronze', 'silver', 'gold');

-- Wineries table
CREATE TABLE public.wineries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#630D16',
  logo_url TEXT,
  plan_level plan_level NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wines table
CREATE TABLE public.wines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winery_id UUID NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price_bottle NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_glass NUMERIC(10,2),
  sensory_acidity INTEGER NOT NULL DEFAULT 3,
  sensory_body INTEGER NOT NULL DEFAULT 3,
  sensory_sweetness INTEGER NOT NULL DEFAULT 3,
  on_tasting BOOLEAN NOT NULL DEFAULT false,
  on_restaurant BOOLEAN NOT NULL DEFAULT false,
  on_shop BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasting packages
CREATE TABLE public.tasting_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winery_id UUID NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  wine_ids UUID[] NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users/Leads
CREATE TABLE public.users_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winery_id UUID NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  preferences_summary TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ratings
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users_leads(id) ON DELETE CASCADE,
  wine_id UUID NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  stars_acidity INTEGER NOT NULL DEFAULT 3,
  stars_body INTEGER NOT NULL DEFAULT 3,
  stars_sweetness INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, wine_id)
);

-- Automations
CREATE TYPE public.automation_status AS ENUM ('sent', 'scheduled');
CREATE TYPE public.trigger_type AS ENUM ('D+1', 'D+15');

CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winery_id UUID NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users_leads(id) ON DELETE CASCADE,
  status automation_status NOT NULL DEFAULT 'scheduled',
  trigger_type trigger_type NOT NULL,
  commission_value NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vouchers for shop
CREATE TABLE public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winery_id UUID NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users_leads(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  redeemed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wineries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasting_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Wineries: public read
CREATE POLICY "Wineries are publicly readable" ON public.wineries FOR SELECT USING (true);

-- Wines: public read
CREATE POLICY "Wines are publicly readable" ON public.wines FOR SELECT USING (true);

-- Tasting packages: public read
CREATE POLICY "Tasting packages are publicly readable" ON public.tasting_packages FOR SELECT USING (true);

-- Users_leads: users can read/insert their own
CREATE POLICY "Users can read own lead" ON public.users_leads FOR SELECT USING (true);
CREATE POLICY "Anyone can create a lead" ON public.users_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own lead" ON public.users_leads FOR UPDATE USING (auth.uid() = auth_user_id);

-- Ratings: public read, authenticated insert/update
CREATE POLICY "Ratings are publicly readable" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rating" ON public.ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rating" ON public.ratings FOR UPDATE USING (true);

-- Automations: public read for now (admin will filter by winery)
CREATE POLICY "Automations are readable" ON public.automations FOR SELECT USING (true);

-- Vouchers: public read/insert
CREATE POLICY "Vouchers are readable" ON public.vouchers FOR SELECT USING (true);
CREATE POLICY "Anyone can create voucher" ON public.vouchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update voucher" ON public.vouchers FOR UPDATE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wineries_updated_at
  BEFORE UPDATE ON public.wineries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test data
INSERT INTO public.wineries (slug, name, primary_color, plan_level)
VALUES ('vinicola-goes', 'Vinícola Góes', '#630D16', 'gold');

-- Insert test wines
INSERT INTO public.wines (winery_id, name, type, price_bottle, price_glass, sensory_acidity, sensory_body, sensory_sweetness, on_tasting, on_restaurant, on_shop, description) VALUES
((SELECT id FROM public.wineries WHERE slug = 'vinicola-goes'), 'Góes Reserva Cabernet Sauvignon', 'Tinto', 189.90, 45.00, 3, 5, 1, true, true, true, 'Encorpado e elegante, com notas de frutas negras e especiarias. Estágio de 12 meses em barricas de carvalho francês.'),
((SELECT id FROM public.wineries WHERE slug = 'vinicola-goes'), 'Góes Chardonnay', 'Branco', 129.90, 35.00, 4, 2, 2, true, true, true, 'Fresco e mineral, com aromas cítricos e toque de baunilha. Fermentado parcialmente em barrica.'),
((SELECT id FROM public.wineries WHERE slug = 'vinicola-goes'), 'Góes Rosé Provence', 'Rosé', 99.90, 28.00, 3, 2, 3, true, true, true, 'Leve e refrescante, com notas de morango e pétalas de rosa. Perfeito para dias quentes.'),
((SELECT id FROM public.wineries WHERE slug = 'vinicola-goes'), 'Góes Moscatel Espumante', 'Espumante', 79.90, 22.00, 2, 1, 5, true, false, true, 'Doce e aromático, com perlage fina e persistente. Notas de lichia e flores brancas.'),
((SELECT id FROM public.wineries WHERE slug = 'vinicola-goes'), 'Góes Merlot Gran Reserva', 'Tinto', 249.90, 55.00, 2, 4, 2, false, true, true, 'Complexo e aveludado, com taninos macios e final longo. 18 meses em carvalho.');

-- Insert tasting package
INSERT INTO public.tasting_packages (winery_id, name, price, description, wine_ids) VALUES
((SELECT id FROM public.wineries WHERE slug = 'vinicola-goes'), 'Experiência Clássica', 120.00, 'Deguste 3 rótulos selecionados com harmonização de queijos artesanais', 
  ARRAY(SELECT id FROM public.wines WHERE winery_id = (SELECT id FROM public.wineries WHERE slug = 'vinicola-goes') AND on_tasting = true LIMIT 3));
