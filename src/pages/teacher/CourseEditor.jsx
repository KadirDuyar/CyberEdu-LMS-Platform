import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCourseDetails, saveCourse, deleteLesson } from '../../services/teacherService';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card from '../../components/Card';
import { Save, ArrowLeft, Plus, Edit, CheckCircle2, XCircle, Trash2, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import AiPromptModal from '../../components/ui/AiPromptModal';

export default function CourseEditor() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isNew = courseId === 'new' || !courseId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const [course, setCourse] = useState({
    title: '',
    description: '',
    category: 'awareness',
    level: 'beginner',
    thumbnail_emoji: '🛡️',
    is_published: true,
  });

  const [lessons, setLessons] = useState([]);

  const showNotif = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!isNew) {
      async function load() {
        const { data } = await getCourseDetails(courseId);
        if (data) {
          const { lessons: courseLessons, ...courseData } = data;
          setCourse(courseData);
          if (courseLessons) {
            setLessons(courseLessons.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
          }
        }
        setLoading(false);
      }
      load();
    }
  }, [courseId, isNew]);

  const [generatingWithAI, setGeneratingWithAI] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const handleGenerateCourseWithAI = async ({ prompt: topic }) => {
    if (!topic || !topic.trim()) return;

    setGeneratingWithAI(true);
    try {
      const { generateCourseWithAI } = await import('../../services/aiService');
      const aiCourse = await generateCourseWithAI(topic.trim());
      setCourse((prev) => ({
        ...prev,
        title: aiCourse.title || prev.title,
        description: aiCourse.description || prev.description,
        category: aiCourse.category || prev.category,
        level: aiCourse.level || prev.level,
        thumbnail_emoji: aiCourse.thumbnail_emoji || prev.thumbnail_emoji,
      }));
      setShowAiModal(false);
      showNotif('success', 'Kurs detayları yapay zeka ile başarıyla oluşturuldu!');
    } catch (err) {
      showNotif('error', 'Yapay zeka hatası: ' + err.message);
    } finally {
      setGeneratingWithAI(false);
    }
  };

  const handleChange = (field, value) => {
    setCourse((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!course.title) {
      return showNotif('error', 'Lütfen kurs başlığını girin.');
    }

    setSaving(true);
    const payload = { ...course, created_by: user.id, is_published: true };
    const { data, error } = await saveCourse(payload);
    setSaving(false);

    if (error) {
      showNotif('error', 'Kaydedilirken bir hata oluştu.');
    } else {
      showNotif('success', 'Kurs başarıyla kaydedildi.');
      if (isNew) {
        setTimeout(() => {
          navigate(`/teacher/courses/${data.id}/edit`, { replace: true });
        }, 800);
      }
    }
  };

  const moveLesson = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const previousLessons = [...lessons];
    const newLessons = [...lessons];
    const [moved] = newLessons.splice(index, 1);
    newLessons.splice(targetIndex, 0, moved);

    const updatedWithOrder = newLessons.map((l, idx) => ({ ...l, order_index: idx }));
    setLessons(updatedWithOrder);

    const lessonIds = updatedWithOrder.map((l) => l.id);
    const { error } = await supabase.rpc('reorder_lessons', {
      p_course_id: courseId,
      p_lesson_ids: lessonIds
    });

    if (error) {
      setLessons(previousLessons);
      showNotif('error', 'Sıralama güncellenemedi: ' + error.message);
    } else {
      showNotif('success', 'Ders sırası güncellendi.');
    }
  };

  const handleDeleteLesson = async (e, id, title) => {
    e.stopPropagation();
    if (window.confirm(`"${title}" adlı dersi silmek istediğinize emin misiniz?`)) {
      const { error } = await deleteLesson(id);
      if (error) {
        showNotif('error', 'Ders silinirken hata oluştu.');
      } else {
        showNotif('success', 'Ders silindi.');
        setLessons(lessons.filter((l) => l.id !== id));
      }
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner fullPage/></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {notification && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border animate-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={20}/> : <XCircle size={20}/>}
            <span className="font-semibold text-sm">{notification.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button onClick={() => navigate('/teacher/courses')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-fit">
            <ArrowLeft size={16}/> Kurslara Dön
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-lg shadow-violet-500/30 disabled:opacity-50"
          >
            {saving ? <LoadingSpinner size="sm"/> : <Save size={18}/>} Kaydet
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Card className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display font-bold text-lg text-white">Kurs Detayları</h2>
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  disabled={generatingWithAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/30 text-xs font-bold transition-all disabled:opacity-50 shadow-sm hover:scale-105"
                  title="Yapay Zeka ile kurs başlığı, açıklaması ve seviyesini otomatik doldur"
                >
                  <Sparkles size={14} className={generatingWithAI ? 'animate-spin' : ''} />
                  <span>{generatingWithAI ? 'Üretiliyor...' : '✨ YZ ile Kurs Oluştur'}</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kurs Başlığı</label>
                  <input
                    type="text"
                    value={course.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="form-input w-full"
                    placeholder="Örn: Temel Siber Güvenlik"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Açıklama</label>
                  <textarea
                    value={course.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="form-input w-full min-h-[100px] resize-y"
                    placeholder="Kurs ne hakkında?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kategori (Hedef Kitle)</label>
                    <select
                      value={course.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="form-input w-full appearance-none"
                    >
                      <option value="awareness">🛡️ Farkındalık (Normal Öğrenci)</option>
                      <option value="technical">⚔️ Teknik (İleri Seviye)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Zorluk Seviyesi</label>
                    <select
                      value={course.level}
                      onChange={(e) => handleChange('level', e.target.value)}
                      className="form-input w-full appearance-none"
                    >
                      <option value="beginner">🌱 Başlangıç</option>
                      <option value="intermediate">🔥 Orta</option>
                      <option value="advanced">⚡ İleri</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-24">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Emoji</label>
                    <input
                      type="text"
                      value={course.thumbnail_emoji}
                      onChange={(e) => handleChange('thumbnail_emoji', e.target.value)}
                      className="form-input w-full text-center text-xl"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card className="h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <h2 className="font-display font-bold text-lg text-white">Dersler ({lessons.length})</h2>
                {!isNew && (
                  <button
                    onClick={() => navigate(`/teacher/courses/${courseId}/lessons/new`)}
                    className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center hover:bg-violet-500/30 transition-colors"
                    title="Yeni Ders Ekle"
                  >
                    <Plus size={16}/>
                  </button>
                )}
              </div>

              {isNew ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-white/5 rounded-xl">
                  <p className="text-slate-500 text-sm">Ders eklemek için önce kursu kaydedin.</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-white/10 rounded-xl">
                  <p className="text-slate-400 text-sm mb-3">Bu kursta hiç ders yok.</p>
                  <button
                    onClick={() => navigate(`/teacher/courses/${courseId}/lessons/new`)}
                    className="text-xs font-bold text-violet-400 hover:text-violet-300"
                  >
                    + İlk dersi ekle
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className="group flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all"
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveLesson(idx, -1); }}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-500 hover:text-violet-400 hover:bg-white/10 disabled:opacity-20"
                          title="Yukarı Taşı"
                        >
                          <ArrowUp size={12}/>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveLesson(idx, 1); }}
                          disabled={idx === lessons.length - 1}
                          className="p-1 rounded text-slate-500 hover:text-violet-400 hover:bg-white/10 disabled:opacity-20"
                          title="Aşağı Taşı"
                        >
                          <ArrowDown size={12}/>
                        </button>
                      </div>

                      <div
                        onClick={() => navigate(`/teacher/courses/${courseId}/lessons/${lesson.id}/edit`)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <p className="text-sm font-semibold text-white truncate">{lesson.title}</p>
                        <p className="text-xs text-slate-500">Adım {idx + 1} {lesson.is_published ? '• Yayında' : ''}</p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/teacher/courses/${courseId}/lessons/${lesson.id}/edit`)}
                          className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-500/20 rounded-lg"
                        >
                          <Edit size={14}/>
                        </button>
                        <button
                          onClick={(e) => handleDeleteLesson(e, lesson.id, lesson.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* YZ ile Kurs Oluşturma Modalı */}
      <AiPromptModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onSubmit={handleGenerateCourseWithAI}
        title="✨ Yapay Zeka ile Kurs Oluştur"
        subtitle="Hangi konuda bir siber güvenlik kursu oluşturmak istediğinizi belirtin."
        placeholder="Örn: Ağ Sızma Testleri, Web Güvenliği (OWASP), Adli Bilişim Temelleri..."
        suggestions={[
          "Web Uygulama Güvenliği ve OWASP Top 10",
          "Ağ Protokolleri ve Paket Analizi",
          "Sosyal Mühendislik ve Oltalama Savunması",
          "Kriptografi ve Güvenli İletişim",
          "Zararlı Yazılım Analizi ve Tespiti"
        ]}
        loading={generatingWithAI}
      />
    </DashboardLayout>
  );
}