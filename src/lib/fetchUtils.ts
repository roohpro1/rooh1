/**
 * أداة جلب ومعالجة البيانات الآمنة (Safe Fetch & Response Parser)
 * تم تصميمها لتطبيق المعايير الاحترافية في التحقق من أن الرد ليس فارغاً وأنه ليس صفحة HTML افتراضية (Firebase Hosting SPA Page) وتجنب انهيار التطبيق.
 */

/**
 * دالة آمنة لمعالجة رد الخادم (Response) مع التأكد من أن الرد ليس فارغاً وأنه JSON صالح
 */
export async function safeParseResponse(response: Response, fallback?: any): Promise<any> {
  try {
    const textResponse = await response.text();
    if (!textResponse || !textResponse.trim()) {
      if (fallback !== undefined) return fallback;
      throw new Error("رد السيرفر فارغ");
    }

    // التحقق من إرجاع السيرفر لصفحة HTML بدلاً من JSON (مثل صفحة index.html الافتراضية في Firebase Hosting)
    const trimmed = textResponse.trim().toLowerCase();
    if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<head") || trimmed.startsWith("<body") || /^\s*</.test(trimmed)) {
      console.warn("[safeParseResponse] استلم الخادم صفحة HTML بدلاً من JSON (مسار API غير متاح على خادم الاستضافة الثابتة):", trimmed.slice(0, 100));
      if (fallback !== undefined) return fallback;
      throw new Error("مسار API غير متاح على خادم الاستضافة الثابتة (Firebase Hosting). يرجى التأكد من توفر مفتاح VITE_GEMINI_API_KEY أو ربط السيرفر.");
    }

    try {
      const data = JSON.parse(textResponse);
      return data;
    } catch (parseError: any) {
      console.error("[safeParseResponse] خطأ في تحليل JSON:", parseError, "النص:", textResponse.slice(0, 100));
      if (fallback !== undefined) return fallback;
      throw new Error("رد السيرفر ليس بتنسيق JSON صالح");
    }
  } catch (error: any) {
    console.error("[safeParseResponse] خطأ أثناء المعالجة:", error);
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

/**
 * دالة جلب آمنة بالكامل للتعامل مع أي API مع إمكانية تمرير رد بديل (Fallback) عند فشل السيرفر أو إرجاع HTML
 */
export async function safeFetchJson<T = any>(
  url: string, 
  options?: RequestInit, 
  fallback?: T,
  retries: number = 1
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const defaultFallback = (fallback !== undefined ? fallback : {}) as T;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // إعداد AbortController لضبط مهلة زمنية ذكية (30 ثانية)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // دمج الإشارة مع أي إشارة تم تمريرها من الخارج
      const fetchOptions: RequestInit = {
        ...options,
        signal: options?.signal || controller.signal
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const textResponse = await response.text();
      if (!textResponse || !textResponse.trim()) {
        if (fallback !== undefined) {
          return { ok: response.ok, status: response.status, data: fallback };
        }
        return { ok: response.ok, status: response.status, data: defaultFallback, error: "رد السيرفر فارغ" };
      }

      const trimmed = textResponse.trim().toLowerCase();
      if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<head") || trimmed.startsWith("<body") || /^\s*</.test(trimmed)) {
        console.warn(`[safeFetchJson] استلم الرابط ${url} صفحة HTML بدلاً من JSON.`);
        return { 
          ok: false, 
          status: response.status, 
          data: defaultFallback, 
          error: "مسار API غير متاح على الفايربيس (إرجاع صفحة HTML)" 
        };
      }

      let data: any;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError: any) {
        if (fallback !== undefined) {
          return { ok: response.ok, status: response.status, data: fallback, error: "تنسيق JSON غير صالح" };
        }
        return { ok: false, status: response.status, data: defaultFallback, error: "رد السيرفر ليس بتنسيق JSON صالح" };
      }

      return { ok: response.ok, status: response.status, data };
    } catch (error: any) {
      const isAbort = error.name === "AbortError";
      const isNetworkError = error.message?.includes("Failed to fetch") || error.name === "TypeError" || isAbort;

      if (attempt < retries && isNetworkError && !isAbort) {
        // انتظار قصير قبل إعادة المحاولة للتعافي من التذبذب الشبكي المؤقت
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }

      console.warn("[safeFetchJson] تعذر جلب البيانات من المسار:", url, error?.message || error);
      return {
        ok: false,
        status: 0,
        data: defaultFallback,
        error: error.message || "حدث خطأ أثناء الاتصال بالخادم"
      };
    }
  }

  return {
    ok: false,
    status: 0,
    data: defaultFallback,
    error: "تعذر الاتصال بالخادم بعد إعادة المحاولة"
  };
}

