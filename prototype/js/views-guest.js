/* رواف — موقع الضيوف (1): الرئيسية، البحث، تفاصيل الوحدة، الدخول، الإشعارات، المساعد الشخصي */
(function () {
  'use strict';
  var R = window.R, A = R.A, ic = R.ic, esc = R.esc, sar = R.sar, fmt = R.fmt, C = R.C;
  var DB = function () { return R.DB; };
  var UI = R.UI;

  /* ---------- pricing helper ---------- */
  R.quote = function (p, ci, co) {
    var n = Math.max(1, R.nights(ci, co) || 1), sub = p.price * n, vat = Math.round((sub + p.cleaning) * 0.15), total = sub + p.cleaning + vat;
    return { nights: n, sub: sub, cleaning: p.cleaning, vat: vat, total: total, cashback: Math.round(sub * 0.05), points: Math.floor(sub / 100) * 10 };
  };
  R.isAvailable = function (p, ci, co) {
    return !(p.blocked || []).some(function (r) { return ci < r[1] && co > r[0]; }) && p.status !== 'موقوفة';
  };
  function discount(p) { return p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0; }
  function listed() { return DB().properties.filter(function (p) { return p.status !== 'قيد النشر'; }); }

  /* ---------- unit card ---------- */
  R.ucard = function (p, o) {
    o = o || {}; var fav = DB().favs.indexOf(p.id) >= 0, cmp = R.UI.compare.indexOf(p.id) >= 0;
    return '<article class="ucard">' +
      '<div class="ucard-img" data-act="go" data-href="#/property/' + p.id + '" role="link" tabindex="0" aria-label="' + esc(p.title) + '">' +
      '<img src="' + p.image + '" alt="' + esc(p.title) + '" loading="lazy">' +
      '<div class="ucard-top"><span class="pill pill-white"><span class="star">' + ic('star', 'ic-sm', '★') + '</span>' + p.rating + ' (' + p.reviewsCount + ')</span>' +
      '<button class="fav-btn ' + (fav ? 'on' : '') + '" data-act="toggleFav" data-id="' + p.id + '" aria-pressed="' + fav + '" aria-label="إضافة للمفضلة">' + ic('heart', '', '♥') + '</button></div>' +
      (p.oldPrice ? '<div class="ucard-br"><span class="badge-disc">خصم ' + discount(p) + '%</span></div>' : '') +
      (p.superhost ? '<div class="ucard-bl"><span class="badge-host">' + ic('crown', '', '♛') + 'مضيف مميز</span></div>' : '') +
      '</div><div class="ucard-body"><h3 class="ucard-title">' + esc(p.title) + '</h3>' +
      '<div class="ucard-loc">' + ic('map-pin', 'ic-sm', '⌖') + esc(p.city) + ' • ' + esc(p.district) + '</div>' +
      '<div class="ucard-tags">' + (p.smartLock ? '<span class="pill pill-gold">' + ic('key-round', '', '⚿') + 'دخول ذكي</span>' : '') +
      '<span class="pill ' + (p.supervision === 'supervised' ? 'pill-navy' : 'pill-gray') + '">' + ic(p.supervision === 'supervised' ? 'user-check' : 'smartphone', '', '•') + R.supLabel(p.supervision) + '</span>' +
      '<span class="pill pill-gray">' + R.typeLabel(p.type) + '</span>' +
      (o.avail != null ? (o.avail ? '<span class="pill pill-green">' + ic('calendar-check', '', '✓') + 'متاح في تواريخك</span>' : '<span class="pill pill-red">' + ic('calendar-x', '', '×') + 'غير متاح في تواريخك</span>') : '') + '</div>' +
      '<div class="ucard-foot"><div><div class="price">' + sar(p.price) + ' <small>/ ليلة</small></div>' + (p.oldPrice ? '<div class="old-price">' + sar(p.oldPrice) + '</div>' : '') + '</div>' +
      '<div class="row"><button class="btn btn-ghost btn-sm" data-act="toggleCompare" data-id="' + p.id + '" aria-pressed="' + cmp + '">' + (cmp ? ic('check', 'ic-sm', '✓') : '') + 'مقارنة</button>' +
      '<a class="btn btn-primary btn-sm" href="#/property/' + p.id + (o.qs || '') + '">عرض</a></div></div></div></article>';
  };

  function filtered() {
    var U = R.UI, q = (U.q || '').trim();
    return listed().filter(function (p) {
      return (U.city === 'الكل' || p.city === U.city) && (U.type === 'all' || p.type === U.type) && (!q || (p.title + p.city + p.district + R.typeLabel(p.type)).indexOf(q) >= 0);
    });
  }
  function gridHTML() {
    var list = filtered();
    if (!list.length) return '<div class="card" style="grid-column:1/-1">' + R.empty('search-x', 'لا توجد وحدات مطابقة', 'جرّب مدينة أو نوع وحدة مختلف', '<button class="btn btn-primary mt-16" data-act="clearFilters">مسح الفلاتر</button>') + '</div>';
    return list.map(function (p) { return R.ucard(p); }).join('');
  }
  function compareTray() {
    var c = R.UI.compare; if (!c.length) return '';
    return '<div class="compare-tray" role="region" aria-label="المقارنة"><div class="thumbs">' + c.map(function (id) { var p = R.prop(id); return '<img src="' + p.image + '" alt="">'; }).join('') + '</div>' +
      '<div class="hide-sm"><div class="b small">مقارنة ' + c.length + ' وحدات</div><div class="xs" style="color:rgba(255,255,255,.6)">اختر حتى 3 وحدات للمقارنة</div></div>' +
      '<button class="btn btn-gold btn-sm" data-act="openCompare">قارن الآن</button><button class="btn btn-glass btn-icon btn-sm" data-act="clearCompare" aria-label="مسح المقارنة">' + ic('x', 'ic-sm', '×') + '</button></div>';
  }

  /* ---------- HOME ---------- */
  R.route('/', function () {
    var U = R.UI, n = listed().length, cities = ['الكل', 'جدة', 'الرياض', 'أبها', 'الخبر'];
    var types = [['all', 'كل الأنواع', 'layout-grid'], ['apartment', 'شقق', 'building'], ['hotel', 'فنادق', 'hotel'], ['unit', 'وحدات سكنية', 'home'], ['villa', 'فلل', 'castle'], ['chalet', 'شاليهات', 'trees']];
    var ci = R.addDays(R.today(), 3), co = R.addDays(R.today(), 5);
    var html = '<div class="container" style="padding-top:24px"><section class="hero">' +
      '<div class="hero-bg" style="background-image:url(' + C.img(C.P.A, 1200) + ')"></div><div class="hero-shade"></div>' +
      '<div class="hero-in"><div class="hero-badge"><span class="dot dot-green pulse"></span>متاح الآن • ' + n + ' وحدات مميزة • دخول ذكي • كاش باك 5%</div>' +
      '<h1>إقامات رواف<br><span class="gold">دخول ذكي، محفظة، نقاط</span></h1>' +
      '<p>احجز شقتك أو فيلتك في دقائق، تحقق من هويتك عبر نفاذ، واستلم مفتاحك الرقمي فوراً. ادفع بمحفظتك واجمع نقاطاً ترتقي بك من البرونزي للذهبي.</p>' +
      '<div class="row wrap mt-24"><button class="btn btn-gold" data-act="' + (R.DB.user ? 'go' : 'needLogin') + '" data-href="#/account">لوحة التحكم ' + ic('arrow-left', 'ic-sm', '←') + '</button><button class="btn btn-glass" data-act="scrollGrid">استكشف الوحدات</button></div></div>' +
      '<form class="quick-search" data-act="noop" onsubmit="return false" aria-label="بحث سريع">' +
      '<div class="field"><label for="qs-city">المدينة</label><select id="qs-city" class="select"><option value="">كل المدن</option>' + ['الرياض', 'جدة', 'أبها', 'الخبر', 'القصيم'].map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="qs-in">الوصول</label><input id="qs-in" type="date" class="input" value="' + ci + '" min="' + R.today() + '"></div>' +
      '<div class="field"><label for="qs-out">المغادرة</label><input id="qs-out" type="date" class="input" value="' + co + '" min="' + R.today() + '"></div>' +
      '<div class="field"><label for="qs-g">الضيوف</label><select id="qs-g" class="select">' + [1, 2, 3, 4, 5, 6, 8, 10].map(function (g) { return '<option value="' + g + '"' + (g === 2 ? ' selected' : '') + '>' + g + ' ضيوف</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="btn btn-primary qs-btn" data-act="quickSearch">' + ic('search', 'ic-sm', '⌕') + 'ابحث عن التوفر</button></form>' +
      '</section></div>' +
      '<div class="container" style="padding-top:20px;padding-bottom:8px"><div class="chips"><span class="row b small">' + ic('filter', 'ic-sm', '⚲') + 'فلترة:</span>' +
      cities.map(function (c) { return '<button class="chip ' + (U.city === c ? 'on' : '') + '" data-act="setCity" data-v="' + c + '">' + c + '</button>'; }).join('') +
      '<div class="ms-auto row"><span class="xs muted b" id="cmp-count">المقارنة (' + U.compare.length + '/3)</span>' + (U.compare.length ? '<button class="xs b red" data-act="clearCompare">مسح</button>' : '') + '</div></div>' +
      '<div class="scroll-x mt-12"><div class="chips">' + types.map(function (t) { return '<button class="chip chip-sm ' + (U.type === t[0] ? 'on' : '') + '" data-act="setType" data-v="' + t[0] + '">' + ic(t[2], 'ic-sm', '') + t[1] + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="container" style="padding-top:12px;padding-bottom:40px"><div class="units" id="grid">' + gridHTML() + '</div></div>' +
      '<div class="container" style="padding-bottom:24px"><div class="grid g3">' +
      feature('key-round', 'دخول ذكي بدون مفاتيح', 'رمز رقمي يصلك فور الحجز، صالح من 3 عصراً يوم الوصول حتى 12 ظهراً يوم المغادرة.') +
      feature('shield-check', 'هوية موثقة عبر نفاذ', 'تحقق آمن من الهوية يحمي الضيف والمالك ويسرّع الإبلاغ النظامي.') +
      feature('wallet', 'محفظة + كاش باك 5%', 'ادفع بمحفظتك، واسترد 5% من كل حجز، واستبدل نقاطك برصيد.') +
      '</div></div>' + compareTray();
    return R.guestShell(html);
  });
  function feature(icon, t, d) { return '<div class="tile row-top"><span class="li-ic navy">' + ic(icon, '', '•') + '</span><div><div class="bb">' + t + '</div><p class="small muted mt-4 lh">' + d + '</p></div></div>'; }

  A.noop = function () { };
  A.scrollGrid = function () { var g = R.$('#grid'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  A.setCity = function (el) { R.UI.city = el.dataset.v; R.rerender(); };
  A.setType = function (el) { R.UI.type = el.dataset.v; R.rerender(); };
  A.clearFilters = function () { R.UI.city = 'الكل'; R.UI.type = 'all'; R.UI.q = ''; R.rerender(); };
  A.gSearch = function (el) {
    R.UI.q = el.value; R.$$('[data-in="gSearch"]').forEach(function (i) { if (i !== el) i.value = el.value; });
    var g = R.$('#grid'); if (g && R.cur.path === '/') { g.innerHTML = gridHTML(); R.icons(); }
  };
  A.gSearchGo = function (el) { R.go('#/search?q=' + encodeURIComponent(el.value.trim())); };
  A.quickSearch = function () {
    var ci = R.val('#qs-in'), co = R.val('#qs-out');
    if (!ci || !co || co <= ci) { R.toast('تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول', 'err'); return; }
    R.go('#/search?city=' + encodeURIComponent(R.val('#qs-city')) + '&in=' + ci + '&out=' + co + '&guests=' + R.val('#qs-g'));
  };
  A.toggleFav = function (el) {
    if (!R.DB.user) { openLogin(); return; }
    var id = Number(el.dataset.id), f = R.DB.favs, i = f.indexOf(id);
    if (i >= 0) { f.splice(i, 1); R.toast('أزيلت من المفضلة'); } else { f.push(id); R.toast('أضيفت إلى المفضلة', 'ok'); }
    R.save(); R.rerender();
  };
  A.toggleCompare = function (el) {
    var id = Number(el.dataset.id), c = R.UI.compare, i = c.indexOf(id);
    if (i >= 0) c.splice(i, 1); else { if (c.length >= 3) { R.toast('يمكن مقارنة 3 وحدات كحد أقصى', 'err'); return; } c.push(id); }
    R.rerender();
  };
  A.clearCompare = function () { R.UI.compare = []; R.rerender(); };
  A.openCompare = function () {
    var ps = R.UI.compare.map(R.prop);
    if (ps.length < 2) { R.toast('اختر وحدتين على الأقل للمقارنة', 'err'); return; }
    var minP = Math.min.apply(null, ps.map(function (p) { return p.price; })), maxR = Math.max.apply(null, ps.map(function (p) { return p.rating; }));
    var row = function (label, fn) { return '<tr><td>' + label + '</td>' + ps.map(function (p) { return '<td>' + fn(p) + '</td>'; }).join('') + '</tr>'; };
    var yes = function (b) { return b ? '<span class="green b">' + ic('check', 'ic-sm', '✓') + ' نعم</span>' : '<span class="muted">—</span>'; };
    var body = '<div class="tbl-wrap"><table class="tbl cmp-tbl"><thead><tr><th></th>' + ps.map(function (p) { return '<th><img src="' + p.image + '" alt=""><div class="b mt-8" style="color:var(--navy);white-space:normal">' + esc(p.title) + '</div></th>'; }).join('') + '</tr></thead><tbody>' +
      row('السعر / ليلة', function (p) { return '<span class="' + (p.price === minP ? 'best' : 'b') + '">' + sar(p.price) + '</span>'; }) +
      row('التقييم', function (p) { return '<span class="' + (p.rating === maxR ? 'best' : 'b') + '">★ ' + p.rating + '</span> <span class="xs muted">(' + p.reviewsCount + ')</span>'; }) +
      row('المدينة', function (p) { return esc(p.city + ' • ' + p.district); }) +
      row('النوع', function (p) { return R.typeLabel(p.type); }) +
      row('الضيوف / الغرف', function (p) { return p.guests + ' ضيوف • ' + p.bedrooms + ' غرف'; }) +
      row('دخول ذكي', function (p) { return yes(p.smartLock); }) +
      row('نموذج الإشراف', function (p) { return R.supLabel(p.supervision); }) +
      row('مضيف مميز', function (p) { return yes(p.superhost); }) +
      row('رسوم التنظيف', function (p) { return sar(p.cleaning); }) +
      row('المرافق', function (p) { return '<span class="small">' + p.amenities.slice(0, 4).join('، ') + '</span>'; }) +
      row('', function (p) { return '<a class="btn btn-primary btn-sm" href="#/property/' + p.id + '">عرض واحجز</a>'; }) +
      '</tbody></table></div>';
    R.modal({ title: 'مقارنة الوحدات', sub: 'الأفضل في كل معيار مميز باللون الأخضر', size: 'xl', body: body });
  };

  /* ---------- SEARCH ---------- */
  R.route('/search', function (p, q) {
    var ci = q['in'] || R.addDays(R.today(), 3), co = q.out || R.addDays(R.today(), 5), guests = Number(q.guests || 2), city = q.city || '', type = q.type || '', maxP = Number(q.max || 1500), smart = q.smart === '1', sup = q.sup || '', sort = q.sort || 'best', text = q.q || '';
    var nights = Math.max(1, R.nights(ci, co));
    var list = listed().filter(function (x) {
      return (!city || x.city === city) && (!type || x.type === type) && x.price <= maxP && x.guests >= guests && (!smart || x.smartLock) && (!sup || x.supervision === sup) && (!text || (x.title + x.city + x.district).indexOf(text) >= 0);
    }).map(function (x) { return { p: x, avail: R.isAvailable(x, ci, co) }; });
    list.sort(function (a, b) { if (a.avail !== b.avail) return a.avail ? -1 : 1; if (sort === 'price') return a.p.price - b.p.price; if (sort === 'rating') return b.p.rating - a.p.rating; return (b.p.rating * 100 - b.p.price / 20) - (a.p.rating * 100 - a.p.price / 20); });
    var availN = list.filter(function (x) { return x.avail; }).length;
    var qs = '?in=' + ci + '&out=' + co + '&guests=' + guests;
    var sel = function (id, opts, v) { return '<select id="' + id + '" class="select" data-ch="srch">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
    var filters = '<div class="card card-p stack" style="position:sticky;top:84px">' +
      '<div class="row between"><h2 class="h3">البحث والتوفر</h2><a class="link small" href="#/search">مسح</a></div>' +
      R.field('<span>كلمة البحث</span>', '<input id="s-q" class="input" value="' + esc(text) + '" placeholder="حي، اسم وحدة..." data-ch="srch">') +
      R.field('المدينة', sel('s-city', [['', 'كل المدن'], ['الرياض', 'الرياض'], ['جدة', 'جدة'], ['أبها', 'أبها'], ['الخبر', 'الخبر'], ['القصيم', 'القصيم']], city)) +
      '<div class="grid g2" style="gap:10px">' + R.field('الوصول', '<input id="s-in" type="date" class="input" value="' + ci + '" min="' + R.today() + '" data-ch="srch">') + R.field('المغادرة', '<input id="s-out" type="date" class="input" value="' + co + '" min="' + R.today() + '" data-ch="srch">') + '</div>' +
      R.field('عدد الضيوف', '<div class="row"><button class="btn btn-ghost btn-icon btn-sm" data-act="guestStep" data-d="-1" aria-label="إنقاص">' + ic('minus', 'ic-sm', '-') + '</button><input id="s-g" class="input center" style="width:70px" value="' + guests + '" inputmode="numeric" data-ch="srch" aria-label="عدد الضيوف"><button class="btn btn-ghost btn-icon btn-sm" data-act="guestStep" data-d="1" aria-label="زيادة">' + ic('plus', 'ic-sm', '+') + '</button></div>') +
      R.field('نوع الوحدة', sel('s-type', [['', 'كل الأنواع'], ['apartment', 'شقق'], ['hotel', 'فنادق'], ['unit', 'وحدات سكنية'], ['villa', 'فلل'], ['chalet', 'شاليهات']], type)) +
      R.field('أعلى سعر لليلة: <b class="navy" id="max-l">' + sar(maxP) + '</b>', '<input id="s-max" type="range" class="range" min="200" max="1500" step="50" value="' + maxP + '" data-ch="srch" data-in="maxLbl">') +
      R.field('نموذج التشغيل', sel('s-sup', [['', 'الكل'], ['supervised', 'مُشرَف عليها'], ['self', 'ذاتية الخدمة']], sup)) +
      '<label class="check"><input id="s-smart" type="checkbox" data-ch="srch"' + (smart ? ' checked' : '') + '><span><b>دخول ذكي فقط</b><br><span class="xs muted">وحدات بقفل ذكي ورمز رقمي</span></span></label></div>';
    var html = '<div class="container" style="padding-top:24px;padding-bottom:24px"><div class="page-h"><div><h1>' + (city || 'كل المدن') + ' • ' + R.dLabel(ci) + ' ← ' + R.dLabel(co) + '</h1><p>' + R.nt(nights) + ' • ' + guests + ' ضيوف • <b class="green">' + availN + ' متاحة</b> من ' + list.length + ' نتيجة</p></div>' +
      '<div class="row"><label class="small muted b" for="s-sort">ترتيب:</label>' + sel('s-sort', [['best', 'الأنسب'], ['price', 'الأقل سعراً'], ['rating', 'الأعلى تقييماً']], sort).replace('class="select"', 'class="select" style="width:auto;height:40px"') + '</div></div>' +
      '<div class="dash" style="padding-top:0;grid-template-columns:300px minmax(0,1fr)"><aside>' + filters + '</aside><div>' +
      (list.length ? '<div class="units" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + list.map(function (x) {
        return R.ucard(x.p, { avail: x.avail, qs: qs }).replace('<div class="ucard-foot">', '<div class="soft xs mt-12 row between"><span>' + R.nt(nights) + ' × ' + sar(x.p.price) + '</span><b class="navy">' + sar(R.quote(x.p, ci, co).total) + ' شامل الضريبة</b></div><div class="ucard-foot">');
      }).join('') + '</div>' : '<div class="card">' + R.empty('search-x', 'لا توجد نتائج', 'جرّب تقليل عدد الضيوف أو رفع حد السعر', '<a class="btn btn-primary mt-16" href="#/search">مسح الفلاتر</a>') + '</div>') +
      '</div></div></div>' + compareTray();
    return R.guestShell(html);
  });
  A.maxLbl = function (el) { var l = R.$('#max-l'); if (l) l.textContent = sar(el.value); };
  A.guestStep = function (el) { var i = R.$('#s-g'); i.value = Math.max(1, Math.min(12, Number(i.value || 1) + Number(el.dataset.d))); A.srch(); };
  A.srch = function () {
    var ci = R.val('#s-in'), co = R.val('#s-out');
    if (co <= ci) { co = R.addDays(ci, 1); R.toast('تم ضبط تاريخ المغادرة تلقائياً', 'info'); }
    var p = { q: R.val('#s-q'), city: R.val('#s-city'), 'in': ci, out: co, guests: R.val('#s-g'), type: R.val('#s-type'), max: R.val('#s-max'), sup: R.val('#s-sup'), smart: R.$('#s-smart').checked ? '1' : '', sort: R.val('#s-sort') };
    var s = Object.keys(p).filter(function (k) { return p[k]; }).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
    history.replaceState(null, '', '#/search?' + s); R.render(true);
  };

  /* ---------- PROPERTY DETAIL ---------- */
  R.route('/property/:id', function (pr, q) {
    var p = R.prop(pr.id); if (!p) return R.guestShell('<div class="container"><div class="card mt-24">' + R.empty('home', 'الوحدة غير موجودة', '', '<a class="btn btn-primary mt-16" href="#/">العودة</a>') + '</div></div>');
    var U = R.UI; if (U.propId !== p.id) { U.propId = p.id; U.propTab = q.tab || 'details'; U.revSort = 'latest'; }
    var revs = R.DB.reviews.filter(function (r) { return r.propertyId === p.id; });
    var avg = revs.length ? (revs.reduce(function (s, r) { return s + r.rating; }, 0) / revs.length).toFixed(1) : p.rating;
    var fav = R.DB.favs.indexOf(p.id) >= 0, alert = R.DB.priceAlerts.indexOf(p.id) >= 0;
    var ci = q['in'] || R.addDays(R.today(), 3), co = q.out || R.addDays(R.today(), 5), g = Number(q.guests || 2);
    var qt = R.quote(p, ci, co), avail = R.isAvailable(p, ci, co);
    var tabs = [{ id: 'details', label: 'التفاصيل' }, { id: 'amenities', label: 'المرافق' }, { id: 'policies', label: 'السياسات' }, { id: 'reviews', label: 'التقييمات (' + revs.length + ')' }];
    var imgs = p.images;
    var gallery = '<div class="gallery"><button class="main" data-act="openGallery" data-i="0" aria-label="عرض الصور"><img src="' + imgs[0] + '" alt="' + esc(p.title) + '"></button>' +
      '<button class="side-img" data-act="openGallery" data-i="1" aria-label="صورة 2"><img src="' + (imgs[1] || imgs[0]) + '" alt=""></button>' +
      '<button class="side-img" data-act="openGallery" data-i="2" aria-label="صورة 3"><img src="' + (imgs[2] || imgs[0]) + '" alt=""><span class="more pill pill-white">' + ic('images', '', '▦') + 'كل الصور (' + imgs.length + ')</span></button></div>';
    var head = '<div class="row between wrap mt-24" style="align-items:flex-end"><div><div class="row wrap">' + (p.superhost ? '<span class="badge-host">' + ic('crown', '', '♛') + 'مضيف مميز</span>' : '') + (p.smartLock ? '<span class="pill pill-gold">' + ic('key-round', '', '⚿') + 'دخول ذكي</span>' : '') + '<span class="pill ' + (p.supervision === 'supervised' ? 'pill-navy' : 'pill-gray') + '">' + R.supLabel(p.supervision) + '</span></div>' +
      '<h1 class="h1 mt-8">' + esc(p.title) + '</h1><div class="row wrap muted small mt-4">' + ic('map-pin', 'ic-sm', '⌖') + esc(p.city + ' • ' + p.district) + '<span>•</span><span class="star">' + ic('star', 'ic-sm', '★') + '</span><b class="navy">' + avg + '</b> (' + revs.length + ' تقييم)</div></div>' +
      '<div class="row"><button class="btn btn-outline btn-sm" data-act="priceAlert" data-id="' + p.id + '" aria-pressed="' + alert + '">' + ic(alert ? 'bell-ring' : 'bell', 'ic-sm', '🔔') + (alert ? 'التنبيه مفعل' : 'نبهني') + '</button>' +
      '<button class="btn btn-outline btn-icon btn-sm" data-act="share" aria-label="مشاركة">' + ic('share-2', 'ic-sm', '⇪') + '</button>' +
      '<button class="btn btn-outline btn-icon btn-sm" data-act="toggleFav" data-id="' + p.id + '" aria-label="المفضلة" aria-pressed="' + fav + '">' + ic('heart', 'ic-sm' + (fav ? ' red' : ''), '♥') + '</button></div></div>';
    var tabBody = ({ details: detailsTab, amenities: amenitiesTab, policies: policiesTab, reviews: reviewsTab })[U.propTab](p, revs, avg);
    var book = '<div class="sticky-book"><div class="card card-p"><div class="row between"><div class="price" style="font-size:24px">' + sar(p.price) + ' <small>/ ليلة</small></div>' + (p.oldPrice ? '<span class="badge-disc">خصم ' + discount(p) + '%</span>' : '') + '</div>' + (p.oldPrice ? '<div class="old-price">' + sar(p.oldPrice) + '</div>' : '') +
      '<div class="grid g2 mt-16" style="gap:8px">' + R.field('الوصول', '<input type="date" id="pd-in" class="input" value="' + ci + '" min="' + R.today() + '" data-ch="pdDates">') + R.field('المغادرة', '<input type="date" id="pd-out" class="input" value="' + co + '" min="' + R.today() + '" data-ch="pdDates">') + '</div>' +
      '<div class="mt-8">' + R.field('الضيوف', '<select id="pd-g" class="select" data-ch="pdDates">' + range(1, p.guests).map(function (n) { return '<option value="' + n + '"' + (n === g ? ' selected' : '') + '>' + n + ' ضيوف</option>'; }).join('') + '</select>') + '</div>' +
      (avail ? '<div class="notice green mt-12 small">' + ic('calendar-check', '', '✓') + '<div>متاحة في التواريخ المختارة</div></div>' : '<div class="notice red mt-12 small">' + ic('calendar-x', '', '×') + '<div>غير متاحة في هذه التواريخ — جرّب تواريخ أخرى</div></div>') +
      '<div class="mt-12">' + R.kv(R.nt(qt.nights) + ' × ' + sar(p.price), sar(qt.sub)) + R.kv('رسوم التنظيف', sar(qt.cleaning)) + R.kv('ضريبة القيمة المضافة 15%', sar(qt.vat)) + R.kv('الإجمالي', sar(qt.total), 'total') + '</div>' +
      '<div class="xs gold-dark b mt-4">+ كاش باك ' + sar(qt.cashback) + ' لمحفظتك • ' + qt.points + ' نقطة</div>' +
      '<button class="btn btn-primary btn-lg btn-block mt-16" data-act="startBooking" data-id="' + p.id + '"' + (avail ? '' : ' disabled') + '>احجز الآن</button>' +
      '<div class="soft-lg mt-16"><div class="b small mb-8">مزايا الحجز مع رواف</div>' + ['دفع آمن بالمحفظة أو مدى أو Apple Pay', 'مفتاح رقمي فوري بعد التحقق عبر نفاذ', 'كاش باك 5% + نقاط ولاء', 'فاتورة إلكترونية ضريبية', 'مساعد شخصي على مدار الساعة'].map(function (t) { return '<div class="row small mt-4"><span class="green">' + ic('check-circle-2', 'ic-sm', '✓') + '</span>' + t + '</div>'; }).join('') + '</div></div>' +
      '<div class="card card-p mt-16"><div class="row gap-12"><div class="avatar">' + esc(p.owner[0]) + '</div><div class="grow"><div class="xs muted b">المضيف</div><div class="bb row">' + esc(p.owner) + (p.superhost ? '<span class="gold">' + ic('crown', 'ic-sm', '♛') + '</span>' : '') + '</div><div class="xs muted">يرد عادة خلال 10 دقائق • ترخيص ' + p.license + '</div></div></div>' +
      '<div class="row mt-16"><a class="btn btn-wa btn-sm grow" href="https://wa.me/966500000000?text=' + encodeURIComponent('استفسار عن ' + p.title) + '" target="_blank" rel="noopener">' + ic('message-circle', 'ic-sm', '✆') + 'تواصل واتساب</a><button class="btn btn-ghost btn-sm" data-act="toggleChat">' + ic('bot', 'ic-sm', '') + 'المساعد</button></div></div></div>';
    var html = '<div class="container" style="padding-top:20px;padding-bottom:24px"><nav class="row small muted" aria-label="مسار التنقل"><a href="#/" class="b">الوحدات</a>' + ic('chevron-left', 'ic-sm', '‹') + '<span>' + esc(p.city) + '</span>' + ic('chevron-left', 'ic-sm', '‹') + '<span class="truncate">' + esc(p.title) + '</span></nav><div class="mt-12">' + gallery + '</div>' + head +
      '<div class="grid g-2-1 mt-24" style="gap:24px;align-items:start"><div class="card card-p"><div class="tabs-line mb-16">' + tabs.map(function (t) { return '<button class="tab ' + (U.propTab === t.id ? 'on' : '') + '" data-act="propTab" data-id="' + t.id + '">' + t.label + '</button>'; }).join('') + '</div>' + tabBody + '</div>' + book + '</div></div>';
    return R.guestShell(html);
  });
  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
  function detailsTab(p, revs, avg) {
    return '<div class="row wrap">' + [['users', p.guests + ' ضيوف'], ['bed-double', p.bedrooms + ' غرف نوم'], ['bath', p.baths + ' دورات مياه'], ['star', avg + ' (' + revs.length + ' تقييم)']].map(function (x) { return '<span class="chip chip-sm" style="cursor:default">' + ic(x[0], 'ic-sm', '•') + x[1] + '</span>'; }).join('') + '</div>' +
      '<p class="lh mt-16">' + esc(p.desc) + '</p>' +
      '<div class="grid g2 mt-16"><div class="soft-lg"><div class="row b">' + ic('key-round', 'gold-dark', '⚿') + (p.smartLock ? 'دخول ذكي' : 'استلام المفتاح') + '</div><p class="small muted mt-4 lh">' + (p.smartLock ? 'يصلك رمز رقمي بعد التحقق عبر نفاذ، ويمكنك فتح الباب من التطبيق. صالح من 3:00 م يوم الوصول حتى 12:00 م يوم المغادرة.' : 'يستقبلك المشرف الميداني ويسلمك المفتاح. نرسل لك رقمه قبل الوصول بساعة.') + '</p></div>' +
      '<div class="soft-lg"><div class="row b">' + ic(p.supervision === 'supervised' ? 'user-check' : 'smartphone', 'gold-dark', '•') + R.supLabel(p.supervision) + '</div><p class="small muted mt-4 lh">' + (p.supervision === 'supervised' ? 'مشرف ميداني يفحص جاهزية الوحدة قبل وصولك ويكون متاحاً عند الحاجة.' : 'تجربة ذاتية بالكامل: دخول ومغادرة بدون تواصل، مع دعم فوري عبر المساعد الشخصي.') + '</p></div></div>' +
      '<h3 class="h3 mt-24">الموقع</h3><div class="map-ph mt-12" role="img" aria-label="خريطة توضيحية"><div class="map-pin">' + ic('home', '', '⌂') + '</div><span class="pill pill-white" style="position:absolute;bottom:12px;right:12px">' + esc(p.city + ' — ' + p.district) + '</span><button class="btn btn-primary btn-xs" style="position:absolute;bottom:12px;left:12px" data-act="toast" data-msg="سيتم فتح الموقع الدقيق في الخرائط بعد تأكيد الحجز">فتح في الخرائط</button></div><p class="xs muted mt-8">يظهر الموقع الدقيق ورقم المبنى بعد تأكيد الحجز.</p>';
  }
  function amenitiesTab(p) {
    return '<div class="grid g2">' + p.amenities.concat(p.smartLock ? ['قفل ذكي'] : []).map(function (a) { return '<div class="amen"><span class="gl">✦</span>' + esc(a) + '</div>'; }).join('') + '</div>';
  }
  function policiesTab(p) {
    var sec = function (icon, t, items) { return '<div class="soft-lg"><div class="row bb mb-8">' + ic(icon, 'gold-dark', '•') + t + '</div>' + items.map(function (i) { return '<div class="row-top small mt-4" style="gap:8px"><span class="gold">•</span><span class="lh">' + i + '</span></div>'; }).join('') + '</div>'; };
    return '<div class="stack">' +
      sec('clock', 'أوقات الدخول والمغادرة', ['الدخول من الساعة 3:00 م', 'المغادرة حتى الساعة 12:00 م', 'الدخول المبكر والمغادرة المتأخرة حسب التوفر برسوم إضافية']) +
      sec('scroll-text', 'قواعد الوحدة', ['يمنع التدخين داخل الوحدة', 'يمنع إقامة الحفلات والمناسبات بدون موافقة مسبقة', 'ساعات الهدوء من 11:00 م حتى 7:00 ص', 'الحد الأقصى ' + p.guests + ' ضيوف — يجب أن يكون جميع الضيوف مسجلين', 'الحيوانات الأليفة غير مسموحة']) +
      sec('shield-alert', 'سياسة الأضرار', ['يتم فحص الوحدة بعد كل مغادرة من المشرف الميداني مع توثيق بالصور', 'في حال وجود ضرر يتم إشعار الضيف بالصور والتقدير خلال 48 ساعة', 'يحق للضيف الاعتراض خلال 72 ساعة، وتراجع رواف القضية بحيادية', 'تُخصم قيمة الضرر المعتمد من وسيلة الدفع أو المحفظة']) +
      sec('calendar-x', 'سياسة الإلغاء (مرنة)', ['استرداد كامل حتى 48 ساعة قبل الوصول', 'استرداد 50% إذا تم الإلغاء خلال 48 ساعة من الوصول', 'لا استرداد بعد وقت الدخول', 'الاسترداد للمحفظة فوري، وللبطاقة خلال 5–10 أيام عمل']) +
      sec('id-card', 'الهوية والبيانات', ['التحقق من الهوية عبر نفاذ إلزامي قبل إصدار المفتاح الرقمي', 'تُرسل بيانات النزلاء إلى منصة شموس وفق الأنظمة', 'بياناتك محمية ولا تُشارك مع المالك إلا بالقدر اللازم للإقامة']) + '</div>';
  }
  function reviewsTab(p, revs, avg) {
    var s = R.UI.revSort;
    var sorted = revs.slice().sort(function (a, b) { if (s === 'highest') return b.rating - a.rating; if (s === 'photos') return (b.images ? b.images.length : 0) - (a.images ? a.images.length : 0); return a.date < b.date ? 1 : -1; });
    if (s === 'photos') sorted = sorted.filter(function (r) { return r.images && r.images.length; });
    var dist = [5, 4, 3, 2, 1].map(function (st) { var c = revs.filter(function (r) { return r.rating === st; }).length; return { st: st, pct: revs.length ? Math.round(c / revs.length * 100) : 0 }; });
    var canReview = R.DB.user && R.DB.bookings.some(function (b) { return b.propertyId === p.id && b.status === 'مكتمل'; });
    return '<div class="grid g2" style="align-items:center"><div class="center soft-lg"><div style="font-size:48px;font-weight:900;line-height:1">' + avg + '</div><div class="row" style="justify-content:center">' + R.stars(avg) + '</div><div class="small muted mt-4">' + revs.length + ' تقييم • ' + p.reviewsCount + ' إجمالي على المنصة</div></div>' +
      '<div class="stack-sm">' + dist.map(function (d) { return '<div class="rate-bar"><span class="b">' + d.st + '★</span><div class="bar"><div style="width:' + d.pct + '%"></div></div><span class="xs muted">' + d.pct + '%</span></div>'; }).join('') + '</div></div>' +
      (canReview ? '<div class="notice gold mt-16">' + ic('star', '', '★') + '<div class="grow">أقمت في هذه الوحدة — شارك تقييمك واربح 50 نقطة</div><a class="btn btn-primary btn-xs" href="#/review/' + R.DB.bookings.find(function (b) { return b.propertyId === p.id && b.status === 'مكتمل'; }).id + '">قيّم الآن</a></div>' : '') +
      '<div class="row wrap mt-16">' + [['latest', 'الأحدث'], ['highest', 'الأعلى تقييماً'], ['photos', 'مع صور']].map(function (x) { return '<button class="chip chip-sm ' + (s === x[0] ? 'on' : '') + '" data-act="revSort" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="stack-sm mt-16">' + (sorted.length ? sorted.map(function (r) {
        return '<div class="review"><div class="row between"><div class="row"><div class="avatar avatar-sm">' + esc(r.userName[0]) + '</div><div><div class="b small">' + esc(r.userName) + '</div><div class="xs muted">' + r.date + '</div></div></div>' + R.stars(r.rating) + '</div><p class="small lh mt-8">' + esc(r.comment) + '</p>' +
          (r.images ? '<div class="thumbs-row mt-8">' + r.images.map(function (u) { return '<img src="' + u + '" alt="صورة من الضيف">'; }).join('') + '</div>' : '') +
          (r.ownerReply ? '<div class="owner-reply"><div class="xs b gold-dark">رد المالك:</div>' + esc(r.ownerReply) + '</div>' : '') + '</div>';
      }).join('') : '<div class="empty small">لا توجد تقييمات بهذا الفلتر</div>') + '</div>';
  }
  A.propTab = function (el) { R.UI.propTab = el.dataset.id; R.rerender(); };
  A.revSort = function (el) { R.UI.revSort = el.dataset.v; R.rerender(); };
  A.pdDates = function () {
    var ci = R.val('#pd-in'), co = R.val('#pd-out'); if (co <= ci) co = R.addDays(ci, 1);
    history.replaceState(null, '', '#/property/' + R.cur.params.id + '?in=' + ci + '&out=' + co + '&guests=' + R.val('#pd-g')); R.render(true);
  };
  A.priceAlert = function (el) {
    if (!R.DB.user) { openLogin(); return; }
    var id = Number(el.dataset.id), a = R.DB.priceAlerts, i = a.indexOf(id);
    if (i >= 0) { a.splice(i, 1); R.toast('تم إيقاف تنبيه السعر'); } else { a.push(id); R.toast('تم تفعيل تنبيه السعر! سنخبرك إذا انخفض السعر.', 'ok'); }
    R.save(); R.rerender();
  };
  A.share = function () {
    var url = location.href;
    if (navigator.share) { navigator.share({ title: 'رواف', url: url }).catch(function () { }); return; }
    R.copy(url, 'تم نسخ رابط الوحدة');
  };
  A.openGallery = function (el) {
    var p = R.prop(R.cur.params.id), i = Number(el.dataset.i || 0);
    R.modal({ title: esc(p.title), sub: 'صور مطابقة للواقع • تم التحقق من الجودة', size: 'xl', body: '<div class="stack-sm">' + p.images.map(function (u, k) { return '<img src="' + u.replace('w=800', 'w=1400') + '" alt="صورة ' + (k + 1) + '" style="width:100%;border-radius:18px;max-height:560px;object-fit:cover" id="gal-' + k + '">'; }).join('') + '</div>',
      onOpen: function () { setTimeout(function () { var t = document.getElementById('gal-' + i); if (t) t.scrollIntoView({ block: 'start' }); }, 60); } });
  };
  A.startBooking = function (el) {
    var id = el.dataset.id, qs = '?in=' + R.val('#pd-in') + '&out=' + R.val('#pd-out') + '&guests=' + R.val('#pd-g');
    R.UI.bk = null;
    if (!R.DB.user) { openLogin('#/book/' + id + qs); return; }
    R.go('#/book/' + id + qs);
  };

  /* ---------- LOGIN / REGISTER + OTP ---------- */
  var L = {};
  function openLogin(after, mode) {
    L = { mode: mode || 'login', after: after || null, phone: '', name: '' };
    R.modal({ title: 'مرحباً بك في رواف', sub: 'حساب عميل متكامل • محفظة + نقاط + مفتاح رقمي', size: 'sm', body: loginBody() });
  }
  R.openLogin = openLogin;
  function loginBody() {
    return '<div class="tabs mb-16" style="width:100%">' + ['login', 'register'].map(function (m) { return '<button class="tab grow ' + (L.mode === m ? 'on' : '') + '" style="justify-content:center" data-act="loginMode" data-v="' + m + '">' + (m === 'login' ? 'تسجيل دخول' : 'حساب جديد') + '</button>'; }).join('') + '</div><div class="stack">' +
      (L.mode === 'register' ? R.field('الاسم الكامل', '<input id="lg-name" class="input" autocomplete="name" placeholder="مثال: سعود العتيبي" value="' + esc(L.name) + '">') : '') +
      R.field('رقم الجوال', '<input id="lg-phone" class="input ltr" style="text-align:right;display:block" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="05xxxxxxxx" value="' + esc(L.phone) + '" data-enter="sendOtp">', 'سنرسل رمز تحقق مكوّن من 4 أرقام عبر SMS') +
      '<div id="lg-err" class="err-msg"></div>' +
      '<button class="btn btn-primary btn-lg btn-block" data-act="sendOtp">' + (L.mode === 'login' ? 'إرسال رمز التحقق' : 'إنشاء حساب + 100 نقطة ترحيبية') + '</button>' +
      '<p class="xs muted center lh">بالمتابعة توافق على شروط رواف وسياسة الخصوصية. للتجربة: أي رقم يبدأ بـ 05 والرمز 1234.</p></div>';
  }
  A.openLogin = function () { openLogin(); };
  A.needLogin = function (el) { if (R.DB.user) { R.go(el.dataset.href); return; } openLogin(el.dataset.href); };
  A.loginMode = function (el) { L.mode = el.dataset.v; L.phone = R.val('#lg-phone'); L.name = R.val('#lg-name'); R.modalSet(loginBody()); };
  A.sendOtp = function () {
    var ph = R.val('#lg-phone').replace(/\s/g, ''), nm = R.val('#lg-name'), err = R.$('#lg-err');
    if (!/^05\d{8}$/.test(ph)) { err.textContent = 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'; R.$('#lg-phone').classList.add('err'); return; }
    if (L.mode === 'register' && nm.length < 3) { err.textContent = 'الاسم مطلوب'; return; }
    L.phone = ph; L.name = nm; L.left = 45;
    R.modalSet('<div class="center"><div class="li-ic gold" style="margin:0 auto;width:56px;height:56px">' + ic('message-square-lock', 'ic-lg', '✉') + '</div><h3 class="h3 mt-12">أدخل رمز التحقق</h3><p class="small muted mt-4">أرسلنا رمزاً إلى <b class="ltr navy">' + ph + '</b> <button class="link xs" data-act="loginMode" data-v="' + L.mode + '">تعديل</button></p>' +
      '<div class="otp mt-16" id="otp">' + [0, 1, 2, 3].map(function (i) { return '<input inputmode="numeric" maxlength="1" aria-label="الرقم ' + (i + 1) + '" data-in="otpIn" data-i="' + i + '">'; }).join('') + '</div>' +
      '<div id="lg-err" class="err-msg mt-8"></div><p class="xs muted mt-8">الرمز التجريبي: <b class="kbd">1234</b></p>' +
      '<button class="btn btn-primary btn-lg btn-block mt-16" data-act="verifyOtp">تحقق ودخول</button>' +
      '<p class="small muted mt-12" id="otp-timer">إعادة الإرسال بعد <b>45</b> ثانية</p></div>');
    clearInterval(L.timer);
    L.timer = setInterval(function () { var t = R.$('#otp-timer'); if (!t) { clearInterval(L.timer); return; } L.left--; if (L.left <= 0) { clearInterval(L.timer); t.innerHTML = '<button class="link" data-act="resendOtp">إعادة إرسال الرمز</button>'; } else t.innerHTML = 'إعادة الإرسال بعد <b>' + L.left + '</b> ثانية'; }, 1000);
  };
  A.resendOtp = function () { R.toast('تم إرسال رمز جديد', 'ok'); L.left = 45; A.sendOtp(); };
  A.otpIn = function (el) {
    el.value = el.value.replace(/\D/g, '').slice(-1);
    var i = Number(el.dataset.i), all = R.$$('#otp input');
    if (el.value && i < 3) all[i + 1].focus();
    if (all.every(function (x) { return x.value; })) A.verifyOtp();
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && e.target.matches && e.target.matches('#otp input') && !e.target.value) { var i = Number(e.target.dataset.i); if (i > 0) R.$$('#otp input')[i - 1].focus(); } });
  A.verifyOtp = function () {
    var code = R.$$('#otp input').map(function (x) { return x.value; }).join('');
    if (code.length < 4) { R.$('#lg-err').textContent = 'أدخل الرمز كاملاً'; return; }
    if (code !== '1234') { R.$('#lg-err').textContent = 'الرمز غير صحيح — استخدم 1234 في النموذج'; R.$$('#otp input').forEach(function (x) { x.value = ''; }); R.$('#otp input').focus(); return; }
    clearInterval(L.timer);
    var isNew = L.mode === 'register';
    R.login(isNew);
    if (isNew && L.name) { R.DB.user.name = L.name; }
    R.DB.user.phone = L.phone; R.save();
    R.closeModal();
    R.toast(isNew ? 'مرحباً ' + esc(R.DB.user.name) + '! أضفنا 100 نقطة ترحيبية لحسابك' : 'أهلاً بعودتك يا ' + esc(R.DB.user.name.split(' ')[0]), 'ok');
    if (L.after) R.go(L.after); else R.rerender();
  };

  /* ---------- NOTIFICATIONS ---------- */
  A.toggleNotif = function (el) {
    var wrap = el.parentElement, ex = R.$('#notif-pop');
    if (ex) { ex.remove(); R.UI.notifOpen = false; return; }
    R.UI.notifOpen = true;
    var ns = R.DB.notifications;
    var d = document.createElement('div'); d.className = 'pop'; d.id = 'notif-pop'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'الإشعارات');
    d.innerHTML = '<div class="pop-h"><b>الإشعارات</b><button class="link xs" data-act="notifReadAll">تحديد الكل كمقروء</button></div><div style="max-height:380px;overflow-y:auto">' +
      (ns.length ? ns.map(function (n) { return '<button class="notif ' + (n.read ? '' : 'unread') + '" data-act="notifGo" data-id="' + n.id + '"><span class="li-ic gold">' + ic(n.icon, 'ic-sm', '•') + '</span><span class="grow"><span class="b small t" style="display:block">' + esc(n.title) + '</span><span class="xs muted" style="display:block">' + esc(n.body) + '</span><span class="xs muted-2">' + n.time + '</span></span></button>'; }).join('') : R.empty('bell-off', 'لا توجد إشعارات')) + '</div>';
    wrap.appendChild(d); R.icons();
  };
  A.notifReadAll = function () { R.DB.notifications.forEach(function (n) { n.read = true; }); R.save(); R.rerender(); R.toast('تم تحديد كل الإشعارات كمقروءة', 'ok'); };
  A.notifGo = function (el) {
    var n = R.DB.notifications.find(function (x) { return x.id === el.dataset.id; }); n.read = true; R.save();
    if (!R.DB.user && n.href.indexOf('#/property') !== 0) { openLogin(n.href); return; }
    R.go(n.href);
  };

  /* ---------- PERSONAL ASSISTANT ---------- */
  var CHIPS = ['كيف أدخل الشقة؟', 'كلمة مرور الإنترنت', 'أقرب صيدلية', 'أحتاج مناشف إضافية', 'القفل لا يستجيب', 'وقت المغادرة'];
  function activeStay() { return R.DB.user && R.DB.bookings.find(function (b) { return b.status === 'جارية'; }); }
  R.chatPanel = function () {
    var U = R.UI;
    if (!U.chat.length) {
      var st = activeStay();
      U.chat.push({ from: 'bot', text: 'أهلاً' + (R.DB.user ? ' ' + R.DB.user.name.split(' ')[0] : '') + ' 👋 أنا مساعدك الشخصي في رواف.\n' + (st ? 'أرى أنك تقيم الآن في «' + st.title + '». كيف أقدر أخدمك؟' : 'اسألني عن الحجز، الدخول الذكي، أو أي شيء عن إقامتك.') });
    }
    return '<section class="chat no-print" role="dialog" aria-label="المساعد الشخصي"><div class="chat-h"><span class="logo-mark" style="width:40px;height:40px">ر</span><div class="grow"><div class="bb">المساعد الشخصي</div><div class="xs row gap-4" style="color:rgba(255,255,255,.7)"><span class="dot dot-green"></span>متصل الآن • يرد فوراً</div></div><button class="btn btn-glass btn-icon btn-sm" data-act="toggleChat" aria-label="إغلاق المساعد">' + ic('x', 'ic-sm', '×') + '</button></div>' +
      '<div class="chat-b" id="chat-body">' + U.chat.map(function (m) { return '<div class="msg ' + m.from + '">' + (m.html ? m.text : esc(m.text)) + '</div>'; }).join('') + (U.typing ? '<div class="msg bot typing" aria-label="يكتب"><span></span><span></span><span></span></div>' : '') + '</div>' +
      '<div class="chat-chips">' + CHIPS.map(function (c) { return '<button class="chip chip-sm" data-act="chatChip" data-v="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
      '<div class="chat-f"><input id="chat-input" class="input" placeholder="اكتب رسالتك..." aria-label="رسالة" data-enter="chatSend"><button class="btn btn-primary btn-icon" data-act="chatSend" aria-label="إرسال">' + ic('send', 'ic-sm', '➤') + '</button></div></section>';
  };
  function reply(t) {
    var st = activeStay(), p = st ? R.prop(st.propertyId) : null;
    var has = function () { for (var i = 0; i < arguments.length; i++) if (t.indexOf(arguments[i]) >= 0) return true; return false; };
    if (has('القفل', 'لا يستجيب', 'الباب', 'ما يفتح')) {
      var tk = 'T-' + Math.floor(4000 + Math.random() * 999);
      R.DB.tickets.unshift({ id: tk, subject: 'القفل لا يستجيب', booking: st ? st.id : '—', time: R.nowTS(), status: 'مفتوح' });
      R.DB.incidents.unshift({ id: 'IN-' + Math.floor(40 + Math.random() * 50), propertyId: p ? p.id : 1, title: 'بلاغ ضيف: القفل لا يستجيب', category: 'قفل ذكي', severity: 'عالية', status: 'مفتوح', reportedBy: (R.DB.user ? R.DB.user.name : 'ضيف') + ' (ضيف)', time: R.nowTS() });
      R.save();
      return [{ text: 'آسفين على الإزعاج! جرّب هذي الخطوات:\n1) المس لوحة القفل لتنشيطها ثم أدخل الرمز متبوعاً بـ #\n2) أو اضغط «افتح الباب» من صفحة إقامتي (يعمل عبر الإنترنت)\n3) تأكد من سحب الباب قليلاً نحوك أثناء الفتح' },
        { from: 'sys', text: 'تم تحويلك لفريق الدعم • تذكرة ' + tk + ' • سيتواصل معك المشرف خلال 10 دقائق' },
        { text: 'إذا ما زال لا يعمل، أصدرنا لك رمز طوارئ مؤقت صالح لمدة ساعة: 580 214#\nرقم المشرف المناوب: 0561112233' }];
    }
    if (has('أدخل', 'الدخول', 'ادخل', 'دخول')) return [{ text: st ? 'للدخول إلى «' + st.title + '»:\n1) من صفحة «إقامتي الحالية» اضغط «افتح الباب»\n2) أو أدخل رمزك على لوحة القفل: ' + st.keyCode + '#\n3) الرمز صالح حتى 12:00 م يوم ' + st.checkOut + '\n\nالمدخل: البوابة الرئيسية ثم الباب الخشبي على اليمين.' : 'بعد تأكيد حجزك والتحقق عبر نفاذ، يصلك مفتاح رقمي صالح من 3:00 م يوم الوصول. تقدر تفتح الباب من التطبيق أو بإدخال الرمز على لوحة القفل.' }];
    if (has('إنترنت', 'انترنت', 'واي فاي', 'wifi', 'الشبكة')) return [{ text: p ? 'شبكة الواي فاي: ' + p.wifi.ssid + '\nكلمة المرور: ' + p.wifi.pass + '\n\nالراوتر في خزانة الصالة إذا احتجت إعادة تشغيله.' : 'تظهر بيانات الواي فاي في صفحة «إقامتي الحالية» بعد تسجيل الدخول لوحدتك.' }];
    if (has('صيدلية', 'دواء', 'مستشفى')) return [{ text: 'أقرب صيدلية: صيدلية 24 ساعة — تبعد 650 م (8 دقائق مشياً)، مفتوحة الآن.\nأقرب مستشفى: 4.2 كم (10 دقائق بالسيارة).\nللطوارئ اتصل على 997.' }];
    if (has('مناشف', 'منشفة', 'تنظيف', 'مستلزمات')) {
      var rq = 'REQ-' + Math.floor(100 + Math.random() * 800);
      R.DB.incidents.unshift({ id: rq, propertyId: p ? p.id : 1, title: 'طلب مناشف إضافية', category: 'خدمة', severity: 'منخفضة', status: 'مفتوح', reportedBy: (R.DB.user ? R.DB.user.name : 'ضيف') + ' (ضيف)', time: R.nowTS() }); R.save();
      return [{ text: 'تم ✅ سجلت طلبك رقم ' + rq + ' لـ 4 مناشف إضافية.\nسيوصلها المشرف خلال 45 دقيقة تقريباً، وسيرن الجرس قبل الدخول.' }];
    }
    if (has('مغادرة', 'أغادر', 'الخروج', 'checkout')) return [{ text: 'وقت المغادرة 12:00 ظهراً' + (st ? ' يوم ' + st.checkOut : '') + '.\nتقدر تطلب مغادرة متأخرة حتى 3:00 م (150 ر.س) من صفحة إقامتي، أو تسجل خروجك ذاتياً من نفس الصفحة.' }];
    if (has('موظف', 'دعم', 'بشري', 'اتصال')) return [{ from: 'sys', text: 'تم تحويل المحادثة لفريق الدعم • متوسط الانتظار دقيقتان' }, { text: 'تقدر أيضاً تتواصل معنا واتساب على 920000000' }];
    if (has('حجز', 'إلغاء', 'الغاء')) return [{ text: 'تقدر تدير حجوزاتك من «حسابي ← حجوزاتي»: إلغاء، إعادة حجز، أو تحميل الفاتورة. سياسة الإلغاء المرنة تسمح باسترداد كامل حتى 48 ساعة قبل الوصول.' }];
    if (has('شكرا', 'شكراً', 'مشكور')) return [{ text: 'العفو! إقامة سعيدة 🌙' }];
    return [{ text: 'ما فهمت طلبك تماماً 🙏 جرّب أحد الاقتراحات بالأسفل، أو اكتب «دعم» للتحدث مع موظف.' }];
  }
  function send(text) {
    if (!text) return; var U = R.UI;
    U.chat.push({ from: 'me', text: text }); U.typing = true; R.renderFloat();
    setTimeout(function () { U.typing = false; reply(text).forEach(function (m) { U.chat.push({ from: m.from || 'bot', text: m.text }); }); R.renderFloat(); var i = R.$('#chat-input'); if (i) i.focus(); }, 750);
  }
  A.chatSend = function () { var i = R.$('#chat-input'); var t = i ? i.value.trim() : ''; send(t); };
  A.chatChip = function (el) { send(el.dataset.v); };
})();
