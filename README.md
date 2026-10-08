# واجهة نظام التحفيظ (DQ Tahfiz Frontend)

واجهة Vue 3 لباك اند Laravel الموجود في `../backend` (API عبر Sanctum tokens).

## التقنيات

- Vue 3 (`<script setup>`) + TypeScript + Vite
- PrimeVue 4 (ثيم Aura) + Tailwind CSS 4 — واجهة عربية RTL
- Pinia (الحالة) + Vue Router + Axios

> ملاحظة: المشروع مثبّت على PrimeVue **4** (رخصة MIT). الإصدار 5 يتطلب ترخيصاً تجارياً.

## التشغيل

```bash
# 1) شغّل الباك اند (من مجلد backend)
php artisan serve            # http://localhost:8000

# 2) شغّل الواجهة
npm install
npm run dev                  # http://localhost:5173
```

عنوان الـ API يُضبط في `.env` (انسخ `.env.example`):

```
VITE_API_BASE_URL=http://localhost:8000/api
```

يجب أن يكون عنوان الواجهة ضمن `CORS_ALLOWED_ORIGINS` في `.env` الخاص بالباك اند
(القيمة الحالية تتضمن `http://localhost:5173`).

أوامر أخرى: `npm run build` (فحص الأنواع + بناء الإنتاج في `dist/`)، `npm run type-check`.

## هيكل المشروع

```
src/
  api/http.ts            عميل Axios: التوكن، توحيد الأخطاء (ApiError)، رفع وتنزيل الملفات
  stores/auth.ts         الدخول/الخروج، المستخدم الحالي، الصلاحيات can()
  stores/lookups.ts      قوائم مرجعية مخزّنة (فروع، مناطق، سور، ثوابت ...)
  router/index.ts        المسارات + حارس الصلاحيات
  nav.ts                 عناصر القائمة الجانبية وصلاحياتها
  layouts/AppLayout.vue  الهيكل العام (قائمة جانبية + شريط علوي)
  components/
    CrudPage.vue         صفحة CRUD عامة تُبنى من تعريف أعمدة وحقول
    SchemaForm.vue       رسم النماذج من FieldDef[]
    RemoteSelect.vue     قائمة اختيار تبحث في الخادم (طلاب/حلقات/مستخدمون)
    CertificatesPanel / ImagesPanel / IdentityLookup ...
  views/                 صفحة لكل وحدة في الـ API
```

### إضافة صفحة CRUD جديدة

معظم الصفحات عبارة عن تعريف أعمدة وحقول يُمرَّر إلى `CrudPage`:

```vue
<CrudPage
  title="المسارات" entity="مسار"
  endpoint="plan/tracks" permission="tracks"
  :columns="[{ field: 'name', header: 'الاسم' }]"
  :fields="[{ name: 'name', label: 'الاسم', required: true }]"
/>
```

- `permission="tracks"` يُظهر أزرار الإضافة/التعديل/الحذف حسب `tracks.create/update/delete`.
- `server-paging` للجداول الكبيرة (يرسل `skip/limit`)، وبدونه تُحمّل كل الصفوف (`limit=*`).
- `to-form` / `to-payload` لتحويل الصف إلى نموذج والعكس، والـ slots (`cell-*`, `actions`, `toolbar`, `form-top`, `form-bottom`, `filters`) للتخصيص.

## الوحدات المغطاة

الدخول وتغيير كلمة المرور · لوحة التحكم · الفروع/المناطق/المساجد/المراكز · الحلقات (طلاب الحلقة، الكفالات، سجل الحالة، تصدير) ·
الطلاب (ملف الطالب، الخطط والمساقات، الشهادات، المرفقات، استيراد/تصدير Excel) · الإنجاز اليومي ·
الخطط والمستويات والمسارات والمساقات والأجزاء المخصصة · الكفلاء وحصص الأفرع · طلبات الاعتماد ·
المستخدمون والأدوار والنطاقات · الثوابت · الإعدادات.
