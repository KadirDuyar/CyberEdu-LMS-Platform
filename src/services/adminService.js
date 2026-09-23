import { supabase } from '../lib/supabase';

export async function getAllProfiles() {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_masked_users');
  if (rpcData && !rpcError) return { data: rpcData, error: null };

  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return { data, error };
}

export async function resetStudentProgress(userId) {
  // Tanıtım turu durumunu sıfırla ki kullanıcı tekrar giriş yapıp navigatörü tamamladığında tur açılsın
  try {
    localStorage.removeItem(`cyberedu_tour_completed_${userId}`);
    localStorage.removeItem('cyberedu_tour_completed');
  } catch (e) {}

  // 1. RPC fonksiyonunu çağır
  const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_reset_student', { target_user_id: userId });
  
  if (rpcError) {
    console.warn('RPC admin_reset_student çalıştırılamadı, alternatif RLS silme deneniyor:', rpcError.message);
    
    // Alternatif RLS ile doğrudan silme denemesi
    const [delAttempts, delProgress, delEnroll] = await Promise.all([
      supabase.from('activity_attempts').delete().eq('user_id', userId),
      supabase.from('lesson_progress').delete().eq('user_id', userId),
      supabase.from('enrollments').delete().eq('user_id', userId)
    ]);

    if (delAttempts.error || delProgress.error || delEnroll.error) {
      const errMsg = delProgress.error?.message || delAttempts.error?.message || delEnroll.error?.message;
      return { error: new Error('Silme izni yetersiz. Lütfen supabase/fix_reset_progress.sql dosyasını çalıştırın: ' + errMsg) };
    }
  }

  // 2. Kalan kayıtları kontrol et (Doğrulama / Verification)
  const [remProg, remAtt] = await Promise.all([
    supabase.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('activity_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  ]);

  if ((remProg.count && remProg.count > 0) || (remAtt.count && remAtt.count > 0)) {
    return {
      error: new Error(`Veritabanı silme işlemi tamamlanamadı. lesson_progress veya activity_attempts tablolarında hala kayıt var. Lütfen Supabase SQL Editor'de fix_reset_progress.sql dosyasını çalıştırın.`)
    };
  }

  // 3. Eğer RPC kullanılmadıysa profili sıfırla (RPC zaten profili de sıfırlıyor)
  if (rpcError) {
    const { error: profError } = await supabase.from('profiles').update({
      learning_area: null,
      skill_level: null,
      onboarding_completed: false,
      xp: 0,
      level: 1,
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    if (profError) return { error: profError };
  }

  return { data: rpcResult || { success: true }, error: null };
}