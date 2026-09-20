import { supabase } from '../lib/supabase';

export async function getLessonWithActivities(lessonId) {
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('*, courses(id, title, category)')
    .eq('id', lessonId)
    .single();

  if (lessonErr) return { data: null, error: lessonErr };

  const { data: activities, error: actErr } = await supabase
    .from('activities')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });

  return {
    data: { ...lesson, activities: activities || [] },
    error: actErr
  };
}

export async function startLesson(userId, lessonId) {
  // Tamamlanmış dersi in_progress'e çekmemek için kontrol
  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('status')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (existing?.status === 'completed') {
    return { data: existing, error: null };
  }

  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: 'in_progress'
      },
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: true }
    )
    .select()
    .single();

  return { data, error };
}

export async function completeLesson(userId, lessonId) {
  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,lesson_id' }
    )
    .select()
    .single();

  return { data, error };
}

export async function rollbackLessonCompletion(userId, lessonId) {
  const { data, error } = await supabase
    .from('lesson_progress')
    .update({ status: 'in_progress', completed_at: null })
    .eq('user_id', userId)
    .eq('lesson_id', lessonId);
  return { data, error };
}

export async function saveActivityAttempt({ userId, activityId, userAnswer, isCorrect, pointsEarned }) {
  const { data, error } = await supabase
    .from('activity_attempts')
    .insert({
      user_id: userId,
      activity_id: activityId,
      user_answer: typeof userAnswer === 'object' ? userAnswer : { val: userAnswer },
      is_correct: isCorrect,
      points_earned: pointsEarned
    })
    .select()
    .single();

  return { data, error };
}

export async function getLessonProgress(userId, lessonIds) {
  if (!userId || !lessonIds?.length) return { data: [], error: null };

  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);

  return { data: data ?? [], error };
}
