// Supabase Edge Function: «ChatGPT» برای چت سایت Our Memories
// کلید OpenAI فقط اینجا (به‌صورت Secret) نگه داشته می‌شه و هیچ‌وقت توی سایت قرار نمی‌گیره.
// راه‌اندازی: supabase secrets set OPENAI_API_KEY=sk-...   و بعد:   supabase functions deploy chatgpt
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SYSTEM = 'تو ChatGPT هستی و توی چت خصوصی یک زوج کنار هم (عرشیا و یاسی) حضور داری. فارسی، گرم، کوتاه و صمیمی جواب بده (حداکثر چند جمله). از ایموجی کم و بجا استفاده کن. اگه اسم فرستنده رو گفتن، می‌تونی باهاش صداش کنی.';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  try {
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return json({ error: 'OPENAI_API_KEY تنظیم نشده' }, 500);
    const body = await req.json();
    const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
      .map((m: { role?: string; content?: string }) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 800) }))
      .filter((m: { content: string }) => m.content);
    if (!msgs.length) return json({ error: 'پیامی نیست' }, 400);
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini', max_tokens: 400, temperature: 0.8, messages: [{ role: 'system', content: SYSTEM }, ...msgs] }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: (j && j.error && j.error.message) || 'خطای OpenAI' }, 502);
    return json({ reply: String(j.choices?.[0]?.message?.content || '').trim().slice(0, 1200) });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
