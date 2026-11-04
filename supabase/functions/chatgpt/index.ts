// Supabase Edge Function: دستیار چت سایت Our Memories
// کلیدها فقط اینجا (به‌صورت Secret) نگه داشته می‌شن. هر کدوم رو که داری بذار؛ اولویت: GROQ_API_KEY (رایگان) ← GEMINI_API_KEY (رایگان) ← OPENAI_API_KEY (پولی)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SYSTEM = 'تو دستیار هوشمند چت خصوصی یک زوج (عرشیا و یاسی) هستی و اسمت ChatGPT است. فارسی، گرم، کوتاه و صمیمی جواب بده (حداکثر چند جمله). از ایموجی کم و بجا استفاده کن. اگه اسم فرستنده رو گفتن، می‌تونی باهاش صداش کنی.';
type Msg = { role: 'user' | 'assistant'; content: string };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  try {
    const body = await req.json();
    const msgs: Msg[] = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
      .map((m: { role?: string; content?: string }) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 800) } as Msg))
      .filter((m: Msg) => m.content);
    if (!msgs.length) return json({ error: 'پیامی نیست' }, 400);
    const groq = Deno.env.get('GROQ_API_KEY'), gem = Deno.env.get('GEMINI_API_KEY'), oai = Deno.env.get('OPENAI_API_KEY'), akey = Deno.env.get('AI_KEY');
    if (akey || groq || oai) {
      const url = akey ? (Deno.env.get('AI_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/$/, '') + '/chat/completions' : groq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      const model = akey ? (Deno.env.get('AI_MODEL') || 'meta-llama/llama-3.3-70b-instruct:free') : groq ? (Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile') : (Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini');
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (akey || groq || oai) }, body: JSON.stringify({ model, max_tokens: 400, temperature: 0.8, messages: [{ role: 'system', content: SYSTEM }, ...msgs] }) });
      const j = await r.json();
      if (!r.ok) return json({ error: (j && j.error && j.error.message) || 'خطای سرویس هوش مصنوعی' }, 502);
      return json({ reply: String(j.choices?.[0]?.message?.content || '').trim().slice(0, 1200) });
    }
    if (gem) {
      const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gem}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 400, temperature: 0.8 } }),
      });
      const j = await r.json();
      if (!r.ok) return json({ error: (j && j.error && j.error.message) || 'خطای Gemini' }, 502);
      return json({ reply: String(j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '').trim().slice(0, 1200) });
    }
    return json({ error: 'OPENAI_API_KEY تنظیم نشده (یکی از GROQ_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY لازمه)' }, 500);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
