// ─── MÜFREDAT VE KURS SIRALAMA TANIMLARI ───
export const TECHNICAL_COURSE_ORDER = [
  'web uygulama mimarisi',
  'güvenli kod yazımı',
  'http & https',
  'sql injection',
  'xss',
];

export const AWARENESS_COURSE_ORDER = [
  'siber güvenliğe giriş',
  'phishing',
  'güçlü parola',
  'mfa',
  'sosyal mühendislik',
];

export function getCourseSortOrder(course, area) {
  const title = (course?.title || '').toLowerCase();
  const orderList = area === 'technical' ? TECHNICAL_COURSE_ORDER : AWARENESS_COURSE_ORDER;
  const idx = orderList.findIndex((keyword) => title.includes(keyword));
  return idx !== -1 ? idx : 999;
}

export function sortCoursesByCurriculum(coursesList, area) {
  if (!coursesList || !Array.isArray(coursesList)) return [];
  return [...coursesList].sort((a, b) => {
    // 1. Zorunlu kurslar önce gelsin
    const aMandatory = a.is_mandatory !== false && a.course_type !== 'elective';
    const bMandatory = b.is_mandatory !== false && b.course_type !== 'elective';
    if (aMandatory && !bMandatory) return -1;
    if (!aMandatory && bMandatory) return 1;

    // 2. Müfredat sırasına göre
    const orderA = getCourseSortOrder(a, area);
    const orderB = getCourseSortOrder(b, area);
    if (orderA !== orderB) return orderA - orderB;

    // 3. Tarihe göre (eskiden yeniye)
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
}

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
  const sorted = data ? sortCoursesByCurriculum(data, category) : data;
  return { data: sorted, error };
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
