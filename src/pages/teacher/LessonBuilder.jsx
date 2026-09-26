import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLessonForBuilder, saveLessonData } from '../../services/teacherService';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
  Save, ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, CheckSquare, Square, RotateCcw, Sparkles, AlertCircle
} from 'lucide-react';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AiPromptModal from '../../components/ui/AiPromptModal';

const BLOCK_TYPES = {
  heading: { label: 'Başlık', icon: 'H1', isText: true },
  text: { label: 'Metin', icon: 'T', isText: true },
  youtube: { label: 'YouTube Video', icon: '▶️', isText: true },
  multiple_choice: { label: 'Çoktan Seçmeli', icon: '☑️' },
  true_false: { label: 'Doğru/Yanlış', icon: '☯️' },
  fill_blank: { label: 'Boşluk Doldur', icon: '📝' },
  matching: { label: 'Eşleştirme', icon: '🔗' },
  ordering: { label: 'Sıralama', icon: '↕️' },
  memory_card: { label: 'Hafıza Kartı', icon: '🃏' },
  hotspot: { label: 'Resim Noktası (Hotspot)', icon: '🎯' },
  scenario: { label: 'Senaryo (Dallandırma)', icon: '🎭' }
};

export default function LessonBuilder() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonXp, setLessonXp] = useState(100);
  const [blocks, setBlocks] = useState([]);
  const [generatingIdx, setGeneratingIdx] = useState(null);
  const [undoHistory, setUndoHistory] = useState({});
  const [blockAiModal, setBlockAiModal] = useState({ isOpen: false, idx: null, blockType: null });
  const [quickAddAiModal, setQuickAddAiModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Bloklar değiştikçe toplam XP'yi otomatik hesaplama
  useEffect(() => {
    const totalActivityXp = blocks.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0);
    if (totalActivityXp > 0) {
      setLessonXp(totalActivityXp);
    }
  }, [blocks]);

  useEffect(() => {
    async function load() {
      if (lessonId && lessonId !== 'new') {
        const { data, error } = await getLessonForBuilder(lessonId);
        if (data) {
          setLessonTitle(data.title || '');
          setLessonXp(data.xp_reward || 100);
          setBlocks(data.activities || []);
        }
      }
      setLoading(false);
    }
    load();
  }, [lessonId]);

  const saveLesson = async () => {
    if (!lessonTitle.trim()) {
      showToast('Ders başlığı boş olamaz!', 'error');
      return;
    }

    setSaving(true);

    const updatedBlocks = blocks.map((b, idx) => {
      let formattedCorrect = b.correct_answer;
      if (b.type === 'hotspot' && typeof b.correct_answer !== 'object') {
        formattedCorrect = { x: 50, y: 50 };
      }

      return {
        ...b,
        order_index: idx,
        correct_answer: formattedCorrect !== undefined ? formattedCorrect : null,
        options: b.options !== undefined ? b.options : null
      };
    });

    const lessonData = {
      id: lessonId !== 'new' ? lessonId : undefined,
      course_id: courseId,
      title: lessonTitle,
      xp_reward: lessonXp,
      is_published: true
    };

    const { data, error } = await saveLessonData(lessonData, updatedBlocks);
    setSaving(false);

    if (error) {
      showToast('Ders kaydedilemedi: ' + error.message, 'error');
    } else {
      showToast('Ders başarıyla kaydedildi!');
      if (lessonId === 'new') {
        navigate(`/teacher/courses/${courseId}/edit`);
      }
    }
  };

  const addBlock = (type, index) => {
    const defaultOptions = {
      multiple_choice: ['Seçenek 1', 'Seçenek 2', 'Seçenek 3'],
      ordering: ['Adım 1', 'Adım 2', 'Adım 3'],
      matching: [
        { left: 'Port 443', right: 'HTTPS' },
        { left: 'Port 22', right: 'SSH' }
      ],
      memory_card: [
        { left: 'SQLi', right: 'Veritabanı Manipülasyonu' },
        { left: 'XSS', right: 'İstemci Kod Enjeksiyonu' }
      ],
      scenario: [
        { text: 'E-postadaki bağlantıya hemen tıklarım', consequence: 'Hatalı! Kimlik bilgileriniz çalındı.', isCorrect: false },
        { text: 'Gönderici alan adını kontrol ederim', consequence: 'Tebrikler! Oltalama girişimini engellediniz.', isCorrect: true }
      ],
      hotspot: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
      youtube: { require_completion: true }
    };

    const defaultCorrectAnswers = {
      multiple_choice: 'Seçenek 1',
      true_false: 'Doğru',
      hotspot: { x: 50, y: 50 }
    };

    const newBlock = {
      id: undefined,
      type,
      question: '',
      options: defaultOptions[type] !== undefined ? defaultOptions[type] : null,
      correct_answer: defaultCorrectAnswers[type] !== undefined ? defaultCorrectAnswers[type] : '',
      explanation: '',
      points: BLOCK_TYPES[type]?.isText ? 0 : 50,
      order_index: index
    };

    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, newBlock);
    setBlocks(newBlocks);
  };

  const removeBlock = (index) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    setBlocks(newBlocks);
  };

  const moveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);
    setBlocks(newBlocks);
  };

  const updateBlock = (index, field, value) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setBlocks(newBlocks);
  };

  const handleGenerateWithAI = async ({ prompt: topic }) => {
    const { idx, blockType } = blockAiModal;
    if (idx === null || !topic || !topic.trim()) return;

    setAiGenerating(true);
    setGeneratingIdx(idx);
    try {
      const { generateActivityWithAI } = await import('../../services/aiService');
      const aiData = await generateActivityWithAI(topic.trim(), blockType);
      
      // Önceki durumu geri alma (undo) için sakla
      setUndoHistory((prev) => ({ ...prev, [idx]: { ...blocks[idx] } }));

      const newBlocks = [...blocks];
      newBlocks[idx] = { 
        ...newBlocks[idx], 
        ...aiData,
        points: aiData.points !== undefined ? aiData.points : newBlocks[idx].points
      };
      setBlocks(newBlocks);
      setBlockAiModal({ isOpen: false, idx: null, blockType: null });
    } catch (err) {
      showToast("Yapay Zeka ile içerik üretilirken hata oluştu: " + err.message, "error");
    } finally {
      setGeneratingIdx(null);
      setAiGenerating(false);
    }
  };

  const handleUndoAI = (idx) => {
    if (!undoHistory[idx]) return;
    const newBlocks = [...blocks];
    newBlocks[idx] = undoHistory[idx];
    setBlocks(newBlocks);
    setUndoHistory((prev) => {
      const updated = { ...prev };
      delete updated[idx];
      return updated;
    });
  };

  const handleQuickAddWithAI = async ({ prompt: topic, option: chosenType }) => {
    if (!topic || !topic.trim()) return;

    setAiGenerating(true);
    try {
      const { generateActivityWithAI } = await import('../../services/aiService');
      const aiData = await generateActivityWithAI(topic.trim(), chosenType || "multiple_choice");
      const newBlock = {
        id: undefined,
        type: chosenType || "multiple_choice",
        question: aiData.question || '',
        options: aiData.options !== undefined ? aiData.options : null,
        correct_answer: aiData.correct_answer !== undefined ? aiData.correct_answer : '',
        explanation: aiData.explanation || '',
        points: aiData.points !== undefined ? aiData.points : 50,
        order_index: blocks.length
      };
      setBlocks([...blocks, newBlock]);
      setQuickAddAiModal(false);
    } catch (err) {
      showToast("Yapay Zeka ile etkinlik eklenemedi: " + err.message, "error");
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        
        {/* Üst Eylem Çubuğu */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-4 z-40">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-violet-600 font-bold text-sm transition-colors"
          >
            <ArrowLeft size={18} /> Geri Dön
          </button>
          <button 
            onClick={saveLesson} 
            disabled={saving} 
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save size={18} />}
            Dersi Kaydet
          </button>
        </div>

        {/* Ders Başlığı ve XP Ödülü */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-1">
                Ders Başlığı
              </label>
              <input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Örn: Ağ Güvenliği ve Paket Analizi"
                className="w-full text-xl font-bold bg-transparent border-b-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 pb-2"
              />
            </div>
            <div className="w-full sm:w-36">
              <label className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block mb-1">
                Ders XP Ödülü
              </label>
              <input
                type="number"
                value={lessonXp}
                onChange={(e) => setLessonXp(Number(e.target.value))}
                className="w-full font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-amber-400 focus:outline-none focus:border-amber-500 text-center"
              />
            </div>
          </div>
        </Card>

        {/* Blok Listesi */}
        <div className="space-y-4">
          {blocks.length === 0 && (
            <div className="py-14 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-white/40 dark:bg-slate-900/30">
              <p className="text-slate-600 dark:text-slate-400 font-bold">Bu derste henüz hiç içerik bloğu yok.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Aşağıdaki menüden soru, video veya açıklama bloğu ekleyin.</p>
            </div>
          )}

          {blocks.map((block, idx) => {
            const isText = BLOCK_TYPES[block.type]?.isText;

            return (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                
                {/* Blok Kontrol Başlığı */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                      {BLOCK_TYPES[block.type]?.icon} {BLOCK_TYPES[block.type]?.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isText && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <span>XP:</span>
                        <input
                          type="number"
                          value={block.points || 0}
                          onChange={(e) => updateBlock(idx, 'points', Number(e.target.value))}
                          className="w-14 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-white font-bold"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                      <button
                        onClick={() => moveBlock(idx, -1)}
                        disabled={idx === 0}
                        title="Yukarı Taşı"
                        className="p-1 rounded text-slate-500 hover:text-violet-600 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => moveBlock(idx, 1)}
                        disabled={idx === blocks.length - 1}
                        title="Aşağı Taşı"
                        className="p-1 rounded text-slate-500 hover:text-violet-600 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>
                      {/* YZ Geri Al Butonu */}
                      {undoHistory[idx] && (
                        <button
                          onClick={() => handleUndoAI(idx)}
                          className="flex items-center gap-1 p-1 px-2 text-xs font-bold rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors mr-1 border border-amber-500/30"
                          title="Son YZ üretimini geri al"
                        >
                          <RotateCcw size={13} />
                          <span>Geri Al</span>
                        </button>
                      )}

                      {/* YZ ile Üret Butonu */}
                      <button
                        onClick={() => setBlockAiModal({ isOpen: true, idx, blockType: block.type })}
                        disabled={generatingIdx === idx}
                        className="flex items-center gap-1 p-1 px-2.5 text-xs font-bold rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white disabled:opacity-50 transition-all mr-1 border border-violet-500/30 hover:scale-105"
                        title="Yapay Zeka ile İçerik Üret"
                      >
                        <Sparkles size={13} className={generatingIdx === idx ? 'animate-spin' : ''} />
                        <span>{generatingIdx === idx ? 'Üretiliyor...' : 'YZ ile Üret'}</span>
                      </button>
                      <button
                        onClick={() => removeBlock(idx)}
                        title="Bloğu Sil"
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors ml-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Blok İçeriği */}
                <div className="p-5 space-y-4">
                  {block.type === 'heading' && (
                    <input
                      value={block.question || ''}
                      onChange={(e) => updateBlock(idx, 'question', e.target.value)}
                      placeholder="Konu Başlığı Giriniz..."
                      className="w-full text-lg font-bold bg-transparent border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-900 dark:text-white outline-none focus:border-violet-500"
                    />
                  )}

                  {block.type === 'text' && (
                    <textarea
                      value={block.question || ''}
                      onChange={(e) => updateBlock(idx, 'question', e.target.value)}
                      placeholder="Açıklama, yönerge veya kod bloğu giriniz..."
                      className="w-full min-h-[110px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-violet-500 text-sm"
                    />
                  )}

                  {block.type === 'youtube' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">YouTube Video Linki</label>
                        <input
                          value={block.question || ''}
                          onChange={(e) => updateBlock(idx, 'question', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-violet-500 text-sm"
                        />
                      </div>

                      {/* Video İzleme Zorunluluğu Ayarı */}
                      <label className="inline-flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={block.options?.require_completion ?? true}
                          onChange={(e) => {
                            const curOpts = typeof block.options === 'object' && block.options !== null ? block.options : {};
                            updateBlock(idx, 'options', { ...curOpts, require_completion: e.target.checked });
                          }}
                          className="w-4 h-4 text-violet-600 rounded cursor-pointer accent-violet-600"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Öğrenci bu videoyu sonuna kadar izlemeden geçemesin (İzleme Kontrolü)
                        </span>
                      </label>
                    </div>
                  )}

                  {!isText && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Soru Metni / Yönerge</label>
                        <input
                          value={block.question || ''}
                          onChange={(e) => updateBlock(idx, 'question', e.target.value)}
                          placeholder="Soru metnini yazın..."
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none focus:border-violet-500 text-sm"
                        />
                      </div>

                      {/* Çoktan Seçmeli */}
                      {block.type === 'multiple_choice' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Şıklar (Doğru seçeneği daireye tıklayarak seçin):</p>
                          {(block.options || []).map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={'mc_' + idx}
                                checked={block.correct_answer === opt}
                                onChange={() => updateBlock(idx, 'correct_answer', opt)}
                                className="w-4 h-4 text-violet-600 cursor-pointer"
                              />
                              <input
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...block.options];
                                  newOpts[oIdx] = e.target.value;
                                  updateBlock(idx, 'options', newOpts);
                                  if (block.correct_answer === opt) updateBlock(idx, 'correct_answer', e.target.value);
                                }}
                                className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-violet-500"
                              />
                              <button
                                onClick={() => {
                                  if (block.options.length <= 2) return showToast('En az 2 şık olmalıdır.', 'warning');
                                  const newOpts = block.options.filter((_, i) => i !== oIdx);
                                  updateBlock(idx, 'options', newOpts);
                                  if (block.correct_answer === opt) updateBlock(idx, 'correct_answer', newOpts[0] || '');
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateBlock(idx, 'options', [...(block.options || []), `Seçenek ${block.options.length + 1}`])}
                            className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline pt-1 flex items-center gap-1"
                          >
                            <Plus size={14} /> Yeni Şık Ekle
                          </button>
                        </div>
                      )}

                      {/* Doğru / Yanlış */}
                      {block.type === 'true_false' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2">Doğru Cevabı Seçin:</span>
                          <div className="flex gap-6">
                            {['Doğru', 'Yanlış'].map((val) => (
                              <label key={val} className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800 dark:text-slate-200">
                                <input
                                  type="radio"
                                  name={'tf_' + idx}
                                  checked={block.correct_answer === val}
                                  onChange={() => updateBlock(idx, 'correct_answer', val)}
                                  className="w-4 h-4 text-violet-600"
                                />
                                {val}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Boşluk Doldur */}
                      {block.type === 'fill_blank' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Doğru Cevap (Tek veya virgülle birden fazla alternatif):</label>
                          <input
                            value={typeof block.correct_answer === 'string' ? block.correct_answer : ''}
                            onChange={(e) => updateBlock(idx, 'correct_answer', e.target.value)}
                            placeholder="Örn: 443 veya HTTPS"
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-violet-500"
                          />
                        </div>
                      )}

                      {/* Sıralama */}
                      {block.type === 'ordering' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Doğru Sıralama (Adımları doğru sırada girin):</p>
                          {(block.options || []).map((item, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-5">{oIdx + 1}.</span>
                              <input
                                value={item}
                                onChange={(e) => {
                                  const newOpts = [...block.options];
                                  newOpts[oIdx] = e.target.value;
                                  updateBlock(idx, 'options', newOpts);
                                }}
                                className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-violet-500"
                              />
                              <button
                                onClick={() => {
                                  const newOpts = block.options.filter((_, i) => i !== oIdx);
                                  updateBlock(idx, 'options', newOpts);
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateBlock(idx, 'options', [...(block.options || []), `Adım ${block.options.length + 1}`])}
                            className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline pt-1 flex items-center gap-1"
                          >
                            <Plus size={14} /> Yeni Adım Ekle
                          </button>
                        </div>
                      )}

                      {/* Eşleştirme & Hafıza Kartı */}
                      {(block.type === 'matching' || block.type === 'memory_card') && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Eşleştirilecek Çiftler (Sol - Sağ):</p>
                          {(block.options || []).map((pair, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                placeholder="Sol Değer (Örn: Port 22)"
                                value={pair.left || ''}
                                onChange={(e) => {
                                  const newOpts = [...block.options];
                                  newOpts[oIdx] = { ...newOpts[oIdx], left: e.target.value };
                                  updateBlock(idx, 'options', newOpts);
                                }}
                                className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-violet-500"
                              />
                              <span className="text-slate-400 font-bold">↔</span>
                              <input
                                placeholder="Sağ Değer (Örn: SSH)"
                                value={pair.right || ''}
                                onChange={(e) => {
                                  const newOpts = [...block.options];
                                  newOpts[oIdx] = { ...newOpts[oIdx], right: e.target.value };
                                  updateBlock(idx, 'options', newOpts);
                                }}
                                className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-violet-500"
                              />
                              <button
                                onClick={() => {
                                  const newOpts = block.options.filter((_, i) => i !== oIdx);
                                  updateBlock(idx, 'options', newOpts);
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateBlock(idx, 'options', [...(block.options || []), { left: '', right: '' }])}
                            className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline pt-1 flex items-center gap-1"
                          >
                            <Plus size={14} /> Yeni Çift Ekle
                          </button>
                        </div>
                      )}

                      {/* Senaryo */}
                      {block.type === 'scenario' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Senaryo Seçenekleri ve Sonuçları:</p>
                          {(block.options || []).map((opt, oIdx) => (
                            <div key={oIdx} className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={'sc_' + idx}
                                  checked={opt.isCorrect}
                                  onChange={() => {
                                    const newOpts = block.options.map((o, i) => ({ ...o, isCorrect: i === oIdx }));
                                    updateBlock(idx, 'options', newOpts);
                                  }}
                                  className="w-4 h-4 text-violet-600"
                                />
                                <input
                                  placeholder="Seçenek Metni (Örn: E-postadaki linke tıkla)"
                                  value={opt.text || ''}
                                  onChange={(e) => {
                                    const newOpts = [...block.options];
                                    newOpts[oIdx] = { ...newOpts[oIdx], text: e.target.value };
                                    updateBlock(idx, 'options', newOpts);
                                  }}
                                  className="flex-1 p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const newOpts = block.options.filter((_, i) => i !== oIdx);
                                    updateBlock(idx, 'options', newOpts);
                                  }}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <input
                                placeholder="Geri Bildirim (Örn: Hatalı! Kimlik bilgileriniz çalındı.)"
                                value={opt.consequence || ''}
                                onChange={(e) => {
                                  const newOpts = [...block.options];
                                  newOpts[oIdx] = { ...newOpts[oIdx], consequence: e.target.value };
                                  updateBlock(idx, 'options', newOpts);
                                }}
                                className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs"
                              />
                            </div>
                          ))}
                          <button
                            onClick={() => updateBlock(idx, 'options', [...(block.options || []), { text: '', consequence: '', isCorrect: false }])}
                            className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline pt-1 flex items-center gap-1"
                          >
                            <Plus size={14} /> Yeni Seçenek Ekle
                          </button>
                        </div>
                      )}

                      {/* Hotspot */}
                      {block.type === 'hotspot' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Görsel URL'si:</label>
                          <input
                            value={typeof block.options === 'string' ? block.options : ''}
                            onChange={(e) => updateBlock(idx, 'options', e.target.value)}
                            placeholder="https://..."
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                          />
                          <div className="flex gap-4 items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">X Koordinatı (%):</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={block.correct_answer?.x !== undefined ? block.correct_answer.x : 50}
                                onChange={(e) => updateBlock(idx, 'correct_answer', { ...(block.correct_answer || {}), x: Number(e.target.value) })}
                                className="w-20 p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-bold text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">Y Koordinatı (%):</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={block.correct_answer?.y !== undefined ? block.correct_answer.y : 50}
                                onChange={(e) => updateBlock(idx, 'correct_answer', { ...(block.correct_answer || {}), y: Number(e.target.value) })}
                                className="w-20 p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-bold text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pedagojik Çözüm Mantığı */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Hatalı Yanıtta Gösterilecek Çözüm Mantığı & Açıklama
                        </label>
                        <input
                          value={block.explanation || ''}
                          onChange={(e) => updateBlock(idx, 'explanation', e.target.value)}
                          placeholder="Örn: 443 numaralı port SSL/TLS güvenli web trafiği (HTTPS) için ayrılmıştır."
                          className="w-full p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Yeni Blok Ekleme Alanı */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                YENİ BLOK EKLE
              </span>
              <button
                onClick={() => setQuickAddAiModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles size={14} />
                <span>YZ ile Otomatik Etkinlik Ekle</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {Object.entries(BLOCK_TYPES).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => addBlock(type, blocks.length)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/50 border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm"
                >
                  <span>{config.icon}</span> {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 1. Mevcut Bloğu YZ ile Üretme Modalı */}
      <AiPromptModal
        isOpen={blockAiModal.isOpen}
        onClose={() => setBlockAiModal({ isOpen: false, idx: null, blockType: null })}
        onSubmit={handleGenerateWithAI}
        title={`✨ ${BLOCK_TYPES[blockAiModal.blockType]?.label || 'Etkinlik'} İçeriği Üret`}
        subtitle="Bu soru veya blok için hangi konuyu ve detayı anlatmak istediğinizi belirtin."
        placeholder="Örn: SQL Injection mantığı, kullanıcı girdisi doğrulama ve Prepared Statement savunması..."
        suggestions={[
          "SQL Injection savunması ve Prepared Statements",
          "Phishing e-postası tespiti ve alan adı kontrolü",
          "Port 443 HTTPS ve SSL/TLS şifreleme",
          "Brute Force saldırılarına karşı hesap kilitleme"
        ]}
        loading={aiGenerating}
      />

      {/* 2. Yeni Etkinliği YZ ile Otomatik Ekleme Modalı */}
      <AiPromptModal
        isOpen={quickAddAiModal}
        onClose={() => setQuickAddAiModal(false)}
        onSubmit={handleQuickAddWithAI}
        title="✨ Yeni Etkinlik Oluştur & Ekle"
        subtitle="Tür ve konu belirleyin, YZ dersinize otomatik yeni bir etkinlik eklesin."
        placeholder="Örn: Parola karmaşıklığı ve hash algoritmaları hakkında soru..."
        options={[
          { label: 'Çoktan Seçmeli', value: 'multiple_choice', icon: '☑️' },
          { label: 'Doğru/Yanlış', value: 'true_false', icon: '☯️' },
          { label: 'Boşluk Doldur', value: 'fill_blank', icon: '📝' },
          { label: 'Eşleştirme', value: 'matching', icon: '🔗' },
          { label: 'Sıralama', value: 'ordering', icon: '↕️' },
          { label: 'Hafıza Kartı', value: 'memory_card', icon: '🃏' },
          { label: 'Senaryo', value: 'scenario', icon: '🎭' }
        ]}
        optionsLabel="Etkinlik Türü"
        suggestions={[
          "XSS saldırısı türleri ve DOM manipülasyonu",
          "Man-in-the-middle (MitM) saldırısı savunması",
          "İki faktörlü kimlik doğrulama (2FA) çalışma mantığı",
          "Sosyal mühendislikte yemleme (Baiting) taktiği"
        ]}
        loading={aiGenerating}
      />
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