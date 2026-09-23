import { supabase } from '../lib/supabase';

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function resetStudentProgress(userId) {
  // Tanıtım turu ve aktif kurs durumunu sıfırla
  try {
    localStorage.removeItem(`cyberedu_tour_completed_${userId}`);
    localStorage.removeItem('cyberedu_tour_completed');
    localStorage.removeItem(`cyberedu_tour_last_seen_${userId}`);
    localStorage.removeItem('cyberedu_tour_last_seen');
    localStorage.removeItem(`cyberedu_last_active_course_${userId}`);
    localStorage.removeItem('cyberedu_last_active_course');
  } catch (e) {}

  // 1. RPC fonksiyonunu çağır (SECURITY DEFINER ile tüm RLS'leri aşarak tek seferde siler)
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_reset_student', { target_user_id: userId });
    if (!rpcError && rpcResult?.success) {
      return { data: rpcResult, error: null };
    }
  } catch (rpcErr) {
    console.warn('RPC admin_reset_student başarısız, doğrudan silme deneniyor:', rpcErr);
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
    const basePayload = {
      learning_area: null,
      skill_level: null,
      onboarding_completed: false,
      xp: 0,
      level: 1,
      avatar_emoji: '🛡️',
      updated_at: new Date().toISOString()
    };

    // tour_completed sütunuyla birlikte sıfırla
    const { error: profError } = await supabase.from('profiles').update({
      ...basePayload,
      tour_completed: false
    }).eq('id', userId);

    if (profError) {
      // tour_completed sütunu veritabanında henüz eklenmemişse sadece basePayload ile güncelle
      const { error: baseError } = await supabase.from('profiles').update(basePayload).eq('id', userId);
      if (baseError) {
        return { data: null, error: baseError };
      }
    }

    return { data: { success: true, message: 'Öğrenci verileri başarıyla sıfırlandı.' }, error: null };
  } catch (clientErr) {
    console.error('Veritabanı sıfırlama hatası:', clientErr);
    return { data: null, error: clientErr };
  }
}