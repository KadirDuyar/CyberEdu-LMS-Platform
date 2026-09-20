import defaultCourses from './courses.json';

const COURSES_KEY = 'cyberedu_courses';
const ENROLLMENTS_KEY = 'cyberedu_enrollments';
const PROGRESS_KEY = 'cyberedu_progress';

// ─── COURSES ───
export function getAllCourses() {
  const stored = localStorage.getItem(COURSES_KEY);
  if (stored) return JSON.parse(stored);
  
  // İlk kez açılıyorsa varsayılan JSON'u kaydet
  localStorage.setItem(COURSES_KEY, JSON.stringify(defaultCourses));
  return defaultCourses;
}

export function saveAllCourses(courses) {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
}

// ─── ENROLLMENTS ───
export function getEnrollments() {
  const stored = localStorage.getItem(ENROLLMENTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function addEnrollment(userId, courseId) {
  const enrollments = getEnrollments();
  if (!enrollments.find(e => e.userId === userId && e.courseId === courseId)) {
    enrollments.push({ userId, courseId, date: new Date().toISOString() });
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(enrollments));
  }
}

// ─── PROGRESS ───
export function getAllProgress() {
  const stored = localStorage.getItem(PROGRESS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function updateProgress(userId, lessonId, status) {
  const progressList = getAllProgress();
  const idx = progressList.findIndex(p => p.userId === userId && p.lessonId === lessonId);
  
  if (idx !== -1) {
    progressList[idx].status = status;
  } else {
    progressList.push({ userId, lessonId, status });
  }
  
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressList));
}
