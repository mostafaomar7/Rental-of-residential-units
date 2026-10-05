/* =========================================================
   Smart Stay Platform — interactive product vision
   Vanilla JS + Three.js (r128) + GSAP + Lucide
   ========================================================= */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const pad = n => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HAS_THREE = typeof window.THREE !== 'undefined';
  const HAS_GSAP = typeof window.gsap !== 'undefined';
  const HAS_ST = HAS_GSAP && typeof window.ScrollTrigger !== 'undefined';
  const SMALL = window.innerWidth < 700;

  document.body.classList.remove('no-js');
  document.documentElement.classList.add('js');

  function icons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ icons: window.lucide.icons, attrs: { 'stroke-width': 1.6 } });
    }
  }
  function onVisible(el, cb, opts) {
    if (!el) return;
    const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), opts || { threshold: 0.15 });
    io.observe(el);
  }

  /* =========================================================
     STATUS
     ========================================================= */
  const ST = {
    confirmed: { cls: 'st--confirmed', short: 'مؤكد', label: 'مؤكد من العميل', color: 'var(--st-confirmed)' },
    proposed: { cls: 'st--proposed', short: 'مقترح', label: 'قدرة مقترحة', color: 'var(--st-proposed)' },
    recommended: { cls: 'st--recommended', short: 'موصى به', label: 'تحسين موصى به', color: 'var(--st-recommended)' },
    tbc: { cls: 'st--tbc', short: 'بانتظار التأكيد', label: 'بانتظار التأكيد', color: 'var(--st-tbc)' },
    future: { cls: 'st--future', short: 'مستقبلي', label: 'تطوير مستقبلي', color: 'var(--st-future)' }
  };
  const chip = (k, text) => `<span class="st ${ST[k].cls}">${text || ST[k].short}</span>`;

  /* =========================================================
     DATA
     ========================================================= */
  const ROLES = [
    { icon: 'user-round', name: 'الضيف / العميل', en: 'Guest', st: 'confirmed',
      sum: 'يكتشف العقارات ويحجزها، ويدخل الوحدة برمز رقمي، ويجد مساعداً شخصياً طوال إقامته.',
      resp: ['اختيار العقار والتواريخ المناسبة', 'الإقرار بسياسة العقار', 'الالتزام بشروط الإقامة'],
      actions: ['البحث والتصفية', 'الحجز وإدارته', 'استلام رمز الدخول', 'التواصل مع المساعد الشخصي'],
      modules: ['الاكتشاف والبحث', 'الحجز', 'الدخول الذكي', 'المساعد الشخصي'],
      access: 'حسابه وحجوزاته فقط', login: 'مرجّح — طريقة التسجيل والتحقق بانتظار التأكيد', loginSt: 'tbc' },
    { icon: 'building-2', name: 'مالك العقار', en: 'Property Owner', st: 'confirmed',
      sum: 'يملك العقار ويتابع أداءه وإيراداته، وقد يديره بنفسه أو عبر مشغّل.',
      resp: ['تقديم بيانات العقار الصحيحة', 'اعتماد سياسات العقار', 'متابعة الأداء والإيراد'],
      actions: ['إدراج العقار', 'مراجعة توصيات التسعير', 'قراءة مؤشرات الأداء'],
      modules: ['إدارة العقارات', 'التسعير الذكي', 'لوحة المؤشرات'],
      access: 'عقاراته فقط', login: 'مرجّح', loginSt: 'tbc' },
    { icon: 'user-cog', name: 'مشغّل العقار', en: 'Property Operator', st: 'confirmed',
      sum: 'يدير التشغيل اليومي للعقارات: الإتاحة والأسعار والحجوزات والجاهزية.',
      resp: ['تحديث الإتاحة والأسعار', 'متابعة الحجوزات', 'ضمان جاهزية الوحدات'],
      actions: ['إدارة التقويم', 'اعتماد الأسعار', 'متابعة التشغيل والحوادث', 'إدارة إعدادات الدخول'],
      modules: ['إدارة العقارات', 'الحجوزات', 'التشغيل', 'الدخول الذكي', 'التسعير الذكي'],
      access: 'العقارات المُسندة إليه', login: 'مرجّح', loginSt: 'tbc' },
    { icon: 'eye', name: 'المشرف', en: 'Supervisor', st: 'confirmed',
      sum: 'عضو في الفريق الميداني للعقارات المُشرَف عليها. وجوده مؤكد، ومهامه الدقيقة بانتظار التأكيد.',
      resp: ['جاهزية العقار قبل الإقامة', 'فحص ما بعد المغادرة', 'الإبلاغ عن الحوادث'],
      actions: ['تسجيل الفحص التشغيلي', 'إعلان جاهزية الوحدة', 'توثيق الملاحظات بالصور'],
      modules: ['التشغيل والإشراف', 'السياسات والحوادث'],
      access: 'مهام العقارات المُسندة إليه', login: 'قد يحتاج أداة ميدانية مبسّطة', loginSt: 'tbc' },
    { icon: 'camera', name: 'المصوّر', en: 'Photographer', st: 'confirmed',
      sum: 'يلتقط صوراً احترافية للعقارات ضمن النموذج المُشرَف عليه.',
      resp: ['تصوير العقار وفق معايير المنصة', 'تسليم الصور للمراجعة'],
      actions: ['استلام مهمة التصوير', 'رفع الصور'],
      modules: ['المحتوى والتصوير'],
      access: 'مهام التصوير المُسندة فقط', login: 'قد لا يحتاج حساباً مستقلاً', loginSt: 'tbc' },
    { icon: 'shield-check', name: 'مدير المنصة', en: 'Platform Admin', st: 'confirmed',
      sum: 'يدير المنصة ككل: المستخدمين والعقارات والسياسات والحملات والتكاملات.',
      resp: ['اعتماد العقارات ونشرها', 'إدارة السياسات', 'متابعة الأداء العام'],
      actions: ['إدارة المستخدمين والأدوار', 'إدارة الحملات', 'مراجعة الحوادث', 'مراقبة التكاملات'],
      modules: ['جميع الوحدات', 'لوحة المؤشرات', 'الحملات', 'التكاملات'],
      access: 'كامل على مستوى المنصة', login: 'نعم', loginSt: 'proposed' },
    { icon: 'cable', name: 'نظام الامتثال / التكامل', en: 'Compliance / Integration', st: 'confirmed',
      sum: 'ليس مستخدماً بشرياً؛ يمثّل تبادل البيانات مع شموس ونفاذ وإيواء.',
      resp: ['تبادل البيانات المطلوبة نظامياً', 'إرجاع نتائج التحقق'],
      actions: ['استقبال الطلبات', 'إرسال النتائج'],
      modules: ['تكاملات الامتثال', 'الهوية والصلاحيات'],
      access: 'واجهات تكامل محددة', login: 'لا يتطلب تسجيل دخول', loginSt: 'proposed' }
  ];

  const GUEST = [
    { t: 'اكتشاف', d: 'يستكشف الضيف الشقق والفنادق والوحدات السكنية، ويبحث ويصفّي النتائج حتى يجد ما يناسبه.', sys: [['الاكتشاف والبحث', 'confirmed'], ['إدارة العقارات', 'confirmed'], ['المساعد الشخصي', 'recommended']] },
    { t: 'حجز', d: 'يختار التواريخ، ويتحقق من الإتاحة، ويطّلع على السعر وسياسة العقار، ثم يحجز.', sys: [['الحجز والإتاحة', 'confirmed'], ['مساعد التسعير', 'proposed'], ['مزوّد الدفع', 'tbc']] },
    { t: 'تأكيد', d: 'يُؤكَّد الحجز ويُوثَّق إقرار الضيف بسياسة العقار، وتبدأ المنصة إصدار بيانات الدخول.', sys: [['الحجز', 'confirmed'], ['سياسة العقار', 'proposed'], ['التحقق من الهوية — نفاذ', 'tbc']] },
    { t: 'دخول', d: 'يصل الضيف ويُدخل رمزه على القفل الذكي؛ يُفتح الباب وتُسجَّل عملية الدخول.', sys: [['الدخول الذكي', 'confirmed'], ['مزوّد القفل الذكي', 'tbc']] },
    { t: 'إقامة', d: 'معلومات الإقامة ودليل العقار في متناول الضيف طوال فترة إقامته.', sys: [['المساعد الشخصي', 'confirmed'], ['التشغيل', 'proposed']] },
    { t: 'مساعدة', d: 'يطرح الضيف أسئلته أو يرفع طلب دعم عبر المساعد، ويُحال ما يلزم إلى الفريق المختص.', sys: [['المساعد الشخصي', 'confirmed'], ['التشغيل والإشراف', 'proposed']] },
    { t: 'مغادرة', d: 'يغادر الضيف فتنتهي صلاحية الدخول، ويبدأ فحص ما بعد الإقامة وفق نموذج تشغيل العقار.', sys: [['الدخول الذكي', 'confirmed'], ['فحص ما بعد الإقامة', 'proposed'], ['سياسة الأضرار', 'tbc']] }
  ];

  const LIFECYCLE = [
    { t: 'الإدراج', en: 'Onboard', d: 'تسجيل العقار في المنصة مع بياناته الأساسية: النوع والموقع والوحدات.', actor: 'المالك أو المشغّل', mod: 'إدارة العقارات', st: 'proposed' },
    { t: 'التحقق', en: 'Verify', d: 'التحقق من العقار وملكيته أو صلاحية مشغّله قبل النشر. الجهة المسؤولة والآلية تحتاجان قراراً.', actor: 'إدارة المنصة', mod: 'إدارة العقارات', st: 'tbc' },
    { t: 'التصوير', en: 'Photograph', d: 'تصوير احترافي للعقار في النموذج المُشرَف عليه، ثم مراجعة جودة الصور قبل النشر.', actor: 'المصوّر', mod: 'المحتوى والتصوير', st: 'proposed' },
    { t: 'النشر', en: 'List', d: 'نشر العقار بصوره ومرافقه وسياساته ليظهر للعملاء في البحث والاكتشاف.', actor: 'المشغّل / إدارة المنصة', mod: 'الاكتشاف والبحث', st: 'confirmed' },
    { t: 'التسعير', en: 'Price', d: 'تحديد السعر مستفيداً من توصيات مساعد التسعير وسياق الطلب في كل فترة.', actor: 'المشغّل + مساعد التسعير', mod: 'التسعير الذكي', st: 'proposed' },
    { t: 'الحجز', en: 'Book', d: 'يحجز العميل الوحدة، فتُحجز في التقويم ويصدر تأكيد الحجز.', actor: 'الضيف', mod: 'الحجز والإتاحة', st: 'confirmed' },
    { t: 'الدخول', en: 'Access', d: 'تُصدر بيانات الدخول المرتبطة بالحجز، ويفتح الضيف القفل الذكي عند وصوله.', actor: 'الضيف + القفل الذكي', mod: 'الدخول الذكي', st: 'confirmed' },
    { t: 'الإقامة', en: 'Stay', d: 'يقيم الضيف بدعم المساعد الشخصي، مع دعم ميداني في العقارات المُشرَف عليها.', actor: 'الضيف', mod: 'المساعد الشخصي · التشغيل', st: 'confirmed' },
    { t: 'الفحص', en: 'Inspect', d: 'فحص ما بعد الإقامة وتوثيق أي ضرر وفق سياسة العقار.', actor: 'المشرف (في النموذج المُشرَف عليه)', mod: 'التشغيل · السياسات والحوادث', st: 'proposed' },
    { t: 'التحليل', en: 'Analyze', d: 'قراءة أداء الوحدة: الإشغال والإيراد ومتوسط السعر اليومي والملاحظات التشغيلية.', actor: 'المالك / المشغّل / الإدارة', mod: 'لوحة المؤشرات', st: 'proposed' },
    { t: 'التحسين', en: 'Optimize', d: 'تحسين السعر والمحتوى والتشغيل بناءً على التحليل — ثم تعود الدورة إلى التسعير والنشر.', actor: 'المشغّل + مساعد التسعير', mod: 'التسعير · المحتوى · التشغيل', st: 'proposed' }
  ];

  const ASSIST = [
    { icon: 'calendar-check', t: 'المساعدة في الحجز', d: 'اقتراح وحدات مناسبة للتواريخ والاحتياج.', q: 'أبحث عن شقة لثلاث ليالٍ في عطلة نهاية الأسبوع القادمة.', a: 'بكل سرور. هل تفضّل وحدة ذاتية الخدمة بدخول ذكي، أم وحدة مُشرَفاً عليها؟ سأعرض لك الوحدات المتاحة في تواريخك.' },
    { icon: 'building-2', t: 'أسئلة العقار', d: 'إجابات من ملف العقار: المرافق والسعة والسياسات.', q: 'هل الشقة مناسبة لعائلة من أربعة أشخاص؟', a: 'سأراجع سعة الوحدة ومرافقها من ملف العقار، وأوضح لك الخيارات الأنسب لعائلتك.' },
    { icon: 'log-in', t: 'إرشادات الوصول', d: 'تذكير بموعد الوصول وخطواته.', q: 'متى يمكنني تسجيل الوصول؟', a: 'موعد تسجيل الوصول موضّح في تفاصيل حجزك، وسأرسل لك قبله تذكيراً بخطوات الوصول إلى الوحدة.' },
    { icon: 'lock-keyhole', t: 'تعليمات القفل الذكي', d: 'شرح استخدام الرمز والمساعدة عند التعثّر.', q: 'القفل لا يستجيب، ماذا أفعل؟', a: 'تأكد من إدخال الرمز كاملاً ثم اضغط زر التأكيد. إن استمرت المشكلة سأحوّل طلبك فوراً إلى فريق الدعم.', note: 'الإجراء البديل عند تعطّل القفل — بانتظار التأكيد' },
    { icon: 'file-text', t: 'معلومات الإقامة', d: 'دليل العقار، والإنترنت، وموعد المغادرة.', q: 'ما كلمة مرور الإنترنت؟', a: 'تجدها في دليل إقامتك، وقد أرسلتها لك الآن ضمن معلومات الحجز.' },
    { icon: 'map-pin', t: 'معلومات محلية', d: 'اقتراح أماكن وخدمات قريبة من العقار.', q: 'ما أقرب صيدلية إلى الشقة؟', a: 'يمكنني اقتراح صيدليات قريبة من موقع العقار مع طريقة الوصول إليها.', note: 'مصدر المعلومات المحلية — بانتظار التأكيد' },
    { icon: 'headset', t: 'طلبات الدعم', d: 'تسجيل الطلب وإحالته ومتابعة حالته.', q: 'أحتاج مناشف إضافية.', a: 'سجّلت طلبك وأحلته إلى الفريق المختص، وسأبلغك بأي تحديث.', note: 'آلية التنفيذ في العقارات ذاتية الخدمة — بانتظار التأكيد' }
  ];

  const COMPLIANCE = {
    shomoos: { name: 'شموس', en: 'SHOMOOS', icon: 'shield-check',
      purpose: 'بحسب المعلن، نظام يُعنى بتسجيل بيانات النزلاء في مرافق الإيواء لدى الجهات الأمنية المختصة. نطاق التزام المنصة يُحدَّد مع العميل.',
      flow: 'المنصة ← شموس: بيانات النزيل والإقامة. الحقول الدقيقة وطبيعة الردود بانتظار التأكيد.',
      trigger: 'مرجّح عند تأكيد الحجز أو تسجيل الوصول — بانتظار التأكيد.',
      value: 'أتمتة متطلب نظامي بدل الإدخال اليدوي، وتقليل مخاطر عدم الامتثال.' },
    nafath: { name: 'نفاذ', en: 'NAFATH', icon: 'fingerprint',
      purpose: 'الغرض المتوقع: التحقق من الهوية الرقمية للمستخدمين عبر خدمة النفاذ الوطني.',
      flow: 'المستخدم ← نفاذ ← المنصة: طلب تحقق ونتيجته. البيانات المستلمة بانتظار التأكيد.',
      trigger: 'عند التسجيل، أو قبل الحجز، أو قبل إصدار بيانات الدخول — نقطة الاستخدام بانتظار التأكيد.',
      value: 'هوية موثوقة للضيوف والملاك تقلّل المخاطر وتدعم متطلبات التسجيل.' },
    ewaa: { name: 'إيواء', en: 'EWAA', icon: 'landmark',
      purpose: 'حدّده العميل تكاملاً مهماً. الجهة أو النظام المقصود ونطاق التكامل بحاجة إلى تأكيد قبل أي افتراض.',
      flow: 'بانتظار التأكيد — احتمالات للنقاش: بيانات الوحدات، أو الحجوزات، أو التراخيص.',
      trigger: 'بانتظار التأكيد.',
      value: 'توافق تشغيلي أو نظامي في قطاع الإيواء — يُحدَّد بعد تأكيد النطاق.' }
  };

  const ECO = [
    { id: 'guests', name: 'الضيوف', grp: 'people', purpose: 'اكتشاف العقارات وحجزها والإقامة فيها.', user: 'الضيف / العميل', value: 'مصدر الطلب والإيراد.', st: 'confirmed' },
    { id: 'properties', name: 'العقارات', grp: 'asset', purpose: 'ملفات الوحدات: البيانات والصور والإتاحة والسياسات.', user: 'الملاك والمشغّلون', value: 'المعروض الذي تقوم عليه المنصة.', st: 'confirmed' },
    { id: 'locks', name: 'الأقفال الذكية', grp: 'asset', purpose: 'دخول الضيف برمز مرتبط بالحجز.', user: 'الضيف والمشغّل', value: 'وصول دون مفاتيح وتشغيل أخف.', st: 'confirmed', note: 'المزوّد بانتظار التأكيد' },
    { id: 'supervisors', name: 'المشرفون', grp: 'people', purpose: 'جاهزية العقارات المُشرَف عليها وفحصها.', user: 'فريق المنصة الميداني', value: 'جودة تشغيل ثابتة.', st: 'confirmed', note: 'المهام بانتظار التأكيد' },
    { id: 'photographers', name: 'المصورون', grp: 'people', purpose: 'محتوى بصري احترافي للعقارات.', user: 'فريق المنصة الميداني', value: 'عرض أفضل للعقار في البحث.', st: 'confirmed', note: 'سير العمل مقترح' },
    { id: 'pricing', name: 'التسعير الذكي', grp: 'intel', purpose: 'اقتراح السعر وفق العطلات والفعاليات والمناسبات والمواسم.', user: 'المشغّل والمالك', value: 'قرارات تسعير مبنية على سياق الطلب.', st: 'proposed' },
    { id: 'assistant', name: 'المساعد الشخصي', grp: 'intel', purpose: 'مرافقة الضيف بالإجابة والتوجيه وإحالة الطلبات.', user: 'الضيف', value: 'تجربة أسلس وتوجيه فوري.', st: 'confirmed', note: 'القدرات موصى بها' },
    { id: 'kpi', name: 'لوحة المؤشرات', grp: 'intel', purpose: 'قياس الحجوزات والإشغال والإيرادات والتشغيل.', user: 'الإدارة والملاك والمشغّلون', value: 'رؤية مركزية وقرارات أسرع.', st: 'confirmed' },
    { id: 'campaigns', name: 'الحملات', grp: 'intel', purpose: 'الترويج للعقارات وتتبّع أثره حتى الإيراد.', user: 'إدارة المنصة', value: 'طلب إضافي قابل للقياس.', st: 'confirmed', note: 'القدرات مقترحة' },
    { id: 'shomoos', name: 'شموس', grp: 'gov', purpose: 'تسجيل بيانات النزلاء لدى الجهات المختصة (الغرض المتوقع).', user: 'نظام التكامل', value: 'أتمتة متطلب نظامي.', st: 'confirmed', note: 'تفاصيل التكامل بانتظار التأكيد' },
    { id: 'nafath', name: 'نفاذ', grp: 'gov', purpose: 'التحقق من الهوية الرقمية للمستخدمين (الغرض المتوقع).', user: 'الضيف والمالك', value: 'هوية موثوقة ومخاطر أقل.', st: 'confirmed', note: 'تفاصيل التكامل بانتظار التأكيد' },
    { id: 'ewaa', name: 'إيواء', grp: 'gov', purpose: 'تكامل حدّده العميل؛ طبيعته ونطاقه بحاجة إلى تأكيد.', user: 'نظام التكامل', value: 'يُحدَّد بعد تأكيد النطاق.', st: 'confirmed', note: 'الغرض والتفاصيل بانتظار التأكيد' }
  ];
  const ECO_LINKS = [
    ['guests', 'assistant'], ['guests', 'locks'], ['locks', 'properties'], ['supervisors', 'properties'],
    ['photographers', 'properties'], ['pricing', 'properties'], ['pricing', 'kpi'], ['campaigns', 'properties'],
    ['campaigns', 'kpi'], ['nafath', 'guests'], ['shomoos', 'guests'], ['ewaa', 'properties']
  ];
  const GRP = {
    people: { label: 'الأشخاص', css: 'var(--ivory)' },
    asset: { label: 'الأصول', css: 'var(--gold)' },
    intel: { label: 'الذكاء والأعمال', css: 'var(--steel)' },
    gov: { label: 'التكاملات الخارجية', css: 'var(--copper)' }
  };

  const DATAFLOW = [
    { n: 'الضيف', en: 'Guest', icon: 'user-round', data: 'بيانات العميل الأساسية وتفضيلات البحث.', to: 'الحجز' },
    { n: 'الحجز', en: 'Booking', icon: 'calendar-check', data: 'الوحدة والتواريخ وبيانات الضيف والسعر.', to: 'بيانات الحجز' },
    { n: 'بيانات الحجز', en: 'Reservation Data', icon: 'database', data: 'سجل الحجز المؤكد وحالته — ومنه تتفرّع بيانات الامتثال (بانتظار التأكيد).', to: 'بيانات الدخول · شموس · نفاذ' },
    { n: 'بيانات الدخول', en: 'Access Credential', icon: 'key-round', data: 'رمز مرتبط بالحجز والوحدة وفترة الصلاحية.', to: 'القفل الذكي' },
    { n: 'القفل الذكي', en: 'Smart Lock', icon: 'lock-keyhole', data: 'تفعيل الرمز على القفل عبر تكامل المزوّد (بانتظار التأكيد).', to: 'العقار' },
    { n: 'العقار', en: 'Property', icon: 'building-2', data: 'حدث الدخول وحالة الإشغال الفعلية.', to: 'البيانات التشغيلية' },
    { n: 'البيانات التشغيلية', en: 'Operational Data', icon: 'clipboard-list', data: 'سجلات الدخول والفحوصات والحوادث والجاهزية.', to: 'التحليلات' },
    { n: 'التحليلات', en: 'Analytics', icon: 'cpu', data: 'تجميع البيانات واحتساب المؤشرات وفق تعريفات معتمدة.', to: 'لوحة المؤشرات · مساعد التسعير' },
    { n: 'لوحة المؤشرات', en: 'KPI Dashboard', icon: 'gauge', data: 'عرض المؤشرات للإدارة والملاك والمشغّلين.', to: 'قرارات التسعير والتشغيل' }
  ];

  const MODS = {
    DSC: 'الاكتشاف والبحث', BKG: 'الحجز', PAY: 'الدفع', ACC: 'الدخول الذكي', PRP: 'إدارة العقارات',
    OPS: 'التشغيل والإشراف', MED: 'المحتوى والتصوير', PRC: 'التسعير الذكي', AST: 'المساعد الشخصي',
    KPI: 'مؤشرات الأداء', CMP: 'الحملات', INT: 'تكاملات الامتثال', POL: 'السياسات والأضرار', USR: 'الأدوار والصلاحيات'
  };

  const REQS = [
    ['DSC', 'تتيح المنصة للعملاء البحث عن الوحدات السكنية المتاحة.', 'confirmed'],
    ['DSC', 'تتيح المنصة تصفّح الشقق والفنادق والوحدات السكنية كأنواع عقارات مختلفة.', 'confirmed'],
    ['DSC', 'تتيح المنصة تصفية نتائج البحث وفق معايير مثل نوع العقار والموقع والتواريخ.', 'proposed'],
    ['DSC', 'تعرض المنصة صفحة تفاصيل لكل عقار تشمل المعلومات والصور والمرافق والسياسات.', 'confirmed'],
    ['BKG', 'تتيح المنصة التحقق من إتاحة الوحدة في التواريخ المختارة.', 'confirmed'],
    ['BKG', 'تعرض المنصة السعر الإجمالي للإقامة قبل تأكيد الحجز.', 'proposed'],
    ['BKG', 'تتيح المنصة للعملاء إنشاء حجز لوحدة متاحة.', 'confirmed'],
    ['BKG', 'تُصدر المنصة تأكيداً للحجز بعد إتمامه.', 'confirmed'],
    ['PAY', 'تدعم المنصة الدفع الإلكتروني عبر مزوّد دفع معتمد (المزوّد وطرق الدفع بانتظار التأكيد).', 'tbc'],
    ['BKG', 'تتيح المنصة للعميل عرض حجزه وإدارته.', 'confirmed'],
    ['BKG', 'تطبّق المنصة قواعد الإلغاء والتعديل المعتمدة لكل عقار.', 'tbc'],
    ['BKG', 'ترسل المنصة إشعارات للعميل في مراحل الحجز والإقامة.', 'proposed'],
    ['ACC', 'تُنشئ المنصة بيانات دخول لكل حجز مؤكد.', 'confirmed'],
    ['ACC', 'تربط المنصة بيانات الدخول بالحجز والوحدة المعنيين.', 'confirmed'],
    ['ACC', 'تُرسل المنصة بيانات الدخول إلى العميل بعد تأكيد الحجز.', 'confirmed'],
    ['ACC', 'تتكامل المنصة مع نظام القفل الذكي لتفعيل بيانات الدخول (المزوّد والواجهة البرمجية بانتظار التأكيد).', 'confirmed'],
    ['ACC', 'تسجّل المنصة عمليات الدخول المرتبطة بكل حجز.', 'confirmed'],
    ['ACC', 'تحدّد المنصة فترة صلاحية بيانات الدخول وفق مدة الحجز.', 'tbc'],
    ['ACC', 'توفّر المنصة إجراءً بديلاً للدخول عند تعطّل القفل أو انقطاع اتصاله.', 'recommended'],
    ['ACC', 'تُعطّل المنصة بيانات الدخول تلقائياً عند إلغاء الحجز.', 'recommended'],
    ['PRP', 'تتيح المنصة إضافة عقار وإدارة معلوماته ونوعه وموقعه.', 'confirmed'],
    ['PRP', 'تتيح المنصة إدارة صور العقار ومرافقه.', 'confirmed'],
    ['PRP', 'تتيح المنصة إدارة تقويم الإتاحة لكل وحدة.', 'confirmed'],
    ['PRP', 'تتيح المنصة تحديد نوع الإشراف لكل عقار (مُشرَف عليه / غير مُشرَف عليه).', 'confirmed'],
    ['PRP', 'تتيح المنصة ضبط إعدادات الدخول لكل وحدة.', 'confirmed'],
    ['PRP', 'تعرض المنصة حالة الحجز والحالة التشغيلية لكل عقار.', 'confirmed'],
    ['PRP', 'تتيح المنصة تحديد سياسات العقار وعرضها للضيف.', 'confirmed'],
    ['PRP', 'تتحقق المنصة من ملكية العقار أو صلاحية مشغّله قبل نشره.', 'tbc'],
    ['OPS', 'تتيح المنصة إسناد مشرف إلى العقارات المُشرَف عليها.', 'proposed'],
    ['OPS', 'تتيح المنصة للمشرف تسجيل الفحص التشغيلي وإعلان جاهزية الوحدة.', 'tbc'],
    ['OPS', 'تتيح المنصة تسجيل فحص ما بعد الإقامة مع صور موثّقة.', 'proposed'],
    ['OPS', 'تتيح المنصة الإبلاغ عن الحوادث وتوثيقها ومتابعتها.', 'tbc'],
    ['MED', 'تتيح المنصة إسناد مهام التصوير ومتابعة حالتها.', 'proposed'],
    ['MED', 'تتيح المنصة مراجعة جودة الصور قبل نشرها.', 'proposed'],
    ['PRC', 'يقدّم مساعد التسعير سعراً مقترحاً للعقار في تواريخ محددة.', 'proposed'],
    ['PRC', 'يراعي مساعد التسعير العطلات والفعاليات العامة والمناسبات الخاصة والمواسم.', 'confirmed'],
    ['PRC', 'يعرض مساعد التسعير سياق الطلب وسبب التوصية واتجاهها (رفع أو خفض).', 'proposed'],
    ['PRC', 'يُطبَّق السعر المقترح بعد اعتماد المشغّل أو تلقائياً، وفق قرار العميل.', 'tbc'],
    ['AST', 'توفّر المنصة مساعداً شخصياً للعملاء.', 'confirmed'],
    ['AST', 'يجيب المساعد عن أسئلة الحجز والعقار ومعلومات الإقامة.', 'recommended'],
    ['AST', 'يقدّم المساعد إرشادات الوصول واستخدام القفل الذكي.', 'recommended'],
    ['AST', 'يتيح المساعد رفع طلبات الدعم وإحالتها إلى الفريق المختص.', 'recommended'],
    ['AST', 'يستطيع المساعد تعديل الحجوزات نيابة عن العميل.', 'tbc'],
    ['KPI', 'توفّر المنصة لوحة مؤشرات أداء للإدارة والملاك والمشغّلين.', 'confirmed'],
    ['KPI', 'تحتسب المنصة مؤشرات الحجوزات والإشغال والإيرادات ومتوسط السعر اليومي والإلغاءات.', 'proposed'],
    ['KPI', 'تتيح المنصة تحليل المؤشرات حسب الفترة والعقار ونوعه ونموذج التشغيل.', 'proposed'],
    ['CMP', 'تتيح المنصة إنشاء الحملات الإعلانية وإدارتها.', 'confirmed'],
    ['CMP', 'تتيح المنصة ربط الحملة بعقارات محددة للترويج لها.', 'proposed'],
    ['CMP', 'تتتبّع المنصة أداء الحملات وتحويلها إلى حجوزات وإيرادات.', 'proposed'],
    ['INT', 'تتكامل المنصة مع شموس (البيانات والمحفّزات بانتظار التأكيد).', 'confirmed'],
    ['INT', 'تتكامل المنصة مع نفاذ (الدور ونقطة الاستخدام بانتظار التأكيد).', 'confirmed'],
    ['INT', 'تتكامل المنصة مع إيواء (الجهة والنطاق بانتظار التأكيد).', 'confirmed'],
    ['INT', 'تسجّل المنصة حالة كل عملية تكامل ونتيجتها لأغراض المتابعة.', 'recommended'],
    ['POL', 'تعرض المنصة سياسة الأضرار والمسؤولية قبل تأكيد الحجز.', 'proposed'],
    ['POL', 'توثّق المنصة إقرار الضيف بالسياسة مع التاريخ والوقت.', 'proposed'],
    ['POL', 'تتيح المنصة فتح حالة مراجعة عند رصد ضرر وربطها بالحجز.', 'proposed'],
    ['POL', 'تطبّق المنصة إجراء الغرامة أو المطالبة وفق السياسة المعتمدة.', 'tbc'],
    ['USR', 'تدعم المنصة أدواراً متعددة بصلاحيات وصول مختلفة.', 'proposed'],
    ['USR', 'تتيح المنصة لإدارة المنصة إدارة المستخدمين والعقارات على مستوى المنصة.', 'proposed']
  ].map((r, i) => ({ id: 'FR-' + String(i + 1).padStart(3, '0'), mod: r[0], text: r[1], st: r[2] }));

  const RULES = [
    ['لا تُصدَر بيانات الدخول إلا لحجز صالح ومؤكد.', 'أساس الأمان في الدخول الذكي.', 'confirmed'],
    ['ترتبط بيانات الدخول بالحجز والعقار المعنيين فقط.', 'يمنع استخدام الرمز لوحدة أخرى أو في حجز آخر.', 'confirmed'],
    ['قد يختلف سعر العقار بناءً على عوامل طلب محددة.', 'أساس التسعير الذكي.', 'confirmed'],
    ['توجد نماذج تشغيل مختلفة للعقارات المُشرَف عليها وغير المُشرَف عليها.', 'كل عقار يحمل نموذج تشغيله في ملفه.', 'confirmed'],
    ['لا يمكن حجز وحدة غير متاحة في التواريخ المختارة.', 'يمنع الحجز المزدوج.', 'proposed'],
    ['تكون بيانات الدخول صالحة خلال فترة الإقامة فقط.', 'توقيت بداية الصلاحية ونهايتها يحتاج قراراً.', 'tbc'],
    ['تُعطَّل بيانات الدخول عند إلغاء الحجز.', 'يحافظ على أمان الوحدة.', 'proposed'],
    ['يجب أن يُقرّ الضيف بسياسة العقار قبل تأكيد الحجز.', 'شرط لتطبيق سياسة الأضرار لاحقاً.', 'tbc'],
    ['لا تُفرض أي غرامة إلا بعد مراجعة موثّقة للحادثة.', 'قرار تجاري وقانوني.', 'tbc'],
    ['يخضع تطبيق السعر المقترح لاعتماد المشغّل.', 'يعتمد على كون التسعير استشارياً أم تلقائياً.', 'tbc'],
    ['لا يُنشر العقار قبل استكمال بياناته الأساسية وصوره.', 'يحمي جودة العرض أمام العملاء.', 'proposed'],
    ['في العقارات المُشرَف عليها، لا تُعلَن الوحدة «جاهزة» إلا بعد فحص تشغيلي.', 'مرتبط بتأكيد مهام المشرف.', 'tbc'],
    ['يُجرى فحص ما بعد الإقامة قبل إتاحة الوحدة للحجز التالي.', 'قد يؤثر على التقويم والإتاحة.', 'tbc'],
    ['تُسجَّل كل محاولة دخول، ناجحة أو فاشلة، مع الوقت والوحدة.', 'للتدقيق وحل النزاعات.', 'recommended'],
    ['قد يُشترط التحقق من هوية العميل قبل الحجز أو قبل إصدار بيانات الدخول.', 'دور نفاذ بانتظار التأكيد.', 'tbc'],
    ['تُرسَل بيانات النزلاء إلى الجهات المختصة وفق المتطلبات النظامية المعتمدة.', 'تفاصيل شموس بانتظار التأكيد.', 'tbc'],
    ['لا ينفّذ المساعد الشخصي إجراءات مالية أو تعديلات على الحجز دون صلاحية معتمدة.', 'يحدّ من مخاطر الأتمتة.', 'recommended'],
    ['تُحتسب مؤشرات الأداء من بيانات المنصة الفعلية وفق تعريفات معتمدة.', 'يضمن الثقة في الأرقام.', 'recommended']
  ].map((r, i) => ({ id: 'BR-' + String(i + 1).padStart(3, '0'), text: r[0], why: r[1], st: r[2] }));

  const SCOPE = {
    confirmed: [
      'منصة حجز للشقق والفنادق والوحدات السكنية',
      'خدمة الضيوف، والملاك والمشغّلين، وإدارة المنصة',
      'نموذجا تشغيل: مُشرَف عليه وغير مُشرَف عليه',
      'مشرفون ومصورون ضمن النموذج المُشرَف عليه',
      'دخول ذكي برمز مرتبط بالحجز',
      'مساعد تسعير يراعي العطلات والفعاليات والمناسبات والمواسم',
      'مساعد شخصي للعملاء',
      'مؤشرات أداء (KPIs)',
      'حملات إعلانية',
      'تكاملات مع شموس ونفاذ وإيواء',
      'سياسة للأضرار والغرامات'
    ],
    proposed: [
      'مسار تشغيلي للمشرف: جاهزية، وفحص، وحوادث',
      'مسار محتوى مع مراجعة جودة الصور',
      'ملف عقار موحّد بخمس طبقات بيانات',
      'توصية سعرية مع سياق الطلب واعتماد المشغّل',
      'قدرات المساعد: الحجز، والأسئلة، والوصول، والقفل، والإقامة، والمعلومات المحلية، والدعم',
      'ثمانية مؤشرات أداء بتعريفاتها',
      'تتبّع أداء الحملات والتحويل',
      'توثيق إقرار الضيف ومسار مراجعة الحوادث',
      'سجل دخول لكل حجز',
      'إجراء بديل عند تعطّل القفل'
    ],
    tbc: [
      'مزوّد القفل الذكي وواجهته البرمجية',
      'مزوّد الدفع وطرق الدفع',
      'قواعد الإلغاء والتعديل',
      'بداية صلاحية رموز الدخول ونهايتها',
      'نمط التسعير: استشاري أم تلقائي',
      'مهام المشرف وسير عمل المصوّر',
      'تفاصيل التكامل مع شموس ونفاذ وإيواء',
      'مبالغ الغرامات والصياغة القانونية وآلية التحصيل',
      'صلاحيات المساعد الشخصي',
      'القنوات: ويب، أم جوال، أم كلاهما'
    ],
    future: ['التنبؤ بالطلب', 'تخصيص تجربة الضيف', 'رؤى تشغيلية استباقية']
  };

  const QUESTIONS = [
    { icon: 'building-2', t: 'العقار', qs: ['من يحق له إدراج عقار في المنصة؟', 'من يتحقق من ملكية العقار أو صلاحية مشغّله؟', 'ما أنواع العقارات المدعومة في الإطلاق الأول؟', ['هل تُدار الفنادق كوحدات مستقلة أم كمنشأة بغرف متعددة؟']] },
    { icon: 'calendar-check', t: 'الحجز والدفع', qs: ['هل الدفع الإلكتروني إلزامي؟', 'ما قواعد الإلغاء؟', 'ماذا يحدث عند تعديل الحجز؟', ['من هو مزوّد الدفع، وما طرق الدفع المطلوبة؟']] },
    { icon: 'lock-keyhole', t: 'القفل الذكي', qs: ['ما مزوّدو الأقفال الذكية المدعومون؟', 'كيف تُولَّد رموز الدخول؟', 'متى تنتهي صلاحية الدخول؟', 'ماذا يحدث إذا كان القفل غير متصل؟'] },
    { icon: 'trending-up', t: 'التسعير', qs: ['هل التسعير الذكي استشاري أم تلقائي؟', 'ما إشارات الطلب التي يجب أن تؤثر في السعر؟', 'من يعتمد تغييرات الأسعار؟'] },
    { icon: 'clipboard-check', t: 'التشغيل', qs: ['ما الذي يديره المشرف تحديداً؟', 'ما سير عمل المصوّر؟', ['هل المشرفون والمصورون موظفون لدى المنصة أم شركاء خارجيون؟']] },
    { icon: 'landmark', t: 'الامتثال', qs: ['ما البيانات الدقيقة المطلوب تبادلها مع شموس؟', 'ما دور نفاذ في رحلة المستخدم؟', 'ما البيانات المتبادلة مع إيواء؟', ['ما الجهة أو النظام المقصود بإيواء تحديداً؟']] },
    { icon: 'scale', t: 'سياسة الأضرار', qs: ['كيف يُتحقَّق من الضرر؟', 'من يعتمد الغرامات؟', 'كيف يُبلَّغ الضيف؟'] },
    { icon: 'sparkles', t: 'المساعد الشخصي', qs: ['ما البيانات التي يستطيع المساعد الوصول إليها؟', 'هل يستطيع تعديل الحجوزات؟', 'هل يتواصل مع أنظمة خارجية؟', ['ما اللغات التي يجب أن يدعمها؟']] },
    { icon: 'megaphone', t: 'الحملات', qs: [['ما القنوات الإعلانية المستهدفة؟'], ['من يدير الحملات: المنصة أم المالك؟']] },
    { icon: 'layers', t: 'المنصة والأعمال', qs: [['هل الإطلاق الأول ويب، أم تطبيق جوال، أم كلاهما؟'], ['ما نموذج إيرادات المنصة: عمولة، أم اشتراك، أم غير ذلك؟']] }
  ];
  let qCounter = 0;
  QUESTIONS.forEach((g, gi) => {
    g.items = g.qs.map(q => {
      const added = Array.isArray(q);
      return { id: 'q' + gi + '-' + (qCounter++), text: added ? q[0] : q, added };
    });
  });
  const Q_TOTAL = QUESTIONS.reduce((n, g) => n + g.items.length, 0);

  /* =========================================================
     RENDER — roles
     ========================================================= */
  function renderRoles() {
    const tabs = $('#roleTabs'), panel = $('#rolePanel');
    if (!tabs) return;
    tabs.innerHTML = ROLES.map((r, i) => `<button type="button" class="role-tab" role="tab" id="role-tab-${i}" aria-selected="${i === 0}" aria-controls="rolePanel" data-i="${i}"><i data-lucide="${r.icon}" aria-hidden="true"></i><span>${r.name}</span><span class="role-idx">${pad(i + 1)}</span></button>`).join('');
    const show = i => {
      const r = ROLES[i];
      $$('.role-tab', tabs).forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
      panel.setAttribute('aria-labelledby', 'role-tab-' + i);
      const li = a => a.map(x => `<li>${x}</li>`).join('');
      panel.innerHTML = `
        <div class="role-top"><div><p class="k" dir="ltr" style="text-align:right">${r.en}</p><h4>${r.name}</h4></div>${chip(r.st, r.st === 'confirmed' ? 'دور مؤكد' : 'دور مقترح')}</div>
        <p class="role-sum">${r.sum}</p>
        <div class="role-grid">
          <div><h5>المسؤوليات</h5><ul class="tick-list">${li(r.resp)}</ul></div>
          <div><h5>الإجراءات الرئيسية</h5><ul class="tick-list">${li(r.actions)}</ul></div>
          <div><h5>الوحدات الرئيسية</h5><ul class="tick-list">${li(r.modules)}</ul></div>
          <div><h5>مستوى الوصول</h5><ul class="tick-list"><li>${r.access}</li></ul></div>
        </div>
        <div class="role-access"><b>حساب دخول مستقل؟</b><span>${r.login}</span>${chip(r.loginSt)}</div>`;
      if (HAS_GSAP && !REDUCED) gsap.fromTo(panel.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' });
    };
    tabs.addEventListener('click', e => { const b = e.target.closest('.role-tab'); if (b) show(+b.dataset.i); });
    tabs.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const cur = $$('.role-tab', tabs).findIndex(b => b.getAttribute('aria-selected') === 'true');
      const n = (cur + (e.key === 'ArrowDown' ? 1 : -1) + ROLES.length) % ROLES.length;
      show(n); $$('.role-tab', tabs)[n].focus();
    });
    show(0);
  }

  /* =========================================================
     RENDER — guest journey
     ========================================================= */
  function guestJourney() {
    const steps = $$('#gjSteps button'); if (!steps.length) return;
    const screens = $$('#phoneScreen .scr');
    const list = $('#gjSteps');
    let i = 0, playing = !REDUCED, visible = false, timer = 0;
    const set = n => {
      i = (n + GUEST.length) % GUEST.length;
      steps.forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.classList.toggle('done', j < i); b.tabIndex = j === i ? 0 : -1; });
      screens.forEach((s, j) => s.classList.toggle('is-on', j === i));
      list.style.setProperty('--p', i / (GUEST.length - 1));
      const g = GUEST[i];
      $('#gjNum').textContent = pad(i + 1);
      $('#gjTitle').textContent = g.t;
      $('#gjDesc').textContent = g.d;
      $('#gjSys').innerHTML = g.sys.map(([n, s]) => `<span class="sys-chip">${n}${chip(s)}</span>`).join('');
      if (HAS_GSAP && !REDUCED) gsap.fromTo('#gjTitle, #gjDesc, #gjSys', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' });
    };
    const setPlay = p => {
      playing = p;
      const b = $('#gjPlay');
      b.setAttribute('aria-label', p ? 'إيقاف التشغيل التلقائي' : 'تشغيل تلقائي');
      b.innerHTML = `<i data-lucide="${p ? 'pause' : 'play'}" aria-hidden="true"></i>`;
      icons();
    };
    const tick = () => { clearInterval(timer); timer = setInterval(() => { if (playing && visible && !document.hidden) set(i + 1); }, 4200); };
    steps.forEach((b, j) => b.addEventListener('click', () => { set(j); setPlay(false); }));
    list.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (document.body.classList.contains('presenting')) return;
      e.preventDefault();
      set(i + (e.key === 'ArrowLeft' ? 1 : -1)); steps[i].focus(); setPlay(false);
    });
    $('#gjNext').addEventListener('click', () => { set(i + 1); setPlay(false); });
    $('#gjPrev').addEventListener('click', () => { set(i - 1); setPlay(false); });
    $('#gjPlay').addEventListener('click', () => { setPlay(!playing); tick(); });
    onVisible($('#guestJourney'), v => { visible = v; });
    set(0); setPlay(playing); tick();
  }

  /* =========================================================
     Operator console + property file
     ========================================================= */
  function operator() {
    const seg = $('.console .seg');
    if (seg) seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
      const f = b.dataset.filter;
      $$('#units .unit').forEach(u => u.classList.toggle('dim', f !== 'all' && u.dataset.model !== f));
    });
    const layers = $$('.pf-layer'), rows = $$('.pfile-list li');
    if (!layers.length) return;
    let cur = 0, hover = false;
    const set = n => { cur = n; layers.forEach(l => l.classList.toggle('is-on', +l.dataset.l === n)); rows.forEach(r => r.classList.toggle('is-on', +r.dataset.l === n)); };
    rows.forEach(r => {
      r.addEventListener('mouseenter', () => { hover = true; set(+r.dataset.l); });
      r.addEventListener('focus', () => { hover = true; set(+r.dataset.l); });
      r.addEventListener('mouseleave', () => { hover = false; });
      r.addEventListener('blur', () => { hover = false; });
    });
    let vis = false;
    onVisible($('#pfile'), v => { vis = v; });
    set(0);
    if (!REDUCED) setInterval(() => { if (!hover && vis && !document.hidden) set((cur + 1) % layers.length); }, 2400);
  }

  /* =========================================================
     Lifecycle (panel + strip; 3D attaches later)
     ========================================================= */
  const LC = { i: 0, playing: !REDUCED, visible: false, scene: null, timer: 0 };
  function lifecycleUI() {
    const strip = $('#lcStrip'); if (!strip) return;
    strip.innerHTML = LIFECYCLE.map((s, i) => `<li><button type="button" data-i="${i}"><span>${pad(i + 1)}</span><strong>${s.t}</strong></button></li>`).join('');
    const btns = $$('button', strip);
    LC.set = (n, user) => {
      LC.i = (n + LIFECYCLE.length) % LIFECYCLE.length;
      const s = LIFECYCLE[LC.i];
      btns.forEach((b, j) => { b.classList.toggle('passed', j < LC.i); if (j === LC.i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      $('#lcNum').textContent = pad(LC.i + 1);
      $('#lcTitle').textContent = s.t;
      $('#lcEn').textContent = s.en;
      $('#lcDesc').textContent = s.d;
      $('#lcActor').textContent = s.actor;
      $('#lcModule').textContent = s.mod;
      $('#lcStatus').innerHTML = chip(s.st, ST[s.st].label);
      if (HAS_GSAP && !REDUCED) gsap.fromTo('#lcTitle, #lcEn, #lcDesc, .lc-meta', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' });
      if (LC.scene) LC.scene.set(LC.i);
      if (user) setPlay(false);
    };
    const setPlay = p => {
      LC.playing = p;
      const b = $('#lcPlay');
      b.setAttribute('aria-label', p ? 'إيقاف التشغيل التلقائي' : 'تشغيل تلقائي');
      b.innerHTML = `<i data-lucide="${p ? 'pause' : 'play'}" aria-hidden="true"></i>`;
      icons();
    };
    btns.forEach(b => b.addEventListener('click', () => LC.set(+b.dataset.i, true)));
    $('#lcNext').addEventListener('click', () => LC.set(LC.i + 1, true));
    $('#lcPrev').addEventListener('click', () => LC.set(LC.i - 1, true));
    $('#lcPlay').addEventListener('click', () => setPlay(!LC.playing));
    onVisible($('#lcStage'), v => { LC.visible = v; });
    setInterval(() => { if (LC.playing && LC.visible && !document.hidden) LC.set(LC.i + 1); }, 3800);
    LC.set(0); setPlay(LC.playing);
  }

  /* =========================================================
     Smart access step list (3D drives it; timer fallback)
     ========================================================= */
  const AX = { scene: null };
  function accessUI() {
    const items = $$('#axSteps li'); if (!items.length) return;
    AX.show = (s, hold) => {
      items.forEach((li, j) => { li.classList.toggle('on', j === s && !hold); li.classList.toggle('done', j < s || (hold && j <= s)); });
    };
    items.forEach(li => li.addEventListener('click', () => {
      const s = +li.dataset.i;
      if (AX.scene) AX.scene.jump(s); else AX.show(s);
    }));
    AX.show(0);
  }
  function accessFallback() {
    let s = 0, vis = false;
    onVisible($('#axStage'), v => { vis = v; });
    setInterval(() => { if (vis && !document.hidden) { s = (s + 1) % 7; AX.show(s); } }, 1600);
  }

  /* =========================================================
     Supervised vs unsupervised
     ========================================================= */
  function compare() {
    const tg = $('#cmpToggle'), cmp = $('#cmp'); if (!tg) return;
    tg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', tg).forEach(x => x.classList.toggle('on', x === b));
      cmp.dataset.mode = b.dataset.mode;
    });
  }

  /* =========================================================
     Pricing simulation
     ========================================================= */
  const PR = { state: { holiday: false, event: false, occasion: false, season: 0 }, scene: null };
  const SIG_NAMES = { holiday: 'عطلة رسمية', event: 'فعالية عامة', occasion: 'مناسبة خاصة' };
  function pricingUI() {
    const sigs = $('#sigs'); if (!sigs) return;
    const update = () => {
      const s = PR.state;
      const score = (s.holiday ? 2 : 0) + (s.event ? 2 : 0) + (s.occasion ? 1 : 0) + s.season * 2;
      const dir = score > 0 ? 'up' : score < 0 ? 'down' : 'hold';
      const ang = clamp(score * 15, -78, 78);
      const needle = $('#gNeedle'); if (needle) needle.style.transform = `rotate(${ang}deg)`;
      const d = $('#prDir'), w = $('#prWhy');
      d.classList.toggle('up', dir === 'up'); d.classList.toggle('down', dir === 'down');
      const act = Object.keys(SIG_NAMES).filter(k => s[k]).map(k => SIG_NAMES[k]);
      if (s.season === 1) act.push('موسم مرتفع');
      if (dir === 'up') {
        d.textContent = 'فرصة لرفع السعر';
        w.textContent = 'طلب متوقع أعلى في التواريخ المظلّلة بسبب: ' + act.join('، ') + (s.season === -1 ? ' — رغم الموسم المنخفض.' : '.');
      } else if (dir === 'down') {
        d.textContent = 'خفض مقترح لتحفيز الطلب';
        w.textContent = act.length ? 'الموسم المنخفض يتغلّب على: ' + act.join('، ') + '.' : 'موسم منخفض دون إشارات طلب مرتفعة في الفترة المعروضة.';
      } else {
        d.textContent = 'الإبقاء على السعر الحالي';
        w.textContent = act.length ? 'الإشارات الإيجابية يعادلها الموسم المنخفض.' : 'لا توجد إشارات طلب استثنائية في الفترة المعروضة.';
      }
      if (PR.scene) PR.scene.apply(s);
    };
    sigs.addEventListener('click', e => {
      const b = e.target.closest('.sig'); if (!b) return;
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      PR.state[b.dataset.sig] = on; update();
    });
    const season = $('#season');
    season.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', season).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
      PR.state.season = +b.dataset.season; update();
    });
    PR.update = update;
    update();
  }

  /* =========================================================
     Assistant chat
     ========================================================= */
  function assistant() {
    const log = $('#chatLog'), quick = $('#chatQuick'), caps = $('#caps'); if (!log) return;
    caps.innerHTML = ASSIST.map(a => `<li><i data-lucide="${a.icon}" aria-hidden="true"></i><div><strong>${a.t}</strong><span class="d">${a.d}</span></div>${chip('recommended')}</li>`).join('');
    quick.innerHTML = ASSIST.map((a, i) => `<button type="button" data-i="${i}"><i data-lucide="${a.icon}" aria-hidden="true"></i>${a.t}</button>`).join('');
    const add = (cls, html) => { const el = document.createElement(cls === 'note' ? 'p' : 'p'); el.className = cls === 'note' ? 'msg-note' : 'msg msg--' + cls; el.innerHTML = html; log.appendChild(el); log.scrollTop = log.scrollHeight; return el; };
    add('ai', 'مرحباً، أنا مساعدك الشخصي. أستطيع مساعدتك في حجزك ووصولك وإقامتك. اختر سؤالاً لنبدأ.');
    let busy = false, played = false;
    const play = i => {
      if (busy) return; busy = true;
      const a = ASSIST[i];
      $$('button', quick).forEach(b => { b.disabled = true; b.classList.toggle('on', +b.dataset.i === i); });
      add('me', a.q);
      setTimeout(() => {
        const t = document.createElement('div'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); log.scrollTop = log.scrollHeight;
        setTimeout(() => {
          t.remove(); add('ai', a.a);
          if (a.note) { add('note', `<i data-lucide="info" aria-hidden="true"></i>${a.note}`); icons(); }
          busy = false; played = true;
          $$('button', quick).forEach(b => { b.disabled = false; });
        }, REDUCED ? 100 : 1100);
      }, REDUCED ? 50 : 350);
    };
    quick.addEventListener('click', e => { const b = e.target.closest('button'); if (b) play(+b.dataset.i); });
    onVisible(log, v => { if (v && !played && !busy) setTimeout(() => { if (!played && !busy) play(3); }, 700); }, { threshold: 0.6 });
  }

  /* =========================================================
     KPI sparklines (illustrative shapes, not data)
     ========================================================= */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function kpis() {
    const NS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(NS, 'svg');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.setAttribute('aria-hidden', 'true');
    defs.style.position = 'absolute';
    defs.innerHTML = '<defs><linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E3C58E" stop-opacity=".26"/><stop offset="1" stop-color="#E3C58E" stop-opacity="0"/></linearGradient></defs>';
    document.body.appendChild(defs);
    $$('.kpi').forEach(k => {
      const svg = $('.spark', k); if (!svg) return;
      const rnd = mulberry32(+k.dataset.seed || 1);
      const N = 26, W = 240, H = 64, P = 6;
      let v = 0.35 + rnd() * 0.2; const pts = [];
      for (let i = 0; i < N; i++) { v = clamp(v + (rnd() - 0.42) * 0.16, 0.08, 0.92); pts.push([P + (i / (N - 1)) * (W - 2 * P), H - P - v * (H - 2 * P)]); }
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      const last = pts[N - 1];
      svg.innerHTML = `<line class="grid" x1="0" x2="${W}" y1="${H * 0.25}" y2="${H * 0.25}"/><line class="grid" x1="0" x2="${W}" y1="${H * 0.5}" y2="${H * 0.5}"/><line class="grid" x1="0" x2="${W}" y1="${H * 0.75}" y2="${H * 0.75}"/><path class="area" d="${d} L${W - P} ${H} L${P} ${H} Z" fill="url(#sparkFill)"/><path class="ln" d="${d}"/><circle class="end" cx="${last[0]}" cy="${last[1]}" r="2.6"/>`;
      const ln = $('.ln', svg);
      const len = Math.ceil(ln.getTotalLength ? ln.getTotalLength() : 400);
      ln.style.setProperty('--len', len);
      k.addEventListener('pointermove', e => { const r = k.getBoundingClientRect(); k.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); });
    });
    onVisible($('#kpis'), v => { if (v) $$('.kpi').forEach((k, i) => setTimeout(() => k.classList.add('drawn'), i * 110)); }, { threshold: 0.2 });
  }

  /* =========================================================
     Campaign funnel (2D canvas)
     ========================================================= */
  function funnel() {
    const cv = $('#funnelCanvas'); if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, parts = [], vis = false, last = 0, acc = 0;
    const G = 6;
    const resize = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); w = cv.clientWidth; h = cv.clientHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (REDUCED) draw(); };
    const half = f => h * (0.42 - 0.27 * f);
    const X = f => w - f * w;
    const spawn = () => { let g = 0; while (g < G - 1 && Math.random() < 0.74) g++; return { f: 0, y: (Math.random() * 2 - 1) * 0.88, sp: 0.075 + Math.random() * 0.05, stop: (g + 1) / G, dead: 0, r: 1 + Math.random() * 1.3 }; };
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const cy = h / 2;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const f = i / 60; ctx.lineTo(X(f), cy - half(f)); }
      for (let i = 60; i >= 0; i--) { const f = i / 60; ctx.lineTo(X(f), cy + half(f)); }
      ctx.closePath();
      const gr = ctx.createLinearGradient(w, 0, 0, 0);
      gr.addColorStop(0, 'rgba(200,164,107,0.02)'); gr.addColorStop(1, 'rgba(200,164,107,0.10)');
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = 'rgba(200,164,107,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(236,222,196,0.13)';
      for (let k = 1; k < G; k++) { const f = k / G; ctx.beginPath(); ctx.moveTo(X(f), cy - half(f)); ctx.lineTo(X(f), cy + half(f)); ctx.stroke(); }
      ctx.setLineDash([]);
      for (const p of parts) {
        const stage = Math.floor(p.f * G);
        const a = p.dead ? Math.max(0, 1 - p.dead / 0.7) : Math.min(1, p.f * 12);
        const x = X(p.f), y = cy + p.y * half(p.f) * (1 + p.dead * 0.6);
        if (stage >= 4) { ctx.fillStyle = `rgba(227,197,142,${0.9 * a})`; ctx.shadowColor = 'rgba(227,197,142,0.8)'; ctx.shadowBlur = stage >= 5 ? 10 : 5; }
        else { ctx.fillStyle = `rgba(236,230,218,${0.5 * a})`; ctx.shadowBlur = 0; }
        ctx.beginPath(); ctx.arc(x, y, p.r * (stage >= 5 ? 1.4 : 1), 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      if (vis && !document.hidden) {
        acc += dt * (SMALL ? 22 : 38);
        while (acc > 1 && parts.length < 420) { parts.push(spawn()); acc -= 1; }
        for (const p of parts) { if (p.dead) p.dead += dt; else { p.f += p.sp * dt; if (p.f >= p.stop) { if (p.stop >= 1) p.dead = 1; else { p.f = p.stop; p.dead = 0.0001; } } } }
        parts = parts.filter(p => !p.dead || p.dead < 0.7);
        draw();
      }
      requestAnimationFrame(frame);
    }
    new ResizeObserver(resize).observe(cv);
    resize();
    onVisible(cv, v => { vis = v; }, { threshold: 0 });
    if (REDUCED) { for (let i = 0; i < 160; i++) { const p = spawn(); p.f = Math.random() * p.stop; parts.push(p); } draw(); }
    else requestAnimationFrame(frame);
  }

  /* =========================================================
     Compliance cards
     ========================================================= */
  const CX = { scene: null, k: 'shomoos' };
  function complianceUI() {
    const tabs = $('#cxTabs'), card = $('#cxCard'); if (!tabs) return;
    CX.set = (k, fromScene) => {
      CX.k = k;
      const c = COMPLIANCE[k];
      $$('button', tabs).forEach(b => { const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      card.innerHTML = `
        <div class="cx-card-top"><span class="cx-ico"><i data-lucide="${c.icon}" aria-hidden="true"></i></span><div><h3>${c.name}</h3><span>${c.en}</span></div></div>
        <dl>
          <div><dt><i data-lucide="target" aria-hidden="true"></i>الغرض</dt><dd>${c.purpose}</dd></div>
          <div><dt><i data-lucide="route" aria-hidden="true"></i>تدفق البيانات</dt><dd>${c.flow}</dd></div>
          <div><dt><i data-lucide="zap" aria-hidden="true"></i>المحفّز</dt><dd>${c.trigger}</dd></div>
          <div><dt><i data-lucide="trending-up" aria-hidden="true"></i>القيمة للأعمال</dt><dd>${c.value}</dd></div>
          <div><dt><i data-lucide="flag" aria-hidden="true"></i>حالة التكامل</dt><dd class="chips" style="margin-top:4px">${chip('confirmed', 'مطلوب من العميل')}${chip('tbc', 'تفاصيل التكامل — بانتظار التأكيد')}</dd></div>
        </dl>`;
      icons();
      if (HAS_GSAP && !REDUCED) gsap.fromTo(card.querySelectorAll('.cx-card-top, dl > div'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 });
      if (CX.scene && !fromScene) CX.scene.select(k);
    };
    tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) CX.set(b.dataset.k); });
    CX.set('shomoos');
  }

  /* =========================================================
     Ecosystem list + tooltip content
     ========================================================= */
  const ECO_UI = { scene: null };
  function ecoTipHTML(n) {
    return `<h4>${n.name}${chip(n.st)}</h4><dl>
      <div><dt>الغرض</dt><dd>${n.purpose}</dd></div>
      <div><dt>المستخدم</dt><dd>${n.user}</dd></div>
      <div><dt>القيمة المتوقعة</dt><dd>${n.value}</dd></div>
      ${n.note ? `<div><dt>ملاحظة</dt><dd>${chip('tbc', n.note)}</dd></div>` : ''}
    </dl>`;
  }
  function ecosystemUI() {
    const list = $('#ecoList'); if (!list) return;
    list.innerHTML = ECO.map((n, i) => `<button type="button" data-i="${i}" style="--c:${GRP[n.grp].css}"><i></i>${n.name}</button>`).join('');
    const tip = $('#ecoTip');
    const staticTip = i => { // fallback without 3D
      if (i < 0) { tip.hidden = true; return; }
      tip.innerHTML = ecoTipHTML(ECO[i]); tip.hidden = false;
      tip.style.left = '12px'; tip.style.top = '12px';
    };
    const hover = i => { $$('button', list).forEach(b => b.classList.toggle('on', +b.dataset.i === i)); if (ECO_UI.scene) ECO_UI.scene.listHover(i); else staticTip(i); };
    list.addEventListener('mouseover', e => { const b = e.target.closest('button'); if (b) hover(+b.dataset.i); });
    list.addEventListener('focusin', e => { const b = e.target.closest('button'); if (b) hover(+b.dataset.i); });
    list.addEventListener('mouseleave', () => hover(-1));
    list.addEventListener('focusout', () => hover(-1));
    list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) hover(+b.dataset.i); });
  }

  /* =========================================================
     Architecture hover
     ========================================================= */
  function architecture() {
    const arch = $('#arch'); if (!arch) return;
    const mods = $$('.arch-m', arch);
    const EXTRA = {
      'u-guest': ['c-guest'], 'u-owner': ['c-ops'], 'u-field': ['c-field'], 'u-admin': ['c-ops'],
      'c-guest': ['m-discover', 'm-book', 'm-access', 'm-assist'], 'c-ops': ['m-prop', 'm-pricing', 'm-kpi', 'm-camp', 'm-policy', 'm-avail'],
      'c-field': ['m-ops', 'm-media', 'm-policy'], 'c-mobile': ['c-guest', 'c-field']
    };
    const rel = {};
    mods.forEach(m => { const id = m.dataset.id; rel[id] = (m.dataset.rel ? m.dataset.rel.split(' ') : []).concat(EXTRA[id] || []); });
    const hot = id => {
      const s = new Set(rel[id] || []);
      Object.keys(rel).forEach(k => { if (rel[k].includes(id)) s.add(k); });
      return s;
    };
    const on = m => { const id = m.dataset.id, s = hot(id); arch.classList.add('hovering'); mods.forEach(x => { x.classList.toggle('is-src', x === m); x.classList.toggle('is-hot', s.has(x.dataset.id)); }); };
    const off = () => { arch.classList.remove('hovering'); mods.forEach(x => x.classList.remove('is-src', 'is-hot')); };
    mods.forEach(m => { m.tabIndex = 0; m.addEventListener('mouseenter', () => on(m)); m.addEventListener('focus', () => on(m)); m.addEventListener('mouseleave', off); m.addEventListener('blur', off); });
  }

  /* =========================================================
     Data flow
     ========================================================= */
  function dataFlow() {
    const track = $('#dfTrack'), det = $('#dfDetail'); if (!track) return;
    track.innerHTML = DATAFLOW.map((n, i) => `${i ? '<li class="df-link" aria-hidden="true"></li>' : ''}<li style="display:contents"><button type="button" class="df-node" data-i="${i}" aria-pressed="false"><span class="df-i">${pad(i + 1)}</span><i data-lucide="${n.icon}" aria-hidden="true"></i><strong>${n.n}</strong></button></li>`).join('');
    const nodes = $$('.df-node', track), links = $$('.df-link', track);
    const select = i => {
      nodes.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      const n = DATAFLOW[i];
      det.innerHTML = `<h3>${n.n}<small dir="ltr">${n.en}</small></h3><dl><dt>البيانات (مفاهيمية)</dt><dd>${n.data}</dd></dl><dl><dt>تنتقل إلى</dt><dd>${n.to}</dd></dl>`;
    };
    nodes.forEach(b => b.addEventListener('click', () => select(+b.dataset.i)));
    let playing = false;
    const play = () => {
      if (playing) return; playing = true;
      nodes.forEach(n => n.classList.remove('lit')); links.forEach(l => l.classList.remove('lit'));
      nodes.forEach((n, i) => setTimeout(() => { n.classList.add('lit'); if (links[i - 1]) links[i - 1].classList.add('lit'); select(i); if (i === nodes.length - 1) playing = false; }, i * (REDUCED ? 60 : 520)));
    };
    $('#dfPlay').addEventListener('click', play);
    select(0);
    let auto = false;
    onVisible(track, v => { if (v && !auto) { auto = true; setTimeout(play, 500); } }, { threshold: 0.5 });
  }

  /* =========================================================
     Requirements explorer
     ========================================================= */
  function requirements() {
    const list = $('#rqList'); if (!list) return;
    const F = { q: '', st: 'all', mod: 'all' };
    const statuses = ['confirmed', 'proposed', 'recommended', 'tbc'];
    const count = (arr, fn) => arr.filter(fn).length;
    const stBox = $('#rqStatus'), modBox = $('#rqMods');
    stBox.innerHTML = `<button type="button" class="fchip" data-st="all" aria-pressed="true">الكل <b>${REQS.length}</b></button>` +
      statuses.map(s => `<button type="button" class="fchip" data-st="${s}" aria-pressed="false" style="--c:${ST[s].color}">${ST[s].label} <b>${count(REQS, r => r.st === s)}</b></button>`).join('');
    modBox.innerHTML = `<button type="button" class="fchip" data-mod="all" aria-pressed="true">كل الوحدات</button>` +
      Object.keys(MODS).map(m => `<button type="button" class="fchip" data-mod="${m}" aria-pressed="false">${MODS[m]} <b>${count(REQS, r => r.mod === m)}</b></button>`).join('');
    const render = () => {
      const q = F.q.trim().toLowerCase();
      const rows = REQS.filter(r => (F.st === 'all' || r.st === F.st) && (F.mod === 'all' || r.mod === F.mod) && (!q || r.text.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || MODS[r.mod].includes(q)));
      list.innerHTML = rows.length ? rows.map(r => `<li class="rq-item"><span class="rq-id">${r.id}</span><p class="rq-text">${r.text}</p><span class="rq-mod">${MODS[r.mod]}</span>${chip(r.st, ST[r.st].label)}</li>`).join('') : '<li class="rq-empty">لا توجد متطلبات مطابقة. جرّب كلمة أخرى أو أزل التصفية.</li>';
      $('#rqCount').textContent = `عرض ${rows.length} من ${REQS.length} متطلباً وظيفياً`;
      $('#rqBar').innerHTML = statuses.map(s => { const n = count(rows, r => r.st === s); return n ? `<span style="--c:${ST[s].color}; flex:${n}" title="${ST[s].label}: ${n}"></span>` : ''; }).join('');
    };
    stBox.addEventListener('click', e => { const b = e.target.closest('.fchip'); if (!b) return; F.st = b.dataset.st; $$('.fchip', stBox).forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); });
    modBox.addEventListener('click', e => { const b = e.target.closest('.fchip'); if (!b) return; F.mod = b.dataset.mod; $$('.fchip', modBox).forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); });
    $('#rqSearch').addEventListener('input', e => { F.q = e.target.value; render(); });
    render();
  }

  /* =========================================================
     Business rules
     ========================================================= */
  function rules() {
    const grid = $('#brGrid'); if (!grid) return;
    const render = f => {
      const rows = RULES.filter(r => f === 'all' || r.st === 'tbc');
      grid.innerHTML = rows.map(r => `<article class="br${r.st === 'tbc' ? ' is-tbc' : ''}"><div class="br-top"><span class="br-id">${r.id}</span>${chip(r.st)}</div><p>${r.text}</p><p class="br-why">${r.why}</p></article>`).join('');
      $('#brCount').textContent = f === 'all' ? `${RULES.length} قاعدة أعمال مفاهيمية · ${RULES.filter(r => r.st === 'tbc').length} منها بانتظار التأكيد` : `${rows.length} قاعدة تحتاج قراراً من العميل`;
    };
    const box = $('#brFilter');
    box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', box).forEach(x => x.classList.toggle('on', x === b)); render(b.dataset.f); });
    render('all');
  }

  /* =========================================================
     Scope
     ========================================================= */
  function scope() {
    const el = $('#scope'); if (!el) return;
    const zone = (k, title, sub, items) => `<article class="zone zone--${k} reveal"><div class="zone-head"><span class="zone-n">${pad(items.length)}</span><h3>${title}</h3><p>${sub}</p></div><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul></article>`;
    el.innerHTML =
      zone('confirmed', 'رؤية العميل المؤكدة', 'ما ورد صراحة في الفكرة الأولية.', SCOPE.confirmed) +
      zone('proposed', 'قدرات المنتج المقترحة', 'ما نقترحه لتحويل الرؤية إلى منتج متكامل.', SCOPE.proposed) +
      zone('tbc', 'بانتظار التأكيد', 'ما يحتاج قراراً قبل التصميم التفصيلي.', SCOPE.tbc) +
      `<div class="future reveal">${chip('future', 'تطويرات مستقبلية')}${SCOPE.future.map(x => `<span>${x}</span>`).join('')}</div>`;
  }

  /* =========================================================
     Open questions (per-viewer "discussed" marks)
     ========================================================= */
  function questions() {
    const grid = $('#oqGrid'); if (!grid) return;
    const KEY = 'ssp-open-questions-v1';
    let done = new Set();
    try { done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { done = new Set(); }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(Array.from(done))); } catch (e) { /* storage unavailable */ } };
    grid.innerHTML = QUESTIONS.map(g => `<section class="oq-group reveal"><h3><i data-lucide="${g.icon}" aria-hidden="true"></i>${g.t}<small>${g.items.length}</small></h3>${g.items.map(q => `<button type="button" class="oq-q" data-id="${q.id}" aria-pressed="${done.has(q.id)}"><span>${q.text}</span>${q.added ? '<span class="added">أضافه الفريق</span>' : ''}</button>`).join('')}</section>`).join('');
    const meter = () => {
      const n = done.size;
      $('#oqCount').textContent = `نوقش ${n} من ${Q_TOTAL} سؤالاً`;
      $('#oqBar').style.transform = `scaleX(${n / Q_TOTAL})`;
    };
    grid.addEventListener('click', e => {
      const b = e.target.closest('.oq-q'); if (!b) return;
      const id = b.dataset.id;
      if (done.has(id)) done.delete(id); else done.add(id);
      b.setAttribute('aria-pressed', String(done.has(id))); save(); meter();
    });
    $('#oqReset').addEventListener('click', () => { done.clear(); save(); $$('.oq-q', grid).forEach(b => b.setAttribute('aria-pressed', 'false')); meter(); });
    meter();
  }

  /* =========================================================
     Executive summary
     ========================================================= */
  function executive() {
    const stats = $('#execStats'), qa = $('#execQA'); if (!stats) return;
    const tbcCount = SCOPE.tbc.length;
    stats.innerHTML = [
      [REQS.length, 'متطلباً وظيفياً مشتقاً'],
      [RULES.length, 'قاعدة أعمال مفاهيمية'],
      [Q_TOTAL, 'سؤالاً مفتوحاً للنقاش'],
      [SCOPE.proposed.length, 'قدرات منتج مقترحة']
    ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
    const QA = [
      ['ما هو المنتج؟', 'منظومة إقامة ذكية تجمع حجز الشقق والفنادق والوحدات السكنية مع الدخول الذكي والتشغيل والتسعير والامتثال.', 's03'],
      ['من يستخدمه؟', 'الضيوف، والملاك والمشغّلون، وفريق المنصة من مشرفين ومصورين وإدارة، إضافة إلى أنظمة التكامل.', 's03'],
      ['ما المشكلة التي يحلّها؟', 'تشتّت تجربة الإقامة القصيرة بين المفاتيح والتسعير والتشغيل والامتثال والتقارير.', 's02'],
      ['كيف تعمل رحلة العميل؟', 'اكتشاف، فحجز، فتأكيد، فدخول برمز رقمي، فإقامة بمساعدة شخصية، فمغادرة.', 's05'],
      ['كيف تعمل رحلة العقار؟', 'إحدى عشرة مرحلة من الإدراج والتحقق حتى التحليل والتحسين المستمر.', 's07'],
      ['كيف يعمل الدخول الذكي؟', 'الحجز المؤكد يولّد رمزاً مرتبطاً بالحجز والوحدة، يفتح القفل وتُسجَّل كل عملية دخول.', 's08'],
      ['كيف يعمل التشغيل؟', 'مسار للمشرف ومسار للمحتوى في العقارات المُشرَف عليها، وتشغيل رقمي في العقارات ذاتية الخدمة.', 's12'],
      ['كيف يعمل ذكاء التسعير؟', 'مساعد يقرأ العطلات والفعاليات والمناسبات والمواسم، ويقترح السعر مع سياق التوصية.', 's10'],
      ['أين تقع تكاملات الامتثال؟', 'شموس ونفاذ وإيواء تكاملات خارجية في طبقة التكامل، وتفاصيلها بانتظار التأكيد.', 's15'],
      ['كيف يُقاس الأداء؟', 'ثمانية مؤشرات مقترحة، منها الحجوزات والإشغال والإيرادات ومتوسط السعر اليومي.', 's13'],
      ['ما المؤكد؟', `${SCOPE.confirmed.length} بنداً من رؤية العميل، أبرزها الدخول الذكي ونموذجا التشغيل والتكاملات الثلاثة.`, 's22'],
      ['ما المقترح؟', `${SCOPE.proposed.length} قدرات مقترحة تحوّل الرؤية إلى منتج متكامل.`, 's22'],
      ['ما الذي يحتاج قراراً؟', `${Q_TOTAL} سؤالاً مفتوحاً، و${tbcCount} بنود نطاق بانتظار التأكيد.`, 's23']
    ];
    qa.innerHTML = QA.map(([q, a, s]) => `<div class="qa reveal"><h3>${q}</h3><p>${a}</p><a href="#${s}">القسم ${s.slice(1)}</a></div>`).join('');
  }

  /* =========================================================
     Navigation: rail, progress, legend, reveal
     ========================================================= */
  const sections = $$('#story > .sec');
  let activeIdx = 0;
  function navigation() {
    const rail = $('#railList');
    rail.innerHTML = sections.map((s, i) => `<li><a href="#${s.id}" data-i="${i}" aria-label="${pad(i + 1)} — ${s.dataset.title}"><span class="tick"></span><span class="rail-num">${pad(i + 1)}</span><span class="rail-label">${s.dataset.title}</span></a></li>`).join('');
    const links = $$('a', rail);
    const setActive = i => {
      activeIdx = i;
      links.forEach((a, j) => { a.classList.toggle('active', j === i); a.classList.toggle('passed', j < i); if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(sections.indexOf(e.target)); }), { rootMargin: '-45% 0px -54% 0px' });
    sections.forEach(s => io.observe(s));
    setActive(0);

    const topbar = $('#topbar'), bar = $('#topProgress');
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        topbar.classList.toggle('scrolled', y > 24);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
        if (!HAS_ST) { const hh = sections[0].offsetHeight || 1; heroScroll = clamp(y / hh, 0, 1); }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // legend popover
    const btn = $('#legendBtn'), pop = $('#legend');
    const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => { e.stopPropagation(); const open = pop.hidden; pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
    $('#legendClose').addEventListener('click', close);
    document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) close(); });
  }
  function reveals() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  }

  /* =========================================================
     Presentation mode
     ========================================================= */
  const P = { on: false, i: 0, fs: false };
  function presentation() {
    const hud = $('#hud');
    const show = (i, dir) => {
      i = clamp(i, 0, sections.length - 1);
      const prev = sections[P.i];
      P.i = i;
      const cur = sections[i];
      if (prev && prev !== cur) prev.classList.remove('is-slide');
      cur.classList.add('is-slide');
      cur.scrollTop = 0;
      $('#hudNum').textContent = pad(i + 1);
      $('#hudName').textContent = cur.dataset.title;
      $('#hudBar').style.transform = `scaleX(${(i + 1) / sections.length})`;
      $('.hud-sep').textContent = '/ ' + pad(sections.length);
      if (HAS_GSAP && !REDUCED && dir) gsap.fromTo(cur, { opacity: 0, y: dir > 0 ? 28 : -28 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'opacity,transform' });
    };
    const enter = () => {
      if (P.on) return;
      P.on = true; P.i = activeIdx;
      document.body.classList.add('presenting');
      hud.hidden = false;
      show(activeIdx, 1);
      const el = document.documentElement;
      try {
        if (el.requestFullscreen) el.requestFullscreen().then(() => { P.fs = true; }).catch(() => { P.fs = false; });
      } catch (e) { P.fs = false; }
    };
    const exit = () => {
      if (!P.on) return;
      P.on = false;
      const target = sections[P.i];
      sections.forEach(s => s.classList.remove('is-slide'));
      document.body.classList.remove('presenting');
      hud.hidden = true;
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      P.fs = false;
      const html = document.documentElement;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
      requestAnimationFrame(() => { html.style.scrollBehavior = ''; });
    };
    P.enter = enter; P.exit = exit;
    $('#presentBtn').addEventListener('click', enter);
    $('#hudExit').addEventListener('click', exit);
    $('#hudNext').addEventListener('click', () => show(P.i + 1, 1));
    $('#hudPrev').addEventListener('click', () => show(P.i - 1, -1));
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && P.on && P.fs) exit(); });
    document.addEventListener('keydown', e => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (!P.on) {
        if (!typing && (e.key === 'p' || e.key === 'P' || e.key === 'ح') && !e.ctrlKey && !e.metaKey && !e.altKey) enter();
        return;
      }
      if (typing && e.key !== 'Escape') return;
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': e.preventDefault(); show(P.i + 1, 1); break;
        case 'ArrowLeft': case 'PageUp': e.preventDefault(); show(P.i - 1, -1); break;
        case 'Home': e.preventDefault(); show(0, -1); break;
        case 'End': e.preventDefault(); show(sections.length - 1, 1); break;
        case 'Escape': e.preventDefault(); exit(); break;
        default: break;
      }
    });
    // in-slide anchor links jump between slides
    document.addEventListener('click', e => {
      if (!P.on) return;
      const a = e.target.closest('a[href^="#s"]'); if (!a) return;
      const idx = sections.findIndex(s => '#' + s.id === a.getAttribute('href'));
      if (idx >= 0) { e.preventDefault(); show(idx, idx > P.i ? 1 : -1); }
    });
  }

  /* =========================================================
     THREE.JS ENGINE
     ========================================================= */
  let heroScroll = 0;
  const C = { gold: 0xC8A46B, gold2: 0xE3C58E, steel: 0x86B4C4, ivory: 0xECE6DA, copper: 0xE0915E, slate: 0x9BA1B3, ok: 0x8FC29A };
  const stages = [];
  let _v, _glowTex = null, engineStarted = false, lastT = 0;

  function engineLoop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    if (!document.hidden) {
      for (const st of stages) {
        if (!st.visible || !st.w) continue;
        st.time += dt * (REDUCED ? 0.2 : 1);
        st.pointer.x += (st.pointer.tx - st.pointer.x) * 0.06;
        st.pointer.y += (st.pointer.ty - st.pointer.y) * 0.06;
        if (st.update) st.update(REDUCED ? dt * 0.2 : dt, st.time);
        st.renderer.render(st.scene, st.camera);
        if (st.labels.length) updateLabels(st);
        if (st.after) st.after();
      }
    }
    requestAnimationFrame(engineLoop);
  }

  function createStage(host, opts) {
    opts = opts || {};
    if (!HAS_THREE || !host) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    if (!renderer.getContext()) return null;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SMALL ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.insertBefore(renderer.domElement, host.firstChild);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.1, 200);
    const st = { host, renderer, scene, camera, visible: false, time: 0, w: 0, h: 0, dist: 14,
      pointer: { x: 0, y: 0, tx: 0, ty: 0, inside: false, px: 0, py: 0 },
      labels: [], labelLayer: host.querySelector('.stage-labels'), update: null, onResize: null, after: null };
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      st.w = w; st.h = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (st.onResize) st.onResize(w, h);
    };
    st.resize = resize;
    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; }, { rootMargin: '80px' }).observe(host);
    const pt = opts.pointerTarget || host;
    pt.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      st.pointer.px = e.clientX - r.left; st.pointer.py = e.clientY - r.top;
      st.pointer.tx = clamp((st.pointer.px / r.width) * 2 - 1, -1, 1);
      st.pointer.ty = clamp(-((st.pointer.py / r.height) * 2 - 1), -1, 1);
      st.pointer.inside = true;
    });
    pt.addEventListener('pointerleave', () => { st.pointer.tx = 0; st.pointer.ty = 0; st.pointer.inside = false; });
    stages.push(st);
    if (!engineStarted) { engineStarted = true; requestAnimationFrame(engineLoop); }
    resize();
    return st;
  }

  function addLabel(st, html, obj, cls, pos, offset) {
    const el = document.createElement('div');
    el.className = 's-label' + (cls ? ' ' + cls : '');
    el.innerHTML = html;
    if (st.labelLayer) st.labelLayer.appendChild(el);
    const L = { el, obj, pos: pos || new THREE.Vector3(), offset: offset || new THREE.Vector3(), hidden: false, ndc: new THREE.Vector3(), x: 0, y: 0 };
    st.labels.push(L);
    return L;
  }
  function updateLabels(st) {
    for (const L of st.labels) {
      if (L.hidden) { if (!L.el.hidden) L.el.hidden = true; continue; }
      if (L.el.hidden) L.el.hidden = false;
      if (L.obj) { L.obj.getWorldPosition(_v); _v.add(L.offset); } else _v.copy(L.pos).add(L.offset);
      L.world = L.world || new THREE.Vector3(); L.world.copy(_v);
      _v.project(st.camera);
      L.ndc.copy(_v);
      const off = _v.z > 1 || Math.abs(_v.x) > 1.06 || Math.abs(_v.y) > 1.08;
      L.el.classList.toggle('is-hidden', off);
      L.x = (_v.x * 0.5 + 0.5) * st.w; L.y = (-_v.y * 0.5 + 0.5) * st.h;
      L.el.style.transform = `translate3d(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  }

  function glowTex() {
    if (_glowTex) return _glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.22, 'rgba(255,255,255,0.7)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    _glowTex = new THREE.CanvasTexture(c);
    return _glowTex;
  }
  const lineMat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity == null ? 1 : opacity, depthWrite: false });
  function glowSprite(color, scale, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: opacity == null ? 1 : opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(scale || 1);
    return s;
  }
  function glassMat(color, opacity) {
    return new THREE.MeshPhysicalMaterial({ color: color || 0xffffff, metalness: 0.15, roughness: 0.2, transparent: true, opacity: opacity == null ? 0.07 : opacity, clearcoat: 1, clearcoatRoughness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  }
  function glassMesh(geo, o) {
    o = o || {};
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, glassMat(o.fill || 0xfff4e0, o.fillOpacity == null ? 0.07 : o.fillOpacity));
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), lineMat(o.edge || C.gold, o.edgeOpacity == null ? 0.85 : o.edgeOpacity));
    g.add(m); g.add(e);
    g.userData.mesh = m; g.userData.edges = e;
    return g;
  }
  const edgesOnly = (geo, color, opacity) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(color, opacity));
  function boxBase(w, h, d) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return g; }
  function houseGeo(w, h, roof, d) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(0, h + roof); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }
  function circlePoints(r, n, y) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * r, y || 0, Math.cos(a) * r)); }
    return pts;
  }
  const ringMesh = (r, color, opacity) => new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 180), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  function floorLines(w, h, d, step, color, opacity) {
    const p = [], hw = w / 2, hd = d / 2;
    for (let y = step; y < h - 0.02; y += step) {
      p.push(-hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return new THREE.LineSegments(g, lineMat(color, opacity));
  }
  function setOpacity(group, k) {
    group.traverse(o => {
      if (!o.material) return;
      if (o.userData.baseOp === undefined) o.userData.baseOp = o.material.opacity;
      o.material.opacity = o.userData.baseOp * k;
    });
  }
  function addLights(scene) {
    scene.add(new THREE.AmbientLight(0xfff3e0, 0.55));
    const d = new THREE.DirectionalLight(0xffe2b8, 1.1); d.position.set(6, 10, 8); scene.add(d);
    const p = new THREE.PointLight(0x86B4C4, 1.2, 40); p.position.set(-8, 5, -6); scene.add(p);
  }
  function makePackets(parent, specs, size) {
    const n = specs.length;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: size || 0.2, map: glowTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    pts.frustumCulled = false;
    parent.add(pts);
    const cols = specs.map(s => new THREE.Color(s.color));
    const tmp = new THREE.Vector3();
    const api = {
      specs,
      update(dt) {
        for (let i = 0; i < n; i++) {
          const s = specs[i];
          s.t = (s.t + dt * s.speed) % 1;
          s.curve.getPoint(s.rev ? 1 - s.t : s.t, tmp);
          pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;
          const k = Math.sin(Math.PI * s.t) * (s.gain == null ? 1 : s.gain);
          col[i * 3] = cols[i].r * k; col[i * 3 + 1] = cols[i].g * k; col[i * 3 + 2] = cols[i].b * k;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
      }
    };
    api.update(0);
    return api;
  }
  function makeDust(parent, n, spread, color, size, opacity) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * spread[0]; pos[i * 3 + 1] = (Math.random() - 0.5) * spread[1]; pos[i * 3 + 2] = (Math.random() - 0.5) * spread[2]; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    parent.add(pts);
    return pts;
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const curveLine = (curve, color, opacity, n) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(n || 64)), lineMat(color, opacity));

  function building(type) {
    const g = new THREE.Group();
    let h;
    if (type === 'hotel') {
      h = 3.6;
      g.add(glassMesh(boxBase(1.15, h, 1.15), { edge: C.gold2, fillOpacity: 0.07 }));
      g.add(floorLines(1.15, h, 1.15, 0.36, C.gold, 0.22));
      const crown = glassMesh(boxBase(0.6, 0.35, 0.6), { edge: C.gold2 }); crown.position.y = h; g.add(crown);
      h += 0.35;
    } else if (type === 'apt') {
      h = 2.2;
      g.add(glassMesh(boxBase(1.7, h, 1.05), { edge: C.gold, fillOpacity: 0.06 }));
      g.add(floorLines(1.7, h, 1.05, 0.44, C.gold, 0.2));
    } else {
      g.add(glassMesh(houseGeo(1.3, 0.8, 0.55, 1.05), { edge: C.gold2, fillOpacity: 0.07 }));
      h = 1.35;
    }
    const padRing = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(1.25, 64)), lineMat(C.gold, 0.28));
    padRing.position.y = 0.02; g.add(padRing);
    g.userData.h = h;
    return g;
  }

  /* ---------- 1. Hero ecosystem ---------- */
  function heroScene() {
    const st = createStage($('#heroStage'), { fov: 34, pointerTarget: $('#s01') });
    if (!st) return;
    const { scene, camera } = st;
    scene.fog = new THREE.Fog(0x0B0C0E, 24, 52);
    addLights(scene);
    const world = new THREE.Group(); scene.add(world);

    const grid = new THREE.PolarGridHelper(14, 24, 8, 96, 0x4a4234, 0x25221d);
    grid.material.transparent = true; grid.material.opacity = 0.5; grid.material.depthWrite = false;
    world.add(grid);

    const core = new THREE.Group(); world.add(core);
    const disc = glassMesh(new THREE.CylinderGeometry(1.9, 2.15, 0.24, 64), { edge: C.gold, edgeOpacity: 0.55, fillOpacity: 0.05 });
    disc.position.y = 0.12; core.add(disc);
    const cube = glassMesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), { edge: C.gold2, fillOpacity: 0.09 });
    cube.position.y = 1.75; core.add(cube);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), new THREE.MeshStandardMaterial({ color: C.gold2, emissive: C.gold, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.25 }));
    gem.position.y = 1.75; core.add(gem);
    const halo = glowSprite(C.gold2, 5, 0.32); halo.position.y = 1.75; core.add(halo);
    const r1 = ringMesh(2.55, C.gold, 0.55); r1.position.y = 1.75; r1.rotation.x = Math.PI / 2.25; core.add(r1);
    const r2 = ringMesh(3.05, C.steel, 0.35); r2.position.y = 1.75; r2.rotation.x = Math.PI / 1.8; r2.rotation.y = 0.5; core.add(r2);
    const hub = V(0, 1.75, 0);

    const types = ['hotel', 'apt', 'house', 'apt', 'hotel', 'house', 'apt', 'house', 'hotel'];
    const blds = [], specs = [];
    types.forEach((type, i) => {
      const a = (i / types.length) * Math.PI * 2 + 0.35;
      const r = i % 2 ? 7.7 : 5.7;
      const b = building(type);
      b.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      world.add(b);
      const top = V(b.position.x, b.userData.h + 0.25, b.position.z);
      const mid = hub.clone().add(top).multiplyScalar(0.5); mid.y += 2.6 + (i % 3) * 0.5;
      const curve = new THREE.QuadraticBezierCurve3(hub.clone(), mid, top);
      world.add(curveLine(curve, i % 3 === 1 ? C.steel : C.gold, 0.22));
      specs.push({ curve, color: C.gold2, speed: 0.16 + Math.random() * 0.08, t: Math.random() });
      specs.push({ curve, color: C.steel, speed: 0.12 + Math.random() * 0.06, t: Math.random(), rev: true });
      const toCore = V(-b.position.x, 0, -b.position.z).normalize();
      const lock = glowSprite(C.steel, 0.6, 0);
      lock.position.set(b.position.x + toCore.x * 0.7, 0.35, b.position.z + toCore.z * 0.7);
      world.add(lock);
      blds.push({ b, lock, phase: Math.random() * Math.PI * 2, type });
    });
    const packets = makePackets(world, specs, 0.24);
    const dust = makeDust(world, SMALL ? 200 : 460, [32, 12, 32], C.gold2, 0.06, 0.45);
    dust.position.y = 4;

    addLabel(st, 'منصة الإقامة الذكية', cube, 's-label--core', null, V(0, 1.25, 0));
    const firstOf = t => blds.find(o => o.type === t);
    addLabel(st, 'فندق', firstOf('hotel').b, '', null, V(0, 4.5, 0));
    addLabel(st, 'شقق', firstOf('apt').b, '', null, V(0, 2.9, 0));
    addLabel(st, 'وحدة سكنية', firstOf('house').b, '', null, V(0, 2.0, 0));
    addLabel(st, 'دخول ذكي', blds[3].lock, 's-label--gold', null, V(0, 0.6, 0));

    st.onResize = (w, h) => {
      st.wide = w / h > 1.1;
      if (st.wide) camera.setViewOffset(w, h, w * 0.25, 0, w, h); else camera.clearViewOffset();
    };
    st.onResize(st.w || 1, st.h || 1);
    st.update = (dt, t) => {
      const s = P.on ? 0 : heroScroll;
      const ang = t * 0.045 + st.pointer.x * 0.28 + 0.6;
      const dist = (st.wide ? 28 : 31) + s * 7;
      camera.position.set(Math.sin(ang) * dist, 8.6 + st.pointer.y * 1.4 + s * 6, Math.cos(ang) * dist);
      camera.lookAt(0, 1.2 - s * 1.2, 0);
      cube.rotation.set(t * 0.21, t * 0.33, 0);
      gem.rotation.y = -t * 0.9; gem.position.y = 1.75 + Math.sin(t * 1.4) * 0.08;
      r1.rotation.z = t * 0.25; r2.rotation.z = -t * 0.18;
      halo.material.opacity = 0.26 + Math.sin(t * 1.6) * 0.07;
      blds.forEach(o => {
        o.b.position.y = Math.sin(t * 0.8 + o.phase) * 0.08;
        o.lock.material.opacity = 0.2 + 0.75 * Math.pow(Math.max(0, Math.sin(t * 1.1 + o.phase * 2)), 6);
      });
      packets.update(dt);
      dust.rotation.y = t * 0.012;
    };
  }

  /* ---------- 2. Property lifecycle ---------- */
  function lifecycleScene() {
    const st = createStage($('#lcStage'), { fov: 34 });
    if (!st) return null;
    const { scene, camera } = st;
    addLights(scene);
    const R = 5.4, N = LIFECYCLE.length;
    const rig = new THREE.Group(); scene.add(rig);
    rig.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(R, 220)), lineMat(C.gold, 0.3)));
    rig.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(R - 0.55, 160)), lineMat(C.gold, 0.08)));
    rig.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(R + 0.55, 160)), lineMat(C.steel, 0.08)));
    const arcPts = [];
    for (let i = 0; i <= 220; i++) { const a = (i / 220) * Math.PI * 2; arcPts.push(V(Math.sin(a) * R, 0.005, Math.cos(a) * R)); }
    const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), lineMat(C.gold2, 0.95));
    rig.add(arc);

    const nodes = LIFECYCLE.map((s, i) => {
      const a = (i / N) * Math.PI * 2;
      const g = new THREE.Group(); g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      const box = glassMesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), { edge: C.gold, edgeOpacity: 0.7, fillOpacity: 0.08 });
      box.position.y = 0.45; g.add(box);
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0.22, 0)]), lineMat(C.gold, 0.5)));
      const glow = glowSprite(C.gold2, 2.2, 0); glow.position.y = 0.45; g.add(glow);
      const spoke = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(Math.sin(a) * R, 0, Math.cos(a) * R)]), lineMat(C.gold, 0.05));
      rig.add(spoke); rig.add(g);
      const lab = addLabel(st, `<small>${pad(i + 1)}</small>${s.t}`, box, 's-label--btn', null, V(0, 0.78, 0));
      lab.el.addEventListener('click', () => LC.set(i, true));
      return { g, box, glow, spoke, a, lab };
    });

    const coreW = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.15, 1)), lineMat(C.steel, 0.35));
    coreW.position.y = 1.1; rig.add(coreW);
    const coreGlow = glowSprite(C.gold2, 3.4, 0.22); coreGlow.position.y = 1.1; rig.add(coreGlow);
    addLabel(st, 'بيانات كل دورة تغذّي التالية', coreW, 's-label--core', null, V(0, -1.35, 0));

    const trav = glassMesh(houseGeo(0.7, 0.42, 0.3, 0.55), { edge: C.gold2, fillOpacity: 0.16 });
    const travGlow = glowSprite(C.gold2, 1.6, 0.5); travGlow.position.y = 0.35;
    const travG = new THREE.Group(); travG.add(trav); travG.add(travGlow); rig.add(travG);

    const ringCurve = new THREE.CatmullRomCurve3(circlePoints(R, 64), true);
    const specs = []; for (let k = 0; k < 7; k++) specs.push({ curve: ringCurve, color: k % 2 ? C.steel : C.gold2, speed: 0.035, t: k / 7 });
    const packets = makePackets(rig, specs, 0.3);

    let rigRot = 0, targetRot = 0, travA = 0, active = 0;
    const api = {
      set(i) {
        active = i;
        let tr = -nodes[i].a;
        while (tr - rigRot > Math.PI) tr -= Math.PI * 2;
        while (tr - rigRot < -Math.PI) tr += Math.PI * 2;
        targetRot = tr;
      }
    };
    st.onResize = (w, h) => { st.dist = w / h < 1 ? 21 : 14.6; };
    st.onResize(st.w || 1, st.h || 1);
    st.update = (dt, t) => {
      rigRot += (targetRot - rigRot) * Math.min(1, dt * 3);
      rig.rotation.y = rigRot + st.pointer.x * 0.12;
      let d = nodes[active].a - travA;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      travA += d * Math.min(1, dt * 2.6);
      travG.position.set(Math.sin(travA) * (R - 1.05), 0.12 + Math.sin(t * 2) * 0.06, Math.cos(travA) * (R - 1.05));
      trav.rotation.y = t * 0.6;
      nodes.forEach((n, i) => {
        const on = i === active;
        const target = on ? 1.45 : (i < active ? 1 : 0.85);
        n.box.scale.setScalar(lerp(n.box.scale.x, target, 0.12));
        n.box.rotation.y = t * (on ? 0.9 : 0.2);
        n.glow.material.opacity = lerp(n.glow.material.opacity, on ? 0.75 : 0, 0.1);
        n.box.userData.edges.material.opacity = on ? 1 : (i < active ? 0.7 : 0.35);
        n.spoke.material.opacity = on ? 0.35 : 0.05;
        n.lab.el.classList.toggle('is-active', on);
      });
      arc.geometry.setDrawRange(0, Math.round((active / N) * 220) + 1);
      coreW.rotation.y = t * 0.15; coreW.rotation.x = t * 0.07;
      packets.update(dt);
      camera.position.set(0, 7.2 + st.pointer.y * 0.8, st.dist);
      camera.lookAt(0, -0.2, 0.8);
    };
    st.after = () => { nodes.forEach(n => { n.lab.el.classList.toggle('is-back', !!n.lab.world && n.lab.world.z < -1.8); }); };
    return api;
  }

  /* ---------- 3. Smart access ---------- */
  function accessScene() {
    const st = createStage($('#axStage'), { fov: 34 });
    if (!st) return null;
    const { scene, camera } = st;
    addLights(scene);
    const root = new THREE.Group(); scene.add(root);
    const grid = new THREE.GridHelper(26, 26, 0x2e2a23, 0x1c1b18);
    grid.material.transparent = true; grid.material.opacity = 0.6; grid.material.depthWrite = false;
    root.add(grid);
    const DY = 3.7, DZ = -1.2;
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-7, DY - 0.75, DZ), V(7, DY - 0.75, DZ)]), lineMat(C.steel, 0.12)));

    // customer
    const cust = new THREE.Group();
    const body = glassMesh(new THREE.CylinderGeometry(0.3, 0.46, 1.1, 10), { edge: C.ivory, edgeOpacity: 0.7, fillOpacity: 0.08 }); body.position.y = 0.55; cust.add(body);
    const head = glassMesh(new THREE.IcosahedronGeometry(0.3, 1), { edge: C.ivory, edgeOpacity: 0.7, fillOpacity: 0.08 }); head.position.y = 1.45; cust.add(head);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.03), new THREE.MeshBasicMaterial({ color: C.gold2, transparent: true, opacity: 0.9 })); phone.position.set(-0.36, 0.95, 0.25); cust.add(phone);
    root.add(cust);
    const CX0 = 5.6, CX1 = 1.4;

    // booking card (digital layer)
    const booking = new THREE.Group(); booking.position.set(3.3, DY, DZ); root.add(booking);
    const card = glassMesh(new THREE.BoxGeometry(1.6, 1.0, 0.05), { edge: C.gold2, edgeOpacity: 0.6, fillOpacity: 0.1 }); booking.add(card);
    [[0.25, 0.9], [0.05, 0.6], [-0.15, 0.75]].forEach(([y, w]) => booking.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0.6, y, 0.04), V(0.6 - w, y, 0.04)]), lineMat(C.ivory, 0.35))));
    const check = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-0.62, -0.02, 0.04), V(-0.52, -0.14, 0.04), V(-0.32, 0.12, 0.04)]), lineMat(C.ok, 0));
    booking.add(check);
    const bookGlow = glowSprite(C.gold2, 3, 0); bookGlow.position.z = -0.2; booking.add(bookGlow);

    // access code (digital layer)
    const code = new THREE.Group(); code.position.set(0, DY, DZ); root.add(code);
    const slab = glassMesh(new THREE.BoxGeometry(1.5, 0.8, 0.08), { edge: C.gold2, edgeOpacity: 0.6, fillOpacity: 0.12 }); code.add(slab);
    const dots = [];
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3a3326 })); m.position.set(-0.5 + k * 0.2, -0.05, 0.07); code.add(m); dots.push(m); }
    const codeGlow = glowSprite(C.gold2, 2.8, 0); codeGlow.position.z = -0.2; code.add(codeGlow);

    // smart lock door
    const lock = new THREE.Group(); root.add(lock);
    const frame = edgesOnly(new THREE.BoxGeometry(1.4, 2.35, 0.2), C.steel, 0.8); frame.position.y = 1.175; lock.add(frame);
    const pivot = new THREE.Group(); pivot.position.set(-0.64, 0, 0); lock.add(pivot);
    const door = glassMesh(boxBase(1.26, 2.24, 0.06), { edge: C.steel, edgeOpacity: 0.75, fillOpacity: 0.12 }); door.position.x = 0.63; pivot.add(door);
    const kp = new THREE.Group(); kp.position.set(1.06, 1.15, 0.05); pivot.add(kp);
    kp.add(glassMesh(new THREE.BoxGeometry(0.26, 0.4, 0.04), { edge: C.gold2, edgeOpacity: 0.8, fillOpacity: 0.2 }));
    const keys = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.028, 10), new THREE.MeshBasicMaterial({ color: 0x55504a })); m.position.set(-0.07 + c * 0.07, 0.09 - r * 0.07, 0.025); kp.add(m); keys.push(m); }
    const inside = glowSprite(C.gold2, 3, 0); inside.position.set(0, 1.2, -0.6); lock.add(inside);

    // property
    const prop = new THREE.Group(); prop.position.set(-4.4, 0, 0); root.add(prop);
    prop.add(glassMesh(houseGeo(2.1, 1.1, 0.8, 1.6), { edge: C.gold, edgeOpacity: 0.8, fillOpacity: 0.07 }));
    const propGlow = glowSprite(C.gold2, 4, 0); propGlow.position.y = 0.9; prop.add(propGlow);
    const ripple = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.06, 64), new THREE.MeshBasicMaterial({ color: C.gold2, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    ripple.rotation.x = -Math.PI / 2; ripple.position.y = 0.02; prop.add(ripple);

    // links
    const linkBC = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(2.5, DY, DZ), V(0.75, DY, DZ)]), lineMat(C.gold2, 0.15)); root.add(linkBC);
    const vLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, DY - 0.4, DZ), V(0.42, 1.25, 0.05)]), new THREE.LineDashedMaterial({ color: C.steel, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.25 }));
    vLine.computeLineDistances(); root.add(vLine);

    const pulse = glowSprite(C.gold2, 0.95, 0); root.add(pulse);
    const curves = {
      c0: new THREE.QuadraticBezierCurve3(V(CX0 - 0.36, 1.0, 0.25), V(4.9, 3.4, 0), V(3.3, DY, DZ + 0.1)),
      c2: new THREE.LineCurve3(V(2.5, DY, DZ), V(0.75, DY, DZ)),
      c4: new THREE.QuadraticBezierCurve3(V(0, DY - 0.4, DZ + 0.1), V(0.3, 2.4, -0.3), V(0.42, 1.15, 0.1)),
      c6a: new THREE.QuadraticBezierCurve3(V(0, 0.4, 0.1), V(-2.2, 0.9, 0.4), V(-4.4, 0.6, 0.3)),
      c6b: new THREE.QuadraticBezierCurve3(V(-4.4, 1.6, 0), V(-1, 6.2, -1), V(3.3, DY + 0.5, DZ))
    };

    addLabel(st, 'العميل', head, '', null, V(0, 0.62, 0));
    addLabel(st, 'الحجز', card, 's-label--gold', null, V(0, 0.82, 0));
    addLabel(st, 'رمز الدخول', slab, 's-label--gold', null, V(0, 0.72, 0));
    addLabel(st, 'القفل الذكي', frame, '', null, V(0, 1.5, 0));
    addLabel(st, 'العقار', prop, '', null, V(0, 2.35, 0));
    const layerLabels = [
      addLabel(st, 'الطبقة الرقمية', null, 's-label--muted', V(-6.3, DY, DZ)),
      addLabel(st, 'الطبقة المادية', null, 's-label--muted', V(-6.2, 0.25, 0.9))
    ];

    const STEP = 1.55, NS = 7, HOLD = 1.6, T = STEP * NS + HOLD;
    let at = 0, lastStep = -1;
    const api = { jump(s) { at = s * STEP + 0.02; } };
    const off = 0x3a3326, keyOff = 0x55504a;

    st.onResize = (w, h) => { st.dist = Math.max(14.5, 20.5 / (w / h)); layerLabels.forEach(L => { L.hidden = w < 640; }); };
    st.onResize(st.w || 1, st.h || 1);
    st.update = (dt, t) => {
      at = (at + dt) % T;
      const s = Math.min(NS, Math.floor(at / STEP));
      const u = s < NS ? (at - s * STEP) / STEP : (at - NS * STEP) / HOLD;
      if (s !== lastStep) { lastStep = s; if (AX.show) AX.show(Math.min(s, NS - 1), s === NS); }
      const hold = s === NS;

      card.userData.edges.material.opacity = s === 0 ? 0.6 + 0.4 * u : (hold ? 1 - 0.4 * u : 1);
      bookGlow.material.opacity = s === 0 ? 0.5 * Math.sin(Math.PI * u) + 0.1 : (hold ? 0.12 * (1 - u) : 0.12);
      check.material.opacity = s === 0 ? u : (hold ? 1 - u : 1);
      dots.forEach((d, k) => d.material.color.setHex(((s > 1 && !hold) || (s === 1 && u > k / 6) || (hold && u < 0.5)) ? C.gold2 : off));
      codeGlow.material.opacity = s === 1 ? 0.45 : (s > 1 && !hold ? 0.15 : 0);
      linkBC.material.opacity = s >= 2 && !hold ? 0.85 : 0.15;
      vLine.material.opacity = s >= 4 && !hold ? 0.8 : 0.22;

      const walk = s < 3 ? 0 : s === 3 ? ease(u) : 1;
      cust.position.x = lerp(CX0, CX1, walk);
      cust.position.y = s === 3 ? Math.abs(Math.sin(u * Math.PI * 6)) * 0.05 : 0;
      setOpacity(cust, hold ? 1 - u : (s === 0 ? Math.min(1, u * 3) : 1));
      head.rotation.y = t * 0.5;

      keys.forEach((k, i) => k.material.color.setHex(s === 4 && Math.floor(u * 9) === i ? C.gold2 : (s >= 5 && !hold ? C.ok : keyOff)));
      const open = s < 5 ? 0 : s === 5 ? ease(u) : hold ? 1 - ease(u) : 1;
      pivot.rotation.y = open * 1.25;
      inside.material.opacity = open * 0.55;

      propGlow.material.opacity = s === 6 ? 0.45 * Math.sin(Math.PI * u) : 0;
      ripple.material.opacity = s === 6 ? (1 - u) * 0.8 : 0;
      ripple.scale.setScalar(s === 6 ? 1 + u * 1.6 : 1);

      let c = null, pu = 0;
      if (s === 0) { c = curves.c0; pu = u; }
      else if (s === 2) { c = curves.c2; pu = u; }
      else if (s === 4) { c = curves.c4; pu = u; }
      else if (s === 6) { c = u < 0.5 ? curves.c6a : curves.c6b; pu = u < 0.5 ? u * 2 : (u - 0.5) * 2; }
      if (c) { c.getPoint(pu, pulse.position); pulse.material.opacity = Math.sin(Math.PI * pu) * 0.95; } else pulse.material.opacity = 0;

      code.rotation.y = Math.sin(t * 0.8) * 0.12;
      booking.rotation.y = Math.sin(t * 0.7 + 1) * 0.12;
      const a = st.pointer.x * 0.25;
      camera.position.set(Math.sin(a) * st.dist, 3.4 + st.pointer.y * 0.8, Math.cos(a) * st.dist);
      camera.lookAt(0, 1.75, -0.4);
    };
    return api;
  }

  /* ---------- 4. Pricing demand landscape ---------- */
  function pricingScene() {
    const st = createStage($('#prStage'), { fov: 36 });
    if (!st) return null;
    const { scene, camera } = st;
    addLights(scene);
    const root = new THREE.Group(); scene.add(root);
    const COLS = 7, ROWS = 5, GAP = 0.82;
    const bw = COLS * GAP + 0.6, bd = ROWS * GAP + 0.6;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), new THREE.MeshBasicMaterial({ color: 0x14161a, transparent: true, opacity: 0.85, depthWrite: false }));
    plate.rotation.x = -Math.PI / 2; root.add(plate);
    root.add(edgesOnly(new THREE.BoxGeometry(bw, 0.001, bd), C.gold, 0.35));
    const unit = boxBase(0.56, 1, 0.56);
    const unitEdges = new THREE.EdgesGeometry(unit);
    const bars = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const g = new THREE.Group();
      g.position.set(((COLS - 1) / 2 - c) * GAP, 0, (r - (ROWS - 1) / 2) * GAP);
      const mat = new THREE.MeshStandardMaterial({ color: 0x5f7d88, transparent: true, opacity: 0.6, metalness: 0.3, roughness: 0.35, emissive: 0x000000, depthWrite: false });
      g.add(new THREE.Mesh(unit, mat));
      const em = lineMat(C.steel, 0.55);
      g.add(new THREE.LineSegments(unitEdges, em));
      g.scale.y = 0.3;
      root.add(g);
      bars.push({ g, mat, em, h: 0.3, target: 0.7, hot: false, c, r, i });
    }
    const SIG = { holiday: [8, 9, 10, 11], event: [17, 18, 19], occasion: [25, 26] };
    const sigLabels = {};
    Object.keys(SIG).forEach(k => {
      const idx = SIG[k];
      const p = V(0, 0, 0);
      idx.forEach(i => p.add(bars[i].g.position)); p.multiplyScalar(1 / idx.length);
      const L = addLabel(st, SIG_NAMES[k], null, 's-label--gold', p);
      L.hidden = true; L.idx = idx;
      sigLabels[k] = L;
    });
    const base = b => 0.65 + (b.c >= 5 ? 0.32 : 0) + 0.16 * Math.sin(b.i * 0.55) + 0.08 * Math.cos(b.i * 1.7);
    const cLow = new THREE.Color(0x3f5760), cMid = new THREE.Color(0x6f95a2), cHot = new THREE.Color(C.gold2), tmpC = new THREE.Color();
    const api = {
      apply(s) {
        bars.forEach(b => {
          let h = base(b), hot = false;
          if (s.holiday && SIG.holiday.includes(b.i)) { h += 1.5; hot = true; }
          if (s.event && SIG.event.includes(b.i)) { h += 1.2; hot = true; }
          if (s.occasion && SIG.occasion.includes(b.i)) { h += 0.9; hot = true; }
          h *= s.season === 1 ? 1.3 : s.season === -1 ? 0.62 : 1;
          b.target = h; b.hot = hot;
        });
        Object.keys(sigLabels).forEach(k => { sigLabels[k].hidden = !s[k]; });
      }
    };
    api.apply(PR.state);
    st.onResize = (w, h) => { st.dist = w / h < 1 ? 13.5 : 9.6; };
    st.onResize(st.w || 1, st.h || 1);
    st.update = (dt, t) => {
      bars.forEach(b => {
        b.h += (b.target - b.h) * Math.min(1, dt * 4);
        b.g.scale.y = Math.max(0.05, b.h);
        const k = clamp((b.h - 0.4) / 1.4, 0, 1);
        tmpC.copy(cLow).lerp(cMid, k);
        if (b.hot) tmpC.lerp(cHot, 0.85);
        b.mat.color.lerp(tmpC, 0.15);
        b.mat.emissive.setHex(b.hot ? 0x3a2a10 : 0x000000);
        b.em.color.setHex(b.hot ? C.gold2 : C.steel);
        b.em.opacity = b.hot ? 0.95 : 0.45;
      });
      Object.keys(sigLabels).forEach(k => { const L = sigLabels[k]; L.pos.y = Math.max(...L.idx.map(i => bars[i].h)) + 0.45; });
      const a = 0.62 + Math.sin(t * 0.18) * 0.22 + st.pointer.x * 0.3;
      camera.position.set(Math.sin(a) * st.dist, 5.6 + st.pointer.y, Math.cos(a) * st.dist);
      camera.lookAt(0, 0.8, 0);
    };
    return api;
  }

  /* ---------- 5. Compliance integration ecosystem ---------- */
  function complianceScene() {
    const st = createStage($('#cxStage'), { fov: 36 });
    if (!st) return null;
    const { scene, camera } = st;
    addLights(scene);
    const root = new THREE.Group(); scene.add(root);
    const core = new THREE.Group(); root.add(core);
    const cube = glassMesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), { edge: C.gold2, fillOpacity: 0.08 }); core.add(cube);
    const inner = edgesOnly(new THREE.BoxGeometry(0.8, 0.8, 0.8), C.gold, 0.8); core.add(inner);
    core.add(glowSprite(C.gold2, 4.5, 0.3));
    addLabel(st, 'المنصة', cube, 's-label--core', null, V(0, 1.45, 0));
    const O = V(0, 0, 0);
    const specs = [];
    const SAT = [
      { k: 'shomoos', pos: V(4.6, 1.8, 0) },
      { k: 'nafath', pos: V(-4.6, 1.8, 0) },
      { k: 'ewaa', pos: V(0, -3.1, 0.8) }
    ];
    const hits = [];
    const sats = SAT.map(s => {
      const c = COMPLIANCE[s.k];
      const g = new THREE.Group(); g.position.copy(s.pos); root.add(g);
      const oct = glassMesh(new THREE.OctahedronGeometry(0.8), { edge: C.copper, fillOpacity: 0.1 }); g.add(oct);
      const ring = ringMesh(1.25, C.copper, 0.35); ring.rotation.x = Math.PI / 2.4; g.add(ring);
      const glow = glowSprite(C.copper, 3.4, 0.15); g.add(glow);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.userData.k = s.k; g.add(hit); hits.push(hit);
      const mid = s.pos.clone().multiplyScalar(0.5); mid.z += 2.2;
      const curve = new THREE.QuadraticBezierCurve3(O.clone(), mid, s.pos.clone());
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)), new THREE.LineDashedMaterial({ color: C.copper, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.45 }));
      line.computeLineDistances(); root.add(line);
      const out = { curve, color: C.gold2, speed: 0.22, t: Math.random() };
      const inn = { curve, color: C.steel, speed: 0.18, t: Math.random(), rev: true };
      specs.push(out, inn);
      const lab = addLabel(st, `${c.name}<small>${c.en}</small>`, oct, 's-label--btn', null, V(0, 1.25, 0));
      lab.el.addEventListener('click', () => CX.set(s.k, false));
      return { k: s.k, g, oct, ring, glow, line, out, inn, lab };
    });
    [{ name: 'مزوّد القفل الذكي', pos: V(3.6, -3.3, -2) }, { name: 'مزوّد الدفع', pos: V(-3.6, -3.3, -2) }].forEach(o => {
      const b = glassMesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), { edge: C.slate, edgeOpacity: 0.6, fillOpacity: 0.05 });
      b.position.copy(o.pos); root.add(b);
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([O.clone(), o.pos.clone()]), new THREE.LineDashedMaterial({ color: C.slate, dashSize: 0.1, gapSize: 0.16, transparent: true, opacity: 0.3 }));
      l.computeLineDistances(); root.add(l);
      addLabel(st, o.name, b, 's-label--muted', null, V(0, 0.7, 0));
    });
    const packets = makePackets(root, specs, 0.26);
    let sel = 'shomoos';
    const api = { select(k) { sel = k; } };
    const ray = new THREE.Raycaster();
    let hoverK = null;
    st.host.addEventListener('click', () => { if (hoverK) CX.set(hoverK, false); });
    st.onResize = (w, h) => { st.dist = w / h < 1 ? 20 : 13.5; };
    st.onResize(st.w || 1, st.h || 1);
    st.update = (dt, t) => {
      cube.rotation.set(t * 0.2, t * 0.3, 0);
      inner.rotation.set(-t * 0.4, -t * 0.25, 0);
      if (st.pointer.inside) {
        ray.setFromCamera({ x: st.pointer.tx, y: st.pointer.ty }, camera);
        const hit = ray.intersectObjects(hits, false)[0];
        hoverK = hit ? hit.object.userData.k : null;
      } else hoverK = null;
      st.host.style.cursor = hoverK ? 'pointer' : '';
      sats.forEach(s => {
        const on = s.k === sel, hov = s.k === hoverK;
        const sc = on ? 1.25 : hov ? 1.12 : 1;
        s.g.scale.setScalar(lerp(s.g.scale.x, sc, 0.12));
        s.oct.rotation.y = t * (on ? 0.8 : 0.3);
        s.ring.rotation.z = t * 0.4;
        s.glow.material.opacity = lerp(s.glow.material.opacity, on ? 0.7 : hov ? 0.4 : 0.15, 0.1);
        s.line.material.opacity = on ? 0.95 : 0.35;
        s.out.gain = on ? 1.4 : 0.5; s.inn.gain = on ? 1.2 : 0.4;
        s.lab.el.classList.toggle('is-active', on);
      });
      packets.update(dt);
      const a = Math.sin(t * 0.2) * 0.22 + st.pointer.x * 0.35;
      camera.position.set(Math.sin(a) * st.dist, 1 + st.pointer.y * 1.2, Math.cos(a) * st.dist);
      camera.lookAt(0, -0.3, 0);
    };
    return api;
  }

  /* ---------- 6. Product ecosystem ---------- */
  function ecosystemScene() {
    const host = $('#ecoStage');
    const st = createStage(host, { fov: 38 });
    if (!st) return null;
    const { scene, camera } = st;
    addLights(scene);
    const rig = new THREE.Group(); scene.add(rig);
    const COL = { people: C.ivory, asset: C.gold2, intel: C.steel, gov: C.copper };

    const coreMesh = glassMesh(new THREE.IcosahedronGeometry(1.1, 0), { edge: C.gold2, fillOpacity: 0.1 });
    rig.add(coreMesh);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.38), new THREE.MeshStandardMaterial({ color: C.gold2, emissive: C.gold, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.25 }));
    rig.add(gem);
    rig.add(glowSprite(C.gold2, 5.2, 0.3));
    const ringA = ringMesh(1.8, C.gold, 0.45); ringA.rotation.x = Math.PI / 2.3; rig.add(ringA);
    const ringB = ringMesh(2.1, C.steel, 0.3); ringB.rotation.x = Math.PI / 1.7; rig.add(ringB);
    addLabel(st, 'منصة العقارات الذكية', coreMesh, 's-label--core', null, V(0, 1.55, 0));

    const R = 5.2, N = ECO.length;
    const nodes = ECO.map((n, i) => {
      const y = 1 - ((i + 0.5) / N) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
      const pos = V(Math.cos(th) * rad * R, y * R * 0.72, Math.sin(th) * rad * R);
      let geo;
      if (n.grp === 'people') geo = new THREE.IcosahedronGeometry(0.42, 0);
      else if (n.grp === 'asset') geo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
      else if (n.grp === 'intel') geo = new THREE.OctahedronGeometry(0.5);
      else geo = new THREE.DodecahedronGeometry(0.44);
      const g = new THREE.Group(); g.position.copy(pos); rig.add(g);
      const m = glassMesh(geo, { edge: COL[n.grp], fillOpacity: 0.1 }); g.add(m);
      const glow = glowSprite(COL[n.grp], 1.5, 0.35); g.add(glow);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.userData.i = i; g.add(hit);
      const lab = addLabel(st, n.name, m, '', null, V(0, 0.78, 0));
      return { n, g, m, glow, hit, lab, pos, links: [] };
    });
    const idx = id => ECO.findIndex(e => e.id === id);
    const links = [], specs = [];
    nodes.forEach((nd, i) => {
      const curve = new THREE.LineCurve3(V(0, 0, 0), nd.pos.clone());
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), nd.pos.clone()]), lineMat(COL[nd.n.grp], 0.22));
      rig.add(line);
      const sp = { curve, color: COL[nd.n.grp], speed: 0.18 + Math.random() * 0.1, t: Math.random(), rev: i % 2 === 0 };
      specs.push(sp);
      const L = { a: -1, b: i, line, base: 0.22, specs: [sp] };
      links.push(L); nd.links.push(L);
    });
    ECO_LINKS.forEach(([a, b]) => {
      const ia = idx(a), ib = idx(b);
      const pa = nodes[ia].pos, pb = nodes[ib].pos;
      const mid = pa.clone().add(pb).multiplyScalar(0.5).multiplyScalar(1.18);
      const curve = new THREE.QuadraticBezierCurve3(pa.clone(), mid, pb.clone());
      const line = curveLine(curve, C.gold, 0.16, 40);
      rig.add(line);
      const sp = { curve, color: C.gold2, speed: 0.2 + Math.random() * 0.1, t: Math.random() };
      specs.push(sp);
      const L = { a: ia, b: ib, line, base: 0.16, specs: [sp] };
      links.push(L); nodes[ia].links.push(L); nodes[ib].links.push(L);
    });
    const packets = makePackets(rig, specs, 0.24);
    makeDust(scene, SMALL ? 120 : 260, [30, 18, 30], C.gold2, 0.05, 0.35);

    const tip = $('#ecoTip');
    const ray = new THREE.Raycaster();
    let rotY = 0.4, rotX = 0.18, vel = 0.0, dragging = false, moved = 0, lx = 0, ly = 0;
    let hover = -1, listHover = -1, pinned = -1;
    host.addEventListener('pointerdown', e => {
      if (e.target.closest('.s-label--btn')) return;
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; host.classList.add('dragging');
      try { host.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });
    host.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      vel = dx * 0.0045; rotY += dx * 0.006; rotX = clamp(rotX + dy * 0.004, -0.6, 0.8);
    });
    const end = e => {
      if (!dragging) return;
      dragging = false; host.classList.remove('dragging');
      if (moved < 6) { pinned = hover >= 0 ? (pinned === hover ? -1 : hover) : -1; }
      try { host.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);

    let tipShown = -1;
    const showTip = (i, L) => {
      if (i < 0) { tip.hidden = true; tipShown = -1; return; }
      if (tipShown !== i) { tip.innerHTML = ecoTipHTML(ECO[i]); tipShown = i; }
      tip.hidden = false;
      const tw = tip.offsetWidth || 300, th = tip.offsetHeight || 180;
      let x = L.x > st.w * 0.55 ? L.x - tw - 26 : L.x + 26;
      let y = L.y - th / 2;
      x = clamp(x, 10, st.w - tw - 10); y = clamp(y, 10, st.h - th - 10);
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    };
    const api = { listHover(i) { listHover = i; } };

    st.onResize = (w, h) => { st.dist = w / h < 1 ? 21 : 15.5; };
    st.onResize(st.w || 1, st.h || 1);
    st.update = (dt, t) => {
      if (!dragging) { rotY += dt * 0.07 + vel; vel *= 0.93; }
      rig.rotation.y = rotY; rig.rotation.x = rotX;
      coreMesh.rotation.y = t * 0.25; gem.rotation.y = -t * 0.8;
      ringA.rotation.z = t * 0.3; ringB.rotation.z = -t * 0.22;
      hover = -1;
      if (st.pointer.inside && !dragging) {
        ray.setFromCamera({ x: st.pointer.tx, y: st.pointer.ty }, camera);
        const hit = ray.intersectObjects(nodes.map(n => n.hit), false)[0];
        if (hit) hover = hit.object.userData.i;
      }
      host.style.cursor = dragging ? '' : hover >= 0 ? 'pointer' : '';
      const focus = listHover >= 0 ? listHover : hover >= 0 ? hover : pinned;
      const focusSet = new Set();
      if (focus >= 0) { focusSet.add(focus); nodes[focus].links.forEach(L => { if (L.a >= 0) focusSet.add(L.a); focusSet.add(L.b); }); }
      nodes.forEach((nd, i) => {
        const on = i === focus;
        nd.g.scale.setScalar(lerp(nd.g.scale.x, on ? 1.4 : 1, 0.14));
        nd.m.rotation.y = t * (on ? 1 : 0.3);
        nd.glow.material.opacity = on ? 0.9 : focus >= 0 && !focusSet.has(i) ? 0.1 : 0.35;
        nd.lab.el.classList.toggle('is-active', on);
        nd.lab.el.classList.toggle('is-back', (focus >= 0 && !focusSet.has(i)) || (!!nd.lab.world && nd.lab.world.z < -2.5 && !on));
      });
      links.forEach(L => {
        const rel = focus >= 0 && (L.a === focus || L.b === focus);
        L.line.material.opacity = focus < 0 ? L.base : rel ? 0.9 : 0.05;
        L.specs.forEach(s => { s.gain = focus < 0 ? 1 : rel ? 1.6 : 0.15; });
      });
      packets.update(dt);
      camera.position.set(st.pointer.x * 1.2, 2.2 + st.pointer.y * 1.2, st.dist);
      camera.lookAt(0, 0, 0);
      st._focus = focus;
    };
    st.after = () => {
      const f = st._focus;
      if (f >= 0) showTip(f, nodes[f].lab); else showTip(-1);
    };
    return api;
  }

  /* =========================================================
     GSAP intro + scroll
     ========================================================= */
  function motion() {
    if (!HAS_GSAP) return;
    if (HAS_ST) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({ trigger: '#s01', start: 'top top', end: 'bottom top', onUpdate: self => { heroScroll = self.progress; } });
    }
    if (REDUCED) return;
    gsap.from('.hero-kicker, .hero-title .ln, .hero-en, .hero-sub, .hero-cta, .hero-meta, .hero-legend', { y: 26, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay: 0.15, clearProps: 'opacity,transform' });
  }

  /* =========================================================
     BOOT
     ========================================================= */
  function boot() {
    renderRoles();
    guestJourney();
    operator();
    lifecycleUI();
    accessUI();
    compare();
    pricingUI();
    assistant();
    kpis();
    funnel();
    complianceUI();
    ecosystemUI();
    architecture();
    dataFlow();
    requirements();
    rules();
    scope();
    questions();
    executive();
    navigation();
    presentation();
    icons();
    reveals();
    motion();

    if (HAS_THREE) {
      _v = new THREE.Vector3();
      const safe = fn => { try { return fn(); } catch (e) { if (window.console) console.warn('3D scene skipped:', e); return null; } };
      safe(heroScene);
      LC.scene = safe(lifecycleScene); if (LC.scene) LC.scene.set(LC.i);
      AX.scene = safe(accessScene); if (!AX.scene) accessFallback();
      PR.scene = safe(pricingScene); if (PR.scene) PR.scene.apply(PR.state);
      CX.scene = safe(complianceScene); if (CX.scene) CX.scene.select(CX.k);
      ECO_UI.scene = safe(ecosystemScene);
    } else {
      accessFallback();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
