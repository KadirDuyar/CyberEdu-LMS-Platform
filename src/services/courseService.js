import { supabase } from '../lib/supabase';

// ─── ÖĞRENCİ KURS İŞLEMLERİ ───

// Kategorisine göre yayınlanmış kursları çeker
export async function getCoursesByCategory(category) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, lessons(count)')
    .eq('category', category)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
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

// Kursa kayıt olma
export async function enrollInCourse(userId, courseId) {
  const { data, error } = await supabase
    .from('enrollments')
    .upsert([{ user_id: userId, course_id: courseId }], { onConflict: 'user_id,course_id' })
    .select()
    .single();
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
    .select('course_id, courses(*, lessons(count))')
    .eq('user_id', userId);
    
  const mapped = data ? data.map(d => d.courses) : [];
  return { data: mapped, error };
}
