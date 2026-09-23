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
 * Kullanıcının takip ettiği öğrencileri profil detaylarıyla birlikte getirir (Profilim sayfası için)
 */
export async function getFollowedUsersWithProfiles(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        following_id,
        created_at,
        profiles:following_id (
          id,
          full_name,
          role,
          avatar_emoji,
          xp,
          level,
          learning_area,
          skill_level
        )
      `)
      .eq('follower_id', userId);

    if (error) {
      console.error('Takip edilenler alınamadı:', error.message);
      return [];
    }

    return (data || [])
      .map((item) => ({
        ...item.profiles,
        followed_at: item.created_at,
      }))
      .filter((p) => p && p.id);
  } catch (err) {
    console.error('getFollowedUsersWithProfiles hata:', err);
    return [];
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
 * Kullanıcıya ait bildirimleri listeler (Öğretmenler için doğrudan DB course_feedbacks ile zenginleştirilir)
 */
export async function getNotifications(userId, limit = 20) {
  if (!userId) return [];

  try {
    const { data: directNotifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Bildirimler yüklenemedi:', error.message);
    }

    const notifList = directNotifs ? [...directNotifs] : [];

    // Eğitmen kontrolü: Kurslarına yapılan yorumları doğrudan course_feedbacks tablosundan da çek
    try {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (prof?.role === 'teacher') {
        const { data: courseFeedbacks } = await supabase
          .from('course_feedbacks')
          .select(`
            id,
            rating,
            comment,
            is_anonymous,
            created_at,
            course_id,
            courses (
              id,
              title,
              created_by
            ),
            profiles (
              full_name,
              avatar_emoji
            )
          `)
          .order('created_at', { ascending: false })
          .limit(15);

        if (courseFeedbacks && courseFeedbacks.length > 0) {
          const relevantFeedbacks = courseFeedbacks.filter(
            (fb) => !fb.courses?.created_by || fb.courses.created_by === userId
          );

          for (const fb of relevantFeedbacks) {
            const alreadyExists = notifList.some(
              (n) => n.data?.courseId === fb.course_id && (n.data?.feedbackId === fb.id || Math.abs(new Date(n.created_at) - new Date(fb.created_at)) < 5000)
            );

            if (!alreadyExists) {
              const studentName = fb.is_anonymous ? 'Bir öğrenci (Anonim)' : (fb.profiles?.full_name || 'Bir öğrenci');
              const courseTitle = fb.courses?.title || 'Kurs';
              const icon = fb.rating === 'like' ? '👍' : '👎';
              notifList.push({
                id: `fb_${fb.id}`,
                user_id: userId,
                actor_id: fb.is_anonymous ? null : fb.profiles?.id,
                type: 'course_feedback',
                title: `${icon} Yeni Kurs Değerlendirmesi`,
                message: `${studentName}, "${courseTitle}" kursuna ${fb.rating === 'like' ? 'olumlu' : 'olumsuz'} geri bildirim bıraktı.${fb.comment ? ` Yorum: "${fb.comment.slice(0, 80)}..."` : ''}`,
                data: { courseId: fb.course_id, feedbackId: fb.id, rating: fb.rating },
                is_read: false,
                created_at: fb.created_at
              });
            }
          }
        }
      }
    } catch (fbErr) {
      console.warn('Geri bildirim bildirimleri çekilirken hata:', fbErr);
    }

    notifList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return notifList.slice(0, limit);
  } catch (err) {
    console.error('getNotifications hata:', err);
    return [];
  }
}

/**
 * Yeni bildirim kaydı oluşturur (RLS SELECT kısıtlamasına takılmadan güvenli insert)
 */
export async function createNotification({ userId, actorId = null, type, title, message, data = {} }) {
  if (!userId || !title || !message) return null;

  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        title,
        message,
        data,
        is_read: false
      });

    if (error) {
      console.warn('Bildirim oluşturulamadı:', error.message);
      return null;
    }

    return { success: true };
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
