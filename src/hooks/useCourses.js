import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCoursesByCategory,
  getCourseWithLessons,
  checkEnrollment,
  enrollInCourse,
} from '../services/courseService';
import { getLessonProgress } from '../services/lessonService';

/**
 * useCourses — Öğrencinin learning_area'sına göre kursları getirir.
 * loading, error, courses state'lerini döner.
 */
export function useCourses() {
  const { profile } = useAuth();
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const category = profile?.learning_area ?? 'awareness';

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await getCoursesByCategory(category);

    if (err) {
      setError('Kurslar yüklenirken bir hata oluştu.');
    } else {
      setCourses(data ?? []);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    if (profile) fetchCourses();
  }, [profile, fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}

/**
 * useCourse — Tekil kurs detayı + ders listesi + enrollment durumu + progress
 */
export function useCourse(courseId) {
  const { user, profile } = useAuth();
  const [course, setCourse]       = useState(null);
  const [enrolled, setEnrolled]   = useState(false);
  const [progress, setProgress]   = useState({});   // lessonId → status
  const [loading, setLoading]     = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError]         = useState(null);

  const fetchAll = useCallback(async () => {
    if (!courseId || !user) return;
    setLoading(true);
    setError(null);

    // Paralel istekler
    const [courseRes, enrollRes] = await Promise.all([
      getCourseWithLessons(courseId),
      checkEnrollment(user.id, courseId),
    ]);

    if (courseRes.error) {
      setError('Kurs yüklenemedi.');
      setLoading(false);
      return;
    }

    setCourse(courseRes.data);
    setEnrolled(enrollRes);

    // Ders ilerlemelerini çek
    const lessonIds = courseRes.data?.lessons?.map((l) => l.id) ?? [];
    if (lessonIds.length > 0) {
      const { data: progressData } = await getLessonProgress(user.id, lessonIds);
      const progressMap = {};
      (progressData ?? []).forEach((p) => {
        progressMap[p.lesson_id] = p.status;
      });
      setProgress(progressMap);
    }

    setLoading(false);
  }, [courseId, user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const enroll = useCallback(async () => {
    if (!user || enrolling) return;
    setEnrolling(true);
    const { error: err } = await enrollInCourse(user.id, courseId);
    if (!err) setEnrolled(true);
    setEnrolling(false);
  }, [user, courseId, enrolling]);

  // Tamamlanan ders sayısı
  const completedCount = Object.values(progress).filter((s) => s === 'completed').length;
  const totalCount     = course?.lessons?.length ?? 0;
  const progressPct    = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    course,
    enrolled,
    progress,
    loading,
    enrolling,
    error,
    enroll,
    completedCount,
    totalCount,
    progressPct,
    refetch: fetchAll,
  };
}
