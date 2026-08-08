/**
 * خدمة البحث المخصصة لجلب روابط متجر جوجل بلاي الرسمية بدقة وسرعة
 */
export async function getGooglePlayLink(appName: string): Promise<string> {
    const API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY || "";
    const CX = "a1d67cd9cbb674db2";
    
    if (!appName || !appName.trim()) {
        return "https://play.google.com/store/apps";
    }

    const cleanName = appName.trim();

    // 1. المحاولة الأولى: استخدام Google Custom Search API
    try {
        const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(cleanName)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data?.error) {
            console.warn(`[Custom Search API Notice] Code ${data.error.code}: ${data.error.message}`);
        }
        
        if (data?.items && data.items.length > 0) {
            for (const item of data.items) {
                const validUrl = item?.link;
                if (validUrl && validUrl.includes('play.google.com/store/apps/details')) {
                    console.log(`[getGooglePlayLink] ✅ Custom Search API found direct link: ${validUrl}`);
                    return validUrl;
                }
            }
        }
    } catch (error: any) {
        console.warn("[getGooglePlayLink] Custom Search fetch error:", error?.message || error);
    }

    // 2. خط الدفاع الثاني: البحث والكشط المباشر في متجر جوجل بلاي لاستخراج معرف الحزمة (packageId)
    try {
        const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(cleanName)}&c=apps&hl=ar`;
        const res = await fetch(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
                "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7"
            }
        });

        if (res.ok) {
            const html = await res.text();
            const matches = [...html.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9_\-\.]+)/g)];
            for (const m of matches) {
                const pId = m[1];
                if (
                    pId &&
                    pId.includes(".") &&
                    !pId.startsWith("com.app.") &&
                    !pId.endsWith("-review") &&
                    !["undefined", "null"].includes(pId.toLowerCase()) &&
                    /^[a-zA-Z][a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-\.]+$/.test(pId)
                ) {
                    const directUrl = `https://play.google.com/store/apps/details?id=${pId}`;
                    console.log(`[getGooglePlayLink] ✅ Found direct Play Store link via HTML lookup: ${directUrl}`);
                    return directUrl;
                }
            }
        }
    } catch (scraperErr: any) {
        console.warn("[getGooglePlayLink] HTML lookup notice:", scraperErr?.message || scraperErr);
    }

    // 3. خط الدفاع الثالث: استعلام سيرفر المرشحات المحلي إذا كان متاحاً
    try {
        const serverRes = await fetch("/api/search-candidates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: cleanName })
        });
        if (serverRes.ok) {
            const serverData = await serverRes.json();
            if (serverData.success && serverData.candidates && serverData.candidates.length > 0) {
                const firstCand = serverData.candidates[0];
                if (firstCand.playStoreUrl && firstCand.playStoreUrl.includes("details?id=")) {
                    console.log(`[getGooglePlayLink] ✅ Found link via candidates API: ${firstCand.playStoreUrl}`);
                    return firstCand.playStoreUrl;
                }
            }
        }
    } catch (apiErr: any) {
        // Ignored
    }

    // 4. في حال تعذر العثور على رابط مباشر بأي طريقة، نرجع رابط بحث مباشر لضمان استمرارية التطبيق
    return `https://play.google.com/store/search?q=${encodeURIComponent(cleanName)}&c=apps`;
}