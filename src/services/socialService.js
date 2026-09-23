import { supabase } from '../lib/supabase';

// ─── TAKİP SİSTEMİ (FOLLOWS) ────────────────────────────────────────────────

/**
 * Kullanıcının takip ettiği öğrenci id'lerini set olarak getirir
 */
export async function getFollowingIds(userId) {
  if (!userId) return new Set();
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error) {
      console.error('Takip listesi alınamadı:', error.message);
      return new Set();
    }

    return new Set((data || []).map((f) => f.following_id));
  } catch (err) {
    console.error('getFollowingIds hata:', err);
    return new Set();
  }
}

/**
 * Bir kullanıcıyı takip et ve bildirim gönder
 */
export async function followUser(followerId, followingId, followerName = 'Bir öğrenci') {
  if (!followerId || !followingId || followerId === followingId) return { success: false };

  try {
    const { error } = await supabase
      .from('user_follows')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) {
      console.error('Takip edilemedi:', error.message);
      return { success: false, error };
    }

    // Takip edilen kişiye bildirim gönder
    await createNotification({
      userId: followingId,
      actorId: followerId,
      type: 'new_follower',
      title: '🤝 Yeni Takipçi!',
      message: `${followerName} seni takip etmeye başladı. Başarılarını birlikte kutlayın!`,
      data: { followerId }
    });

    return { success: true };
  } catch (err) {
    console.error('followUser hata:', err);
    return { success: false, error: err };
  }
}

/**
 * Takibi bırak
 */
export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) return { success: false };

  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      console.error('Takipten çıkılamadı:', error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('unfollowUser hata:', err);
    return { success: false, error: err };
  }
}

// ─── BİLDİRİM SİSTEMİ (NOTIFICATIONS) ───────────────────────────────────────

/**
 * Kullanıcıya ait bildirimleri listeler
 */
export async function getNotifications(userId, limit = 20) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Bildirimler yüklenemedi:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('getNotifications hata:', err);
    return [];
  }
}

/**
 * Yeni bildirim kaydı oluşturur
 */
export async function createNotification({ userId, actorId = null, type, title, message, data = {} }) {
  if (!userId || !title || !message) return null;

  try {
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        title,
        message,
        data,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.warn('Bildirim oluşturulamadı:', error.message);
      return null;
    }

    return inserted;
  } catch (err) {
    console.warn('createNotification hata:', err);
    return null;
  }
}

/**
 * Bildirimi okundu olarak işaretle
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  } catch (err) {
    console.error('markNotificationAsRead hata:', err);
  }
}

/**
 * Kullanıcının tüm bildirimlerini okundu yap
 */
export async function markAllNotificationsAsRead(userId) {
  if (!userId) return;
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  } catch (err) {
    console.error('markAllNotificationsAsRead hata:', err);
  }
}

/**
 * Öğrenci bir kursu tamamladığında tüm takipçilerine bildirim gönderir
 */
export async function notifyFollowersCourseCompleted({ userId, userName, courseId, courseTitle }) {
  if (!userId || !courseTitle) return;

  try {
    // Bu kullanıcıyı kimler takip ediyor?
    const { data: followers, error } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (error || !followers || followers.length === 0) return;

    // Her takipçiye bildirim kaydı aç
    const notificationsToInsert = followers.map((f) => ({
      user_id: f.follower_id,
      actor_id: userId,
      type: 'friend_completed_course',
      title: '🎓 Arkadaşın Bir Kursu Tamamladı!',
      message: `Takip ettiğin ${userName || 'bir arkadaşın'}, "${courseTitle}" kursunun tüm derslerini başarıyla bitirdi! Tebrik etmeye ne dersin?`,
      data: { courseId, completedUserId: userId },
      is_read: false
    }));

    await supabase.from('notifications').insert(notificationsToInsert);
  } catch (err) {
    console.warn('notifyFollowersCourseCompleted hata:', err);
  }
}