/**
 * دالة توحيد وتصحيح معرف الحزمة (packageId) ورابط متجر جوجل بلاي
 */
export function normalizePackageId(pkgOrQuery: string): string {
  if (!pkgOrQuery) return "";
  let clean = pkgOrQuery.trim();
  
  if (clean.includes("id=")) {
    try {
      const urlObj = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
      clean = urlObj.searchParams.get("id") || clean;
    } catch (_) {}
  }
  
  clean = clean.toLowerCase().trim();

  // Known official package maps for popular apps
  const knownMap: Record<string, string> = {
    "google maps": "com.google.android.apps.maps",
    "maps": "com.google.android.apps.maps",
    "خرائط جوجل": "com.google.android.apps.maps",
    "خرائط": "com.google.android.apps.maps",
    "com.google.maps": "com.google.android.apps.maps",
    "com.google.maps.android": "com.google.android.apps.maps",
    "com.google.android.maps": "com.google.android.apps.maps",
    "google drive": "com.google.android.apps.docs",
    "جوجل درايف": "com.google.android.apps.docs",
    "google keep": "com.google.android.keep",
    "جوجل كيب": "com.google.android.keep",
    "google photos": "com.google.android.apps.photos",
    "صور جوجل": "com.google.android.apps.photos",
    "google chrome": "com.android.chrome",
    "كروم": "com.android.chrome",
    "chrome": "com.android.chrome",
    "gmail": "com.google.android.gm",
    "جيميل": "com.google.android.gm",
    "youtube": "com.google.android.youtube",
    "يوتيوب": "com.google.android.youtube",
    "whatsapp": "com.whatsapp",
    "واتساب": "com.whatsapp",
    "facebook": "com.facebook.katana",
    "فيسبوك": "com.facebook.katana",
    "instagram": "com.instagram.android",
    "انستقرام": "com.instagram.android",
    "إنستغرام": "com.instagram.android",
    "telegram": "org.telegram.messenger",
    "تيليجرام": "org.telegram.messenger",
    "tiktok": "com.zhiliaoapp.musically",
    "تيك توك": "com.zhiliaoapp.musically",
    "chatgpt": "com.openai.chatgpt",
    "شات جي بي تي": "com.openai.chatgpt"
  };

  if (knownMap[clean]) {
    return knownMap[clean];
  }

  if (clean.startsWith("com.google.maps")) {
    return "com.google.android.apps.maps";
  }

  return clean;
}

/**
 * أداة توليد المقال والمراجعة الاحترافية الشاملة (1500+ كلمة) كبديل فوري عند استنفاذ كوتا الذكاء الاصطناعي
 */
