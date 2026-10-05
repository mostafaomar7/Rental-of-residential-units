/* رواف — لوحة المالك / المشغّل */
(function () {
  'use strict';
  var R = window.R, A = R.A, ic = R.ic, esc = R.esc, sar = R.sar, fmt = R.fmt, C = R.C;
  var UI = function () { return R.UI; };

  function opShell(active, content) {
    var DB = R.DB, owner = DB.opRole === 'owner';
    var pendingPricing = pendingSuggestions().length;
    var openInc = DB.incidents.filter(function (i) { return i.status !== 'مغلق'; }).length;
    var offline = DB.properties.filter(function (p) { return p.lock && (p.lock.status === 'offline' || p.lock.battery < 30); }).length;
    var todoTasks = DB.tasks.filter(function (t) { return t.status !== 'done'; }).length;
    var nav = [
      { sec: 'الرئيسية' },
      { id: 'dash', label: 'لوحة المؤشرات', icon: 'layout-dashboard', href: '#/operator' },
      { id: 'props', label: 'الوحدات', icon: 'building-2', href: '#/operator/properties', count: DB.properties.length },
      { id: 'cal', label: 'تقويم التوفر', icon: 'calendar-days', href: '#/operator/calendar' },
      { id: 'pricing', label: 'التسعير الذكي', icon: 'sparkles', href: '#/operator/pricing', count: pendingPricing || null, alert: pendingPricing > 0 },
      { id: 'bookings', label: 'الحجوزات', icon: 'calendar-check', href: '#/operator/bookings', count: DB.opBookings.length },
      { sec: 'التشغيل' },
      { id: 'locks', label: 'الدخول الذكي والأقفال', icon: 'key-round', href: '#/operator/locks', count: offline || null, alert: offline > 0 },
      { id: 'ops', label: 'المهام والبلاغات', icon: 'clipboard-list', href: '#/operator/ops', count: todoTasks + openInc },
      { id: 'reviews', label: 'التقييمات', icon: 'star', href: '#/operator/reviews' },
      { sec: 'المالية والتسويق' },
      { id: 'payouts', label: 'المدفوعات والتحويلات', icon: 'banknote', href: '#/operator/payouts' },
      { id: 'campaigns', label: 'العروض والحملات', icon: 'megaphone', href: '#/operator/campaigns' }
    ];
    return R.dashShell({
      portal: 'operator', badge: owner ? 'OWNER PORTAL' : 'OPERATOR', portalName: owner ? 'بوابة المالك' : 'بوابة المشغّل', active: active, nav: nav,
      user: owner ? { name: 'أحمد الغامدي', role: 'مالك • 12 وحدة' } : { name: 'رواف للضيافة', role: 'مشغّل معتمد' },
      alerts: openInc + offline, alertsHref: '#/operator/ops/incidents', searchPh: 'ابحث برقم الحجز أو اسم الضيف...', searchAct: 'opSearch',
      headerExtra: '<a class="btn btn-gold btn-sm hide-sm" href="#/operator/add">' + ic('plus', 'ic-sm', '+') + 'إضافة وحدة</a>',
      sideExtra: '<div class="loyal"><div class="row xs b gold">' + ic('sparkles', 'ic-sm', '') + 'التسعير الذكي</div><div class="small b mt-8" style="position:relative">' + pendingPricing + ' اقتراح سعر بانتظار موافقتك</div><a class="btn btn-gold btn-xs mt-12" style="position:relative" href="#/operator/pricing">مراجعة</a></div>',
      content: content
    });
  }
  A.opSearch = function (el) { R.UI.opQ = el.value.trim(); R.go('#/operator/bookings'); };
  function pageH(t, sub, actions) { return '<div class="page-h"><div><h1>' + t + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="row wrap">' + actions + '</div>' : '') + '</div>'; }
  function thumb(p) { return '<img class="thumb" src="' + p.image + '" alt="">'; }
  function pname(id) { var p = R.prop(id); return p ? p.title : '—'; }

  /* pricing suggestions (next 35 days, all units) */
  function suggestions(pid) {
    var DB = R.DB, out = [];
    if (!DB.__prSeeded) { /* demo seed: the operator already reviewed suggestions for most units */
      DB.__prSeeded = true;
      suggestions().forEach(function (s) { if ([1, 2, 7].indexOf(s.pid) < 0) DB.pricingDecisions[s.key] = 'approved'; });
      R.save();
    }
    var ps = pid ? [R.prop(pid)] : DB.properties.filter(function (p) { return p.status !== 'موقوفة' && p.status !== 'قيد النشر'; });
    ps.forEach(function (p) {
      for (var i = 0; i < 35; i++) {
        var d = R.addDays(R.today(), i), s = window.RAWAAF_suggest(p, d, DB.pricingEvents);
        if (Math.abs(s.factor - 1) > 0.001) out.push({ pid: p.id, date: d, base: p.price, price: s.price, factor: s.factor, reasons: s.reasons, key: p.id + '|' + d, status: DB.pricingDecisions[p.id + '|' + d] || 'pending' });
      }
    });
    return out;
  }
  function pendingSuggestions() { var lim = R.addDays(R.today(), 21); return suggestions().filter(function (s) { return s.status === 'pending' && s.date <= lim; }); }

  /* ================= DASHBOARD ================= */
  R.route('/operator', function () {
    var DB = R.DB, per = R.UI.opPeriod || '30', mult = { '7': 7 / 30, '30': 1, '90': 3.1, '365': 12.4 }[per];
    var d30 = C.daily30, rev30 = d30.reduce(function (s, d) { return s + d.rev; }, 0), occ = Math.round(d30.reduce(function (s, d) { return s + d.occ; }, 0) / 30);
    var rev = Math.round(rev30 * mult), bookings = Math.round(96 * mult), canc = Math.round(5 * mult), units = DB.properties.filter(function (p) { return p.status !== 'موقوفة' && p.status !== 'قيد النشر'; }).length;
    var days = Math.round(30 * mult), adr = Math.round(rev / Math.max(1, units * days * occ / 100)), revpar = Math.round(adr * occ / 100);
    var today = R.today();
    var arr = DB.opBookings.filter(function (b) { return b.checkIn === today && b.status !== 'ملغي'; }), dep = DB.opBookings.filter(function (b) { return b.checkOut === today && b.status !== 'ملغي'; });
    var offline = DB.properties.filter(function (p) { return p.lock && p.lock.status === 'offline'; }), low = DB.properties.filter(function (p) { return p.lock && p.lock.status === 'online' && p.lock.battery < 40; });
    var pend = pendingSuggestions().length, photos = DB.properties.filter(function (p) { return p.status === 'قيد النشر'; }).length + DB.shoots.filter(function (s) { return s.status === 'مجدولة'; }).length;
    var chart = per === '7' || per === '30' ? R.lineChart({ values: d30.slice(-Number(per)).map(function (d) { return d.rev; }), labels: d30.slice(-Number(per)).map(function (d) { return R.dLabel(d.d); }), fmtY: function (v) { return fmt(Math.round(v / 1000)) + 'k'; }, fmtTip: sar, label: 'الإيراد اليومي', maxLabels: 8 })
      : R.lineChart({ values: C.revenue12.map(function (v) { return v * 1000; }), values2: C.revenue12.map(function (v) { return v * 1000 * 0.86; }), labels: C.revenueLabels, fmtY: function (v) { return fmt(Math.round(v / 1000)) + 'k'; }, fmtTip: sar, label: 'الإيراد الشهري' });
    var alerts = [];
    offline.forEach(function (p) { alerts.push(['red', 'wifi-off', 'قفل غير متصل — ' + p.title, 'آخر مزامنة ' + p.lock.lastSync, '#/operator/locks', 'معالجة']); });
    low.forEach(function (p) { alerts.push(['amber', 'battery-low', 'بطارية منخفضة ' + p.lock.battery + '% — ' + p.title, 'يُنصح بالاستبدال قبل الوصول القادم', '#/operator/locks', 'عرض']); });
    if (pend) alerts.push(['gold', 'sparkles', pend + ' اقتراح تسعير بانتظار الموافقة', 'عطلات وفعاليات قادمة قد ترفع الإيراد حتى 25%', '#/operator/pricing', 'مراجعة']);
    if (photos) alerts.push(['blue', 'camera', photos + ' وحدات بانتظار التصوير/النشر', 'جلسة تصوير مجدولة اليوم 4:00 م', '#/operator/properties?status=قيد النشر', 'عرض']);
    DB.incidents.filter(function (i) { return i.status === 'مفتوح' && i.severity === 'عالية'; }).forEach(function (i) { alerts.push(['red', 'siren', i.title, pname(i.propertyId), '#/operator/ops/incidents', 'متابعة']); });
    var bkRow = function (b, kind) { return '<a class="li" href="#/operator/booking/' + b.id + '"><span class="li-ic ' + (kind === 'in' ? 'green' : 'blue') + '">' + ic(kind === 'in' ? 'log-in' : 'log-out', 'ic-sm', '') + '</span><div class="grow"><div class="b small">' + esc(b.guestName) + '</div><div class="xs muted truncate">' + esc(b.title) + '</div></div><div class="end"><div class="xs b">' + (kind === 'in' ? '3:00 م' : '12:00 م') + '</div>' + (b.nafath ? '<span class="pill pill-green">نفاذ ✓</span>' : '<span class="pill pill-amber">بانتظار نفاذ</span>') + '</div></a>'; };
    var html = pageH((DB.opRole === 'owner' ? 'مرحباً أحمد' : 'صباح الخير، فريق التشغيل') + ' 👋', 'نظرة على أداء محفظتك • ' + R.dayName(today) + ' ' + today,
      R.tabs([{ id: '7', label: '7 أيام' }, { id: '30', label: '30 يوم' }, { id: '90', label: '90 يوم' }, { id: '365', label: 'السنة' }], per, 'opPeriod')) +
      '<div class="grid g4">' +
      R.stat({ icon: 'percent', value: occ + '%', label: 'نسبة الإشغال', sub: '<span class="trend-up">▲ 6%</span> عن الفترة السابقة' }) +
      R.stat({ icon: 'banknote', tone: 'gold', value: sar(rev), label: 'الإيراد', sub: '<span class="trend-up">▲ 12%</span> عن الفترة السابقة' }) +
      R.stat({ icon: 'tag', value: sar(adr), label: 'متوسط السعر اليومي ADR', sub: '<span class="trend-up">▲ 4%</span>' }) +
      R.stat({ icon: 'trending-up', tone: 'black', value: sar(revpar), label: 'RevPAR', sub: 'الإيراد لكل وحدة متاحة' }) +
      R.stat({ icon: 'calendar-check', value: fmt(bookings), label: 'الحجوزات', sub: '68% عبر تطبيق رواف' }) +
      R.stat({ icon: 'calendar-x', tone: 'red', value: canc, label: 'الإلغاءات', sub: '<span class="trend-down">' + (canc / Math.max(1, bookings) * 100).toFixed(1) + '%</span> معدل الإلغاء' }) +
      R.stat({ icon: 'star', tone: 'gold', value: '4.76', label: 'متوسط التقييم', sub: '211 تقييم' }) +
      R.stat({ icon: 'building-2', value: units + ' / ' + DB.properties.length, label: 'الوحدات النشطة', sub: '1 قيد النشر • 1 موقوفة' }) + '</div>' +
      '<div class="grid g-2-1 mt-24" style="gap:24px"><div class="card card-p"><div class="card-h"><h3>الإيراد</h3><div class="legend"><span><i style="background:#0A1931"></i>الإيراد الإجمالي</span>' + (per === '90' || per === '365' ? '<span><i style="background:#C9A86A"></i>صافي المالك</span>' : '') + '</div></div>' + chart + '</div>' +
      '<div class="card card-p"><div class="card-h"><h3>الإشغال حسب الوحدة</h3></div><div class="stack-sm">' + DB.properties.filter(function (p) { return p.occupancy; }).sort(function (a, b) { return b.occupancy - a.occupancy; }).slice(0, 8).map(function (p) { return '<div class="hbar"><span class="truncate xs b">' + esc(p.title.split(' - ')[0]) + '</span><div class="bar"><div style="width:' + p.occupancy + '%;background:' + (p.occupancy > 80 ? 'var(--navy)' : 'var(--gold)') + '"></div></div><span class="xs b">' + p.occupancy + '%</span></div>'; }).join('') + '</div></div></div>' +
      '<div class="grid g3 mt-24" style="gap:24px"><div class="card card-p"><div class="card-h"><h3>وصول اليوم</h3><span class="pill pill-green">' + arr.length + '</span></div><div class="stack-sm">' + (arr.length ? arr.map(function (b) { return bkRow(b, 'in'); }).join('') : R.empty('log-in', 'لا يوجد وصول اليوم')) + '</div></div>' +
      '<div class="card card-p"><div class="card-h"><h3>مغادرة اليوم</h3><span class="pill pill-blue">' + dep.length + '</span></div><div class="stack-sm">' + (dep.length ? dep.map(function (b) { return bkRow(b, 'out'); }).join('') : R.empty('log-out', 'لا توجد مغادرة اليوم', 'المغادرات القادمة تظهر في الحجوزات')) + '</div></div>' +
      '<div class="card card-p"><div class="card-h"><h3>التنبيهات</h3><span class="pill pill-red">' + alerts.length + '</span></div><div class="stack-sm">' + alerts.map(function (a) { return '<div class="li"><span class="li-ic ' + a[0] + '">' + ic(a[1], 'ic-sm', '!') + '</span><div class="grow"><div class="b small">' + esc(a[2]) + '</div><div class="xs muted">' + esc(a[3]) + '</div></div><a class="btn btn-ghost btn-xs" href="' + a[4] + '">' + a[5] + '</a></div>'; }).join('') + '</div></div></div>';
    return opShell('dash', html);
  });
  A.opPeriod = function (el) { R.UI.opPeriod = el.dataset.id; R.rerender(); };

  /* ================= PROPERTIES ================= */
  R.route('/operator/properties', function (p, q) {
    var DB = R.DB, sup = R.UI.opSup || 'all', st = q.status || R.UI.opSt || '';
    var list = DB.properties.filter(function (x) { return (sup === 'all' || x.supervision === sup) && (!st || x.status === st); });
    var counts = {}; C.OPS_STATUS.forEach(function (s) { counts[s] = DB.properties.filter(function (x) { return x.status === s; }).length; });
    var html = pageH('الوحدات', DB.properties.length + ' وحدة في محفظتك', '<a class="btn btn-primary" href="#/operator/add">' + ic('plus', 'ic-sm', '+') + 'إضافة وحدة</a>') +
      '<div class="scroll-x mb-16"><div class="chips"><button class="chip chip-sm ' + (!st ? 'on' : '') + '" data-act="opSt" data-v="">الكل (' + DB.properties.length + ')</button>' + C.OPS_STATUS.map(function (s) { return '<button class="chip chip-sm ' + (st === s ? 'on' : '') + '" data-act="opSt" data-v="' + s + '">' + s + ' (' + counts[s] + ')</button>'; }).join('') + '</div></div>' +
      '<div class="card card-p"><div class="row between wrap mb-16">' + R.tabs([{ id: 'all', label: 'كل النماذج' }, { id: 'supervised', label: 'مُشرَف عليها', icon: 'user-check' }, { id: 'self', label: 'ذاتية الخدمة', icon: 'smartphone' }], sup, 'opSup') + '<span class="small muted">' + list.length + ' نتيجة</span></div>' +
      (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الوحدة</th><th>النوع</th><th>نموذج الإشراف</th><th>القفل</th><th>الإشغال</th><th>السعر</th><th>الحالة</th><th></th></tr></thead><tbody>' + list.map(function (x) {
        return '<tr class="click" data-act="go" data-href="#/operator/property/' + x.id + '"><td><div class="row gap-12">' + thumb(x) + '<div><div class="b">' + esc(x.title) + '</div><div class="xs muted">' + esc(x.city + ' • ' + x.district) + '</div></div></div></td><td>' + R.typeLabel(x.type) + '</td><td>' + (x.supervision === 'supervised' ? '<span class="pill pill-navy">مُشرَف عليها</span>' : '<span class="pill pill-gray">ذاتية الخدمة</span>') + '</td>' +
          '<td>' + (x.lock ? '<span class="row xs b"><span class="dot ' + (x.lock.status === 'online' ? 'dot-green' : 'dot-red') + '"></span>' + x.lock.provider + ' • ' + x.lock.battery + '%</span>' : '<span class="xs muted">مفتاح تقليدي</span>') + '</td><td><div class="row"><div class="bar thin" style="width:60px"><div style="width:' + x.occupancy + '%"></div></div><span class="xs b">' + x.occupancy + '%</span></div></td><td class="b nowrap">' + sar(x.price) + '</td><td>' + R.pill(x.status) + '</td><td>' + ic('chevron-left', 'ic-sm muted', '‹') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : R.empty('building-2', 'لا توجد وحدات بهذا الفلتر')) + '</div>';
    return opShell('props', html);
  });
  A.opSup = function (el) { R.UI.opSup = el.dataset.id; R.rerender(); };
  A.opSt = function (el) { R.UI.opSt = el.dataset.v; history.replaceState(null, '', '#/operator/properties'); R.render(true); };

  /* ================= PROPERTY PROFILE ================= */
  R.route('/operator/property/:id', function (p) { return profile(p.id, R.UI.opPTab || 'identity'); });
  R.route('/operator/property/:id/:tab', function (p) { return profile(p.id, p.tab); });
  function profile(id, tab) {
    var p = R.prop(id); if (!p) return opShell('props', R.empty('building-2', 'الوحدة غير موجودة'));
    var tabs = [['identity', 'الهوية', 'id-card'], ['content', 'المحتوى', 'image'], ['commercial', 'التجاري', 'tag'], ['operations', 'التشغيل', 'settings-2'], ['governance', 'الحوكمة', 'shield-check']];
    var body = ({ identity: pIdentity, content: pContent, commercial: pCommercial, operations: pOps, governance: pGov })[tab] || pIdentity;
    var html = '<a class="link small" href="#/operator/properties">' + ic('arrow-right', 'ic-sm', '→') + ' كل الوحدات</a>' +
      '<div class="card card-p mt-12 row gap-16 wrap"><img src="' + p.image + '" alt="" style="width:120px;height:90px;border-radius:16px;object-fit:cover"><div class="grow"><div class="row wrap">' + R.pill(p.status) + (p.smartLock ? '<span class="pill pill-gold">دخول ذكي</span>' : '') + '<span class="pill ' + (p.supervision === 'supervised' ? 'pill-navy' : 'pill-gray') + '">' + R.supLabel(p.supervision) + '</span></div><h1 class="h2 mt-8">' + esc(p.title) + '</h1><div class="small muted">' + esc(p.city + ' • ' + p.district) + ' • ترخيص ' + p.license + ' • ★ ' + p.rating + '</div></div>' +
      '<div class="field" style="min-width:200px"><label for="pp-st">حالة الوحدة</label><select id="pp-st" class="select" data-ch="ppStatus">' + C.OPS_STATUS.map(function (s) { return '<option' + (s === p.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<a class="btn btn-ghost btn-sm" href="#/property/' + p.id + '" target="_blank">' + ic('external-link', 'ic-sm', '') + 'معاينة كضيف</a></div>' +
      '<div class="mt-16">' + R.tabLinks(tabs.map(function (t) { return { id: t[0], label: t[1], icon: t[2], href: '#/operator/property/' + p.id + '/' + t[0] }; }), tab) + '</div>' +
      '<div class="card card-p mt-16">' + body(p) + '</div>';
    R.UI.opPTab = tab;
    return opShell('props', html);
  }
  A.ppStatus = function (el) { var p = R.prop(R.cur.params.id); p.status = el.value; R.audit('رواف للضيافة', 'مشغّل', 'تغيير حالة الوحدة إلى ' + el.value, 'الوحدة ' + p.id); R.save(); R.toast('تم تحديث حالة الوحدة: ' + el.value, 'ok'); R.rerender(); };
  function saveBtn(act) { return '<div class="row mt-24"><button class="btn btn-primary" data-act="' + (act || 'ppSave') + '">حفظ التغييرات</button><button class="btn btn-ghost" data-act="rerenderAct">تراجع</button></div>'; }
  A.rerenderAct = function () { R.rerender(); R.toast('تم التراجع عن التعديلات'); };
  function pIdentity(p) {
    return '<h3 class="h3 mb-16">هوية الوحدة</h3><div class="grid g2">' +
      R.field('اسم الوحدة', '<input id="pi-title" class="input" value="' + esc(p.title) + '">') +
      R.field('نوع الوحدة', '<select id="pi-type" class="select">' + Object.keys(C.TYPES).map(function (k) { return '<option value="' + k + '"' + (k === p.type ? ' selected' : '') + '>' + C.TYPES[k] + '</option>'; }).join('') + '</select>') +
      R.field('المدينة', '<select id="pi-city" class="select">' + R.DB.settings.cities.map(function (c) { return '<option' + (c === p.city ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>') +
      R.field('الحي', '<input id="pi-district" class="input" value="' + esc(p.district) + '">') +
      R.field('المالك', '<input class="input" value="' + esc(p.owner) + '" disabled>', 'تغيير المالك يتطلب طلباً لإدارة المنصة') +
      R.field('رقم ترخيص وزارة السياحة', '<input id="pi-lic" class="input" value="' + esc(p.license) + '">', p.license === '—' ? '<span class="red b">الترخيص مطلوب قبل النشر</span>' : 'متزامن مع منصة إيواء') +
      R.field('السعة (ضيوف)', '<input id="pi-guests" class="input" type="number" min="1" value="' + p.guests + '">') +
      R.field('غرف النوم / دورات المياه', '<div class="row"><input id="pi-bed" class="input" type="number" value="' + p.bedrooms + '" aria-label="غرف النوم"><input id="pi-bath" class="input" type="number" value="' + p.baths + '" aria-label="دورات المياه"></div>') + '</div>' + saveBtn('ppSaveId');
  }
  A.ppSaveId = function () {
    var p = R.prop(R.cur.params.id), t = R.val('#pi-title'); if (!t) { R.toast('اسم الوحدة مطلوب', 'err'); return; }
    p.title = t; p.type = R.val('#pi-type'); p.city = R.val('#pi-city'); p.district = R.val('#pi-district'); p.license = R.val('#pi-lic') || '—'; p.guests = Number(R.val('#pi-guests')) || p.guests; p.bedrooms = Number(R.val('#pi-bed')) || p.bedrooms; p.baths = Number(R.val('#pi-bath')) || p.baths;
    R.save(); R.toast('تم حفظ هوية الوحدة', 'ok'); R.rerender();
  };
  function pContent(p) {
    var all = R.DB.settings.amenities.concat(p.amenities.filter(function (a) { return R.DB.settings.amenities.indexOf(a) < 0; }));
    return '<div class="row between wrap mb-16"><h3 class="h3">الصور (' + p.images.length + ')</h3><div class="row"><label class="btn btn-ghost btn-sm" style="cursor:pointer">' + ic('upload', 'ic-sm', '') + 'رفع صور<input type="file" accept="image/*" multiple data-ch="ppPhotos" style="display:none"></label><button class="btn btn-primary btn-sm" data-act="reqPhotographer" data-id="' + p.id + '">' + ic('camera', 'ic-sm', '') + 'طلب مصوّر محترف</button></div></div>' +
      '<div class="photo-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' + p.images.map(function (u, i) { return '<div class="ph"><img src="' + u + '" alt="">' + (i === 0 ? '<span class="pill pill-gold">الغلاف</span>' : '') + '<button class="btn btn-danger btn-icon btn-xs" style="position:absolute;top:6px;left:6px" data-act="ppDelPhoto" data-i="' + i + '" aria-label="حذف الصورة">' + ic('x', 'ic-sm', '×') + '</button>' + (i ? '<button class="btn btn-outline btn-xs" style="position:absolute;top:6px;right:6px" data-act="ppCover" data-i="' + i + '">غلاف</button>' : '') + '</div>'; }).join('') + '</div>' +
      '<h3 class="h3 mt-24 mb-8">المرافق</h3><div class="chips">' + all.map(function (a) { var on = p.amenities.indexOf(a) >= 0; return '<button class="chip chip-sm ' + (on ? 'on' : '') + '" data-act="ppAmen" data-v="' + esc(a) + '" aria-pressed="' + on + '">' + (on ? ic('check', 'ic-sm', '✓') : '') + esc(a) + '</button>'; }).join('') + '</div>' +
      '<div class="mt-24">' + R.field('الوصف', '<textarea id="pc-desc" class="textarea">' + esc(p.desc) + '</textarea>', 'يظهر للضيوف في صفحة الوحدة') + '</div>' + saveBtn('ppSaveContent');
  }
  A.ppPhotos = function (el) { var p = R.prop(R.cur.params.id); Array.prototype.forEach.call(el.files || [], function (f) { try { p.images.push(URL.createObjectURL(f)); } catch (e) { } }); R.toast('تم رفع ' + el.files.length + ' صورة — بانتظار فحص الجودة', 'ok'); R.rerender(); };
  A.ppDelPhoto = function (el) { var p = R.prop(R.cur.params.id); if (p.images.length <= 1) { R.toast('يجب أن تحتوي الوحدة على صورة واحدة على الأقل', 'err'); return; } p.images.splice(Number(el.dataset.i), 1); p.image = p.images[0]; R.save(); R.toast('تم حذف الصورة'); R.rerender(); };
  A.ppCover = function (el) { var p = R.prop(R.cur.params.id), i = Number(el.dataset.i); var x = p.images.splice(i, 1)[0]; p.images.unshift(x); p.image = x; R.save(); R.toast('تم تعيين صورة الغلاف', 'ok'); R.rerender(); };
  A.ppAmen = function (el) { var p = R.prop(R.cur.params.id), a = el.dataset.v, i = p.amenities.indexOf(a); if (i >= 0) p.amenities.splice(i, 1); else p.amenities.push(a); R.save(); R.rerender(); };
  A.ppSaveContent = function () { var p = R.prop(R.cur.params.id); p.desc = R.val('#pc-desc'); R.save(); R.toast('تم حفظ المحتوى', 'ok'); };
  A.reqPhotographer = function (el) {
    R.modal({ title: 'طلب مصوّر محترف', sub: 'تصوير احترافي معتمد من رواف — مجاناً للوحدات الجديدة', size: 'sm', body: '<div class="stack">' + R.field('التاريخ المفضل', '<input id="rp-d" type="date" class="input" value="' + R.addDays(R.today(), 2) + '" min="' + R.today() + '">') + R.field('الوقت', '<select id="rp-t" class="select"><option>10:00 ص</option><option>1:00 م</option><option selected>4:00 م</option></select>') + R.field('ملاحظات للمصوّر', '<textarea id="rp-n" class="textarea" placeholder="مثال: التركيز على المسبح والإطلالة"></textarea>') + '</div>',
      foot: '<button class="btn btn-primary" data-act="reqPhotographerOk" data-id="' + el.dataset.id + '">تأكيد الطلب</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.reqPhotographerOk = function (el) {
    var p = R.prop(el.dataset.id);
    R.DB.shoots.unshift({ id: 'SH-' + Math.floor(50 + Math.random() * 900), propertyId: p.id, title: p.title, address: p.city + '، ' + p.district, date: R.val('#rp-d'), time: R.val('#rp-t'), contact: p.owner, status: 'مجدولة', shotList: [{ t: 'الواجهة والمدخل', done: false }, { t: 'الصالة', done: false }, { t: 'غرف النوم', done: false }, { t: 'المطبخ ودورات المياه', done: false }, { t: 'القفل الذكي', done: false }], photos: [], feedback: '', notes: R.val('#rp-n') });
    R.save(); R.closeModal(); R.toast('تم جدولة جلسة التصوير وإسنادها للمصوّرة ريم الزهراني', 'ok');
  };
  function pCommercial(p) {
    var days = []; for (var i = 0; i < 14; i++) days.push(R.addDays(R.today(), i));
    var booked = bookedSet(p.id), blocked = R.DB.blockedDates[p.id] || [];
    return '<h3 class="h3 mb-16">التسعير والتوفر</h3><div class="grid g3">' +
      R.field('السعر الأساسي / ليلة (ر.س)', '<input id="pm-price" class="input" type="number" value="' + p.price + '">') +
      R.field('السعر قبل الخصم (اختياري)', '<input id="pm-old" class="input" type="number" value="' + (p.oldPrice || '') + '">') +
      R.field('رسوم التنظيف (ر.س)', '<input id="pm-clean" class="input" type="number" value="' + p.cleaning + '">') +
      R.field('الحد الأدنى للإقامة', '<select class="select"><option>ليلة واحدة</option><option>ليلتان</option><option>3 ليالٍ</option></select>') +
      R.field('سعر نهاية الأسبوع', '<select class="select"><option>+12% (مقترح)</option><option>بدون زيادة</option><option>+20%</option></select>') +
      R.field('خصم الإقامة الأسبوعية', '<select class="select"><option>10%</option><option>بدون</option><option>15%</option></select>') + '</div>' +
      '<div class="notice gold mt-16">' + ic('sparkles', '', '') + '<div class="grow">التسعير الذكي يقترح أسعاراً يومية بناءً على العطلات والفعاليات والمواسم. <a class="link" href="#/operator/pricing?unit=' + p.id + '">افتح التسعير الذكي لهذه الوحدة</a></div></div>' +
      '<h3 class="h3 mt-24 mb-8">التوفر — 14 يوماً القادمة</h3><div class="row wrap" style="gap:6px">' + days.map(function (d) { var s = booked[d] ? 'booked' : blocked.indexOf(d) >= 0 ? 'blocked' : ''; return '<div class="cal-d ' + s + '" style="min-height:60px;width:74px"><span class="dn">' + Number(d.slice(8)) + '</span><span class="xs ' + (s ? '' : 'muted') + '">' + (s === 'booked' ? 'محجوز' : s === 'blocked' ? 'محجوب' : 'متاح') + '</span></div>'; }).join('') + '</div><a class="link small mt-8" style="display:inline-block" href="#/operator/calendar?unit=' + p.id + '">إدارة التقويم الكامل ←</a>' + saveBtn('ppSaveCom');
  }
  A.ppSaveCom = function () { var p = R.prop(R.cur.params.id), v = Number(R.val('#pm-price')); if (!(v > 50)) { R.toast('أدخل سعراً صحيحاً', 'err'); return; } p.price = v; p.oldPrice = Number(R.val('#pm-old')) || undefined; p.cleaning = Number(R.val('#pm-clean')) || 0; R.save(); R.toast('تم تحديث الأسعار ونشرها على القنوات', 'ok'); R.rerender(); };
  function pOps(p) {
    var L = p.lock;
    return '<h3 class="h3 mb-16">نموذج الإشراف</h3><div class="grid g2">' +
      '<button class="radio-card ' + (p.supervision === 'supervised' ? 'on' : '') + '" data-act="ppSup" data-v="supervised"><span class="row gap-12"><span class="li-ic navy">' + ic('user-check', '', '') + '</span><span><span class="b" style="display:block">مُشرَف عليها</span><span class="xs muted">مشرف ميداني يجهز الوحدة ويستقبل الضيف ويفحص بعد المغادرة</span></span></span><span class="radio-dot"></span></button>' +
      '<button class="radio-card ' + (p.supervision === 'self' ? 'on' : '') + '" data-act="ppSup" data-v="self"><span class="row gap-12"><span class="li-ic gold">' + ic('smartphone', '', '') + '</span><span><span class="b" style="display:block">ذاتية الخدمة</span><span class="xs muted">دخول ومغادرة ذاتية بالكامل مع فحص دوري</span></span></span><span class="radio-dot"></span></button></div>' +
      '<h3 class="h3 mt-24 mb-16">القفل الذكي</h3>' + (L ? '<div class="grid g4">' +
        '<div class="soft-lg"><div class="xs muted b">المزود</div><div class="bb mt-4">' + L.provider + '</div><div class="xs muted">' + L.model + '</div></div>' +
        '<div class="soft-lg"><div class="xs muted b">الحالة</div><div class="bb mt-4 row"><span class="dot ' + (L.status === 'online' ? 'dot-green' : 'dot-red') + '"></span>' + (L.status === 'online' ? 'متصل' : 'غير متصل') + '</div><div class="xs muted ltr">' + L.lastSync + '</div></div>' +
        '<div class="soft-lg"><div class="xs muted b">البطارية</div><div class="bb mt-4 ' + (L.battery < 30 ? 'red' : '') + '">' + L.battery + '%</div><div class="bar thin mt-4"><div style="width:' + L.battery + '%;background:' + (L.battery < 30 ? 'var(--red-solid)' : 'var(--green-solid)') + '"></div></div></div>' +
        '<div class="soft-lg"><div class="xs muted b">صلاحية الرموز</div><div class="bb mt-4">3:00 م ← 12:00 م</div><div class="xs muted">تلقائي حسب الحجز</div></div></div>' +
        '<div class="row wrap mt-16"><button class="btn btn-primary btn-sm" data-act="testCode" data-id="' + p.id + '">' + ic('key-round', 'ic-sm', '') + 'إرسال رمز تجريبي</button><button class="btn btn-ghost btn-sm" data-act="lockSync" data-id="' + p.id + '">' + ic('refresh-cw', 'ic-sm', '') + 'مزامنة الآن</button><button class="btn btn-ghost btn-sm" data-act="emergencyCode" data-id="' + p.id + '">' + ic('siren', 'ic-sm', '') + 'رمز طوارئ</button><button class="btn btn-danger btn-sm" data-act="unpairLock" data-id="' + p.id + '">فك الاقتران</button></div>' +
        '<div class="grid g2 mt-16">' + R.field('رمز المشرف الدائم', '<input class="input" value="•••• 11" disabled>') + R.field('رمز فريق التنظيف', '<input class="input" value="صالح 10 ص – 2 م يومياً" disabled>') + '</div>'
      : '<div class="notice amber">' + ic('key-round', '', '') + '<div class="grow">لا يوجد قفل ذكي مقترن بهذه الوحدة — يتم تسليم المفتاح عبر المشرف.</div><button class="btn btn-primary btn-xs" data-act="pairLock" data-id="' + p.id + '">اقتران قفل ذكي</button></div>');
  }
  A.ppSup = function (el) { var p = R.prop(R.cur.params.id); p.supervision = el.dataset.v; R.save(); R.toast('تم تغيير نموذج الإشراف إلى: ' + R.supLabel(p.supervision), 'ok'); R.rerender(); };
  A.testCode = function (el) {
    var p = R.prop(el.dataset.id); if (p.lock.status !== 'online') { R.toast('القفل غير متصل — لا يمكن إرسال رمز', 'err'); return; }
    var code = String(Math.floor(100000 + Math.random() * 899999));
    R.modal({ title: 'رمز تجريبي', size: 'sm', body: '<div class="center"><div class="spin dark"></div><p class="small muted mt-8">جارٍ إرسال الرمز إلى ' + p.lock.provider + '…</p></div>' });
    setTimeout(function () { R.modalSet('<div class="center"><div class="li-ic green" style="width:60px;height:60px;margin:0 auto">' + ic('check-circle-2', 'ic-lg', '✓') + '</div><div class="code-box mt-12" style="color:var(--navy)">' + code + '#</div><p class="small muted mt-8">تمت برمجة الرمز على القفل بنجاح. صالح لمدة 30 دقيقة.</p></div>', '<button class="btn btn-primary" data-act="closeModal">تم</button>'); R.DB.accessEvents.unshift({ id: R.uid('a'), propertyId: p.id, time: R.nowTS(), who: 'رواف للضيافة (مشغّل)', method: 'رمز تجريبي', result: 'ناجح', note: 'إصدار رمز اختبار' }); R.save(); }, 1200);
  };
  A.lockSync = function (el) {
    var p = R.prop(el.dataset.id); R.toast('جارٍ المزامنة مع ' + p.lock.provider + '…');
    setTimeout(function () { if (p.lock.battery > 5) { p.lock.status = 'online'; p.lock.lastSync = R.nowTS(); R.save(); R.toast('تمت المزامنة — القفل متصل', 'ok'); } else R.toast('فشلت المزامنة: البطارية فارغة — أنشئ مهمة صيانة', 'err'); R.rerender(); }, 1200);
  };
  A.unpairLock = function (el) { R.confirm({ title: 'فك اقتران القفل؟', danger: true, ok: 'فك الاقتران', msg: 'سيتم إلغاء كل الرموز النشطة وتحويل الوحدة لاستلام المفتاح عبر المشرف.', onOk: function () { var p = R.prop(el.dataset.id); p.lock = null; p.smartLock = false; R.save(); R.toast('تم فك الاقتران'); R.rerender(); } }); };
  A.pairLock = function (el) {
    R.modal({ title: 'اقتران قفل ذكي', size: 'sm', body: '<div class="stack">' + R.field('المزود', '<select id="pl-p" class="select"><option>TTLock</option><option>Igloohome</option><option>Nuki</option></select>') + R.field('الرقم التسلسلي', '<input id="pl-s" class="input ltr" style="display:block" placeholder="TT-XXXX-XXXX">') + '<p class="xs muted">شغّل وضع الاقتران على القفل (اضغط زر الإعادة 3 ثوانٍ).</p></div>', foot: '<button class="btn btn-primary" data-act="pairLockOk" data-id="' + el.dataset.id + '">اقتران</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.pairLockOk = function (el) {
    var p = R.prop(el.dataset.id), prov = R.val('#pl-p');
    R.modalSet('<div class="center"><span class="spin dark"></span><p class="small muted mt-8">جارٍ البحث عن القفل والاقتران…</p></div>', '');
    setTimeout(function () { p.lock = { provider: prov, model: prov + ' Smart Lock', status: 'online', battery: 100, lastSync: R.nowTS() }; p.smartLock = true; R.save(); R.closeModal(); R.toast('تم اقتران القفل بنجاح', 'ok'); R.rerender(); }, 1500);
  };
  function pGov(p) {
    var tg = function (t, s, on) { return '<div class="setting-row"><div><div class="b small">' + t + '</div><div class="xs muted">' + s + '</div></div>' + R.toggle('data-ch="govToggle"', on, t) + '</div>'; };
    return '<div class="grid g2" style="gap:24px"><div><h3 class="h3 mb-8">السياسات</h3>' + R.field('سياسة الإلغاء', '<select class="select" data-ch="govToggle">' + R.DB.settings.cancellation.map(function (c) { return '<option>' + c.name + ' — ' + c.desc + '</option>'; }).join('') + '</select>') +
      '<div class="mt-8">' + tg('منع التدخين', 'يظهر في قواعد الوحدة', true) + tg('منع الحفلات', 'بدون موافقة مسبقة', true) + tg('ساعات الهدوء', '11:00 م – 7:00 ص', true) + tg('السماح بالحيوانات الأليفة', '', false) + '</div>' +
      R.field('مبلغ ضمان الأضرار (قابل للاسترداد)', '<select class="select" data-ch="govToggle"><option>بدون — الخصم بعد الفحص</option><option>500 ر.س</option><option>1,000 ر.س</option></select>') + '</div>' +
      '<div><h3 class="h3 mb-8">بيانات الضيوف والامتثال</h3>' + tg('التحقق عبر نفاذ إلزامي', 'قبل إصدار المفتاح الرقمي', true) + tg('الإرسال التلقائي لشموس', 'عند تسجيل الوصول', true) + tg('مزامنة الترخيص مع إيواء', 'يومياً 6:00 ص', true) + tg('إخفاء رقم هوية الضيف عن المالك', 'يظهر آخر 3 أرقام فقط', true) +
      R.field('مدة الاحتفاظ ببيانات الضيف', '<select class="select" data-ch="govToggle"><option>حسب المتطلبات النظامية (5 سنوات)</option><option>سنتان</option></select>') +
      '<div class="notice ' + (p.license === '—' ? 'red' : 'green') + ' mt-16 small">' + ic(p.license === '—' ? 'alert-triangle' : 'badge-check', '', '') + '<div>' + (p.license === '—' ? 'الترخيص غير مسجل — لا يمكن النشر حتى رفع الترخيص.' : 'الترخيص ' + p.license + ' ساري ومتزامن مع إيواء.') + '</div></div></div></div>';
  }
  A.govToggle = function () { R.toast('تم حفظ إعداد الحوكمة', 'ok'); };

  /* ================= ADD PROPERTY WIZARD ================= */
  var WSTEPS = ['النوع', 'الموقع', 'الوحدات', 'المرافق', 'الصور', 'السياسات', 'الإشراف', 'القفل الذكي', 'المراجعة'];
  R.route('/operator/add', function () {
    var w = R.UI.addP; if (!w) w = R.UI.addP = { step: 1, type: 'apartment', city: 'الرياض', district: '', address: '', name: '', units: 1, bedrooms: 2, baths: 1, guests: 4, price: 450, amen: ['واي فاي', 'موقف'], photoMode: 'photographer', photos: [], policy: 'مرنة', rules: { smoke: true, party: true, quiet: true }, sup: 'self', lockProv: 'TTLock', lockSerial: '', paired: false, done: null };
    var s = w.step;
    var stepsHTML = '<div class="steps">' + WSTEPS.map(function (t, i) { var n = i + 1; return '<div class="step ' + (n < s ? 'done' : n === s ? 'on' : '') + '"><div class="sb"></div><div class="sl hide-sm">' + t + '</div></div>'; }).join('') + '</div>';
    var body = w.done ? addDone(w) : [null, a1, a2, a3, a4, a5, a6, a7, a8, a9][s](w);
    var nav = w.done ? '' : '<div class="row between mt-24">' + (s > 1 ? '<button class="btn btn-ghost" data-act="addBack">' + ic('arrow-right', 'ic-sm', '→') + 'رجوع</button>' : '<a class="btn btn-ghost" href="#/operator/properties">إلغاء</a>') + (s < 9 ? '<button class="btn btn-primary" data-act="addNext">متابعة ' + ic('arrow-left', 'ic-sm', '←') + '</button>' : '<button class="btn btn-gold btn-lg" data-act="addSubmit">' + ic('send', 'ic-sm', '') + 'إرسال للتحقق والاعتماد</button>') + '</div>';
    var html = pageH('إضافة وحدة جديدة', w.done ? 'تم الإرسال' : 'الخطوة ' + s + ' من 9 — ' + WSTEPS[s - 1]) + (w.done ? '' : stepsHTML) + '<div class="card card-p mt-16" style="max-width:900px">' + body + nav + '</div>';
    return opShell('props', html);
  });
  function collect() {
    var w = R.UI.addP, g = function (id) { var e = R.$('#' + id); return e ? e.value.trim() : null; };
    ['name', 'district', 'address', 'lockSerial'].forEach(function (k) { var v = g('w-' + k); if (v != null) w[k] = v; });
    ['units', 'bedrooms', 'baths', 'guests', 'price'].forEach(function (k) { var v = g('w-' + k); if (v != null) w[k] = Number(v) || w[k]; });
    var c = g('w-city'); if (c) w.city = c; var pol = g('w-policy'); if (pol) w.policy = pol; var lp = g('w-lockProv'); if (lp) w.lockProv = lp;
  }
  function radioCards(key, opts, cur) { return '<div class="grid g2">' + opts.map(function (o) { return '<button class="radio-card ' + (cur === o[0] ? 'on' : '') + '" data-act="addSet" data-k="' + key + '" data-v="' + o[0] + '"><span class="row gap-12"><span class="li-ic ' + (cur === o[0] ? 'navy' : '') + '">' + ic(o[2], '', '•') + '</span><span><span class="b" style="display:block">' + o[1] + '</span>' + (o[3] ? '<span class="xs muted">' + o[3] + '</span>' : '') + '</span></span><span class="radio-dot"></span></button>'; }).join('') + '</div>'; }
  function a1(w) { return '<h3 class="h3 mb-16">ما نوع الوحدة؟</h3>' + radioCards('type', [['apartment', 'شقة', 'building', 'شقة مفروشة في مبنى سكني'], ['hotel', 'شقة فندقية / فندق', 'hotel', 'وحدات بخدمات فندقية'], ['unit', 'وحدة سكنية', 'home', 'استوديو أو وحدة مستقلة'], ['villa', 'فيلا', 'castle', 'فيلا خاصة بمسبح أو حديقة'], ['chalet', 'شاليه / استراحة', 'trees', 'للعائلات والمناسبات']], w.type); }
  function a2(w) { return '<h3 class="h3 mb-16">أين تقع الوحدة؟</h3><div class="grid g2">' + R.field('اسم الوحدة (يظهر للضيوف)', '<input id="w-name" class="input" value="' + esc(w.name) + '" placeholder="مثال: شقة عصرية بإطلالة على البوليفارد">') + R.field('المدينة', '<select id="w-city" class="select">' + R.DB.settings.cities.map(function (c) { return '<option' + (c === w.city ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>') + R.field('الحي', '<input id="w-district" class="input" value="' + esc(w.district) + '" placeholder="مثال: حطين">') + R.field('العنوان الوطني', '<input id="w-address" class="input" value="' + esc(w.address) + '" placeholder="RHTA1234">') + '</div><div class="map-ph mt-16"><div class="map-pin">' + ic('map-pin', '', '⌖') + '</div><span class="pill pill-white" style="position:absolute;top:12px;right:12px">اسحب الدبوس لتحديد الموقع بدقة</span></div>'; }
  function a3(w) { return '<h3 class="h3 mb-16">الوحدات والسعة</h3><div class="grid g3">' + R.field('عدد الوحدات المتطابقة', '<input id="w-units" class="input" type="number" min="1" value="' + w.units + '">', 'للمباني بعدة شقق متطابقة') + R.field('غرف النوم', '<input id="w-bedrooms" class="input" type="number" min="0" value="' + w.bedrooms + '">') + R.field('دورات المياه', '<input id="w-baths" class="input" type="number" min="1" value="' + w.baths + '">') + R.field('السعة القصوى (ضيوف)', '<input id="w-guests" class="input" type="number" min="1" value="' + w.guests + '">') + R.field('السعر الأساسي / ليلة (ر.س)', '<input id="w-price" class="input" type="number" min="100" value="' + w.price + '">', 'يمكنك تفعيل التسعير الذكي لاحقاً') + '</div>'; }
  function a4(w) { return '<h3 class="h3 mb-16">المرافق المتوفرة</h3><div class="chips">' + R.DB.settings.amenities.map(function (a) { var on = w.amen.indexOf(a) >= 0; return '<button class="chip ' + (on ? 'on' : '') + '" data-act="addAmen" data-v="' + esc(a) + '" aria-pressed="' + on + '">' + (on ? ic('check', 'ic-sm', '✓') : '') + esc(a) + '</button>'; }).join('') + '</div><p class="xs muted mt-12">اختر كل ما ينطبق — تظهر المرافق في صفحة الوحدة وفي المقارنة.</p>'; }
  function a5(w) {
    return '<h3 class="h3 mb-16">الصور</h3>' + radioCards('photoMode', [['photographer', 'طلب مصوّر رواف المعتمد', 'camera', 'مجاني للوحدات الجديدة • يرفع نسبة الحجز حتى 30%'], ['upload', 'رفع صوري بنفسي', 'upload', 'تخضع الصور لفحص الجودة قبل النشر']], w.photoMode) +
      (w.photoMode === 'upload' ? '<div class="photo-grid mt-16" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">' + w.photos.map(function (u) { return '<div class="ph"><img src="' + u + '" alt=""></div>'; }).join('') + '<label class="photo-add">' + ic('image-plus', 'ic-lg', '+') + 'إضافة صور<input type="file" accept="image/*" multiple data-ch="addPhotos"></label></div><p class="xs muted mt-8">الحد الأدنى 5 صور بدقة 1920px على الأقل.</p>' : '<div class="notice blue mt-16 small">' + ic('calendar', '', '') + '<div>سيتم التواصل معك لتحديد موعد التصوير خلال 24 ساعة. الموعد المقترح: ' + R.addDays(R.today(), 2) + ' الساعة 4:00 م.</div></div>');
  }
  function a6(w) { return '<h3 class="h3 mb-16">السياسات</h3>' + R.field('سياسة الإلغاء', '<select id="w-policy" class="select">' + R.DB.settings.cancellation.map(function (c) { return '<option value="' + c.name + '"' + (c.name === w.policy ? ' selected' : '') + '>' + c.name + ' — ' + c.desc + '</option>'; }).join('') + '</select>') + '<div class="mt-16">' + [['smoke', 'منع التدخين'], ['party', 'منع الحفلات'], ['quiet', 'ساعات الهدوء 11 م – 7 ص']].map(function (r) { return '<div class="setting-row"><span class="b small">' + r[1] + '</span>' + R.toggle('data-ch="addRule" data-k="' + r[0] + '"', w.rules[r[0]], r[1]) + '</div>'; }).join('') + '</div><div class="notice gold mt-16 small">' + ic('shield-alert', '', '') + '<div>سياسة الأضرار الموحدة من رواف تُطبق تلقائياً: فحص موثق بالصور بعد كل مغادرة، وحق الضيف في الاعتراض خلال 72 ساعة.</div></div>'; }
  function a7(w) { return '<h3 class="h3 mb-16">نموذج الإشراف</h3>' + radioCards('sup', [['supervised', 'مُشرَف عليها', 'user-check', 'مشرف ميداني للتجهيز والاستقبال والفحص — عمولة تشغيل 18%'], ['self', 'ذاتية الخدمة', 'smartphone', 'دخول ذاتي بقفل ذكي وفحص دوري — عمولة 12%']], w.sup); }
  function a8(w) {
    return '<h3 class="h3 mb-16">اقتران القفل الذكي</h3>' + (w.paired ? '<div class="notice green">' + ic('badge-check', '', '✓') + '<div><b>تم الاقتران بنجاح</b><br>' + w.lockProv + ' • ' + esc(w.lockSerial || 'TT-8841-2210') + ' • بطارية 100% • تم اختبار رمز تجريبي</div></div>' :
      '<div class="grid g2">' + R.field('مزود القفل', '<select id="w-lockProv" class="select">' + ['TTLock', 'Igloohome', 'Nuki'].map(function (x) { return '<option' + (x === w.lockProv ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>') + R.field('الرقم التسلسلي', '<input id="w-lockSerial" class="input ltr" style="display:block" value="' + esc(w.lockSerial) + '" placeholder="TT-8841-2210">') + '</div><div class="row wrap mt-16"><button class="btn btn-primary" data-act="addPair">' + ic('bluetooth', 'ic-sm', '') + 'بدء الاقتران</button><button class="btn btn-ghost" data-act="addSkipLock">تخطي — لا يوجد قفل ذكي</button></div>' + (w.sup === 'self' ? '<div class="notice amber mt-16 small">' + ic('alert-triangle', '', '') + '<div>نموذج «ذاتية الخدمة» يتطلب قفلاً ذكياً مقترناً.</div></div>' : ''));
  }
  function a9(w) {
    return '<h3 class="h3 mb-16">مراجعة وإرسال</h3><div class="grid g2">' +
      [['النوع', C.TYPES[w.type]], ['الاسم', w.name || '—'], ['الموقع', w.city + (w.district ? ' • ' + w.district : '')], ['السعة', w.units + ' وحدة • ' + w.bedrooms + ' غرف • ' + w.guests + ' ضيوف'], ['السعر', sar(w.price) + ' / ليلة'], ['المرافق', w.amen.join('، ') || '—'], ['الصور', w.photoMode === 'photographer' ? 'طلب مصوّر معتمد' : w.photos.length + ' صور مرفوعة'], ['الإلغاء', w.policy], ['الإشراف', R.supLabel(w.sup)], ['القفل', w.paired ? w.lockProv + ' — مقترن' : 'بدون قفل ذكي']].map(function (x) { return '<div class="soft"><div class="xs muted b">' + x[0] + '</div><div class="b small mt-4">' + esc(x[1]) + '</div></div>'; }).join('') + '</div>' +
      '<h3 class="bb mt-24 mb-8">مستندات الملكية</h3><div class="grid g3">' + ['صك الملكية', 'الهوية الوطنية', 'ترخيص وزارة السياحة'].map(function (d, i) { return '<label class="upload"><input type="file" data-ch="addDoc">' + ic(i < 2 ? 'file-check-2' : 'file-up', 'ic-lg ' + (i < 2 ? 'green' : ''), '') + '<div class="b small mt-4">' + d + '</div><div class="xs ' + (i < 2 ? 'green' : 'muted') + '">' + (i < 2 ? 'تم الرفع' : 'اضغط للرفع') + '</div></label>'; }).join('') + '</div>' +
      '<label class="check mt-16"><input type="checkbox" id="w-ack"><span class="small">أقر بصحة البيانات وملكيتي أو تفويضي بإدارة الوحدة</span></label>';
  }
  function addDone(w) { return '<div class="center" style="padding:24px 0"><div class="li-ic green" style="width:72px;height:72px;margin:0 auto">' + ic('check-circle-2', 'ic-xl', '✓') + '</div><h2 class="h2 mt-12">تم إرسال الوحدة للتحقق</h2><p class="muted mt-8 lh">رقم الطلب <b class="navy">' + w.done + '</b> • يراجع فريق رواف المستندات خلال 24–48 ساعة.<br>حالة الوحدة الآن: ' + R.pill('قيد النشر') + '</p><div class="row mt-24" style="justify-content:center"><a class="btn btn-primary" href="#/operator/properties">عرض الوحدات</a><button class="btn btn-ghost" data-act="addReset">إضافة وحدة أخرى</button></div></div>'; }
  A.addSet = function (el) { collect(); R.UI.addP[el.dataset.k] = el.dataset.v; R.rerender(); };
  A.addAmen = function (el) { var a = R.UI.addP.amen, v = el.dataset.v, i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); R.rerender(); };
  A.addRule = function (el) { R.UI.addP.rules[el.dataset.k] = el.checked; };
  A.addPhotos = function (el) { Array.prototype.forEach.call(el.files || [], function (f) { try { R.UI.addP.photos.push(URL.createObjectURL(f)); } catch (e) { } }); R.rerender(); };
  A.addDoc = function (el) { if (el.files && el.files.length) { el.parentElement.querySelector('.xs').textContent = 'تم الرفع: ' + el.files[0].name; el.parentElement.querySelector('.xs').className = 'xs green'; R.toast('تم رفع المستند', 'ok'); } };
  A.addPair = function (el) { collect(); el.innerHTML = '<span class="spin"></span> جارٍ الاقتران…'; setTimeout(function () { R.UI.addP.paired = true; R.toast('تم اقتران القفل وإرسال رمز تجريبي', 'ok'); R.rerender(); }, 1500); };
  A.addSkipLock = function () { var w = R.UI.addP; if (w.sup === 'self') { R.toast('ذاتية الخدمة تتطلب قفلاً ذكياً — غيّر نموذج الإشراف أولاً', 'err'); return; } w.step++; R.rerender(); };
  A.addBack = function () { collect(); R.UI.addP.step--; R.render(); };
  A.addNext = function () {
    collect(); var w = R.UI.addP;
    if (w.step === 2 && (!w.name || !w.district)) { R.toast('أدخل اسم الوحدة والحي', 'err'); return; }
    if (w.step === 5 && w.photoMode === 'upload' && w.photos.length < 1) { R.toast('ارفع صورة واحدة على الأقل أو اطلب مصوّراً', 'err'); return; }
    if (w.step === 8 && !w.paired && w.sup === 'self') { R.toast('اقترن القفل الذكي أولاً', 'err'); return; }
    w.step++; R.render(); window.scrollTo(0, 0);
  };
  A.addSubmit = function () {
    var w = R.UI.addP; if (!R.$('#w-ack').checked) { R.toast('يجب الإقرار بصحة البيانات', 'err'); return; }
    var DB = R.DB, id = Math.max.apply(null, DB.properties.map(function (p) { return p.id; })) + 1, img = C.img(C.P.H);
    var imgs = w.photos.length ? w.photos : [img];
    DB.properties.push({ id: id, title: w.name + ' - ' + w.city, city: w.city, district: w.district, type: w.type, price: w.price, rating: 0, reviewsCount: 0, images: imgs, image: imgs[0], guests: w.guests, bedrooms: w.bedrooms, baths: w.baths, cleaning: 100, amenities: w.amen.slice(), owner: DB.opRole === 'owner' ? 'أحمد الغامدي' : 'رواف للضيافة', smartLock: w.paired, supervision: w.sup, status: 'قيد النشر', occupancy: 0, lock: w.paired ? { provider: w.lockProv, model: w.lockProv + ' Smart Lock', status: 'online', battery: 100, lastSync: R.nowTS() } : null, wifi: { ssid: 'Rawaaf-' + id, pass: '—' }, license: '—', desc: 'وحدة جديدة بانتظار الاعتماد.', blocked: [] });
    var vr = 'VR-' + (90 + Math.floor(Math.random() * 9));
    DB.verification.unshift({ id: vr, name: w.name + ' - ' + w.city, propertyId: id, type: w.type, city: w.city, owner: DB.opRole === 'owner' ? 'أحمد الغامدي' : 'رواف للضيافة', submitted: R.today(), units: w.units, lockPaired: w.paired, photos: w.photoMode === 'photographer' ? 'بانتظار التصوير' : w.photos.length + ' صور', status: 'بانتظار المراجعة', docs: [{ name: 'صك الملكية', ok: true }, { name: 'الهوية الوطنية', ok: true }, { name: 'ترخيص وزارة السياحة', ok: false }], image: imgs[0] });
    if (w.photoMode === 'photographer') DB.shoots.unshift({ id: 'SH-' + (60 + Math.floor(Math.random() * 30)), propertyId: id, title: w.name, address: w.city + '، ' + w.district + ' — ' + w.address, date: R.addDays(R.today(), 2), time: '4:00 م', contact: 'المالك', status: 'مجدولة', shotList: [{ t: 'الواجهة', done: false }, { t: 'الصالة', done: false }, { t: 'الغرف', done: false }, { t: 'المطبخ', done: false }], photos: [], feedback: '' });
    R.audit(DB.opRole === 'owner' ? 'أحمد الغامدي' : 'رواف للضيافة', DB.opRole === 'owner' ? 'مالك' : 'مشغّل', 'إرسال وحدة للاعتماد', vr);
    w.done = vr; R.save(); R.toast('تم إرسال الوحدة للتحقق', 'ok'); R.rerender();
  };
  A.addReset = function () { R.UI.addP = null; R.rerender(); };

  /* ================= CALENDAR ================= */
  function bookedSet(pid) {
    var m = {};
    R.DB.opBookings.forEach(function (b) { if (b.propertyId === pid && b.status !== 'ملغي') { for (var d = b.checkIn; d < b.checkOut; d = R.addDays(d, 1)) m[d] = b; } });
    return m;
  }
  function unitSelect(id, cur, act) { return '<select id="' + id + '" class="select" style="width:auto;min-width:240px" data-ch="' + act + '" aria-label="الوحدة">' + R.DB.properties.map(function (p) { return '<option value="' + p.id + '"' + (p.id === cur ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') + '</select>'; }
  R.route('/operator/calendar', function (pr, q) {
    var pid = Number(q.unit || R.UI.calUnit || 1); R.UI.calUnit = pid; var p = R.prop(pid);
    var off = R.UI.calOff || 0, base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + off);
    var y = base.getFullYear(), m = base.getMonth(), first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
    var booked = bookedSet(pid), blocked = R.DB.blockedDates[pid] = R.DB.blockedDates[pid] || [], sel = R.UI.calSel || [];
    var cells = '';
    for (var i = 0; i < first; i++) cells += '<div class="cal-d empty-d" aria-hidden="true"></div>';
    for (var d = 1; d <= dim; d++) {
      var ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'), b = booked[ds], bl = blocked.indexOf(ds) >= 0, past = ds < R.today();
      var cls = (b ? 'booked' : bl ? 'blocked' : '') + (ds === R.today() ? ' today' : '') + (sel.indexOf(ds) >= 0 ? ' sel' : '');
      cells += '<button class="cal-d ' + cls + '"' + (past && !b ? ' style="opacity:.45"' : '') + ' data-act="calDay" data-d="' + ds + '"' + (b ? ' data-b="' + b.id + '"' : '') + ' aria-label="' + ds + '"><span class="dn">' + d + '</span>' + (b ? '<span class="xs truncate">' + esc(b.guestName.split(' ')[0]) + '</span><span class="xs muted hide-sm">' + b.id + '</span>' : bl ? '<span class="xs">محجوب</span>' : '<span class="xs muted">' + sar(window.RAWAAF_suggest(p, ds, []).price) + '</span>') + '</button>';
    }
    var html = pageH('تقويم التوفر', 'إدارة الحجوزات والحجب لكل وحدة', unitSelect('cal-u', pid, 'calUnit')) +
      '<div class="card card-p"><div class="row between wrap mb-16"><div class="row"><button class="btn btn-ghost btn-icon btn-sm" data-act="calNav" data-d="-1" aria-label="الشهر السابق">' + ic('chevron-right', 'ic-sm', '›') + '</button><h3 class="h3" style="min-width:140px;text-align:center">' + R.AR_MONTHS[m] + ' ' + y + '</h3><button class="btn btn-ghost btn-icon btn-sm" data-act="calNav" data-d="1" aria-label="الشهر التالي">' + ic('chevron-left', 'ic-sm', '‹') + '</button></div>' +
      '<div class="legend"><span><i style="background:var(--navy)"></i>محجوز</span><span><i style="background:#e6e1d5"></i>محجوب</span><span><i style="background:#fff;border:1px solid #ddd"></i>متاح</span><span><i style="background:#fff;outline:2px solid var(--gold)"></i>محدد</span></div></div>' +
      '<div class="cal">' + R.AR_DAYS.map(function (x) { return '<div class="cal-h">' + x + '</div>'; }).join('') + cells + '</div>' +
      '<div class="row wrap mt-16"><span class="small muted">' + (sel.length ? 'تم تحديد ' + sel.length + ' يوم' : 'اضغط على الأيام المتاحة لتحديدها') + '</span><button class="btn btn-primary btn-sm" data-act="calBlock"' + (sel.length ? '' : ' aria-disabled="true"') + '>' + ic('ban', 'ic-sm', '') + 'حجب المحدد</button><button class="btn btn-ghost btn-sm" data-act="calUnblock"' + (sel.length ? '' : ' aria-disabled="true"') + '>إلغاء الحجب</button>' + (sel.length ? '<button class="link small" data-act="calClear">مسح التحديد</button>' : '') + '</div></div>';
    return opShell('cal', html);
  });
  A.calUnit = function (el) { R.UI.calUnit = Number(el.value); R.UI.calSel = []; history.replaceState(null, '', '#/operator/calendar'); R.render(true); };
  A.calNav = function (el) { R.UI.calOff = (R.UI.calOff || 0) + Number(el.dataset.d); R.rerender(); };
  A.calDay = function (el) {
    if (el.dataset.b) { R.go('#/operator/booking/' + el.dataset.b); return; }
    var d = el.dataset.d; if (d < R.today()) { R.toast('لا يمكن تعديل أيام سابقة', 'err'); return; }
    var s = R.UI.calSel = R.UI.calSel || [], i = s.indexOf(d); if (i >= 0) s.splice(i, 1); else s.push(d); R.rerender();
  };
  A.calClear = function () { R.UI.calSel = []; R.rerender(); };
  A.calBlock = function (el) { if (el.getAttribute('aria-disabled') === 'true') { R.toast('حدد أياماً أولاً', 'err'); return; } var b = R.DB.blockedDates[R.UI.calUnit]; R.UI.calSel.forEach(function (d) { if (b.indexOf(d) < 0) b.push(d); }); R.toast('تم حجب ' + R.UI.calSel.length + ' يوم وإيقاف بيعها على كل القنوات', 'ok'); R.UI.calSel = []; R.save(); R.rerender(); };
  A.calUnblock = function (el) { if (el.getAttribute('aria-disabled') === 'true') { R.toast('حدد أياماً أولاً', 'err'); return; } var u = R.UI.calUnit; R.DB.blockedDates[u] = R.DB.blockedDates[u].filter(function (d) { return R.UI.calSel.indexOf(d) < 0; }); R.UI.calSel = []; R.save(); R.toast('تم إلغاء الحجب', 'ok'); R.rerender(); };

  /* ================= SMART PRICING ================= */
  R.route('/operator/pricing', function (pr, q) {
    var DB = R.DB, pid = Number(q.unit || R.UI.prUnit || 1); R.UI.prUnit = pid; var p = R.prop(pid), rules = DB.pricingRules;
    var sug = {}; suggestions(pid).forEach(function (s) { sug[s.date] = s; });
    var pend = suggestions(pid).filter(function (s) { return s.status === 'pending'; });
    var allPendList = pendingSuggestions();
    var allPend = allPendList.length;
    var start = R.today(), dow = new Date(start + 'T12:00:00').getDay(), cells = '';
    for (var i = 0; i < dow; i++) cells += '<div class="cal-d empty-d"></div>';
    var gain = 0;
    for (var k = 0; k < 35; k++) {
      var d = R.addDays(start, k), s = sug[d], f = s ? s.factor : 1, heat = f < 0.97 ? 0 : f < 1.05 ? 1 : f < 1.15 ? 2 : f < 1.25 ? 3 : 4;
      if (s && s.status !== 'rejected') gain += s.price - s.base;
      cells += '<button class="cal-d heat-' + heat + ' ' + (s ? s.status : '') + '" data-act="prDay" data-d="' + d + '" aria-label="' + d + '"><span class="row between"><span class="dn">' + Number(d.slice(8)) + '</span>' + (k === 0 || d.slice(8) === '01' ? '<span class="xs muted">' + R.AR_MONTHS[Number(d.slice(5, 7)) - 1] + '</span>' : '') + '</span>' +
        (s ? '<span class="sug ' + (f > 1 ? 'up' : 'down') + '">' + (f > 1 ? '↑' : '↓') + ' ' + fmt(s.price) + '</span><span class="xs muted hide-sm">' + (f > 1 ? '+' : '') + Math.round((f - 1) * 100) + '%' + (s.status === 'approved' ? ' ✓' : s.status === 'rejected' ? ' ✕' : '') + '</span>' : '<span class="xs muted">' + fmt(p.price) + '</span>') + '</button>';
    }
    var reasonPill = function (r) { var cls = { 'عطلة رسمية': 'pill-red', 'فعالية': 'pill-blue', 'موسم': 'pill-gold', 'مناسبة': 'pill-green', 'طلب مرتفع': 'pill-navy', 'طلب منخفض': 'pill-gray' }[r.kind] || 'pill-gray'; return '<span class="pill ' + cls + '" title="' + esc(r.name) + '">' + r.kind + '</span>'; };
    var html = pageH('التسعير الذكي', 'اقتراحات أسعار يومية مبنية على العطلات والفعاليات والمواسم والطلب', unitSelect('pr-u', pid, 'prUnit')) +
      '<div class="grid g4">' + R.stat({ icon: 'sparkles', tone: 'gold', value: pend.length, label: 'اقتراحات بانتظارك', sub: allPend + ' لكل الوحدات' }) + R.stat({ icon: 'trending-up', value: '+' + sar(gain), label: 'الأثر المتوقع (35 يوم)', sub: 'مقارنة بالسعر الأساسي' }) + R.stat({ icon: 'tag', value: sar(p.price), label: 'السعر الأساسي', sub: 'الحد: ' + sar(p.price * rules.min) + ' – ' + sar(p.price * rules.max) }) + R.stat({ icon: 'zap', tone: rules.autoApply ? 'green' : 'black', value: rules.autoApply ? 'مفعّل' : 'يدوي', label: 'التطبيق التلقائي', sub: rules.autoApply ? 'حتى ±' + rules.autoLimit + '%' : 'تتطلب موافقتك' }) + '</div>' +
      '<div class="grid g-2-1 mt-24" style="gap:24px;align-items:start"><div class="card card-p"><div class="card-h"><h3>خريطة الأسعار — 35 يوماً</h3><div class="row"><button class="btn btn-success btn-sm" data-act="prAll" data-v="approved">' + ic('check-check', 'ic-sm', '✓') + 'اعتماد الكل (' + pend.length + ')</button></div></div>' +
      '<div class="legend mb-12"><span><i style="background:#EEF4FB;border:1px solid #cfe"></i>خفض</span><span><i style="background:#F8F0E0"></i>+5–15%</span><span><i style="background:#F0DDB6"></i>+15–25%</span><span><i style="background:#E3C48A"></i>+25%</span><span><i style="background:#fff;box-shadow:inset 0 0 0 2px #10B981"></i>معتمد</span></div>' +
      '<div class="cal">' + R.AR_DAYS.map(function (x) { return '<div class="cal-h">' + x + '</div>'; }).join('') + cells + '</div></div>' +
      '<div class="stack"><div class="card card-p"><h3 class="h3 mb-8">قواعد التسعير</h3>' +
      '<div class="grid g2">' + R.field('الحد الأدنى', '<select id="pr-min" class="select" data-ch="prRule">' + [0.7, 0.8, 0.9].map(function (v) { return '<option value="' + v + '"' + (v === rules.min ? ' selected' : '') + '>' + Math.round(v * 100) + '% (' + sar(p.price * v) + ')</option>'; }).join('') + '</select>') + R.field('الحد الأعلى', '<select id="pr-max" class="select" data-ch="prRule">' + [1.2, 1.4, 1.6].map(function (v) { return '<option value="' + v + '"' + (v === rules.max ? ' selected' : '') + '>' + Math.round(v * 100) + '% (' + sar(p.price * v) + ')</option>'; }).join('') + '</select>') + '</div>' +
      '<div class="setting-row"><div><div class="b small">التطبيق التلقائي</div><div class="xs muted">اعتماد الاقتراحات ضمن ±' + rules.autoLimit + '% بدون موافقة</div></div>' + R.toggle('id="pr-auto" data-ch="prRule"', rules.autoApply, 'التطبيق التلقائي') + '</div>' +
      '<div class="setting-row"><div><div class="b small">إشعار قبل التطبيق</div><div class="xs muted">واتساب + بريد</div></div>' + R.toggle('data-ch="prRule"', true, 'إشعار') + '</div></div>' +
      '<div class="card card-p"><h3 class="h3 mb-8">الإشارات القادمة</h3><div class="stack-sm">' + DB.pricingEvents.filter(function (e) { return e.city === 'الكل' || e.city === p.city; }).map(function (e) { return '<div class="li"><div class="grow"><div class="b small">' + esc(e.name) + '</div><div class="xs muted">' + e.from + ' ← ' + e.to + '</div></div>' + reasonPill(e) + '<span class="xs b green">+' + e.uplift + '%</span></div>'; }).join('') + '</div></div></div></div>' +
      '<div class="card card-p mt-24"><div class="card-h"><h3>الاقتراحات بانتظار الموافقة</h3><span class="small muted">' + pend.length + '</span></div>' + (pend.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>السعر الحالي</th><th>المقترح</th><th>التغيير</th><th>الأسباب</th><th></th></tr></thead><tbody>' + pend.slice(0, 14).map(function (s) {
        return '<tr><td class="nowrap"><b>' + R.dayName(s.date) + '</b> <span class="muted small">' + s.date + '</span></td><td>' + sar(s.base) + '</td><td class="bb">' + sar(s.price) + '</td><td class="' + (s.factor > 1 ? 'trend-up' : 'down b') + '">' + (s.factor > 1 ? '↑ +' : '↓ ') + Math.round((s.factor - 1) * 100) + '%</td><td><div class="row wrap" style="gap:4px">' + s.reasons.map(reasonPill).join('') + '</div></td><td class="nowrap"><button class="btn btn-success btn-xs" data-act="prDecide" data-k="' + s.key + '" data-v="approved">اعتماد</button> <button class="btn btn-danger btn-xs" data-act="prDecide" data-k="' + s.key + '" data-v="rejected">رفض</button></td></tr>';
      }).join('') + '</tbody></table></div>' + (pend.length > 14 ? '<p class="xs muted mt-8">+ ' + (pend.length - 14) + ' اقتراحات أخرى في الخريطة أعلاه</p>' : '') : R.empty('check-check', 'لا توجد اقتراحات معلقة', 'تمت مراجعة كل الاقتراحات لهذه الوحدة')) + '</div>';
    return opShell('pricing', html);
  });
  A.prUnit = function (el) { R.UI.prUnit = Number(el.value); history.replaceState(null, '', '#/operator/pricing'); R.render(true); };
  A.prDecide = function (el) { R.DB.pricingDecisions[el.dataset.k] = el.dataset.v; R.save(); R.toast(el.dataset.v === 'approved' ? 'تم اعتماد السعر ونشره' : 'تم رفض الاقتراح', el.dataset.v === 'approved' ? 'ok' : 'info'); R.closeAll(); R.rerender(); };
  A.prAll = function () { var n = 0; suggestions(R.UI.prUnit).forEach(function (s) { if (s.status === 'pending') { R.DB.pricingDecisions[s.key] = 'approved'; n++; } }); if (!n) { R.toast('لا توجد اقتراحات معلقة'); return; } R.audit('رواف للضيافة', 'مشغّل', 'اعتماد اقتراحات التسعير (' + n + ' يوم)', 'الوحدة ' + R.UI.prUnit); R.save(); R.toast('تم اعتماد ' + n + ' اقتراح ونشر الأسعار', 'ok'); R.rerender(); };
  A.prRule = function () { var r = R.DB.pricingRules; r.min = Number(R.val('#pr-min')); r.max = Number(R.val('#pr-max')); r.autoApply = R.$('#pr-auto').checked; R.save(); R.toast('تم حفظ قواعد التسعير', 'ok'); R.rerender(); };
  A.prDay = function (el) {
    var p = R.prop(R.UI.prUnit), d = el.dataset.d, s = suggestions(p.id).find(function (x) { return x.date === d; });
    if (!s) { R.modal({ title: R.dayName(d) + ' ' + d, size: 'sm', body: '<p class="lh">لا يوجد اقتراح لهذا اليوم — يبقى السعر الأساسي <b>' + sar(p.price) + '</b>.</p>' + R.field('تعديل يدوي للسعر', '<input id="pr-man" class="input" type="number" value="' + p.price + '">'), foot: '<button class="btn btn-primary" data-act="prManual" data-d="' + d + '">حفظ السعر</button><button class="btn btn-ghost" data-act="closeModal">إغلاق</button>' }); return; }
    R.modal({ title: R.dayName(d) + ' ' + d, sub: esc(p.title), size: 'sm', body: '<div class="grid g2"><div class="soft center"><div class="xs muted b">الحالي</div><div class="h3">' + sar(s.base) + '</div></div><div class="soft center" style="background:#fbf6ec"><div class="xs muted b">المقترح</div><div class="h3 ' + (s.factor > 1 ? 'green' : 'navy') + '">' + sar(s.price) + '</div></div></div><div class="bb mt-16 mb-8">لماذا؟</div>' + s.reasons.map(function (r) { return '<div class="li mt-4"><span class="li-ic gold">' + ic('sparkles', 'ic-sm', '') + '</span><div class="grow"><div class="b small">' + esc(r.name) + '</div><div class="xs muted">' + r.kind + '</div></div></div>'; }).join('') + '<p class="xs muted mt-12">الحالة: ' + R.pill(s.status === 'pending' ? 'بانتظار المراجعة' : s.status === 'approved' ? 'معتمد' : 'مرفوض') + '</p>',
      foot: '<button class="btn btn-success" data-act="prDecide" data-k="' + s.key + '" data-v="approved">اعتماد</button><button class="btn btn-danger" data-act="prDecide" data-k="' + s.key + '" data-v="rejected">رفض</button>' });
  };
  A.prManual = function () { R.closeModal(); R.toast('تم حفظ السعر اليدوي لهذا اليوم', 'ok'); };

  /* ================= BOOKINGS ================= */
  R.route('/operator/bookings', function () {
    var DB = R.DB, st = R.UI.opBSt || 'الكل', q = R.UI.opQ || '';
    var sts = ['الكل', 'مؤكد', 'جارية', 'مكتمل', 'بانتظار الدفع', 'ملغي'];
    var list = DB.opBookings.filter(function (b) { return (st === 'الكل' || b.status === st) && (!q || (b.id + b.guestName + b.title + b.guestPhone).indexOf(q) >= 0); });
    var html = pageH('الحجوزات', DB.opBookings.length + ' حجز', '<button class="btn btn-ghost" data-act="exportCsv">' + ic('download', 'ic-sm', '') + 'تصدير CSV</button>') +
      '<div class="card card-p"><div class="row between wrap mb-16"><div class="search" style="max-width:320px">' + ic('search', '', '⌕') + '<input id="ob-q" type="search" placeholder="رقم الحجز، الضيف، الجوال..." value="' + esc(q) + '" data-enter="obSearch" aria-label="بحث في الحجوزات"></div><div class="scroll-x"><div class="chips">' + sts.map(function (s) { var n = s === 'الكل' ? DB.opBookings.length : DB.opBookings.filter(function (b) { return b.status === s; }).length; return '<button class="chip chip-sm ' + (st === s ? 'on' : '') + '" data-act="obSt" data-v="' + s + '">' + s + ' ' + n + '</button>'; }).join('') + '</div></div></div>' +
      (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>رقم الحجز</th><th>الضيف</th><th>الوحدة</th><th>التواريخ</th><th>المبلغ</th><th>نفاذ</th><th>شموس</th><th>المفتاح</th><th>الحالة</th></tr></thead><tbody>' + list.map(function (b) {
        return '<tr class="click" data-act="go" data-href="#/operator/booking/' + b.id + '"><td class="b ltr nowrap">' + b.id + '</td><td><div class="b nowrap">' + esc(b.guestName) + '</div><div class="xs muted">' + b.source + '</div></td><td class="small" style="max-width:200px"><div class="truncate">' + esc(b.title) + '</div></td><td class="small nowrap">' + b.checkIn + '<br><span class="muted">' + b.checkOut + '</span></td><td class="b nowrap">' + sar(b.total) + '<div class="xs muted">' + b.paymentMethod + '</div></td><td>' + (b.nafath ? '<span class="pill pill-green">موثق</span>' : '<span class="pill pill-amber">بانتظار</span>') + '</td><td>' + R.pill(b.shomoos) + '</td><td>' + R.pill(b.keyStatus) + '</td><td>' + R.pill(b.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : R.empty('search-x', 'لا توجد حجوزات مطابقة', '', '<button class="btn btn-ghost mt-16" data-act="obReset">مسح البحث</button>')) + '</div>';
    return opShell('bookings', html);
  });
  A.obSearch = function (el) { R.UI.opQ = el.value.trim(); R.rerender(); };
  A.obSt = function (el) { R.UI.opBSt = el.dataset.v; R.rerender(); };
  A.obReset = function () { R.UI.opQ = ''; R.UI.opBSt = 'الكل'; R.rerender(); };
  A.exportCsv = function () {
    var rows = [['رقم الحجز', 'الضيف', 'الوحدة', 'الوصول', 'المغادرة', 'المبلغ', 'الحالة']].concat(R.DB.opBookings.map(function (b) { return [b.id, b.guestName, b.title, b.checkIn, b.checkOut, b.total, b.status]; }));
    var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'rawaaf-bookings.csv'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { }
    R.toast('تم تصدير ' + R.DB.opBookings.length + ' حجز', 'ok');
  };

  R.route('/operator/booking/:id', function (pr) {
    var b = R.DB.opBookings.find(function (x) { return x.id === pr.id; }); if (!b) return opShell('bookings', R.empty('calendar-x', 'الحجز غير موجود'));
    var p = R.prop(b.propertyId), log = R.DB.accessEvents.filter(function (e) { return e.propertyId === p.id; }).slice(0, 6);
    var html = '<a class="link small" href="#/operator/bookings">' + ic('arrow-right', 'ic-sm', '→') + ' كل الحجوزات</a>' +
      '<div class="page-h mt-12"><div><h1 class="ltr">' + b.id + '</h1><p>' + esc(b.title) + ' • أنشئ ' + b.createdAt + ' عبر ' + b.source + '</p></div><div class="row wrap">' + R.pill(b.status) +
      (b.status === 'مؤكد' || b.status === 'بانتظار الدفع' ? '<button class="btn btn-ghost btn-sm" data-act="obModify" data-id="' + b.id + '">' + ic('calendar-cog', 'ic-sm', '') + 'تعديل التواريخ</button><button class="btn btn-danger btn-sm" data-act="obCancel" data-id="' + b.id + '">إلغاء الحجز</button>' : '') + '</div></div>' +
      '<div class="grid g3" style="gap:20px;align-items:start"><div class="card card-p"><h3 class="h3 mb-12">الضيف</h3><div class="row gap-12"><div class="avatar">' + esc(b.guestName[0]) + '</div><div><div class="bb">' + esc(b.guestName) + '</div><div class="small muted ltr">' + esc(b.guestPhone) + '</div></div></div>' +
      '<div class="mt-16">' + (b.nafath ? '<div class="notice green small">' + ic('badge-check', '', '✓') + '<div><b>تم التحقق عبر نفاذ</b><br><span class="xs">هوية وطنية •••••••321</span></div></div>' : '<div class="notice amber small">' + ic('alert-triangle', '', '!') + '<div class="grow"><b>لم يتم التحقق بعد</b><br><span class="xs">المفتاح لن يُصدر قبل التحقق</span></div><button class="btn btn-primary btn-xs" data-act="toast" data-msg="تم إرسال رابط التحقق عبر نفاذ للضيف (SMS + واتساب)" data-kind="ok">إرسال تذكير</button></div>') + '</div>' +
      R.kv('عدد الضيوف', b.guests) + R.kv('الوصول', b.checkIn + ' • 3:00 م') + R.kv('المغادرة', b.checkOut + ' • 12:00 م') + R.kv('الليالي', b.nights) +
      '<div class="row mt-12"><a class="btn btn-ghost btn-sm grow" href="tel:' + esc(b.guestPhone) + '">' + ic('phone', 'ic-sm', '') + 'اتصال</a><a class="btn btn-wa btn-sm grow" href="https://wa.me/966' + esc(b.guestPhone.slice(1)) + '" target="_blank" rel="noopener">واتساب</a></div></div>' +
      '<div class="card card-p"><h3 class="h3 mb-12">الدفع</h3>' + R.kv(R.nt(b.nights) + ' × ' + sar(b.rate), sar(b.rate * b.nights)) + R.kv('التنظيف', sar(b.cleaning)) + R.kv('الضريبة 15%', sar(b.vat)) + R.kv('الإجمالي', sar(b.total), 'total') + R.kv('طريقة الدفع', b.paymentMethod) + R.kv('حالة الدفع', R.pill(b.payment)) + R.kv('عمولة المنصة 15%', '- ' + sar(Math.round((b.total - b.vat) * 0.15))) + R.kv('صافي المالك', '<span class="green">' + sar(Math.round((b.total - b.vat) * 0.85)) + '</span>') + '<a class="btn btn-ghost btn-sm btn-block mt-12" href="#/invoice/' + b.id + '">' + ic('receipt', 'ic-sm', '') + 'الفاتورة</a></div>' +
      '<div class="stack"><div class="card card-p"><h3 class="h3 mb-12">المفتاح الرقمي</h3><div class="row between"><span class="code-box" style="font-size:22px;color:var(--navy)">' + (b.keyCode === '—' ? '— — —' : b.keyCode.slice(0, 2) + '•• ••#') + '</span>' + R.pill(b.keyStatus) + '</div><div class="xs muted mt-8">' + (p.lock ? p.lock.provider + ' • صالح ' + b.checkIn + ' 3:00 م ← ' + b.checkOut + ' 12:00 م' : 'وحدة بدون قفل ذكي — تسليم عبر المشرف') + '</div>' +
      '<div class="row wrap mt-12"><button class="btn btn-ghost btn-xs" data-act="keyAction" data-id="' + b.id + '" data-v="reissue">إعادة إصدار</button><button class="btn btn-ghost btn-xs" data-act="keyAction" data-id="' + b.id + '" data-v="extend">تمديد حتى 3 م</button><button class="btn btn-danger btn-xs" data-act="keyAction" data-id="' + b.id + '" data-v="revoke">إلغاء الرمز</button></div></div>' +
      '<div class="card card-p"><h3 class="h3 mb-12">شموس (الإبلاغ عن النزلاء)</h3><div class="row between">' + R.pill(b.shomoos) + '<button class="btn btn-ghost btn-xs" data-act="shomoosSend" data-id="' + b.id + '">' + ic('send', 'ic-sm', '') + 'إرسال الآن</button></div><div class="xs muted mt-8">يتم الإرسال تلقائياً عند أول فتح للقفل.</div></div></div></div>' +
      '<div class="card card-p mt-20"><div class="card-h"><h3>سجل الدخول للوحدة</h3><a class="link" href="#/operator/locks">كل الأقفال</a></div><div class="rows">' + (log.length ? log.map(R.logRow).join('') : R.empty('history', 'لا توجد أحداث')) + '</div></div>';
    return opShell('bookings', html);
  });
  A.keyAction = function (el) {
    var b = R.DB.opBookings.find(function (x) { return x.id === el.dataset.id; }), v = el.dataset.v;
    if (v === 'revoke') { R.confirm({ title: 'إلغاء رمز الدخول؟', danger: true, ok: 'إلغاء الرمز', msg: 'لن يتمكن الضيف من الدخول حتى إصدار رمز جديد.', onOk: function () { b.keyStatus = 'ملغى'; R.save(); R.toast('تم إلغاء الرمز', 'ok'); R.rerender(); } }); return; }
    if (v === 'reissue') { b.keyCode = String(Math.floor(100000 + Math.random() * 899999)); b.keyStatus = b.status === 'جارية' ? 'مُفعّل' : 'مُجدول'; R.save(); R.toast('تم إصدار رمز جديد وإرساله للضيف عبر SMS وواتساب', 'ok'); R.rerender(); return; }
    R.toast('تم تمديد صلاحية الرمز حتى 3:00 م يوم المغادرة', 'ok');
  };
  A.shomoosSend = function (el) { var b = R.DB.opBookings.find(function (x) { return x.id === el.dataset.id; }); R.toast('جارٍ الإرسال إلى شموس…'); setTimeout(function () { b.shomoos = 'تم الإرسال'; R.save(); R.toast('تم إرسال بيانات النزيل إلى شموس', 'ok'); R.rerender(); }, 1000); };
  A.obCancel = function (el) {
    var b = R.DB.opBookings.find(function (x) { return x.id === el.dataset.id; });
    R.confirm({ title: 'إلغاء الحجز ' + b.id, danger: true, ok: 'إلغاء واسترداد', msg: 'سيتم إلغاء الحجز واسترداد المبلغ للضيف وإلغاء المفتاح الرقمي. إلغاء المشغّل يؤثر على مؤشر الموثوقية.', extra: R.field('سبب الإلغاء', '<select id="oc-r" class="select mt-8"><option>عطل في الوحدة</option><option>حجز مزدوج</option><option>طلب الضيف</option><option>أخرى</option></select>'),
      onOk: function () { b.status = 'ملغي'; b.keyStatus = 'ملغى'; b.payment = 'مسترد'; var gb = R.DB.bookings.find(function (x) { return x.id === b.id; }); if (gb) { gb.status = 'ملغي'; gb.keyStatus = 'ملغى'; } R.save(); R.toast('تم إلغاء الحجز وإشعار الضيف', 'ok'); R.rerender(); } });
  };
  A.obModify = function (el) {
    var b = R.DB.opBookings.find(function (x) { return x.id === el.dataset.id; });
    R.modal({ title: 'تعديل تواريخ الحجز', size: 'sm', body: '<div class="grid g2">' + R.field('الوصول', '<input id="om-in" type="date" class="input" value="' + b.checkIn + '">') + R.field('المغادرة', '<input id="om-out" type="date" class="input" value="' + b.checkOut + '">') + '</div><p class="xs muted mt-12">سيُرسل للضيف طلب موافقة على التعديل وفرق السعر إن وجد.</p>', foot: '<button class="btn btn-primary" data-act="obModifyOk" data-id="' + b.id + '">إرسال التعديل</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.obModifyOk = function (el) { var b = R.DB.opBookings.find(function (x) { return x.id === el.dataset.id; }), i = R.val('#om-in'), o = R.val('#om-out'); if (o <= i) { R.toast('تاريخ المغادرة غير صحيح', 'err'); return; } b.checkIn = i; b.checkOut = o; b.nights = R.nights(i, o); R.save(); R.closeModal(); R.toast('تم تعديل التواريخ وإرسال إشعار للضيف', 'ok'); R.rerender(); };

  /* ================= LOCKS ================= */
  R.route('/operator/locks', function () {
    var DB = R.DB, locks = DB.properties.filter(function (p) { return p.lock; });
    var on = locks.filter(function (p) { return p.lock.status === 'online'; }).length, low = locks.filter(function (p) { return p.lock.battery < 30; }).length;
    var fails = DB.accessEvents.filter(function (e) { return e.result === 'فاشل'; }).length;
    var html = pageH('الدخول الذكي والأقفال', locks.length + ' قفل مقترن', '<button class="btn btn-ghost" data-act="syncAll">' + ic('refresh-cw', 'ic-sm', '') + 'مزامنة الكل</button>') +
      '<div class="grid g4">' + R.stat({ icon: 'wifi', tone: 'green', value: on + ' / ' + locks.length, label: 'متصل', sub: 'آخر فحص منذ دقيقة' }) + R.stat({ icon: 'wifi-off', tone: 'red', value: locks.length - on, label: 'غير متصل', sub: 'يتطلب تدخل ميداني' }) + R.stat({ icon: 'battery-low', tone: 'gold', value: low, label: 'بطارية منخفضة', sub: 'أقل من 30%' }) + R.stat({ icon: 'shield-x', tone: 'black', value: fails, label: 'محاولات فاشلة', sub: 'آخر 7 أيام' }) + '</div>' +
      '<div class="card card-p mt-24"><div class="card-h"><h3>الأقفال</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الوحدة</th><th>المزود</th><th>الاتصال</th><th>البطارية</th><th>آخر مزامنة</th><th></th></tr></thead><tbody>' + locks.map(function (p) {
        var L = p.lock; return '<tr><td><div class="row gap-12">' + thumb(p) + '<div class="b small">' + esc(p.title) + '</div></div></td><td class="small">' + L.provider + '<div class="xs muted">' + L.model + '</div></td><td>' + (L.status === 'online' ? '<span class="pill pill-green"><span class="dot dot-green"></span>متصل</span>' : '<span class="pill pill-red"><span class="dot dot-red pulse"></span>غير متصل</span>') + '</td><td><div class="row"><div class="bar thin" style="width:70px"><div style="width:' + L.battery + '%;background:' + (L.battery < 30 ? 'var(--red-solid)' : L.battery < 50 ? '#F59E0B' : 'var(--green-solid)') + '"></div></div><span class="xs b ' + (L.battery < 30 ? 'red' : '') + '">' + L.battery + '%</span></div></td><td class="xs muted ltr nowrap">' + L.lastSync + '</td>' +
          '<td class="nowrap"><button class="btn btn-ghost btn-xs" data-act="lockSync" data-id="' + p.id + '">مزامنة</button> <button class="btn btn-primary btn-xs" data-act="emergencyCode" data-id="' + p.id + '">' + ic('siren', 'ic-sm', '') + 'رمز طوارئ</button>' + (L.status !== 'online' || L.battery < 30 ? ' <button class="btn btn-danger btn-xs" data-act="lockTask" data-id="' + p.id + '">مهمة صيانة</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="grid g2 mt-24" style="gap:24px"><div class="card card-p"><div class="card-h"><h3>آخر أحداث الدخول</h3></div><div class="rows">' + DB.accessEvents.slice(0, 8).map(function (e) { return R.logRow(e).replace('<div class="b small">', '<div class="xs gold-dark b">' + esc(pname(e.propertyId)) + '</div><div class="b small">'); }).join('') + '</div></div>' +
      '<div class="card card-p"><div class="card-h"><h3>رموز الطوارئ الصادرة</h3></div>' + (DB.emergencyCodes.length ? '<div class="rows">' + DB.emergencyCodes.map(function (c) { return '<div class="row between" style="padding:10px 0"><div><div class="b small">' + esc(pname(c.pid)) + '</div><div class="xs muted">' + esc(c.reason) + ' • ' + c.time + '</div></div><div class="end"><div class="kbd">' + c.code + '#</div><div class="xs muted">' + c.dur + '</div></div></div>'; }).join('') + '</div>' : R.empty('siren', 'لا توجد رموز طوارئ', 'استخدمها عند تعطل التطبيق أو فقدان الضيف لرمزه')) + '</div></div>';
    return opShell('locks', html);
  });
  A.syncAll = function () { R.toast('جارٍ مزامنة كل الأقفال…'); setTimeout(function () { R.DB.properties.forEach(function (p) { if (p.lock && p.lock.battery > 5) { p.lock.status = 'online'; p.lock.lastSync = R.nowTS(); } }); R.save(); R.toast('تمت المزامنة — قفل واحد ما زال غير متصل (بطارية فارغة)', 'info'); R.rerender(); }, 1200); };
  A.lockTask = function (el) { var p = R.prop(el.dataset.id); R.DB.tasks.unshift({ id: 'TK-' + Math.floor(300 + Math.random() * 600), type: 'maintenance', title: 'صيانة القفل الذكي / تغيير البطارية', propertyId: p.id, assignee: 'فيصل الحربي', due: R.nowTS(), status: 'todo', priority: 'عالية', checklist: [{ t: 'تغيير البطارية', done: false }, { t: 'مزامنة القفل', done: false }, { t: 'اختبار رمز تجريبي', done: false }], photos: [], notes: '' }); R.save(); R.toast('تم إنشاء مهمة صيانة وإسنادها للمشرف', 'ok'); };
  A.emergencyCode = function (el) {
    var p = R.prop(el.dataset.id);
    R.modal({ title: 'إصدار رمز طوارئ', sub: esc(p.title), size: 'sm', body: '<div class="stack">' + R.field('المدة', '<select id="em-d" class="select"><option>ساعة واحدة</option><option>3 ساعات</option><option>حتى نهاية اليوم</option></select>') + R.field('المستلم', '<select id="em-to" class="select"><option>الضيف الحالي</option><option>المشرف الميداني</option><option>فني الصيانة</option></select>') + R.field('السبب (مطلوب للتدقيق)', '<input id="em-r" class="input" placeholder="مثال: الضيف فقد الرمز">') + (p.lock.status !== 'online' ? '<div class="notice amber xs">' + ic('alert-triangle', 'ic-sm', '') + '<div>القفل غير متصل — سيتم توليد رمز دون اتصال (Offline code) من خوارزمية المزود.</div></div>' : '') + '</div>',
      foot: '<button class="btn btn-primary" data-act="emergencyOk" data-id="' + p.id + '">إصدار الرمز</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.emergencyOk = function (el) {
    var r = R.val('#em-r'); if (!r) { R.toast('السبب مطلوب', 'err'); return; }
    var code = String(Math.floor(100000 + Math.random() * 899999)), pid = Number(el.dataset.id);
    R.DB.emergencyCodes.unshift({ pid: pid, code: code, dur: R.val('#em-d'), reason: r + ' • ' + R.val('#em-to'), time: R.nowTS() });
    R.DB.accessEvents.unshift({ id: R.uid('a'), propertyId: pid, time: R.nowTS(), who: 'رواف للضيافة (مشغّل)', method: 'رمز طوارئ', result: 'ناجح', note: 'إصدار: ' + r });
    R.audit('رواف للضيافة', 'مشغّل', 'إصدار رمز طوارئ', 'الوحدة ' + pid); R.save();
    R.modalSet('<div class="center"><div class="li-ic red" style="width:60px;height:60px;margin:0 auto">' + ic('siren', 'ic-lg', '!') + '</div><div class="code-box mt-12" style="color:var(--navy)">' + code + '#</div><p class="small muted mt-8">صالح ' + R.val('#em-d') + ' — تم إرساله عبر SMS وتسجيله في سجل التدقيق.</p></div>', '<button class="btn btn-primary" data-act="closeAndRefresh">تم</button>');
  };
  A.closeAndRefresh = function () { R.closeModal(); R.rerender(); };

  /* ================= OPERATIONS ================= */
  var TT = { cleaning: ['تنظيف', 'sparkles', 'pill-blue'], readiness: ['جاهزية', 'check-circle-2', 'pill-green'], inspection: ['فحص', 'search-check', 'pill-gold'], maintenance: ['صيانة', 'wrench', 'pill-red'] };
  R.TT = TT;
  R.route('/operator/ops', function () { return ops('tasks'); });
  R.route('/operator/ops/:tab', function (p) { return ops(p.tab); });
  function ops(tab) {
    var DB = R.DB, body;
    if (tab === 'incidents') {
      body = '<div class="card card-p"><div class="card-h"><h3>البلاغات</h3><button class="btn btn-primary btn-sm" data-act="newIncident">' + ic('plus', 'ic-sm', '+') + 'بلاغ جديد</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الرقم</th><th>البلاغ</th><th>الوحدة</th><th>التصنيف</th><th>الخطورة</th><th>المُبلّغ</th><th>الحالة</th></tr></thead><tbody>' + DB.incidents.map(function (i, k) {
        return '<tr><td class="b ltr">' + i.id + '</td><td class="b">' + esc(i.title) + '<div class="xs muted ltr" style="text-align:right">' + i.time + '</div></td><td class="small">' + esc(pname(i.propertyId)) + '</td><td>' + i.category + '</td><td>' + R.pill(i.severity) + '</td><td class="small">' + esc(i.reportedBy) + '</td><td><select class="select" style="height:34px;width:130px;font-size:12px" data-ch="incStatus" data-i="' + k + '" aria-label="حالة البلاغ">' + ['مفتوح', 'قيد المعالجة', 'مغلق'].map(function (s) { return '<option' + (s === i.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    } else if (tab === 'damages') {
      body = '<div class="stack">' + DB.damages.map(function (d, k) {
        return '<div class="card card-p"><div class="row between wrap"><div><div class="row"><span class="b ltr">' + d.id + '</span>' + R.pill(d.status) + '</div><h3 class="h3 mt-4">' + esc(d.title) + '</h3><div class="small muted">' + esc(pname(d.propertyId)) + ' • ' + d.bookingId + ' • الضيف: ' + esc(d.guest) + ' • ' + d.date + '</div></div><div class="end"><div class="xs muted b">التقدير</div><div class="h3">' + sar(d.estimate) + '</div></div></div>' +
          '<p class="small lh mt-8">' + esc(d.desc) + '</p><div class="thumbs-row mt-12">' + d.photos.map(function (u) { return '<img src="' + u + '" alt="صورة الضرر" style="width:120px;height:90px">'; }).join('') + '</div>' +
          (d.guestResponse ? '<div class="owner-reply"><div class="xs b gold-dark">رد الضيف:</div>' + esc(d.guestResponse) + '</div>' : '') +
          (d.status === 'بانتظار المراجعة' ? '<div class="row wrap mt-16"><button class="btn btn-primary btn-sm" data-act="dmgSend" data-i="' + k + '">إرسال للضيف للموافقة</button><button class="btn btn-ghost btn-sm" data-act="dmgEscalate" data-i="' + k + '">تصعيد لإدارة المنصة</button><button class="btn btn-danger btn-sm" data-act="dmgDrop" data-i="' + k + '">إغلاق بدون غرامة</button></div>' : '<div class="xs muted mt-12">' + (d.status === 'بانتظار رد الضيف' ? 'أُرسل للضيف — مهلة الرد 72 ساعة' : d.status === 'معتمد' ? 'تم خصم ' + sar(d.fine) + ' وتحويلها للمالك' : 'مرفوضة بعد المراجعة') + '</div>') + '</div>';
      }).join('') + '</div>';
    } else {
      var cols = [['todo', 'جديدة'], ['doing', 'قيد التنفيذ'], ['review', 'بانتظار الاعتماد'], ['done', 'مكتملة']];
      body = '<div class="row between wrap mb-16"><div class="small muted">اضغط على أي بطاقة لعرض التفاصيل وتغيير الحالة</div><button class="btn btn-primary btn-sm" data-act="newTask">' + ic('plus', 'ic-sm', '+') + 'مهمة جديدة</button></div><div class="kanban">' + cols.map(function (c) {
        var ts = DB.tasks.filter(function (t) { return t.status === c[0]; });
        return '<div class="kcol"><div class="kcol-h"><span>' + c[1] + '</span><span class="pill pill-gray">' + ts.length + '</span></div>' + ts.map(function (t) {
          var done = t.checklist.filter(function (x) { return x.done; }).length, tt = TT[t.type];
          return '<button class="kcard" data-act="taskOpen" data-id="' + t.id + '"><div class="row between"><span class="pill ' + tt[2] + '">' + ic(tt[1], '', '') + tt[0] + '</span>' + R.pill(t.priority) + '</div><div class="b small mt-8">' + esc(t.title) + '</div><div class="xs muted truncate">' + esc(pname(t.propertyId)) + '</div><div class="bar thin mt-8"><div style="width:' + (t.checklist.length ? done / t.checklist.length * 100 : 0) + '%;background:var(--green-solid)"></div></div><div class="row between mt-8 xs muted"><span class="row gap-4">' + ic('user', 'ic-sm', '') + esc(t.assignee) + '</span><span class="ltr">' + t.due.slice(5) + '</span></div></button>';
        }).join('') + (ts.length ? '' : '<div class="xs muted center" style="padding:20px">لا توجد مهام</div>') + '</div>';
      }).join('') + '</div>';
    }
    var html = pageH('المهام والبلاغات', 'التنظيف والجاهزية والفحص والصيانة') + '<div class="mb-16">' + R.tabLinks([{ id: 'tasks', label: 'لوحة المهام', icon: 'kanban', href: '#/operator/ops/tasks' }, { id: 'incidents', label: 'البلاغات (' + DB.incidents.filter(function (i) { return i.status !== 'مغلق'; }).length + ')', icon: 'siren', href: '#/operator/ops/incidents' }, { id: 'damages', label: 'قضايا الأضرار (' + DB.damages.length + ')', icon: 'shield-alert', href: '#/operator/ops/damages' }], tab) + '</div>' + body;
    return opShell('ops', html);
  }
  A.incStatus = function (el) { R.DB.incidents[Number(el.dataset.i)].status = el.value; R.save(); R.toast('تم تحديث حالة البلاغ', 'ok'); R.rerender(); };
  A.dmgSend = function (el) { var d = R.DB.damages[Number(el.dataset.i)]; d.status = 'بانتظار رد الضيف'; R.save(); R.toast('تم إرسال تفاصيل الضرر والصور للضيف ' + d.guest, 'ok'); R.rerender(); };
  A.dmgEscalate = function (el) { var d = R.DB.damages[Number(el.dataset.i)]; d.escalated = true; R.save(); R.toast('تم تصعيد القضية ' + d.id + ' لإدارة المنصة', 'ok'); };
  A.dmgDrop = function (el) { var d = R.DB.damages[Number(el.dataset.i)]; R.confirm({ title: 'إغلاق القضية بدون غرامة؟', msg: 'سيتم إغلاق ' + d.id + ' وإشعار الضيف.', onOk: function () { d.status = 'مرفوض'; d.fine = 0; R.save(); R.toast('تم الإغلاق'); R.rerender(); } }); };
  A.newIncident = function () {
    R.modal({ title: 'بلاغ جديد', size: 'sm', body: '<div class="stack">' + R.field('الوحدة', unitSelect('ni-u', 1, 'noop').replace('style="width:auto;min-width:240px"', '')) + R.field('العنوان', '<input id="ni-t" class="input">') + R.field('التصنيف', '<select id="ni-c" class="select"><option>صيانة</option><option>قفل ذكي</option><option>نظافة</option><option>خدمة</option></select>') + R.field('الخطورة', '<select id="ni-s" class="select"><option>منخفضة</option><option selected>متوسطة</option><option>عالية</option></select>') + '</div>', foot: '<button class="btn btn-primary" data-act="newIncidentOk">إضافة</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.newIncidentOk = function () { var t = R.val('#ni-t'); if (!t) { R.toast('العنوان مطلوب', 'err'); return; } R.DB.incidents.unshift({ id: 'IN-' + Math.floor(100 + Math.random() * 800), propertyId: Number(R.val('#ni-u')), title: t, category: R.val('#ni-c'), severity: R.val('#ni-s'), status: 'مفتوح', reportedBy: 'فريق التشغيل', time: R.nowTS() }); R.save(); R.closeModal(); R.toast('تمت إضافة البلاغ', 'ok'); R.rerender(); };
  A.newTask = function () {
    R.modal({ title: 'مهمة جديدة', size: 'sm', body: '<div class="stack">' + R.field('النوع', '<select id="nt-type" class="select"><option value="cleaning">تنظيف</option><option value="readiness">جاهزية قبل الوصول</option><option value="inspection">فحص بعد المغادرة</option><option value="maintenance">صيانة</option></select>') + R.field('الوحدة', unitSelect('nt-u', 1, 'noop').replace('style="width:auto;min-width:240px"', '')) + R.field('العنوان', '<input id="nt-t" class="input" placeholder="مثال: تغيير فلاتر المكيف">') + R.field('المسؤول', '<select id="nt-a" class="select"><option>فيصل الحربي</option><option>فريق النظافة — جدة</option><option>فني التكييف — الرياض</option></select>') + R.field('الموعد', '<input id="nt-d" type="date" class="input" value="' + R.today() + '">') + R.field('الأولوية', '<select id="nt-p" class="select"><option>منخفضة</option><option selected>متوسطة</option><option>عالية</option></select>') + '</div>', foot: '<button class="btn btn-primary" data-act="newTaskOk">إنشاء وإسناد</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.newTaskOk = function () { var t = R.val('#nt-t'); if (!t) { R.toast('العنوان مطلوب', 'err'); return; } R.DB.tasks.unshift({ id: 'TK-' + Math.floor(300 + Math.random() * 600), type: R.val('#nt-type'), title: t, propertyId: Number(R.val('#nt-u')), assignee: R.val('#nt-a'), due: R.val('#nt-d') + ' 12:00', status: 'todo', priority: R.val('#nt-p'), checklist: [{ t: 'تنفيذ المهمة', done: false }, { t: 'التصوير بعد التنفيذ', done: false }], photos: [], notes: '' }); R.save(); R.closeModal(); R.toast('تم إنشاء المهمة وإشعار المسؤول', 'ok'); R.rerender(); };
  A.taskOpen = function (el) {
    var t = R.DB.tasks.find(function (x) { return x.id === el.dataset.id; }), tt = TT[t.type];
    R.modal({ title: esc(t.title), sub: t.id + ' • ' + esc(pname(t.propertyId)), size: 'lg', body: '<div class="row wrap"><span class="pill ' + tt[2] + '">' + tt[0] + '</span>' + R.pill(t.priority) + '<span class="pill pill-gray">' + ic('user', '', '') + esc(t.assignee) + '</span><span class="pill pill-gray ltr">' + t.due + '</span></div>' +
      '<h4 class="bb mt-16 mb-8">قائمة التحقق</h4><div class="stack-sm">' + t.checklist.map(function (c) { return '<div class="check-item ' + (c.done ? 'done' : '') + '"><span class="cb">' + (c.done ? '✓' : '') + '</span><span class="t">' + esc(c.t) + '</span></div>'; }).join('') + '</div>' +
      (t.photos.length ? '<h4 class="bb mt-16 mb-8">الصور</h4><div class="thumbs-row">' + t.photos.map(function (u) { return '<img src="' + u + '" alt="">'; }).join('') + '</div>' : '') + (t.notes ? '<div class="owner-reply">' + esc(t.notes) + '</div>' : '') +
      '<div class="mt-16">' + R.field('نقل إلى', '<select id="tk-s" class="select"><option value="todo"' + (t.status === 'todo' ? ' selected' : '') + '>جديدة</option><option value="doing"' + (t.status === 'doing' ? ' selected' : '') + '>قيد التنفيذ</option><option value="review"' + (t.status === 'review' ? ' selected' : '') + '>بانتظار الاعتماد</option><option value="done"' + (t.status === 'done' ? ' selected' : '') + '>مكتملة</option></select>') + '</div>',
      foot: (t.status === 'review' ? '<button class="btn btn-success" data-act="taskApprove" data-id="' + t.id + '">' + ic('check', 'ic-sm', '') + 'اعتماد الجاهزية</button>' : '') + '<button class="btn btn-primary" data-act="taskMove" data-id="' + t.id + '">حفظ</button><button class="btn btn-ghost" data-act="closeModal">إغلاق</button>' });
  };
  A.taskMove = function (el) { var t = R.DB.tasks.find(function (x) { return x.id === el.dataset.id; }); t.status = R.val('#tk-s'); R.save(); R.closeModal(); R.toast('تم تحديث المهمة', 'ok'); R.rerender(); };
  A.taskApprove = function (el) { var t = R.DB.tasks.find(function (x) { return x.id === el.dataset.id; }); t.status = 'done'; var p = R.prop(t.propertyId); if (p.status === 'قيد التجهيز' || p.status === 'فحص بعد المغادرة') p.status = 'متاحة'; R.save(); R.closeModal(); R.toast('تم اعتماد الجاهزية — الوحدة متاحة للبيع', 'ok'); R.rerender(); };

  /* ================= REVIEWS ================= */
  R.route('/operator/reviews', function () {
    var DB = R.DB, f = R.UI.revF || 'all';
    var list = DB.reviews.filter(function (r) { return f === 'all' || (f === 'noreply' ? !r.ownerReply : r.rating <= 3); });
    var avg = (DB.reviews.reduce(function (s, r) { return s + r.rating; }, 0) / DB.reviews.length).toFixed(2);
    var html = pageH('التقييمات', 'الرد السريع يرفع ترتيب وحداتك في نتائج البحث') +
      '<div class="grid g4 mb-16">' + R.stat({ icon: 'star', tone: 'gold', value: avg, label: 'متوسط التقييم' }) + R.stat({ icon: 'message-square', value: DB.reviews.length, label: 'تقييمات' }) + R.stat({ icon: 'message-square-dashed', tone: 'red', value: DB.reviews.filter(function (r) { return !r.ownerReply; }).length, label: 'بدون رد' }) + R.stat({ icon: 'timer', tone: 'black', value: '3.2 س', label: 'متوسط وقت الرد' }) + '</div>' +
      '<div class="card card-p"><div class="mb-16">' + R.tabs([{ id: 'all', label: 'الكل' }, { id: 'noreply', label: 'بدون رد' }, { id: 'low', label: '3 نجوم وأقل' }], f, 'revF') + '</div><div class="stack-sm">' + list.map(function (r) {
        return '<div class="review"><div class="row between wrap"><div class="row"><div class="avatar avatar-sm">' + esc(r.userName[0]) + '</div><div><div class="b small">' + esc(r.userName) + ' <span class="xs muted">• ' + r.date + '</span></div><div class="xs gold-dark b">' + esc(pname(r.propertyId)) + '</div></div></div>' + R.stars(r.rating) + '</div><p class="small lh mt-8">' + esc(r.comment) + '</p>' +
          (r.ownerReply ? '<div class="owner-reply"><div class="xs b gold-dark">ردك:</div>' + esc(r.ownerReply) + '</div>' : '<div class="row mt-12"><input class="input" id="rp-' + r.id + '" placeholder="اكتب رداً مهذباً للضيف..." data-enter="revReply" data-id="' + r.id + '"><button class="btn btn-primary btn-sm" data-act="revReply" data-id="' + r.id + '">رد</button><button class="btn btn-ghost btn-sm hide-sm" data-act="revSuggest" data-id="' + r.id + '">' + ic('sparkles', 'ic-sm', '') + 'اقتراح</button></div>') + '</div>';
      }).join('') + (list.length ? '' : R.empty('check-check', 'لا توجد تقييمات بهذا الفلتر')) + '</div></div>';
    return opShell('reviews', html);
  });
  A.revF = function (el) { R.UI.revF = el.dataset.id; R.rerender(); };
  A.revSuggest = function (el) { var r = R.DB.reviews.find(function (x) { return x.id === el.dataset.id; }); R.$('#rp-' + r.id).value = r.rating >= 4 ? 'شكراً ' + r.userName + ' على كلماتك الجميلة، سعدنا باستضافتك ونتطلع لزيارتك القادمة!' : 'نعتذر ' + r.userName + ' عن الإزعاج، تم التواصل مع فريق الصيانة ومعالجة الملاحظة. نتمنى أن نستضيفك مجدداً بتجربة أفضل.'; };
  A.revReply = function (el) { var r = R.DB.reviews.find(function (x) { return x.id === el.dataset.id; }), v = R.val('#rp-' + r.id); if (!v) { R.toast('اكتب الرد أولاً', 'err'); return; } r.ownerReply = v; R.save(); R.toast('تم نشر الرد', 'ok'); R.rerender(); };

  /* ================= PAYOUTS ================= */
  R.route('/operator/payouts', function () {
    var DB = R.DB, P = DB.payouts, cur = P[0];
    var html = pageH('المدفوعات والتحويلات', 'الإيرادات والعمولات وصافي التحويلات الشهرية', '<button class="btn btn-ghost" data-act="dlStatement" data-id="' + cur.id + '">' + ic('download', 'ic-sm', '') + 'كشف الحساب</button>') +
      '<div class="grid g4">' + R.stat({ icon: 'banknote', value: sar(cur.gross), label: 'إجمالي الإيراد (' + cur.period + ')' }) + R.stat({ icon: 'percent', tone: 'red', value: sar(cur.commission), label: 'عمولة رواف 15%' }) + R.stat({ icon: 'receipt', tone: 'black', value: sar(cur.fees), label: 'رسوم الدفع والتشغيل' }) + R.stat({ icon: 'wallet', tone: 'gold', value: sar(cur.net), label: 'صافي التحويل', sub: 'مجدول ' + cur.date }) + '</div>' +
      '<div class="grid g-2-1 mt-24" style="gap:24px"><div class="card card-p"><div class="card-h"><h3>كشوف الحساب</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الفترة</th><th>الإيراد</th><th>العمولة</th><th>الرسوم</th><th>الصافي</th><th>الحالة</th><th></th></tr></thead><tbody>' + P.map(function (p) { return '<tr><td class="b">' + p.period + '<div class="xs muted">' + p.id + '</div></td><td>' + sar(p.gross) + '</td><td class="red">- ' + sar(p.commission) + '</td><td class="red">- ' + sar(p.fees) + '</td><td class="bb">' + sar(p.net) + '</td><td>' + R.pill(p.status) + '<div class="xs muted">' + p.date + '</div></td><td><button class="btn btn-ghost btn-xs" data-act="dlStatement" data-id="' + p.id + '">' + ic('download', 'ic-sm', '⤓') + '</button></td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="stack"><div class="card card-p"><h3 class="h3 mb-12">توزيع الإيراد</h3>' + R.donut([{ l: 'صافي المالك', v: cur.net, c: '#0A1931' }, { l: 'عمولة رواف', v: cur.commission, c: '#C9A86A' }, { l: 'رسوم', v: cur.fees, c: '#d9d2c2' }], { center: Math.round(cur.net / cur.gross * 100) + '%', centerSub: 'صافي', unit: ' ر.س' }) + '</div>' +
      '<div class="hero-card"><div class="row small b gold">' + ic('landmark', 'ic-sm', '') + 'حساب التحويل</div><div class="bb lg mt-8 ltr">SA•• •••• •••• •••• 4471</div><div class="small" style="color:rgba(255,255,255,.7)">مصرف الراجحي • ' + (DB.opRole === 'owner' ? 'أحمد الغامدي' : 'رواف للضيافة') + '</div><button class="btn btn-glass btn-sm mt-16" data-act="toast" data-msg="تغيير الحساب البنكي يتطلب التحقق عبر نفاذ (محاكاة)">تغيير الحساب</button></div></div></div>' +
      '<div class="card card-p mt-24"><div class="card-h"><h3>الإيراد الشهري</h3><div class="legend"><span><i style="background:#0A1931"></i>الإيراد</span></div></div>' + R.bars(C.revenue12.map(function (v, i) { return { v: v, l: C.revenueLabels[i], t: v + 'k', gold: i === C.revenue12.length - 1 }; }), { showV: true }) + '</div>';
    return opShell('payouts', html);
  });
  A.dlStatement = function (el) {
    var p = R.DB.payouts.find(function (x) { return x.id === el.dataset.id; });
    var txt = '﻿كشف حساب رواف — ' + p.period + '\nالإيراد,' + p.gross + '\nالعمولة,' + p.commission + '\nالرسوم,' + p.fees + '\nالصافي,' + p.net + '\nالحالة,' + p.status + '\n';
    try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = 'statement-' + p.id + '.csv'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { }
    R.toast('تم تنزيل كشف ' + p.period, 'ok');
  };

  /* ================= CAMPAIGNS (owner-level promos) ================= */
  R.route('/operator/campaigns', function () {
    var DB = R.DB;
    var html = pageH('العروض والحملات', 'خصومات على وحداتك تظهر للضيوف كشارة خصم', '<button class="btn btn-primary" data-act="newPromo">' + ic('plus', 'ic-sm', '+') + 'عرض جديد</button>') +
      '<div class="grid g3">' + DB.opCampaigns.map(function (c, i) {
        return '<div class="card card-p"><div class="row between">' + R.pill(c.status) + '<span class="badge-disc">خصم ' + c.discount + '%</span></div><h3 class="h3 mt-12">' + esc(c.name) + '</h3><div class="small muted">' + c.from + ' ← ' + c.to + '</div><div class="xs muted mt-4">' + c.units.map(pname).map(function (n) { return esc(n.split(' - ')[0]); }).join('، ') + '</div>' +
          '<div class="grid g2 mt-16" style="gap:8px"><div class="soft"><div class="xs muted b">الحجوزات</div><div class="bb">' + c.bookings + '</div></div><div class="soft"><div class="xs muted b">الإيراد</div><div class="bb">' + sar(c.revenue) + '</div></div></div>' +
          '<div class="row mt-16">' + (c.status === 'نشطة' ? '<button class="btn btn-ghost btn-sm" data-act="promoToggle" data-i="' + i + '">إيقاف مؤقت</button>' : c.status === 'معلق' || c.status === 'مجدولة' ? '<button class="btn btn-primary btn-sm" data-act="promoToggle" data-i="' + i + '">تفعيل الآن</button>' : '') + '<button class="btn btn-danger btn-sm" data-act="promoDel" data-i="' + i + '">حذف</button></div></div>';
      }).join('') + '</div>';
    return opShell('campaigns', html);
  });
  A.newPromo = function () {
    R.modal({ title: 'عرض جديد', size: 'lg', body: '<div class="grid g2">' + R.field('اسم العرض', '<input id="np-n" class="input" placeholder="مثال: عرض الإجازة المطولة">') + R.field('نسبة الخصم %', '<input id="np-d" class="input" type="number" min="5" max="60" value="15">') + R.field('من', '<input id="np-f" type="date" class="input" value="' + R.today() + '">') + R.field('إلى', '<input id="np-t" type="date" class="input" value="' + R.addDays(R.today(), 14) + '">') + '</div><div class="field mt-16"><span class="lbl">الوحدات المشمولة</span><div class="grid g2" style="gap:8px">' + R.DB.properties.filter(function (p) { return p.status !== 'قيد النشر'; }).map(function (p) { return '<label class="check soft"><input type="checkbox" class="np-u" value="' + p.id + '"><span class="small">' + esc(p.title) + '</span></label>'; }).join('') + '</div></div>',
      foot: '<button class="btn btn-primary" data-act="newPromoOk">إنشاء العرض</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.newPromoOk = function () {
    var n = R.val('#np-n'), d = Number(R.val('#np-d')), u = R.$$('.np-u').filter(function (c) { return c.checked; }).map(function (c) { return Number(c.value); });
    if (!n) { R.toast('اسم العرض مطلوب', 'err'); return; } if (!(d >= 5 && d <= 60)) { R.toast('الخصم بين 5% و 60%', 'err'); return; } if (!u.length) { R.toast('اختر وحدة واحدة على الأقل', 'err'); return; }
    var f = R.val('#np-f');
    R.DB.opCampaigns.unshift({ id: 'OC-' + Math.floor(10 + Math.random() * 90), name: n, discount: d, from: f, to: R.val('#np-t'), units: u, status: f <= R.today() ? 'نشطة' : 'مجدولة', bookings: 0, revenue: 0 });
    R.save(); R.closeModal(); R.toast('تم إنشاء العرض ويظهر الآن للضيوف', 'ok'); R.rerender();
  };
  A.promoToggle = function (el) { var c = R.DB.opCampaigns[Number(el.dataset.i)]; c.status = c.status === 'نشطة' ? 'معلق' : 'نشطة'; R.save(); R.toast(c.status === 'نشطة' ? 'تم تفعيل العرض' : 'تم إيقاف العرض مؤقتاً', 'ok'); R.rerender(); };
  A.promoDel = function (el) { R.confirm({ title: 'حذف العرض؟', danger: true, ok: 'حذف', msg: 'لن يؤثر على الحجوزات القائمة.', onOk: function () { R.DB.opCampaigns.splice(Number(el.dataset.i), 1); R.save(); R.toast('تم حذف العرض'); R.rerender(); } }); };
})();
