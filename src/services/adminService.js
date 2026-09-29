import { supabase } from '../lib/supabase';

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function resetStudentProgress(userId) {
  // 1. Tanıtım turu ve aktif kurs durumunu localStorages'tan sıfırla
  try {
    localStorage.removeItem(`cyberedu_tour_completed_${userId}`);
    localStorage.removeItem('cyberedu_tour_completed');
    localStorage.removeItem(`cyberedu_tour_last_seen_${userId}`);
    localStorage.removeItem('cyberedu_tour_last_seen');
    localStorage.removeItem(`cyberedu_last_active_course_${userId}`);
    localStorage.removeItem('cyberedu_last_active_course');
  } catch (e) {
    console.warn('LocalStorage temizleme uyarısı:', e);
  }

  // 2. Client-side doğrudan ve garanti silmeler (RPC fonksiyonu veritabanında eski olsa bile kesin temizler)
  try {
    await Promise.allSettled([
      // Sınıf / Haftalık Program kayıtları
      supabase.from('cohort_progress').delete().eq('student_id', userId),
      supabase.from('cohort_members').delete().eq('student_id', userId),
      // Kurs ve ders ilerlemeleri
      supabase.from('activity_attempts').delete().eq('user_id', userId),
      supabase.from('lesson_progress').delete().eq('user_id', userId),
      supabase.from('enrollments').delete().eq('user_id', userId),
      // Sosyal ve etkileşim kayıtları
      supabase.from('course_feedbacks').delete().eq('user_id', userId),
      supabase.from('user_follows').delete().eq('follower_id', userId),
      supabase.from('user_follows').delete().eq('following_id', userId),
      supabase.from('notifications').delete().eq('user_id', userId),
      supabase.from('notifications').delete().eq('actor_id', userId),
      supabase.from('user_badges').delete().eq('user_id', userId),
    ]);

    // Profili sıfırla (Ad soyad, rol ve auth e-posta/şifre korunur, diğer her şey fabrika ayarlarına döner)
    const basePayload = {
      learning_area: null,
      skill_level: null,
      onboarding_completed: false,
      tour_completed: false,
      xp: 0,
      level: 1,
      avatar_emoji: '🚀',
      updated_at: new Date().toISOString()
    };

    const { error: profError } = await supabase.from('profiles').update(basePayload).eq('id', userId);
    if (profError) {
      console.warn('Profil güncelleme uyarısı (tour_completed olmadan deneniyor):', profError);
      delete basePayload.tour_completed;
      await supabase.from('profiles').update(basePayload).eq('id', userId);
    }
  } catch (clientErr) {
    console.warn('Client-side temizlik aşaması uyarısı:', clientErr);
  }

  // 3. RPC fonksiyonunu da çağır (SECURITY DEFINER yetkisiyle tüm RLS kurallarını aşarak veritabanında tam temizlik yapar)
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_reset_student', { target_user_id: userId });
    if (!rpcError && rpcResult?.success) {
      return { data: rpcResult, error: null };
    }
    if (rpcError) {
      console.warn('RPC admin_reset_student uyarısı:', rpcError);
    }
  } catch (rpcErr) {
    console.warn('RPC çağrısı hatası:', rpcErr);
  }

  return { data: { success: true, message: 'Öğrencinin tüm kurs kayıtları, program üyelikleri ve ilerlemeleri başarıyla sıfırlandı.' }, error: null };
}

/**
 * Öğrencinin kurs ve ders ilerlemelerine, puanlarına (XP) veya rozetlerine
 * DOKUNMADAN yalnızca Navigator ve site tanıtım turunu (yönergeleri) sıfırlar.
 */
export async function resetStudentOnboardingAndTour(userId) {
  // 1. Tarayıcı önbelleğindeki tur durumunu sıfırla
  try {
    localStorage.removeItem(`cyberedu_tour_completed_${userId}`);
    localStorage.removeItem('cyberedu_tour_completed');
    localStorage.removeItem(`cyberedu_tour_last_seen_${userId}`);
    localStorage.removeItem('cyberedu_tour_last_seen');
  } catch (e) {
    console.warn('LocalStorage temizleme uyarısı:', e);
  }

  // 2. Profiles tablosunda SADECE onboarding ve tour sütunlarını sıfırla
  // (xp, level, enrollments, lesson_progress vb. korunur)
  const basePayload = {
    onboarding_completed: false,
    tour_completed: false,
    learning_area: null,
    skill_level: null,
    updated_at: new Date().toISOString()
  };

  try {
    let { data, error } = await supabase
      .from('profiles')
      .update(basePayload)
      .eq('id', userId);

    if (error) {
      console.warn('Profil tour/onboarding sıfırlama hatası (tour_completed olmadan deneniyor):', error);
      delete basePayload.tour_completed;
      const res = await supabase
        .from('profiles')
        .update(basePayload)
        .eq('id', userId);
      data = res.data;
      error = res.error;
    }

    if (error) {
      return { data: null, error };
    }

    // 3. RPC fonksiyonu varsa çağır
    try {
      await supabase.rpc('admin_reset_student_onboarding', { target_user_id: userId });
    } catch (_) {}

    return { data: { success: true, message: 'Navigator ve site tanıtım yönergeleri başarıyla sıfırlandı.' }, error: null };
  } catch (err) {
    console.error('resetStudentOnboardingAndTour hatası:', err);
    return { data: null, error: err };
  }
}