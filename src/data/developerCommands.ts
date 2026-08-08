export interface DeveloperCommand {
  id: string;
  title: string;
  category: "storage_r2" | "ai_engine" | "seo_sitemap" | "security_db" | "performance_analytics" | "system_core";
  categoryLabel: string;
  iconName: string;
  badge: string;
  colorClass: {
    bg: string;
    border: string;
    text: string;
    hoverBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
  };
  prompt: string;
  quickSummary: string;
}

export const DEVELOPER_COMMAND_CATEGORIES = [
  { id: "all", label: "كافة الأوامر (الكل)" },
  { id: "storage_r2", label: "سحابي & R2" },
  { id: "ai_engine", label: "محرك الذكاء والـ 1500+" },
  { id: "seo_sitemap", label: "SEO وخريطة الموقع" },
  { id: "security_db", label: "الأمان وقاعدة البيانات" },
  { id: "performance_analytics", label: "الأداء والإحصائيات" },
  { id: "system_core", label: "النظام والمفاتيح" }
] as const;

export const DEVELOPER_COMMANDS: DeveloperCommand[] = [
  // --- 1. Storage & Cloudflare R2 ---
  {
    id: "cmd_check_r2",
    title: "فحص Cloudflare R2 & approved-apps.json",
    category: "storage_r2",
    categoryLabel: "سحابي & R2",
    iconName: "Cloud",
    badge: "Cloudflare R2",
    colorClass: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      text: "text-cyan-200",
      hoverBg: "hover:bg-cyan-500/20",
      iconColor: "text-cyan-400",
      badgeBg: "bg-cyan-950/80",
      badgeText: "text-cyan-300"
    },
    prompt: "افحص حالة الاتصال بـ Cloudflare R2 وتأكد من سلامة ملف approved-apps.json وسرعة استجابة ملفات HTML للمقالات.",
    quickSummary: "التحقق من صحة Worker السحابي وجاهزية ملف approved-apps.json واستضافة صفحات المقالات المستقلة."
  },
  {
    id: "cmd_cf_workers_status",
    title: "فحص عمال Cloudflare Workers",
    category: "storage_r2",
    categoryLabel: "سحابي & R2",
    iconName: "Server",
    badge: "CF Worker",
    colorClass: {
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      text: "text-sky-200",
      hoverBg: "hover:bg-sky-500/20",
      iconColor: "text-sky-400",
      badgeBg: "bg-sky-950/80",
      badgeText: "text-sky-300"
    },
    prompt: "افحص حالة واستجابة Cloudflare Worker المسؤول عن تقديم ملفات HTML وapproved-apps.json.",
    quickSummary: "فحص زمن الاستجابة ونقاط النهاية الحية لـ Worker السحابي ومعدل النجاح."
  },
  {
    id: "cmd_publish_workflow",
    title: "مسار إضافة ونشر تطبيق إلى R2",
    category: "storage_r2",
    categoryLabel: "سحابي & R2",
    iconName: "ArrowRight",
    badge: "Pipeline",
    colorClass: {
      bg: "bg-teal-500/10",
      border: "border-teal-500/30",
      text: "text-teal-200",
      hoverBg: "hover:bg-teal-500/20",
      iconColor: "text-teal-400",
      badgeBg: "bg-teal-950/80",
      badgeText: "text-teal-300"
    },
    prompt: "افحص مسار إضافة ومراجعة ونشر تطبيق جديد من لوحة الإدارة حتى رفع الـ HTML على R2.",
    quickSummary: "تدقيق تدفق النشر الكامل من الكشط وحتى إنشاء ملف HTML ورفعه على R2 وتحديث approved-apps.json."
  },
  {
    id: "cmd_backup_export",
    title: "النسخ الاحتياطي وتصدير البيانات",
    category: "storage_r2",
    categoryLabel: "سحابي & R2",
    iconName: "Download",
    badge: "Backup JSON",
    colorClass: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-200",
      hoverBg: "hover:bg-blue-500/20",
      iconColor: "text-blue-400",
      badgeBg: "bg-blue-950/80",
      badgeText: "text-blue-300"
    },
    prompt: "أعطني خيارات تصدير نسخة احتياطية من بيانات التطبيقات أو استعادة البيانات المعتمدة.",
    quickSummary: "توليد ملفات النسخ الاحتياطي واستعادة البيانات المعتمدة لضمان أمان المحتوى."
  },

  // --- 2. AI Engine & 1500+ Words ---
  {
    id: "cmd_check_1500w",
    title: "معايير محرك المقالات (1500+ كلمة)",
    category: "ai_engine",
    categoryLabel: "محرك الذكاء والـ 1500+",
    iconName: "FileText",
    badge: "1500+ Words",
    colorClass: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-200",
      hoverBg: "hover:bg-purple-500/20",
      iconColor: "text-purple-400",
      badgeBg: "bg-purple-950/80",
      badgeText: "text-purple-300"
    },
    prompt: "تحقق من جاهزية محرك توليد مقالات المراجعة المطولة (1500+ كلمة) مع الهيكل الإلزامي والـ FAQ.",
    quickSummary: "فحص صياغة البرومبت الإلزامي لضمان مقال صحفي عميق يتجاوز 1500 كلمة مع كافة الأقسام."
  },
  {
    id: "cmd_check_candidate_search",
    title: "بحث المرشحات في المتاجر الرسمية",
    category: "ai_engine",
    categoryLabel: "محرك الذكاء والـ 1500+",
    iconName: "Search",
    badge: "Candidate Search",
    colorClass: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      text: "text-indigo-200",
      hoverBg: "hover:bg-indigo-500/20",
      iconColor: "text-indigo-400",
      badgeBg: "bg-indigo-950/80",
      badgeText: "text-indigo-300"
    },
    prompt: "اختبر آلية البحث عن التطبيقات المرشحة (Candidate Search Flow) وتأكد من جلب المرشحات من المتاجر الرسمية بدقة.",
    quickSummary: "التحقق من كشط وبحث التطبيقات المتطابقة في Google Play و iTunes App Store قبل التوليد."
  },
  {
    id: "cmd_vision_ocr",
    title: "الرؤية البصرية وقراءة الصور (OCR Vision)",
    category: "ai_engine",
    categoryLabel: "محرك الذكاء والـ 1500+",
    iconName: "Camera",
    badge: "Vision OCR",
    colorClass: {
      bg: "bg-pink-500/10",
      border: "border-pink-500/30",
      text: "text-pink-200",
      hoverBg: "hover:bg-pink-500/20",
      iconColor: "text-pink-400",
      badgeBg: "bg-pink-950/80",
      badgeText: "text-pink-300"
    },
    prompt: "اشرح لي قدراتك في قراءة وتحليل الصور ولقطات الشاشة (OCR Vision) وكيف يمكنك استخراج الأكواد والأخطاء منها.",
    quickSummary: "فحص قدرات وكيل الذكاء الاصطناعي على قراءة النصوص وتحليل لقطات الشاشة والأخطاء البرمجية بصرياً."
  },
  {
    id: "cmd_generate_test_review",
    title: "توليد مقال تجريبي فوري واختباره",
    category: "ai_engine",
    categoryLabel: "محرك الذكاء والـ 1500+",
    iconName: "Sparkles",
    badge: "Test Review",
    colorClass: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-200",
      hoverBg: "hover:bg-yellow-500/20",
      iconColor: "text-yellow-400",
      badgeBg: "bg-yellow-950/80",
      badgeText: "text-yellow-300"
    },
    prompt: "قم بتوليد مراجعة تجريبية فورية لتطبيق WhatsApp باشتراطات الـ 1500 كلمة للتحقق من الجودة.",
    quickSummary: "اختبار فوري لمحرك التوليد ونموذج Groq LLaMA 3.3 لتوليد مراجعة نموذجية متكاملة."
  },
  {
    id: "cmd_tts_elevenlabs",
    title: "محرك الصوت والـ TTS (ElevenLabs)",
    category: "ai_engine",
    categoryLabel: "محرك الذكاء والـ 1500+",
    iconName: "Volume2",
    badge: "ElevenLabs Voice",
    colorClass: {
      bg: "bg-fuchsia-500/10",
      border: "border-fuchsia-500/30",
      text: "text-fuchsia-200",
      hoverBg: "hover:bg-fuchsia-500/20",
      iconColor: "text-fuchsia-400",
      badgeBg: "bg-fuchsia-950/80",
      badgeText: "text-fuchsia-300"
    },
    prompt: "افحص مفاتيح وحالة محرك تحويل النص إلى صوت (ElevenLabs TTS) وجودة تشغيل المراجعات الصوتية.",
    quickSummary: "اختبار مفاتيح ElevenLabs المتعددة وتوليد عينات صوتية عربية فائقة النقاء للمقالات."
  },
  {
    id: "cmd_system_prompt_audit",
    title: "تدقيق الـ System Prompt للنماذج",
    category: "ai_engine",
    categoryLabel: "محرك الذكاء والـ 1500+",
    iconName: "Code",
    badge: "Prompt Engineering",
    colorClass: {
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      text: "text-violet-200",
      hoverBg: "hover:bg-violet-500/20",
      iconColor: "text-violet-400",
      badgeBg: "bg-violet-950/80",
      badgeText: "text-violet-300"
    },
    prompt: "راجع نص التعليمات البرمجية (System Prompt) الموجه لـ Groq وGemini وتأكد من شموله للهيكل الكامل.",
    quickSummary: "تدقيق نصوص الأوامر التوجيهية لنماذج الذكاء الاصطناعي ومطابقتها للمتطلبات الصحفية."
  },
  {
    id: "cmd_generate_3d_logo",
    title: "توليد صورة 3D لشعار التطبيق",
    category: "ai_engine",
    categoryLabel: "محرك الذكاء والـ 1500+",
    iconName: "ImageIcon",
    badge: "3D Visuals",
    colorClass: {
      bg: "bg-pink-500/10",
      border: "border-pink-500/30",
      text: "text-pink-200",
      hoverBg: "hover:bg-pink-500/20",
      iconColor: "text-pink-400",
      badgeBg: "bg-pink-950/80",
      badgeText: "text-pink-300"
    },
    prompt: "أنشئ صورة 3D لشعار موقع مراجعات التطبيقات بألوان نيون بنفسجية ووردية بدقة عالية.",
    quickSummary: "توليد أيقونات وشعارات ورسومات ثلاثية الأبعاد احترافية بالذكاء الاصطناعي."
  },

  // --- 3. SEO, Dynamic Sitemap & Slugs ---
  {
    id: "cmd_check_sitemap",
    title: "خريطة الموقع Dynamic Sitemap.xml",
    category: "seo_sitemap",
    categoryLabel: "SEO وخريطة الموقع",
    iconName: "Compass",
    badge: "Sitemap XML",
    colorClass: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-200",
      hoverBg: "hover:bg-emerald-500/20",
      iconColor: "text-emerald-400",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300"
    },
    prompt: "افحص حالة خريطة الموقع sitemap.xml الديناميكية وتأكد من مطابقة جميع روابط الـ Slugs لملف approved-apps.json.",
    quickSummary: "التأكد من التوليد التلقائي لملف sitemap.xml النظيف من قائمة approved-apps.json لمحركات البحث."
  },
  {
    id: "cmd_check_clean_slugs",
    title: "تدقيق الروابط النظيفة Clean Slugs",
    category: "seo_sitemap",
    categoryLabel: "SEO وخريطة الموقع",
    iconName: "Globe",
    badge: "SEO URLs",
    colorClass: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      text: "text-green-200",
      hoverBg: "hover:bg-green-500/20",
      iconColor: "text-green-400",
      badgeBg: "bg-green-950/80",
      badgeText: "text-green-300"
    },
    prompt: "تحقق من خلو روابط الموقع من لاحقة .html وتطابق قواعد الـ SEO Direct Clean URLs والتوجيه السليم.",
    quickSummary: "فحص سلامة الروابط مثل /whatsapp بدون .html وتوافقها مع محركات البحث العالمية."
  },
  {
    id: "cmd_seo_meta_tags",
    title: "الكلمات المفتاحية و Meta Tags",
    category: "seo_sitemap",
    categoryLabel: "SEO وخريطة الموقع",
    iconName: "Hash",
    badge: "Keywords 15-25",
    colorClass: {
      bg: "bg-lime-500/10",
      border: "border-lime-500/30",
      text: "text-lime-200",
      hoverBg: "hover:bg-lime-500/20",
      iconColor: "text-lime-400",
      badgeBg: "bg-lime-950/80",
      badgeText: "text-lime-300"
    },
    prompt: "افحص توافق المقالات مع معايير الـ SEO وتوليد 15-25 كلمة مفتاحية دقيقة ووسوم OpenGraph.",
    quickSummary: "التحقق من كثافة الكلمات الدلالية ووسوم المشاركة على منصات التواصل (OG Tags)."
  },
  {
    id: "cmd_reindex_cache",
    title: "إعادة الفهرسة وتنظيف الكاش",
    category: "seo_sitemap",
    categoryLabel: "SEO وخريطة الموقع",
    iconName: "RefreshCw",
    badge: "Re-Indexing",
    colorClass: {
      bg: "bg-emerald-600/10",
      border: "border-emerald-600/30",
      text: "text-emerald-200",
      hoverBg: "hover:bg-emerald-600/20",
      iconColor: "text-emerald-400",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300"
    },
    prompt: "قم ببدء عملية إعادة الفهرسة وتحديث كاش المتصفح وقوائم التطبيقات المعتمدة.",
    quickSummary: "تحديث ذاكرة التخزين المؤقت وإعادة مزامنة التطبيقات لمحركات البحث فوراً."
  },

  // --- 4. Security & Firebase Quota ---
  {
    id: "cmd_check_firebase_quota",
    title: "حماية كوتا Firebase Firestore",
    category: "security_db",
    categoryLabel: "الأمان وقاعدة البيانات",
    iconName: "Database",
    badge: "Zero Quota Waste",
    colorClass: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-200",
      hoverBg: "hover:bg-amber-500/20",
      iconColor: "text-amber-400",
      badgeBg: "bg-amber-950/80",
      badgeText: "text-amber-300"
    },
    prompt: "افحص استهلاك قاعدة بيانات Firebase وتأكد من عدم حفظ المقالات الطويلة في Firestore لمنع استنزاف الكوتا.",
    quickSummary: "التأكد الصارم من عدم تخزين محتوى المقالات الطويلة في Firestore لتوفير الحصة المجانية 100%."
  },
  {
    id: "cmd_security_firewall",
    title: "جدار الحماية وصلاحيات المشرف",
    category: "security_db",
    categoryLabel: "الأمان وقاعدة البيانات",
    iconName: "ShieldCheck",
    badge: "PIN & Tokens",
    colorClass: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      text: "text-rose-200",
      hoverBg: "hover:bg-rose-500/20",
      iconColor: "text-rose-400",
      badgeBg: "bg-rose-950/80",
      badgeText: "text-rose-300"
    },
    prompt: "افحص إعدادات الأمان وجدار الحماية، نظام الـ OTP وTokens، وحماية مسارات لوحة التحكم.",
    quickSummary: "فحص طبقات الأمان، رموز الدخول OTP، وجدار حماية مسارات الـ Admin."
  },
  {
    id: "cmd_reviews_rating_system",
    title: "نظام التقييمات والتعليقات",
    category: "security_db",
    categoryLabel: "الأمان وقاعدة البيانات",
    iconName: "MessageSquare",
    badge: "User Ratings",
    colorClass: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-200",
      hoverBg: "hover:bg-orange-500/20",
      iconColor: "text-orange-400",
      badgeBg: "bg-orange-950/80",
      badgeText: "text-orange-300"
    },
    prompt: "افحص نظام تقييمات التطبيقات والتعليقات وتأكد من سلامة الحفظ والعرض للمستخدمين.",
    quickSummary: "فحص آلية احتساب متوسط التقييمات والتعليقات وحمايتها من السبام."
  },

  // --- 5. Performance & Analytics ---
  {
    id: "cmd_get_live_stats",
    title: "إحصائيات التطبيقات والمنصة الحية",
    category: "performance_analytics",
    categoryLabel: "الأداء والإحصائيات",
    iconName: "Activity",
    badge: "Live Stats",
    colorClass: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-200",
      hoverBg: "hover:bg-blue-500/20",
      iconColor: "text-blue-400",
      badgeBg: "bg-blue-950/80",
      badgeText: "text-blue-300"
    },
    prompt: "أعطني تقريراً شاملاً عن إحصائيات التطبيقات المنشورة، المسودات، الفئات، والتطبيقات الأكثر تفاعلاً.",
    quickSummary: "جلب أحدث الأرقام الحية للتطبيقات والفئات ومعدلات التفاعل من الخادم مباشرة."
  },
  {
    id: "cmd_performance_cache",
    title: "سرعة التحميل والأداء والـ Cache",
    category: "performance_analytics",
    categoryLabel: "الأداء والإحصائيات",
    iconName: "Zap",
    badge: "Speed Optimization",
    colorClass: {
      bg: "bg-yellow-400/10",
      border: "border-yellow-400/30",
      text: "text-yellow-200",
      hoverBg: "hover:bg-yellow-400/20",
      iconColor: "text-yellow-400",
      badgeBg: "bg-yellow-950/80",
      badgeText: "text-yellow-300"
    },
    prompt: "حلل سرعة استجابة الموقع، أداء التخزين المؤقت (Caching)، وأوقات تحميل مقالات R2.",
    quickSummary: "قياس زمن تحميل الصفحات وأداء التخزين المؤقت في المتصفح والـ CDN."
  },
  {
    id: "cmd_mobile_responsive",
    title: "اختبار التجاوب مع الجوال والشاشات",
    category: "performance_analytics",
    categoryLabel: "الأداء والإحصائيات",
    iconName: "Smartphone",
    badge: "Mobile UI",
    colorClass: {
      bg: "bg-indigo-600/10",
      border: "border-indigo-600/30",
      text: "text-indigo-200",
      hoverBg: "hover:bg-indigo-600/20",
      iconColor: "text-indigo-400",
      badgeBg: "bg-indigo-950/80",
      badgeText: "text-indigo-300"
    },
    prompt: "افحص تجاوب واجهات الموقع وأزرار التحكم مع مقاسات الهواتف والأجهزة اللوحية (Mobile Responsiveness).",
    quickSummary: "التحقق من سهولة النقر، أحجام الخطوط، وتناسق العرض على شاشات الهواتف."
  },
  {
    id: "cmd_analytics_conversion",
    title: "مراقبة تفاعل الزوار والتحويل",
    category: "performance_analytics",
    categoryLabel: "الأداء والإحصائيات",
    iconName: "TrendingUp",
    badge: "Analytics CTR",
    colorClass: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-200",
      hoverBg: "hover:bg-emerald-500/20",
      iconColor: "text-emerald-400",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300"
    },
    prompt: "حلل إحصائيات تفاعل الزوار، النقرات على روابط المتاجر، ومعدلات قراءة المقالات.",
    quickSummary: "تحليل معدلات النقر على روابط التحميل وتفاعل القراء مع محتوى المقالات."
  },

  // --- 6. System Core & Keys ---
  {
    id: "cmd_keys_diagnostics",
    title: "فحص وتدوير مفاتيح النماذج الحية",
    category: "system_core",
    categoryLabel: "النظام والمفاتيح",
    iconName: "Key",
    badge: "Key Rotation",
    colorClass: {
      bg: "bg-purple-600/10",
      border: "border-purple-600/30",
      text: "text-purple-200",
      hoverBg: "hover:bg-purple-600/20",
      iconColor: "text-purple-400",
      badgeBg: "bg-purple-950/80",
      badgeText: "text-purple-300"
    },
    prompt: "افحص حالة جميع مفاتيح Groq وGemini النشطة وقدم تقريراً بعدد المفاتيح الصالحة ومعدل الأخطاء.",
    quickSummary: "استعلام فوري عن حالة مفاتيح Groq وGemini والتبديل التلقائي عند استنفاذ الكوتا."
  },
  {
    id: "cmd_error_logs_debug",
    title: "سجل الأخطاء والـ Debug Logs",
    category: "system_core",
    categoryLabel: "النظام والمفاتيح",
    iconName: "ClipboardList",
    badge: "Live Logs",
    colorClass: {
      bg: "bg-rose-600/10",
      border: "border-rose-600/30",
      text: "text-rose-200",
      hoverBg: "hover:bg-rose-600/20",
      iconColor: "text-rose-400",
      badgeBg: "bg-rose-950/80",
      badgeText: "text-rose-300"
    },
    prompt: "افحص سجل الأخطاء والعمليات الحية (Activity Logs) وقدم حلولاً فورية لأي مشكلة مسجلة.",
    quickSummary: "تتبع أحدث الاستثناءات والعمليات وتوفير حلول برمجية فورية لكل خطأ."
  },
  {
    id: "cmd_agents_guidelines",
    title: "تدقيق التوافق مع AGENTS.md",
    category: "system_core",
    categoryLabel: "النظام والمفاتيح",
    iconName: "ListChecks",
    badge: "AGENTS Compliance",
    colorClass: {
      bg: "bg-amber-400/10",
      border: "border-amber-400/30",
      text: "text-amber-200",
      hoverBg: "hover:bg-amber-400/20",
      iconColor: "text-amber-400",
      badgeBg: "bg-amber-950/80",
      badgeText: "text-amber-300"
    },
    prompt: "قم بتدقيق شامل لكافة ميزات الموقع ومطابقتها مع القواعد الأربع في AGENTS.md.",
    quickSummary: "التحقق من تطبيق القواعد: بحث المرشحات، 1500+ كلمة، الروابط النظيفة، وفصل R2 عن Firebase."
  },
  {
    id: "cmd_theme_contrast",
    title: "فحص الثيم والتباين البصري",
    category: "system_core",
    categoryLabel: "النظام والمفاتيح",
    iconName: "Palette",
    badge: "Theme Matrix",
    colorClass: {
      bg: "bg-teal-600/10",
      border: "border-teal-600/30",
      text: "text-teal-200",
      hoverBg: "hover:bg-teal-600/20",
      iconColor: "text-teal-400",
      badgeBg: "bg-teal-950/80",
      badgeText: "text-teal-300"
    },
    prompt: "افحص إعدادات الثيم والتباين اللوني وتوافق الخطوط مع معايير القراءة البصرية.",
    quickSummary: "فحص الألوان المتناسقة والوضع المظلم ومعايير التباين WCAG للقراءة السلسة."
  },
  {
    id: "cmd_sync_github_secrets",
    title: "مزامنة أسرار ومفاتيح GitHub",
    category: "system_core",
    categoryLabel: "النظام والمفاتيح",
    iconName: "Lock",
    badge: "GitHub Secrets",
    colorClass: {
      bg: "bg-zinc-700/20",
      border: "border-zinc-600/40",
      text: "text-zinc-200",
      hoverBg: "hover:bg-zinc-700/40",
      iconColor: "text-zinc-300",
      badgeBg: "bg-zinc-900",
      badgeText: "text-zinc-300"
    },
    prompt: "قم بمزامنة أسرار ومفاتيح الـ API الحية مع مستودع GitHub Actions.",
    quickSummary: "رفع الأسرار والمفاتيح المشفرة إلى مستودع GitHub بنقرة واحدة لتفعيل الـ CI/CD."
  },
  {
    id: "cmd_full_system_health",
    title: "تشخيص شامل لكافة مكونات النظام",
    category: "system_core",
    categoryLabel: "النظام والمفاتيح",
    iconName: "ShieldCheck",
    badge: "Full Healthcheck",
    colorClass: {
      bg: "bg-yellow-400/20",
      border: "border-yellow-400/50",
      text: "text-yellow-100",
      hoverBg: "hover:bg-yellow-400/30",
      iconColor: "text-yellow-300",
      badgeBg: "bg-yellow-950/90",
      badgeText: "text-yellow-300"
    },
    prompt: "قم بإجراء فحص شامل وتشخيص كامل لكل أجزاء ومكونات وسيرفرات الموقع الآن.",
    quickSummary: "تقرير شامل ومفصل يغطي الخادم، التخزين، النماذج، المفاتيح، والـ SEO في ثوانٍ."
  }
];
