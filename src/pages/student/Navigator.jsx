import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Shield, Code2, ChevronRight, ChevronLeft,
  CheckCircle, Zap, Target, BookOpen, ArrowRight,
} from 'lucide-react';

// ─── Adım tanımları ────────────────────────────────────────────────────────────
// CyberEdu LMS v1.0.1
const STEPS = ['Hoş Geldin', 'Öğrenci Tipi', 'Seviye', 'Önerilen Yol'];

// ─── Öğrenci tipi seçenekleri ─────────────────────────────────────────────────
const STUDENT_TYPES = [
  {
    value: 'awareness',
    label: 'Normal Kullanıcı',
    emoji: '🛡️',
    subtitle: 'Farkındalık & Korunma',
    desc: 'Phishing, güçlü parola, MFA, sosyal mühendislik gibi konuları öğrenerek günlük dijital hayatımı güvenli hale getirmek istiyorum.',
    topics: ['Phishing Tespiti', 'Güçlü Parola Kullanımı', 'MFA & 2FA', 'Sosyal Mühendislik', 'Güvenli İnternet'],
    color: 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_25px_rgba(6,182,212,0.2)]',
    hoverColor: 'hover:border-cyan-400/70 hover:bg-cyan-500/10',
    inactiveColor: 'border-white/10 bg-white/5',
    textColor: 'text-cyan-300',
    badgeColor: 'bg-cyan-500/20 text-cyan-300',
    icon: Shield,
  },
  {
    value: 'technical',
    label: 'Teknik Öğrenci',
    emoji: '⚔️',
    subtitle: 'Web Güvenliği & Teknik',
    desc: 'HTTP, SQL Injection, XSS gibi teknik konuları anlayarak yazılım güvenliğini öğrenmek ve zafiyet tespiti yapmak istiyorum.',
    topics: ['HTTP & HTTPS Temelleri', 'SQL Injection', 'XSS Saldırıları', 'Güvenli Kod Yazımı', 'Web Zafiyetleri'],
    color: 'border-orange-400 bg-orange-500/15 shadow-[0_0_25px_rgba(249,115,22,0.2)]',
    hoverColor: 'hover:border-orange-400/70 hover:bg-orange-500/10',
    inactiveColor: 'border-white/10 bg-white/5',
    textColor: 'text-orange-300',
    badgeColor: 'bg-orange-500/20 text-orange-300',
    icon: Code2,
  },
];

// ─── Seviye seçenekleri ───────────────────────────────────────────────────────
const SKILL_LEVELS = [
  {
    value: 'beginner',
    label: 'Yeni Başlıyorum',
    emoji: '🌱',
    desc: 'Siber güvenlik hakkında çok az bilgim var, sıfırdan başlamak istiyorum.',
    color: 'border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-500/10',
    activeColor: 'border-emerald-400 bg-emerald-500/15',
    textColor: 'text-emerald-400',
  },
  {
    value: 'intermediate',
    label: 'Temel Bilgim Var',
    emoji: '🔥',
    desc: 'Bazı temel kavramları biliyorum, daha derine inmek istiyorum.',
    color: 'border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/10',
    activeColor: 'border-amber-400 bg-amber-500/15',
    textColor: 'text-amber-400',
  },
  {
    value: 'advanced',
    label: 'Deneyimliyim',
    emoji: '⚡',
    desc: 'Siber güvenlik konularında bilgi sahibiyim, ileri seviyeye geçmek istiyorum.',
    color: 'border-violet-500/50 hover:border-violet-400 hover:bg-violet-500/10',
    activeColor: 'border-violet-400 bg-violet-500/15',
    textColor: 'text-violet-400',
  },
];

