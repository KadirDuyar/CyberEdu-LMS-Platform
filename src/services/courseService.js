import { supabase } from '../lib/supabase';

// ─── ÖĞRENCİ KURS İŞLEMLERİ ───

// Kategorisine göre yayınlanmış kursları çeker
export async function getCoursesByCategory(category) {
  let query = supabase
    .from('courses')
    .select('*, lessons(id, title, xp_reward, is_published, order_index)')
    .eq('is_published', true)
    .order('created_at', { ascending: true });

  if (category) {
    query = query.or(`category.eq.${category},category.eq.both,course_type.eq.elective,is_mandatory.eq.false`);
  }

  const { data, error } = await query;
  return { data, error };
}

// Kurs detayını ve ders listesini çeker
export async function getCourseWithLessons(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, lessons(id, title, xp_reward, is_published, order_index)')
    .eq('id', courseId)
    .single();

  if (data?.lessons) {
    data.lessons.sort((a, b) => a.order_index - b.order_index);
  }
  return { data, error };
}

export async function enrollInCourse(userId, courseId) {
  const { data, error } = await supabase
    .from('enrollments')
    .upsert([{ user_id: userId, course_id: courseId, enrolled_at: new Date().toISOString() }], { onConflict: 'user_id,course_id' })
    .select()
    .single();
  return { data, error };
}

// Kurstan ayrılma
export async function dropCourse(userId, courseId) {
  const { data, error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  return { data, error };
}

// Kayıt kontrolü
export async function checkEnrollment(userId, courseId) {
  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  return !!data;
}

// Öğrencinin kayıtlı olduğu kursları getir
export async function getEnrolledCourses(userId) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('course_id, courses(*, lessons(id))')
    .eq('user_id', userId);
    
  const mapped = data ? data.map(d => ({
    ...d.courses,
    lessons: [{ count: d.courses.lessons?.length || 0 }]
  })) : [];
  return { data: mapped, error };
}
