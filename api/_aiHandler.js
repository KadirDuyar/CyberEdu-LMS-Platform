/**
 * CyberEdu LMS — Server-side AI Request Handler (Groq & Gemini Hedge Request)
 * Bu dosya yalnızca sunucu tarafında (Vercel Serverless Function & Vite dev middleware) çalışır.
 * API anahtarları asla istemci tarafına (browser) gönderilmez.
 */

async function callGroq({ prompt, systemInstruction = '', history = [], signal }, env) {
  const groqApiKey = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY;
  const configuredGroqModel = env.GROQ_MODEL || env.VITE_GROQ_MODEL;

  if (!groqApiKey) {
    throw new Error('[Groq Hatası]: API anahtarı tanımlı değil.');
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      messages.push({
        role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content || msg.text || ''
      });
    }
  }

  messages.push({ role: 'user', content: prompt });

  const sanitizedConfigModel =
    configuredGroqModel === 'llama-3.1-8b-instant' ||
    configuredGroqModel === 'gemma2-9b-it' ||
    configuredGroqModel === 'gemma-7b-it'
      ? 'llama-3.3-70b-versatile'
      : configuredGroqModel;

  const candidateModels = Array.from(
    new Set([
      'openai/gpt-oss-120b',
      sanitizedConfigModel,
      'llama-3.3-70b-versatile',
      'llama3-8b-8192',
      'llama-3.1-70b-versatile'
    ].filter(Boolean))
  );

  const errorDetails = [];

  for (const model of candidateModels) {
    const startTime = Date.now();
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal,
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          const duration = Date.now() - startTime;
          return { provider: `Groq (${model})`, text, duration };
        }
      } else {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error?.message || (await res.text().catch(() => ''));
        errorDetails.push(`[${model}: ${res.status} - ${errorMsg}]`);
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      errorDetails.push(`[${model}: ${err.message}]`);
    }
  }

  throw new Error(`[Groq Hatası]: ${errorDetails.join(' | ')}`);
}

async function callGemini({ prompt, systemInstruction = '', history = [], signal }, env) {
  const geminiApiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
  const configuredGeminiModel = env.GEMINI_MODEL || env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

  if (!geminiApiKey) {
    throw new Error('[Gemini Hatası]: API anahtarı tanımlı değil.');
  }

  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || msg.text || '' }]
      });
    }
  }

  const userPromptText = systemInstruction
    ? `${systemInstruction}\n\n---\nKULLANICI TALEBİ:\n${prompt}`
    : prompt;

  contents.push({
    role: 'user',
    parts: [{ text: userPromptText }]
  });

  const payload = { contents };

  const sanitizedGeminiModel =
    configuredGeminiModel === 'gemini-2.0-flash' || configuredGeminiModel === 'gemini-1.0-pro'
      ? 'gemini-2.5-flash'
      : configuredGeminiModel;

  const candidateEndpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/${sanitizedGeminiModel}:generateContent?key=${geminiApiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/${sanitizedGeminiModel}:generateContent?key=${geminiApiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`
  ];

  const uniqueEndpoints = Array.from(new Set(candidateEndpoints));
  const errorDetails = [];

  for (const url of uniqueEndpoints) {
    const startTime = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const duration = Date.now() - startTime;
          const matchedModel = url.includes('gemini-2.5-flash')
            ? 'Gemini 2.5 Flash'
            : url.includes('gemini-2.5-pro')
              ? 'Gemini 2.5 Pro'
              : 'Gemini 1.5 Flash';
          return { provider: `Google ${matchedModel}`, text, duration };
        }
      } else {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error?.message || (await res.text().catch(() => ''));
        errorDetails.push(`[HTTP ${res.status}: ${errorMsg}]`);
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      errorDetails.push(`[${err.message}]`);
    }
  }

  throw new Error(`[Gemini Hatası]: ${errorDetails.join(' | ')}`);
}

/**
 * Hedge-race: Groq ve Gemini'yi eşzamanlı yarıştırıp ilk dönen geçerli yanıtı döner.
 */
export async function handleAIRequest({ prompt, systemInstruction = '', history = [] }, env = process.env) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Geçerli bir prompt parametresi zorunludur.');
  }

  const groqKey = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY;
  const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    throw new Error('Sunucu tarafında hiçbir AI API anahtarı (GEMINI_API_KEY veya GROQ_API_KEY) tanımlı değil.');
  }

  const controller = new AbortController();
  const { signal } = controller;
  const tasks = [];

  if (groqKey) {
    tasks.push(callGroq({ prompt, systemInstruction, history, signal }, env));
  }
  if (geminiKey) {
    tasks.push(callGemini({ prompt, systemInstruction, history, signal }, env));
  }

  try {
    const fastest = await Promise.any(tasks);
    controller.abort();
    return {
      success: true,
      text: fastest.text,
      provider: fastest.provider,
      duration: fastest.duration
    };
  } catch (aggErr) {
    const detailList = aggErr?.errors?.map((e) => e?.message || e).join(' | ') || aggErr.message;
    throw new Error(`Tüm Yapay Zeka servisleri başarısız oldu: ${detailList}`);
  }
}
