import { supabase } from '../lib/supabase';
import { createNotification } from './socialService';

/**
 * 6 haneli rastgele benzersiz katılım kodu üretir
 */
export function generateRandomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Okunması zor O, 0, 1, I hariç
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── COHORT (PROGRAM / GRUP) CRUD ──────────────────────────────────────────

/**
 * Öğretmenin oluşturduğu tüm kohortları / programları getirir
 */
export async function getTeacherCohorts(teacherId) {
  try {
    const { data, error } = await supabase
      .from('cohorts')
      .select(`
        *,
        cohort_members(count),
        cohort_weeks(count)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: (data || []).map((c) => ({
        ...c,
        member_count: c.cohort_members?.[0]?.count || 0,
        week_count: c.cohort_weeks?.[0]?.count || 0,
      })),
      error: null,
    };
  } catch (err) {
    console.error('getTeacherCohorts error:', err);
    return { data: [], error: err };
  }
}

/**
 * Tek bir kohortun detayını getirir
 */
export async function getCohortById(cohortId) {
  try {
    const { data, error } = await supabase
      .from('cohorts')
      .select('*')
      .eq('id', cohortId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('getCohortById error:', err);
    return { data: null, error: err };
  }
}

/**
 * Yeni kohort (program) oluşturur
 */
export async function createCohort({ title, description = '', teacher_id }) {
  try {
    const join_code = generateRandomCode(6);
    const { data, error } = await supabase
      .from('cohorts')
      .insert({
        title,
        description,
        teacher_id,
        join_code,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('createCohort error:', err);
    return { data: null, error: err };
  }
}

/**
 * Kohortu günceller
 */
export async function updateCohort(cohortId, updates) {
  try {
    const { data, error } = await supabase
      .from('cohorts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cohortId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('updateCohort error:', err);
    return { data: null, error: err };
  }
}

/**
 * Kohortu ve bağlı tüm kayıtları siler
 */
export async function deleteCohort(cohortId) {
  try {
    const { error } = await supabase
      .from('cohorts')
      .delete()
      .eq('id', cohortId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('deleteCohort error:', err);
    return { error: err };
  }
}

/**
 * Yeni katılım kodu üretip günceller
 */
export async function regenerateCohortCode(cohortId) {
  try {
    const newCode = generateRandomCode(6);
    const { data, error } = await supabase
      .from('cohorts')
      .update({ join_code: newCode, updated_at: new Date().toISOString() })
      .eq('id', cohortId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('regenerateCohortCode error:', err);
    return { data: null, error: err };
  }
}

// ─── COHORT MEMBERS (ÖĞRENCİ YÖNETİMİ) ──────────────────────────────────────

/**
 * Kohorta kayıtlı öğrencileri profil bilgileriyle getirir
 */
export async function getCohortMembers(cohortId) {
  try {
    const { data, error } = await supabase
      .from('cohort_members')
      .select(`
        id,
        joined_at,
        student_id,
        profiles:student_id (
          id,
          full_name,
          avatar_emoji,
          xp,
          level,
          learning_area,
          skill_level
        )
      `)
      .eq('cohort_id', cohortId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return {
      data: (data || []).map((m) => ({
        membershipId: m.id,
        joinedAt: m.joined_at,
        studentId: m.student_id,
        ...(m.profiles || { full_name: 'Bilinmeyen Öğrenci', avatar_emoji: '👤', xp: 0, level: 1 }),
      })),
      error: null,
    };
  } catch (err) {
    console.error('getCohortMembers error:', err);
    return { data: [], error: err };
  }
}

/**
 * İsme göre öğrenci arama (Role = 'student')
 */
export async function searchStudents(query = '', limit = 10) {
  try {
    let q = supabase
      .from('profiles')
      .select('id, full_name, avatar_emoji, xp, level, learning_area')
      .eq('role', 'student')
      .limit(limit);

    if (query.trim()) {
      q = q.ilike('full_name', `%${query.trim()}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('searchStudents error:', err);
    return { data: [], error: err };
  }
}

/**
 * Öğrenciyi kohorta manuel ekler
 */
export async function addMemberToCohort(cohortId, studentId) {
  try {
    const { data, error } = await supabase
      .from('cohort_members')
      .insert({
        cohort_id: cohortId,
        student_id: studentId,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('addMemberToCohort error:', err);
    return { data: null, error: err };
  }
}

/**
 * Öğrenciyi kohorttan çıkarır
 */
export async function removeMemberFromCohort(cohortId, studentId) {
  try {
    const { error } = await supabase
      .from('cohort_members')
      .delete()
      .eq('cohort_id', cohortId)
      .eq('student_id', studentId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('removeMemberFromCohort error:', err);
    return { error: err };
  }
}

// ─── COHORT WEEKS (HAFTALIK PLAN & GÖREVLER) ───────────────────────────────

/**
 * Belirli bir kohortun tüm haftalık görevlerini getirir
 */
export async function getCohortWeeks(cohortId) {
  try {
    const { data, error } = await supabase
      .from('cohort_weeks')
      .select(`
        *,
        courses (
          id,
          title,
          category,
          level,
          thumbnail_emoji
        ),
        lessons (
          id,
          title,
          xp_reward
        )
      `)
      .eq('cohort_id', cohortId)
      .order('week_number', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('getCohortWeeks error:', err);
    return { data: [], error: err };
  }
}

/**
 * Haftalık görev oluşturur veya günceller
 */
export async function saveCohortWeek(weekData) {
  try {
    const { data, error } = await supabase
      .from('cohort_weeks')
      .upsert(weekData)
      .select(`
        *,
        courses (id, title, thumbnail_emoji),
        lessons (id, title)
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('saveCohortWeek error:', err);
    return { data: null, error: err };
  }
}

/**
 * Haftalık görevi siler
 */
export async function deleteCohortWeek(weekId) {
  try {
    const { error } = await supabase
      .from('cohort_weeks')
      .delete()
      .eq('id', weekId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('deleteCohortWeek error:', err);
    return { error: err };
  }
}

/**
 * Öğrencilere yeni haftalık görev hakkında in-app bildirim gönderir
 */
export async function notifyCohortStudents({ cohortId, weekTitle, dueDate, teacherId }) {
  try {
    const { data: members, error } = await supabase
      .from('cohort_members')
      .select('student_id')
      .eq('cohort_id', cohortId);

    if (error || !members || members.length === 0) return { count: 0 };

    const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('tr-TR') : 'Belirtilmedi';

    const promises = members.map((m) =>
      createNotification({
        userId: m.student_id,
        actorId: teacherId,
        type: 'system', // Güvenli fallback, SQL constraint uyumlu
        title: `📅 Yeni Haftalık Görev: ${weekTitle}`,
        message: `Programınız için yeni haftalık görev planlandı! Son Tamamlama: ${formattedDate}`,
        data: { cohortId, weekTitle, dueDate },
      })
    );

    await Promise.allSettled(promises);
    return { count: members.length };
  } catch (err) {
    console.warn('notifyCohortStudents error:', err);
    return { count: 0, error: err };
  }
}

// ─── ÖĞRENCİ PROGRAM VE GÖREV İŞLEMLERİ ─────────────────────────────────────

/**
 * Öğrencinin koda göre bir gruba / programa katılması
 */
export async function joinCohortByCode(joinCode, studentId) {
  if (!joinCode || !studentId) {
    return { data: null, error: new Error('Geçersiz katılım kodu veya kullanıcı.') };
  }
  const cleanCode = joinCode.trim().toUpperCase();
  try {
    // 1. Koda ait aktif kohortu bul
    const { data: cohort, error: cohortErr } = await supabase
      .from('cohorts')
      .select('id, title, description, is_active, teacher_id, profiles:teacher_id(full_name)')
      .eq('join_code', cleanCode)
      .maybeSingle();

    if (cohortErr) throw cohortErr;
    if (!cohort) {
      return { data: null, error: new Error('Bu koda ait bir program bulunamadı. Lütfen kodu kontrol edin.') };
    }
    if (!cohort.is_active) {
      return { data: null, error: new Error('Bu program şu anda aktif değil veya duraklatılmış.') };
    }

    // 2. Öğrenci zaten üye mi?
    const { data: existingMember } = await supabase
      .from('cohort_members')
      .select('id')
      .eq('cohort_id', cohort.id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingMember) {
      return { data: cohort, error: new Error('Zaten bu programa kayıtlısınız!') };
    }

    // 3. Üye olarak ekle
    const { error: insertErr } = await supabase
      .from('cohort_members')
      .insert({
        cohort_id: cohort.id,
        student_id: studentId,
      });

    if (insertErr) throw insertErr;

    // 4. İlerlemeleri senkronize et
    await syncStudentCohortProgress(studentId);

    return { data: cohort, error: null };
  } catch (err) {
    console.error('joinCohortByCode error:', err);
    return { data: null, error: err };
  }
}

/**
 * Öğrencinin tamamladığı kurs veya derslere göre haftalık görevlerini otomatik senkronize eder
 */
export async function syncStudentCohortProgress(studentId) {
  if (!studentId) return;
  try {
    const { data: memberRows } = await supabase
      .from('cohort_members')
      .select('cohort_id')
      .eq('student_id', studentId);

    if (!memberRows || memberRows.length === 0) return;
    const cohortIds = memberRows.map((m) => m.cohort_id);

    const { data: weeks } = await supabase
      .from('cohort_weeks')
      .select('id, course_id, lesson_id, due_date')
      .in('cohort_id', cohortIds);

    if (!weeks || weeks.length === 0) return;

    // Tamamlanan dersler
    const { data: progressRows } = await supabase
      .from('lesson_progress')
      .select('lesson_id, status, completed_at')
      .eq('user_id', studentId)
      .eq('status', 'completed');

    const completedLessonIds = new Set((progressRows || []).map((p) => p.lesson_id));

    // Tamamlanan kurslar
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, status, completed_at')
      .eq('user_id', studentId);

    const completedCourseIds = new Set(
      (enrollments || []).filter((e) => e.status === 'completed').map((e) => e.course_id)
    );

    // Her hafta kontrolü
    for (const week of weeks) {
      let isCompleted = false;
      let completedAt = null;

      if (week.lesson_id) {
        if (completedLessonIds.has(week.lesson_id)) {
          isCompleted = true;
          const p = progressRows.find((x) => x.lesson_id === week.lesson_id);
          completedAt = p?.completed_at || new Date().toISOString();
        }
      } else if (week.course_id) {
        if (completedCourseIds.has(week.course_id)) {
          isCompleted = true;
          const e = enrollments.find((x) => x.course_id === week.course_id);
          completedAt = e?.completed_at || new Date().toISOString();
        }
      }

      if (isCompleted) {
        const isOverdue = week.due_date && new Date(completedAt) > new Date(week.due_date);
        await supabase
          .from('cohort_progress')
          .upsert(
            {
              cohort_week_id: week.id,
              student_id: studentId,
              status: isOverdue ? 'overdue' : 'completed',
              earned_xp: isOverdue ? 80 : 100,
              completed_at: completedAt,
            },
            { onConflict: 'cohort_week_id,student_id' }
          );
      }
    }
  } catch (err) {
    console.warn('syncStudentCohortProgress warn:', err);
  }
}

/**
 * Öğrencinin aktif programlarını ve haftalık görevlerini getirir
 */
export async function getStudentCohortData(studentId) {
  if (!studentId) return { cohorts: [], tasks: [], activeTask: null };
  try {
    await syncStudentCohortProgress(studentId);

    const { data: memberships, error: memErr } = await supabase
      .from('cohort_members')
      .select(`
        cohort_id,
        cohorts (
          id,
          title,
          description,
          join_code,
          is_active,
          teacher_id,
          profiles:teacher_id (full_name, avatar_emoji)
        )
      `)
      .eq('student_id', studentId);

    if (memErr) throw memErr;

    const cohorts = (memberships || [])
      .map((m) => m.cohorts)
      .filter((c) => c && c.is_active);

    if (cohorts.length === 0) {
      return { cohorts: [], tasks: [], activeTask: null };
    }

    const cohortIds = cohorts.map((c) => c.id);

    const { data: weeks, error: weekErr } = await supabase
      .from('cohort_weeks')
      .select(`
        *,
        cohorts (id, title),
        courses (id, title, category, level, thumbnail_emoji),
        lessons (id, title, xp_reward)
      `)
      .in('cohort_id', cohortIds)
      .order('week_number', { ascending: true });

    if (weekErr) throw weekErr;

    const { data: progressList } = await supabase
      .from('cohort_progress')
      .select('*')
      .eq('student_id', studentId);

    const progressMap = new Map((progressList || []).map((p) => [p.cohort_week_id, p]));
    const now = new Date();

    const tasks = (weeks || []).map((w) => {
      const prog = progressMap.get(w.id);
      const isCompleted = prog?.status === 'completed' || prog?.status === 'overdue';
      const dueDate = new Date(w.due_date);
      const unlockDate = new Date(w.unlock_date);
      const isLocked = w.is_locked || unlockDate > now;
      const isPastDue = dueDate < now;

      return {
        ...w,
        progress: prog || null,
        isCompleted,
        isLocked,
        isPastDue,
        status: isCompleted ? (prog?.status === 'overdue' ? 'overdue' : 'completed') : (isPastDue ? 'expired' : 'active'),
        earned_xp: prog?.earned_xp || 0,
      };
    });

    // Aktif görev: Tamamlanmamış ve kilitli olmayan ilk görev; hepsi tamamsa en son görev
    const activeTask = tasks.find((t) => !t.isCompleted && !t.isLocked) || tasks[tasks.length - 1] || null;

    return { cohorts, tasks, activeTask };
  } catch (err) {
    console.error('getStudentCohortData error:', err);
    return { cohorts: [], tasks: [], activeTask: null };
  }
}

/**
 * Haftalık liderlik tablosu verilerini hesaplar (Son 7 gün)
 */
export async function getWeeklyLeaderboardData(cohortId = null) {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: attempts } = await supabase
      .from('activity_attempts')
      .select('user_id, points_earned')
      .gte('attempted_at', oneWeekAgo);

    const weeklyXpMap = new Map();
    (attempts || []).forEach((a) => {
      const current = weeklyXpMap.get(a.user_id) || 0;
      weeklyXpMap.set(a.user_id, current + (a.points_earned || 0));
    });

    const { data: cohortProg } = await supabase
      .from('cohort_progress')
      .select('student_id, earned_xp')
      .gte('completed_at', oneWeekAgo);

    (cohortProg || []).forEach((cp) => {
      const current = weeklyXpMap.get(cp.student_id) || 0;
      weeklyXpMap.set(cp.student_id, current + (cp.earned_xp || 0));
    });

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student');

    if (cohortId) {
      const { data: memberIds } = await supabase
        .from('cohort_members')
        .select('student_id')
        .eq('cohort_id', cohortId);
      const ids = (memberIds || []).map((m) => m.student_id);
      if (ids.length > 0) {
        query = query.in('id', ids);
      } else {
        return [];
      }
    }

    const { data: profiles, error: profErr } = await query;
    if (profErr) throw profErr;

    const ranked = (profiles || []).map((p) => ({
      ...p,
      weekly_xp: weeklyXpMap.get(p.id) || 0,
    }));

    ranked.sort((a, b) => b.weekly_xp - a.weekly_xp || b.xp - a.xp);
    return ranked;
  } catch (err) {
    console.error('getWeeklyLeaderboardData error:', err);
    return [];
  }
}

// ─── ÖĞRETMEN İZLEME KONSOLU (COHORT PROGRESS MATRIX) ───────────────────────

/**
 * Eğitmen için kohort öğrenci ilerleme matrisini ve sınıf istatistiklerini getirir
 */
export async function getCohortProgressMatrix(cohortId) {
  if (!cohortId) return { students: [], weeks: [], stats: null, error: null };
  try {
    // 1. Kohort haftalarını çek (hafta numarasına göre)
    const { data: weeks, error: weeksErr } = await supabase
      .from('cohort_weeks')
      .select(`
        id,
        week_number,
        title,
        due_date,
        unlock_date,
        is_locked,
        course_id,
        lesson_id,
        courses (id, title, thumbnail_emoji),
        lessons (id, title)
      `)
      .eq('cohort_id', cohortId)
      .order('week_number', { ascending: true });

    if (weeksErr) throw weeksErr;

    // 2. Kohort üyelerini çek
    const { data: members, error: membersErr } = await supabase
      .from('cohort_members')
      .select(`
        student_id,
        joined_at,
        profiles:student_id (
          id,
          full_name,
          avatar_emoji,
          xp,
          level,
          learning_area
        )
      `)
      .eq('cohort_id', cohortId);

    if (membersErr) throw membersErr;

    const studentIds = (members || []).map((m) => m.student_id);
    if (studentIds.length === 0) {
      return {
        students: [],
        weeks: weeks || [],
        stats: {
          totalStudents: 0,
          totalWeeks: (weeks || []).length,
          avgCompletionRate: 0,
          totalXpEarned: 0,
          overdueCount: 0,
        },
        error: null,
      };
    }

    // 3. İlerleme kayıtlarını çek
    const weekIds = (weeks || []).map((w) => w.id);
    let progressRows = [];
    if (weekIds.length > 0) {
      const { data: prog, error: progErr } = await supabase
        .from('cohort_progress')
        .select('*')
        .in('cohort_week_id', weekIds)
        .in('student_id', studentIds);

      if (progErr) throw progErr;
      progressRows = prog || [];
    }

    // Harita oluştur: `${studentId}_${weekId}` -> progress
    const progressMap = new Map();
    progressRows.forEach((p) => {
      progressMap.set(`${p.student_id}_${p.cohort_week_id}`, p);
    });

    const now = new Date();
    let totalCohortXpAllStudents = 0;
    let totalCompletedTasksCount = 0;
    let overdueCount = 0;

    // 4. Öğrenci bazında haftalık ilerleme dökümü
    const studentMatrix = (members || []).map((m) => {
      const student = m.profiles || { id: m.student_id, full_name: 'Bilinmeyen Öğrenci' };
      let studentTotalXp = 0;
      let studentCompletedCount = 0;

      const weekStatuses = (weeks || []).map((w) => {
        const prog = progressMap.get(`${student.id}_${w.id}`);
        const isCompleted = prog?.status === 'completed' || prog?.status === 'overdue';
        const isOverdue = prog?.status === 'overdue';
        const dueDate = new Date(w.due_date);
        const isPastDue = dueDate < now;
        const isLocked = w.is_locked || new Date(w.unlock_date) > now;

        let statusKey = 'not_started';
        if (isCompleted) {
          statusKey = isOverdue ? 'completed_overdue' : 'completed';
          studentTotalXp += (prog?.earned_xp || 100);
          studentCompletedCount += 1;
          totalCompletedTasksCount += 1;
        } else if (isPastDue) {
          statusKey = 'overdue';
          overdueCount += 1;
        } else if (isLocked) {
          statusKey = 'locked';
        } else {
          statusKey = 'pending';
        }

        return {
          weekId: w.id,
          weekNumber: w.week_number,
          weekTitle: w.title,
          status: statusKey,
          earnedXp: prog?.earned_xp || (isCompleted ? 100 : 0),
          completedAt: prog?.completed_at || null,
          dueDate: w.due_date,
        };
      });

      totalCohortXpAllStudents += studentTotalXp;
      const totalPossible = (weeks || []).length || 1;
      const completionRate = Math.round((studentCompletedCount / totalPossible) * 100);

      return {
        ...student,
        joinedAt: m.joined_at,
        weekStatuses,
        totalCohortXp: studentTotalXp,
        completedCount: studentCompletedCount,
        completionRate,
      };
    });

    studentMatrix.sort((a, b) => b.completionRate - a.completionRate || b.totalCohortXp - a.totalCohortXp);

    const totalStudents = studentMatrix.length;
    const totalPossibleWeeksAll = totalStudents * ((weeks || []).length || 1);
    const avgCompletionRate = totalPossibleWeeksAll > 0
      ? Math.round((totalCompletedTasksCount / totalPossibleWeeksAll) * 100)
      : 0;

    return {
      students: studentMatrix,
      weeks: weeks || [],
      stats: {
        totalStudents,
        totalWeeks: (weeks || []).length,
        avgCompletionRate,
        totalXpEarned: totalCohortXpAllStudents,
        overdueCount,
      },
      error: null,
    };
  } catch (err) {
    console.error('getCohortProgressMatrix error:', err);
    return { students: [], weeks: [], stats: null, error: err };
  }
}

/**
 * Görevini henüz tamamlamamış öğrencilere toplu hatırlatma bildirimi gönderir
 */
export async function notifyIncompleteStudents({ cohortId, weekId, weekTitle, studentIds, teacherId }) {
  if (!studentIds || studentIds.length === 0) return { count: 0 };
  try {
    const promises = studentIds.map((studentId) =>
      createNotification({
        userId: studentId,
        actorId: teacherId,
        type: 'system',
        title: `⚠️ Görev Hatırlatması: ${weekTitle}`,
        message: `Programınızdaki "${weekTitle}" göreviniz henüz tamamlanmamış görünüyor. Hemen başlayarak XP kazanabilirsin!`,
        data: { cohortId, weekId },
      })
    );
    await Promise.allSettled(promises);
    return { count: studentIds.length };
  } catch (err) {
    console.warn('notifyIncompleteStudents error:', err);
    return { count: 0, error: err };
  }
}


