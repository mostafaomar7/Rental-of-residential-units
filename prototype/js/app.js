/* رواف — النواة: الحالة، التوجيه، المكوّنات المشتركة، الأغلفة */
(function () {
  'use strict';
  var R = window.R = {};
  var SEED = window.RAWAAF_SEED, C = R.C = window.RAWAAF_CONST;
  var KEY = 'rawaaf_proto_state';

  /* ---------- utils ---------- */
  var $ = R.$ = function (s, r) { return (r || document).querySelector(s); };
  R.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = R.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = R.fmt = function (n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 1 }); };
  R.sar = function (n) { return fmt(Math.round(n)) + ' ر.س'; };
  R.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  R.uid = function (p) { return (p || '') + Date.now().toString(36).slice(-5).toUpperCase(); };
  R.today = function () { return C.D(0); };
  R.addDays = function (s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  R.nights = function (a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); };
  var AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  R.AR_DAYS = AR_DAYS; R.AR_MONTHS = AR_MONTHS;
  R.dayName = function (s) { return AR_DAYS[new Date(s + 'T12:00:00').getDay()]; };
  R.dLabel = function (s) { var d = new Date(s + 'T12:00:00'); return d.getDate() + ' ' + AR_MONTHS[d.getMonth()]; };
  R.nt = function (n) { n = Number(n); return n === 1 ? 'ليلة واحدة' : n === 2 ? 'ليلتان' : n <= 10 ? n + ' ليالٍ' : n + ' ليلة'; };
  R.nowTS = function () { var d = new Date(); return R.today() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  var ic = R.ic = function (name, cls, fb) { return '<i data-lucide="' + name + '" class="ic ' + (cls || '') + '" aria-hidden="true" data-fb="' + (fb || '') + '"></i>'; };
  R.icons = function () { try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } }); } catch (e) { } };

  /* ---------- state ---------- */
  R.load = function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    R.DB = (s && s.__v === SEED.__v) ? s : R.clone(SEED);
  };
  R.save = function () { try { localStorage.setItem(KEY, JSON.stringify(R.DB)); } catch (e) { } };
  R.reset = function () {
    try { localStorage.removeItem(KEY); } catch (e) { }
    R.DB = R.clone(SEED); R.UI = freshUI(); R.save(); closeAllModals(); R.toast('تمت إعادة ضبط البيانات التجريبية', 'ok'); R.go('#/');
    R.render();
  };
  function freshUI() { return { city: 'الكل', type: 'all', q: '', compare: [], chat: [], chatOpen: false, demoOpen: false, notifOpen: false }; }
  R.UI = freshUI();
  R.prop = function (id) { return R.DB.properties.find(function (p) { return p.id === Number(id); }); };
  R.tier = function (pts) {
    if (pts >= 2000) return { name: 'ذهبي', next: 3000, from: 2000, color: 'linear-gradient(135deg,#fbbf24,#ca8a04)' };
    if (pts >= 800) return { name: 'فضي', next: 2000, from: 800, color: 'linear-gradient(135deg,#cbd5e1,#64748b)' };
    return { name: 'برونزي', next: 800, from: 0, color: 'linear-gradient(135deg,#fb923c,#b45309)' };
  };
  R.login = function (isNew) {
    var u = R.clone(R.DB.demoUser);
    R.DB.user = u;
    if (isNew) { R.DB.points += 100; R.DB.tx.unshift({ id: R.uid('t'), type: 'مكافأة', amount: 0, date: R.today(), desc: 'نقاط ترحيبية +100 نقطة' }); }
    R.save();
  };
  R.logout = function () { R.DB.user = null; R.save(); };
  R.addNotif = function (n) { n.id = R.uid('n'); n.read = false; n.time = 'الآن'; R.DB.notifications.unshift(n); R.save(); };
  R.audit = function (actor, role, action, target) { R.DB.audit.unshift({ time: R.nowTS(), actor: actor, role: role, action: action, target: target, ip: '10.0.0.' + Math.floor(Math.random() * 90 + 10) }); };

  /* ---------- router ---------- */
  var routes = [], lastPath = null, afterQ = [];
  R.route = function (pattern, fn) {
    var keys = []; var re = new RegExp('^' + pattern.replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ re: re, keys: keys, fn: fn });
  };
  R.go = function (h) { if (location.hash === h) R.render(); else location.hash = h; };
  R.after = function (fn) { afterQ.push(fn); };
  R.portal = function (path) {
    path = path || (R.cur && R.cur.path) || '/';
    if (path.indexOf('/operator') === 0) return 'operator';
    if (path.indexOf('/admin') === 0) return 'admin';
    if (path.indexOf('/supervisor') === 0) return 'supervisor';
    if (path.indexOf('/photographer') === 0) return 'photographer';
    return 'guest';
  };
  R.render = function (keep) {
    var y = window.scrollY;
    var h = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    var parts = h.split('?'); var path = parts[0] || '/'; if (path.length > 1) path = path.replace(/\/$/, '');
    var q = {}; try { new URLSearchParams(parts[1] || '').forEach(function (v, k) { q[k] = v; }); } catch (e) { }
    if (q.as === 'guest' && !R.DB.user) R.login(false);
    var m = null, params = {};
    for (var i = 0; i < routes.length; i++) { var r = routes[i], mm = path.match(r.re); if (mm) { m = r; r.keys.forEach(function (k, j) { params[k] = mm[j + 1]; }); break; } }
    R.cur = { path: path, params: params, q: q };
    afterQ = [];
    var html;
    try { html = m ? m.fn(params, q) : notFound(); }
    catch (err) { console.error(err); html = R.guestShell('<div class="container"><div class="card card-p mt-24"><div class="empty"><div class="e-t">حدث خطأ في عرض الصفحة</div><div class="code mt-12">' + esc(err && err.stack || err) + '</div></div></div></div>'); }
    if (html == null) return;
    $('#app').innerHTML = html;
    R.UI.notifOpen = false;
    renderFloat();
    R.icons();
    afterQ.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
    if (keep) window.scrollTo(0, y); else if (path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;
    var titles = { guest: 'رواف — الإقامات القصيرة', operator: 'رواف — لوحة المالك والمشغّل', admin: 'رواف — إدارة المنصة', supervisor: 'رواف — تطبيق المشرف', photographer: 'رواف — تطبيق المصوّر' };
    document.title = titles[R.portal(path)] + ' • نموذج أولي';
  };
  R.rerender = function () { R.render(true); };
  function notFound() { return R.guestShell('<div class="container"><div class="card card-p mt-24"><div class="empty"><div class="e-ic">' + ic('map-pin-off', 'ic-lg', '?') + '</div><div class="e-t">الصفحة غير موجودة</div><p class="mt-8">الرابط غير صحيح أو تم نقله.</p><a class="btn btn-primary mt-16" href="#/">العودة للرئيسية</a></div></div></div>'); }

  /* ---------- actions (event delegation) ---------- */
  var A = R.A = {};
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!e.target.closest('.pop-wrap') && R.UI.notifOpen) { R.UI.notifOpen = false; var p = $('#notif-pop'); if (p) p.remove(); }
    if (R.UI.demoOpen && !e.target.closest('.demo-menu') && !e.target.closest('.fab-demo')) { R.UI.demoOpen = false; renderFloat(); }
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    var f = A[el.dataset.act];
    if (f) { if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault(); f(el, e); }
    else console.warn('Missing action:', el.dataset.act);
  });
  document.addEventListener('change', function (e) { var el = e.target.closest('[data-ch]'); if (el && A[el.dataset.ch]) A[el.dataset.ch](el, e); });
  document.addEventListener('input', function (e) { var el = e.target.closest('[data-in]'); if (el && A[el.dataset.in]) A[el.dataset.in](el, e); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (stack.length) closeModal(); else if (R.UI.chatOpen) { R.UI.chatOpen = false; renderFloat(); } }
    if (e.key === 'Enter') { var el = e.target.closest('[data-enter]'); if (el && A[el.dataset.enter]) { e.preventDefault(); A[el.dataset.enter](el, e); } }
  });
  A.closeModal = function () { closeModal(); };
  A.go = function (el) { R.go(el.dataset.href); };
  A.toast = function (el) { R.toast(el.dataset.msg, el.dataset.kind || 'info'); };
  A.back = function () { history.back(); };
  A.print = function () { window.print(); };
  A.copy = function (el) { R.copy(el.dataset.text, el.dataset.msg || 'تم النسخ'); };
  R.copy = function (text, msg) {
    var done = function () { R.toast(msg || 'تم النسخ', 'ok'); };
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); return; } } catch (e) { }
    fallback();
    function fallback() { try { var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } catch (e) { } done(); }
  };
  R.val = function (sel) { var el = typeof sel === 'string' ? $(sel) : sel; return el ? String(el.value || '').trim() : ''; };

  /* ---------- modal / toast / confirm ---------- */
  var stack = [], mid = 0;
  function closeModal() { var m = stack.pop(); if (m) { m.el.remove(); if (m.onClose) m.onClose(); } }
  function closeAllModals() { while (stack.length) closeModal(); }
  R.closeModal = closeModal; R.closeAll = closeAllModals;
  R.modal = function (o) {
    var id = 'm' + (++mid); var el = document.createElement('div'); el.className = 'modal-back'; el.id = id;
    el.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t">' +
      (o.title !== false ? '<div class="modal-h"><div class="grow"><h2 id="' + id + '-t">' + o.title + '</h2>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div><button class="x-btn" data-act="closeModal" aria-label="إغلاق">' + ic('x', '', '×') + '</button></div>' : '') +
      '<div class="modal-b">' + (o.body || '') + '</div>' + '<div class="modal-f' + (o.foot ? '' : ' hide') + '">' + (o.foot || '') + '</div></div>';
    el.addEventListener('mousedown', function (e) { if (e.target === el && !o.sticky) closeModal(); });
    $('#modals').appendChild(el); stack.push({ el: el, onClose: o.onClose });
    R.icons();
    setTimeout(function () { var f = el.querySelector(o.focus || 'input:not([type=hidden]):not([type=checkbox]),textarea,select'); if (f) f.focus(); else { var b = el.querySelector('.modal-b'); if (b) { b.setAttribute('tabindex', '-1'); b.focus({ preventScroll: true }); } } }, 30);
    if (o.onOpen) o.onOpen(el);
    return el;
  };
  R.modalSet = function (body, foot, title) {
    var m = stack[stack.length - 1]; if (!m) return;
    if (body != null) m.el.querySelector('.modal-b').innerHTML = body;
    var f = m.el.querySelector('.modal-f'); if (foot != null) { f.innerHTML = foot; f.classList.toggle('hide', !foot); }
    if (title != null) { var t = m.el.querySelector('.modal-h h2'); if (t) t.innerHTML = title; }
    R.icons();
  };
  R.modalEl = function () { var m = stack[stack.length - 1]; return m && m.el; };
  R.confirm = function (o) {
    R.modal({ title: o.title || 'تأكيد', size: 'sm', body: '<p class="lh">' + (o.msg || '') + '</p>' + (o.extra || ''),
      foot: '<button class="btn ' + (o.danger ? 'btn-danger-solid' : 'btn-primary') + '" data-act="confirmOk">' + (o.ok || 'تأكيد') + '</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
    A.confirmOk = function () { var el = R.modalEl(); var ok = o.onOk ? o.onOk(el) : true; if (ok !== false) closeModal(); };
  };
  R.toast = function (msg, kind) {
    kind = kind || 'info';
    var name = kind === 'ok' ? 'check-circle-2' : kind === 'err' ? 'alert-circle' : 'info';
    var t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = ic(name, '', kind === 'ok' ? '✓' : '!') + '<span>' + msg + '</span>';
    $('#toasts').appendChild(t); R.icons();
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, 2800);
  };

  /* ---------- small components ---------- */
  var PILL = {
    green: ['مؤكد', 'متاحة', 'نشط', 'نشطة', 'متصل', 'معتمد', 'مقبولة', 'ناجح', 'مدفوع', 'مغلق', 'موافق عليه', 'تم الإرسال', 'مُفعّل', 'online', 'جاهزة', 'مكتملة', 'تم الحل', 'approved', 'مُتحقق'],
    navy: ['مكتمل', 'محجوزة', 'منتهي'],
    gold: ['جارية', 'قيد النشر', 'مجدولة', 'مجدول', 'يُرسل عند الوصول', 'مُجدول', 'قيد الرفع'],
    amber: ['بانتظار الدفع', 'قيد التجهيز', 'قيد التحويل', 'قيد المراجعة', 'بانتظار المراجعة', 'بانتظار رد الضيف', 'تحذير', 'قيد المعالجة', 'pending', 'بانتظار QA', 'متوسطة', 'بانتظار', 'بانتظار الوصول', 'قيد التنفيذ'],
    blue: ['فحص بعد المغادرة', 'مدعو', 'مسترد', 'منخفضة'],
    red: ['ملغي', 'موقوفة', 'منقطع', 'مرفوض', 'فاشل', 'معلق', 'مفتوح', 'تحتاج إعادة', 'offline', 'عالية', 'rejected', 'ملغى', 'فشل — إعادة المحاولة'],
    gray: ['منتهية', 'غير مُصدر', '—']
  };
  R.pillClass = function (s) { for (var k in PILL) if (PILL[k].indexOf(s) >= 0) return 'pill-' + k; return 'pill-gray'; };
  R.pill = function (s, extra) { return '<span class="pill ' + R.pillClass(s) + ' ' + (extra || '') + '">' + esc(s) + '</span>'; };
  R.stars = function (n, size) { var s = ''; for (var i = 1; i <= 5; i++) s += '<span class="' + (i <= Math.round(n) ? 'star' : 'muted-2') + '">' + ic('star', size || 'ic-sm', '★') + '</span>'; return '<span class="row gap-4" style="gap:1px" aria-label="' + n + ' من 5">' + s + '</span>'; };
  R.empty = function (icon, title, sub, btn) { return '<div class="empty"><div class="e-ic">' + ic(icon, 'ic-lg', '•') + '</div><div class="e-t">' + title + '</div>' + (sub ? '<p class="mt-4 small">' + sub + '</p>' : '') + (btn || '') + '</div>'; };
  R.stat = function (o) {
    return '<div class="stat"><div class="stat-ic ' + (o.tone || '') + '">' + ic(o.icon, '', '•') + '</div><div class="stat-v num">' + o.value + '</div><div class="stat-l">' + o.label + '</div>' + (o.sub ? '<div class="stat-s">' + o.sub + '</div>' : '') + '</div>';
  };
  R.field = function (label, input, help) { return '<div class="field"><label>' + label + '</label>' + input + (help ? '<div class="help">' + help + '</div>' : '') + '</div>'; };
  R.toggle = function (attrs, on, label) { return '<label class="toggle"><input type="checkbox" ' + attrs + (on ? ' checked' : '') + ' aria-label="' + esc(label || '') + '"><span></span></label>'; };
  R.tabs = function (items, active, act, cls) {
    return '<div class="tabs ' + (cls || '') + '" role="tablist">' + items.map(function (t) { return '<button role="tab" aria-selected="' + (t.id === active) + '" class="tab' + (t.id === active ? ' on' : '') + '" data-act="' + act + '" data-id="' + t.id + '">' + (t.icon ? ic(t.icon, 'ic-sm') : '') + t.label + '</button>'; }).join('') + '</div>';
  };
  R.tabLinks = function (items, active, cls) {
    return '<div class="tabs ' + (cls || '') + '">' + items.map(function (t) { return '<a class="tab' + (t.id === active ? ' on' : '') + '" href="' + t.href + '">' + (t.icon ? ic(t.icon, 'ic-sm') : '') + t.label + '</a>'; }).join('') + '</div>';
  };
  R.kv = function (k, v, cls) { return '<div class="kv ' + (cls || '') + '"><span>' + k + '</span><span class="b">' + v + '</span></div>'; };
  R.typeLabel = function (t) { return C.TYPES[t] || t; };
  R.supLabel = function (s) { return s === 'supervised' ? 'مُشرَف عليها' : 'ذاتية الخدمة'; };

  /* ---------- charts ---------- */
  R.lineChart = function (o) {
    var W = 640, H = o.h || 220, pl = 8, pr = 40, pt = 12, pb = 26;
    var vals = o.values, vals2 = o.values2, n = vals.length;
    var max = o.max || Math.max.apply(null, vals.concat(vals2 || [])) * 1.12, min = 0;
    var x = function (i) { return W - pr - (i * (W - pl - pr) / Math.max(1, n - 1)); }; // RTL: first value on the right
    var y = function (v) { return pt + (H - pt - pb) * (1 - (v - min) / (max - min || 1)); };
    var path = function (arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' '); };
    var grid = '', lbl = '';
    for (var g = 0; g <= 4; g++) { var gv = min + (max - min) * g / 4, gy = y(gv); grid += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + gy + '" y2="' + gy + '" stroke="rgba(0,0,0,.06)"/><text x="' + (W - pr + 6) + '" y="' + (gy + 4) + '" text-anchor="start">' + (o.fmtY ? o.fmtY(gv) : fmt(Math.round(gv))) + '</text>'; }
    var step = Math.ceil(n / (o.maxLabels || 9));
    (o.labels || []).forEach(function (l, i) { if (i % step === 0 || (i === n - 1 && (n - 1) % step > step / 2)) lbl += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(l) + '</text>'; });
    var gid = 'g' + Math.random().toString(36).slice(2, 7);
    var area = path(vals) + ' L' + x(n - 1) + ' ' + y(min) + ' L' + x(0) + ' ' + y(min) + ' Z';
    var dots = vals.map(function (v, i) { return '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" fill="#fff" stroke="#0A1931" stroke-width="2"><title>' + esc((o.labels || [])[i] || '') + ': ' + (o.fmtTip ? o.fmtTip(v) : fmt(v)) + '</title></circle>'; }).join('');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'رسم بياني') + '"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9A86A" stop-opacity=".35"/><stop offset="1" stop-color="#C9A86A" stop-opacity="0"/></linearGradient></defs>' + grid + lbl +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' + (vals2 ? '<path d="' + path(vals2) + '" fill="none" stroke="#C9A86A" stroke-width="2" stroke-dasharray="5 5"/>' : '') +
      '<path d="' + path(vals) + '" fill="none" stroke="#0A1931" stroke-width="2.5" stroke-linejoin="round"/>' + (n <= 16 ? dots : '') + '</svg>';
  };
  R.bars = function (items, o) {
    o = o || {}; var max = o.max || Math.max.apply(null, items.map(function (i) { return i.v; })) || 1;
    return '<div class="bars" style="height:' + (o.h || 180) + 'px">' + items.map(function (i) {
      return '<div class="b-col" title="' + esc(i.l) + ': ' + esc(i.t || i.v) + '"><div class="xs b muted">' + (o.showV ? esc(i.t || i.v) : '') + '</div><div class="b ' + (i.gold ? 'gold' : '') + '" style="height:' + Math.max(3, i.v / max * 100) + '%"></div><div class="bl">' + esc(i.l) + '</div></div>';
    }).join('') + '</div>';
  };
  R.donut = function (parts, o) {
    o = o || {}; var total = parts.reduce(function (s, p) { return s + p.v; }, 0) || 1, acc = 0, r = 52, c = 2 * Math.PI * r;
    var segs = parts.map(function (p) { var len = p.v / total * c; var s = '<circle r="' + r + '" cx="70" cy="70" fill="none" stroke="' + p.c + '" stroke-width="18" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-acc) + '" transform="rotate(-90 70 70)"><title>' + esc(p.l) + ': ' + fmt(p.v) + '</title></circle>'; acc += len; return s; }).join('');
    return '<div class="row gap-16 wrap"><svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="' + esc(o.label || '') + '">' + segs + '<text x="70" y="68" text-anchor="middle" font-size="20" font-weight="900" fill="#0A1931" font-family="Tajawal">' + (o.center || '') + '</text><text x="70" y="88" text-anchor="middle" font-size="11" fill="rgba(0,0,0,.45)" font-family="Tajawal">' + (o.centerSub || '') + '</text></svg><div class="stack-sm">' + parts.map(function (p) { return '<div class="row small"><i style="width:10px;height:10px;border-radius:3px;background:' + p.c + ';display:inline-block"></i><span class="b">' + esc(p.l) + '</span><span class="muted">' + fmt(p.v) + (o.unit || '') + '</span></div>'; }).join('') + '</div></div>';
  };

  /* ---------- shells ---------- */
  R.logo = function (badge) { return '<a class="logo" href="#/" aria-label="رواف — الرئيسية"><span class="logo-mark">ر</span><span class="logo-name">رواف</span>' + (badge ? '<span class="pill-premium">' + badge + '</span>' : '') + '</a>'; };
  R.footer = function (extra) {
    return '<footer class="foot"><div class="foot-in container" style="padding-left:32px;padding-right:32px"><div>© 2026 رواف — منصة الإقامات القصيرة والتشغيل الذكي • محفظة رقمية • دخول ذكي • تقييمات موثوقة</div>' +
      '<div class="row wrap gap-12"><span class="proto-tag">' + ic('flask-conical', 'ic-sm', '•') + 'نموذج أولي — بيانات توضيحية</span>' + (extra || '<div class="links"><button data-act="toast" data-msg="صفحة سياسة الخصوصية (غير مشمولة في النموذج)">الخصوصية</button><button data-act="toast" data-msg="صفحة الشروط والأحكام (غير مشمولة في النموذج)">الشروط</button><a href="https://wa.me/966500000000" target="_blank" rel="noopener">الدعم عبر واتساب</a></div>') + '</div></div></footer>';
  };

  R.guestShell = function (content, o) {
    o = o || {}; var DB = R.DB, u = DB.user, path = R.cur ? R.cur.path : '/';
    var unread = DB.notifications.filter(function (n) { return !n.read; }).length;
    var active = DB.bookings.find(function (b) { return b.status === 'جارية'; });
    var navA = function (href, label, on) { return '<a href="' + href + '" class="' + (on ? 'on' : '') + '">' + label + '</a>'; };
    return '<header class="hdr"><div class="container hdr-in">' +
      '<div class="row gap-20">' + R.logo('CLIENT PREMIUM') +
      '<nav class="nav hide-md" aria-label="التنقل الرئيسي">' + navA('#/', 'الوحدات', path === '/' || path.indexOf('/property') === 0 || path === '/search') +
      (u ? navA('#/account', 'حسابي', path.indexOf('/account') === 0) : '<button data-act="needLogin" data-href="#/account">حسابي</button>') +
      (u && active ? navA('#/stay/' + active.id, 'إقامتي الحالية', path.indexOf('/stay') === 0) : '') + '</nav></div>' +
      '<div class="search hide-sm">' + ic('search', '', '⌕') + '<input type="search" placeholder="ابحث عن مدينة، حي، فيلا..." aria-label="بحث" value="' + esc(R.UI.q) + '" data-in="gSearch" data-enter="gSearchGo"></div>' +
      '<div class="hdr-left">' +
      '<div class="pop-wrap" style="position:relative"><button class="hbtn" data-act="toggleNotif" aria-label="الإشعارات">' + ic('bell', '', '🔔') + (unread ? '<span class="count">' + unread + '</span>' : '') + '</button></div>' +
      '<button class="hbtn" data-act="' + (u ? 'go' : 'needLogin') + '" data-href="#/account/favorites" aria-label="المفضلة">' + ic('heart', DB.favs.length ? 'red' : '', '♥') + (DB.favs.length ? '<span class="count">' + DB.favs.length + '</span>' : '') + '</button>' +
      '<button class="chip-wallet hide-sm" data-act="' + (u ? 'go' : 'needLogin') + '" data-href="#/account/wallet">' + ic('wallet', 'ic-sm', '') + '<span>' + R.sar(DB.wallet) + '</span></button>' +
      (u ? '<a class="user-chip" href="#/account"><span class="hide-sm">' + esc(u.name.split(' ')[0]) + '</span><span class="avatar-xs">' + esc(u.name[0]) + '</span></a>' : '<button class="btn btn-primary btn-sm" data-act="openLogin" style="height:40px">دخول</button>') +
      '</div></div>' +
      '<div class="hdr-mobile-search"><div class="search">' + ic('search', '', '⌕') + '<input type="search" placeholder="ابحث عن وحدات..." aria-label="بحث" value="' + esc(R.UI.q) + '" data-in="gSearch" data-enter="gSearchGo"></div></div>' +
      (o.noNav ? '' : mobileGuestNav(path, u, active)) +
      '</header><main>' + content + '</main>' + R.footer();
  };
  function mobileGuestNav(path, u, active) {
    return '<div class="container hide-lg-up" style="padding-bottom:10px"><div class="scroll-x"><div class="chips">' +
      '<a class="chip chip-sm ' + (path === '/' ? 'on' : '') + '" href="#/">الوحدات</a>' +
      '<a class="chip chip-sm ' + (path === '/search' ? 'on' : '') + '" href="#/search">بحث متقدم</a>' +
      (u ? '<a class="chip chip-sm ' + (path.indexOf('/account') === 0 ? 'on' : '') + '" href="#/account">حسابي</a>' : '<button class="chip chip-sm" data-act="openLogin">حسابي</button>') +
      (u && active ? '<a class="chip chip-sm ' + (path.indexOf('/stay') === 0 ? 'on' : '') + '" href="#/stay/' + active.id + '">إقامتي الحالية</a>' : '') +
      '</div></div></div>';
  }

  /* dashboard shell (operator/admin) — sidebar like client account page */
  R.dashShell = function (o) {
    var nav = o.nav.map(function (n) {
      if (n.sec) return '<div class="side-sec">' + n.sec + '</div>';
      return '<a href="' + n.href + '" class="' + (n.id === o.active ? 'on' : '') + '"' + (n.id === o.active ? ' aria-current="page"' : '') + '><span class="lbl">' + ic(n.icon, 'ic-sm', '•') + n.label + '</span>' + (n.count != null ? '<span class="cnt ' + (n.alert ? 'alert' : '') + '">' + n.count + '</span>' : '') + '</a>';
    }).join('');
    var unread = (o.alerts || 0);
    return '<header class="hdr"><div class="container hdr-in">' +
      '<div class="row gap-20">' + R.logo(o.badge) + '<span class="pill pill-gray hide-sm">' + o.portalName + '</span></div>' +
      '<div class="search hide-sm">' + ic('search', '', '⌕') + '<input type="search" placeholder="' + (o.searchPh || 'بحث...') + '" aria-label="بحث" data-enter="' + (o.searchAct || 'dashSearch') + '"></div>' +
      '<div class="hdr-left">' + (o.headerExtra || '') +
      '<button class="hbtn" data-act="go" data-href="' + (o.alertsHref || o.nav[1].href) + '" aria-label="التنبيهات">' + ic('bell', '', '🔔') + (unread ? '<span class="count">' + unread + '</span>' : '') + '</button>' +
      '<div class="user-chip"><span class="hide-sm">' + esc(o.user.name) + '</span><span class="avatar-xs">' + esc(o.user.name[0]) + '</span></div>' +
      '</div></div></header>' +
      '<div class="container dash"><aside class="side" aria-label="القائمة الجانبية"><div class="side-card">' +
      '<div class="side-user"><div class="avatar">' + esc(o.user.name[0]) + '</div><div class="grow"><div class="b truncate">' + esc(o.user.name) + '</div><div class="xs muted row gap-4"><span class="dot dot-green"></span>' + o.user.role + '</div></div></div>' +
      '<nav class="side-nav">' + nav + '<a class="logout" href="#/">' + ic('log-out', 'ic-sm', '⇦') + 'خروج إلى موقع الضيوف</a></nav>' +
      (o.sideExtra ? '<div class="side-extra">' + o.sideExtra + '</div>' : '') +
      '</div></aside><main class="grow" style="min-width:0">' + o.content + '</main></div>' + R.footer('<span class="xs">' + o.portalName + '</span>');
  };

  /* mobile shell (supervisor/photographer) */
  R.mobileShell = function (o) {
    var tabs = o.tabs.map(function (t) { return '<a href="' + t.href + '" class="' + (t.id === o.active ? 'on' : '') + '">' + ic(t.icon, 'ic-lg', '•') + t.label + '</a>'; }).join('');
    return '<div class="phone-stage"><div class="phone-side"><div class="row">' + R.logo(o.badge) + '</div><h1 class="h2 mt-24">' + o.appName + '</h1><p class="muted mt-8 lh">' + o.appDesc + '</p><div class="notice gold mt-16 small">' + ic('smartphone', '', '') + '<div>تطبيق ميداني مصمم للجوال أولاً. على سطح المكتب يُعرض داخل إطار هاتف؛ جرّب عرض الصفحة بعرض 390px.</div></div><div class="mt-16">' + (o.sideLinks || '') + '</div></div>' +
      '<div class="phone" role="application" aria-label="' + esc(o.appName) + '"><div class="app-h">' +
      '<div class="row between">' + (o.back ? '<a class="btn btn-glass btn-icon btn-sm" href="' + o.back + '" aria-label="رجوع">' + ic('arrow-right', '', '→') + '</a>' : '<span class="logo-mark" style="width:32px;height:32px;font-size:16px">ر</span>') + '<div class="grow" style="padding:0 10px"><div class="xs" style="color:rgba(255,255,255,.6)">' + (o.sub || '') + '</div><div class="bb truncate">' + o.title + '</div></div>' + (o.headRight || '<span class="avatar-xs">' + esc(o.userInitial || 'ف') + '</span>') + '</div>' + (o.headerExtra || '') +
      '</div><div class="app-b">' + o.content + '</div><nav class="app-tabs">' + tabs + '</nav></div></div>';
  };

  /* ---------- floating: demo switcher + assistant ---------- */
  var ROLES = [
    { id: 'guest-visitor', label: 'الضيف — زائر', sub: 'تصفح الوحدات، تسجيل الدخول بـ OTP', icon: 'user', href: '#/', portal: 'guest' },
    { id: 'guest', label: 'الضيف — مسجّل', sub: 'سعود العتيبي • حساب، محفظة، نقاط', icon: 'user-check', href: '#/account', portal: 'guest' },
    { id: 'stay', label: 'الضيف — إقامتي الحالية', sub: 'المفتاح الرقمي وفتح الباب', icon: 'key-round', href: '#/stay/RW-240815', portal: 'guest' },
    { id: 'owner', label: 'المالك', sub: 'أداء الوحدات والإيرادات والتحويلات', icon: 'building-2', href: '#/operator', portal: 'operator' },
    { id: 'operator', label: 'المشغّل', sub: 'التشغيل، التسعير الذكي، الأقفال', icon: 'layout-dashboard', href: '#/operator', portal: 'operator' },
    { id: 'supervisor', label: 'المشرف الميداني', sub: 'مهام الجاهزية والفحص (جوال)', icon: 'clipboard-check', href: '#/supervisor', portal: 'supervisor' },
    { id: 'photographer', label: 'المصوّر', sub: 'جلسات التصوير ورفع الصور (جوال)', icon: 'camera', href: '#/photographer', portal: 'photographer' },
    { id: 'admin', label: 'مدير المنصة', sub: 'الاعتماد، التكاملات، الإعدادات', icon: 'shield-check', href: '#/admin', portal: 'admin' }
  ];
  function renderFloat() {
    var portal = R.portal(), UI = R.UI;
    var curRole = portal === 'operator' ? (R.DB.opRole || 'operator') : portal === 'guest' ? (R.cur && R.cur.path.indexOf('/stay') === 0 ? 'stay' : R.DB.user ? 'guest' : 'guest-visitor') : portal;
    var h = '<button class="fab-demo no-print" data-act="toggleDemo" aria-expanded="' + UI.demoOpen + '" aria-label="تبديل البوابة التجريبية">' + ic('layers', 'ic-sm', '≡') + '<span>Demo</span><span class="hide-sm">• تبديل البوابة</span></button>';
    if (UI.demoOpen) {
      h += '<div class="demo-menu no-print" role="menu"><div class="row between" style="padding:6px 10px 10px"><div><div class="bb">بوابات النموذج</div><div class="xs muted">انتقل بين أدوار المنصة</div></div><span class="proto-tag">DEMO</span></div>' +
        ROLES.map(function (r) { return '<button class="demo-item ' + (r.id === curRole ? 'on' : '') + '" role="menuitem" data-act="switchRole" data-id="' + r.id + '"><span class="li-ic ' + (r.id === curRole ? 'gold' : '') + '">' + ic(r.icon, '', '•') + '</span><span class="grow"><span class="b small" style="display:block">' + r.label + '</span><span class="xs muted">' + r.sub + '</span></span></button>'; }).join('') +
        '<div class="divider" style="margin:8px 0"></div><button class="demo-item" data-act="resetDemo"><span class="li-ic red">' + ic('rotate-ccw', '', '↺') + '</span><span class="grow"><span class="b small" style="display:block">إعادة ضبط البيانات التجريبية</span><span class="xs muted">مسح كل التغييرات المحفوظة محلياً</span></span></button></div>';
    }
    if (portal === 'guest') {
      h += '<button class="fab-chat no-print" data-act="toggleChat" aria-label="المساعد الشخصي" aria-expanded="' + UI.chatOpen + '">' + ic(UI.chatOpen ? 'x' : 'message-circle', '', UI.chatOpen ? '×' : '💬') + (UI.chatOpen ? '' : '<span class="ping"></span>') + '</button>';
      if (UI.chatOpen && R.chatPanel) h += R.chatPanel();
    }
    $('#float').innerHTML = h; R.icons();
    if (UI.chatOpen) { var b = $('#chat-body'); if (b) b.scrollTop = b.scrollHeight; }
  }
  R.renderFloat = renderFloat;
  A.toggleDemo = function () { R.UI.demoOpen = !R.UI.demoOpen; renderFloat(); };
  A.toggleChat = function () { R.UI.chatOpen = !R.UI.chatOpen; renderFloat(); if (R.UI.chatOpen) setTimeout(function () { var i = $('#chat-input'); if (i) i.focus(); }, 50); };
  A.switchRole = function (el) {
    var r = ROLES.find(function (x) { return x.id === el.dataset.id; });
    R.UI.demoOpen = false;
    if (r.id === 'guest-visitor') R.logout();
    if (r.id === 'guest' || r.id === 'stay') { if (!R.DB.user) R.login(false); }
    if (r.portal === 'operator') { R.DB.opRole = r.id; R.save(); }
    R.toast('أنت الآن في بوابة: ' + r.label, 'info');
    R.go(r.href);
  };
  A.resetDemo = function () { R.UI.demoOpen = false; renderFloat(); R.confirm({ title: 'إعادة ضبط البيانات؟', msg: 'سيتم حذف كل الحجوزات والتعديلات التي أجريتها في النموذج والعودة للبيانات الأصلية.', ok: 'إعادة الضبط', danger: true, onOk: function () { setTimeout(R.reset, 10); } }); };
  A.dashSearch = function (el) { R.toast('نتائج البحث عن "' + esc(el.value) + '" — البحث الشامل غير مفعّل في النموذج', 'info'); };

  /* ---------- boot ---------- */
  R.load();
  window.addEventListener('hashchange', function () { R.closeAll(); R.render(); });
  document.addEventListener('DOMContentLoaded', function () { R.render(); setTimeout(R.icons, 800); });
})();