export function generateExhaustiveArticleFallback(
  appName: string,
  devName?: string,
  category?: string,
  rating?: number,
  packageId?: string
): string {
  const name = appName || "التطبيق المتميز";
  const dev = devName && devName !== "غير محدد" ? devName : "الشركة المطورة الرسمية";
  const cat = category || "تطبيقات وأدوات";
  const rate = rating || 4.7;
  const pkg = packageId || "com.app.official";

  return `# دليل ومراجعة شاملة لتطبيق ${name}

تعتبر تجربة استخدام التطبيقات الذكية في عصرنا الحالي أحد أهم الأركان الأساسية التي تعتمد عليها حياتنا اليومية، وسواء كنت تبحث عن زيادة إنتاجيتك، أو تنظيم مهامك، أو الحصول على تجربة ترفيهية وتقنية فريدة، فإن تطبيق **${name}** يأتي كأحد أحدث وأهم الحلول البرمجية التي أثارت اهتمام المستخدمين والخبراء التقنيين على حد سواء. تم إطلاق وتطوير هذا التطبيق الرائد عبر فريق العمل المتميز في **${dev}**، ليلبي حاجة ملحة في السوق الرقمي ويقدم أداءً متزناً يجمع بين بساطة التصميم وقوة الميزات المتقدمة.

---

## مقدمة استعراضية ورؤية التطبيق وفكرته الرئيسية

انطلق تطبيق **${name}** ليحدث نقلة نوعية في فئته المخصصة (**${cat}**)، مقدماً مفهوماً عصرياً يرتكز على الكفاءة والسرعة وسهولة التفاعل. تهدف الرؤية الأساسية للتطبيق إلى تزويد المستخدم العربي والعالمي بأداة شاملة وموثوقة تغنيه عن استخدام عدة برامج وتطبيقات متفرقة، حيث تم دمج كافة الخصائص الحيوية في بيئة تشغيلية واحدة تتسم بالسلاسة والاستقرار العالي.

يتميز التطبيق بحصوله على تقييم مرتفع يبلغ **${rate} من 5 نجوم** على المتاجر الرسمية، مما يعكس الثقة الكبيرة التي أولاها له مئات الآلاف من المستخدمين حول العالم منذ إطلاقه.

---

## قصة وتاريخ المطور وأهداف تطوير التطبيق

يقف خلف هذا الإنجاز البرمجي فريق تطوير متمرس لدى **${dev}**، وهي جهة متخصصة في ابتكار حلول الهواتف الذكية وتطوير البرمجيات الآمنة. بدأ مشروع بناء وتطوير **${name}** بعد دراسة مستفيضة لمتطلبات وتطلعات جمهور الهواتف الذكية على متجري Google Play و Apple App Store.

ركز المطورون على تجاوز كافة المشكلات الفنية والتعقيدات الشائعة في التطبيقات المماثلة، مثل بطء الاستجابة، استنزاف البطارية، أو كثرة النوافذ المنبثقة المزعجة، وخرجوا بمنتج برمجي متكامل يراعي أعلى معايير الجودة العالمية وتجربة المستخدم المريحة (UX/UI).

---

## الشرح الموسع والعميق لكافة المميزات والخصائص الفنية والوظائف الذكية

يزخر تطبيق **${name}** بمجموعة استثنائية من الخصائص والقدرات الفنية المصممة بعناية:

1. **واجهة استخدام عصرية وانسيابية:**
   واجهة مستخدم تفاعلية تم تصميمها بألوان مريحة للعين وتوزيع متناسق للأزرار والأقسام، مما يتيح التبديل الفوري بين المهام والوصول إلى كافة الميزات بنقرة واحدة فقط.

2. **محرك معالجة فائق السرعة:**
   يعتمد التطبيق على خوارزميات محسنة هندسياً تضمن استجابة فورية للأوامر، حتى على الهواتف الذكية ذات المواصفات المتوسطة والاقتصادية.

3. **المزامنة السحابية والحفظ التلقائي:**
   إمكانية الاحتفاظ بنسخ احتياطية من التفضيلات والإعدادات السحابية، مما يضمن استعادة البيانات بسهولة عند تغيير الهاتف أو إعادة تثبيت التطبيق.

4. **تعدد اللغات ودعم كامل للغة العربية:**
   دعم متكامل ومحاذاة مثالية للغة العربية (RTL) دون أي أخطاء في الخطوط أو التنسيقات.

5. **إشعارات ذكية وقابلة للتخصيص:**
   نظام تنبيهات مرن يتيح للمستخدم ضبط التنبيهات والأوقات المفضلة لاستلام التحديثات دون التسبب في أي إزعاج.

---

## تحليل الأداء والسرعة، الأمان وحماية الخصوصية، واستهلاك الموارد

من أهم العوامل التي تحكم جودة أي تطبيق حديث هو مدى كفاءته التشغيلية وحمايته لبيانات مستخدميه:

- **الأداء والسرعة:** أظهرت الاختبارات المعملية استقراراً تاماً أثناء الاستخدام المكثف، مع سرعة إقلاع مذهلة لا تتعدى ثوانٍ معدودة.
- **استهلاك موارد النظام والبطارية:** تم تحسين الكود البرمجي لتقليل العمليات غير الضرورية في الخلفية، مما يحافظ على عمر البطارية ويقلل من استهلاك الذاكرة العشوائية (RAM).
- **الأمان وحماية الخصوصية:** يلتزم التطبيق بأعلى معايير التشفير والامتثال لسياسات Google Play Protect و Apple App Store Security، وخلوه تماماً من أي برمجيات تتبع خبيثة.

---

## دليل الاستخدام والتشغيل الكامل خطوة بخطوة للمبتدئين

للبدء في الاستفادة الكاملة من تطبيق **${name}**، اتبع الخطوات الإرشادية البسيطة التالية:

1. **الخطوة الأولى - التحميل والتثبيت:**
   انقر على زر التحميل المباشر المتوفر على الصفحة للانتقال إلى متجر Google Play أو متجر App Store الرسمي، ثم اضغط على زر "تثبيت" وانتظر حتى تكتمل العملية.

2. **الخطوة الثانية - فتح التطبيق ومنح الأذونات الضرورية:**
   عند تشغيل التطبيق للمرة الأولى، ستظهر لك شاشة ترحيبية تطلب منك الموافقة على الأذونات الأساسية اللازمة لعمل الميزات بالشكل الصحيح.

3. **الخطوة الثالثة - تخصيص الإعدادات والتفضيلات:**
   ادخل إلى قائمة الإعدادات لاختيار المظهر المفضل (الوضع الليلي أو النهاري) وتفعيل خيارات المزامنة والتنبيهات.

4. **الخطوة الرابعة - بدء الاستخدام اليومي:**
   استكشف الأقسام الرئيسية وابدأ في الاستفادة من جميع الميزات المتاحة بكل سهولة وسرعة.

---

## قسم الأسئلة الشائعة والأجوبة التفصيلية (FAQ)

- **س: هل تطبيق ${name} متاح للتحميل مجاناً؟**
  - **ج:** نعم، التطبيق متاح للتحميل والاستخدام الأساسي بشكل مجاني بالكامل على المتاجر الرسمية المعتمدة.

- **س: هل يعمل التطبيق بدون اتصال دائم بالإنترنت؟**
  - **ج:** يوفر التطبيق إمكانية الوصول إلى معظم الوظائف الأساسية في وضع عدم الاتصال (Offline)، مع الحاجة إلى الإنترنت عند مزامنة البيانات أو استلام التحديثات الجديدة.

- **س: ما هي متطلبات التشغيل والأنظمة المدعومة؟**
  - **ج:** يدعم التطبيق معظم إصدارات نظام أندرويد الحديثة (Android 8.0 فما فوق) بالإضافة إلى أجهزة iPhone و iPad العاملة بنظام iOS.

- **س: كيف يمكنني تحديث التطبيق إلى آخر إصدار؟**
  - **ج:** يمكنك التحقق من التحديثات مباشرة من خلال متجر Google Play أو App Store، حيث يرسل المطورون تحديثات دورية لتحسين الأداء.

---

## العيوب والتحديات والملاحظات الموضوعية المصداقية

بناءً على الأمانة الصحفية والمراجعة المحايدة، نود تسليط الضوء على بعض الملاحظات البسيطة:
- قد يحتوي التطبيق على بعض الإعلانات الخفيفة لدعم تكاليف التطوير والتحديثات المستمرة.
- بعض الميزات المتقدمة جداً قد تتطلب وجود اتصال سريع ومستقر بشبكة الإنترنت.

---

## مقارنة شاملة مع التطبيقات المنافسة في المتاجر الرسمية

بمقارنة تطبيق **${name}** مع التطبيقات المنافسة في فئة **${cat}**:
- **من حيث واجهة المستخدم:** يتفوق **${name}** في بساطة التنقل ووضوح القوائم.
- **من حيث استهلاك الذاكرة:** يتسم بحجم تثبيت مناسب واستهلاك منخفض جداً للموارد مقارنة بالبدائل الثقيلة.
- **من حيث الدعم الفني والتحديثات:** تحرص شركة **${dev}** على تقديم تحديثات صيانة دورية وإصلاح أية ثغرات بشكل مستمر.

---

## الخلاصة ورأي الخبراء والتقييم النهائي

في الختام، يمثل تطبيق **${name}** خياراً تقنياً متميزاً وموثوقاً يستحق التثبيت والتجربة على هاتفك الذكي. يجمع التطبيق ببراعة بين التصميم الجذاب، السرعة، الأمان، والتوافق العالي مع مختلف الأجهزة. نوصي بتنزيله والاستمتاع بمميزاته المتقدمة.

---

## الكلمات المفتاحية والدلالية المستهدفة (SEO Target Keywords)

\`${name}\`, \`تحميل ${name}\`, \`تنزيل تطبيق ${name}\`, \`تحميل ${name} مجانا\`, \`مراجعة ${name}\`, \`تطبيق ${name} للاندرويد\`, \`تطبيق ${name} للايفون\`, \`APK ${name}\`, \`أحدث إصدار ${name}\`, \`شرح ميزات ${name}\`, \`شركة ${dev}\`, \`تطبيقات ${cat}\`, \`أفضل تطبيقات ${cat}\`, \`تنزيل ${name} برابط مباشر\`, \`دليل استخدام ${name}\`, \`تطبيق ${name} آمن\`, \`رابط ${name} متجر بلاي\`, \`رابط ${name} اب ستور\`, \`تحديث ${name} الجديد\`, \`حزمة ${pkg}\`.`;
}

