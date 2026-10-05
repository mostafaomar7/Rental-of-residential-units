# رواف (Rawaaf) — نموذج أولي تفاعلي | Clickable Prototype

نموذج أولي قابل للنقر لمنصة **رواف** للإقامات القصيرة والتشغيل الذكي — عربي، من اليمين لليسار، بنفس هوية موقع العميل (كريمي `#F7F5F0`، كحلي `#0A1931`، ذهبي `#C9A86A`، خط Tajawal).
**كل البيانات توضيحية** ولا يوجد خادم (Backend).

A clickable UI/UX prototype for Rawaaf — a Saudi short-stay booking & smart-stay operations platform. Arabic / RTL, mock data only, no backend, no build step.

---

## التشغيل | How to open

- افتح الملف `index.html` بالنقر المزدوج (يعمل من القرص مباشرة `file://`).
- Double-click `index.html`. Works offline except Google Fonts (Tajawal), Lucide icons (CDN, with text fallback if it fails) and Unsplash photos.
- زر **«Demo • تبديل البوابة»** أسفل يمين الشاشة للتنقل بين الأدوار، ومنه **«إعادة ضبط البيانات التجريبية»**.
- The floating **Demo** button (bottom-right) switches portals and resets demo data. State is saved in `localStorage` (wrapped in try/catch — the prototype still works if storage is blocked).

## الحسابات التجريبية | Demo accounts

| الدور / Role | الدخول / How |
|---|---|
| الضيف (سعود العتيبي) | «دخول» ← أي رقم يبدأ بـ `05` (10 أرقام) ← رمز التحقق **`1234`** — أو من زر Demo «الضيف — مسجّل» |
| التحقق عبر نفاذ | زر «محاكاة الموافقة في تطبيق نفاذ» داخل نافذة الرقم |
| المالك / المشغّل | زر Demo ← «المالك» أو «المشغّل» (نفس اللوحة، شارة مختلفة) |
| المشرف الميداني (فيصل الحربي) | زر Demo ← «المشرف الميداني» |
| المصوّر (ريم الزهراني) | زر Demo ← «المصوّر» |
| مدير المنصة (يوسف الحارثي) | زر Demo ← «مدير المنصة» |

Tip: append `?as=guest` to any guest URL to auto-login the demo guest, e.g. `index.html#/account?as=guest`.

## خريطة المسارات | Route map

### الضيف | Guest
| Route | الشاشة |
|---|---|
| `#/` | الرئيسية: فلاتر المدن والأنواع، بطاقات الوحدات، المقارنة (حتى 3) |
| `#/search?city=&in=&out=&guests=` | نتائج البحث مع التواريخ والضيوف والتوفر |
| `#/property/:id` | تفاصيل الوحدة: المعرض، التفاصيل/المرافق/السياسات/التقييمات، نبهني، مشاركة، المضيف + واتساب |
| `#/book/:id` | معالج الحجز (5 خطوات): التواريخ ← الضيف + نفاذ ← السياسات ← الدفع ← التأكيد والمفتاح الرقمي |
| `#/account/:tab` | الحساب: `overview` `bookings` `favorites` `wallet` `points` `reviews` `settings` |
| `#/stay/:bookingId` | إقامتي الحالية: «افتح الباب»، سجل الدخول، الواي فاي، الدليل، طلبات الدخول المبكر/المغادرة المتأخرة، البلاغات، المغادرة الذاتية (جرّب `RW-240815`) |
| `#/review/:bookingId` | تقييم الإقامة (+50 نقطة) |
| `#/invoice/:bookingId` | فاتورة ضريبية مبسطة قابلة للطباعة |
| — | المساعد الشخصي (فقاعة أسفل اليسار)، مركز الإشعارات (الجرس)، الدخول بـ OTP |

### المالك / المشغّل | Owner / Operator
`#/operator` لوحة المؤشرات • `#/operator/properties` الوحدات • `#/operator/property/:id/:tab` (`identity` `content` `commercial` `operations` `governance`) • `#/operator/add` إضافة وحدة (9 خطوات) • `#/operator/calendar` التقويم • `#/operator/pricing` التسعير الذكي • `#/operator/bookings` و `#/operator/booking/:id` • `#/operator/locks` الأقفال • `#/operator/ops/:tab` (`tasks` `incidents` `damages`) • `#/operator/reviews` • `#/operator/payouts` • `#/operator/campaigns`

### المشرف الميداني | Supervisor (mobile-first)
`#/supervisor` • `#/supervisor/task/:id` (مثال `TK-102`) • `#/supervisor/map` • `#/supervisor/reports` • `#/supervisor/me`

### المصوّر | Photographer (mobile-first)
`#/photographer` • `#/photographer/shoot/:id` (مثال `SH-39` تحتاج إعادة، `SH-41` جلسة اليوم) • `#/photographer/earnings` • `#/photographer/me`

### إدارة المنصة | Platform Admin
`#/admin` • `#/admin/verification` • `#/admin/photos` • `#/admin/disputes` • `#/admin/users` • `#/admin/campaigns` • `#/admin/integrations` • `#/admin/pricing` • `#/admin/settings` • `#/admin/audit`

## سيناريوهات مترابطة | Cross-portal flows to try
1. **حجز كامل**: الرئيسية ← وحدة ← احجز ← نفاذ ← السياسات ← الدفع ← المفتاح الرقمي؛ يظهر الحجز في «حجوزاتي» وفي «حجوزات» المشغّل.
2. **الإقامة**: `#/stay/RW-240815` ← افتح الباب (يُسجل في سجل الأقفال عند المشغّل) ← بلاغ ← مغادرة ذاتية (تنشئ مهمة فحص للمشرف) ← التقييم.
3. **المشرف**: أكمل قائمة التحقق + صورة ← «إعلان جاهزية الوحدة» ← تظهر «بانتظار الاعتماد» في لوحة مهام المشغّل ← اعتماد.
4. **المصوّر ← الإدارة**: ارفع صوراً وأرسلها للفحص ← `#/admin/photos` قبول/رفض ← تظهر النتيجة في تطبيق المصوّر.
5. **إضافة وحدة** ← تظهر في `#/admin/verification` ← اعتماد ← الوحدة «متاحة».

## الملفات | Files
```
index.html            الصفحة الوحيدة (SPA) + شريط أخطاء JS للمراجعة
css/styles.css        نظام التصميم (متغيرات :root + المكوّنات + التجاوب حتى 360px)
js/data.js            كل البيانات التوضيحية + محرك اقتراح الأسعار الوهمي
js/app.js             النواة: الحالة، التوجيه (hash)، النوافذ، التنبيهات، الرسوم، الأغلفة، مبدّل البوابات
js/views-guest.js     الضيف (1): الرئيسية، البحث، الوحدة، الدخول/OTP، الإشعارات، المساعد
js/views-guest2.js    الضيف (2): الحجز، الحساب، الإقامة، التقييم، الفاتورة
js/views-operator.js  لوحة المالك/المشغّل
js/views-field.js     تطبيقا المشرف والمصوّر
js/views-admin.js     إدارة المنصة
screenshots/          لقطات تحقق (Edge headless)
```

> نموذج أولي — بيانات توضيحية. التكاملات (نفاذ، شموس، إيواء، الأقفال، الدفع، واتساب) محاكاة بالكامل.
> Prototype only — all integrations (Nafath, Shomoos, Ewaa, locks, payments, WhatsApp) are simulated.
