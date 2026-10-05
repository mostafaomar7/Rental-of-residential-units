/* رواف — بيانات توضيحية (Mock data). كل البيانات في هذا الملف وهمية لأغراض العرض فقط. */
(function () {
  'use strict';
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var T = new Date(); T.setHours(12, 0, 0, 0);
  function D(off) { var d = new Date(T); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function TS(off, h, m) { return D(off) + ' ' + pad(h) + ':' + pad(m || 0); }
  var U = 'https://images.unsplash.com/';
  function img(id, w) { return U + id + '?w=' + (w || 800) + '&auto=format&fit=crop&q=70'; }
  var P = {
    A: 'photo-1600596542815-ffad4c1539a9', B: 'photo-1600585154340-be6161a56a0c', C: 'photo-1600607687939-ce8a6c25118c',
    D: 'photo-1600566753086-00f18fb6b3ea', E: 'photo-1600047509807-ba8f99d2cdde', F: 'photo-1512917774080-9991f1c4c750',
    G: 'photo-1502672260266-1c1ef2d93688', H: 'photo-1522708323590-d24dbb6b0267', I: 'photo-1560448204-e02f11c3d0e2',
    J: 'photo-1566073771259-6a8506099945', K: 'photo-1582719478250-c89cae4dc85b', L: 'photo-1613490493576-7fde63acd811',
    M: 'photo-1505693416388-ac5ce068fe85', N: 'photo-1618773928121-c32242e63f39', O: 'photo-1540518614846-7eded433c457',
    Pk: 'photo-1556911220-bff31c812dba', Q: 'photo-1552321554-5fefe8c9ef14'
  };
  function imgs() { return Array.prototype.slice.call(arguments).map(function (k) { return img(P[k]); }); }

  var TYPES = { apartment: 'شقق', hotel: 'فنادق', unit: 'وحدات سكنية', villa: 'فلل', chalet: 'شاليهات' };
  var OPS_STATUS = ['متاحة', 'محجوزة', 'قيد التجهيز', 'فحص بعد المغادرة', 'قيد النشر', 'موقوفة'];

  function lock(provider, status, battery, sync) { return { provider: provider, model: provider === 'TTLock' ? 'TTLock S31 Pro' : provider === 'Igloohome' ? 'Igloohome Deadbolt 2S' : 'Nuki Smart Lock 4', status: status, battery: battery, lastSync: sync }; }

  var properties = [
    { id: 1, title: 'فيلا فاخرة بإطلالة بحرية - جدة', city: 'جدة', district: 'أبحر الشمالية', type: 'villa', price: 1200, oldPrice: 1500, rating: 4.9, reviewsCount: 24, images: imgs('A', 'B', 'C', 'M', 'Q'), guests: 8, bedrooms: 4, baths: 5, cleaning: 250, amenities: ['مسبح', 'مطبخ مجهز', 'واي فاي', 'موقف', 'شاطئ خاص', 'تكييف مركزي', 'شواية'], owner: 'أحمد الغامدي', superhost: true, smartLock: true, supervision: 'supervised', status: 'محجوزة', occupancy: 86, lock: lock('TTLock', 'online', 78, TS(0, 11, 42)), wifi: { ssid: 'Rawaaf-Villa-Abhur', pass: 'Sea@2026' }, license: '10024871', desc: 'فيلا فاخرة بتصميم عصري على شاطئ أبحر الشمالية، مطابقة للصور 100%، مفروشة بالكامل مع مسبح خاص وشاطئ خاص. مناسبة للعائلات والمناسبات الصغيرة، مع مشرف ميداني يتابع جاهزية الوحدة قبل وصولك.' },
    { id: 2, title: 'شاليه مودرن وسط النخيل - الرياض', city: 'الرياض', district: 'الدرعية', type: 'chalet', price: 850, rating: 4.8, reviewsCount: 18, images: imgs('B', 'D', 'Pk', 'O'), guests: 6, bedrooms: 3, baths: 3, cleaning: 180, amenities: ['مسبح', 'جلسة خارجية', 'شواية', 'واي فاي', 'موقف'], owner: 'سارة العتيبي', smartLock: true, supervision: 'self', status: 'متاحة', occupancy: 72, lock: lock('Igloohome', 'online', 64, TS(0, 11, 30)), wifi: { ssid: 'Palm-Chalet', pass: 'Diriyah#85' }, license: '10031552', desc: 'شاليه هادئ وسط مزارع النخيل في الدرعية، دخول ذاتي كامل بالرمز الرقمي بدون الحاجة لاستلام مفاتيح.' },
    { id: 3, title: 'كوخ جبلي بديكور خشبي - أبها', city: 'أبها', district: 'السودة', type: 'chalet', price: 650, rating: 4.9, reviewsCount: 31, images: imgs('C', 'E', 'M'), guests: 4, bedrooms: 2, baths: 2, cleaning: 120, amenities: ['مدفأة', 'إطلالة جبلية', 'مطبخ', 'واي فاي'], owner: 'خالد القحطاني', superhost: true, smartLock: false, supervision: 'supervised', status: 'قيد التجهيز', occupancy: 64, lock: null, wifi: { ssid: 'Soudah-Cabin', pass: 'Cloud650' }, license: '10019934', desc: 'كوخ خشبي دافئ بين الضباب في السودة، استلام المفتاح من المشرف الميداني عند الوصول.' },
    { id: 4, title: 'شقة فندقية فاخرة - الخبر', city: 'الخبر', district: 'كورنيش الخبر', type: 'hotel', price: 480, rating: 4.7, reviewsCount: 12, images: imgs('D', 'K', 'N', 'Q'), guests: 3, bedrooms: 1, baths: 1, cleaning: 90, amenities: ['مسبح مشترك', 'جيم', 'واي فاي', 'خدمة غرف'], owner: 'نورة الدوسري', smartLock: true, supervision: 'self', status: 'فحص بعد المغادرة', occupancy: 91, lock: lock('Nuki', 'offline', 12, TS(-1, 22, 5)), wifi: { ssid: 'Corniche-Suites', pass: 'Khobar480' }, license: '10040218', desc: 'شقة فندقية على الكورنيش مباشرة بخدمات فندقية ودخول ذكي.' },
    { id: 5, title: 'استراحة ريفية كبيرة للعائلات', city: 'القصيم', district: 'عنيزة', type: 'chalet', price: 720, oldPrice: 900, rating: 4.6, reviewsCount: 9, images: imgs('E', 'L'), guests: 12, bedrooms: 5, baths: 4, cleaning: 200, amenities: ['ملعب', 'مسبح', 'مجلس', 'مطبخ كبير'], owner: 'فهد المطيري', smartLock: false, supervision: 'supervised', status: 'متاحة', occupancy: 48, lock: null, wifi: { ssid: 'Unaizah-Rest', pass: 'Family720' }, license: '10012077', desc: 'استراحة واسعة للعائلات مع ملعب ومسبح ومجلس خارجي.' },
    { id: 6, title: 'فيلا مودرن بتصميم معماري فريد', city: 'جدة', district: 'الشفا', type: 'villa', price: 1400, rating: 5, reviewsCount: 42, images: imgs('F', 'A', 'C', 'O'), guests: 10, bedrooms: 6, baths: 6, cleaning: 300, amenities: ['مسبح إنفينيتي', 'سينما', 'واي فاي', 'شيف'], owner: 'رواف للضيافة', superhost: true, smartLock: true, supervision: 'supervised', status: 'متاحة', occupancy: 79, lock: lock('TTLock', 'online', 23, TS(0, 11, 50)), wifi: { ssid: 'Shafa-Villa', pass: 'Design1400' }, license: '10008810', desc: 'تحفة معمارية بمسبح إنفينيتي وسينما منزلية وخدمة شيف عند الطلب.' },
    { id: 7, title: 'شقة عصرية في حي الملقا - الرياض', city: 'الرياض', district: 'الملقا', type: 'apartment', price: 380, rating: 4.7, reviewsCount: 27, images: imgs('G', 'H', 'M'), guests: 3, bedrooms: 1, baths: 1, cleaning: 80, amenities: ['واي فاي', 'مطبخ', 'موقف', 'تلفزيون ذكي'], owner: 'رواف للضيافة', smartLock: true, supervision: 'self', status: 'محجوزة', occupancy: 88, lock: lock('Igloohome', 'online', 91, TS(0, 11, 55)), wifi: { ssid: 'Malqa-Smart', pass: 'Riyadh380' }, license: '10044412', desc: 'شقة ذكية بالكامل قريبة من طريق الملك فهد، دخول ذاتي في أي وقت بعد 3 عصراً.' },
    { id: 8, title: 'جناح فندقي بإطلالة على البحر - جدة', city: 'جدة', district: 'الكورنيش', type: 'hotel', price: 690, oldPrice: 820, rating: 4.8, reviewsCount: 35, images: imgs('J', 'K', 'N'), guests: 2, bedrooms: 1, baths: 1, cleaning: 100, amenities: ['إطلالة بحرية', 'خدمة غرف', 'جيم', 'واي فاي'], owner: 'مجموعة الواجهة', superhost: true, smartLock: true, supervision: 'supervised', status: 'محجوزة', occupancy: 83, lock: lock('Nuki', 'online', 55, TS(0, 11, 20)), wifi: { ssid: 'Waterfront-Suite', pass: 'Corniche690' }, license: '10038801', desc: 'جناح فندقي على الواجهة البحرية مع خدمات فندقية كاملة.' },
    { id: 9, title: 'وحدة سكنية مفروشة - الخبر', city: 'الخبر', district: 'العقربية', type: 'unit', price: 320, rating: 4.5, reviewsCount: 15, images: imgs('I', 'O', 'Pk'), guests: 4, bedrooms: 2, baths: 1, cleaning: 70, amenities: ['واي فاي', 'غسالة', 'مطبخ', 'موقف'], owner: 'نورة الدوسري', smartLock: true, supervision: 'self', status: 'قيد النشر', occupancy: 0, lock: lock('TTLock', 'online', 100, TS(0, 10, 12)), wifi: { ssid: 'Aqrabiyah-2', pass: 'Home320' }, license: '—', desc: 'وحدة مفروشة عملية للإقامات القصيرة والمتوسطة.' },
    { id: 10, title: 'شقة عائلية قرب البوليفارد - الرياض', city: 'الرياض', district: 'حطين', type: 'apartment', price: 450, rating: 4.6, reviewsCount: 21, images: imgs('H', 'G', 'Q'), guests: 5, bedrooms: 2, baths: 2, cleaning: 90, amenities: ['واي فاي', 'مطبخ', 'ألعاب أطفال', 'موقف'], owner: 'سارة العتيبي', smartLock: true, supervision: 'supervised', status: 'متاحة', occupancy: 76, lock: lock('Igloohome', 'online', 38, TS(0, 11, 1)), wifi: { ssid: 'Hittin-Family', pass: 'Blvd450' }, license: '10029915', desc: 'شقة عائلية على بعد 5 دقائق من بوليفارد الرياض سيتي.' },
    { id: 11, title: 'شاليه بمسبح خاص - الخبر', city: 'الخبر', district: 'نصف القمر', type: 'chalet', price: 950, rating: 4.8, reviewsCount: 19, images: imgs('L', 'B', 'C'), guests: 8, bedrooms: 3, baths: 3, cleaning: 200, amenities: ['مسبح خاص', 'شاطئ', 'شواية', 'واي فاي'], owner: 'فهد المطيري', smartLock: true, supervision: 'supervised', status: 'موقوفة', occupancy: 0, lock: lock('TTLock', 'offline', 0, TS(-4, 9, 0)), wifi: { ssid: 'HalfMoon-Chalet', pass: 'Beach950' }, license: '10033340', desc: 'شاليه على شاطئ نصف القمر بمسبح خاص (موقوف مؤقتاً للصيانة).' },
    { id: 12, title: 'وحدة استوديو ذكية - أبها', city: 'أبها', district: 'المنسك', type: 'unit', price: 260, rating: 4.4, reviewsCount: 8, images: imgs('O', 'I'), guests: 2, bedrooms: 1, baths: 1, cleaning: 60, amenities: ['واي فاي', 'مطبخ صغير', 'تدفئة'], owner: 'خالد القحطاني', smartLock: true, supervision: 'self', status: 'متاحة', occupancy: 58, lock: lock('Nuki', 'online', 67, TS(0, 11, 44)), wifi: { ssid: 'Mansak-Studio', pass: 'Abha260' }, license: '10047720', desc: 'استوديو ذكي بسيط وسط أبها، مثالي للأفراد والأزواج.' }
  ];
  properties.forEach(function (p) { p.image = p.images[0]; p.blocked = []; });
  // availability blocks (for search results)
  properties[3].blocked = [[D(2), D(9)]];
  properties[7].blocked = [[D(0), D(6)]];
  properties[6].blocked = [[D(-1), D(4)]];
  properties[10].blocked = [[D(-10), D(30)]];
  properties[0].blocked = [[D(-1), D(2)], [D(20), D(23)]];

  var reviews = [
    { id: 'r1', propertyId: 1, userName: 'محمد س.', userId: 'u1', rating: 5, comment: 'المكان خيالي نظافة وترتيب فوق الوصف، المسبح نظيف والشاطئ خاص. صاحب الفيلا متعاون جداً.', date: D(-20), ownerReply: 'شكراً لك نورتنا، بانتظار زيارتك القادمة!' },
    { id: 'r2', propertyId: 1, userName: 'لينا أ.', userId: 'u2', rating: 5, comment: 'أفضل إقامة في جدة، التصميم راقي والصور مطابقة للواقع 100%. الدخول بالرمز كان سهل جداً.', date: D(-28), images: [img(P.A, 200), img(P.C, 200)] },
    { id: 'r3', propertyId: 1, userName: 'عبدالله', userId: 'u3', rating: 4, comment: 'جميل جداً لكن الطريق يحتاج لوحة أوضح.', date: D(-32) },
    { id: 'r4', propertyId: 2, userName: 'نوف', userId: 'u4', rating: 5, comment: 'الهدوء والخصوصية لا توصف', date: D(-18) },
    { id: 'r5', propertyId: 2, userName: 'سعود العتيبي', userId: 'u_demo', rating: 5, comment: 'شاليه رائع والدخول الذكي وفر علينا انتظار المفاتيح. أنصح به للعائلات.', date: D(-37) },
    { id: 'r6', propertyId: 3, userName: 'ريم', userId: 'u5', rating: 5, comment: 'أجواء السودة مع المدفأة تجربة لا تنسى، والمشرف كان بالانتظار.', date: D(-12), ownerReply: 'حياك الله يا ريم، سعدنا باستضافتك.' },
    { id: 'r7', propertyId: 4, userName: 'ماجد', userId: 'u6', rating: 4, comment: 'الموقع ممتاز على الكورنيش، القفل احتاج محاولتين.', date: D(-6) },
    { id: 'r8', propertyId: 6, userName: 'هيفاء', userId: 'u7', rating: 5, comment: 'تصميم معماري مبهر والسينما المنزلية ممتازة.', date: D(-9), images: [img(P.F, 200)] },
    { id: 'r9', propertyId: 7, userName: 'تركي', userId: 'u8', rating: 5, comment: 'شقة نظيفة وذكية بالكامل، وصلت الساعة 2 فجراً ودخلت بدون أي مشكلة.', date: D(-4) },
    { id: 'r10', propertyId: 8, userName: 'أمل', userId: 'u9', rating: 4, comment: 'الإطلالة رائعة، خدمة الغرف تأخرت قليلاً.', date: D(-15) },
    { id: 'r11', propertyId: 10, userName: 'عبدالرحمن', userId: 'u10', rating: 3, comment: 'الشقة جيدة لكن المكيف في الغرفة الثانية ضعيف.', date: D(-3) }
  ];

  function mk(id, pid, ci, co, guests, status, method, extra) {
    var p = properties[pid - 1]; var n = Math.max(1, Math.round((new Date(co) - new Date(ci)) / 864e5));
    var sub = p.price * n, vat = Math.round((sub + p.cleaning) * 0.15), total = sub + p.cleaning + vat;
    var b = { id: id, propertyId: pid, title: p.title, city: p.city, image: p.image, checkIn: ci, checkOut: co, nights: n, guests: guests, rate: p.price, cleaning: p.cleaning, vat: vat, total: total, status: status, createdAt: D(-45), paymentMethod: method, cashback: status === 'ملغي' ? 0 : Math.round(sub * 0.05), points: status === 'ملغي' ? 0 : Math.floor(sub / 100) * 10, keyCode: String(100000 + Math.floor((pid * 7919 + n * 104729) % 899999)), guestName: 'سعود العتيبي', guestPhone: '0550000000', nafath: true, shomoos: status === 'ملغي' ? '—' : 'تم الإرسال', keyStatus: status === 'جارية' ? 'مُفعّل' : status === 'مؤكد' ? 'مُجدول' : status === 'مكتمل' ? 'منتهي' : 'ملغى', payment: status === 'ملغي' ? 'مسترد' : 'مدفوع', source: 'تطبيق رواف' };
    for (var k in (extra || {})) b[k] = extra[k];
    return b;
  }

  var guestBookings = [
    mk('RW-240815', 1, D(-1), D(2), 4, 'جارية', 'محفظة', { keyCode: '739215', createdAt: D(-14) }),
    mk('RW-240702', 3, D(12), D(14), 2, 'مؤكد', 'مدى', { keyCode: '—', createdAt: D(-3) }),
    mk('RW-240611', 2, D(-40), D(-38), 3, 'مكتمل', 'مدى', { keyCode: '481590', createdAt: D(-50) }),
    mk('RW-240530', 6, D(-62), D(-61), 2, 'ملغي', 'محفظة', { createdAt: D(-70) })
  ];

  var guestNames = ['نواف الشهري', 'منيرة الحربي', 'عبدالعزيز السبيعي', 'ريم الغامدي', 'تركي العنزي', 'هند القرني', 'ماجد الزهراني', 'لمى الشمري', 'بندر المالكي', 'جواهر العمري', 'فيصل الدوسري', 'أروى الجهني', 'سلطان البقمي', 'دانة الرشيد'];
  var opBookings = guestBookings.slice(0, 3).map(function (b) { return JSON.parse(JSON.stringify(b)); });
  var seedOps = [
    [7, -1, 4, 'جارية', 'Apple Pay'], [8, 0, 6, 'جارية', 'بطاقة ائتمانية'], [4, -3, 0, 'مكتمل', 'مدى'], [10, 1, 3, 'مؤكد', 'مدى'],
    [2, 0, 2, 'مؤكد', 'محفظة'], [6, 3, 5, 'مؤكد', 'Apple Pay'], [12, 0, 1, 'مؤكد', 'مدى'], [1, 20, 23, 'مؤكد', 'بطاقة ائتمانية'],
    [5, -8, -6, 'مكتمل', 'مدى'], [9, 5, 8, 'بانتظار الدفع', '—'], [3, -12, -10, 'مكتمل', 'محفظة'], [10, -5, -2, 'ملغي', 'مدى'],
    [7, 4, 6, 'مؤكد', 'مدى'], [8, -9, -7, 'مكتمل', 'Apple Pay']
  ];
  seedOps.forEach(function (s, i) {
    var b = mk('RW-2409' + pad(10 + i * 3), s[0], D(s[1]), D(s[2]), 2 + (i % 4), s[3], s[4], { createdAt: D(s[1] - 10 - i) });
    b.guestName = guestNames[i]; b.guestPhone = '05' + String(40000000 + i * 1234567).slice(0, 8);
    b.nafath = i !== 9; b.source = ['تطبيق رواف', 'الموقع', 'تطبيق رواف', 'مباشر'][i % 4];
    if (s[3] === 'بانتظار الدفع') { b.payment = 'بانتظار'; b.shomoos = 'بانتظار الوصول'; b.keyStatus = 'غير مُصدر'; b.keyCode = '—'; }
    if (s[3] === 'مؤكد') b.shomoos = 'يُرسل عند الوصول';
    if (i === 1) b.shomoos = 'فشل — إعادة المحاولة';
    if (s[3] === 'ملغي') b.keyStatus = 'ملغى';
    opBookings.push(b);
  });

  var tx = [
    { id: 't1', type: 'شحن', amount: 500, date: D(-30), desc: 'شحن رصيد المحفظة' },
    { id: 't2', type: 'حجز', amount: -1990, date: D(-14), desc: 'حجز فيلا جدة' },
    { id: 't3', type: 'كاش باك', amount: 180, date: D(-14), desc: 'كاش باك 5% من حجز جدة' },
    { id: 't4', type: 'مكافأة', amount: 50, date: D(-35), desc: 'مكافأة دعوة صديق (SAUD50)' }
  ];

  var notifications = [
    { id: 'n1', icon: 'key-round', title: 'مفتاحك الرقمي جاهز', body: 'رمز الدخول لفيلا جدة مُفعّل حتى 12:00 م يوم المغادرة.', time: 'قبل ساعة', read: false, href: '#/stay/RW-240815' },
    { id: 'n2', icon: 'badge-percent', title: 'انخفض سعر وحدة في مفضلتك', body: 'جناح فندقي بإطلالة على البحر أصبح 690 ر.س بدلاً من 820.', time: 'اليوم', read: false, href: '#/property/8' },
    { id: 'n3', icon: 'star', title: 'قيّم إقامتك واربح 50 نقطة', body: 'شاركنا رأيك في شاليه الدرعية.', time: 'أمس', read: false, href: '#/review/RW-240611' },
    { id: 'n4', icon: 'wallet', title: 'تمت إضافة كاش باك', body: 'أضفنا 180 ر.س لمحفظتك.', time: 'قبل أسبوعين', read: true, href: '#/account/wallet' }
  ];

  var accessEvents = [
    { id: 'a1', propertyId: 1, time: TS(0, 9, 12), who: 'سعود العتيبي (ضيف)', method: 'تطبيق رواف', result: 'ناجح' },
    { id: 'a2', propertyId: 1, time: TS(-1, 15, 40), who: 'سعود العتيبي (ضيف)', method: 'رمز رقمي', result: 'ناجح' },
    { id: 'a3', propertyId: 1, time: TS(-1, 13, 5), who: 'فيصل الحربي (مشرف)', method: 'رمز المشرف', result: 'ناجح' },
    { id: 'a4', propertyId: 4, time: TS(-1, 21, 58), who: 'غير معروف', method: 'رمز رقمي', result: 'فاشل', note: 'رمز خاطئ 3 مرات' },
    { id: 'a5', propertyId: 7, time: TS(-1, 2, 14), who: 'نواف الشهري (ضيف)', method: 'رمز رقمي', result: 'ناجح' },
    { id: 'a6', propertyId: 8, time: TS(0, 10, 30), who: 'منيرة الحربي (ضيف)', method: 'تطبيق رواف', result: 'ناجح' },
    { id: 'a7', propertyId: 6, time: TS(0, 8, 2), who: 'فريق التنظيف', method: 'رمز خدمة', result: 'ناجح' },
    { id: 'a8', propertyId: 11, time: TS(-4, 8, 55), who: 'النظام', method: 'مزامنة', result: 'فاشل', note: 'القفل غير متصل' },
    { id: 'a9', propertyId: 10, time: TS(0, 7, 45), who: 'فيصل الحربي (مشرف)', method: 'رمز المشرف', result: 'ناجح' },
    { id: 'a10', propertyId: 4, time: TS(-1, 12, 3), who: 'تركي العنزي (ضيف)', method: 'رمز رقمي', result: 'ناجح', note: 'مغادرة' }
  ];

  function cl(arr) { return arr.map(function (t) { return { t: t, done: false }; }); }
  var tasks = [
    { id: 'TK-101', type: 'readiness', title: 'تجهيز قبل الوصول', propertyId: 10, assignee: 'فيصل الحربي', due: TS(1, 13, 0), status: 'todo', priority: 'عالية', bookingId: 'RW-240919', checklist: cl(['تنظيف شامل وتعقيم', 'تغيير المفارش والمناشف', 'تشغيل المكيفات قبل الوصول بساعة', 'فحص القفل الذكي والبطارية', 'تعبئة مستلزمات الضيافة', 'تصوير الوحدة بعد التجهيز']), photos: [], notes: '' },
    { id: 'TK-102', type: 'inspection', title: 'فحص بعد المغادرة', propertyId: 4, assignee: 'فيصل الحربي', due: TS(0, 14, 0), status: 'doing', priority: 'عالية', bookingId: 'RW-240916', checklist: [{ t: 'فحص الأثاث والأجهزة', done: true }, { t: 'التأكد من عدم وجود أضرار', done: true }, { t: 'جرد المستلزمات', done: false }, { t: 'فحص القفل وتغيير البطارية', done: false }, { t: 'تصوير الحالة بعد المغادرة', done: false }], photos: [img(P.D, 300)], notes: 'بطارية القفل منخفضة جداً' },
    { id: 'TK-103', type: 'cleaning', title: 'تنظيف وتجهيز', propertyId: 3, assignee: 'فريق النظافة — أبها', due: TS(0, 16, 0), status: 'doing', priority: 'متوسطة', checklist: cl(['تنظيف المدفأة', 'تغيير المفارش', 'تنظيف المطبخ']), photos: [], notes: '' },
    { id: 'TK-104', type: 'maintenance', title: 'صيانة مكيف الغرفة الثانية', propertyId: 10, assignee: 'فني التكييف — الرياض', due: TS(0, 18, 0), status: 'todo', priority: 'متوسطة', checklist: cl(['فحص الفريون', 'تنظيف الفلاتر']), photos: [], notes: 'ملاحظة من تقييم ضيف' },
    { id: 'TK-105', type: 'maintenance', title: 'استبدال قفل غير متصل', propertyId: 11, assignee: 'فني الأقفال', due: TS(1, 11, 0), status: 'todo', priority: 'عالية', checklist: cl(['فصل القفل القديم', 'تركيب وحدة جديدة', 'اقتران القفل مع المنصة', 'اختبار رمز تجريبي']), photos: [], notes: '' },
    { id: 'TK-106', type: 'readiness', title: 'تجهيز قبل الوصول', propertyId: 2, assignee: 'فيصل الحربي', due: TS(0, 12, 0), status: 'review', priority: 'عالية', checklist: [{ t: 'تنظيف شامل', done: true }, { t: 'فحص المسبح', done: true }, { t: 'فحص القفل', done: true }], photos: [img(P.B, 300), img(P.D, 300)], notes: 'جاهزة' },
    { id: 'TK-107', type: 'inspection', title: 'فحص بعد المغادرة', propertyId: 8, assignee: 'فيصل الحربي', due: TS(-1, 13, 0), status: 'done', priority: 'متوسطة', checklist: [{ t: 'فحص الأثاث', done: true }, { t: 'جرد المستلزمات', done: true }], photos: [img(P.K, 300)], notes: 'لا توجد ملاحظات' },
    { id: 'TK-108', type: 'cleaning', title: 'تنظيف عميق شهري', propertyId: 6, assignee: 'فريق النظافة — جدة', due: TS(2, 10, 0), status: 'todo', priority: 'منخفضة', checklist: cl(['تنظيف المسبح', 'تنظيف السجاد', 'تلميع الأسطح']), photos: [], notes: '' },
    { id: 'TK-109', type: 'readiness', title: 'تجهيز قبل الوصول', propertyId: 6, assignee: 'فيصل الحربي', due: TS(3, 12, 0), status: 'todo', priority: 'متوسطة', checklist: cl(['تنظيف شامل', 'تجهيز السينما', 'فحص القفل (بطارية 23%)']), photos: [], notes: '' }
  ];

  var incidents = [
    { id: 'IN-31', propertyId: 4, title: 'القفل الذكي غير متصل', category: 'قفل ذكي', severity: 'عالية', status: 'مفتوح', reportedBy: 'النظام', time: TS(-1, 22, 5) },
    { id: 'IN-30', propertyId: 10, title: 'ضعف تبريد المكيف', category: 'صيانة', severity: 'متوسطة', status: 'قيد المعالجة', reportedBy: 'عبدالرحمن (ضيف)', time: TS(-3, 18, 20) },
    { id: 'IN-29', propertyId: 1, title: 'طلب مناشف إضافية', category: 'خدمة', severity: 'منخفضة', status: 'مغلق', reportedBy: 'سعود العتيبي (ضيف)', time: TS(0, 9, 30) },
    { id: 'IN-28', propertyId: 11, title: 'تسرب مياه في المطبخ', category: 'صيانة', severity: 'عالية', status: 'قيد المعالجة', reportedBy: 'فيصل الحربي (مشرف)', time: TS(-5, 11, 0) }
  ];

  var damages = [
    { id: 'DM-12', propertyId: 4, bookingId: 'RW-240916', guest: 'تركي العنزي', title: 'كسر في طاولة القهوة الزجاجية', desc: 'تم رصد كسر في سطح الطاولة أثناء فحص ما بعد المغادرة.', photos: [img(P.D, 400), img(P.C, 400)], estimate: 650, fine: 650, status: 'بانتظار المراجعة', reportedBy: 'فيصل الحربي', date: D(0), guestResponse: '' },
    { id: 'DM-11', propertyId: 8, bookingId: 'RW-240949', guest: 'دانة الرشيد', title: 'بقعة على الكنبة', desc: 'بقعة قهوة تحتاج تنظيف احترافي.', photos: [img(P.K, 400)], estimate: 180, fine: 180, status: 'بانتظار رد الضيف', reportedBy: 'فيصل الحربي', date: D(-6), guestResponse: '' },
    { id: 'DM-10', propertyId: 5, bookingId: 'RW-240934', guest: 'بندر المالكي', title: 'تلف شبكة المرمى', desc: 'تمزق في شبكة الملعب.', photos: [img(P.E, 400)], estimate: 120, fine: 0, status: 'مرفوض', reportedBy: 'مشرف القصيم', date: D(-7), guestResponse: 'الشبكة كانت متضررة عند الوصول، ولدي صورة.' },
    { id: 'DM-9', propertyId: 3, bookingId: 'RW-240940', guest: 'جواهر العمري', title: 'فقدان جهاز تحكم التلفزيون', desc: 'جهاز التحكم غير موجود بعد المغادرة.', photos: [img(P.C, 400)], estimate: 90, fine: 90, status: 'معتمد', reportedBy: 'فيصل الحربي', date: D(-11), guestResponse: 'موافق على الخصم.' }
  ];

  var pricingEvents = [
    { id: 'ev1', name: 'فعالية كبرى على الواجهة البحرية', kind: 'فعالية', city: 'جدة', from: D(4), to: D(7), uplift: 22 },
    { id: 'ev2', name: 'موسم الرياض', kind: 'موسم', city: 'الرياض', from: D(10), to: D(60), uplift: 18 },
    { id: 'ev3', name: 'إجازة منتصف الفصل الدراسي', kind: 'عطلة رسمية', city: 'الكل', from: D(17), to: D(21), uplift: 25 },
    { id: 'ev4', name: 'موسم الأعراس', kind: 'مناسبة', city: 'جدة', from: D(25), to: D(29), uplift: 10 },
    { id: 'ev5', name: 'مؤتمر تقني دولي', kind: 'فعالية', city: 'الرياض', from: D(8), to: D(9), uplift: 15 },
    { id: 'ev6', name: 'مهرجان الشتاء', kind: 'موسم', city: 'الخبر', from: D(30), to: D(45), uplift: 12 }
  ];
  var seasons = [
    { id: 's1', name: 'موسم الصيف (المصايف)', from: '06-15', to: '08-31', cities: 'أبها، الطائف', uplift: 30 },
    { id: 's2', name: 'موسم الشتاء', from: '11-15', to: '02-28', cities: 'الرياض، العلا، الخبر', uplift: 15 },
    { id: 's3', name: 'رمضان والعيد', from: 'حسب التقويم الهجري', to: '', cities: 'مكة، المدينة، جدة', uplift: 35 }
  ];

  var payouts = [
    { id: 'PO-0926', period: 'سبتمبر 2026', gross: 184250, commission: 27638, fees: 3685, net: 152927, status: 'مجدول', date: D(6) },
    { id: 'PO-0826', period: 'أغسطس 2026', gross: 211400, commission: 31710, fees: 4228, net: 175462, status: 'مدفوع', date: D(-24) },
    { id: 'PO-0726', period: 'يوليو 2026', gross: 238900, commission: 35835, fees: 4778, net: 198287, status: 'مدفوع', date: D(-55) },
    { id: 'PO-0626', period: 'يونيو 2026', gross: 176300, commission: 26445, fees: 3526, net: 146329, status: 'مدفوع', date: D(-85) }
  ];
  var revenue12 = [128, 142, 151, 139, 168, 176, 239, 211, 184, 0, 0, 0].slice(0, 9);
  var revenueLabels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر'];
  var daily30 = []; for (var i = 29; i >= 0; i--) { var dd = new Date(T); dd.setDate(dd.getDate() - i); var wk = dd.getDay() === 4 || dd.getDay() === 5; daily30.push({ d: D(-i), rev: Math.round((wk ? 8200 : 5200) + ((i * 3779) % 2400)), occ: Math.min(98, (wk ? 88 : 66) + ((i * 7) % 12)) }); }

  var opCampaigns = [
    { id: 'OC-5', name: 'عرض نهاية الأسبوع', discount: 15, from: D(-5), to: D(25), units: [2, 10], status: 'نشطة', bookings: 14, revenue: 18400 },
    { id: 'OC-4', name: 'إقامة 3 ليالٍ بسعر ليلتين', discount: 33, from: D(10), to: D(40), units: [1, 6], status: 'مجدولة', bookings: 0, revenue: 0 },
    { id: 'OC-3', name: 'خصم اليوم الوطني', discount: 20, from: D(-12), to: D(-5), units: [1, 2, 7, 8, 10], status: 'منتهية', bookings: 31, revenue: 42650 }
  ];

  var shoots = [
    { id: 'SH-41', propertyId: 9, title: 'وحدة سكنية مفروشة - الخبر', address: 'الخبر، حي العقربية، شارع الأمير فيصل، مبنى 14', date: D(0), time: '4:00 م', contact: 'نورة الدوسري • 0551234567', status: 'مجدولة', shotList: cl(['واجهة المبنى والمدخل', 'الصالة (زاويتان)', 'غرفة النوم الرئيسية', 'المطبخ', 'دورة المياه', 'القفل الذكي ولوحة الدخول', 'الإطلالة من النافذة']), photos: [], feedback: '' },
    { id: 'SH-40', propertyId: 11, title: 'شاليه بمسبح خاص - الخبر', address: 'الخبر، نصف القمر، مخطط الشاطئ، شاليه 7', date: D(1), time: '10:00 ص', contact: 'فهد المطيري • 0559876543', status: 'مجدولة', shotList: cl(['المسبح (لقطة واسعة)', 'الجلسة الخارجية', 'الصالة', 'الغرف', 'الشاطئ']), photos: [], feedback: '' },
    { id: 'SH-39', propertyId: 12, title: 'وحدة استوديو ذكية - أبها', address: 'أبها، حي المنسك، عمارة 3، شقة 5', date: D(-2), time: '1:00 م', contact: 'خالد القحطاني • 0503344556', status: 'تحتاج إعادة', shotList: [{ t: 'الغرفة', done: true }, { t: 'المطبخ الصغير', done: true }, { t: 'دورة المياه', done: true }], photos: [{ id: 'ph1', url: img(P.O, 400), qa: 'approved' }, { id: 'ph2', url: img(P.I, 400), qa: 'rejected', note: 'الإضاءة ضعيفة — أعد التصوير نهاراً' }, { id: 'ph3', url: img(P.Q, 400), qa: 'rejected', note: 'الصورة مائلة' }], feedback: 'صورتان تحتاجان إعادة: الإضاءة والزاوية.' },
    { id: 'SH-38', propertyId: 7, title: 'شقة عصرية في حي الملقا - الرياض', address: 'الرياض، الملقا، طريق أنس بن مالك', date: D(-9), time: '11:00 ص', contact: 'رواف للضيافة', status: 'مقبولة', shotList: [{ t: 'الصالة', done: true }, { t: 'الغرفة', done: true }], photos: [{ id: 'ph4', url: img(P.G, 400), qa: 'approved' }, { id: 'ph5', url: img(P.H, 400), qa: 'approved' }, { id: 'ph6', url: img(P.M, 400), qa: 'approved' }], feedback: 'ممتاز — تم النشر.' }
  ];

  var verification = [
    { id: 'VR-88', name: 'وحدة سكنية مفروشة - الخبر', propertyId: 9, type: 'unit', city: 'الخبر', owner: 'نورة الدوسري', submitted: D(-1), units: 1, lockPaired: true, photos: 'بانتظار التصوير', status: 'بانتظار المراجعة', docs: [{ name: 'صك الملكية', ok: true }, { name: 'الهوية الوطنية للمالك', ok: true }, { name: 'ترخيص وزارة السياحة', ok: false }, { name: 'عقد إدارة الوحدة', ok: true }], image: img(P.I, 400) },
    { id: 'VR-87', name: 'برج الواحة — 6 شقق فندقية', type: 'hotel', city: 'الرياض', owner: 'شركة الواحة العقارية', submitted: D(-2), units: 6, lockPaired: false, photos: 'مكتملة (42 صورة)', status: 'بانتظار المراجعة', docs: [{ name: 'السجل التجاري', ok: true }, { name: 'صك الملكية', ok: true }, { name: 'ترخيص وزارة السياحة', ok: true }, { name: 'شهادة الدفاع المدني', ok: true }], image: img(P.J, 400) },
    { id: 'VR-86', name: 'فيلا الريف - الطائف', type: 'villa', city: 'الطائف', owner: 'مشعل الثبيتي', submitted: D(-4), units: 1, lockPaired: true, photos: 'مكتملة (18 صورة)', status: 'بانتظار المراجعة', docs: [{ name: 'صك الملكية', ok: true }, { name: 'الهوية الوطنية للمالك', ok: true }, { name: 'ترخيص وزارة السياحة', ok: true }], image: img(P.L, 400) },
    { id: 'VR-85', name: 'شقة بحي النرجس', type: 'apartment', city: 'الرياض', owner: 'أحمد الشهراني', submitted: D(-8), units: 1, lockPaired: true, photos: 'مكتملة', status: 'مرفوض', reason: 'صك الملكية لا يطابق اسم المالك', docs: [{ name: 'صك الملكية', ok: false }], image: img(P.H, 400) }
  ];

  var photoQA = [
    { id: 'PQ-1', shootId: 'SH-37', property: 'فيلا الريف - الطائف', photographer: 'ريم الزهراني', url: img(P.L, 500), status: 'pending' },
    { id: 'PQ-2', shootId: 'SH-37', property: 'فيلا الريف - الطائف', photographer: 'ريم الزهراني', url: img(P.C, 500), status: 'pending' },
    { id: 'PQ-3', shootId: 'SH-37', property: 'فيلا الريف - الطائف', photographer: 'ريم الزهراني', url: img(P.O, 500), status: 'pending' },
    { id: 'PQ-4', shootId: 'SH-36', property: 'برج الواحة', photographer: 'عمر باعشن', url: img(P.J, 500), status: 'pending' },
    { id: 'PQ-5', shootId: 'SH-36', property: 'برج الواحة', photographer: 'عمر باعشن', url: img(P.N, 500), status: 'pending' },
    { id: 'PQ-6', shootId: 'SH-36', property: 'برج الواحة', photographer: 'عمر باعشن', url: img(P.K, 500), status: 'pending' },
    { id: 'PQ-7', shootId: 'SH-36', property: 'برج الواحة', photographer: 'عمر باعشن', url: img(P.Q, 500), status: 'pending' },
    { id: 'PQ-8', shootId: 'SH-36', property: 'برج الواحة', photographer: 'عمر باعشن', url: img(P.Pk, 500), status: 'pending' }
  ];

  var users = [
    { id: 'us1', name: 'سعود العتيبي', contact: '0550000000', role: 'ضيف', status: 'نشط', joined: '2025-11-02', last: 'اليوم' },
    { id: 'us2', name: 'أحمد الغامدي', contact: 'ahmad@example.sa', role: 'مالك', status: 'نشط', joined: '2025-06-14', last: 'أمس' },
    { id: 'us3', name: 'رواف للضيافة', contact: 'ops@rawaaf.sa', role: 'مشغّل', status: 'نشط', joined: '2025-01-01', last: 'اليوم' },
    { id: 'us4', name: 'فيصل الحربي', contact: '0561112233', role: 'مشرف', status: 'نشط', joined: '2025-08-20', last: 'اليوم' },
    { id: 'us5', name: 'ريم الزهراني', contact: '0567778899', role: 'مصوّر', status: 'نشط', joined: '2025-09-03', last: 'اليوم' },
    { id: 'us6', name: 'عمر باعشن', contact: '0544455566', role: 'مصوّر', status: 'نشط', joined: '2026-02-11', last: 'قبل 3 أيام' },
    { id: 'us7', name: 'نورة الدوسري', contact: 'noura@example.sa', role: 'مالك', status: 'نشط', joined: '2025-10-09', last: 'اليوم' },
    { id: 'us8', name: 'مها القحطاني', contact: 'maha@rawaaf.sa', role: 'دعم العملاء', status: 'نشط', joined: '2025-03-01', last: 'اليوم' },
    { id: 'us9', name: 'يوسف الحارثي', contact: 'yousef@rawaaf.sa', role: 'مدير منصة', status: 'نشط', joined: '2025-01-01', last: 'اليوم' },
    { id: 'us10', name: 'سامي الخالدي', contact: '0533322211', role: 'مشرف', status: 'معلق', joined: '2025-12-15', last: 'قبل شهر' },
    { id: 'us11', name: 'lama@example.sa', contact: 'lama@example.sa', role: 'مشغّل', status: 'مدعو', joined: D(-1), last: '—' }
  ];
  var roles = ['مدير منصة', 'مشغّل', 'مالك', 'مشرف', 'مصوّر', 'دعم العملاء'];
  var permissions = [
    { name: 'إدارة الوحدات والمحتوى', r: [1, 1, 1, 0, 0, 0] },
    { name: 'اعتماد الوحدات', r: [1, 0, 0, 0, 0, 0] },
    { name: 'التسعير الذكي', r: [1, 1, 1, 0, 0, 0] },
    { name: 'الحجوزات وبيانات الضيوف', r: [1, 1, 0, 0, 0, 1] },
    { name: 'إصدار رموز الدخول', r: [1, 1, 0, 1, 0, 1] },
    { name: 'المهام الميدانية', r: [1, 1, 0, 1, 0, 0] },
    { name: 'رفع الصور', r: [1, 1, 1, 0, 1, 0] },
    { name: 'قضايا الأضرار والغرامات', r: [1, 1, 0, 0, 0, 1] },
    { name: 'التقارير المالية والتحويلات', r: [1, 1, 1, 0, 0, 0] },
    { name: 'التكاملات والإعدادات', r: [1, 0, 0, 0, 0, 0] }
  ];

  var platformCampaigns = [
    { id: 'PC-14', name: 'موسم الرياض — إقامات ذكية', channel: 'Snapchat', budget: 40000, spent: 12600, from: D(-6), to: D(40), units: 18, impressions: 812000, clicks: 16240, bookings: 96, revenue: 118400, status: 'نشطة' },
    { id: 'PC-13', name: 'شتاء أبها والسودة', channel: 'Google Ads', budget: 25000, spent: 9800, from: D(-12), to: D(20), units: 9, impressions: 264000, clicks: 9870, bookings: 41, revenue: 36900, status: 'نشطة' },
    { id: 'PC-12', name: 'اليوم الوطني 96', channel: 'Instagram', budget: 30000, spent: 30000, from: D(-20), to: D(-5), units: 44, impressions: 1240000, clicks: 28100, bookings: 212, revenue: 251300, status: 'منتهية' },
    { id: 'PC-11', name: 'عملاء المحفظة — كاش باك مضاعف', channel: 'رسائل واتساب', budget: 6000, spent: 4100, from: D(-3), to: D(10), units: 60, impressions: 38000, clicks: 7400, bookings: 58, revenue: 61200, status: 'نشطة' }
  ];

  var integrations = [
    { id: 'shomoos', name: 'شموس', desc: 'الإبلاغ الآلي عن بيانات النزلاء للجهات الأمنية', status: 'تحذير', lastSync: TS(0, 11, 48), uptime: 99.1, calls: 412, errors: [{ time: TS(0, 10, 31), code: 'SHM-409', msg: 'تعارض في رقم الهوية للحجز RW-240913 — تم وضعه في قائمة إعادة المحاولة' }, { time: TS(-1, 23, 2), code: 'SHM-504', msg: 'انتهاء مهلة الاتصال (تمت إعادة المحاولة بنجاح)' }] },
    { id: 'nafath', name: 'نفاذ', desc: 'التحقق من هوية الضيوف والملاك عبر النفاذ الوطني الموحد', status: 'متصل', lastSync: TS(0, 11, 57), uptime: 99.9, calls: 1286, errors: [] },
    { id: 'ewaa', name: 'إيواء', desc: 'مزامنة تراخيص الوحدات وبيانات الإشغال مع منصة وزارة السياحة', status: 'متصل', lastSync: TS(0, 6, 0), uptime: 99.6, calls: 48, errors: [{ time: TS(-2, 6, 0), code: 'EWA-422', msg: 'الوحدة 9: رقم الترخيص مفقود' }] },
    { id: 'locks', name: 'مزود الأقفال الذكية', desc: 'TTLock / Igloohome / Nuki — إصدار الرموز وسجل الدخول', status: 'تحذير', lastSync: TS(0, 11, 55), uptime: 98.4, calls: 3310, errors: [{ time: TS(-1, 22, 5), code: 'LCK-OFF', msg: 'قفل الوحدة 4 غير متصل (بطارية 12%)' }, { time: TS(-4, 9, 0), code: 'LCK-OFF', msg: 'قفل الوحدة 11 غير متصل' }] },
    { id: 'payments', name: 'بوابة الدفع', desc: 'مدى، Apple Pay، البطاقات الائتمانية، الاسترداد', status: 'متصل', lastSync: TS(0, 11, 59), uptime: 99.98, calls: 954, errors: [] },
    { id: 'sms', name: 'الرسائل النصية وواتساب', desc: 'رموز التحقق OTP، إشعارات الحجز، رموز الدخول', status: 'منقطع', lastSync: TS(0, 9, 12), uptime: 97.2, calls: 2210, errors: [{ time: TS(0, 9, 14), code: 'WA-401', msg: 'انتهت صلاحية رمز الوصول لقناة واتساب — يلزم تجديده' }, { time: TS(0, 9, 13), code: 'WA-401', msg: 'فشل إرسال 17 رسالة' }] }
  ];

  var settings = {
    cities: ['الرياض', 'جدة', 'أبها', 'الخبر', 'القصيم', 'الطائف', 'العلا'],
    types: ['شقق', 'فنادق', 'وحدات سكنية', 'فلل', 'شاليهات'],
    amenities: ['واي فاي', 'مسبح', 'موقف', 'مطبخ مجهز', 'شواية', 'جيم', 'مدفأة', 'شاطئ خاص', 'سينما', 'ألعاب أطفال'],
    commission: 15, vat: 15,
    cancellation: [
      { id: 'flex', name: 'مرنة', desc: 'استرداد كامل حتى 48 ساعة قبل الوصول، ثم 50% حتى يوم الوصول.' },
      { id: 'mod', name: 'متوسطة', desc: 'استرداد كامل حتى 5 أيام قبل الوصول، ثم 50% حتى 48 ساعة.' },
      { id: 'strict', name: 'صارمة', desc: 'استرداد 50% حتى 7 أيام قبل الوصول، ولا استرداد بعدها.' }
    ],
    loyalty: { cashback: 5, pointsPer100: 10, redeemPoints: 100, redeemValue: 10, welcome: 100, review: 50, tiers: [{ name: 'برونزي', min: 0, cashback: 3 }, { name: 'فضي', min: 800, cashback: 5 }, { name: 'ذهبي', min: 2000, cashback: 7 }] },
    signals: { holidays: true, events: true, seasons: true, demand: true, competitors: false }
  };

  var audit = [
    { time: TS(0, 11, 52), actor: 'يوسف الحارثي', role: 'مدير منصة', action: 'تحديث نسبة العمولة', target: 'الإعدادات', ip: '10.0.4.21' },
    { time: TS(0, 11, 20), actor: 'رواف للضيافة', role: 'مشغّل', action: 'اعتماد اقتراحات التسعير (12 يوم)', target: 'الوحدة 1', ip: '10.0.8.3' },
    { time: TS(0, 10, 31), actor: 'النظام', role: 'تكامل', action: 'فشل إرسال بيانات نزيل', target: 'شموس / RW-240913', ip: '—' },
    { time: TS(0, 9, 40), actor: 'مها القحطاني', role: 'دعم العملاء', action: 'إصدار رمز طوارئ', target: 'الوحدة 7', ip: '10.0.2.77' },
    { time: TS(0, 9, 12), actor: 'سعود العتيبي', role: 'ضيف', action: 'فتح الباب عبر التطبيق', target: 'الوحدة 1', ip: '5.42.x.x' },
    { time: TS(-1, 17, 5), actor: 'يوسف الحارثي', role: 'مدير منصة', action: 'رفض طلب اعتماد وحدة', target: 'VR-85', ip: '10.0.4.21' },
    { time: TS(-1, 14, 30), actor: 'فيصل الحربي', role: 'مشرف', action: 'إعلان جاهزية وحدة', target: 'الوحدة 8', ip: '5.41.x.x' },
    { time: TS(-2, 16, 0), actor: 'ريم الزهراني', role: 'مصوّر', action: 'رفع 12 صورة', target: 'SH-39', ip: '5.40.x.x' }
  ];

  var platformSeries = { labels: revenueLabels, gmv: [1.9, 2.1, 2.4, 2.2, 2.7, 3.1, 4.2, 3.8, 3.3], bookings: [1840, 2010, 2290, 2120, 2580, 2940, 3960, 3610, 3150] };

  window.RAWAAF_SEED = {
    __v: 3,
    user: null,
    demoUser: { id: 'u_demo', name: 'سعود العتيبي', phone: '0550000000', email: 'saud@example.com', referralCode: 'SAUD50', nafath: true, notif: { price: true, booking: true, offers: false, whatsapp: true }, lang: 'ar' },
    wallet: 450, points: 1200, favs: [8], priceAlerts: [],
    properties: properties, reviews: reviews, bookings: guestBookings, tx: tx, notifications: notifications,
    opBookings: opBookings, accessEvents: accessEvents, tasks: tasks, incidents: incidents, damages: damages,
    pricingEvents: pricingEvents, seasons: seasons, pricingDecisions: {}, pricingRules: { min: 0.8, max: 1.4, autoApply: false, autoLimit: 10 },
    payouts: payouts, opCampaigns: opCampaigns, shoots: shoots, verification: verification, photoQA: photoQA,
    users: users, roles: roles, permissions: permissions, platformCampaigns: platformCampaigns, integrations: integrations,
    settings: settings, audit: audit, stayRequests: [], tickets: [], emergencyCodes: [], blockedDates: {}
  };
  window.RAWAAF_CONST = { TYPES: TYPES, OPS_STATUS: OPS_STATUS, revenue12: revenue12, revenueLabels: revenueLabels, daily30: daily30, platformSeries: platformSeries, D: D, TS: TS, img: img, P: P };

  /* محرك اقتراح الأسعار (وهمي): يعيد النسبة والأسباب ليوم معين */
  window.RAWAAF_suggest = function (prop, dateStr, events) {
    var d = new Date(dateStr + 'T12:00:00'); var f = 1, reasons = [];
    (events || []).forEach(function (e) {
      if (dateStr >= e.from && dateStr <= e.to && (e.city === 'الكل' || e.city === prop.city)) { f += e.uplift / 100; reasons.push({ kind: e.kind, name: e.name }); }
    });
    var dow = d.getDay();
    if (dow === 4 || dow === 5) { f += 0.12; reasons.push({ kind: 'طلب مرتفع', name: 'نهاية الأسبوع' }); }
    else if (!reasons.length && (dow === 0 || dow === 1)) { f -= 0.08; reasons.push({ kind: 'طلب منخفض', name: 'منتصف الأسبوع' }); }
    f = Math.min(1.45, Math.max(0.8, f));
    return { factor: f, price: Math.round(prop.price * f / 5) * 5, reasons: reasons };
  };
})();