/**
 * أداة الاتصال المباشر بمحرك Gemini API بأسلوب آمن ودعم كامل للبيئة المرفوعة على Firebase
 */
export async function callGeminiApi(
  messages: Array<{ role: string; content: string }>,
  apiKeyOverride?: string
): Promise<string> {
  const metaEnv = (import.meta as any).env || {};
  const apiKey = 
    apiKeyOverride || 
    metaEnv.VITE_GEMINI_API_KEY || 
    (typeof process !== "undefined" && process.env ? process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY : "") ||
    "";

  const userPrompt = messages.map(m => m.content).join("\n\n");

  if (apiKey && apiKey.trim()) {
    const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    for (const modelName of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }]
          })
        });

        if (response.ok) {
          const data = await safeParseResponse(response, null);
          if (data && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
          }
        } else if (response.status === 429) {
          console.warn(`[callGeminiApi] Model ${modelName} returned 429 (Resource Exhausted). Checking next model or fallback...`);
        }
      } catch (err: any) {
        // Silently continue to next model or fallback
      }
    }
  }

  // Fallback to server side endpoint
  try {
    const srvRes = await fetch("/api/fetch-app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: userPrompt.slice(0, 100) })
    });
    const srvData = await safeParseResponse(srvRes, null);
    if (srvData && srvData.article) {
      return srvData.article;
    }
  } catch (srvErr) {
    console.warn("[callGeminiApi Server Fallback Notice]:", srvErr);
  }

  return "";
}

// Alias for backwards compatibility, strictly using Gemini API under the hood
export const callOpenAiApi = callGeminiApi;

