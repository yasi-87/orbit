/* 🗄️ ذخیرهٔ ساده و مشترک برای بخش‌های تازه (نقشه، جعبهٔ صدا، چرخ‌ها)
   از همون جدول folder_items استفاده می‌کنه (ستون‌هاش متنیه)، پس نیازی به ساختن جدول جدید توی Supabase نیست. */
(function () {
  'use strict';
  const T = 'folder_items';
  async function list(sec) {
    try {
      const { data, error } = await dbClient.from(T).select('key,item_id').eq('section', sec);
      if (error) return { rows: [], error };
      const rows = (data || []).map(r => { try { const o = JSON.parse(r.item_id); o.id = String(r.key).slice(sec.length + 1); return o; } catch (e) { return null; } }).filter(Boolean);
      return { rows, error: null };
    } catch (e) { return { rows: [], error: e }; }
  }
  async function put(sec, id, obj) {
    try { const o = Object.assign({}, obj); delete o.id; const { error } = await dbClient.from(T).upsert({ key: sec + ':' + id, section: sec, item_id: JSON.stringify(o), folder_id: '' }); return error || null; } catch (e) { return e; }
  }
  async function del(sec, id) { try { const { error } = await dbClient.from(T).delete().eq('key', sec + ':' + id); return error || null; } catch (e) { return e; } }
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  window.KV = { list, put, del, newId };
})();
