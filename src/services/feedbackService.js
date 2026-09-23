import { supabase } from '../lib/supabase';
import { createNotification } from './socialService';

/**
 * Belirli bir kursun tüm geri bildirimlerini profillerle birlikte çeker
 */
export async function getCourseFeedbacks(courseId) {
  try {
    const { data, error } = await supabase
      .from('course_feedbacks')
      .select('*, profiles:user_id(id, full_name, avatar_emoji)')
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

    // 2. Kursun sahibini (eğitmeni) veya genel eğitmenleri bulup bildirim gönder
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, created_by')
        .eq('id', courseId)
        .single();

      let targetTeacherIds = [];

      if (courseData?.created_by && courseData.created_by !== userId) {
        targetTeacherIds.push(courseData.created_by);
      } else {
        // Eğer kurs created_by içermiyorsa (örneğin tohum/seed kurslar), sistemdeki eğitmenlere bildir
        const { data: teachers } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'teacher');
        
        if (teachers && teachers.length > 0) {
          targetTeacherIds = teachers.map((t) => t.id).filter((tId) => tId !== userId);
        }
      }

      if (targetTeacherIds.length > 0) {
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
        const courseTitle = courseData?.title || 'Kurs';

        for (const teacherId of targetTeacherIds) {
          await createNotification({
            userId: teacherId,
            actorId: isAnonymous ? null : userId,
            type: 'course_feedback',
            title: `${icon} Yeni Kurs Değerlendirmesi`,
            message: `${senderName}, "${courseTitle}" kursuna ${rating === 'like' ? 'olumlu' : 'olumsuz'} geri bildirim bıraktı.${comment ? ` Yorum: "${comment.slice(0, 80)}..."` : ''}`,
            data: { courseId, rating, isAnonymous }
          });
        }
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

/**
 * Eğitmenin bir öğrenci yorumuna yanıt vermesi (ve öğrenciye bildirim göndermesi)
 */
export async function replyToFeedback({ feedbackId, reply, studentId, courseId }) {
  if (!feedbackId || !reply?.trim()) {
    return { error: new Error('Yanıt metni boş olamaz.') };
  }

  try {
    // 1. Önce güvenli RPC fonksiyonunu dene
    const { error: rpcError } = await supabase.rpc('reply_course_feedback', {
      p_feedback_id: feedbackId,
      p_reply: reply.trim()
    });

    if (!rpcError) {
      return { success: true, error: null };
    }

    // 2. Eğer RPC henüz çalıştırılmadıysa doğrudan update yap
    const { error: updateError } = await supabase
      .from('course_feedbacks')
      .update({
        teacher_reply: reply.trim(),
        replied_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Yoruma yanıt verilemedi:', updateError.message);
      return { success: false, error: updateError };
    }

    // Öğrenciye bildirim gönder
    if (studentId && courseId) {
      try {
        const { data: cData } = await supabase
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .single();

        const { data: userData } = await supabase.auth.getUser();

        await createNotification({
          userId: studentId,
          actorId: userData?.user?.id,
          type: 'course_feedback',
          title: 'Eğitmen Yorumunuzu Yanıtladı 💬',
          message: `Eğitmeniniz, "${cData?.title || 'Kurs'}" hakkındaki yorumunuza yanıt verdi.`,
          data: { courseId, feedbackId }
        });
      } catch (nErr) {
        console.warn('Öğrenci bildirimi gönderilemedi:', nErr);
      }
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('replyToFeedback beklenmeyen hata:', err);
    return { success: false, error: err };
  }
}
