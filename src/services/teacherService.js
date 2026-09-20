
import { supabase } from '../lib/supabase';

// KURS İŞLEMLERİ

export async function getTeacherCourses(teacherId) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, lessons(count)')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getCourseDetails(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, lessons(id, title, is_published, order_index)')
    .eq('id', courseId)
    .single();
    
  if (data?.lessons) {
    data.lessons.sort((a, b) => a.order_index - b.order_index);
  }
  return { data, error };
}

export async function saveCourse(courseData) {
  const { data, error } = await supabase
    .from('courses')
    .upsert(courseData)
    .select()
    .single();
  return { data, error };
}

// DERS VE İÇERİK (BLOK) İŞLEMLERİ

export async function getLessonForBuilder(lessonId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*, activities(*)')
    .eq('id', lessonId)
    .single();
    
  if (data?.activities) {
    data.activities.sort((a, b) => a.order_index - b.order_index);
  }
  return { data, error };
}

export async function saveLessonData(lessonData, blocks) {
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .upsert(lessonData)
    .select()
    .single();

  if (lessonErr) return { error: lessonErr };

  if (blocks) {
    // Mevcut id'leri bul ve silinenleri veritabanından uçur
    const { data: existing } = await supabase.from('activities').select('id').eq('lesson_id', lesson.id);
    const existingIds = existing ? existing.map(e => e.id) : [];
    const incomingIds = blocks.map(b => b.id).filter(Boolean);
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    
    if (idsToDelete.length > 0) {
      await supabase.from('activities').delete().in('id', idsToDelete);
    }
    
    if (blocks.length > 0) {
      for (let index = 0; index < blocks.length; index++) {
        const block = blocks[index];
        const activityPayload = {
          lesson_id: lesson.id,
          type: block.type,
          question: block.question || '',
          options: block.options || null,
          correct_answer: block.correct_answer || {},
          explanation: block.explanation || '',
          points: block.points || 0,
          order_index: index
        };

        if (block.id) {
          // Var olan aktivite: güncelle
          const { error: actErr } = await supabase
            .from('activities')
            .update(activityPayload)
            .eq('id', block.id);
          if (actErr) return { error: actErr };
        } else {
          // Yeni aktivite: id vermeden insert et, Supabase kendisi üretsin
          const { error: actErr } = await supabase
            .from('activities')
            .insert(activityPayload);
          if (actErr) return { error: actErr };
        }
      }
    }
  }

  return { data: lesson, error: null };
}

// TOPLU TASLAK YAYINLAMA
export async function publishDraftCourse(draft) {
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .insert({
      title: draft.title,
      description: draft.description,
      category: draft.category,
      level: draft.level,
      thumbnail_emoji: draft.thumbnail_emoji,
      created_by: draft.created_by,
      is_published: true
    })
    .select().single();

  if (courseErr) return { error: courseErr };

  if (draft.lessons && draft.lessons.length > 0) {
    for (let i = 0; i < draft.lessons.length; i++) {
      const lessonDraft = draft.lessons[i];
      const { data: dbLesson, error: lessonErr } = await supabase
        .from('lessons')
        .insert({
          course_id: course.id,
          title: lessonDraft.title,
          xp_reward: lessonDraft.xp_reward || 100,
          order_index: i,
          is_published: true
        })
        .select().single();

      if (!lessonErr && lessonDraft.blocks && lessonDraft.blocks.length > 0) {
        const blocksToInsert = lessonDraft.blocks.map((b, idx) => ({
          lesson_id: dbLesson.id,
          type: b.type,
          question: b.question || '',
          options: b.options || null,
          correct_answer: b.correct_answer || {},
          explanation: b.explanation || '',
          points: b.points || 0,
          order_index: idx
        }));
        await supabase.from('activities').insert(blocksToInsert);
      }
    }
  }
  
  return { data: course, error: null };
}

