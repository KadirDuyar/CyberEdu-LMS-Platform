import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTeacherCourses, deleteCourse, createDemoCourse } from '../../services/teacherService';
import DashboardLayout from '../../layouts/DashboardLayout';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card from '../../components/Card';
import { Plus, BookOpen, Edit, Eye, Shield, Code2, Trash2, Wand2, AlertCircle, Users } from 'lucide-react';

export default function TeacherCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadCourses();
  }, [user]);

  async function loadCourses() {
    if (!user) return;
    setLoading(true);
    const { data } = await getTeacherCourses(user.id);
    if (data) setCourses(data);
    setLoading(false);
  }

  const handleCreateCourse = () => {
    navigate('/teacher/courses/new');
  };

  const handleCreateDemo = async () => {
    if (!user) return;
    setSeeding(true);
    const { error } = await createDemoCourse(user.id);
    setSeeding(false);
    
    if (error) {
      showToast('Hata: ' + error.message, 'error');
    } else {
      showToast('Şablon kurslar başarıyla eklendi!');
      loadCourses();
    }
  };

  const handleDelete = async (courseId, courseTitle) => {
    if (window.confirm(`"${courseTitle}" kursunu silmek istediğinize emin misiniz?`)) {
      const { error } = await deleteCourse(courseId);
      if (error) showToast('Hata: ' + error.message, 'error');
      else {
        showToast('Kurs silindi.');
        loadCourses();
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl text-slate-900 dark:text-white">Kurslarım</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Öğrenciler için oluşturduğun tüm içerikler</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCreateDemo}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-slate-300 font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              {seeding ? <LoadingSpinner size="sm" /> : <Wand2 size={18} />} Örnek Kurs Yükle
            </button>
            <button
              onClick={handleCreateCourse}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-lg shadow-violet-500/30"
            >
              <Plus size={18} /> Yeni Kurs Oluştur
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner fullPage />
        ) : courses.length === 0 ? (
          <EmptyState
            emoji="📚"
            title="Henüz kursun yok"
            desc="Öğrenciler için ilk siber güvenlik kursunu oluşturmaya başla."
            action={{ label: 'Kurs Oluştur', onClick: handleCreateCourse }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => {
              const isAwareness = course.category === 'awareness';
              const Icon = isAwareness ? Shield : Code2;
              const bannerColor = isAwareness 
                ? 'from-cyan-50 to-blue-50/50 border-cyan-200 dark:from-cyan-900/40 dark:to-blue-900/20 dark:border-cyan-500/20' 
                : 'from-orange-50 to-amber-50/50 border-orange-200 dark:from-orange-900/40 dark:to-red-900/20 dark:border-orange-500/20';

              return (
                <Card key={course.id} hover className={`border ${bannerColor} p-0 overflow-hidden flex flex-col bg-white dark:bg-slate-900/60 shadow-sm`}>
                  <div className={`p-5 flex-1 bg-gradient-to-br ${bannerColor}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl bg-white/80 dark:bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10">
                        {course.thumbnail_emoji}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAwareness ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-white/10 border-cyan-300 dark:border-cyan-500/30' : 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-white/10 border-orange-300 dark:border-orange-500/30'}`}>
                          {isAwareness ? 'Farkındalık' : 'Teknik'}
                        </span>
                        <button 
                          onClick={() => handleDelete(course.id, course.title)} 
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors bg-white/60 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/20 p-1.5 rounded-lg border border-slate-200/50 dark:border-transparent"
                          title="Kursu Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{course.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <BookOpen size={14} />
                      <span>{course.lessons?.[0]?.count || 0} Ders</span>
                      <span className="mx-1">•</span>
                      <span className={course.is_published ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                        {course.is_published ? 'Yayında' : 'Taslak'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <button
                      onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                      className="py-3 text-xs text-slate-700 dark:text-slate-300 font-medium hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit size={14} /> Düzenle
                    </button>
                    <button
                      onClick={() => navigate(`/teacher/courses/${course.id}/details`)}
                      className="py-3 text-xs text-cyan-700 dark:text-cyan-400 font-medium hover:text-cyan-800 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Users size={14} /> Detaylar
                    </button>
                    <button
                      onClick={() => navigate(`/student/courses/${course.id}`)}
                      className="py-3 text-xs text-violet-700 dark:text-violet-400 font-medium hover:text-violet-800 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} /> Önizle
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>
      {/* Toast Bildirimi */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl transition-all duration-300 animate-slide-up bg-slate-900/95 text-sm font-medium ${
          toast.type === 'error' ? 'border-rose-500/50 text-rose-300' : 'border-emerald-500/50 text-emerald-300'
        }`}>
          <AlertCircle size={18} className={`shrink-0 ${toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`} />
          <span>{toast.message}</span>
        </div>
      )}
    </DashboardLayout>
  );
}
