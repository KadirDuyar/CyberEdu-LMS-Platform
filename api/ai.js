import { handleAIRequest } from './_aiHandler.js';

export default async function handler(req, res) {
  // CORS Başlıkları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = await handleAIRequest(body, process.env);
    return res.status(200).json(result);
  } catch (err) {
    console.error('API /api/ai server error:', err.message);
    return res.status(500).json({ error: err.message || 'Yapay Zeka servisi yanıt veremedi.' });
  }
}
