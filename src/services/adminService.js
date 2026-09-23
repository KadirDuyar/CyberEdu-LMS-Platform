import { supabase } from '../lib/supabase';

export async function getAllProfiles() {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_masked_users');
  if (rpcData && !rpcError) return { data: rpcData, error: null };

  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return { data, error };
}

export async function resetStudentProgress(userId) {
  // Tanıtım turu ve aktif kurs durumunu sıfırla
  try {
    localStorage.removeItem(`cyberedu_tour_completed_${userId}`);
    localStorage.removeItem('cyberedu_tour_completed');
    localStorage.removeItem(`cyberedu_last_active_course_${userId}`);
    localStorage.removeItem('cyberedu_last_active_course');
  } catch (e) {}

  // 1. RPC fonksiyonunu çağır (SECURITY DEFINER ile tüm RLS'leri aşarak tek seferde siler)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_reset_student', { target_user_id: userId });
  
  if (!rpcError && rpcResult?.success) {
    return { data: rpcResult, error: null };
  }

  // 2. Client-side alternatif / garanti silme (RPC henüz oluşturulmamış veya hata vermişse)
  try {
    await Promise.allSettled([
      supabase.from('activity_attempts').delete().eq('user_id', userId),
      supabase.from('lesson_progress').delete().eq('user_id', userId),
      supabase.from('enrollments').delete().eq('user_id', userId),
      supabase.from('course_feedbacks').delete().eq('user_id', userId),
      supabase.from('user_follows').delete().eq('follower_id', userId),
      supabase.from('user_follows').delete().eq('following_id', userId),
      supabase.from('notifications').delete().eq('user_id', userId),
      supabase.from('notifications').delete().eq('actor_id', userId),
      supabase.from('user_badges').delete().eq('user_id', userId),
    ]);

    // Profili sıfırla (Ad soyad, rol ve e-posta korunur)
    const { error: profError } = await supabase.from('profiles').update({
      learning_area: null,
      skill_level: null,
      onboarding_completed: false,
      xp: 0,
      level: 1,
      avatar_emoji: '🛡️',
      bio: null,
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    if (profError) {
      return { data: null, error: profError };
    }

    return { data: { success: true, message: 'Öğrenci verileri başarıyla sıfırlandı.' }, error: null };
  } catch (clientErr) {
    console.error('Veritabanı sıfırlama hatası:', clientErr);
    return { data: null, error: clientErr };
  }
}