import { supabase } from '../lib/supabase';
import { createNotification } from './socialService';

/**
 * Belirli bir kursun tüm geri bildirimlerini profillerle birlikte çeker
 */
export async function getCourseFeedbacks(courseId) {
  try {
    const { data, error } = await supabase
      .from('course_feedbacks')
      .select(`
        id,
        course_id,
        user_id,
        rating,
        comment,
        is_anonymous,
        created_at,
        profiles (
          full_name,
          avatar_emoji
        )
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Geri bildirimler alınamadı:', error.message);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('getCourseFeedbacks beklenmeyen hata:', err);
    return { data: [], error: err };
  }
}

/**
 * Kullanıcının ilgili kurstaki mevcut geri bildirimini getirir
 */
export async function getUserCourseFeedback(courseId, userId) {
  if (!userId || !courseId) return { data: null };

  try {
    const { data, error } = await supabase
      .from('course_feedbacks')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Kullanıcı geri bildirimi alınamadı:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Kursa geri bildirim (Like/Dislike + Yorum) ekler veya günceller
 */
export async function submitCourseFeedback({ courseId, userId, rating, comment = '', isAnonymous = false }) {
  if (!userId || !courseId || !rating) {
    return { error: new Error('Gerekli alanlar eksik.') };
  }

  try {
    // 1. Geri bildirimi kaydet / güncelle
    const { data, error } = await supabase
      .from('course_feedbacks')
      .upsert({
        course_id: courseId,
        user_id: userId,
        rating,
        comment: comment ? comment.trim() : null,
        is_anonymous: Boolean(isAnonymous),
        updated_at: new Date().toISOString()
      }, { onConflict: 'course_id,user_id' })
      .select()
      .single();

    if (error) {
      console.error('Geri bildirim kaydedilemedi:', error.message);
      return { data: null, error };
    }

    // 2. Kursun sahibini (eğitmeni) bulup bildirim gönder
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, created_by')
        .eq('id', courseId)
        .single();

      if (courseData?.created_by && courseData.created_by !== userId) {
        // Öğrencinin adını al (anonim değilse)
        let senderName = 'Bir öğrenci';
        if (!isAnonymous) {
          const { data: senderProf } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();
          if (senderProf?.full_name) senderName = senderProf.full_name;
        }

        const icon = rating === 'like' ? '👍' : '👎';
        await createNotification({
          userId: courseData.created_by,
          actorId: isAnonymous ? null : userId,
          type: 'course_feedback',
          title: `${icon} Yeni Kurs Değerlendirmesi`,
          message: `${senderName}, "${courseData.title}" kursunuza ${rating === 'like' ? 'olumlu' : 'olumsuz'} geri bildirim bıraktı.${comment ? ` Yorum: "${comment.slice(0, 80)}..."` : ''}`,
          data: { courseId, rating, isAnonymous }
        });
      }
    } catch (notifErr) {
      console.warn('Eğitmene bildirim iletilemedi:', notifErr);
    }

    return { data, error: null };
  } catch (err) {
    console.error('submitCourseFeedback beklenmeyen hata:', err);
    return { data: null, error: err };
  }
}

/**
 * Geri bildirimi sil
 */
export async function deleteCourseFeedback(feedbackId) {
  try {
    const { error } = await supabase
      .from('course_feedbacks')
      .delete()
      .eq('id', feedbackId);

    return { error };
  } catch (err) {
    return { error: err };
  }
}