// ─── Öğrenme yolu önerisi ───────────────────────────────────────────────────
function getRecommendedPath(learningArea) {
  if (learningArea === 'awareness') {
    return {
      title: 'Siber Güvenlik Farkındalığı Yolu',
      emoji: '🛡️',
      color: 'from-cyan-900/40 to-blue-900/30 border-cyan-500/20',
      steps: [
        { title: 'Siber Güvenliğe Giriş', icon: '🔐' },
        { title: 'Phishing Nedir?', icon: '🎣' },
        { title: 'Güçlü Parola Kullanımı', icon: '🔑' },
        { title: 'MFA & 2FA Nedir?', icon: '📱' },
        { title: 'Sosyal Mühendislik', icon: '🎭' },
      ],
    };
  }
  // technical
  return {
    title: 'Web Güvenliği Teknik Yolu',
    emoji: '⚔️',
    color: 'from-orange-900/40 to-red-900/30 border-orange-500/20',
    steps: [
      { title: 'Web Uygulama Mimarisi', icon: '🏗️' },
      { title: 'Güvenli Kod Yazımı', icon: '🛡️' },
      { title: 'HTTP & HTTPS Temelleri', icon: '🌐' },
      { title: 'SQL Injection Nedir?', icon: '💉' },
      { title: 'XSS Saldırıları', icon: '🐛' },
    ],
  };
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function Navigator() {
  const navigate                     = useNavigate();
  const { completeOnboarding, user } = useAuth();

  const [step, setStep]                 = useState(0);
  const [learningArea, setLearningArea] = useState(null);   // 'awareness' | 'technical'
  const [skillLevel, setSkillLevel]     = useState(null);   // 'beginner' | 'intermediate' | 'advanced'
  const [saving, setSaving]             = useState(false);

  const path = learningArea
    ? getRecommendedPath(learningArea)
    : null;

  const selectedType  = STUDENT_TYPES.find((t) => t.value === learningArea);
  const selectedLevel = SKILL_LEVELS.find((l) => l.value === skillLevel);

  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    if (!learningArea || !skillLevel) return;
    setSaving(true);
    await completeOnboarding({ learningArea, skillLevel });

    // Önceki aktif kurs ve tanıtım turu önbelleklerini temizle
    try {
      localStorage.removeItem(`cyberedu_last_active_course_${user?.id}`);
      localStorage.removeItem('cyberedu_last_active_course');
      localStorage.removeItem(`cyberedu_tour_completed_${user?.id}`);
      localStorage.removeItem('cyberedu_tour_completed');
    } catch (e) {}

    // İlk kursu bulup öğrenciyi otomatik kaydet (enroll)
    try {
      if (user) {
        const { data: firstCourse } = await supabase
          .from('courses')
          .select('id')
          .eq('category', learningArea)
          .eq('is_published', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstCourse) {
          await supabase.from('enrollments').upsert([
            { user_id: user.id, course_id: firstCourse.id }
          ], { onConflict: 'user_id,course_id' });

          localStorage.setItem(`cyberedu_last_active_course_${user.id}`, firstCourse.id);
          localStorage.setItem('cyberedu_last_active_course', firstCourse.id);
        }
      }
    } catch (e) {
      console.warn('İlk kurs kaydı hatası:', e);
    }

    navigate('/student', { replace: true });
  };

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Üst başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 text-2xl mb-3 shadow-xl shadow-violet-500/30 animate-float">
            🧭
          </div>
          <h1 className="font-display font-black text-3xl text-white">
            Öğrenme Navigatörü
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sana özel bir öğrenme yolu oluşturalım
          </p>
        </div>

        {/* Adım göstergesi */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300',
                step > i ? 'bg-emerald-500 text-white' :
                step === i ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/40 scale-110' :
                'bg-white/10 text-slate-500',
              ].join(' ')}>
                {step > i ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step >= i ? 'text-slate-300' : 'text-slate-600'}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px mx-1 ${step > i ? 'bg-emerald-500/60' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Kart */}
        <div className="glass rounded-3xl border border-white/10 overflow-hidden">

          {/* ── ADIM 0: Hoş geldin ──────────────────────────────── */}
          {step === 0 && (
            <div className="p-8 text-center space-y-6">
              <div className="space-y-3">
                <div className="text-5xl">🔐</div>
                <h2 className="font-display font-black text-2xl text-white">
                  CyberEdu'ya Hoş Geldin!
                </h2>
                <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                  Siber güvenlik öğrenme yolculuğuna başlamak üzeresin.
                  Sana özel bir plan hazırlamak için birkaç soru soracağız.
                  Bu{' '}
                  <span className="text-violet-300 font-semibold">sadece 2 adım</span>{' '}
                  sürecek!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                {[
                  { emoji: '🎯', text: 'Seviyene uygun içerik' },
                  { emoji: '🗺️', text: 'Kişisel öğrenme yolu' },
                  { emoji: '🏆', text: 'XP ve rozetler kazan' },
                  { emoji: '🤖', text: 'AI Mentor desteği' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xl">{item.emoji}</span>
                    <span className="text-xs text-slate-300 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                Hadi Başlayalım! <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── ADIM 1: Öğrenci tipi ────────────────────────────── */}
          {step === 1 && (
            <div className="p-8 space-y-6">
              <div className="text-center space-y-1">
                <h2 className="font-display font-black text-xl text-white">
                  Nasıl bir öğrenci olduğunu anlat
                </h2>
                <p className="text-slate-400 text-sm">
                  Bu seçim, göreceğin içerikleri belirler
                </p>
              </div>

              <div className="space-y-4">
                {STUDENT_TYPES.map((type) => {
                  const isSelected = learningArea === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setLearningArea(type.value)}
                      className={[
                        'w-full text-left p-5 rounded-2xl border transition-all duration-200',
                        isSelected ? type.color : `${type.inactiveColor} ${type.hoverColor}`,
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${isSelected ? type.badgeColor : 'bg-white/10'}`}>
                          {type.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-bold text-lg ${isSelected ? type.textColor : 'text-white'}`}>
                              {type.label}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? type.badgeColor : 'bg-white/10 text-slate-400'}`}>
                              {type.subtitle}
                            </span>
                            {isSelected && <CheckCircle size={16} className={type.textColor} />}
                          </div>
                          <p className="text-sm text-slate-400 mt-1 leading-relaxed">{type.desc}</p>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {type.topics.map((topic) => (
                              <span key={topic} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isSelected ? type.badgeColor + ' border-current/30' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Not: aynı e-posta ile her iki profil */}
              <p className="text-xs text-slate-500 text-center">
                💡 Daha sonra profil ayarlarından öğrenme tipini değiştirebilirsin.
              </p>

              <div className="flex gap-3">
                <button onClick={goPrev} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-slate-300 font-semibold hover:bg-white/20 transition-colors">
                  <ChevronLeft size={16} /> Geri
                </button>
                <button
                  onClick={goNext}
                  disabled={!learningArea}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200 shadow-lg shadow-violet-500/20"
                >
                  Devam Et <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── ADIM 2: Seviye ──────────────────────────────────── */}
          {step === 2 && (
            <div className="p-8 space-y-6">
              <div className="text-center space-y-1">
                <h2 className="font-display font-black text-xl text-white">
                  Siber güvenlik bilgin ne kadar?
                </h2>
                <p className="text-slate-400 text-sm">
                  İçerikler seviyene göre sıralanacak
                </p>
              </div>

              <div className="space-y-3">
                {SKILL_LEVELS.map((level) => {
                  const isSelected = skillLevel === level.value;
                  return (
                    <button
                      key={level.value}
                      onClick={() => setSkillLevel(level.value)}
                      className={[
                        'w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200',
                        isSelected ? level.activeColor : level.color,
                      ].join(' ')}
                    >
                      <span className="text-3xl shrink-0">{level.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold ${isSelected ? level.textColor : 'text-white'}`}>
                            {level.label}
                          </p>
                          {isSelected && <CheckCircle size={15} className={level.textColor} />}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{level.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={goPrev} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-slate-300 font-semibold hover:bg-white/20 transition-colors">
                  <ChevronLeft size={16} /> Geri
                </button>
                <button
                  onClick={goNext}
                  disabled={!skillLevel}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200 shadow-lg shadow-violet-500/20"
                >
                  Yolumu Göster <Target size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── ADIM 3: Önerilen yol ────────────────────────────── */}
          {step === 3 && path && (
            <div className="p-8 space-y-6">
              <div className="text-center space-y-1">
                <div className="text-4xl mb-2">{path.emoji}</div>
                <h2 className="font-display font-black text-xl text-white">
                  Senin için önerilen yol hazır!
                </h2>
                <p className="text-slate-400 text-sm">
                  <span className={selectedType?.textColor + ' font-semibold'}>{selectedType?.label}</span>
                  {' '}·{' '}
                  <span className={selectedLevel?.textColor + ' font-semibold'}>{selectedLevel?.label}</span>
                </p>
              </div>

              {/* Yol kartı */}
              <div className={`rounded-2xl bg-gradient-to-br ${path.color} border p-5 space-y-4`}>
                <p className="font-bold text-white text-sm">{path.title}</p>
                <div className="space-y-2">
                  {path.steps.map((s, i) => (
                    <div key={s.title} className="flex items-center gap-3">
                      {/* Bağlantı çizgisi */}
                      <div className="relative flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${i === 0 ? 'bg-violet-500/40 ring-2 ring-violet-400' : 'bg-white/10'}`}>
                          {s.icon}
                        </div>
                        {i < path.steps.length - 1 && (
                          <div className="w-px h-3 bg-white/20 mt-0.5" />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="text-sm font-medium text-white">{s.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aksiyon butonları */}
              <div className="space-y-3">
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold text-base shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      Öğrenmeye Başla! <ArrowRight size={20} />
                    </>
                  )}
                </button>
                <button
                  onClick={goPrev}
                  disabled={saving}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Geri dön, değiştirmek istiyorum
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Alt not */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Bu seçimler daha sonra profil ayarlarından değiştirilebilir
        </p>
      </div>
    </div>
  );
}
