/* رواف — موقع الضيوف (2): معالج الحجز، حساب العميل، إقامتي الحالية، التقييم، الفاتورة */
(function () {
  'use strict';
  var R = window.R, A = R.A, ic = R.ic, esc = R.esc, sar = R.sar, fmt = R.fmt;

  function requireUser(after) {
    if (R.DB.user) return false;
    setTimeout(function () { R.openLogin(after); }, 30);
    return true;
  }
  function loginWall(title) {
    return R.guestShell('<div class="container"><div class="card mt-24">' + R.empty('lock', title || 'سجّل الدخول للمتابعة', 'هذه الصفحة متاحة بعد تسجيل الدخول برقم جوالك', '<button class="btn btn-primary mt-16" data-act="openLoginHere">تسجيل الدخول</button>') + '</div></div>');
  }
  A.openLoginHere = function () { R.openLogin(location.hash); };
  function findBooking(id) { return R.DB.bookings.find(function (b) { return b.id === id; }) || R.DB.opBookings.find(function (b) { return b.id === id; }); }
  R.findBooking = findBooking;

  /* ================= BOOKING WIZARD ================= */
  var STEPS = ['التواريخ والضيوف', 'بيانات الضيف والتحقق', 'السياسات', 'الدفع', 'التأكيد'];
  R.route('/book/:id', function (pr, q) {
    var p = R.prop(pr.id); if (!p) return null;
    if (!R.DB.user) { requireUser(location.hash); return loginWall('سجّل الدخول لإتمام الحجز'); }
    var u = R.DB.user, bk = R.UI.bk;
    if (!bk || bk.pid !== p.id) {
      bk = R.UI.bk = { pid: p.id, step: 1, ci: q['in'] || R.addDays(R.today(), 3), co: q.out || R.addDays(R.today(), 5), guests: Number(q.guests || 2), name: u.name, phone: u.phone, email: u.email, idType: 'هوية وطنية', idNo: '10•••••321', nafath: false, ack: false, ack2: false, pay: 'wallet', done: null, revealed: false };
    }
    var qt = R.quote(p, bk.ci, bk.co), step = bk.step;
    var stepsHTML = '<div class="steps" aria-label="خطوات الحجز">' + STEPS.map(function (s, i) { var n = i + 1; return '<div class="step ' + (n < step ? 'done' : n === step ? 'on' : '') + '" aria-current="' + (n === step ? 'step' : 'false') + '"><div class="sb"></div><div class="sl">' + n + '. ' + s + '</div></div>'; }).join('') + '</div>';
    var body = [null, s1, s2, s3, s4, s5][step](p, bk, qt);
    var summary = '<div class="card card-p sticky-book"><div class="row gap-12"><img src="' + p.image + '" alt="" style="width:84px;height:72px;border-radius:14px;object-fit:cover"><div class="grow"><div class="bb small">' + esc(p.title) + '</div><div class="xs muted">' + esc(p.city + ' • ' + p.district) + '</div><div class="xs mt-4"><span class="star">★</span> ' + p.rating + ' • ' + (p.smartLock ? 'دخول ذكي' : 'استلام من المشرف') + '</div></div></div><hr class="divider">' +
      R.kv('الوصول', R.dayName(bk.ci) + ' ' + bk.ci + ' • 3:00 م') + R.kv('المغادرة', R.dayName(bk.co) + ' ' + bk.co + ' • 12:00 م') + R.kv('الضيوف', bk.guests + ' ضيوف') + '<hr class="divider">' +
      R.kv(R.nt(qt.nights) + ' × ' + sar(p.price), sar(qt.sub)) + R.kv('رسوم التنظيف', sar(qt.cleaning)) + R.kv('ضريبة القيمة المضافة 15%', sar(qt.vat)) + R.kv('الإجمالي', sar(qt.total), 'total') +
      '<div class="notice gold mt-12 xs">' + ic('gift', 'ic-sm', '🎁') + '<div>كاش باك <b>' + sar(qt.cashback) + '</b> يعود لمحفظتك + <b>' + qt.points + '</b> نقطة ولاء</div></div></div>';
    var html = '<div class="container" style="padding-top:24px;padding-bottom:24px;max-width:1180px"><div class="row between wrap mb-16"><div><a class="link small" href="#/property/' + p.id + '">' + ic('arrow-right', 'ic-sm', '→') + ' العودة للوحدة</a><h1 class="h2 mt-4">حجز ' + esc(p.title) + '</h1><div class="small muted">خطوة ' + step + ' من 5 • دفع بالمحفظة متاح</div></div></div>' + stepsHTML +
      '<div class="grid g-2-1 mt-24" style="gap:24px;align-items:start"><div class="card card-p">' + body + '</div>' + summary + '</div></div>';
    return R.guestShell(html);
  });
  function nav(back, nextLabel, nextAct, disabled) {
    return '<div class="row between mt-24 wrap">' + (back ? '<button class="btn btn-ghost" data-act="bkBack">' + ic('arrow-right', 'ic-sm', '→') + 'رجوع</button>' : '<span></span>') + '<button class="btn btn-primary btn-lg" data-act="' + (nextAct || 'bkNext') + '"' + (disabled ? ' aria-disabled="true"' : '') + '>' + nextLabel + ' ' + ic('arrow-left', 'ic-sm', '←') + '</button></div>';
  }
  function s1(p, bk, qt) {
    var avail = R.isAvailable(p, bk.ci, bk.co);
    return '<h2 class="h3">اختر التواريخ وعدد الضيوف</h2><div class="grid g3 mt-16">' +
      R.field('الوصول (3:00 م)', '<input type="date" id="bk-in" class="input" value="' + bk.ci + '" min="' + R.today() + '" data-ch="bkDates">') +
      R.field('المغادرة (12:00 م)', '<input type="date" id="bk-out" class="input" value="' + bk.co + '" min="' + R.addDays(R.today(), 1) + '" data-ch="bkDates">') +
      R.field('عدد الضيوف', '<select id="bk-g" class="select" data-ch="bkDates">' + Array.from({ length: p.guests }, function (_, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === bk.guests ? ' selected' : '') + '>' + (i + 1) + ' ضيوف</option>'; }).join('') + '</select>', 'الحد الأقصى ' + p.guests) + '</div>' +
      (avail ? '<div class="notice green mt-16">' + ic('calendar-check', '', '✓') + '<div><b>متاحة</b> — ' + R.nt(qt.nights) + ' من ' + R.dLabel(bk.ci) + ' إلى ' + R.dLabel(bk.co) + '</div></div>' : '<div class="notice red mt-16">' + ic('calendar-x', '', '×') + '<div><b>غير متاحة</b> في هذه التواريخ، اختر تواريخ أخرى.</div></div>') +
      '<h3 class="bb mt-24">تفصيل السعر</h3><div class="soft-lg mt-8">' + R.kv('سعر الليلة × ' + R.nt(qt.nights) + '', sar(p.price) + ' × ' + qt.nights + ' = ' + sar(qt.sub)) + R.kv('رسوم التنظيف (مرة واحدة)', sar(qt.cleaning)) + R.kv('ضريبة القيمة المضافة 15%', sar(qt.vat)) + R.kv('الإجمالي شامل الضريبة', sar(qt.total), 'total') + '<div class="kv"><span class="gold-dark b">كاش باك 5% يعود لمحفظتك</span><span class="gold-dark bb">+' + sar(qt.cashback) + '</span></div></div>' +
      nav(false, 'متابعة', 'bkNext', !avail);
  }
  function s2(p, bk) {
    return '<h2 class="h3">بيانات الضيف الرئيسي</h2><div class="grid g2 mt-16">' +
      R.field('الاسم الكامل', '<input id="bk-name" class="input" value="' + esc(bk.name) + '" autocomplete="name">') +
      R.field('رقم الجوال', '<input id="bk-phone" class="input" value="' + esc(bk.phone) + '" inputmode="numeric">') +
      R.field('البريد الإلكتروني', '<input id="bk-email" class="input" value="' + esc(bk.email) + '" type="email">') +
      R.field('نوع الهوية', '<select id="bk-idt" class="select"><option' + (bk.idType === 'هوية وطنية' ? ' selected' : '') + '>هوية وطنية</option><option' + (bk.idType === 'إقامة' ? ' selected' : '') + '>إقامة</option><option>جواز سفر (خليجي/زائر)</option></select>') + '</div>' +
      '<h3 class="bb mt-24">التحقق من الهوية</h3><p class="small muted mt-4 lh">التحقق عبر نفاذ مطلوب قبل إصدار المفتاح الرقمي، ويُستخدم لإبلاغ منصة شموس وفق الأنظمة.</p>' +
      (bk.nafath ? '<div class="notice green mt-12">' + ic('badge-check', '', '✓') + '<div><b>تم التحقق عبر نفاذ</b><br><span class="xs">' + esc(bk.name) + ' • ' + bk.idType + ' ' + bk.idNo + ' • ' + R.nowTS() + '</span></div></div>' :
        '<div class="soft-lg mt-12 row between wrap"><div class="row"><span class="pm-logo" style="background:#0F8A5F;color:#fff;width:52px;height:40px">نفاذ</span><div><div class="b">النفاذ الوطني الموحد</div><div class="xs muted">سيُطلب منك اختيار رقم في تطبيق نفاذ</div></div></div><button class="btn btn-primary" data-act="nafathStart">' + ic('fingerprint', 'ic-sm', '') + 'التحقق عبر نفاذ</button></div>') +
      nav(true, 'متابعة', 'bkNext', !bk.nafath);
  }
  function s3(p, bk) {
    var li = function (t) { return '<div class="row-top small mt-4" style="gap:8px"><span class="gold">•</span><span class="lh">' + t + '</span></div>'; };
    return '<h2 class="h3">مراجعة السياسات والموافقة</h2><p class="small muted mt-4">يرجى قراءة سياسات الوحدة قبل الدفع — الموافقة مطلوبة لإتمام الحجز.</p>' +
      '<div class="grid g2 mt-16"><div class="soft-lg"><div class="bb row">' + ic('scroll-text', 'gold-dark', '') + 'قواعد الوحدة</div>' + li('يمنع التدخين والحفلات') + li('ساعات الهدوء 11 م – 7 ص') + li('الحد الأقصى ' + p.guests + ' ضيوف') + li('الدخول 3:00 م • المغادرة 12:00 م') + '</div>' +
      '<div class="soft-lg"><div class="bb row">' + ic('shield-alert', 'gold-dark', '') + 'سياسة الأضرار</div>' + li('فحص موثق بالصور بعد كل مغادرة') + li('إشعار بالضرر خلال 48 ساعة مع الأدلة') + li('حق الاعتراض خلال 72 ساعة') + li('خصم الضرر المعتمد من وسيلة الدفع') + '</div>' +
      '<div class="soft-lg"><div class="bb row">' + ic('calendar-x', 'gold-dark', '') + 'الإلغاء (مرنة)</div>' + li('استرداد كامل حتى 48 ساعة قبل الوصول') + li('50% خلال 48 ساعة من الوصول') + li('لا استرداد بعد وقت الدخول') + '</div>' +
      '<div class="soft-lg"><div class="bb row">' + ic('key-round', 'gold-dark', '') + 'المفتاح الرقمي</div>' + li('شخصي وغير قابل للمشاركة') + li('صالح من 3:00 م يوم الوصول حتى 12:00 م يوم المغادرة') + li('كل عمليات الدخول مسجلة') + '</div></div>' +
      '<div class="stack-sm mt-24"><label class="check"><input type="checkbox" id="bk-ack" data-ch="bkAck"' + (bk.ack ? ' checked' : '') + '><span><b>قرأت وأوافق على قواعد الوحدة وسياسة الأضرار وسياسة الإلغاء</b> <span class="red">*</span></span></label>' +
      '<label class="check"><input type="checkbox" id="bk-ack2" data-ch="bkAck"' + (bk.ack2 ? ' checked' : '') + '><span class="small muted">أوافق على مشاركة بيانات الهوية مع منصة شموس لأغراض الإبلاغ النظامي عن النزلاء <span class="red">*</span></span></label></div>' +
      nav(true, 'متابعة للدفع', 'bkNext', !(bk.ack && bk.ack2));
  }
  function s4(p, bk, qt) {
    var W = R.DB.wallet, low = bk.pay === 'wallet' && W < qt.total;
    var pm = function (id, logo, cls, t, sub) { return '<button class="radio-card ' + (bk.pay === id ? 'on' : '') + '" data-act="bkPay" data-v="' + id + '" aria-pressed="' + (bk.pay === id) + '"><span class="row gap-12"><span class="pm-logo ' + cls + '">' + logo + '</span><span><span class="b" style="display:block">' + t + '</span><span class="xs muted">' + sub + '</span></span></span><span class="radio-dot"></span></button>'; };
    return '<h2 class="h3">طريقة الدفع</h2><div class="stack-sm mt-16">' +
      pm('wallet', ic('wallet', 'ic-sm', 'W'), 'wallet-pm', 'محفظة رواف — رصيد ' + sar(W), 'خصم فوري + كاش باك 5% + نقاط') +
      pm('mada', 'mada', 'mada', 'مدى', 'بطاقة محفوظة •••• 1234') +
      pm('apple', ic('apple', 'ic-sm', ''), 'apple-pay', 'Apple Pay', 'دفع سريع بلمسة') +
      pm('card', 'VISA', 'visa', 'بطاقة ائتمانية', 'Visa / Mastercard') + '</div>' +
      (low ? '<div class="notice amber mt-16">' + ic('alert-triangle', '', '!') + '<div class="grow"><b>رصيدك لا يكفي</b> — تحتاج ' + sar(qt.total - W) + ' إضافية. اشحن المحفظة أو اختر طريقة أخرى.<div class="row wrap mt-8"><button class="btn btn-primary btn-xs" data-act="bkTopup" data-v="' + Math.ceil((qt.total - W) / 100) * 100 + '">اشحن ' + sar(Math.ceil((qt.total - W) / 100) * 100) + ' من مدى</button><button class="btn btn-outline btn-xs" data-act="bkPay" data-v="mada">الدفع بمدى</button></div></div></div>' : '') +
      (bk.pay === 'card' ? '<div class="grid g2 mt-16">' + R.field('رقم البطاقة', '<input class="input ltr" style="display:block" placeholder="4242 4242 4242 4242" inputmode="numeric">') + R.field('الاسم على البطاقة', '<input class="input" placeholder="SAUD ALOTAIBI">') + R.field('تاريخ الانتهاء', '<input class="input" placeholder="MM/YY">') + R.field('CVV', '<input class="input" placeholder="•••" inputmode="numeric" maxlength="4">') + '</div><p class="xs muted mt-8">' + ic('lock', 'ic-sm', '') + ' دفع آمن ومشفر • التحقق ثلاثي الأبعاد 3-D Secure</p>' : '') +
      '<div class="soft-lg mt-16 small"><span class="gold-dark bb">مكافأة:</span> ستربح ' + qt.points + ' نقطة + كاش باك ' + sar(qt.cashback) + ' لمحفظتك</div>' +
      '<div class="row between mt-24 wrap"><button class="btn btn-ghost" data-act="bkBack">' + ic('arrow-right', 'ic-sm', '→') + 'رجوع</button>' +
      (bk.pay === 'apple' ? '<button class="btn btn-lg" style="background:#000;color:#fff" data-act="bkConfirm" id="bk-pay-btn">' + ic('apple', 'ic-sm', '') + 'Pay ' + sar(qt.total) + '</button>' : '<button class="btn btn-gold btn-lg" data-act="bkConfirm" id="bk-pay-btn"' + (low ? ' aria-disabled="true"' : '') + '>تأكيد ودفع ' + sar(qt.total) + '</button>') + '</div>';
  }
  function s5(p, bk) {
    var b = findBooking(bk.done); if (!b) return '';
    return '<div class="center"><div class="li-ic green" style="width:72px;height:72px;margin:0 auto">' + ic('check-circle-2', 'ic-xl', '✓') + '</div><h2 class="h2 mt-12">تم تأكيد الحجز!</h2><p class="muted mt-4">رقم الحجز <b class="navy ltr">' + b.id + '</b> • تم الدفع (' + b.paymentMethod + ') وإضافة الكاش باك</p></div>' +
      '<div class="key-card mt-24"><div class="row between"><span class="row b small gold">' + ic('key-round', 'ic-sm', '⚿') + 'المفتاح الرقمي</span><span class="pill pill-glass">' + (p.smartLock ? p.lock.provider : 'استلام من المشرف') + '</span></div>' +
      '<div class="code-box mt-16" id="key-code">' + (bk.revealed ? b.keyCode + '#' : '•••• ••#') + '</div>' +
      '<button class="btn btn-glass btn-sm mt-12" data-act="revealKey">' + ic(bk.revealed ? 'eye-off' : 'eye', 'ic-sm', '👁') + (bk.revealed ? 'إخفاء الرمز' : 'إظهار الرمز') + '</button>' +
      '<div class="glass mt-16 small row" style="justify-content:center">' + ic('clock', 'ic-sm', '') + 'صالح من ' + b.checkIn + ' الساعة 3:00 م حتى ' + b.checkOut + ' الساعة 12:00 م</div></div>' +
      '<div class="soft-lg mt-16"><div class="bb mb-8">تعليمات الدخول</div>' + ['أدخل الرمز على لوحة القفل متبوعاً بـ # أو اضغط «افتح الباب» من التطبيق', 'لا تشارك الرمز مع أي شخص — كل عمليات الدخول مسجلة', 'نرسل لك الموقع الدقيق ورقم المشرف قبل الوصول بـ 24 ساعة', 'للمساعدة استخدم المساعد الشخصي أو واتساب على مدار الساعة'].map(function (t, i) { return '<div class="row-top small mt-4" style="gap:8px"><span class="pill pill-navy">' + (i + 1) + '</span><span class="lh">' + t + '</span></div>'; }).join('') + '</div>' +
      '<div class="row wrap mt-24"><button class="btn btn-primary" data-act="addCal" data-id="' + b.id + '">' + ic('calendar-plus', 'ic-sm', '') + 'إضافة للتقويم</button><a class="btn btn-ghost" href="#/account/bookings">عرض حجوزاتي</a><a class="btn btn-ghost" href="#/invoice/' + b.id + '">' + ic('receipt', 'ic-sm', '') + 'الفاتورة</a><a class="btn btn-ghost" href="#/stay/' + b.id + '">صفحة الإقامة</a></div>';
  }
  A.bkDates = function () {
    var bk = R.UI.bk; bk.ci = R.val('#bk-in'); bk.co = R.val('#bk-out'); bk.guests = Number(R.val('#bk-g'));
    if (bk.co <= bk.ci) { bk.co = R.addDays(bk.ci, 1); R.toast('تم ضبط المغادرة بعد يوم من الوصول', 'info'); }
    R.rerender();
  };
  A.bkBack = function () { R.UI.bk.step = Math.max(1, R.UI.bk.step - 1); R.render(); window.scrollTo(0, 0); };
  A.bkNext = function (el) {
    var bk = R.UI.bk;
    if (el.getAttribute('aria-disabled') === 'true') {
      R.toast(bk.step === 1 ? 'الوحدة غير متاحة في هذه التواريخ' : bk.step === 2 ? 'يلزم التحقق من الهوية عبر نفاذ للمتابعة' : 'يجب الموافقة على السياسات للمتابعة', 'err'); return;
    }
    if (bk.step === 2) { bk.name = R.val('#bk-name'); bk.phone = R.val('#bk-phone'); bk.email = R.val('#bk-email'); bk.idType = R.val('#bk-idt'); if (!bk.name) { R.toast('الاسم مطلوب', 'err'); return; } }
    bk.step++; R.render(); window.scrollTo(0, 0);
  };
  A.bkAck = function () { var bk = R.UI.bk; bk.ack = R.$('#bk-ack').checked; bk.ack2 = R.$('#bk-ack2').checked; R.rerender(); };
  A.bkPay = function (el) { R.UI.bk.pay = el.dataset.v; R.rerender(); };
  A.bkTopup = function (el) { var v = Number(el.dataset.v); R.DB.wallet += v; R.DB.tx.unshift({ id: R.uid('t'), type: 'شحن', amount: v, date: R.today(), desc: 'شحن رصيد ' + v + ' ر.س (مدى •••• 1234)' }); R.save(); R.toast('تم شحن ' + sar(v) + ' لمحفظتك', 'ok'); R.rerender(); };
  A.revealKey = function () { R.UI.bk.revealed = !R.UI.bk.revealed; R.rerender(); };

  var nafTimer;
  A.nafathStart = function () {
    var bk = R.UI.bk; bk.name = R.val('#bk-name') || bk.name; bk.idType = R.val('#bk-idt') || bk.idType;
    var num = 10 + Math.floor(Math.random() * 89), left = 60;
    R.modal({ title: 'التحقق عبر نفاذ', sub: 'النفاذ الوطني الموحد', size: 'sm', sticky: true, onClose: function () { clearInterval(nafTimer); },
      body: '<div class="center"><p class="small lh">افتح تطبيق <b>نفاذ</b> على جوالك واختر الرقم التالي لتأكيد هويتك:</p><div class="nafath-num">' + num + '</div><div class="row small muted" style="justify-content:center"><span class="spin dark"></span>بانتظار الموافقة من التطبيق… <b id="naf-left">' + left + '</b> ث</div>' +
        '<div class="notice blue mt-16 xs" style="text-align:right">' + ic('info', 'ic-sm', 'i') + '<div>هذه محاكاة: في النظام الفعلي تصل الموافقة تلقائياً من تطبيق نفاذ. اضغط الزر أدناه لمحاكاة اختيار الرقم الصحيح.</div></div></div>',
      foot: '<button class="btn btn-success" data-act="nafathOk">' + ic('smartphone', 'ic-sm', '') + 'محاكاة الموافقة في تطبيق نفاذ</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
    clearInterval(nafTimer);
    nafTimer = setInterval(function () { left--; var l = R.$('#naf-left'); if (!l) { clearInterval(nafTimer); return; } l.textContent = left; if (left <= 0) { clearInterval(nafTimer); R.modalSet('<div class="center">' + R.empty('timer-off', 'انتهت مهلة التحقق', 'أعد المحاولة من جديد') + '</div>', '<button class="btn btn-primary" data-act="nafathRetry">إعادة المحاولة</button>'); } }, 1000);
  };
  A.nafathRetry = function () { R.closeModal(); A.nafathStart(); };
  A.nafathOk = function () {
    clearInterval(nafTimer);
    R.modalSet('<div class="center" style="padding:16px 0"><div class="li-ic green" style="width:72px;height:72px;margin:0 auto">' + ic('badge-check', 'ic-xl', '✓') + '</div><h3 class="h3 mt-12">تم التحقق من هويتك</h3><p class="small muted mt-4">تم ربط الحجز بهويتك الوطنية بنجاح</p></div>', '');
    setTimeout(function () { R.closeModal(); R.UI.bk.nafath = true; R.DB.user.nafath = true; R.save(); R.toast('تم التحقق عبر نفاذ', 'ok'); R.rerender(); }, 1100);
  };
  A.bkConfirm = function (el) {
    var bk = R.UI.bk, p = R.prop(bk.pid), qt = R.quote(p, bk.ci, bk.co), DB = R.DB;
    if (el.getAttribute('aria-disabled') === 'true') { R.toast('رصيد المحفظة لا يكفي، اشحن المحفظة أو اختر طريقة أخرى', 'err'); return; }
    el.innerHTML = '<span class="spin"></span> جارٍ معالجة الدفع…'; el.setAttribute('aria-disabled', 'true');
    setTimeout(function () {
      var methods = { wallet: 'محفظة', mada: 'مدى', apple: 'Apple Pay', card: 'بطاقة ائتمانية' };
      var id = 'RW-' + String(Date.now()).slice(-6);
      var b = { id: id, propertyId: p.id, title: p.title, city: p.city, image: p.image, checkIn: bk.ci, checkOut: bk.co, nights: qt.nights, guests: bk.guests, rate: p.price, cleaning: p.cleaning, vat: qt.vat, total: qt.total, status: 'مؤكد', createdAt: R.today(), paymentMethod: methods[bk.pay], cashback: qt.cashback, points: qt.points, keyCode: String(Math.floor(100000 + Math.random() * 899999)), guestName: bk.name, guestPhone: bk.phone, nafath: true, shomoos: 'يُرسل عند الوصول', keyStatus: 'مُجدول', payment: 'مدفوع', source: 'تطبيق رواف' };
      if (bk.pay === 'wallet') { DB.wallet -= qt.total; DB.tx.unshift({ id: R.uid('t'), type: 'حجز', amount: -qt.total, date: R.today(), desc: 'حجز ' + p.title }); }
      DB.wallet += qt.cashback; DB.points += qt.points;
      DB.tx.unshift({ id: R.uid('t'), type: 'كاش باك', amount: qt.cashback, date: R.today(), desc: 'كاش باك 5% من حجز ' + id });
      DB.bookings.unshift(b); DB.opBookings.unshift(R.clone(b));
      R.addNotif({ icon: 'calendar-check', title: 'تم تأكيد حجزك ' + id, body: p.title + ' • ' + bk.ci + ' ← ' + bk.co, href: '#/account/bookings' });
      R.audit(bk.name, 'ضيف', 'حجز جديد (' + methods[bk.pay] + ')', id);
      bk.done = id; bk.step = 5; R.save(); R.render(); window.scrollTo(0, 0);
      R.toast('تم تأكيد الحجز ' + id, 'ok');
    }, 1300);
  };
  A.addCal = function (el) {
    var b = findBooking(el.dataset.id); if (!b) return;
    var d = function (s, t) { return s.replace(/-/g, '') + 'T' + t; };
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rawaaf//Prototype//AR', 'BEGIN:VEVENT', 'UID:' + b.id + '@rawaaf.sa', 'DTSTAMP:' + d(R.today(), '090000'), 'DTSTART:' + d(b.checkIn, '150000'), 'DTEND:' + d(b.checkOut, '120000'), 'SUMMARY:إقامة رواف — ' + b.title, 'DESCRIPTION:رقم الحجز ' + b.id + ' — الدخول 3:00 م والمغادرة 12:00 م', 'LOCATION:' + b.city, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'rawaaf-' + b.id + '.ics'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { }
    R.toast('تم تنزيل ملف التقويم (.ics)', 'ok');
  };

  /* ================= GUEST ACCOUNT ================= */
  R.route('/account', function () { return account('overview'); });
  R.route('/account/:tab', function (p) { return account(p.tab); });
  function account(tab) {
    if (!R.DB.user) { requireUser(location.hash); return loginWall('سجّل الدخول لعرض حسابك'); }
    var DB = R.DB, u = DB.user, t = R.tier(DB.points), done = DB.bookings.filter(function (b) { return b.status !== 'ملغي'; }).length;
    var items = [['overview', 'نظرة عامة', 'layout-grid'], ['bookings', 'حجوزاتي', 'calendar', DB.bookings.length], ['favorites', 'المفضلة', 'heart', DB.favs.length], ['wallet', 'المحفظة الرقمية', 'wallet'], ['points', 'نقاط ومكافآت', 'gift'], ['reviews', 'تقييماتي', 'star'], ['settings', 'الإعدادات', 'settings']];
    var side = '<aside class="side"><div class="side-card"><div class="side-user"><div class="avatar">' + esc(u.name[0]) + '</div><div><div class="b">' + esc(u.name) + '</div><div class="xs muted row gap-4"><span class="dot" style="background:' + t.color + '"></span>' + t.name + (u.nafath ? ' • <span class="green b">موثق نفاذ</span>' : '') + '</div></div></div>' +
      '<nav class="side-nav">' + items.map(function (i) { return '<a href="#/account/' + i[0] + '" class="' + (tab === i[0] ? 'on' : '') + '"><span class="lbl">' + ic(i[2], 'ic-sm', '•') + i[1] + '</span>' + (i[3] != null ? '<span class="cnt">' + i[3] + '</span>' : '') + '</a>'; }).join('') +
      '<button class="logout" data-act="logout">' + ic('log-out', 'ic-sm', '⇦') + 'تسجيل خروج</button></nav>' +
      '<div class="loyal"><div class="row xs b gold">' + ic('gift', 'ic-sm', '🎁') + 'مكافأة الولاء</div><div class="small b mt-8" style="line-height:1.5;position:relative">بعد ' + Math.max(0, 5 - done) + ' حجوزات تحصل على تنظيف مجاني!</div><div class="bar dark thin mt-12"><div style="width:' + Math.min(100, done / 5 * 100) + '%"></div></div></div></div></aside>';
    var views = { overview: ovTab, bookings: bkTab, favorites: favTab, wallet: walTab, points: ptsTab, reviews: revTab, settings: setTab };
    var main = (views[tab] || ovTab)(u, t);
    return R.guestShell('<div class="container dash">' + side + '<div style="min-width:0">' + main + '</div></div>');
  }
  function statusPillSolid(s) {
    var cls = s === 'مؤكد' ? 'pill-green-solid' : s === 'مكتمل' ? 'pill-navy' : s === 'جارية' ? 'pill-gold' : 'pill-red';
    return '<span class="pill ' + cls + '" style="font-size:12px;padding:4px 12px">' + s + '</span>';
  }
  function ovTab(u, t) {
    var DB = R.DB, active = DB.bookings.find(function (b) { return b.status === 'جارية'; });
    var myRevs = DB.reviews.filter(function (r) { return r.userId === u.id; }).length;
    var pending = DB.bookings.find(function (b) { return b.status === 'مكتمل' && !DB.reviews.some(function (r) { return r.userId === u.id && r.bookingId === b.id; }) && !DB.reviews.some(function (r) { return r.userId === u.id && r.propertyId === b.propertyId; }); });
    return '<div class="stack-lg">' +
      (active ? '<a class="hero-card row between wrap" href="#/stay/' + active.id + '" style="display:flex"><div class="row gap-12"><span class="li-ic" style="background:var(--gold);color:var(--navy)">' + ic('key-round', '', '⚿') + '</span><div><div class="xs gold b">إقامتك الحالية • حتى ' + active.checkOut + ' 12:00 م</div><div class="bb lg">' + esc(active.title) + '</div></div></div><span class="btn btn-gold btn-sm">افتح الباب والمزيد ' + ic('arrow-left', 'ic-sm', '←') + '</span></a>' : '') +
      '<div class="grid g4">' + R.stat({ icon: 'calendar', value: DB.bookings.length, label: 'حجوزاتي', sub: 'مكتمل ' + DB.bookings.filter(function (b) { return b.status === 'مكتمل'; }).length }) +
      R.stat({ icon: 'wallet', tone: 'gold', value: sar(DB.wallet), label: 'رصيد المحفظة', sub: '+ كاش باك 5%' }) +
      R.stat({ icon: 'star', value: fmt(DB.points), label: 'نقاطي', sub: '= ' + Math.floor(DB.points / 10) + ' ر.س' }) +
      R.stat({ icon: 'award', tone: 'black', value: myRevs, label: 'تقييماتي', sub: 'تقييم منشور' }) + '</div>' +
      '<div class="grid g-2-1" style="gap:24px"><div class="card card-p"><div class="card-h"><h3>آخر الحجوزات</h3><a class="link" href="#/account/bookings">عرض الكل</a></div><div class="stack-sm">' +
      DB.bookings.slice(0, 3).map(function (b) { return '<a class="li" href="#/account/bookings"><img class="li-img" src="' + b.image + '" alt=""><div class="grow"><div class="b small truncate">' + esc(b.title) + '</div><div class="xs muted row gap-4">' + ic('map-pin', 'ic-sm', '') + esc(b.city) + ' • ' + b.checkIn + '</div><div class="mt-4">' + R.pill(b.status) + '</div></div><div class="end"><div class="bb small">' + sar(b.total) + '</div><div class="xs muted">' + b.paymentMethod + '</div></div></a>'; }).join('') + '</div></div>' +
      '<div class="hero-card"><div class="row gold b small">' + ic('crown', '', '♛') + 'مستوى ' + t.name + '</div><div class="h1 mt-12">' + fmt(DB.points) + ' نقطة</div><div class="small" style="color:rgba(255,255,255,.7)">' + (t.name === 'ذهبي' && DB.points >= 3000 ? 'أعلى مستوى' : 'تحتاج ' + fmt(t.next - DB.points) + ' نقطة للترقية') + '</div><div class="glass mt-24"><div class="row between xs mb-8"><span>التقدم</span><span>' + Math.min(100, Math.round(DB.points / t.next * 100)) + '%</span></div><div class="bar dark"><div style="width:' + Math.min(100, DB.points / t.next * 100) + '%"></div></div></div><p class="xs mt-16 lh" style="color:rgba(255,255,255,.6)">اربح 10 نقاط لكل 100 ر.س حجز • 5% كاش باك يضاف تلقائياً لمحفظتك</p></div></div>' +
      (pending ? '<div class="notice amber row between wrap" style="align-items:center"><div class="row gap-12"><span class="li-ic" style="background:#fbbf24;color:#fff">' + ic('star', '', '★') + '</span><div><div class="b">قيّم إقامتك الأخيرة</div><div class="xs">شاركنا رأيك في ' + esc(pending.title) + ' واحصل على 50 نقطة إضافية</div></div></div><a class="btn btn-primary btn-sm" href="#/review/' + pending.id + '">تقييم الآن</a></div>' : '') + '</div>';
  }
  function bkTab() {
    var DB = R.DB;
    return '<h2 class="h2 mb-16">حجوزاتي</h2><div class="stack">' + (DB.bookings.length ? DB.bookings.map(function (b) {
      var hasKey = b.status === 'مؤكد' || b.status === 'جارية';
      return '<div class="card" style="overflow:hidden"><div class="card-p row-top wrap" style="gap:20px"><img src="' + b.image + '" alt="" style="width:200px;max-width:100%;height:140px;border-radius:16px;object-fit:cover"><div class="grow" style="min-width:240px"><div class="row between" style="align-items:flex-start"><div><div class="bb lg">' + esc(b.title) + '</div><div class="small muted row gap-4 mt-4">' + ic('map-pin', 'ic-sm', '') + esc(b.city) + ' • ' + b.guests + ' ضيوف • <span class="ltr">' + b.id + '</span></div></div>' + statusPillSolid(b.status) + '</div>' +
        '<div class="grid g3 mt-16" style="gap:10px"><div class="soft"><div class="xs muted b">الوصول</div><div class="b small mt-4">' + b.checkIn + '</div></div><div class="soft"><div class="xs muted b">المغادرة</div><div class="b small mt-4">' + b.checkOut + '</div></div><div class="soft"><div class="xs muted b">الإجمالي</div><div class="bb small mt-4">' + sar(b.total) + '</div></div></div>' +
        (hasKey ? '<div class="mt-16 row between wrap" style="background:var(--navy);color:#fff;border-radius:12px;padding:12px"><div class="row small b">' + ic('key-round', 'ic-sm gold', '⚿') + 'المفتاح الرقمي: <span class="gold ltr" style="letter-spacing:3px">' + (b.status === 'جارية' ? b.keyCode + '#' : '•••• ••#') + '</span></div><div class="xs row gap-4" style="color:rgba(255,255,255,.6)">' + ic('clock', 'ic-sm', '') + (b.status === 'جارية' ? 'صالح حتى ' + b.checkOut + ' 12:00 م' : 'يُفعّل ' + b.checkIn + ' 3:00 م') + '</div></div>' : '') + '</div></div>' +
        '<div class="row wrap" style="padding:12px 20px;background:var(--bg)"><a class="btn btn-outline btn-xs" href="#/invoice/' + b.id + '">' + ic('receipt', 'ic-sm', '') + 'فاتورة</a>' +
        '<button class="btn btn-outline btn-xs" data-act="rebook" data-id="' + b.propertyId + '">إعادة حجز</button>' +
        (b.status === 'جارية' ? '<a class="btn btn-primary btn-xs" href="#/stay/' + b.id + '">' + ic('key-round', 'ic-sm', '') + 'إقامتي الحالية</a>' : '') +
        (b.status === 'مؤكد' ? '<a class="btn btn-outline btn-xs" href="#/stay/' + b.id + '">تفاصيل الوصول</a><button class="btn btn-danger btn-xs" data-act="cancelBooking" data-id="' + b.id + '">إلغاء</button>' : '') +
        (b.status === 'مكتمل' ? '<a class="btn btn-gold btn-xs" href="#/review/' + b.id + '">قيّم الإقامة +50 نقطة</a>' : '') + '</div></div>';
    }).join('') : '<div class="card">' + R.empty('calendar', 'لا توجد حجوزات بعد', 'ابدأ باستكشاف الوحدات المتاحة', '<a class="btn btn-primary mt-16" href="#/">استكشف الوحدات</a>') + '</div>') + '</div>';
  }
  A.rebook = function (el) { R.UI.bk = null; R.go('#/property/' + el.dataset.id); };
  A.cancelBooking = function (el) {
    var b = findBooking(el.dataset.id), hrs = R.nights(R.today(), b.checkIn) * 24, full = hrs > 48, refund = full ? b.total : Math.round(b.total / 2);
    R.confirm({ title: 'إلغاء الحجز ' + b.id + '؟', danger: true, ok: 'تأكيد الإلغاء',
      msg: 'حسب سياسة الإلغاء المرنة ' + (full ? 'يحق لك <b>استرداد كامل</b>' : 'يحق لك <b>استرداد 50%</b>') + ' لأن الوصول بعد ' + Math.max(0, Math.round(hrs)) + ' ساعة.',
      extra: '<div class="soft-lg mt-12">' + R.kv('المبلغ المدفوع', sar(b.total)) + R.kv('المبلغ المسترد', '<span class="green">' + sar(refund) + '</span>') + R.kv('طريقة الاسترداد', b.paymentMethod === 'محفظة' ? 'المحفظة (فوري)' : b.paymentMethod + ' (5–10 أيام عمل)') + '</div>',
      onOk: function () {
        b.status = 'ملغي'; b.keyStatus = 'ملغى'; b.payment = 'مسترد';
        var ob = R.DB.opBookings.find(function (x) { return x.id === b.id; }); if (ob) { ob.status = 'ملغي'; ob.keyStatus = 'ملغى'; ob.payment = 'مسترد'; }
        if (b.paymentMethod === 'محفظة') R.DB.wallet += refund;
        R.DB.tx.unshift({ id: R.uid('t'), type: 'استرداد', amount: refund, date: R.today(), desc: 'استرداد إلغاء ' + b.id });
        R.save(); R.toast('تم إلغاء الحجز واسترداد ' + sar(refund), 'ok'); R.rerender();
      } });
  };
  function favTab() {
    var fs = R.DB.properties.filter(function (p) { return R.DB.favs.indexOf(p.id) >= 0; });
    return '<h2 class="h2 mb-16">المفضلة ' + ic('heart', 'red', '♥') + ' ' + fs.length + '</h2>' + (fs.length ? '<div class="units" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">' + fs.map(function (p) { return R.ucard(p); }).join('') + '</div>' : '<div class="card">' + R.empty('heart', 'لا يوجد مفضلة بعد', 'اضغط على القلب في أي وحدة لحفظها هنا', '<a class="btn btn-primary mt-16" href="#/">تصفح الوحدات</a>') + '</div>');
  }
  function walTab() {
    var DB = R.DB;
    return '<div class="stack-lg"><div class="hero-card" style="padding:32px"><div class="row between wrap"><div><div class="small" style="color:rgba(255,255,255,.7)">رصيد محفظة رواف</div><div style="font-size:44px;font-weight:900;line-height:1.2">' + fmt(DB.wallet) + ' <span class="lg gold">ر.س</span></div><div class="xs" style="color:rgba(255,255,255,.6)">+ كاش باك 5% على كل حجز • صالح مدى الحياة</div></div><span class="li-ic" style="width:56px;height:56px;background:rgba(255,255,255,.1);color:var(--gold)">' + ic('wallet', 'ic-lg', '') + '</span></div>' +
      '<div class="row wrap mt-24">' + [100, 300, 500].map(function (v) { return '<button class="btn btn-gold" data-act="topup" data-v="' + v + '">+' + v + ' ر.س</button>'; }).join('') + '<button class="btn btn-glass" data-act="topupCustom">مبلغ آخر</button></div>' +
      '<div class="glass mt-16 small row">' + ic('credit-card', 'ic-sm', '') + 'بطاقة محفوظة: مدى •••• 1234 • آمن ومشفر <button class="link xs ms-auto" style="color:var(--gold)" data-act="toast" data-msg="إدارة البطاقات المحفوظة (محاكاة)">تغيير</button></div></div>' +
      '<div class="card card-p"><div class="card-h"><h3>سجل العمليات</h3><span class="xs muted">' + DB.tx.length + ' عملية</span></div><div class="rows">' + (DB.tx.length ? DB.tx.map(function (t) {
        var plus = t.amount > 0; return '<div class="row between" style="padding:12px 0"><div class="row gap-12"><span class="li-ic ' + (plus ? 'green' : t.amount < 0 ? 'red' : 'gold') + '">' + ic(plus ? 'arrow-down-left' : t.amount < 0 ? 'arrow-up-right' : 'gift', 'ic-sm', '•') + '</span><div><div class="b small">' + esc(t.desc) + '</div><div class="xs muted">' + t.date + ' • ' + t.type + '</div></div></div><div class="bb small ' + (plus ? 'green' : '') + ' ltr">' + (plus ? '+' : '') + fmt(t.amount) + ' ر.س</div></div>';
      }).join('') : R.empty('receipt', 'لا توجد عمليات بعد')) + '</div></div></div>';
  }
  A.topup = function (el) {
    var v = Number(el.dataset.v);
    R.confirm({ title: 'شحن المحفظة', msg: 'سيتم شحن <b>' + sar(v) + '</b> من بطاقة مدى •••• 1234', ok: 'شحن الآن', onOk: function () { R.DB.wallet += v; R.DB.tx.unshift({ id: R.uid('t'), type: 'شحن', amount: v, date: R.today(), desc: 'شحن رصيد ' + v + ' ر.س' }); R.save(); R.toast('تم شحن ' + sar(v) + ' بنجاح', 'ok'); R.rerender(); } });
  };
  A.topupCustom = function () {
    R.modal({ title: 'شحن مبلغ مخصص', size: 'sm', body: R.field('المبلغ (ر.س)', '<input id="tp-v" class="input" inputmode="numeric" placeholder="مثال: 250" data-enter="topupCustomOk">', 'الحد الأدنى 50 ر.س والأقصى 10,000 ر.س'), foot: '<button class="btn btn-primary" data-act="topupCustomOk">شحن</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.topupCustomOk = function () { var v = Number(R.val('#tp-v')); if (!(v >= 50 && v <= 10000)) { R.toast('أدخل مبلغاً بين 50 و 10,000', 'err'); return; } R.closeModal(); R.DB.wallet += v; R.DB.tx.unshift({ id: R.uid('t'), type: 'شحن', amount: v, date: R.today(), desc: 'شحن رصيد ' + v + ' ر.س' }); R.save(); R.toast('تم شحن ' + sar(v), 'ok'); R.rerender(); };
  function ptsTab(u, t) {
    var DB = R.DB, tiers = [{ name: 'برونزي', req: '0-799', ben: 'كاش باك 3% • دعم عادي', min: 0 }, { name: 'فضي', req: '800-1999', ben: 'كاش باك 5% • أولوية دعم • خصم تنظيف', min: 800 }, { name: 'ذهبي', req: '2000+', ben: 'كاش باك 7% • مدير حساب • ترقية مجانية', min: 2000 }];
    return '<div class="stack-lg"><div class="grid g2"><div class="card card-p"><div class="row gap-12"><span class="li-ic gold" style="width:56px;height:56px">' + ic('gift', 'ic-lg', '') + '</span><div><div class="h2">' + fmt(DB.points) + ' نقطة</div><div class="small muted">تساوي ' + Math.floor(DB.points / 10) + ' ر.س</div></div></div>' +
      '<button class="btn btn-primary btn-block mt-16" data-act="redeem">استبدال 100 نقطة = 10 ر.س</button><p class="xs muted mt-12 lh">تكسب 10 نقاط لكل 100 ر.س حجز. استبدل كل 100 نقطة = 10 ر.س تضاف للمحفظة فوراً. تقييم الإقامة = 50 نقطة.</p></div>' +
      '<div class="hero-card"><div class="row small b gold">' + ic('users', 'ic-sm', '') + 'كود الدعوة الخاص بك</div><div class="glass mt-16 row between"><div class="row"><span class="h2 ltr" style="letter-spacing:3px">' + esc(u.referralCode) + '</span><span class="pill pill-gold" style="background:var(--gold);color:var(--navy)">50 ر.س</span></div><button class="btn btn-glass btn-icon btn-sm" data-act="copy" data-text="' + esc(u.referralCode) + '" data-msg="تم نسخ كود الدعوة" aria-label="نسخ الكود">' + ic('copy', 'ic-sm', '⧉') + '</button></div><p class="xs mt-12 lh" style="color:rgba(255,255,255,.65)">ادعُ صديقاً يحصل على 50 ر.س وأنت تحصل على 50 ر.س عند أول حجز له.</p><div class="row mt-12"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('احجز إقامتك مع رواف واحصل على 50 ر.س بكود ' + u.referralCode) + '">مشاركة عبر واتساب</a></div></div></div>' +
      '<div class="card card-p"><div class="card-h"><h3>المستويات</h3><span class="small muted">مستواك الحالي: <b class="navy">' + t.name + '</b></span></div><div class="bar mb-16"><div style="width:' + Math.min(100, DB.points / 3000 * 100) + '%"></div></div><div class="grid g3">' +
      tiers.map(function (x) { var on = x.name === t.name; return '<div class="soft-lg" style="' + (on ? 'outline:2px solid var(--gold);background:#fbf6ec' : '') + '"><div class="row between"><div class="bb">' + x.name + '</div>' + (on ? '<span class="pill pill-gold">مستواك</span>' : DB.points >= x.min ? '<span class="pill pill-green">محقق</span>' : '') + '</div><div class="xs muted mt-4">' + x.req + ' نقطة</div><div class="small mt-8 lh">' + x.ben + '</div></div>'; }).join('') + '</div></div></div>';
  }
  A.redeem = function () {
    if (R.DB.points < 100) { R.toast('تحتاج 100 نقطة على الأقل', 'err'); return; }
    R.DB.points -= 100; R.DB.wallet += 10; R.DB.tx.unshift({ id: R.uid('t'), type: 'مكافأة', amount: 10, date: R.today(), desc: 'استبدال 100 نقطة' }); R.save();
    R.toast('تم استبدال 100 نقطة = 10 ر.س أضيفت لمحفظتك', 'ok'); R.rerender();
  };
  function revTab(u) {
    var mine = R.DB.reviews.filter(function (r) { return r.userId === u.id; });
    return '<h2 class="h2 mb-16">تقييماتي</h2><div class="stack">' + (mine.length ? mine.map(function (r) {
      var p = R.prop(r.propertyId); return '<div class="card card-p"><div class="row between">' + R.stars(r.rating) + '<div class="row"><button class="btn btn-ghost btn-icon btn-sm" data-act="editReview" data-id="' + r.id + '" aria-label="تعديل">' + ic('pencil', 'ic-sm', '✎') + '</button><button class="btn btn-danger btn-icon btn-sm" data-act="delReview" data-id="' + r.id + '" aria-label="حذف">' + ic('trash-2', 'ic-sm', '🗑') + '</button></div></div><a class="bb mt-8" style="display:block" href="#/property/' + p.id + '">' + esc(p.title) + '</a><p class="small lh mt-4">' + esc(r.comment) + '</p><div class="xs muted mt-8">' + r.date + '</div>' + (r.ownerReply ? '<div class="owner-reply"><div class="xs b gold-dark">رد المالك:</div>' + esc(r.ownerReply) + '</div>' : '') + '</div>';
    }).join('') : '<div class="card">' + R.empty('star', 'لم تقم بأي تقييم بعد', 'بعد إكمال الحجز يمكنك تقييم الوحدة') + '</div>') + '</div>';
  }
  A.editReview = function (el) {
    var r = R.DB.reviews.find(function (x) { return x.id === el.dataset.id; }); R.UI.editStars = r.rating;
    R.modal({ title: 'تعديل التقييم', size: 'sm', body: '<div class="field"><span class="lbl">التقييم</span><div class="stars-input" id="ed-stars">' + starBtns(r.rating, 'edStar') + '</div></div>' + '<div class="mt-16">' + R.field('التعليق', '<textarea id="ed-c" class="textarea">' + esc(r.comment) + '</textarea>') + '</div>',
      foot: '<button class="btn btn-primary" data-act="saveReview" data-id="' + r.id + '">حفظ التعديل</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  function starBtns(n, act) { var s = ''; for (var i = 1; i <= 5; i++) s += '<button type="button" class="' + (i <= n ? 'on' : '') + '" data-act="' + act + '" data-v="' + i + '" aria-label="' + i + ' نجوم">' + ic('star', '', '★') + '</button>'; return s; }
  R.starBtns = starBtns;
  A.edStar = function (el) { R.UI.editStars = Number(el.dataset.v); R.$('#ed-stars').innerHTML = starBtns(R.UI.editStars, 'edStar'); R.icons(); };
  A.saveReview = function (el) { var r = R.DB.reviews.find(function (x) { return x.id === el.dataset.id; }); var c = R.val('#ed-c'); if (!c) { R.toast('اكتب تعليقك', 'err'); return; } r.comment = c; r.rating = R.UI.editStars; R.save(); R.closeModal(); R.toast('تم تحديث التقييم', 'ok'); R.rerender(); };
  A.delReview = function (el) { R.confirm({ title: 'حذف التقييم؟', msg: 'لا يمكن التراجع عن حذف التقييم.', danger: true, ok: 'حذف', onOk: function () { R.DB.reviews = R.DB.reviews.filter(function (x) { return x.id !== el.dataset.id; }); R.save(); R.toast('تم حذف التقييم'); R.rerender(); } }); };
  function setTab(u) {
    var n = u.notif || {};
    var tg = function (k, t, s) { return '<div class="setting-row"><div><div class="b small">' + t + '</div><div class="xs muted">' + s + '</div></div>' + R.toggle('data-ch="notifToggle" data-k="' + k + '"', n[k], t) + '</div>'; };
    return '<h2 class="h2 mb-16">الإعدادات</h2><div class="stack"><div class="card card-p"><h3 class="h3 mb-16">الملف الشخصي</h3><div class="grid g2">' +
      R.field('الاسم', '<input id="st-name" class="input" value="' + esc(u.name) + '">') + R.field('الجوال', '<input id="st-phone" class="input" value="' + esc(u.phone) + '" inputmode="numeric">') + R.field('البريد', '<input id="st-email" class="input" type="email" value="' + esc(u.email) + '">') +
      R.field('اللغة', '<select id="st-lang" class="select" data-ch="langChange"><option value="ar" selected>العربية</option><option value="en">English</option></select>') + '</div>' +
      '<div class="row mt-16"><button class="btn btn-primary" data-act="saveProfile">حفظ التغييرات</button>' + (u.nafath ? '<span class="pill pill-green">' + ic('badge-check', '', '✓') + 'الهوية موثقة عبر نفاذ</span>' : '') + '</div></div>' +
      '<div class="card card-p"><h3 class="h3 mb-8">الإشعارات</h3>' + tg('price', 'تنبيهات الأسعار', 'نبهني إذا انخفض سعر المفضلة') + tg('booking', 'تحديثات الحجز', 'تأكيد الحجز، المفتاح الرقمي، التذكير بالوصول') + tg('offers', 'العروض والحملات', 'عروض حصرية وكاش باك مضاعف') + tg('whatsapp', 'إشعارات واتساب', 'استلام الرموز والتحديثات عبر واتساب') + '</div>' +
      '<div class="card card-p"><h3 class="h3">منطقة الخطر</h3><p class="small muted mt-4">حذف الحساب يزيل بياناتك ورصيد المحفظة غير المستخدم يُحوّل لحسابك البنكي.</p><button class="btn btn-danger mt-16" data-act="deleteAccount">' + ic('trash-2', 'ic-sm', '') + 'حذف الحساب</button></div></div>';
  }
  A.saveProfile = function () { var u = R.DB.user; var n = R.val('#st-name'); if (!n) { R.toast('الاسم مطلوب', 'err'); return; } if (!/^05\d{8}$/.test(R.val('#st-phone'))) { R.toast('رقم الجوال غير صحيح', 'err'); return; } u.name = n; u.phone = R.val('#st-phone'); u.email = R.val('#st-email'); R.save(); R.toast('تم حفظ الملف الشخصي', 'ok'); R.rerender(); };
  A.notifToggle = function (el) { var u = R.DB.user; u.notif = u.notif || {}; u.notif[el.dataset.k] = el.checked; R.save(); R.toast(el.checked ? 'تم التفعيل' : 'تم الإيقاف', 'ok'); };
  A.langChange = function (el) { if (el.value === 'en') { R.toast('النسخة الإنجليزية قيد التطوير — English version coming soon', 'info'); el.value = 'ar'; } };
  A.deleteAccount = function () {
    R.confirm({ title: 'حذف الحساب نهائياً؟', danger: true, ok: 'حذف الحساب', msg: 'اكتب كلمة <b>حذف</b> للتأكيد. سيتم تسجيل خروجك.', extra: '<input id="del-c" class="input mt-12" placeholder="حذف">',
      onOk: function () { if (R.val('#del-c') !== 'حذف') { R.toast('اكتب كلمة «حذف» للتأكيد', 'err'); return false; } R.logout(); R.toast('تم حذف الحساب (محاكاة)'); R.go('#/'); } });
  };
  A.logout = function () { R.logout(); R.toast('تم تسجيل الخروج'); R.go('#/'); };

  /* ================= ACTIVE STAY ================= */
  R.route('/stay/:id', function (pr) {
    if (!R.DB.user) { requireUser(location.hash); return loginWall('سجّل الدخول لعرض إقامتك'); }
    var b = findBooking(pr.id); if (!b) return R.guestShell('<div class="container"><div class="card mt-24">' + R.empty('key-round', 'لا توجد إقامة بهذا الرقم', '', '<a class="btn btn-primary mt-16" href="#/account/bookings">حجوزاتي</a>') + '</div></div>');
    var p = R.prop(b.propertyId), active = b.status === 'جارية', DB = R.DB;
    var nightsLeft = Math.max(0, R.nights(R.today(), b.checkOut));
    var log = DB.accessEvents.filter(function (e) { return e.propertyId === p.id; }).slice(0, 6);
    var reqs = DB.stayRequests.filter(function (r) { return r.bookingId === b.id; });
    var keyCard;
    if (active) {
      keyCard = '<div class="key-card"><div class="row between"><span class="row b small gold">' + ic('key-round', 'ic-sm', '⚿') + 'مفتاحك الرقمي</span><span class="pill pill-glass"><span class="dot dot-green"></span>' + (p.lock ? p.lock.provider + ' • متصل • بطارية ' + p.lock.battery + '%' : 'مفتاح المشرف') + '</span></div>' +
        '<button class="unlock-btn" id="unlock" data-act="unlock" aria-live="polite">' + ic('lock', '', '🔒') + '<span id="unlock-t">افتح الباب</span></button>' +
        '<div class="small" id="unlock-s" style="color:rgba(255,255,255,.75)">اقترب من الباب ثم اضغط للفتح عبر الإنترنت</div>' +
        '<div class="glass mt-16 row between wrap"><div class="small">أو أدخل الرمز على لوحة القفل</div><div class="row"><span class="code-box" style="font-size:22px;letter-spacing:5px" id="stay-code">' + (R.UI.stayReveal ? b.keyCode + '#' : '•••• ••#') + '</span><button class="btn btn-glass btn-icon btn-xs" data-act="stayReveal" aria-label="إظهار الرمز">' + ic(R.UI.stayReveal ? 'eye-off' : 'eye', 'ic-sm', '👁') + '</button></div></div>' +
        '<div class="xs mt-12" style="color:rgba(255,255,255,.6)">صالح حتى ' + b.checkOut + ' الساعة 12:00 م • لا تشارك الرمز</div></div>';
    } else if (b.status === 'مؤكد') {
      keyCard = '<div class="key-card"><span class="row b small gold" style="justify-content:center">' + ic('key-round', 'ic-sm', '') + 'مفتاحك الرقمي</span><div class="unlock-btn" style="background:rgba(255,255,255,.1);color:#fff;box-shadow:none;cursor:default">' + ic('clock', '', '⏱') + '<span class="small">يُفعّل بعد ' + R.nights(R.today(), b.checkIn) + ' يوم</span></div><div class="small" style="color:rgba(255,255,255,.75)">سيُفعّل المفتاح تلقائياً يوم ' + b.checkIn + ' الساعة 3:00 م</div></div>';
    } else {
      keyCard = '<div class="key-card"><div class="unlock-btn" style="background:rgba(255,255,255,.1);color:#fff;box-shadow:none;cursor:default">' + ic('lock', '', '🔒') + '<span class="small">المفتاح منتهي</span></div><div class="small" style="color:rgba(255,255,255,.75)">انتهت هذه الإقامة (' + b.status + ')</div>' + (b.status === 'مكتمل' ? '<a class="btn btn-gold btn-sm mt-16" href="#/review/' + b.id + '">قيّم إقامتك +50 نقطة</a>' : '') + '</div>';
    }
    var info = function (icon, t, v, btn) { return '<div class="tile"><div class="row between"><span class="li-ic gold">' + ic(icon, '', '•') + '</span>' + (btn || '') + '</div><div class="xs muted b mt-12">' + t + '</div><div class="bb mt-4">' + v + '</div></div>'; };
    var html = '<div class="container" style="padding-top:24px;padding-bottom:24px"><div class="hero-card" style="padding:28px"><div class="row between wrap"><div><div class="row xs b gold">' + ic('map-pin', 'ic-sm', '') + esc(p.city + ' • ' + p.district) + '</div><h1 class="h2 mt-8">' + (active ? 'إقامتك الحالية' : 'تفاصيل الإقامة') + ' — ' + esc(p.title) + '</h1><div class="small mt-4" style="color:rgba(255,255,255,.7)">' + b.id + ' • ' + b.checkIn + ' ← ' + b.checkOut + ' • ' + b.guests + ' ضيوف</div></div>' +
      '<div class="row">' + R.pill(b.status, 'lg') + (active ? '<span class="pill pill-glass">' + R.nt(nightsLeft) + ' متبقية</span>' : '') + '</div></div></div>' +
      '<div class="grid g-2-1 mt-24" style="gap:24px;align-items:start"><div class="stack-lg">' +
      '<div class="grid g4">' + info('wifi', 'الواي فاي', '<span class="ltr">' + esc(p.wifi.ssid) + '</span><div class="xs muted">كلمة المرور: <span class="ltr b navy">' + esc(p.wifi.pass) + '</span></div>', '<button class="btn btn-ghost btn-icon btn-xs" data-act="copy" data-text="' + esc(p.wifi.pass) + '" data-msg="تم نسخ كلمة مرور الواي فاي" aria-label="نسخ">' + ic('copy', 'ic-sm', '⧉') + '</button>') +
      info('log-out', 'وقت المغادرة', '12:00 م<div class="xs muted">' + R.dayName(b.checkOut) + ' ' + b.checkOut + '</div>') +
      info('book-open', 'دليل الوحدة', '<button class="link" data-act="stayGuide">عرض الدليل</button>') +
      info('headphones', 'الدعم 24/7', '<button class="link" data-act="toggleChat">المساعد الشخصي</button><div class="xs"><a class="link xs" href="https://wa.me/966500000000" target="_blank" rel="noopener">واتساب</a></div>') + '</div>' +
      '<div class="card card-p"><div class="card-h"><h3>طلبات الإقامة</h3></div><div class="grid g3">' +
      '<button class="soft-lg row gap-12" style="text-align:right" data-act="stayReq" data-t="early"' + (active ? ' aria-disabled="true"' : '') + '><span class="li-ic navy">' + ic('sunrise', '', '') + '</span><span><span class="b small" style="display:block">دخول مبكر</span><span class="xs muted">من 12:00 م • 100 ر.س</span></span></button>' +
      '<button class="soft-lg row gap-12" style="text-align:right" data-act="stayReq" data-t="late"><span class="li-ic navy">' + ic('sunset', '', '') + '</span><span><span class="b small" style="display:block">مغادرة متأخرة</span><span class="xs muted">حتى 3:00 م • 150 ر.س</span></span></button>' +
      '<button class="soft-lg row gap-12" style="text-align:right" data-act="reportIssue" data-id="' + b.id + '"><span class="li-ic red">' + ic('triangle-alert', '', '!') + '</span><span><span class="b small" style="display:block">الإبلاغ عن مشكلة</span><span class="xs muted">صيانة، نظافة، قفل…</span></span></button></div>' +
      (reqs.length ? '<div class="rows mt-16">' + reqs.map(function (r) { return '<div class="row between" style="padding:10px 0"><div class="small"><b>' + r.label + '</b> <span class="xs muted">• ' + r.id + ' • ' + r.time + '</span></div>' + R.pill(r.status) + '</div>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="card card-p"><div class="card-h"><h3>سجل الدخول</h3><span class="xs muted">كل عمليات فتح القفل مسجلة لحمايتك</span></div><div class="rows" id="access-log">' + log.map(logRow).join('') + '</div></div>' +
      '</div><div class="stack">' + keyCard +
      (active ? '<div class="card card-p"><h3 class="h3">المغادرة الذاتية</h3><p class="small muted mt-4 lh">عند المغادرة سجّل خروجك من هنا — سيُعطّل المفتاح ويُبلّغ المشرف لبدء الفحص.</p><button class="btn btn-primary btn-block mt-16" data-act="selfCheckout" data-id="' + b.id + '">' + ic('door-open', 'ic-sm', '') + 'تسجيل المغادرة</button></div>' : '') +
      '<div class="card card-p"><div class="row gap-12"><div class="avatar avatar-sm">ف</div><div class="grow"><div class="xs muted">المشرف المسؤول</div><div class="b">فيصل الحربي</div></div><a class="btn btn-ghost btn-icon btn-sm" href="tel:0561112233" aria-label="اتصال">' + ic('phone', 'ic-sm', '✆') + '</a></div></div></div></div></div>';
    return R.guestShell(html);
  });
  function logRow(e) { return '<div class="row between" style="padding:10px 0"><div class="row gap-12"><span class="li-ic ' + (e.result === 'ناجح' ? 'green' : 'red') + '">' + ic(e.result === 'ناجح' ? 'lock-open' : 'shield-x', 'ic-sm', '•') + '</span><div><div class="b small">' + esc(e.who) + '</div><div class="xs muted">' + e.method + (e.note ? ' • ' + esc(e.note) : '') + '</div></div></div><div class="end"><div class="xs muted ltr">' + e.time + '</div>' + R.pill(e.result) + '</div></div>'; }
  R.logRow = logRow;
  A.stayReveal = function () { R.UI.stayReveal = !R.UI.stayReveal; R.rerender(); };
  var relockT;
  A.unlock = function (el) {
    if (el.classList.contains('busy')) return;
    var b = findBooking(R.cur.params.id), p = R.prop(b.propertyId), t = R.$('#unlock-t'), s = R.$('#unlock-s');
    clearTimeout(relockT); el.classList.remove('open'); el.classList.add('busy'); t.textContent = 'جارٍ الفتح…'; s.textContent = 'جارٍ الاتصال بالقفل الذكي…';
    setTimeout(function () {
      el.classList.remove('busy'); el.classList.add('open'); t.textContent = 'تم فتح القفل';
      el.querySelector('.ic, svg').outerHTML = ic('lock-open', '', '🔓'); R.icons();
      s.textContent = 'الباب مفتوح — سيُقفل تلقائياً بعد 8 ثوانٍ';
      var ev = { id: R.uid('a'), propertyId: p.id, time: R.nowTS(), who: R.DB.user.name + ' (ضيف)', method: 'تطبيق رواف', result: 'ناجح' };
      R.DB.accessEvents.unshift(ev); R.save();
      var lg = R.$('#access-log'); if (lg) { lg.insertAdjacentHTML('afterbegin', logRow(ev)); R.icons(); }
      R.toast('تم فتح القفل — أهلاً بك', 'ok');
      relockT = setTimeout(function () { var u = R.$('#unlock'); if (!u) return; u.classList.remove('open'); R.$('#unlock-t').textContent = 'افتح الباب'; var sv = u.querySelector('.ic, svg'); if (sv) sv.outerHTML = ic('lock', '', '🔒'); R.icons(); R.$('#unlock-s').textContent = 'تم القفل تلقائياً'; }, 8000);
    }, 1700);
  };
  A.stayGuide = function () {
    var b = findBooking(R.cur.params.id), p = R.prop(b.propertyId);
    var sec = function (icon, t, body) { return '<div class="soft-lg"><div class="row bb">' + ic(icon, 'gold-dark', '') + t + '</div><div class="small lh mt-4">' + body + '</div></div>'; };
    R.modal({ title: 'دليل الوحدة', sub: esc(p.title), size: 'lg', body: '<div class="stack-sm">' +
      sec('door-open', 'الوصول والدخول', 'ادخل من البوابة الرئيسية، الباب الخشبي على اليمين. لوحة القفل أعلى المقبض — المسها لتنشيطها.') +
      sec('car', 'الموقف', 'موقفان خاصان أمام المدخل مباشرة.') +
      sec('thermometer', 'التكييف والأجهزة', 'ريموت المكيفات في درج طاولة الصالة. الغسالة في غرفة الغسيل خلف المطبخ.') +
      sec('waves', 'المسبح', 'مفتوح من 8 ص حتى 11 م. يمنع استخدام الزجاج حول المسبح. الأطفال بإشراف ذويهم.') +
      sec('trash-2', 'النفايات', 'حاويات النفايات خارج البوابة الجانبية.') +
      sec('siren', 'الطوارئ', 'طفاية الحريق في المطبخ. الإسعاف 997 • الدفاع المدني 998 • الشرطة 999.') +
      sec('store', 'قريب منك', 'بقالة 24 ساعة (300 م) • صيدلية (650 م) • مطاعم الواجهة البحرية (5 دقائق بالسيارة).') + '</div>' });
  };
  A.stayReq = function (el) {
    if (el.getAttribute('aria-disabled') === 'true') { R.toast('طلب الدخول المبكر متاح قبل يوم الوصول فقط', 'err'); return; }
    var early = el.dataset.t === 'early', b = findBooking(R.cur.params.id);
    R.modal({ title: early ? 'طلب دخول مبكر' : 'طلب مغادرة متأخرة', size: 'sm',
      body: R.field(early ? 'وقت الدخول المطلوب' : 'وقت المغادرة المطلوب', '<select id="rq-t" class="select">' + (early ? ['12:00 م — 100 ر.س', '1:00 م — 75 ر.س', '2:00 م — 50 ر.س'] : ['1:00 م — 75 ر.س', '2:00 م — 100 ر.س', '3:00 م — 150 ر.س']).map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select>') +
        '<p class="xs muted mt-12 lh">يعتمد الطلب على توفر الوحدة وجدول التنظيف. لن يتم الخصم إلا بعد الموافقة. يُمدد المفتاح الرقمي تلقائياً عند الموافقة.</p>',
      foot: '<button class="btn btn-primary" data-act="stayReqOk" data-t="' + el.dataset.t + '">إرسال الطلب</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.stayReqOk = function (el) {
    var b = findBooking(R.cur.params.id), label = (el.dataset.t === 'early' ? 'دخول مبكر ' : 'مغادرة متأخرة ') + R.val('#rq-t');
    var rq = { id: 'SR-' + Math.floor(100 + Math.random() * 800), bookingId: b.id, label: label, status: 'قيد المراجعة', time: R.nowTS() };
    R.DB.stayRequests.unshift(rq); R.save(); R.closeModal(); R.toast('تم إرسال الطلب — سنرد خلال دقائق', 'ok'); R.rerender();
    setTimeout(function () { rq.status = 'موافق عليه'; R.save(); R.addNotif({ icon: 'check-circle-2', title: 'تمت الموافقة على طلبك', body: label + ' — تم تمديد المفتاح الرقمي', href: '#/stay/' + b.id }); R.toast('تمت الموافقة على ' + label.split(' —')[0], 'ok'); if (R.cur.path.indexOf('/stay') === 0) R.rerender(); }, 3500);
  };
  A.reportIssue = function (el) {
    R.UI.issue = { cat: 'صيانة', sev: 'متوسطة', photos: [] };
    R.modal({ title: 'الإبلاغ عن مشكلة', sub: 'يصل البلاغ مباشرة للمشرف وفريق التشغيل', size: 'lg', body: issueBody(), foot: '<button class="btn btn-primary" data-act="issueSubmit" data-id="' + el.dataset.id + '">إرسال البلاغ</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  function issueBody() {
    var I = R.UI.issue;
    return '<div class="field"><span class="lbl">التصنيف</span><div class="chips">' + [['صيانة', 'wrench'], ['نظافة', 'sparkles'], ['قفل ذكي', 'key-round'], ['إنترنت', 'wifi'], ['أجهزة', 'tv'], ['إزعاج', 'volume-2'], ['أخرى', 'more-horizontal']].map(function (c) { return '<button class="chip chip-sm ' + (I.cat === c[0] ? 'on' : '') + '" data-act="issueCat" data-v="' + c[0] + '">' + ic(c[1], 'ic-sm', '') + c[0] + '</button>'; }).join('') + '</div></div>' +
      '<div class="field mt-16"><span class="lbl">مستوى الإلحاح</span><div class="chips">' + ['منخفضة', 'متوسطة', 'عالية'].map(function (s) { return '<button class="chip chip-sm ' + (I.sev === s ? 'on' : '') + '" data-act="issueSev" data-v="' + s + '">' + s + '</button>'; }).join('') + '</div></div>' +
      '<div class="mt-16">' + R.field('وصف المشكلة', '<textarea id="is-d" class="textarea" placeholder="مثال: المكيف في غرفة النوم لا يبرد">' + esc(I.desc || '') + '</textarea>') + '</div>' +
      '<div class="field mt-16"><span class="lbl">صور (اختياري)</span><div class="thumbs-row" id="is-ph">' + I.photos.map(function (u) { return '<img src="' + u + '" alt="صورة مرفقة">'; }).join('') + '<label class="thumb-ph" style="cursor:pointer" aria-label="إضافة صورة">' + ic('camera', '', '+') + '<input type="file" accept="image/*" multiple data-ch="issuePhoto" style="display:none"></label></div></div>';
  }
  A.issueCat = function (el) { R.UI.issue.cat = el.dataset.v; R.UI.issue.desc = R.val('#is-d'); R.modalSet(issueBody()); };
  A.issueSev = function (el) { R.UI.issue.sev = el.dataset.v; R.UI.issue.desc = R.val('#is-d'); R.modalSet(issueBody()); };
  A.issuePhoto = function (el) {
    var I = R.UI.issue; I.desc = R.val('#is-d');
    Array.prototype.forEach.call(el.files || [], function (f) { try { I.photos.push(URL.createObjectURL(f)); } catch (e) { } });
    R.modalSet(issueBody()); R.toast('تم إرفاق ' + (el.files ? el.files.length : 0) + ' صورة', 'ok');
  };
  A.issueSubmit = function (el) {
    var I = R.UI.issue, d = R.val('#is-d'); if (!d) { R.toast('اكتب وصفاً مختصراً للمشكلة', 'err'); return; }
    var b = findBooking(el.dataset.id), id = 'IN-' + Math.floor(50 + Math.random() * 900);
    R.DB.incidents.unshift({ id: id, propertyId: b.propertyId, title: d.slice(0, 60), category: I.cat, severity: I.sev, status: 'مفتوح', reportedBy: R.DB.user.name + ' (ضيف)', time: R.nowTS(), photos: I.photos.length });
    R.save(); R.closeModal();
    R.modal({ title: 'تم استلام البلاغ', size: 'sm', body: '<div class="center"><div class="li-ic green" style="width:64px;height:64px;margin:0 auto">' + ic('check-circle-2', 'ic-lg', '✓') + '</div><div class="h3 mt-12">رقم البلاغ ' + id + '</div><p class="small muted mt-8 lh">أُبلغ المشرف فيصل الحربي. الوقت المتوقع للاستجابة: ' + (I.sev === 'عالية' ? '15 دقيقة' : '45 دقيقة') + '. ستصلك التحديثات في الإشعارات.</p></div>', foot: '<button class="btn btn-primary" data-act="closeModal">حسناً</button>' });
  };
  A.selfCheckout = function (el) {
    var items = ['أطفأت المكيفات والإضاءة', 'أغلقت النوافذ والأبواب الخارجية', 'وضعت النفايات في الحاويات', 'تأكدت من عدم نسيان أغراضي', 'أغلقت باب الوحدة خلفي'];
    R.modal({ title: 'تسجيل المغادرة', sub: 'قائمة تحقق سريعة قبل المغادرة', size: 'sm', body: '<div class="stack-sm">' + items.map(function (t, i) { return '<label class="check"><input type="checkbox" class="co-c">' + t + '</label>'; }).join('') + '</div><div class="notice gold mt-16 xs">' + ic('info', 'ic-sm', 'i') + '<div>سيتم تعطيل المفتاح الرقمي فوراً وإبلاغ المشرف لفحص الوحدة. أي ملاحظات أضرار تصلك مع الصور خلال 48 ساعة.</div></div>',
      foot: '<button class="btn btn-primary" data-act="selfCheckoutOk" data-id="' + el.dataset.id + '">تأكيد المغادرة</button><button class="btn btn-ghost" data-act="closeModal">إلغاء</button>' });
  };
  A.selfCheckoutOk = function (el) {
    if (R.$$('.co-c').some(function (c) { return !c.checked; })) { R.toast('أكمل قائمة التحقق أولاً', 'err'); return; }
    var b = findBooking(el.dataset.id); b.status = 'مكتمل'; b.keyStatus = 'منتهي';
    var ob = R.DB.opBookings.find(function (x) { return x.id === b.id; }); if (ob) { ob.status = 'مكتمل'; ob.keyStatus = 'منتهي'; }
    var p = R.prop(b.propertyId); p.status = 'فحص بعد المغادرة';
    R.DB.tasks.unshift({ id: 'TK-' + Math.floor(200 + Math.random() * 700), type: 'inspection', title: 'فحص بعد المغادرة', propertyId: p.id, assignee: 'فيصل الحربي', due: R.nowTS(), status: 'todo', priority: 'عالية', bookingId: b.id, checklist: [{ t: 'فحص الأثاث والأجهزة', done: false }, { t: 'التأكد من عدم وجود أضرار', done: false }, { t: 'جرد المستلزمات', done: false }, { t: 'تصوير الحالة بعد المغادرة', done: false }], photos: [], notes: '' });
    R.DB.accessEvents.unshift({ id: R.uid('a'), propertyId: p.id, time: R.nowTS(), who: R.DB.user.name + ' (ضيف)', method: 'مغادرة ذاتية', result: 'ناجح', note: 'تم تعطيل الرمز' });
    R.save(); R.closeModal(); R.toast('شكراً لإقامتك! تم تسجيل المغادرة وتعطيل المفتاح', 'ok'); R.go('#/review/' + b.id);
  };

  /* ================= REVIEW ================= */
  R.route('/review/:id', function (pr) {
    if (!R.DB.user) { requireUser(location.hash); return loginWall(); }
    var b = findBooking(pr.id); if (!b) return null; var p = R.prop(b.propertyId);
    var U = R.UI; if (U.rvFor !== b.id) { U.rvFor = b.id; U.rv = { overall: 5, cats: { 'النظافة': 5, 'الدقة': 5, 'الدخول': 5, 'الموقع': 5, 'القيمة': 4 }, photos: [] }; }
    var rv = U.rv;
    var html = '<div class="container" style="padding-top:24px;padding-bottom:24px;max-width:820px"><div class="card card-p"><div class="row gap-12"><img src="' + p.image + '" alt="" style="width:90px;height:72px;border-radius:14px;object-fit:cover"><div><div class="xs muted b">قيّم إقامتك • ' + b.id + '</div><h1 class="h2">' + esc(p.title) + '</h1><div class="small muted">' + b.checkIn + ' ← ' + b.checkOut + '</div></div></div>' +
      '<div class="notice gold mt-16">' + ic('gift', '', '🎁') + '<div>انشر تقييمك واحصل على <b>50 نقطة</b> تضاف لرصيدك فوراً</div></div>' +
      '<div class="field mt-24"><span class="lbl">التقييم العام</span><div class="stars-input" id="rv-stars" style="justify-content:flex-end">' + R.starBtns(rv.overall, 'rvStar') + '</div></div>' +
      '<div class="grid g2 mt-16">' + Object.keys(rv.cats).map(function (k) { return '<div class="soft row between"><span class="b small">' + k + '</span><div class="stars-input" style="gap:0">' + [1, 2, 3, 4, 5].map(function (i) { return '<button class="' + (i <= rv.cats[k] ? 'on' : '') + '" data-act="rvCat" data-k="' + k + '" data-v="' + i + '" aria-label="' + k + ' ' + i + '">' + ic('star', 'ic-sm', '★') + '</button>'; }).join('') + '</div></div>'; }).join('') + '</div>' +
      '<div class="mt-16">' + R.field('كيف كانت إقامتك؟', '<textarea id="rv-c" class="textarea" placeholder="شاركنا تجربتك: النظافة، الدخول الذكي، التعامل…">' + esc(rv.comment || '') + '</textarea>') + '</div>' +
      '<div class="field mt-16"><span class="lbl">أضف صوراً (اختياري)</span><div class="thumbs-row">' + rv.photos.map(function (u) { return '<img src="' + u + '" alt="">'; }).join('') + '<label class="thumb-ph" style="cursor:pointer" aria-label="إضافة صورة">' + ic('image-plus', '', '+') + '<input type="file" accept="image/*" multiple data-ch="rvPhoto" style="display:none"></label></div></div>' +
      '<div class="row mt-24"><button class="btn btn-primary btn-lg" data-act="rvSubmit">نشر التقييم +50 نقطة</button><a class="btn btn-ghost" href="#/account">لاحقاً</a></div></div></div>';
    return R.guestShell(html);
  });
  A.rvStar = function (el) { R.UI.rv.overall = Number(el.dataset.v); R.UI.rv.comment = R.val('#rv-c'); R.rerender(); };
  A.rvCat = function (el) { R.UI.rv.cats[el.dataset.k] = Number(el.dataset.v); R.UI.rv.comment = R.val('#rv-c'); R.rerender(); };
  A.rvPhoto = function (el) { R.UI.rv.comment = R.val('#rv-c'); Array.prototype.forEach.call(el.files || [], function (f) { try { R.UI.rv.photos.push(URL.createObjectURL(f)); } catch (e) { } }); R.rerender(); };
  A.rvSubmit = function () {
    var rv = R.UI.rv, c = R.val('#rv-c'); if (c.length < 5) { R.toast('اكتب تعليقك (5 أحرف على الأقل)', 'err'); return; }
    var b = findBooking(R.UI.rvFor);
    R.DB.reviews.unshift({ id: R.uid('rev'), propertyId: b.propertyId, bookingId: b.id, userName: R.DB.user.name, userId: R.DB.user.id, rating: rv.overall, comment: c, date: R.today(), images: rv.photos.length ? rv.photos : undefined });
    R.DB.points += 50; R.save(); R.UI.rvFor = null;
    R.toast('شكراً! تم نشر تقييمك وإضافة 50 نقطة', 'ok'); R.go('#/account/reviews');
  };

  /* ================= INVOICE ================= */
  R.route('/invoice/:id', function (pr) {
    var b = findBooking(pr.id); if (!b) return null; var p = R.prop(b.propertyId);
    var sub = b.rate * b.nights, net = sub + b.cleaning;
    var html = '<div class="container no-print row between wrap" style="padding-top:20px"><button class="btn btn-ghost btn-sm" data-act="back">' + ic('arrow-right', 'ic-sm', '→') + 'رجوع</button><button class="btn btn-primary btn-sm" data-act="print">' + ic('printer', 'ic-sm', '') + 'طباعة / حفظ PDF</button></div>' +
      '<article class="invoice"><div class="row between wrap" style="align-items:flex-start"><div>' + R.logo() + '<div class="xs muted mt-8 lh">شركة رواف للضيافة (بيانات توضيحية)<br>الرقم الضريبي: 300000000000003<br>الرياض، المملكة العربية السعودية</div></div><div class="end"><div class="h2">فاتورة ضريبية مبسطة</div><div class="small muted">Simplified Tax Invoice</div><div class="small mt-8">رقم الفاتورة: <b class="ltr">INV-' + b.id.replace('RW-', '') + '</b></div><div class="small">التاريخ: <b>' + b.createdAt + '</b></div></div></div>' +
      '<hr class="divider"><div class="grid g2"><div><div class="xs muted b">العميل</div><div class="b">' + esc(b.guestName) + '</div><div class="small muted ltr">' + esc(b.guestPhone) + '</div></div><div><div class="xs muted b">الحجز</div><div class="b">' + esc(b.title) + '</div><div class="small muted">' + b.id + ' • ' + b.checkIn + ' ← ' + b.checkOut + ' • ' + b.guests + ' ضيوف</div></div></div>' +
      '<div class="tbl-wrap mt-24"><table class="tbl" style="min-width:480px"><thead><tr><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th></tr></thead><tbody><tr><td>إقامة — ليلة</td><td>' + b.nights + '</td><td>' + sar(b.rate) + '</td><td>' + sar(sub) + '</td></tr><tr><td>رسوم التنظيف</td><td>1</td><td>' + sar(b.cleaning) + '</td><td>' + sar(b.cleaning) + '</td></tr></tbody></table></div>' +
      '<div class="row between wrap mt-24" style="align-items:flex-end"><div class="qr" role="img" aria-label="رمز QR توضيحي"></div><div style="min-width:280px">' + R.kv('المجموع قبل الضريبة', sar(net)) + R.kv('ضريبة القيمة المضافة (15%)', sar(b.vat)) + R.kv('الإجمالي شامل الضريبة', sar(b.total), 'total') + R.kv('طريقة الدفع', b.paymentMethod) + R.kv('الحالة', b.payment || 'مدفوع') + (b.cashback ? R.kv('كاش باك مضاف للمحفظة', sar(b.cashback)) : '') + '</div></div>' +
      '<p class="xs muted mt-24 center">هذه فاتورة توضيحية ضمن النموذج الأولي — ليست مستنداً ضريبياً حقيقياً.</p></article>';
    return R.guestShell(html, { noNav: true });
  });
})();
