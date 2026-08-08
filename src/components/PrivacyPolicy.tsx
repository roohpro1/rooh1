import React from "react";
import { Shield, Lock, Eye, FileText, CheckCircle, ExternalLink } from "lucide-react";

interface PrivacyPolicyProps {
  customPrivacyUrl?: string;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ customPrivacyUrl }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-5 pb-8 sm:py-12 transition-colors" style={{ direction: "rtl" }}>
      {/* Hero Header - Blue Background with Vibrant Yellow & White Text */}
      <div className="text-center mb-8 bg-blue-600 text-yellow-300 rounded-3xl p-6 sm:p-8 border-2 border-blue-700 shadow-xl">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-black mb-3 border-2 border-amber-500 shadow-md">
          <Shield className="w-7 h-7 text-black stroke-[2.5]" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-yellow-300 tracking-tight">سياسة الخصوصية والاستخدام</h1>
        <p className="mt-2 text-white max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed font-bold">
          نحن نقدر خصوصيتك ونهتم بحماية بياناتك الشخصية وفقاً لأعلى معايير الأمان وحماية البيانات الدولية.
        </p>

        {customPrivacyUrl && (
          <div className="mt-5 flex justify-center">
            <a
              href={customPrivacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 border-2 border-amber-500"
            >
              <ExternalLink className="w-4 h-4" />
              <span>قراءة سياسة الخصوصية الكاملة والمخصصة عبر الرابط الخارجي</span>
            </a>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border-2 border-slate-300 dark:border-zinc-800 p-6 sm:p-10 shadow-md space-y-8 text-black dark:text-slate-300 leading-relaxed text-sm sm:text-base transition-colors">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-black dark:text-white">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-400 dark:border-blue-900/50 text-blue-700 dark:text-blue-400">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-black dark:text-white">1. جمع المعلومات واستخدامها</h2>
          </div>
          <p className="text-black dark:text-slate-300 text-justify text-xs sm:text-sm leading-relaxed font-bold">
            نحن لا نطلب منك أي معلومات شخصية لزيارة موقعنا وتصفح مراجعات التطبيقات. جميع الخدمات والمراجعات متاحة للجميع مجاناً دون الحاجة للتسجيل أو الإفصاح عن هويتك. وفي حال تواصلت معنا عبر البريد الإلكتروني، فلن يتم استخدام عنوان بريدك إلا للرد على استفسارك فقط ولن يتم بيعه أو مشاركته مع أي طرف ثالث تحت أي ظرف.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-black dark:text-white">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-900/50 text-amber-900 dark:text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-black dark:text-white">2. ملفات تعريف الارتباط (Cookies) وبيانات التصفح</h2>
          </div>
          <p className="text-black dark:text-slate-300 text-justify text-xs sm:text-sm leading-relaxed font-bold">
            يستخدم موقعنا ملفات تعريف الارتباط (Cookies) لتحسين تجربة تصفحك وتحليل حركة المرور على الموقع. ملفات تعريف الارتباط هي ملفات نصية صغيرة يتم تخزينها على جهازك وتساعدنا في معرفة الصفحات الأكثر زيارة والخدمات الأكثر طلباً، مما يمكننا من تحسين جودة المحتوى باستمرار. يمكنك دائماً تعطيل الكوكيز من إعدادات متصفحك الخاص إن أردت ذلك.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-black dark:text-white">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-red-950/40 border-2 border-rose-400 dark:border-red-900/50 text-rose-700 dark:text-red-400">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-black dark:text-white">3. إعلانات Google AdSense وملف تعريف الارتباط DART</h2>
          </div>
          <p className="text-black dark:text-slate-300 text-justify text-xs sm:text-sm leading-relaxed font-bold">
            تستخدم شركة Google (بصفتها طرفاً ثالثاً) ملفات تعريف الارتباط لخدمة الإعلانات على موقعنا. وبفضل ملف تعريف الارتباط DART، تتمكن Google من عرض إعلانات مخصصة للمستخدمين بناءً على زياراتهم لموقعنا ومواقع أخرى على الإنترنت.
          </p>
          <div className="bg-slate-50 dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 mt-3 space-y-2">
            <p className="font-black text-black dark:text-slate-100 text-xs sm:text-sm">تنبيهات هامة مطابقة لشروط قبول Google AdSense:</p>
            <ul className="list-disc pr-5 text-xs sm:text-sm text-black dark:text-slate-300 space-y-2 font-bold">
              <li>يستخدم موردو الطرف الثالث، بما فيهم Google، ملفات تعريف ارتباط لتوليد وعرض الإعلانات بناءً على زيارات المستخدم السابقة لموقعنا.</li>
              <li>باستخدام ملف تعريف الارتباط DART، تتمكن Google وشركاؤها من عرض الإعلانات للمستخدمين بناءً على زيارتهم لموقعنا و/أو مواقع أخرى عبر الإنترنت.</li>
              <li>يمكن للمستخدمين إلغاء استخدام ملف تعريف الارتباط DART من خلال زيارة <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer" className="text-blue-700 dark:text-blue-400 font-black underline">سياسة الخصوصية الخاصة بإعلانات Google وشبكة المحتوى</a>.</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-black dark:text-white">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-black dark:text-white">4. روابط الجهات الخارجية والشركاء</h2>
          </div>
          <p className="text-black dark:text-slate-300 text-justify text-xs sm:text-sm leading-relaxed font-bold">
            يحتوي موقعنا على روابط خارجية توجهك إلى متاجر التطبيقات الرسمية (مثل Google Play Store و Apple App Store). يرجى العلم بأننا لا نملك أي سلطة أو سيطرة على سياسات الخصوصية الخاصة بهذه المواقع الخارجية أو المتاجر الرسمية، وننصحك دائماً بقراءة سياسة الخصوصية الخاصة بكل موقع تزوره بمجرد مغادرتك لمدونتنا.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-black dark:text-white">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-400 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-black dark:text-white">5. حقوق المستخدم والموافقة</h2>
          </div>
          <p className="text-black dark:text-slate-300 text-justify text-xs sm:text-sm leading-relaxed font-bold">
            باستخدامك لموقعنا وتصفحك للمراجعات، فإنك تبدي موافقتك الصريحة على بنود سياسة الخصوصية الموضحة في هذه الصفحة. نحن نحتفظ بالحق في تحديث هذه السياسة في أي وقت، وسيتم إدراج أي تغييرات فوراً هنا.
          </p>
        </section>

        {/* Footer Contact */}
        <div className="border-t-2 border-slate-200 dark:border-zinc-800 pt-6 text-center text-xs sm:text-sm text-black dark:text-slate-400 font-black">
          تم تحديث سياسة الخصوصية هذه آخر مرة بتاريخ: 23 يوليو 2026.
          <br />
          إذا كان لديك أي سؤال أو استفسار، يسعدنا تواصلك معنا عبر نموذج الاتصال والدعم المعترف به بالنظام.
        </div>

      </div>
    </div>
  );
};
