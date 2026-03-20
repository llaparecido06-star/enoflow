/**
 * Custom Supabase client pointing to the EXTERNAL Supabase instance.
 * This file overrides the auto-generated client from Lovable Cloud.
 * All app code should import from here: import { supabase } from "@/lib/supabase";
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const EXTERNAL_SUPABASE_URL = "https://myiardyzfkqcvnilbfdx.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "sb_publishable_o12_7O4Uo-PCIDNLXziEDg_jtJzLr-q";

export const supabase = createClient<Database>(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const SUPABASE_URL = EXTERNAL_SUPABASE_URL;
export const SUPABASE_ANON_KEY = EXTERNAL_SUPABASE_ANON_KEY;
