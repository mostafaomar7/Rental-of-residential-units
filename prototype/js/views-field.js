/* رواف — التطبيقات الميدانية: المشرف والمصوّر (جوال أولاً) */
(function () {
  'use strict';
  var R = window.R, A = R.A, ic = R.ic, esc = R.esc, sar = R.sar, C = R.C;
  var SUP = 'فيصل الحربي', PHOTO = 'ريم الزهراني';
  function pname(id) { var p = R.prop(id); return p ? p.title : '—'; }

  /* ================= SUPERVISOR ================= */
  function supShell(o) {
    return R.mobileShell({
      badge: 'FIELD', appName: 'تطبيق المشرف الميداني', appDesc: 'مهام التجهيز قبل الوصول، الفحص بعد المغادرة، قوائم التحقق بالصور، والإبلاغ عن الأضرار والبلاغات — مرتبط مباشرة بلوحة المشغّل.',
      title: o.title, sub: o.sub, back: o.back, content: o.content, active: o.active, userInitial: 'ف', headerExtra: o.headerExtra,
      sideLinks: '<a class="btn btn-ghost btn-sm" href="#/operator/ops">عرض المهام في لوحة المشغّل ←</a>',
      tabs: [{ id: 'tasks', label: 'المهام', icon: 'clipboard-check', href: '#/supervisor' }, { id: 'map', label: 'الخريطة', icon: 'map', href: '#/supervisor/map' }, { id: 'reports', label: 'البلاغات', icon: 'siren', href: '#/supervisor/reports' }, { id: 'me', label: 'حسابي', icon: 'user', href: '#/supervisor/me' }]
    });
  }
  function myTasks() { return R.DB.tasks.filter(function (t) { return t.assignee === SUP; }); }
  function taskCard(t) {
    var p = R.prop(t.propertyId), tt = R.TT[t.type], done = t.checklist.filter(function (c) { return c.done; }).length;
    var stLabel = { todo: 'جديدة', doing: 'قيد التنفيذ', review: 'بانتظار الاعتماد', done: 'مكتملة' }[t.status];
    return '<a class="task-card mt-12" href="#/supervisor/task/' + t.id + '"><div class="row between"><span class="pill ' + tt[2] + '">' + ic(tt[1], '', '') + (t.type === 'readiness' ? 'تجهيز قبل الوصول' : t.type === 'inspection' ? 'فحص بعد المغادرة' : tt[0]) + '</span>' + (t.priority === 'عالية' && t.status !== 'done' ? '<span class="pill pill-red">عاجلة</span>' : R.pill(stLabel)) + '</div>' +
      '<div class="row gap-12 mt-12"><img src="' + p.image + '" alt="" style="width:56px;height:56px;border-radius:14px;object-fit:cover"><div class="grow"><div class="b small">' + esc(p.title) + '</div><div class="xs muted row gap-4">' + ic('clock', 'ic-sm', '') + '<span class="ltr">' + t.due.slice(11) + '</span> • ' + (t.due.slice(0, 10) === R.today() ? 'اليوم' : t.due.slice(0, 10)) + '</div></div></div>' +
      '<div class="row mt-12"><div class="bar thin grow"><div style="width:' + (t.checklist.length ? done / t.checklist.length * 100 : 0) + '%;background:var(--green-solid)"></div></div><span class="xs b">' + done + '/' + t.checklist.length + '</span></div></a>';
  }
  R.route('/supervisor', function () {
    var f = R.UI.supF || 'today', all = myTasks(), today = R.today();
    var list = all.filter(function (t) { var d = t.due.slice(0, 10); return f === 'today' ? t.status !== 'done' && d <= today : f === 'next' ? t.status !== 'done' && d > today : t.status === 'done' || t.status === 'review'; });
    var urgent = all.filter(function (t) { return t.priority === 'عالية' && t.status !== 'done'; }).length;
    var content = '<div class="grid g3" style="gap:8px;grid-template-columns:repeat(3,1fr)"><div class="tile center" style="padding:12px"><div class="h3">' + all.filter(function (t) { return t.status !== 'done' && t.due.slice(0, 10) <= today; }).length + '</div><div class="xs muted b">اليوم</div></div><div class="tile center" style="padding:12px"><div class="h3 red">' + urgent + '</div><div class="xs muted b">عاجلة</div></div><div class="tile center" style="padding:12px"><div class="h3 green">' + all.filter(function (t) { return t.status === 'done'; }).length + '</div><div class="xs muted b">مكتملة</div></div></div>' +
      '<div class="tabs mt-16" style="width:100%">' + [['today', 'اليوم'], ['next', 'القادمة'], ['done', 'المنجزة']].map(function (x) { return '<button class="tab grow ' + (f === x[0] ? 'on' : '') + '" style="justify-content:center" data-act="supF" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (list.length ? list.map(taskCard).join('') : '<div class="card mt-12">' + R.empty('check-check', 'لا توجد مهام هنا', 'أحسنت! كل شيء تحت السيطرة') + '</div>');
    return supShell({ title: 'مهامي', sub: R.dayName(today) + ' ' + today, active: 'tasks', content: content, headerExtra: '<div class="glass mt-16 row between small" style="padding:10px 14px"><span class="row gap-4"><span class="dot dot-green"></span>في الخدمة • منطقة الرياض وجدة</span><button class="link xs" style="color:var(--gold)" data-act="toast" data-msg="تم تحديث المهام">تحديث</button></div>' });
  });
  A.supF = function (el) { R.UI.supF = el.dataset.v; R.rerender(); };

  R.route('/supervisor/task/:id', function (pr) {
    var t = R.DB.tasks.find(function (x) { return x.id === pr.id; }); if (!t) return supShell({ title: 'مهمة', back: '#/supervisor', active: 'tasks', content: R.empty('clipboard-x', 'المهمة غير موجودة') });
    var p = R.prop(t.propertyId), tt = R.TT[t.type], done = t.checklist.filter(function (c) { return c.done; }).length, all = done === t.checklist.length;
    var b = t.bookingId && R.DB.opBookings.find(function (x) { return x.id === t.bookingId; });
    var content = '<div class="card" style="overflow:hidden"><img src="' + p.image + '" alt="" style="width:100%;height:140px;object-fit:cover"><div class="card-p-sm"><div class="row between"><span class="pill ' + tt[2] + '">' + tt[0] + '</span>' + R.pill(t.priority) + '</div><div class="bb mt-8">' + esc(p.title) + '</div><div class="xs muted">' + esc(p.city + '، ' + p.district) + '</div>' +
      '<div class="row mt-12"><a class="btn btn-primary btn-sm grow" href="https://maps.google.com/?q=' + encodeURIComponent(p.district + ' ' + p.city) + '" target="_blank" rel="noopener">' + ic('navigation', 'ic-sm', '') + 'التوجه للوحدة</a><button class="btn btn-ghost btn-sm" data-act="supDoor" data-id="' + p.id + '">' + ic('key-round', 'ic-sm', '') + 'فتح الباب</button></div></div></div>' +
      (b ? '<div class="notice blue mt-12 small">' + ic(t.type === 'inspection' ? 'log-out' : 'log-in', '', '') + '<div>' + (t.type === 'inspection' ? 'غادر' : 'يصل') + ' الضيف <b>' + esc(b.guestName) + '</b> ' + (t.type === 'inspection' ? b.checkOut + ' 12:00 م' : b.checkIn + ' 3:00 م') + ' • ' + b.guests + ' ضيوف</div></div>' : '') +
      '<div class="row between mt-16"><h3 class="bb">قائمة التحقق</h3><span class="xs b">' + done + '/' + t.checklist.length + '</span></div><div class="bar thin mt-8"><div style="width:' + (done / t.checklist.length * 100) + '%;background:var(--green-solid)"></div></div>' +
      '<div class="stack-sm mt-12">' + t.checklist.map(function (c, i) { return '<button class="check-item ' + (c.done ? 'done' : '') + '" data-act="supCheck" data-i="' + i + '" aria-pressed="' + c.done + '"><span class="cb">' + (c.done ? '✓' : '') + '</span><span class="t">' + esc(c.t) + '</span></button>'; }).join('') + '</div>' +
      '<h3 class="bb mt-16">الصور (' + t.photos.length + ')</h3><div class="photo-grid mt-8">' + t.photos.map(function (u) { return '<div class="ph"><img src="' + u + '" alt=""></div>'; }).join('') + '<label class="photo-add">' + ic('camera', 'ic-lg', '📷') + 'التقاط<input type="file" accept="image/*" capture="environment" multiple data-ch="supPhoto"></label><button class="photo-add" data-act="supPhotoMock">' + ic('image-plus', 'ic-lg', '+') + 'صورة تجريبية</button></div>' +
      '<div class="mt-16">' + R.field('ملاحظات', '<textarea id="sp-n" class="textarea" style="min-height:70px" placeholder="أي ملاحظات للمشغّل...">' + esc(t.notes) + '</textarea>') + '</div>' +
      '<div class="stack-sm mt-16">' + (t.status === 'done' ? '<div class="notice green small">' + ic('check-circle-2', '', '✓') + '<div>تم اعتماد هذه المهمة</div></div>' : t.status === 'review' ? '<div class="notice gold small">' + ic('hourglass', '', '') + '<div>أُرسلت للاعتماد — بانتظار المشغّل</div></div>' :
        '<button class="btn btn-' + (all ? 'success' : 'primary') + ' btn-lg btn-block" data-act="supReady"' + (all ? '' : ' aria-disabled="true"') + '>' + ic('badge-check', 'ic-sm', '') + (t.type === 'readiness' || t.type === 'cleaning' ? 'إعلان جاهزية الوحدة' : t.type === 'inspection' ? 'إنهاء الفحص' : 'إنهاء المهمة') + '</button>') +
      '<button class="btn btn-danger btn-block" data-act="supReport" data-id="' + p.id + '">' + ic('triangle-alert', 'ic-sm', '') + 'الإبلاغ عن ضرر أو مشكلة</button></div>';
    R.UI.supTask = t.id;
    return supShell({ title: esc(t.title), sub: t.id, back: '#/supervisor', active: 'tasks', content: content });
  });
  function curTask() { return R.DB.tasks.find(function (x) { return x.id === R.UI.supTask; }); }
  function keepNotes() { var t = curTask(), n = R.$('#sp-n'); if (t && n) t.notes = n.value; }
  A.supCheck = function (el) { keepNotes(); var t = curTask(), c = t.checklist[Number(el.dataset.i)]; c.done = !c.done; if (t.status === 'todo') t.status = 'doing'; R.save(); R.rerender(); };
  A.supPhoto = function (el) { keepNotes(); var t = curTask(); Array.prototype.forEach.call(el.files || [], function (f) { try { t.photos.push(URL.createObjectURL(f)); } catch (e) { } }); R.save(); R.toast('تم إرفاق الصور', 'ok'); R.rerender(); };
  A.supPhotoMock = function () { keepNotes(); var t = curTask(), pool = [C.P.C, C.P.D, C.P.M, C.P.Q, C.P.Pk, C.P.O]; t.photos.push(C.img(pool[t.photos.length % pool.length], 300)); if (t.status === 'todo') t.status = 'doing'; R.save(); R.toast('تمت إضافة صورة', 'ok'); R.rerender(); };
  A.supDoor = function (el) { var p = R.prop(el.dataset.id); if (!p.lock) { R.toast('وحدة بمفتاح تقليدي — المفتاح في صندوق المفاتيح', 'info'); return; } if (p.lock.status !== 'online') { R.toast('القفل غير متصل — استخدم رمز المشرف الاحتياطي', 'err'); return; } R.toast('جارٍ الفتح…'); setTimeout(function () { R.DB.accessEvents.unshift({ id: R.uid('a'), propertyId: p.id, time: R.nowTS(), who: SUP + ' (مشرف)', method: 'رمز المشرف', result: 'ناجح' }); R.save(); R.toast('تم فتح القفل', 'ok'); }, 1000); };
  A.supReady = function (el) {
    if (el.getAttribute('aria-disabled') === 'true') { R.toast('أكمل كل بنود قائمة التحقق أولاً', 'err'); return; }
    keepNotes(); var t = curTask(), p = R.prop(t.propertyId);
    if (!t.photos.length) { R.toast('أضف صورة واحدة على الأقل لتوثيق الحالة', 'err'); return; }
    t.status = 'review'; if (t.type === 'readiness' || t.type === 'cleaning') p.status = 'متاحة';
    R.audit(SUP, 'مشرف', t.type === 'inspection' ? 'إنهاء فحص بعد المغادرة' : 'إعلان جاهزية وحدة', 'الوحدة ' + p.id); R.save();
    R.toast(t.type === 'inspection' ? 'تم إنهاء الفحص وإرساله للمشغّل' : 'تم إعلان جاهزية الوحدة — أُبلغ المشغّل', 'ok'); R.go('#/supervisor');
  };
  A.supReport = function (el) {
    R.UI.sr = { kind: 'damage', sev: 'متوسطة', photos: [] };
    R.modal({ title: 'بلاغ جديد', sub: esc(pname(el.dataset.id)), body: supRepBody(), foot: '<button class="btn btn-primary" data-act="supRepOk" data-id="' + el.dataset.id + '">إرسال</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  function supRepBody() {
    var S = R.UI.sr;
    return '<div class="tabs" style="width:100%">' + [['damage', 'ضرر (تحميل على الضيف)'], ['incident', 'مشكلة تشغيلية']].map(function (x) { return '<button class="tab grow ' + (S.kind === x[0] ? 'on' : '') + '" style="justify-content:center" data-act="srKind" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="field mt-16"><span class="lbl">الخطورة</span><div class="chips">' + ['منخفضة', 'متوسطة', 'عالية'].map(function (s) { return '<button class="chip chip-sm ' + (S.sev === s ? 'on' : '') + '" data-act="srSev" data-v="' + s + '">' + s + '</button>'; }).join('') + '</div></div>' +
      '<div class="stack mt-16">' + R.field('العنوان', '<input id="sr-t" class="input" value="' + esc(S.t || '') + '" placeholder="مثال: خدش في طاولة الطعام">') + R.field('الوصف', '<textarea id="sr-d" class="textarea" style="min-height:70px">' + esc(S.d || '') + '</textarea>') + (S.kind === 'damage' ? R.field('التكلفة التقديرية (ر.س)', '<input id="sr-e" class="input" type="number" value="' + (S.e || '') + '">') : '') + '</div>' +
      '<div class="field mt-16"><span class="lbl">صور الإثبات</span><div class="thumbs-row">' + S.photos.map(function (u) { return '<img src="' + u + '" alt="">'; }).join('') + '<button class="thumb-ph" data-act="srPhoto" aria-label="إضافة صورة">' + ic('camera', '', '+') + '</button></div></div>';
  }
  function srKeep() { var S = R.UI.sr; S.t = R.val('#sr-t'); S.d = R.val('#sr-d'); S.e = R.val('#sr-e'); }
  A.srKind = function (el) { srKeep(); R.UI.sr.kind = el.dataset.v; R.modalSet(supRepBody()); };
  A.srSev = function (el) { srKeep(); R.UI.sr.sev = el.dataset.v; R.modalSet(supRepBody()); };
  A.srPhoto = function () { srKeep(); var pool = [C.P.C, C.P.D, C.P.K]; R.UI.sr.photos.push(C.img(pool[R.UI.sr.photos.length % 3], 400)); R.modalSet(supRepBody()); };
  A.supRepOk = function (el) {
    srKeep(); var S = R.UI.sr, pid = Number(el.dataset.id); if (!S.t) { R.toast('العنوان مطلوب', 'err'); return; }
    if (S.kind === 'damage') {
      if (!S.photos.length) { R.toast('أضف صورة إثبات واحدة على الأقل', 'err'); return; }
      var t = curTask(), b = t && t.bookingId && R.DB.opBookings.find(function (x) { return x.id === t.bookingId; });
      R.DB.damages.unshift({ id: 'DM-' + Math.floor(13 + Math.random() * 80), propertyId: pid, bookingId: b ? b.id : '—', guest: b ? b.guestName : 'آخر ضيف', title: S.t, desc: S.d, photos: S.photos, estimate: Number(S.e) || 0, fine: Number(S.e) || 0, status: 'بانتظار المراجعة', reportedBy: SUP, date: R.today(), guestResponse: '' });
    } else R.DB.incidents.unshift({ id: 'IN-' + Math.floor(100 + Math.random() * 800), propertyId: pid, title: S.t, category: 'صيانة', severity: S.sev, status: 'مفتوح', reportedBy: SUP + ' (مشرف)', time: R.nowTS() });
    R.save(); R.closeModal(); R.toast(S.kind === 'damage' ? 'تم رفع قضية الضرر للمشغّل للمراجعة' : 'تم إرسال البلاغ', 'ok');
  };
  R.route('/supervisor/map', function () {
    var ts = myTasks().filter(function (t) { return t.status !== 'done'; });
    var content = '<div class="map-ph" style="height:300px">' + ts.map(function (t, i) { return '<a href="#/supervisor/task/' + t.id + '" class="map-pin" style="top:' + (30 + (i * 23) % 60) + '%;left:' + (20 + (i * 37) % 65) + '%;width:34px;height:34px" aria-label="' + esc(pname(t.propertyId)) + '"><span style="rotate:45deg;color:var(--gold);font-weight:900;font-size:13px">' + (i + 1) + '</span></a>'; }).join('') + '</div>' +
      '<div class="notice gold mt-12 xs">' + ic('route', 'ic-sm', '') + '<div>المسار المقترح: ' + ts.length + ' مواقع • 42 دقيقة قيادة</div></div>' + ts.map(function (t, i) { return '<a class="li mt-8" style="background:#fff" href="#/supervisor/task/' + t.id + '"><span class="li-ic navy">' + (i + 1) + '</span><div class="grow"><div class="b small">' + esc(pname(t.propertyId)) + '</div><div class="xs muted">' + esc(t.title) + ' • ' + t.due.slice(11) + '</div></div>' + ic('chevron-left', 'ic-sm', '‹') + '</a>'; }).join('');
    return supShell({ title: 'خريطة المهام', sub: 'مسار اليوم', active: 'map', content: content });
  });
  R.route('/supervisor/reports', function () {
    var mine = R.DB.damages.filter(function (d) { return d.reportedBy === SUP; }), inc = R.DB.incidents.filter(function (i) { return i.reportedBy.indexOf(SUP) === 0; });
    var content = '<h3 class="bb">قضايا الأضرار</h3>' + (mine.length ? mine.map(function (d) { return '<div class="task-card mt-8"><div class="row between"><span class="b small">' + esc(d.title) + '</span>' + R.pill(d.status) + '</div><div class="xs muted mt-4">' + esc(pname(d.propertyId)) + ' • ' + d.date + ' • ' + sar(d.estimate) + '</div></div>'; }).join('') : R.empty('shield-check', 'لا توجد قضايا')) +
      '<h3 class="bb mt-16">البلاغات التشغيلية</h3>' + (inc.length ? inc.map(function (i) { return '<div class="task-card mt-8"><div class="row between"><span class="b small">' + esc(i.title) + '</span>' + R.pill(i.status) + '</div><div class="xs muted mt-4">' + esc(pname(i.propertyId)) + ' • ' + R.pill(i.severity) + '</div></div>'; }).join('') : '<div class="card mt-8">' + R.empty('siren', 'لا توجد بلاغات') + '</div>');
    return supShell({ title: 'بلاغاتي', sub: 'الأضرار والمشاكل المرفوعة', active: 'reports', content: content });
  });
  R.route('/supervisor/me', function () {
    var content = '<div class="card card-p center"><div class="avatar" style="margin:0 auto;width:64px;height:64px;font-size:24px">ف</div><div class="bb mt-8">' + SUP + '</div><div class="xs muted">مشرف ميداني • الرياض وجدة</div><div class="row mt-12" style="justify-content:center"><span class="pill pill-gold">★ 4.9 تقييم الأداء</span></div></div>' +
      '<div class="card card-p mt-12"><div class="setting-row"><div><div class="b small">متاح لاستلام المهام</div><div class="xs muted">إيقافه يحول المهام لمشرف آخر</div></div>' + R.toggle('data-ch="supAvail"', R.UI.supAvail !== false, 'متاح') + '</div><div class="setting-row"><div class="b small">مهام هذا الشهر</div><span class="bb">86</span></div><div class="setting-row"><div class="b small">متوسط وقت التجهيز</div><span class="bb">48 دقيقة</span></div><div class="setting-row"><div class="b small">رمز المشرف الاحتياطي</div><span class="kbd">•••• 11</span></div></div>' +
      '<a class="btn btn-ghost btn-block mt-12" href="#/">' + ic('log-out', 'ic-sm', '') + 'خروج</a>';
    return supShell({ title: 'حسابي', sub: 'المشرف الميداني', active: 'me', content: content });
  });
  A.supAvail = function (el) { R.UI.supAvail = el.checked; R.toast(el.checked ? 'أنت متاح لاستلام المهام' : 'تم إيقاف استلام المهام', 'ok'); };

  /* ================= PHOTOGRAPHER ================= */
  function phShell(o) {
    return R.mobileShell({
      badge: 'PHOTO', appName: 'تطبيق المصوّر', appDesc: 'جلسات التصوير المسندة، قائمة اللقطات المطلوبة، رفع الصور وإرسالها لفحص الجودة (QA) لدى إدارة المنصة، ومتابعة الملاحظات.',
      title: o.title, sub: o.sub, back: o.back, content: o.content, active: o.active, userInitial: 'ر',
      sideLinks: '<a class="btn btn-ghost btn-sm" href="#/admin/photos">عرض طابور فحص الصور (الإدارة) ←</a>',
      tabs: [{ id: 'shoots', label: 'الجلسات', icon: 'camera', href: '#/photographer' }, { id: 'earn', label: 'الأرباح', icon: 'wallet', href: '#/photographer/earnings' }, { id: 'me', label: 'حسابي', icon: 'user', href: '#/photographer/me' }]
    });
  }
  R.route('/photographer', function () {
    var S = R.DB.shoots, today = R.today();
    var grp = [['اليوم', S.filter(function (s) { return s.date === today && (s.status === 'مجدولة' || s.status === 'قيد الرفع'); })], ['تحتاج إعادة', S.filter(function (s) { return s.status === 'تحتاج إعادة'; })], ['القادمة', S.filter(function (s) { return s.date > today && s.status === 'مجدولة'; })], ['بانتظار QA', S.filter(function (s) { return s.status === 'بانتظار QA'; })], ['مكتملة', S.filter(function (s) { return s.status === 'مقبولة'; })]];
    var content = grp.map(function (g) {
      if (!g[1].length) return '';
      return '<h3 class="bb mt-16 row between"><span>' + g[0] + '</span><span class="pill pill-gray">' + g[1].length + '</span></h3>' + g[1].map(function (s) {
        var p = R.prop(s.propertyId); return '<a class="task-card mt-8" href="#/photographer/shoot/' + s.id + '"><div class="row gap-12"><img src="' + (p ? p.image : C.img(C.P.H, 200)) + '" alt="" style="width:56px;height:56px;border-radius:14px;object-fit:cover"><div class="grow"><div class="b small">' + esc(s.title) + '</div><div class="xs muted">' + s.date + ' • ' + s.time + '</div></div>' + R.pill(s.status) + '</div>' + (s.feedback ? '<div class="xs mt-8 ' + (s.status === 'تحتاج إعادة' ? 'red' : 'green') + ' b">' + esc(s.feedback) + '</div>' : '') + '</a>';
      }).join('');
    }).join('');
    return phShell({ title: 'جلسات التصوير', sub: 'مرحباً ' + PHOTO, active: 'shoots', content: content || R.empty('camera', 'لا توجد جلسات') });
  });
  R.route('/photographer/shoot/:id', function (pr) {
    var s = R.DB.shoots.find(function (x) { return x.id === pr.id; }); if (!s) return phShell({ title: 'جلسة', back: '#/photographer', active: 'shoots', content: R.empty('camera-off', 'الجلسة غير موجودة') });
    R.UI.shoot = s.id; var done = s.shotList.filter(function (x) { return x.done; }).length, locked = s.status === 'بانتظار QA' || s.status === 'مقبولة';
    var rej = s.photos.filter(function (p) { return p.qa === 'rejected'; }).length;
    var content = '<div class="card card-p-sm"><div class="row between"><span class="bb">' + esc(s.title) + '</span>' + R.pill(s.status) + '</div>' +
      '<div class="xs muted mt-8 row-top" style="gap:6px">' + ic('map-pin', 'ic-sm', '') + esc(s.address) + '</div><div class="xs muted mt-4 row gap-4">' + ic('calendar', 'ic-sm', '') + s.date + ' • ' + s.time + '</div><div class="xs muted mt-4 row gap-4">' + ic('phone', 'ic-sm', '') + esc(s.contact) + '</div>' +
      '<div class="row mt-12"><a class="btn btn-primary btn-sm grow" target="_blank" rel="noopener" href="https://maps.google.com/?q=' + encodeURIComponent(s.address) + '">' + ic('navigation', 'ic-sm', '') + 'التوجه</a><button class="btn btn-ghost btn-sm" data-act="toast" data-msg="تم إرسال رسالة للمالك: المصوّر في الطريق" data-kind="ok">' + ic('message-circle', 'ic-sm', '') + 'إشعار المالك</button></div></div>' +
      (s.feedback ? '<div class="notice ' + (s.status === 'تحتاج إعادة' ? 'red' : 'green') + ' mt-12 small">' + ic(s.status === 'تحتاج إعادة' ? 'rotate-ccw' : 'badge-check', '', '') + '<div><b>ملاحظات QA:</b> ' + esc(s.feedback) + '</div></div>' : '') +
      '<div class="row between mt-16"><h3 class="bb">قائمة اللقطات</h3><span class="xs b">' + done + '/' + s.shotList.length + '</span></div><div class="stack-sm mt-8">' + s.shotList.map(function (x, i) { return '<button class="check-item ' + (x.done ? 'done' : '') + '" data-act="phShot" data-i="' + i + '"' + (locked ? ' disabled' : '') + '><span class="cb">' + (x.done ? '✓' : '') + '</span><span class="t">' + esc(x.t) + '</span></button>'; }).join('') + '</div>' +
      '<div class="row between mt-16"><h3 class="bb">الصور (' + s.photos.length + ')</h3>' + (rej ? '<span class="pill pill-red">' + rej + ' مرفوضة</span>' : '') + '</div><div class="photo-grid mt-8">' + s.photos.map(function (p, i) {
        var q = p.qa === 'approved' ? '<span class="pill pill-green-solid">مقبولة</span>' : p.qa === 'rejected' ? '<span class="pill" style="background:var(--red-solid);color:#fff">تحتاج إعادة</span>' : p.qa === 'pending' ? '<span class="pill pill-amber">QA</span>' : '';
        return '<div class="ph"><img src="' + p.url + '" alt="">' + q + (!locked ? '<button class="btn btn-danger btn-icon btn-xs" style="position:absolute;top:4px;left:4px;width:26px;height:26px" data-act="phDel" data-i="' + i + '" aria-label="حذف">' + ic('x', 'ic-sm', '×') + '</button>' : '') + '</div>';
      }).join('') + (locked ? '' : '<label class="photo-add">' + ic('upload', 'ic-lg', '⤒') + 'رفع<input type="file" accept="image/*" multiple data-ch="phUpload"></label><button class="photo-add" data-act="phMock">' + ic('image-plus', 'ic-lg', '+') + 'صورة تجريبية</button>') + '</div>' +
      (s.photos.filter(function (p) { return p.qa === 'rejected' && p.note; }).map(function (p) { return '<div class="xs red b mt-8">• ' + esc(p.note) + '</div>'; }).join('')) +
      (locked ? '<div class="notice ' + (s.status === 'مقبولة' ? 'green' : 'gold') + ' mt-16 small">' + ic(s.status === 'مقبولة' ? 'badge-check' : 'hourglass', '', '') + '<div>' + (s.status === 'مقبولة' ? 'تم قبول الصور ونشرها على صفحة الوحدة' : 'أُرسلت الصور لفحص الجودة — عادةً خلال 4 ساعات') + '</div></div>' : '<button class="btn btn-gold btn-lg btn-block mt-16" data-act="phSubmit">' + ic('send', 'ic-sm', '') + 'إرسال للفحص (QA)</button>');
    return phShell({ title: esc(s.title.split(' - ')[0]), sub: s.id, back: '#/photographer', active: 'shoots', content: content });
  });
  function curShoot() { return R.DB.shoots.find(function (x) { return x.id === R.UI.shoot; }); }
  A.phShot = function (el) { var s = curShoot(), x = s.shotList[Number(el.dataset.i)]; x.done = !x.done; if (s.status === 'مجدولة') s.status = 'قيد الرفع'; R.save(); R.rerender(); };
  A.phUpload = function (el) { var s = curShoot(); Array.prototype.forEach.call(el.files || [], function (f) { try { s.photos.push({ id: R.uid('ph'), url: URL.createObjectURL(f), qa: 'new' }); } catch (e) { } }); if (s.status === 'مجدولة') s.status = 'قيد الرفع'; R.save(); R.toast('تم رفع ' + el.files.length + ' صورة', 'ok'); R.rerender(); };
  A.phMock = function () { var s = curShoot(), pool = [C.P.I, C.P.G, C.P.M, C.P.Q, C.P.Pk, C.P.O, C.P.H]; s.photos.push({ id: R.uid('ph'), url: C.img(pool[s.photos.length % pool.length], 500), qa: 'new' }); if (s.status === 'مجدولة') s.status = 'قيد الرفع'; R.save(); R.rerender(); };
  A.phDel = function (el) { var s = curShoot(); s.photos.splice(Number(el.dataset.i), 1); R.save(); R.rerender(); };
  A.phSubmit = function () {
    var s = curShoot(), fresh = s.photos.filter(function (p) { return p.qa === 'new'; });
    if (!fresh.length) { R.toast(s.photos.some(function (p) { return p.qa === 'rejected'; }) ? 'احذف الصور المرفوضة وارفع بديلاً عنها أولاً' : 'ارفع صورة واحدة على الأقل', 'err'); return; }
    if (s.shotList.some(function (x) { return !x.done; })) { R.toast('أكمل قائمة اللقطات المطلوبة أولاً', 'err'); return; }
    s.photos = s.photos.filter(function (p) { return p.qa !== 'rejected'; });
    fresh.forEach(function (p) { p.qa = 'pending'; R.DB.photoQA.unshift({ id: 'PQ-' + R.uid(), shootId: s.id, property: s.title, photographer: PHOTO, url: p.url, status: 'pending', photoId: p.id }); });
    s.status = 'بانتظار QA'; s.feedback = ''; R.audit(PHOTO, 'مصوّر', 'رفع ' + fresh.length + ' صورة للفحص', s.id); R.save();
    R.toast('تم إرسال ' + fresh.length + ' صورة لفحص الجودة', 'ok'); R.rerender();
  };
  R.route('/photographer/earnings', function () {
    var content = '<div class="hero-card"><div class="xs gold b">أرباح سبتمبر</div><div class="h1 mt-4">4,850 ر.س</div><div class="xs" style="color:rgba(255,255,255,.7)">17 جلسة • تحويل في 1 أكتوبر</div></div>' +
      '<div class="card card-p mt-12">' + R.kv('جلسة وحدة (حتى 3 غرف)', '250 ر.س') + R.kv('جلسة فيلا / شاليه', '400 ر.س') + R.kv('مكافأة قبول من أول مرة', '+50 ر.س') + R.kv('نسبة القبول', '92%') + '</div>' +
      '<div class="card card-p mt-12"><h3 class="bb mb-8">آخر الجلسات</h3>' + R.DB.shoots.filter(function (s) { return s.status === 'مقبولة'; }).map(function (s) { return R.kv(esc(s.title.split(' - ')[0]), '<span class="green">+250 ر.س</span>'); }).join('') + R.kv('فيلا الريف - الطائف', '<span class="muted">قيد المراجعة</span>') + '</div>';
    return phShell({ title: 'الأرباح', sub: PHOTO, active: 'earn', content: content });
  });
  R.route('/photographer/me', function () {
    var content = '<div class="card card-p center"><div class="avatar" style="margin:0 auto;width:64px;height:64px;font-size:24px">ر</div><div class="bb mt-8">' + PHOTO + '</div><div class="xs muted">مصوّرة معتمدة • المنطقة الشرقية والجنوبية</div></div><div class="card card-p mt-12"><div class="setting-row"><div class="b small">متاحة لجلسات جديدة</div>' + R.toggle('data-ch="phAvail"', true, 'متاحة') + '</div><div class="setting-row"><div class="b small">المعدات</div><span class="small">Sony A7 IV • عدسة 16-35mm</span></div><div class="setting-row"><div class="b small">دليل معايير التصوير</div><button class="link small" data-act="phGuide">عرض</button></div></div><a class="btn btn-ghost btn-block mt-12" href="#/">' + ic('log-out', 'ic-sm', '') + 'خروج</a>';
    return phShell({ title: 'حسابي', sub: 'المصوّر', active: 'me', content: content });
  });
  A.phAvail = function (el) { R.toast(el.checked ? 'متاحة للجلسات' : 'تم إيقاف استلام الجلسات', 'ok'); };
  A.phGuide = function () { R.modal({ title: 'معايير تصوير رواف', size: 'sm', body: '<div class="stack-sm small">' + ['دقة 1920px كحد أدنى، أفقي 3:2', 'إضاءة نهارية طبيعية + كل الأنوار مضاءة', 'خطوط رأسية مستقيمة (بدون ميلان)', 'إخفاء الأغراض الشخصية والأسلاك', 'لقطة واضحة للقفل الذكي ولوحة الدخول', 'لا فلاتر مبالغ فيها — الصور يجب أن تطابق الواقع'].map(function (t) { return '<div class="row-top" style="gap:8px"><span class="gold">✓</span>' + t + '</div>'; }).join('') + '</div>' }); };
})();
