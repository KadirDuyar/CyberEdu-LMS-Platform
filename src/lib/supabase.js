import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase bağlantı bilgileri eksik. ' +
    '.env.local dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı olmalıdır.'
  );
}

/**
 * Supabase client singleton.
 * Tüm servislerde bu instance kullanılır — her yerde yeni client oluşturma.
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Oturum bilgisini localStorage'da sakla (sayfa yenilemesinde kaybolmasın)
    persistSession: true,
    autoRefreshToken: true,
  },
});
