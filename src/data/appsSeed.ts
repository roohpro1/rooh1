import { AppReview } from "../types";

export const popularAppsSeed: Omit<AppReview, "createdAt">[] = [
  {
    id: "com.openai.chatgpt",
    name: "ChatGPT",
    iconUrl: "https://img.icons8.com/fluency/512/chatgpt.png",
    rating: 4.8,
    category: "إنتاجية وأدوات",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.openai.chatgpt",
    appStoreUrl: "https://apps.apple.com/us/app/chatgpt/id6448311069",
    tags: ["ذكاء اصطناعي", "مساعد شخصي", "توليد نصوص", "إنتاجية"],
    description: `### مراجعة تطبيق شات جي بي تي (ChatGPT) من OpenAI

تطبيق **ChatGPT** الرسمي للهواتف هو بوابتك المباشرة للتفاعل مع أقوى نماذج الذكاء الاصطناعي التوليدي في العالم. يتيح لك هذا المساعد الشخصي الحصول على إجابات فورية، أفكار إبداعية، تلخيص للمستندات، وكتابة الأكواد البرمجية بدقة مذهلة وسرعة استثنائية.

#### أهم مميزات التطبيق:
- **الدردشة الصوتية المتقدمة (Advanced Voice Mode):** تواصل مع الذكاء الاصطناعي بصوت طبيعي تماماً.
- **توليد وتحليل الصور الذكي عبر DALL-E 3:** اطلب من التطبيق رسم أي لوحة خيالية أو تحليل صورة.
- **أداة برمجية وتعليمية شاملة:** يساعدك في كتابة وتصحيح الأكواد بجميع لغات البرمجة.
- **مزامنة كاملة عبر الأجهزة:** يتم حفظ جميع محادثاتك وسجل بحثك بشكل آمن وسلس.

#### عيوب وملاحظات على التطبيق:
- يتطلب اتصالاً دائماً بالإنترنت للاستجابة.
- بعض الميزات المتقدمة تتطلب الاشتراك المدفوع.`
  },
  {
    id: "com.whatsapp",
    name: "WhatsApp Messenger",
    iconUrl: "https://img.icons8.com/color/512/whatsapp.png",
    rating: 4.3,
    category: "تواصل واجتماعي",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.whatsapp",
    appStoreUrl: "https://apps.apple.com/us/app/whatsapp-messenger/id310633997",
    tags: ["واتساب", "تواصل", "أندرويد", "مسنجر", "مكالمات مجانية"],
    description: `### مراجعة تطبيق واتساب مسنجر (WhatsApp Messenger)

تطبيق **واتساب مسنجر** هو برنامج المراسلة والمكالمات الأكثر شعبية في العالم، حيث يستخدمه أكثر من ملياري شخص. يتيح لك التطبيق البقاء على اتصال مع الأصدقاء والعائلة بأمان وبشكل مجاني تماماً.

#### أهم مميزات التطبيق:
- **تشفير تام بين الطرفين (End-to-End Encryption):** تظل رسائلك الشخصية ومكالماتك آمنة ومحمية.
- **مكالمات صوتية ومرئية جماعية عالية الجودة:** يمكنك إجراء مكالمات فيديو وصوت تجمع حتى 32 مشاركاً.
- **مشاركة وسائط وملفات ضخمة:** يمكنك إرسال مستندات وصور ومقاطع فيديو بأحجام كبيرة.

#### عيوب وملاحظات على التطبيق:
- يتطلب توفر رقم هاتف حقيقي لتفعيل الحساب واستخدامه.`
  },
  {
    id: "org.telegram.messenger",
    name: "Telegram Messenger",
    iconUrl: "https://img.icons8.com/color/512/telegram-app.png",
    rating: 4.5,
    category: "تواصل واجتماعي",
    playStoreUrl: "https://play.google.com/store/apps/details?id=org.telegram.messenger",
    appStoreUrl: "https://apps.apple.com/us/app/telegram-messenger/id686449807",
    tags: ["تيليجرام", "دردشة سريعة", "أمن", "مجموعات ضخمة"],
    description: `### مراجعة تطبيق تيليجرام مسنجر (Telegram Messenger)

تطبيق **تيليجرام** هو أسرع تطبيق مراسلة فوري في السوق، يشتهر بسرعته الفائقة، أمانه العالي، ودعمه للميزات السحابية المتقدمة.

#### أهم مميزات التطبيق:
- **مساحة تخزين سحابية غير محدودة:** تتوفر جميع وسائطك ورسائلك مجاناً دون استهلاك ذاكرة الهاتف.
- **قنوات ومجموعات ضخمة:** إمكانية إنشاء مجموعات دردشة تضم ما يصل إلى 200,000 عضو.
- **البوتات الذكية والمطورة:** ميزة تدعم إنشاء بوتات ومساعدين مخصصين.`
  },
  {
    id: "com.duolingo",
    name: "Duolingo",
    iconUrl: "https://img.icons8.com/color/512/duolingo.png",
    rating: 4.7,
    category: "تعليم وتثقيف",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.duolingo",
    appStoreUrl: "https://apps.apple.com/us/app/duolingo-language-lessons/id570060103",
    tags: ["دولينجو", "تعلم لغات", "تعليم تفاعلي", "إنجليزية"],
    description: `### مراجعة تطبيق دولينجو (Duolingo) لتعلم اللغات

تطبيق **دولينجو** هو التطبيق التعليمي الأكثر شهرة وتحميلاً على مستوى العالم لتعلم اللغات الأجنبية بطريقة تفاعلية ومسلية تشبه الألعاب.

#### أهم مميزات التطبيق:
- **أسلوب اللعب والتحفيز (Gamification):** دروس قصيرة ونقاط حماسية.
- **دعم أكثر من 40 لغة:** تعلم الإنجليزية، الفرنسية، الإسبانية وغيرها.`
  },
  {
    id: "com.spotify.music",
    name: "Spotify - Music and Podcasts",
    iconUrl: "https://img.icons8.com/color/512/spotify--v1.png",
    rating: 4.4,
    category: "ترفيه وتسلية",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.spotify.music",
    appStoreUrl: "https://apps.apple.com/us/app/spotify-new-music-and-podcasts/id324684580",
    tags: ["سبوتيفاي", "موسيقى", "بودكاست", "ترفيه"],
    description: `### مراجعة تطبيق سبوتيفاي (Spotify)

تطبيق **سبوتيفاي** هو المنصة الرائدة عالمياً لبث الموسيقى والبودكاست، حيث يتيح لك الوصول إلى ملايين الأغاني والمقاطع الصوتية مجاناً.`
  },
  {
    id: "com.lemon.lvoverseas",
    name: "CapCut - Video Editor",
    iconUrl: "https://img.icons8.com/color/512/video-editing.png",
    rating: 4.6,
    category: "تصوير وتحرير",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.lemon.lvoverseas",
    appStoreUrl: "https://apps.apple.com/us/app/capcut-video-editor/id1500739008",
    tags: ["كاب كات", "محرر فيديو", "مونتاج هاتف", "تأثيرات بصرية"],
    description: `### مراجعة تطبيق كاب كات (CapCut) الاحترافي للمونتاج

تطبيق **CapCut** هو محرر الفيديو المجاني الشامل الذي يتيح لك إنتاج مقاطع فيديو مذهلة واحترافية مباشرة من هاتفك الذكي.`
  },
  {
    id: "com.instagram.android",
    name: "Instagram",
    iconUrl: "https://img.icons8.com/color/512/instagram-new--v1.png",
    rating: 4.4,
    category: "تواصل واجتماعي",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.instagram.android",
    appStoreUrl: "https://apps.apple.com/us/app/instagram/id389801252",
    tags: ["إنستغرام", "صور", "ريلز", "تواصل", "اجتماعي"],
    description: `### مراجعة تطبيق إنستغرام (Instagram) للصور والريلز

تطبيق **إنستغرام** من شركة Meta هو المنصة العالمية الأولى لمشاركة الصور ومقاطع الفيديو القصيرة (Reels) والقصص اليومية.`
  },
  {
    id: "com.pinterest",
    name: "Pinterest",
    iconUrl: "https://img.icons8.com/color/512/pinterest--v1.png",
    rating: 4.6,
    category: "تصوير وتحرير",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.pinterest",
    appStoreUrl: "https://apps.apple.com/us/app/pinterest/id429047995",
    tags: ["بنتريست", "أفكار تصوير", "ديكورات", "إبداع", "تصميم"],
    description: `### مراجعة تطبيق بنتريست (Pinterest)

تطبيق **بنتريست** هو محرك بحث مرئي واجتماعي لاكتشاف الأفكار الملهمة في مختلف جوانب الحياة اليومية والديكورات والموضة.`
  },
  {
    id: "com.zhiliaoapp.musically",
    name: "TikTok",
    iconUrl: "https://img.icons8.com/color/512/tiktok.png",
    rating: 4.5,
    category: "ترفيه وتسلية",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically",
    appStoreUrl: "https://apps.apple.com/us/app/tiktok/id835599320",
    tags: ["تيك توك", "فيديوهات قصيرة", "ترفيه", "تريندات"],
    description: `### مراجعة تطبيق تيك توك (TikTok) العالمي للفيديو القصير

تطبيق **تيك توك** هو الوجهة الرائدة عالمياً لمقاطع الفيديو القصيرة عبر الهاتف مع خوارزميات اقتراح محتوى فائقة الذكاء.`
  },
  {
    id: "com.google.android.youtube",
    name: "YouTube",
    iconUrl: "https://img.icons8.com/color/512/youtube-play.png",
    rating: 4.7,
    category: "ترفيه وتسلية",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.google.android.youtube",
    appStoreUrl: "https://apps.apple.com/us/app/youtube-watch-listen-stream/id544007664",
    tags: ["يوتيوب", "فيديو", "صناعة محتوى", "بث مباشر"],
    description: `### مراجعة تطبيق يوتيوب (YouTube) الرسمي لبث المحتوى

تطبيق **يوتيوب** الرسمي يتيح لك مشاهدة ومشاركة فيديوهاتك المفضلة ومتابعة قنواتك في مجالات التعليم والترفيه والرياضة.`
  },
  {
    id: "com.snapchat.android",
    name: "Snapchat",
    iconUrl: "https://img.icons8.com/color/512/snapchat.png",
    rating: 4.2,
    category: "تواصل واجتماعي",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapchat.android",
    appStoreUrl: "https://apps.apple.com/us/app/snapchat/id447163809",
    tags: ["سناب شات", "فلاتر", "عدسات ذكية", "مراسلة فورية"],
    description: `### مراجعة تطبيق سناب شات (Snapchat) للعدسات والمراسلة

تطبيق **سناب شات** هو الطريقة الأسرع والأكثر متعة لمشاركة اللحظات اليومية عبر العدسات والواقع المعزز.`
  },
  {
    id: "com.facebook.katana",
    name: "Facebook",
    iconUrl: "https://img.icons8.com/color/512/facebook-new.png",
    rating: 4.1,
    category: "تواصل واجتماعي",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.facebook.katana",
    appStoreUrl: "https://apps.apple.com/us/app/facebook/id284882215",
    tags: ["فيسبوك", "شبكة اجتماعية", "أخبار", "مجموعات"],
    description: `### مراجعة تطبيق فيسبوك (Facebook) الشبكة الاجتماعية الأكبر

تطبيق **فيسبوك** يربطك بمجتمعات واهتمامات وأصدقاء من جميع أنحاء العالم للبيع والشراء والتواصل.`
  },
  {
    id: "com.netflix.mediaclient",
    name: "Netflix",
    iconUrl: "https://img.icons8.com/color/512/netflix.png",
    rating: 4.3,
    category: "ترفيه وتسلية",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.netflix.mediaclient",
    appStoreUrl: "https://apps.apple.com/us/app/netflix/id363590051",
    tags: ["نتفلكس", "أفلام", "مسلسلات", "سينما سحابية", "ترفيه"],
    description: `### مراجعة تطبيق نتفليكس (Netflix) لبث الأفلام والمسلسلات

تطبيق **نتفليكس** هو المنصة الرائدة عالمياً لبث الأفلام والمسلسلات والبرامج التلفزيونية الحائزة على جوائز إيمي وأوسكار.`
  },
  {
    id: "com.tencent.ig",
    name: "PUBG MOBILE",
    iconUrl: "https://img.icons8.com/color/512/controller.png",
    rating: 4.4,
    category: "ألعاب وحماس",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.tencent.ig",
    appStoreUrl: "https://apps.apple.com/us/app/pubg-mobile/id1330123889",
    tags: ["ببجي", "ألعاب قتال", "باتل رويال", "حماس جماعي", "شوتر"],
    description: `### مراجعة لعبة ببجي موبايل (PUBG MOBILE) القتالية

لعبة **ببجي موبايل** تقدم أقوى المعارك الجماعية الحماسية المجانية والخرائط المتنوعة وأساليب اللعب التكتيكية.`
  },
  {
    id: "com.roblox.client",
    name: "Roblox",
    iconUrl: "https://img.icons8.com/color/512/roblox.png",
    rating: 4.4,
    category: "ألعاب وحماس",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.roblox.client",
    appStoreUrl: "https://apps.apple.com/us/app/roblox/id431174751",
    tags: ["روبلوكس", "عالم افتراضي", "صناعة ألعاب", "ألعاب جماعية"],
    description: `### مراجعة تطبيق روبلوكس (Roblox) الكون الافتراضي الشامل

تطبيق **روبلوكس** يتيح لك اللعب والابتكار ومشاركة التجارب مع ملايين الأشخاص حول العالم بآلاف الألعاب.`
  },
  {
    id: "us.zoom.videomeetings",
    name: "Zoom Workplace",
    iconUrl: "https://img.icons8.com/color/512/zoom.png",
    rating: 4.3,
    category: "إنتاجية وأدوات",
    playStoreUrl: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings",
    appStoreUrl: "https://apps.apple.com/us/app/zoom-one-platform-to-connect/id546505307",
    tags: ["زوم", "اجتماعات فيديو", "عمل عن بعد", "محاضرات رقمية"],
    description: `### مراجعة تطبيق زوم (Zoom Workplace) للاجتماعات

تطبيق **زوم** هو المنصة الرائدة لعقد اجتماعات الفيديو والعمل والتعليم عن بعد بسلاسة فائقة.`
  },
  {
    id: "com.google.android.apps.docs",
    name: "Google Drive",
    iconUrl: "https://img.icons8.com/color/512/google-drive--v2.png",
    rating: 4.6,
    category: "إنتاجية وأدوات",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.google.android.apps.docs",
    appStoreUrl: "https://apps.apple.com/us/app/google-drive/id507874739",
    tags: ["جوجل درايف", "تخزين سحابي", "ملفات", "إنتاجية"],
    description: `### مراجعة تطبيق جوجل درايف (Google Drive)

تطبيق **جوجل درايف** هو الحل السحابي الموثوق لتخزين المستندات والصور والملفات والوصول إليها من أي جهاز آمن.`
  },
  {
    id: "com.microsoft.office.word",
    name: "Microsoft Word",
    iconUrl: "https://img.icons8.com/color/512/microsoft-word-2019.png",
    rating: 4.5,
    category: "إنتاجية وأدوات",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.microsoft.office.word",
    appStoreUrl: "https://apps.apple.com/us/app/microsoft-word/id586447913",
    tags: ["مايكروسوفت وورد", "كتابة مستندات", "محرر نصوص", "أوفيس"],
    description: `### مراجعة تطبيق مايكروسوفت وورد (Microsoft Word)

تطبيق **مايكروسوفت وورد** يتيح لك إنشاء وتعديل وقراءة المستندات والتقارير الأكاديمية والمهنية بدقة واحترافية.`
  },
  {
    id: "com.adobe.reader",
    name: "Adobe Acrobat Reader",
    iconUrl: "https://img.icons8.com/color/512/adobe-acrobat-reader.png",
    rating: 4.5,
    category: "إنتاجية وأدوات",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.adobe.reader",
    appStoreUrl: "https://apps.apple.com/us/app/adobe-acrobat-reader-for-pdf/id469337564",
    tags: ["أدوبي قارئ PDF", "مستندات", "توقيع إلكتروني", "أدوات"],
    description: `### مراجعة تطبيق أدوبي أكروبات (Adobe Acrobat Reader)

تطبيق **Adobe Acrobat** هو نظام إدارة ملفات PDF الأكثر موثوقية لعرض المستندات وتوقيعها وتعليمها بالترميز.`
  },
  {
    id: "com.canva.editor",
    name: "Canva: Design, Photo & Video",
    iconUrl: "https://img.icons8.com/color/512/canva.png",
    rating: 4.8,
    category: "تصوير وتحرير",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.canva.editor",
    appStoreUrl: "https://apps.apple.com/us/app/canva-design-photo-video/id892323984",
    tags: ["كانفا", "تصميم جرافيك", "شعارات", "منشورات social media"],
    description: `### مراجعة تطبيق كانفا (Canva) لتصميم الجرافيك

تطبيق **Canva** يمنحك القدرة على تصميم المنشورات والشعارات والعروض التقديمية والسير الذاتية بآلاف القوالب المجانية.`
  },
  {
    id: "com.shazam.android",
    name: "Shazam: Music Discovery",
    iconUrl: "https://img.icons8.com/color/512/shazam.png",
    rating: 4.7,
    category: "ترفيه وتسلية",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.shazam.android",
    appStoreUrl: "https://apps.apple.com/us/app/shazam-music-discovery/id284993459",
    tags: ["شازام", "التعرف على الأغاني", "موسيقى", "أدوات صوتية"],
    description: `### مراجعة تطبيق شازام (Shazam) لمعرفة أسماء الأغاني

تطبيق **Shazam** يتعرف فوراً على اسم الأغنية والفنان بمجرد الاستماع لمقطع صوتي قصير خلال ثوانٍ معدودة.`
  },
  {
    id: "com.x.android",
    name: "X (Twitter)",
    iconUrl: "https://img.icons8.com/color/512/twitter--v1.png",
    rating: 4.1,
    category: "تواصل واجتماعي",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.twitter.android",
    appStoreUrl: "https://apps.apple.com/us/app/x/id333903271",
    tags: ["إكس", "تويتر", "أخبار عاجلة", "تواصل اجتماع"],
    description: `### مراجعة تطبيق إكس (تويتر سابقاً)

تطبيق **X** هو ساحة المدينة الرقمية العالمية لمتابعة الأخبار العاجلة والأفكار والآراء والتريندات في وقتها الفعلي.`
  },
  {
    id: "com.discord",
    name: "Discord: Talk, Chat & Hang Out",
    iconUrl: "https://img.icons8.com/color/512/discord-logo.png",
    rating: 4.3,
    category: "تواصل واجتماعي",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.discord",
    appStoreUrl: "https://apps.apple.com/us/app/discord-talk-chat-hang-out/id985746746",
    tags: ["ديسكورد", "سيرفرات", "دردشة صوتبة", "ألعاب"],
    description: `### مراجعة تطبيق ديسكورد (Discord)

تطبيق **Discord** يوفر مساحات وسيرفرات مجتمعية مخصصة للمجتمعات واللاعبين للمحادثات الصوتية والمرئية عالية الجودة.`
  },
  {
    id: "com.microsoft.teams",
    name: "Microsoft Teams",
    iconUrl: "https://img.icons8.com/color/512/microsoft-teams.png",
    rating: 4.4,
    category: "إنتاجية وأدوات",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.microsoft.teams",
    appStoreUrl: "https://apps.apple.com/us/app/microsoft-teams/id1113153706",
    tags: ["مايكروسوفت تيمز", "اجتماعات عمل", "تعاون فريقي", "مستندات"],
    description: `### مراجعة تطبيق مايكروسوفت تيمز (Microsoft Teams)

تطبيق **Microsoft Teams** ينظم بيئة العمل الرقمية واجتماعات الفرق والمشاريع بمرونة ومشاركة ملفات آلية.`
  },
  {
    id: "com.google.android.keep",
    name: "Google Keep - Notes and Lists",
    iconUrl: "https://img.icons8.com/color/512/google-keep.png",
    rating: 4.5,
    category: "إنتاجية وأدوات",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.google.android.keep",
    appStoreUrl: "https://apps.apple.com/us/app/google-keep-notes-and-lists/id1061881655",
    tags: ["جوجل كيب", "ملاحظات", "قوائم مهام", "تنظيم"],
    description: `### مراجعة تطبيق جوجل كيب (Google Keep) للملاحظات

تطبيق **Google Keep** هو مفكرتك السريعة لتدوين الأفكار والملاحظات الصوتية وقوائم المهام اليومية مع المزامنة.`
  },
  {
    id: "com.viber.voip",
    name: "Viber Messenger",
    iconUrl: "https://img.icons8.com/color/512/viber.png",
    rating: 4.3,
    category: "تواصل واجتماعي",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.viber.voip",
    appStoreUrl: "https://apps.apple.com/us/app/viber-messenger-chat-calls/id382617920",
    tags: ["فاينبر", "مكالمات مجانية", "تواصل", "رسائل آمنة"],
    description: `### مراجعة تطبيق فايبر (Viber Messenger)

تطبيق **Viber** يوفر الاتصالات الصوتية والمرئية المجانية والرسائل المشفرة مع ملصقات وقنوات تفاعلية.`
  },
  {
    id: "com.autodesk.autocadws",
    name: "AutoCAD - DWG Viewer & Editor",
    iconUrl: "https://img.icons8.com/color/512/autocad.png",
    rating: 4.2,
    category: "تصوير وتحرير",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.autodesk.autocadws",
    appStoreUrl: "https://apps.apple.com/us/app/autocad/id393140443",
    tags: ["أوتوكاد", "رسم هندسي", "خرائط DWG", "أدوات تصميم"],
    description: `### مراجعة تطبيق أوتوكاد (AutoCAD Mobile)

تطبيق **AutoCAD** هو الأداة الهندسية المتميزة لعرض وتعديل الرسومات والمخططات المعمارية للهواتف والأجهزة اللوحية.`
  },
  {
    id: "com.kiloo.subwaysurf",
    name: "Subway Surfers",
    iconUrl: "https://img.icons8.com/color/512/running.png",
    rating: 4.5,
    category: "ألعاب وحماس",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.kiloo.subwaysurf",
    appStoreUrl: "https://apps.apple.com/us/app/subway-surfers/id512939461",
    tags: ["صباوي", "ركض لا نهائي", "ألعاب أطفال", "حماس"],
    description: `### مراجعة لعبة صب واي سرفرس (Subway Surfers)

لعبة **Subway Surfers** هي أشهر لعبة مطاردة وركض لا نهائي حماسية وممتعة لجميع الأعمار.`
  },
  {
    id: "com.supercell.clashofclans",
    name: "Clash of Clans",
    iconUrl: "https://img.icons8.com/color/512/shield.png",
    rating: 4.6,
    category: "ألعاب وحماس",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.supercell.clashofclans",
    appStoreUrl: "https://apps.apple.com/us/app/clash-of-clans/id529479190",
    tags: ["كلاش أوف كلانس", "استراتيجية", "حروب قبائل", "ألعاب قتال"],
    description: `### مراجعة لعبة كلاش أوف كلانس (Clash of Clans)

لعبة **Clash of Clans** الاستراتيجية الأسطورية لبناء قرينك وتدريب جيشك وقيادة قبيلتك في معارك حماسية.`
  },
  {
    id: "com.binance.dev",
    name: "Binance: Buy Bitcoin & Crypto",
    iconUrl: "https://img.icons8.com/color/512/binance.png",
    rating: 4.5,
    category: "إنتاجية وأدوات",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.binance.dev",
    appStoreUrl: "https://apps.apple.com/us/app/binance-buy-bitcoin-crypto/id1436799971",
    tags: ["بينانس", "عملات رقمية", "تداول", "استثمار"],
    description: `### مراجعة تطبيق بينانس (Binance) للعملات الرقمية

تطبيق **Binance** هو المنصة العالمية الأولى لتداول واستثمار وتقييم حركة العملات الرقمية والبيتكوين بأمان.`
  }
];