// ÖRNEK KURS OLUŞTURMA (SEED)
export async function createDemoCourse(teacherId) {
  const { data: course, error: cErr } = await supabase.from('courses').insert({
    title: 'Yeni Nesil Siber Güvenlik (Uygulamalı Demo)',
    description: 'Yeni eklenen tüm etkileşim türlerini (Sıralama, Hafıza Kartı, Senaryo, Resim Hedefi, YouTube vb.) içeren dev kapsamlı örnek kurs.',
    category: 'technical',
    level: 'intermediate',
    thumbnail_emoji: '🚀',
    created_by: teacherId,
    is_published: true
  }).select().single();

  if (cErr) return { error: cErr };

  // 1. Ders: Sosyal Mühendislik ve Görsel Analiz
  const { data: l1 } = await supabase.from('lessons').insert({
    course_id: course.id, title: 'Bölüm 1: Sosyal Mühendislik ve Phishing', xp_reward: 200, order_index: 0, is_published: true
  }).select().single();

  if (l1) {
     await supabase.from('activities').insert([
       { lesson_id: l1.id, type: 'heading', question: 'Oltalama (Phishing) Nedir?', order_index: 0, correct_answer: '' },
       { lesson_id: l1.id, type: 'youtube', question: 'https://www.youtube.com/watch?v=R12_y2BhKbE', order_index: 1, correct_answer: '' },
       { 
         lesson_id: l1.id, 
         type: 'hotspot', 
         question: 'Aşağıdaki sahte faturada "ZARARLI LİNK"in bulunduğu bölgeyi tıklayın.', 
         options: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&auto=format&fit=crop&q=60', 
         correct_answer: { x: 50, y: 50, radius: 10 }, 
         points: 100, 
         order_index: 2, 
         explanation: 'Normalde e-postalardaki aceleci ve tehditkar butonlara (Hemen Öde, Hesabınız Kapatılacak vb.) tıklamadan önce bağlantı adresini (URL) kontrol etmelisiniz.' 
       },
       { 
         lesson_id: l1.id, 
         type: 'scenario', 
         question: 'Otoparkta üzerinde "Maaş Bordroları 2026.xlsx" yazan şık bir USB bellek buldunuz. Ne yaparsınız?', 
         options: [
           { text: 'Hemen ofisteki bilgisayarıma takıp içine bakarım.', consequence: 'Büyük Hata! Sisteme Ransomware (Fidye Yazılımı) bulaştırdınız. Tüm dosyalar şifrelendi.', isCorrect: false },
           { text: 'Merak etsem de takmam, IT / Bilgi İşlem departmanına teslim ederim.', consequence: 'Tebrikler! Zararlı olabilecek donanımları izole ortamda incelenmesi için uzmanlara verdiniz.', isCorrect: true },
           { text: 'Kişisel bilgisayarıma (evde) takıp formatlarım.', consequence: 'Kişisel verileriniz tehlikeye girdi! Zararlı yazılımlar sadece şirket ağını değil kişisel cihazları da hedefler.', isCorrect: false }
         ],
         correct_answer: '', 
         points: 150, 
         order_index: 3, 
         explanation: 'Bilinmeyen USB cihazları (Baiting / Yemleme saldırısı) asla sistemlere takılmamalıdır.' 
       }
     ]);
  }

  // 2. Ders: Ağ Güvenliği ve Protokoller
  const { data: l2 } = await supabase.from('lessons').insert({
     course_id: course.id, title: 'Bölüm 2: Ağ Güvenliği Temelleri', xp_reward: 250, order_index: 1, is_published: true
  }).select().single();

  if (l2) {
     await supabase.from('activities').insert([
       { 
         lesson_id: l2.id, 
         type: 'memory_card', 
         question: 'Aşağıdaki Port Numaraları ile Protokolleri Eşleştirin', 
         options: [
           { left: 'Port 443', right: 'HTTPS' },
           { left: 'Port 22', right: 'SSH' },
           { left: 'Port 53', right: 'DNS' },
           { left: 'Port 80', right: 'HTTP' }
         ],
         correct_answer: '', 
         points: 100, 
         order_index: 0, 
         explanation: 'Temel ağ portlarını bilmek, güvenlik duvarı (Firewall) yapılandırmasında çok önemlidir.' 
       },
       { 
         lesson_id: l2.id, 
         type: 'ordering', 
         question: 'Siber Olay Müdahale (Incident Response) adımlarını BAŞTAN SONA doğru sıraya koyunuz.', 
         options: ['Hazırlık (Preparation)', 'Tespit ve Analiz (Detection)', 'Sınırlandırma (Containment)', 'Yok Etme (Eradication)', 'Kurtarma (Recovery)'],
         correct_answer: '', 
         points: 150, 
         order_index: 1, 
         explanation: 'NIST standartlarına göre başarılı bir müdahale sırasıyla bu adımları izlemelidir.' 
       },
       { 
         lesson_id: l2.id, 
         type: 'true_false', 
         question: 'HTTPS protokolü kullanıldığında bağlandığınız web sitesinin kesinlikle güvenilir ve yasal bir site olduğu doğrulanmış olur.', 
         correct_answer: 'Yanlış', 
         points: 50, 
         order_index: 2, 
         explanation: 'Yanlış. HTTPS sadece verinin şifrelendiğini belirtir. Günümüzde hackerlar da sahte (phishing) siteleri için ücretsiz SSL sertifikaları kullanarak sitelerini HTTPS yapmaktadır.' 
       },
       { 
         lesson_id: l2.id, 
         type: 'fill_blank', 
         question: 'Sistemlerin ve ağların haritasını çıkarmak, açık portları bulmak için kullanılan dünyaca ünlü güvenlik tarama aracının adı _____ (4 harf) dir.', 
         correct_answer: 'Nmap', 
         points: 50, 
         order_index: 3, 
         explanation: 'Nmap (Network Mapper), siber güvenlik uzmanlarının vazgeçilmez aracıdır.' 
       }
     ]);
  }

  return { data: course, error: null };
}

// SİLME İŞLEMLERİ
export async function deleteCourse(courseId) {
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  return { error };
}

export async function deleteLesson(lessonId) {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  return { error };
}

