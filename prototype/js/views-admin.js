/* رواف — إدارة المنصة */
(function () {
  'use strict';
  var R = window.R, A = R.A, ic = R.ic, esc = R.esc, sar = R.sar, fmt = R.fmt, C = R.C;
  var ME = 'يوسف الحارثي';
  function adShell(active, content) {
    var DB = R.DB;
    var vq = DB.verification.filter(function (v) { return v.status === 'بانتظار المراجعة'; }).length;
    var pq = DB.photoQA.filter(function (p) { return p.status === 'pending'; }).length;
    var iw = DB.integrations.filter(function (i) { return i.status !== 'متصل'; }).length;
    var dq = DB.damages.filter(function (d) { return d.status === 'بانتظار المراجعة' || d.status === 'بانتظار رد الضيف'; }).length;
    var nav = [
      { sec: 'نظرة عامة' },
      { id: 'home', label: 'مؤشرات المنصة', icon: 'layout-dashboard', href: '#/admin' },
      { sec: 'الجودة والاعتماد' },
      { id: 'verify', label: 'اعتماد الوحدات', icon: 'badge-check', href: '#/admin/verification', count: vq || null, alert: vq > 0 },
      { id: 'photos', label: 'فحص جودة الصور', icon: 'images', href: '#/admin/photos', count: pq || null, alert: pq > 0 },
      { id: 'disputes', label: 'الأضرار والنزاعات', icon: 'scale', href: '#/admin/disputes', count: dq || null },
      { sec: 'المستخدمون والنمو' },
      { id: 'users', label: 'المستخدمون والصلاحيات', icon: 'users', href: '#/admin/users', count: DB.users.length },
      { id: 'campaigns', label: 'الحملات التسويقية', icon: 'megaphone', href: '#/admin/campaigns' },
      { sec: 'النظام' },
      { id: 'integrations', label: 'التكاملات', icon: 'plug', href: '#/admin/integrations', count: iw || null, alert: iw > 0 },
      { id: 'pricing', label: 'محرك التسعير', icon: 'sparkles', href: '#/admin/pricing' },
      { id: 'settings', label: 'الإعدادات والمحتوى', icon: 'settings', href: '#/admin/settings' },
      { id: 'audit', label: 'سجل التدقيق', icon: 'scroll-text', href: '#/admin/audit' }
    ];
    return R.dashShell({ portal: 'admin', badge: 'PLATFORM ADMIN', portalName: 'إدارة المنصة', active: active, nav: nav, user: { name: ME, role: 'مدير المنصة' }, alerts: vq + iw, alertsHref: '#/admin/integrations', searchPh: 'ابحث عن مستخدم، وحدة، حجز...', searchAct: 'adSearch', content: content });
  }
  A.adSearch = function (el) { R.UI.adQ = el.value.trim(); R.go('#/admin/users'); };
  function pageH(t, sub, actions) { return '<div class="page-h"><div><h1>' + t + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="row wrap">' + actions + '</div>' : '') + '</div>'; }
  function pname(id) { var p = R.prop(id); return p ? p.title : '—'; }
  function logAudit(action, target) { R.audit(ME, 'مدير منصة', action, target); }

  /* ================= OVERVIEW ================= */
  R.route('/admin', function () {
    var DB = R.DB, S = C.platformSeries;
    var vq = DB.verification.filter(function (v) { return v.status === 'بانتظار المراجعة'; }).length, pq = DB.photoQA.filter(function (p) { return p.status === 'pending'; }).length;
    var q = function (icon, tone, n, t, href) { return '<a class="tile row gap-12" href="' + href + '"><span class="li-ic ' + tone + '">' + ic(icon, '', '•') + '</span><div class="grow"><div class="h3">' + n + '</div><div class="xs muted b">' + t + '</div></div>' + ic('chevron-left', 'ic-sm muted', '‹') + '</a>'; };
    var html = pageH('مؤشرات المنصة', 'أداء رواف على مستوى كل المدن والمشغّلين • ' + R.today(), '<button class="btn btn-ghost" data-act="toast" data-msg="تم تجهيز تقرير PDF (محاكاة)" data-kind="ok">' + ic('file-down', 'ic-sm', '') + 'تقرير شهري</button>') +
      '<div class="grid g4">' + R.stat({ icon: 'banknote', tone: 'gold', value: '3.3M ر.س', label: 'إجمالي الحجوزات GMV (سبتمبر)', sub: '<span class="trend-down">▼ 13%</span> بعد ذروة الصيف' }) + R.stat({ icon: 'calendar-check', value: fmt(3150), label: 'الحجوزات', sub: 'متوسط 2.3 ليلة' }) + R.stat({ icon: 'percent', tone: 'black', value: '495K ر.س', label: 'إيراد العمولات', sub: 'متوسط 15%' }) + R.stat({ icon: 'building-2', value: '1,284', label: 'الوحدات النشطة', sub: '+64 هذا الشهر' }) +
      R.stat({ icon: 'users', value: '48.2K', label: 'الضيوف النشطون', sub: '31% عملاء متكررون' }) + R.stat({ icon: 'bed-double', tone: 'gold', value: '74%', label: 'متوسط الإشغال', sub: 'الرياض 81% • أبها 58%' }) + R.stat({ icon: 'key-round', tone: 'green', value: '82%', label: 'وحدات بدخول ذكي', sub: '99.2% نجاح فتح الأقفال' }) + R.stat({ icon: 'star', tone: 'black', value: '4.72', label: 'متوسط التقييم', sub: '12,480 تقييم' }) + '</div>' +
      '<div class="grid g4 mt-16">' + q('badge-check', 'amber', vq, 'وحدات بانتظار الاعتماد', '#/admin/verification') + q('images', 'blue', pq, 'صور بانتظار الفحص', '#/admin/photos') + q('plug', 'red', DB.integrations.filter(function (i) { return i.status !== 'متصل'; }).length, 'تكاملات تحتاج تدخل', '#/admin/integrations') + q('scale', 'gold', DB.damages.filter(function (d) { return d.status !== 'معتمد' && d.status !== 'مرفوض'; }).length, 'نزاعات مفتوحة', '#/admin/disputes') + '</div>' +
      '<div class="grid g-2-1 mt-24" style="gap:24px"><div class="card card-p"><div class="card-h"><h3>إجمالي الحجوزات (مليون ر.س)</h3><div class="legend"><span><i style="background:#0A1931"></i>2026</span></div></div>' + R.lineChart({ values: S.gmv, labels: S.labels, fmtY: function (v) { return v.toFixed(1) + 'M'; }, fmtTip: function (v) { return v + 'M ر.س'; }, label: 'GMV الشهري' }) + '</div>' +
      '<div class="card card-p"><div class="card-h"><h3>الحجوزات حسب المدينة</h3></div>' + R.donut([{ l: 'الرياض', v: 1240, c: '#0A1931' }, { l: 'جدة', v: 980, c: '#C9A86A' }, { l: 'الخبر', v: 410, c: '#1d3a6b' }, { l: 'أبها', v: 320, c: '#8B6F47' }, { l: 'أخرى', v: 200, c: '#d9d2c2' }], { center: '3,150', centerSub: 'حجز' }) + '</div></div>' +
      '<div class="grid g2 mt-24" style="gap:24px"><div class="card card-p"><div class="card-h"><h3>الحجوزات الشهرية</h3></div>' + R.bars(S.bookings.map(function (v, i) { return { v: v, l: S.labels[i], t: fmt(v), gold: i === 6 }; }), { showV: false }) + '</div>' +
      '<div class="card card-p"><div class="card-h"><h3>قنوات الحجز</h3></div><div class="stack-sm">' + [['تطبيق رواف', 58], ['الموقع', 24], ['حجز مباشر عبر المشغّل', 11], ['واتساب', 7]].map(function (x) { return '<div class="hbar"><span class="xs b">' + x[0] + '</span><div class="bar"><div style="width:' + x[1] + '%"></div></div><span class="xs b">' + x[1] + '%</span></div>'; }).join('') + '</div><div class="divider"></div><div class="grid g2"><div class="soft"><div class="xs muted b">التحقق عبر نفاذ</div><div class="bb">97.4%</div></div><div class="soft"><div class="xs muted b">إرسال شموس في الوقت</div><div class="bb">99.1%</div></div></div></div></div>';
    return adShell('home', html);
  });

  /* ================= VERIFICATION ================= */
  R.route('/admin/verification', function () {
    var DB = R.DB, f = R.UI.vf || 'بانتظار المراجعة', list = DB.verification.filter(function (v) { return f === 'الكل' || v.status === f; });
    var html = pageH('اعتماد الوحدات', 'مراجعة مستندات الملكية والتراخيص والصور قبل النشر') + '<div class="mb-16">' + R.tabs(['بانتظار المراجعة', 'معتمد', 'مرفوض', 'الكل'].map(function (s) { return { id: s, label: s + ' (' + (s === 'الكل' ? DB.verification.length : DB.verification.filter(function (v) { return v.status === s; }).length) + ')' }; }), f, 'vf') + '</div>' +
      '<div class="stack">' + (list.length ? list.map(function (v) {
        var allOk = v.docs.every(function (d) { return d.ok; });
        return '<div class="card card-p"><div class="row-top wrap" style="gap:20px"><img src="' + v.image + '" alt="" style="width:180px;max-width:100%;height:130px;object-fit:cover;border-radius:16px"><div class="grow" style="min-width:240px"><div class="row between wrap"><div><div class="row"><span class="b ltr">' + v.id + '</span>' + R.pill(v.status) + '</div><h3 class="h3 mt-4">' + esc(v.name) + '</h3><div class="small muted">' + R.typeLabel(v.type) + ' • ' + v.city + ' • ' + v.units + ' وحدة • المالك: ' + esc(v.owner) + ' • قُدم ' + v.submitted + '</div></div></div>' +
          '<div class="grid g4 mt-12" style="gap:8px">' + v.docs.map(function (d) { return '<button class="soft row gap-4 small" style="text-align:right" data-act="docView" data-n="' + esc(d.name) + '" data-ok="' + d.ok + '">' + ic(d.ok ? 'file-check-2' : 'file-x-2', 'ic-sm ' + (d.ok ? 'green' : 'red'), d.ok ? '✓' : '×') + '<span class="truncate">' + d.name + '</span></button>'; }).join('') + '</div>' +
          '<div class="row wrap mt-12 small"><span class="pill ' + (v.lockPaired ? 'pill-green' : 'pill-amber') + '">' + (v.lockPaired ? 'قفل ذكي مقترن' : 'بدون قفل ذكي') + '</span><span class="pill pill-gray">الصور: ' + esc(v.photos) + '</span>' + (allOk ? '<span class="pill pill-green">المستندات مكتملة</span>' : '<span class="pill pill-red">مستندات ناقصة</span>') + '</div>' +
          (v.reason ? '<div class="notice red mt-12 small">' + ic('x-circle', '', '') + '<div><b>سبب الرفض:</b> ' + esc(v.reason) + '</div></div>' : '') +
          (v.status === 'بانتظار المراجعة' ? '<div class="row wrap mt-16"><button class="btn btn-success btn-sm" data-act="vApprove" data-id="' + v.id + '">' + ic('check', 'ic-sm', '') + 'اعتماد ونشر</button><button class="btn btn-danger btn-sm" data-act="vReject" data-id="' + v.id + '">رفض مع سبب</button><button class="btn btn-ghost btn-sm" data-act="vInfo" data-id="' + v.id + '">طلب مستندات إضافية</button></div>' : '') + '</div></div></div>';
      }).join('') : '<div class="card">' + R.empty('check-check', 'لا توجد طلبات في هذه القائمة') + '</div>') + '</div>';
    return adShell('verify', html);
  });
  A.vf = function (el) { R.UI.vf = el.dataset.id; R.rerender(); };
  A.docView = function (el) { R.modal({ title: esc(el.dataset.n), size: 'sm', body: '<div class="soft-lg center" style="height:220px;display:grid;place-items:center"><div>' + ic('file-text', 'ic-xl muted', '📄') + '<div class="small muted mt-8">معاينة المستند (توضيحية)</div></div></div><div class="notice ' + (el.dataset.ok === 'true' ? 'green' : 'red') + ' mt-12 small">' + ic(el.dataset.ok === 'true' ? 'check' : 'x', '', '') + '<div>' + (el.dataset.ok === 'true' ? 'تم التحقق آلياً: البيانات مطابقة لسجلات الملكية' : 'المستند غير مرفوع أو منتهي الصلاحية') + '</div></div>' }); };
  function findV(id) { return R.DB.verification.find(function (v) { return v.id === id; }); }
  A.vApprove = function (el) {
    var v = findV(el.dataset.id);
    if (!v.docs.every(function (d) { return d.ok; })) { R.confirm({ title: 'مستندات ناقصة', msg: 'بعض المستندات غير مكتملة. هل تريد الاعتماد المشروط (النشر خلال 14 يوماً بعد استكمال الترخيص)؟', ok: 'اعتماد مشروط', onOk: function () { doApprove(v, true); } }); return; }
    doApprove(v);
  };
  function doApprove(v, cond) {
    v.status = 'معتمد'; if (v.propertyId) { var p = R.prop(v.propertyId); if (p) p.status = cond ? 'قيد النشر' : 'متاحة'; }
    logAudit('اعتماد وحدة' + (cond ? ' (مشروط)' : ''), v.id); R.save(); R.toast('تم اعتماد ' + v.name + ' وإشعار المالك', 'ok'); R.rerender();
  }
  A.vReject = function (el) {
    R.modal({ title: 'رفض الطلب', size: 'sm', body: R.field('سبب الرفض (يُرسل للمالك)', '<select id="vr-s" class="select"><option>صك الملكية لا يطابق اسم المالك</option><option>ترخيص وزارة السياحة غير ساري</option><option>الصور لا تطابق المعايير</option><option>الموقع خارج نطاق الخدمة</option><option>أخرى</option></select>') + '<div class="mt-12">' + R.field('ملاحظات إضافية', '<textarea id="vr-n" class="textarea"></textarea>') + '</div>', foot: '<button class="btn btn-danger-solid" data-act="vRejectOk" data-id="' + el.dataset.id + '">رفض وإرسال</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.vRejectOk = function (el) { var v = findV(el.dataset.id); v.status = 'مرفوض'; v.reason = R.val('#vr-s') + (R.val('#vr-n') ? ' — ' + R.val('#vr-n') : ''); logAudit('رفض طلب اعتماد وحدة', v.id); R.save(); R.closeModal(); R.toast('تم رفض الطلب وإبلاغ المالك بالسبب'); R.rerender(); };
  A.vInfo = function (el) { R.toast('تم إرسال طلب مستندات إضافية للمالك عبر البريد وواتساب', 'ok'); };

  /* ================= PHOTO QA ================= */
  var REASONS = ['إضاءة ضعيفة', 'الصورة مائلة', 'دقة منخفضة', 'أغراض شخصية ظاهرة', 'لا تطابق الواقع'];
  R.route('/admin/photos', function () {
    var DB = R.DB, pend = DB.photoQA.filter(function (p) { return p.status === 'pending'; }), done = DB.photoQA.filter(function (p) { return p.status !== 'pending'; });
    var groups = {}; pend.forEach(function (p) { (groups[p.property] = groups[p.property] || []).push(p); });
    var html = pageH('فحص جودة الصور', pend.length + ' صورة بانتظار الفحص من ' + Object.keys(groups).length + ' جلسات', pend.length ? '<button class="btn btn-success" data-act="qaAll">' + ic('check-check', 'ic-sm', '') + 'قبول الكل</button>' : '') +
      (pend.length ? Object.keys(groups).map(function (k) {
        var g = groups[k];
        return '<div class="card card-p mb-16"><div class="card-h"><div><h3>' + esc(k) + '</h3><div class="xs muted">' + esc(g[0].photographer) + ' • ' + g[0].shootId + ' • ' + g.length + ' صور</div></div></div><div class="qa-grid">' + g.map(function (p) {
          return '<div class="qa-card"><img src="' + p.url + '" alt="" data-act="qaZoom" data-u="' + esc(p.url) + '" style="cursor:zoom-in"><div class="card-p-sm"><div class="row"><button class="btn btn-success btn-xs grow" data-act="qaDecide" data-id="' + p.id + '" data-v="approved">' + ic('check', 'ic-sm', '') + 'قبول</button><select class="select" style="height:30px;font-size:12px;flex:1.4" data-ch="qaReject" data-id="' + p.id + '" aria-label="سبب الرفض"><option value="">رفض بسبب…</option>' + REASONS.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></div></div></div>';
        }).join('') + '</div></div>';
      }).join('') : '<div class="card">' + R.empty('images', 'لا توجد صور بانتظار الفحص', 'عندما يرسل المصوّر صوراً جديدة تظهر هنا') + '</div>') +
      (done.length ? '<div class="card card-p mt-16"><div class="card-h"><h3>تم فحصها مؤخراً</h3></div><div class="qa-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">' + done.slice(0, 12).map(function (p) { return '<div class="qa-card ' + p.status + '"><img src="' + p.url + '" alt="" style="height:100px"><div class="xs b center" style="padding:6px">' + (p.status === 'approved' ? '<span class="green">مقبولة</span>' : '<span class="red">' + esc(p.note || 'مرفوضة') + '</span>') + '</div></div>'; }).join('') + '</div></div>' : '');
    return adShell('photos', html);
  });
  A.qaZoom = function (el) { R.modal({ title: 'معاينة الصورة', size: 'xl', body: '<img src="' + el.dataset.u.replace(/w=\d+/, 'w=1400') + '" alt="" style="width:100%;border-radius:16px">' }); };
  function syncShoot(shootId) {
    var s = R.DB.shoots.find(function (x) { return x.id === shootId; }); if (!s) return;
    var items = R.DB.photoQA.filter(function (q) { return q.shootId === shootId; });
    items.forEach(function (q) { var ph = s.photos.find(function (p) { return p.id === q.photoId || p.url === q.url; }); if (ph && q.status !== 'pending') { ph.qa = q.status; ph.note = q.note; } });
    if (items.some(function (q) { return q.status === 'pending'; })) return;
    var rej = items.filter(function (q) { return q.status === 'rejected'; });
    s.status = rej.length ? 'تحتاج إعادة' : 'مقبولة'; s.feedback = rej.length ? rej.length + ' صور تحتاج إعادة: ' + rej.map(function (r) { return r.note; }).join('، ') : 'ممتاز — تم النشر.';
    if (!rej.length && s.propertyId) { var p = R.prop(s.propertyId); if (p) { var urls = s.photos.map(function (x) { return x.url; }); p.images = urls.concat(p.images).slice(0, 8); p.image = p.images[0]; } }
  }
  function decide(id, v, note) { var p = R.DB.photoQA.find(function (x) { return x.id === id; }); p.status = v; p.note = note; syncShoot(p.shootId); }
  A.qaDecide = function (el) { decide(el.dataset.id, 'approved'); R.save(); R.toast('تم قبول الصورة', 'ok'); R.rerender(); };
  A.qaReject = function (el) { if (!el.value) return; decide(el.dataset.id, 'rejected', el.value); R.save(); R.toast('تم رفض الصورة: ' + el.value + ' — أُبلغ المصوّر'); R.rerender(); };
  A.qaAll = function () { var n = 0; R.DB.photoQA.forEach(function (p) { if (p.status === 'pending') { decide(p.id, 'approved'); n++; } }); logAudit('قبول ' + n + ' صورة', 'فحص الجودة'); R.save(); R.toast('تم قبول ' + n + ' صورة ونشرها', 'ok'); R.rerender(); };

  /* ================= USERS & ROLES ================= */
  R.route('/admin/users', function () {
    var DB = R.DB, t = R.UI.uTab || 'users', q = R.UI.adQ || '', rf = R.UI.uRole || '';
    var body;
    if (t === 'roles') {
      body = '<div class="card card-p"><div class="card-h"><h3>مصفوفة الصلاحيات</h3><span class="xs muted">اضغط لتفعيل/تعطيل</span></div><div class="tbl-wrap"><table class="tbl matrix"><thead><tr><th>الصلاحية</th>' + DB.roles.map(function (r) { return '<th>' + r + '</th>'; }).join('') + '</tr></thead><tbody>' + DB.permissions.map(function (p, i) { return '<tr><td class="b small">' + p.name + '</td>' + p.r.map(function (on, j) { return '<td><button class="btn btn-icon btn-xs ' + (on ? 'btn-success' : 'btn-ghost') + '" data-act="permToggle" data-i="' + i + '" data-j="' + j + '" aria-pressed="' + !!on + '" aria-label="' + p.name + ' — ' + DB.roles[j] + '"' + (j === 0 ? ' disabled title="صلاحيات مدير المنصة ثابتة"' : '') + '>' + (on ? '✓' : '—') + '</button></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
    } else {
      var list = DB.users.filter(function (u) { return (!q || (u.name + u.contact).indexOf(q) >= 0) && (!rf || u.role === rf); });
      body = '<div class="card card-p"><div class="row between wrap mb-16"><div class="search" style="max-width:300px">' + ic('search', '', '⌕') + '<input type="search" placeholder="بحث بالاسم أو الجوال" value="' + esc(q) + '" data-enter="uSearch" aria-label="بحث"></div><select class="select" style="width:auto" data-ch="uRole" aria-label="تصفية بالدور"><option value="">كل الأدوار</option>' + ['ضيف', 'مالك', 'مشغّل', 'مشرف', 'مصوّر', 'دعم العملاء', 'مدير منصة'].map(function (r) { return '<option' + (r === rf ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>الانضمام</th><th>آخر نشاط</th><th></th></tr></thead><tbody>' + list.map(function (u) {
          return '<tr><td><div class="row gap-12"><div class="avatar avatar-sm">' + esc(u.name[0]) + '</div><div><div class="b">' + esc(u.name) + '</div><div class="xs muted ltr">' + esc(u.contact) + '</div></div></div></td><td><span class="pill pill-navy">' + u.role + '</span></td><td>' + R.pill(u.status) + '</td><td class="small">' + u.joined + '</td><td class="small muted">' + u.last + '</td><td class="nowrap"><button class="btn btn-ghost btn-xs" data-act="uEdit" data-id="' + u.id + '">تعديل الدور</button> ' + (u.status === 'نشط' ? '<button class="btn btn-danger btn-xs" data-act="uSuspend" data-id="' + u.id + '">تعليق</button>' : u.status === 'معلق' ? '<button class="btn btn-success btn-xs" data-act="uSuspend" data-id="' + u.id + '">تفعيل</button>' : '<button class="btn btn-ghost btn-xs" data-act="toast" data-msg="تمت إعادة إرسال الدعوة" data-kind="ok">إعادة الدعوة</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' + (list.length ? '' : R.empty('user-x', 'لا يوجد مستخدمون مطابقون')) + '</div>';
    }
    var html = pageH('المستخدمون والصلاحيات', DB.users.length + ' حساب داخلي وشريك', '<button class="btn btn-primary" data-act="uInvite">' + ic('user-plus', 'ic-sm', '+') + 'دعوة مستخدم</button>') + '<div class="mb-16">' + R.tabs([{ id: 'users', label: 'المستخدمون' }, { id: 'roles', label: 'الأدوار والصلاحيات' }], t, 'uTab') + '</div>' + body;
    return adShell('users', html);
  });
  A.uTab = function (el) { R.UI.uTab = el.dataset.id; R.rerender(); };
  A.uSearch = function (el) { R.UI.adQ = el.value.trim(); R.rerender(); };
  A.uRole = function (el) { R.UI.uRole = el.value; R.rerender(); };
  A.permToggle = function (el) { var p = R.DB.permissions[Number(el.dataset.i)], j = Number(el.dataset.j); p.r[j] = p.r[j] ? 0 : 1; logAudit('تعديل صلاحية «' + p.name + '»', R.DB.roles[j]); R.save(); R.toast('تم تحديث الصلاحية', 'ok'); R.rerender(); };
  A.uInvite = function () { R.modal({ title: 'دعوة مستخدم', size: 'sm', body: '<div class="stack">' + R.field('الاسم', '<input id="ui-n" class="input">') + R.field('البريد أو الجوال', '<input id="ui-c" class="input">') + R.field('الدور', '<select id="ui-r" class="select">' + R.DB.roles.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select>') + '</div>', foot: '<button class="btn btn-primary" data-act="uInviteOk">إرسال الدعوة</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' }); };
  A.uInviteOk = function () { var n = R.val('#ui-n'), c = R.val('#ui-c'); if (!n || !c) { R.toast('الاسم والتواصل مطلوبان', 'err'); return; } R.DB.users.push({ id: R.uid('us'), name: n, contact: c, role: R.val('#ui-r'), status: 'مدعو', joined: R.today(), last: '—' }); logAudit('دعوة مستخدم (' + R.val('#ui-r') + ')', n); R.save(); R.closeModal(); R.toast('تم إرسال الدعوة إلى ' + n, 'ok'); R.rerender(); };
  A.uEdit = function (el) { var u = R.DB.users.find(function (x) { return x.id === el.dataset.id; }); R.modal({ title: 'تعديل دور ' + esc(u.name), size: 'sm', body: R.field('الدور', '<select id="ue-r" class="select">' + ['ضيف'].concat(R.DB.roles).map(function (r) { return '<option' + (r === u.role ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select>'), foot: '<button class="btn btn-primary" data-act="uEditOk" data-id="' + u.id + '">حفظ</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' }); };
  A.uEditOk = function (el) { var u = R.DB.users.find(function (x) { return x.id === el.dataset.id; }); u.role = R.val('#ue-r'); logAudit('تغيير دور المستخدم إلى ' + u.role, u.name); R.save(); R.closeModal(); R.toast('تم تحديث الدور', 'ok'); R.rerender(); };
  A.uSuspend = function (el) { var u = R.DB.users.find(function (x) { return x.id === el.dataset.id; }), to = u.status === 'نشط' ? 'معلق' : 'نشط'; R.confirm({ title: (to === 'معلق' ? 'تعليق ' : 'تفعيل ') + esc(u.name) + '؟', danger: to === 'معلق', ok: to === 'معلق' ? 'تعليق الحساب' : 'تفعيل', msg: to === 'معلق' ? 'سيتم إيقاف الدخول وإلغاء رموز الأقفال الصادرة لهذا المستخدم.' : 'سيستعيد المستخدم صلاحياته.', onOk: function () { u.status = to; logAudit((to === 'معلق' ? 'تعليق' : 'تفعيل') + ' حساب', u.name); R.save(); R.toast('تم', 'ok'); R.rerender(); } }); };

  /* ================= CAMPAIGNS ================= */
  R.route('/admin/campaigns', function () {
    var C2 = R.DB.platformCampaigns, tot = C2.reduce(function (a, c) { a.s += c.spent; a.r += c.revenue; a.b += c.bookings; a.i += c.impressions; a.c += c.clicks; return a; }, { s: 0, r: 0, b: 0, i: 0, c: 0 });
    var html = pageH('الحملات التسويقية', 'حملات المنصة عبر القنوات الرقمية وأثرها على الحجوزات', '<button class="btn btn-primary" data-act="cNew">' + ic('plus', 'ic-sm', '+') + 'حملة جديدة</button>') +
      '<div class="grid g4">' + R.stat({ icon: 'eye', value: fmt(Math.round(tot.i / 1000)) + 'K', label: 'مرات الظهور' }) + R.stat({ icon: 'mouse-pointer-click', value: fmt(tot.c), label: 'النقرات', sub: 'CTR ' + (tot.c / tot.i * 100).toFixed(1) + '%' }) + R.stat({ icon: 'calendar-check', tone: 'gold', value: fmt(tot.b), label: 'الحجوزات', sub: 'تكلفة الحجز ' + sar(tot.s / tot.b) }) + R.stat({ icon: 'trending-up', tone: 'green', value: (tot.r / tot.s).toFixed(1) + 'x', label: 'العائد على الإنفاق ROAS', sub: sar(tot.r) + ' إيراد' }) + '</div>' +
      '<div class="card card-p mt-24"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الحملة</th><th>القناة</th><th>الميزانية</th><th>الظهور</th><th>النقرات</th><th>الحجوزات</th><th>الإيراد</th><th>ROAS</th><th>الحالة</th><th></th></tr></thead><tbody>' + C2.map(function (c, i) {
        var roas = c.spent ? c.revenue / c.spent : 0;
        return '<tr><td><div class="b">' + esc(c.name) + '</div><div class="xs muted">' + c.from + ' ← ' + c.to + ' • ' + c.units + ' وحدة</div></td><td><span class="pill pill-gray">' + c.channel + '</span></td><td class="nowrap"><div class="small b">' + sar(c.spent) + '</div><div class="bar thin" style="width:80px"><div style="width:' + Math.min(100, c.spent / c.budget * 100) + '%"></div></div><div class="xs muted">من ' + sar(c.budget) + '</div></td><td>' + fmt(c.impressions) + '</td><td>' + fmt(c.clicks) + '</td><td class="b">' + c.bookings + '</td><td class="b nowrap">' + sar(c.revenue) + '</td><td class="' + (roas >= 5 ? 'trend-up' : roas ? 'b' : 'muted') + '">' + (roas ? roas.toFixed(1) + 'x' : '—') + '</td><td>' + R.pill(c.status) + '</td><td>' + (c.status === 'نشطة' || c.status === 'معلق' ? '<button class="btn btn-ghost btn-xs" data-act="cToggle" data-i="' + i + '">' + (c.status === 'نشطة' ? 'إيقاف' : 'استئناف') + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    return adShell('campaigns', html);
  });
  A.cToggle = function (el) { var c = R.DB.platformCampaigns[Number(el.dataset.i)]; c.status = c.status === 'نشطة' ? 'معلق' : 'نشطة'; logAudit((c.status === 'نشطة' ? 'استئناف' : 'إيقاف') + ' حملة', c.name); R.save(); R.toast('تم تحديث الحملة', 'ok'); R.rerender(); };
  A.cNew = function () {
    R.modal({ title: 'حملة جديدة', size: 'lg', body: '<div class="grid g2">' + R.field('اسم الحملة', '<input id="cn-n" class="input" placeholder="مثال: إجازة منتصف الفصل">') + R.field('القناة', '<select id="cn-c" class="select"><option>Snapchat</option><option>Google Ads</option><option>Instagram</option><option>TikTok</option><option>X</option><option>رسائل واتساب</option><option>البريد الإلكتروني</option></select>') + R.field('الميزانية (ر.س)', '<input id="cn-b" class="input" type="number" value="15000">') + R.field('الوحدات المستهدفة', '<select id="cn-u" class="select"><option value="60">كل الوحدات بدخول ذكي (60)</option><option value="18">الرياض فقط (18)</option><option value="12">جدة فقط (12)</option><option value="9">وحدات مضيف مميز (9)</option></select>') + R.field('البداية', '<input id="cn-f" type="date" class="input" value="' + R.today() + '">') + R.field('النهاية', '<input id="cn-t" type="date" class="input" value="' + R.addDays(R.today(), 21) + '">') + '</div><div class="notice gold mt-16 small">' + ic('sparkles', '', '') + '<div>تقدير الأداء: ~220K ظهور، ~70 حجزاً، ROAS متوقع 6x بناءً على حملات مشابهة.</div></div>',
      foot: '<button class="btn btn-primary" data-act="cNewOk">إطلاق الحملة</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.cNewOk = function () { var n = R.val('#cn-n'), b = Number(R.val('#cn-b')); if (!n) { R.toast('اسم الحملة مطلوب', 'err'); return; } if (!(b >= 1000)) { R.toast('الميزانية 1,000 ر.س على الأقل', 'err'); return; } R.DB.platformCampaigns.unshift({ id: 'PC-' + Math.floor(15 + Math.random() * 80), name: n, channel: R.val('#cn-c'), budget: b, spent: 0, from: R.val('#cn-f'), to: R.val('#cn-t'), units: Number(R.val('#cn-u')), impressions: 0, clicks: 0, bookings: 0, revenue: 0, status: R.val('#cn-f') <= R.today() ? 'نشطة' : 'مجدولة' }); logAudit('إطلاق حملة', n); R.save(); R.closeModal(); R.toast('تم إطلاق الحملة', 'ok'); R.rerender(); };

  /* ================= INTEGRATIONS ================= */
  var LOGO = { shomoos: ['ش', '#0F4C81', '#fff'], nafath: ['ن', '#0F8A5F', '#fff'], ewaa: ['إ', '#7A3E9D', '#fff'], locks: [null, '#0A1931', '#C9A86A', 'key-round'], payments: [null, '#C9A86A', '#0A1931', 'credit-card'], sms: [null, '#25D366', '#fff', 'message-circle'] };
  R.route('/admin/integrations', function () {
    var I = R.DB.integrations;
    var html = pageH('التكاملات', 'حالة الربط مع الجهات الحكومية ومزودي الخدمة', '<button class="btn btn-ghost" data-act="intAll">' + ic('refresh-cw', 'ic-sm', '') + 'فحص الكل</button>') +
      '<div class="grid g3">' + I.map(function (x, i) {
        var L = LOGO[x.id], dot = x.status === 'متصل' ? 'dot-green' : x.status === 'تحذير' ? 'dot-amber' : 'dot-red';
        return '<div class="card card-p int-card"><div class="row between"><div class="row gap-12"><span class="int-logo" style="background:' + L[1] + ';color:' + L[2] + '">' + (L[0] || ic(L[3], 'ic-lg', '•')) + '</span><div><div class="bb">' + x.name + '</div><div class="xs muted">' + x.desc + '</div></div></div></div>' +
          '<div class="row between"><span class="row small b"><span class="dot ' + dot + (x.status !== 'متصل' ? ' pulse' : '') + '"></span>' + x.status + '</span><span class="xs muted ltr">آخر مزامنة ' + x.lastSync.slice(5) + '</span></div>' +
          '<div class="grid g2" style="gap:8px"><div class="soft"><div class="xs muted b">التوفر (30 يوم)</div><div class="bb">' + x.uptime + '%</div></div><div class="soft"><div class="xs muted b">طلبات اليوم</div><div class="bb">' + fmt(x.calls) + '</div></div></div>' +
          (x.errors.length ? '<div><div class="xs b red mb-8">سجل الأخطاء (' + x.errors.length + ')</div>' + x.errors.slice(0, 2).map(function (e) { return '<div class="code" style="margin-bottom:6px;font-size:11px">[' + e.time.slice(11) + '] ' + e.code + '\n<span dir="rtl" style="display:block;text-align:right;font-family:var(--font)">' + esc(e.msg) + '</span></div>'; }).join('') + '</div>' : '<div class="notice green xs">' + ic('check', 'ic-sm', '') + '<div>لا توجد أخطاء خلال 24 ساعة</div></div>') +
          '<div class="row wrap"><button class="btn btn-primary btn-xs" data-act="intRetry" data-i="' + i + '">' + ic('rotate-cw', 'ic-sm', '') + (x.status === 'متصل' ? 'اختبار الاتصال' : 'إعادة المحاولة') + '</button><button class="btn btn-ghost btn-xs" data-act="intCfg" data-i="' + i + '">الإعدادات</button><button class="btn btn-ghost btn-xs" data-act="intLog" data-i="' + i + '">السجل الكامل</button></div></div>';
      }).join('') + '</div>';
    return adShell('integrations', html);
  });
  A.intRetry = function (el) {
    var x = R.DB.integrations[Number(el.dataset.i)]; el.innerHTML = '<span class="spin"></span> جارٍ…';
    setTimeout(function () {
      if (x.id === 'sms' && !x.renewed) { R.toast('فشل: رمز الوصول منتهي — جدّد المفتاح من الإعدادات', 'err'); x.errors.unshift({ time: R.nowTS(), code: 'WA-401', msg: 'إعادة المحاولة فشلت — رمز الوصول منتهي' }); R.save(); R.rerender(); return; }
      x.status = 'متصل'; x.lastSync = R.nowTS(); x.errors = x.errors.filter(function (e) { return e.code !== 'SHM-409'; });
      if (x.id === 'shomoos') R.DB.opBookings.forEach(function (b) { if (b.shomoos.indexOf('فشل') === 0) b.shomoos = 'تم الإرسال'; });
      logAudit('إعادة محاولة التكامل', x.name); R.save(); R.toast('تم الاتصال بـ ' + x.name + ' بنجاح', 'ok'); R.rerender();
    }, 1300);
  };
  A.intAll = function () { R.toast('جارٍ فحص كل التكاملات…'); setTimeout(function () { R.toast('5 من 6 تكاملات تعمل — واتساب يحتاج تجديد المفتاح', 'info'); }, 1200); };
  A.intCfg = function (el) {
    var x = R.DB.integrations[Number(el.dataset.i)];
    R.modal({ title: 'إعدادات ' + x.name, size: 'sm', body: '<div class="stack">' + R.field('البيئة', '<select class="select"><option>الإنتاج (Production)</option><option>تجريبية (Sandbox)</option></select>') + R.field('مفتاح API', '<div class="row"><input class="input ltr" style="display:block" value="sk_live_••••••••' + x.id.slice(0, 3) + '" disabled><button class="btn btn-ghost btn-sm" data-act="intRenew" data-i="' + el.dataset.i + '">تجديد</button></div>') + R.field('عنوان Webhook', '<input class="input ltr" style="display:block" value="https://api.rawaaf.sa/hooks/' + x.id + '" disabled>') + '<div class="setting-row"><span class="b small">إعادة المحاولة التلقائية</span>' + R.toggle('data-ch="noop"', true, 'إعادة المحاولة') + '</div><div class="setting-row"><span class="b small">تنبيه عند الانقطاع (SMS + بريد)</span>' + R.toggle('data-ch="noop"', true, 'تنبيه') + '</div></div>', foot: '<button class="btn btn-primary" data-act="closeModalSaved">حفظ</button>' });
  };
  A.closeModalSaved = function () { R.closeModal(); R.toast('تم حفظ الإعدادات', 'ok'); };
  A.intRenew = function (el) { var x = R.DB.integrations[Number(el.dataset.i)]; x.renewed = true; R.save(); R.toast('تم تجديد مفتاح ' + x.name + ' — أعد المحاولة الآن', 'ok'); };
  A.intLog = function (el) { var x = R.DB.integrations[Number(el.dataset.i)]; R.modal({ title: 'سجل ' + x.name, size: 'lg', body: x.errors.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الوقت</th><th>الرمز</th><th>الرسالة</th></tr></thead><tbody>' + x.errors.map(function (e) { return '<tr><td class="ltr small nowrap">' + e.time + '</td><td><span class="kbd">' + e.code + '</span></td><td class="small">' + esc(e.msg) + '</td></tr>'; }).join('') + '</tbody></table></div>' : R.empty('check-check', 'لا توجد أخطاء مسجلة') }); };

  /* ================= DISPUTES ================= */
  R.route('/admin/disputes', function () {
    var D = R.DB.damages;
    var html = pageH('الأضرار والنزاعات', 'مراجعة محايدة لقضايا الأضرار بين الضيوف والمشغّلين') +
      '<div class="grid g4 mb-16">' + ['بانتظار المراجعة', 'بانتظار رد الضيف', 'معتمد', 'مرفوض'].map(function (s, i) { return R.stat({ icon: ['hourglass', 'message-square', 'check-circle-2', 'x-circle'][i], tone: ['gold', '', 'green', 'red'][i], value: D.filter(function (d) { return d.status === s; }).length, label: s }); }).join('') + '</div>' +
      '<div class="card card-p"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>القضية</th><th>الوحدة / الحجز</th><th>الضيف</th><th>التقدير</th><th>الأدلة</th><th>الحالة</th><th></th></tr></thead><tbody>' + D.map(function (d, i) {
        return '<tr><td><div class="b">' + esc(d.title) + '</div><div class="xs muted">' + d.id + ' • ' + d.date + (d.escalated ? ' • <span class="red b">مُصعّدة</span>' : '') + '</div></td><td class="small">' + esc(pname(d.propertyId)) + '<div class="xs muted ltr" style="text-align:right">' + d.bookingId + '</div></td><td class="small">' + esc(d.guest) + '</td><td class="b nowrap">' + sar(d.estimate) + '</td><td><div class="row" style="gap:4px">' + d.photos.slice(0, 2).map(function (u) { return '<img src="' + u + '" alt="" class="thumb" style="width:36px;height:36px">'; }).join('') + '</div></td><td>' + R.pill(d.status) + '</td><td><button class="btn btn-primary btn-xs" data-act="dReview" data-i="' + i + '">مراجعة</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    return adShell('disputes', html);
  });
  A.dReview = function (el) {
    var d = R.DB.damages[Number(el.dataset.i)], open = d.status !== 'معتمد' && d.status !== 'مرفوض';
    R.modal({ title: 'قضية ' + d.id + ' — ' + esc(d.title), sub: esc(pname(d.propertyId)) + ' • ' + d.bookingId, size: 'lg',
      body: '<div class="grid g2"><div><div class="bb mb-8">أدلة المشرف (' + esc(d.reportedBy) + ')</div><div class="thumbs-row">' + d.photos.map(function (u) { return '<img src="' + u + '" alt="" style="width:130px;height:100px">'; }).join('') + '</div><p class="small lh mt-8">' + esc(d.desc) + '</p><div class="xs muted mt-4">صور فحص ما قبل الوصول متاحة: نعم • الطابع الزمني موثق</div></div>' +
        '<div><div class="bb mb-8">رد الضيف (' + esc(d.guest) + ')</div>' + (d.guestResponse ? '<div class="owner-reply" style="margin-top:0">' + esc(d.guestResponse) + '</div>' : '<div class="soft small muted">لم يرد الضيف بعد' + (d.status === 'بانتظار رد الضيف' ? ' — المهلة تنتهي خلال 48 ساعة' : '') + '</div>') + '<div class="mt-16">' + R.field('مبلغ الغرامة المعتمد (ر.س)', '<input id="dr-f" class="input" type="number" value="' + d.fine + '"' + (open ? '' : ' disabled') + '>', 'التقدير الأصلي ' + sar(d.estimate)) + '</div>' + R.field('ملاحظة القرار', '<textarea id="dr-n" class="textarea" style="min-height:70px"' + (open ? '' : ' disabled') + '></textarea>') + '</div></div>',
      foot: open ? '<button class="btn btn-success" data-act="dDecide" data-i="' + el.dataset.i + '" data-v="معتمد">اعتماد الغرامة وإشعار الضيف</button><button class="btn btn-danger" data-act="dDecide" data-i="' + el.dataset.i + '" data-v="مرفوض">رفض القضية</button>' + (d.status !== 'بانتظار رد الضيف' ? '<button class="btn btn-ghost" data-act="dDecide" data-i="' + el.dataset.i + '" data-v="بانتظار رد الضيف">طلب رد الضيف</button>' : '') : '<span class="small muted">القضية مغلقة: ' + d.status + '</span>' });
  };
  A.dDecide = function (el) {
    var d = R.DB.damages[Number(el.dataset.i)], v = el.dataset.v; d.status = v;
    if (v === 'معتمد') d.fine = Number(R.val('#dr-f')) || 0; if (v === 'مرفوض') d.fine = 0;
    logAudit('قرار قضية ضرر: ' + v, d.id); R.save(); R.closeModal();
    R.toast(v === 'معتمد' ? 'تم اعتماد غرامة ' + sar(d.fine) + ' وإشعار الضيف بالصور والقرار' : v === 'مرفوض' ? 'تم رفض القضية وإشعار الطرفين' : 'تم إرسال طلب الرد للضيف', 'ok'); R.rerender();
  };

  /* ================= PRICING ENGINE ================= */
  R.route('/admin/pricing', function () {
    var DB = R.DB, sg = DB.settings.signals;
    var sigRow = function (k, t, s) { return '<div class="setting-row"><div><div class="b small">' + t + '</div><div class="xs muted">' + s + '</div></div>' + R.toggle('data-ch="sigToggle" data-k="' + k + '"', sg[k], t) + '</div>'; };
    var kindCls = { 'عطلة رسمية': 'pill-red', 'فعالية': 'pill-blue', 'موسم': 'pill-gold', 'مناسبة': 'pill-green' };
    var html = pageH('محرك التسعير', 'الإشارات التي تبني عليها اقتراحات الأسعار لكل المشغّلين') +
      '<div class="grid g-2-1" style="gap:24px;align-items:start"><div class="card card-p"><div class="card-h"><h3>تقويم الفعاليات والعطلات</h3><button class="btn btn-primary btn-sm" data-act="evNew">' + ic('plus', 'ic-sm', '+') + 'إضافة</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الحدث</th><th>النوع</th><th>المدينة</th><th>الفترة</th><th>الأثر</th><th></th></tr></thead><tbody>' + DB.pricingEvents.map(function (e, i) {
        return '<tr><td class="b">' + esc(e.name) + '</td><td><span class="pill ' + (kindCls[e.kind] || 'pill-gray') + '">' + e.kind + '</span></td><td>' + e.city + '</td><td class="small nowrap">' + e.from + '<br><span class="muted">' + e.to + '</span></td><td class="trend-up">+' + e.uplift + '%</td><td class="nowrap"><button class="btn btn-ghost btn-icon btn-xs" data-act="evEdit" data-i="' + i + '" aria-label="تعديل">' + ic('pencil', 'ic-sm', '✎') + '</button> <button class="btn btn-danger btn-icon btn-xs" data-act="evDel" data-i="' + i + '" aria-label="حذف">' + ic('trash-2', 'ic-sm', '×') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<h3 class="h3 mt-24 mb-8">المواسم</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الموسم</th><th>الفترة</th><th>المدن</th><th>الأثر</th></tr></thead><tbody>' + DB.seasons.map(function (s) { return '<tr><td class="b">' + s.name + '</td><td class="small">' + s.from + (s.to ? ' ← ' + s.to : '') + '</td><td class="small">' + s.cities + '</td><td class="trend-up">+' + s.uplift + '%</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="stack"><div class="card card-p"><h3 class="h3 mb-8">الإشارات المفعلة</h3>' + sigRow('holidays', 'العطلات الرسمية', 'التقويم الرسمي + الإجازات الدراسية') + sigRow('events', 'الفعاليات', 'مواسم الترفيه والمؤتمرات والمباريات') + sigRow('seasons', 'المواسم', 'الصيف، الشتاء، رمضان والأعياد') + sigRow('demand', 'الطلب اللحظي', 'معدل البحث والحجز في المدينة') + sigRow('competitors', 'أسعار المنافسين', 'تجريبي — يتطلب مزود بيانات') + '</div>' +
      '<div class="card card-p"><h3 class="h3 mb-8">الحدود العامة</h3>' + R.kv('أقصى رفع مسموح', '+45%') + R.kv('أقصى خفض مسموح', '-20%') + R.kv('نسبة قبول الاقتراحات', '71%') + R.kv('الأثر على الإيراد (30 يوم)', '<span class="green">+8.4%</span>') + '</div></div></div>';
    return adShell('pricing', html);
  });
  A.sigToggle = function (el) { R.DB.settings.signals[el.dataset.k] = el.checked; logAudit((el.checked ? 'تفعيل' : 'تعطيل') + ' إشارة تسعير', el.dataset.k); R.save(); R.toast('تم تحديث إشارات التسعير', 'ok'); };
  function evForm(e) { return '<div class="grid g2">' + R.field('اسم الحدث', '<input id="ev-n" class="input" value="' + esc(e.name || '') + '">') + R.field('النوع', '<select id="ev-k" class="select">' + ['عطلة رسمية', 'فعالية', 'موسم', 'مناسبة'].map(function (k) { return '<option' + (k === e.kind ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select>') + R.field('المدينة', '<select id="ev-c" class="select"><option>الكل</option>' + R.DB.settings.cities.map(function (c) { return '<option' + (c === e.city ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>') + R.field('الأثر على السعر %', '<input id="ev-u" class="input" type="number" value="' + (e.uplift || 10) + '">') + R.field('من', '<input id="ev-f" type="date" class="input" value="' + (e.from || R.today()) + '">') + R.field('إلى', '<input id="ev-t" type="date" class="input" value="' + (e.to || R.addDays(R.today(), 3)) + '">') + '</div>'; }
  A.evNew = function () { R.modal({ title: 'إضافة حدث', size: 'lg', body: evForm({}), foot: '<button class="btn btn-primary" data-act="evSave" data-i="-1">إضافة</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' }); };
  A.evEdit = function (el) { R.modal({ title: 'تعديل حدث', size: 'lg', body: evForm(R.DB.pricingEvents[Number(el.dataset.i)]), foot: '<button class="btn btn-primary" data-act="evSave" data-i="' + el.dataset.i + '">حفظ</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' }); };
  A.evSave = function (el) {
    var n = R.val('#ev-n'), f = R.val('#ev-f'), t = R.val('#ev-t'); if (!n) { R.toast('اسم الحدث مطلوب', 'err'); return; } if (t < f) { R.toast('تاريخ النهاية قبل البداية', 'err'); return; }
    var e = { id: R.uid('ev'), name: n, kind: R.val('#ev-k'), city: R.val('#ev-c'), uplift: Number(R.val('#ev-u')) || 0, from: f, to: t }, i = Number(el.dataset.i);
    if (i >= 0) { e.id = R.DB.pricingEvents[i].id; R.DB.pricingEvents[i] = e; } else R.DB.pricingEvents.push(e);
    logAudit(i >= 0 ? 'تعديل حدث تسعير' : 'إضافة حدث تسعير', n); R.save(); R.closeModal(); R.toast('تم الحفظ — ستتحدث اقتراحات الأسعار تلقائياً', 'ok'); R.rerender();
  };
  A.evDel = function (el) { var e = R.DB.pricingEvents[Number(el.dataset.i)]; R.confirm({ title: 'حذف «' + esc(e.name) + '»؟', danger: true, ok: 'حذف', onOk: function () { R.DB.pricingEvents.splice(Number(el.dataset.i), 1); logAudit('حذف حدث تسعير', e.name); R.save(); R.toast('تم الحذف'); R.rerender(); } }); };

  /* ================= SETTINGS / CMS ================= */
  R.route('/admin/settings', function () {
    var S = R.DB.settings, t = R.UI.sTab || 'content', body;
    var chipList = function (key, label) { return '<div class="mb-16"><div class="bb mb-8">' + label + '</div><div class="chips">' + S[key].map(function (x, i) { return '<span class="chip chip-sm" style="cursor:default">' + esc(x) + '<button data-act="sDel" data-k="' + key + '" data-i="' + i + '" aria-label="حذف ' + esc(x) + '" class="muted">' + ic('x', 'ic-sm', '×') + '</button></span>'; }).join('') + '<span class="row" style="gap:4px"><input class="input" style="height:30px;width:130px;font-size:12px" id="add-' + key + '" placeholder="إضافة…" data-enter="sAdd" data-k="' + key + '"><button class="btn btn-primary btn-xs" data-act="sAdd" data-k="' + key + '">+</button></span></div></div>'; };
    if (t === 'content') body = '<div class="card card-p">' + chipList('cities', 'المدن المفعلة') + chipList('types', 'أنواع الوحدات') + chipList('amenities', 'المرافق') + '</div>';
    else if (t === 'fees') body = '<div class="card card-p"><div class="grid g3">' + R.field('عمولة المنصة %', '<input id="s-com" class="input" type="number" value="' + S.commission + '">', 'تطبق على الإيراد قبل الضريبة') + R.field('ضريبة القيمة المضافة %', '<input id="s-vat" class="input" type="number" value="' + S.vat + '">', 'حسب هيئة الزكاة والضريبة والجمارك') + R.field('رسوم معالجة الدفع %', '<input class="input" type="number" value="2">') + '</div><button class="btn btn-primary mt-16" data-act="sFees">حفظ</button></div>';
    else if (t === 'cancel') body = '<div class="stack">' + S.cancellation.map(function (c, i) { return '<div class="card card-p"><div class="grid g-2-1" style="align-items:end">' + R.field('قالب: ' + c.name, '<textarea class="textarea" style="min-height:64px" id="cp-' + i + '">' + esc(c.desc) + '</textarea>') + '<button class="btn btn-ghost" data-act="sCancel" data-i="' + i + '">حفظ القالب</button></div></div>'; }).join('') + '</div>';
    else { var L = S.loyalty; body = '<div class="card card-p"><div class="grid g3">' + R.field('الكاش باك الأساسي %', '<input id="l-cb" class="input" type="number" value="' + L.cashback + '">') + R.field('نقاط لكل 100 ر.س', '<input id="l-pp" class="input" type="number" value="' + L.pointsPer100 + '">') + R.field('قيمة الاستبدال', '<input class="input" value="' + L.redeemPoints + ' نقطة = ' + L.redeemValue + ' ر.س" disabled>') + R.field('نقاط الترحيب', '<input id="l-w" class="input" type="number" value="' + L.welcome + '">') + R.field('نقاط التقييم', '<input id="l-r" class="input" type="number" value="' + L.review + '">') + R.field('مكافأة الولاء', '<input class="input" value="تنظيف مجاني بعد 5 حجوزات" disabled>') + '</div><h3 class="h3 mt-24 mb-8">المستويات</h3><div class="tbl-wrap"><table class="tbl" style="min-width:400px"><thead><tr><th>المستوى</th><th>من (نقطة)</th><th>الكاش باك</th></tr></thead><tbody>' + L.tiers.map(function (x) { return '<tr><td class="b">' + x.name + '</td><td>' + fmt(x.min) + '</td><td>' + x.cashback + '%</td></tr>'; }).join('') + '</tbody></table></div><button class="btn btn-primary mt-16" data-act="sLoyal">حفظ إعدادات الولاء</button></div>'; }
    var html = pageH('الإعدادات والمحتوى', 'البيانات المرجعية والرسوم والسياسات وبرنامج الولاء') + '<div class="mb-16">' + R.tabs([{ id: 'content', label: 'المدن والأنواع والمرافق' }, { id: 'fees', label: 'العمولة والضريبة' }, { id: 'cancel', label: 'قوالب الإلغاء' }, { id: 'loyalty', label: 'الولاء والكاش باك' }], t, 'sTab') + '</div>' + body;
    return adShell('settings', html);
  });
  A.sTab = function (el) { R.UI.sTab = el.dataset.id; R.rerender(); };
  A.sDel = function (el) { var arr = R.DB.settings[el.dataset.k], x = arr[Number(el.dataset.i)]; arr.splice(Number(el.dataset.i), 1); logAudit('حذف من ' + el.dataset.k, x); R.save(); R.toast('تم حذف «' + esc(x) + '»'); R.rerender(); };
  A.sAdd = function (el) { var k = el.dataset.k, v = R.val('#add-' + k); if (!v) { R.toast('أدخل قيمة', 'err'); return; } if (R.DB.settings[k].indexOf(v) >= 0) { R.toast('موجود مسبقاً', 'err'); return; } R.DB.settings[k].push(v); logAudit('إضافة إلى ' + k, v); R.save(); R.toast('تمت الإضافة', 'ok'); R.rerender(); };
  A.sFees = function () { var c = Number(R.val('#s-com')), v = Number(R.val('#s-vat')); if (!(c >= 0 && c <= 40)) { R.toast('العمولة بين 0 و 40%', 'err'); return; } R.DB.settings.commission = c; R.DB.settings.vat = v; logAudit('تحديث نسبة العمولة إلى ' + c + '%', 'الإعدادات'); R.save(); R.toast('تم حفظ الرسوم — تطبق على الحجوزات الجديدة', 'ok'); };
  A.sCancel = function (el) { var i = Number(el.dataset.i); R.DB.settings.cancellation[i].desc = R.val('#cp-' + i); logAudit('تعديل قالب إلغاء', R.DB.settings.cancellation[i].name); R.save(); R.toast('تم حفظ القالب', 'ok'); };
  A.sLoyal = function () { var L = R.DB.settings.loyalty; L.cashback = Number(R.val('#l-cb')); L.pointsPer100 = Number(R.val('#l-pp')); L.welcome = Number(R.val('#l-w')); L.review = Number(R.val('#l-r')); logAudit('تحديث إعدادات الولاء', 'الولاء'); R.save(); R.toast('تم حفظ إعدادات الولاء', 'ok'); };

  /* ================= AUDIT ================= */
  R.route('/admin/audit', function () {
    var L = R.DB.audit, rf = R.UI.aRole || '';
    var roles = []; L.forEach(function (a) { if (roles.indexOf(a.role) < 0) roles.push(a.role); });
    var list = L.filter(function (a) { return !rf || a.role === rf; });
    var html = pageH('سجل التدقيق', 'كل العمليات الحساسة مسجلة ولا يمكن تعديلها', '<select class="select" style="width:auto" data-ch="aRole" aria-label="تصفية بالدور"><option value="">كل الأدوار</option>' + roles.map(function (r) { return '<option' + (r === rf ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select><button class="btn btn-ghost" data-act="toast" data-msg="تم تصدير السجل (محاكاة)" data-kind="ok">' + ic('download', 'ic-sm', '') + 'تصدير</button>') +
      '<div class="card card-p"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الوقت</th><th>المنفذ</th><th>الدور</th><th>الإجراء</th><th>الهدف</th><th>IP</th></tr></thead><tbody>' + list.map(function (a) { return '<tr><td class="ltr small nowrap" style="text-align:right">' + a.time + '</td><td class="b">' + esc(a.actor) + '</td><td><span class="pill pill-gray">' + a.role + '</span></td><td>' + esc(a.action) + '</td><td class="small">' + esc(a.target) + '</td><td class="xs muted ltr">' + a.ip + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    return adShell('audit', html);
  });
  A.aRole = function (el) { R.UI.aRole = el.value; R.rerender(); };
})();
