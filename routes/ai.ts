import express from "express";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import * as core from "../server-core";
import type { KeyItem, EnvConfigData } from "../server-core";

const { safeWorkerFetch, safeParseResponse, app, PORT, resolveActiveGeminiApiKey, resolveActiveOpenAiApiKey, getGeminiSdkClient, sanitizeCategory, fetchAppStoreUrl, normalizePackageId, scrapePlayStore, readDB, writeDB, verifyAdminToken, searchPlayStoreUrl, lookupAppStore, markdownToFormattedHtml, generateExhaustiveFallbackReview, generateAppReviewAI, generateSEOKeywordsAI, handleScrapeAndReview, webDbInstance, getWebFirestoreInstance, getFirebaseDb, discoverNewPlayStorePackages, pullAndReviewApps, analyzeFeatureQueryAI, normalizeText, ARABIC_STOP_WORDS, extractSearchKeywords, fetchiTunesCandidates, handleSearchAndScrape, APPROVED_APPS_FILE, APPS_CACHE_FILE, getApprovedAppsList, getFullAppsCacheList, addAppToApprovedAppsJson, removeAppFromApprovedAppsJson, purgeAllAppsData, generateSmartDiagnosticReport, generateLiveDiagnosticAgentResponse, triggerGithubDeploy, getGoogleAccessTokenFromRefreshToken, submitToGoogleIndexing, DEFAULT_PROQ_GROQ_KEYS, DEFAULT_ELEVENLABS_KEYS, sealGithubSecret, getActiveKeyString, LOCAL_CONFIG_FILE, getSystemEnvConfigFromFs, saveSystemEnvConfigToFs, rotateElevenLabsKeyIfExhausted, switchElevenLabsKeyExplicit, generateElevenLabsTTS, callGroqLlamaChatEngine, callMultimodalVisionAgent, rotateGeminiKeyIfExhausted, rotateGroqKeyIfExhausted, switchGroqKeyExplicit, syncGithubSecretsHelper, runDailyAppsPullIfNeeded, setupDailyAppsCron, ensureGeminiKeysInFirestore, ensureAdminFirebaseInitialized, cleanSlugForSitemap, getLocalAppsCache, updateLocalAppsCache, formatSitemapDate, getIndexedAppPages } = core;

export function registerRoutes(app: express.Express) {
  app.post("/api/smart-article", async (req: express.Request, res: express.Response) => {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: "الرجاء إدخال اسم التطبيق أو الموضوع للبحث وتوليد المقالة." });
    }

    const searchQuery = query.trim();
    console.log(`\n=================== [SMART CHECK & R2 CACHING API] ===================`);
    console.log(`[Smart Article API] Received Query: "${searchQuery}"`);

    try {
      const db = getFirebaseDb();
    
      // Slug generation
      let cleanSlug = searchQuery
        .toLowerCase()
        .trim()
        .replace(/[\u064B-\u0652]/g, "")
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/واتساب/g, "whatsapp")
        .replace(/فيسبوك/g, "facebook")
        .replace(/انستقرام|إنستغرام/g, "instagram")
        .replace(/تيليجرام|تليجرام/g, "telegram")
        .replace(/يوتيوب/g, "youtube")
        .replace(/تطبيق/g, "app")
        .replace(/تحميل/g, "download")
        .replace(/شرح/g, "guide")
        .replace(/مراجعة/g, "review")
        .replace(/[^a-z0-9\-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!cleanSlug || cleanSlug.length < 2) {
        cleanSlug = `article-${Date.now()}`;
      }

      const r2FileName = cleanSlug.endsWith(".html") ? cleanSlug : `${cleanSlug}.html`;
      const workerR2Url = `https://roohpro.com/${r2FileName}`;

      // Step 1: Smart Check - Query Firebase Firestore for existing metadata
      let existingData: any = null;
      if (db) {
        const qSlug = await db.collection("apps").where("slug", "==", cleanSlug.replace(".html", "")).limit(1).get();
        if (!qSlug.empty) {
          existingData = qSlug.docs[0].data();
        } else {
          const qName = await db.collection("apps").where("name", "==", searchQuery).limit(1).get();
          if (!qName.empty) {
            existingData = qName.docs[0].data();
          }
        }
      }

      // Step 2: Cache Hit - Perform GET request to Cloudflare Worker R2 URL
      if (existingData) {
        console.log(`[Smart Article API] 📦 Metadata found in Firestore for: "${searchQuery}"`);
        const targetR2Url = existingData.r2Url || workerR2Url;
        try {
          const r2GetRes = await fetch(targetR2Url, { method: "GET" });
          if (r2GetRes.ok) {
            const cachedHtml = await r2GetRes.text();
            if (cachedHtml && cachedHtml.trim().length > 100) {
              console.log(`[Smart Article API] 🎉 CACHE HIT! Fetched ${cachedHtml.length} bytes directly from R2 without AI call.`);
              return res.json({
                success: true,
                isCacheHit: true,
                slug: cleanSlug,
                title: existingData.name || searchQuery,
                r2Url: targetR2Url,
                r2FileKey: r2FileName,
                htmlContent: cachedHtml,
                metadata: existingData
              });
            }
          }
        } catch (getErr) {
          console.warn("[Smart Article API] R2 GET cache fetch warning:", getErr);
        }
      }

      // Step 3: Cache Miss - Generate with AI Engine & Upload via PUT to Cloudflare Worker R2
      console.log(`[Smart Article API] ⚡ CACHE MISS! Generating 1500+ word review with AI for "${searchQuery}"...`);

      const aiResult = await generateAppReviewAI({
        name: searchQuery,
        category: "تطبيقات ودليل الاستخدام",
        rating: 4.8
      });

      const formattedHtml = markdownToFormattedHtml(aiResult.article, searchQuery);

      // Send PUT Request to Cloudflare Worker R2
      console.log(`[Smart Article API] 🚀 Uploading HTML to Cloudflare Worker via PUT: ${workerR2Url}`);
      const putRes = await fetch(workerR2Url, {
        method: "PUT",
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=31536000, immutable"
        },
        body: formattedHtml
      });

      if (!putRes.ok) {
        const errText = await putRes.text().catch(() => "");
        console.error(`[Smart Article API] ❌ Cloudflare R2 PUT Upload failed (${putRes.status}): ${errText}`);
        return res.status(502).json({ error: `فشل رفع المقالة لـ Cloudflare R2: ${errText}` });
      }

      console.log(`[Smart Article API] ✅ Cloudflare R2 PUT Upload Succeeded (Status 200 OK)`);

      const newDocId = Math.floor(10000 + Math.random() * 90000).toString();
      const articleData = {
        id: newDocId,
        appCode: newDocId,
        name: searchQuery,
        appTitle: searchQuery,
        searchKeyword: searchQuery,
        slug: cleanSlug.replace(".html", ""),
        r2FileKey: r2FileName,
        r2Url: workerR2Url,
        articleUrl: `https://roohpro.com/app/${cleanSlug.replace(".html", "")}`,
        status: "published",
        lastmod: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: aiResult.article,
        content: formattedHtml,
        metaTitle: aiResult.metaTitle,
        metaDescription: aiResult.metaDescription,
        seoKeywords: aiResult.seoKeywords || aiResult.tags,
        tags: aiResult.tags,
        category: aiResult.category,
        createdAt: new Date(),
        isApproved: true,
        isUserSearched: true
      };

      if (db) {
        await db.collection("apps").doc(newDocId).set(articleData);
        console.log(`[Smart Article API] 💾 Saved article metadata to Firebase Firestore with ID: ${newDocId}`);
      }

      res.json({
        success: true,
        isCacheHit: false,
        slug: cleanSlug,
        title: searchQuery,
        r2Url: workerR2Url,
        r2FileKey: r2FileName,
        htmlContent: formattedHtml,
        metadata: articleData
      });

    } catch (err: any) {
      console.error("[Smart Article API] Unhandled exception:", err);
      res.status(500).json({ error: err.message || "حدث خطأ غير متوقع أثناء المعالجة." });
    }
  });
  app.post("/api/scrape", verifyAdminToken, handleScrapeAndReview);
  app.post("/api/fetch-app", verifyAdminToken, handleScrapeAndReview);
  app.post("/api/ai/regenerate-description", verifyAdminToken, async (req, res) => {
    try {
      const { name, developer, category, playStoreUrl, appStoreUrl, rating, currentDescription } = req.body;
      if (!name) {
        return res.status(400).json({ error: "اسم التطبيق مطلوب لإعادة التوليد" });
      }

      const metadata = {
        name,
        developer: developer || "غير محدد",
        category: category || "تطبيقات",
        playStoreUrl: playStoreUrl || "",
        appStoreUrl: appStoreUrl || "",
        rating: parseFloat(rating) || 4.5,
        rawDescription: currentDescription || ""
      };

      const aiResult = await generateAppReviewAI(metadata);
      res.json({
        success: true,
        description: aiResult.article,
        tags: aiResult.tags,
        category: aiResult.category || metadata.category
      });
    } catch (err: any) {
      console.error("AI Regenerate Description error:", err);
      res.status(500).json({ error: err.message || "فشل إعادة توليد الشرح بالذكاء الاصطناعي." });
    }
  });
  app.post("/api/ai/regenerate-keywords", verifyAdminToken, async (req, res) => {
    try {
      const { name, developer, category, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: "اسم التطبيق مطلوب لإعادة توليد كلمات البحث" });
      }

      const tags = await generateSEOKeywordsAI({ name, developer, category, description });
      res.json({
        success: true,
        tags
      });
    } catch (err: any) {
      console.error("AI Regenerate Keywords error:", err);
      res.status(500).json({ error: err.message || "فشل توليد كلمات البحث بالذكاء الاصطناعي." });
    }
  });
  app.post("/api/admin/verify-play-url", verifyAdminToken, async (req, res) => {
    try {
      const { appId, name, currentPlayStoreUrl, packageId: currentPkg } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, isValid: false, message: "اسم التطبيق مطلوب للبحث عنه والتحقق منه" });
      }

      const cleanName = name.trim();
      console.log(`[AI Verify Play URL] 🔍 Initiated verification for app: "${cleanName}" (ID: ${appId || 'preview'})`);

      let verifiedPkgId = "";
      let verifiedPlayStoreUrl = "";
      let isHealthy = false;

      // Step 1: Check existing packageId or Play Store URL if provided
      let candidatePkgs: string[] = [];
      if (currentPkg && currentPkg.includes(".") && !currentPkg.startsWith("com.app.")) {
        candidatePkgs.push(currentPkg.trim());
      }
      if (currentPlayStoreUrl && currentPlayStoreUrl.includes("id=")) {
        try {
          const urlObj = new URL(currentPlayStoreUrl.startsWith("http") ? currentPlayStoreUrl : `https://${currentPlayStoreUrl}`);
          const pId = urlObj.searchParams.get("id");
          if (pId && !candidatePkgs.includes(pId)) candidatePkgs.push(pId);
        } catch (e) {}
      }

      // Test existing candidate package IDs using scrapePlayStore
      for (const pkg of candidatePkgs) {
        try {
          const meta = await scrapePlayStore(pkg);
          if (meta && meta.name && meta.packageId) {
            verifiedPkgId = meta.packageId;
            verifiedPlayStoreUrl = meta.playStoreUrl || `https://play.google.com/store/apps/details?id=${meta.packageId}`;
            isHealthy = true;
            console.log(`[AI Verify Play URL] ✅ Existing package "${pkg}" verified as healthy!`);
            break;
          }
        } catch (e) {
          console.warn(`[AI Verify Play URL] Existing candidate "${pkg}" scrape failed:`, e);
        }
      }

      // Step 2: If not healthy, use Gemini AI & Play Store Search to discover the true package ID
      if (!isHealthy) {
        // Ask Gemini AI for official packageId
        const aiObj = await getGeminiSdkClient();
        if (aiObj) {
          const { client: aiClient } = aiObj;
          try {
            const prompt = `أنت خبير في متجر Google Play. أعطني معرف الحزمة (packageId) ورابط متجر جوجل بلاي الرسمي للتطبيق التالي: "${cleanName}".
  مثال على الإجابة:
  {
    "packageId": "com.whatsapp",
    "playStoreUrl": "https://play.google.com/store/apps/details?id=com.whatsapp"
  }`;
            const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
            for (const mName of modelsToTry) {
              try {
                const aiRes = await aiClient.models.generateContent({
                  model: mName,
                  contents: prompt,
                  config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        packageId: { type: Type.STRING },
                        playStoreUrl: { type: Type.STRING }
                      }
                    }
                  }
                });
                if (aiRes.text) {
                  const parsed = JSON.parse(aiRes.text);
                  if (parsed.packageId && parsed.packageId.includes(".")) {
                    if (!candidatePkgs.includes(parsed.packageId)) candidatePkgs.push(parsed.packageId);
                  }
                }
                break;
              } catch (err) {}
            }
          } catch (e) {}
        }

        // Scraping Google Play search HTML for candidate IDs
        try {
          const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(cleanName)}&c=apps&hl=ar`;
          const response = await fetch(searchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
              "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7"
            }
          });
          if (response.ok) {
            const html = await response.text();
            const matches = [...html.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9_\-\.]+)/g)];
            for (const m of matches) {
              const pId = m[1];
              if (pId && pId.includes(".") && !pId.startsWith("com.app.") && !candidatePkgs.includes(pId)) {
                candidatePkgs.push(pId);
              }
            }
          }
        } catch (e) {}

        // Test all accumulated candidate package IDs
        for (const pId of candidatePkgs) {
          try {
            const meta = await scrapePlayStore(pId);
            if (meta && meta.name && meta.packageId) {
              verifiedPkgId = meta.packageId;
              verifiedPlayStoreUrl = meta.playStoreUrl || `https://play.google.com/store/apps/details?id=${meta.packageId}`;
              isHealthy = true;
              console.log(`[AI Verify Play URL] ✅ Successfully discovered & verified package "${pId}" for "${cleanName}"!`);
              break;
            }
          } catch (e) {}
        }
      }

      // Step 3: If verified healthy and appId is given, update Firestore
      if (isHealthy && verifiedPlayStoreUrl) {
        if (appId) {
          try {
            const db = getFirebaseDb();
            if (db) {
              const docRef = db.collection("apps").doc(appId);
              await docRef.set({
                playStoreUrl: verifiedPlayStoreUrl,
                packageId: verifiedPkgId,
                updatedAt: new Date()
              }, { merge: true });
              console.log(`[AI Verify Play URL] 💾 Updated Firestore doc apps/${appId} with verified playStoreUrl`);
            }
          } catch (dbErr) {
            console.warn(`[AI Verify Play URL] Firestore update error for ${appId}:`, dbErr);
          }
        }

        return res.json({
          success: true,
          isValid: true,
          playStoreUrl: verifiedPlayStoreUrl,
          packageId: verifiedPkgId,
          message: `تم التحقق بنجاح! الرابط حقيقي وسليم وتم حفظه: ${verifiedPlayStoreUrl}`
        });
      }

      // If not verified or valid link could not be fetched
      return res.json({
        success: false,
        isValid: false,
        message: `الرابط غير سليم أو تعذر العثور على التطبيق "${cleanName}" في متجر جوجل بلاي.`
      });

    } catch (err: any) {
      console.error("[AI Verify Play URL] Error:", err);
      res.status(500).json({ success: false, isValid: false, message: err.message || "حدث خطأ أثناء التحقق بالذكاء الاصطناعي." });
    }
  });
  app.post("/api/admin/regenerate-app-ai", verifyAdminToken, async (req, res) => {
    try {
      const { appId, target } = req.body; // target: "description" | "keywords" | "both"
      if (!appId) {
        return res.status(400).json({ error: "معرف التطبيق مطلوب لتحديثه بـ Firestore" });
      }

      const db = getFirebaseDb();
      if (!db) {
        return res.status(500).json({ error: "تعذر الاتصال بقاعدة بيانات Firestore" });
      }

      const docRef = db.collection("apps").doc(appId);
      const snap = await docRef.get();
      if (!snap.exists) {
        return res.status(404).json({ error: "لم يتم العثور على التطبيق المطلوب في قاعدة البيانات" });
      }

      const appData = snap.data();
      const metadata = {
        name: appData.name,
        developer: appData.developer || "غير محدد",
        category: appData.category || "تطبيقات",
        playStoreUrl: appData.playStoreUrl || "",
        appStoreUrl: appData.appStoreUrl || "",
        rating: appData.rating || 4.5,
        rawDescription: appData.description || ""
      };

      let updatedFields: any = {};

      if (target === "description" || target === "both" || !target) {
        const aiResult = await generateAppReviewAI(metadata);
        updatedFields.description = aiResult.article;
        if (aiResult.tags && aiResult.tags.length > 0) {
          updatedFields.tags = aiResult.tags;
        }
        if (aiResult.category) {
          updatedFields.category = aiResult.category;
        }
      }

      if (target === "keywords") {
        const tags = await generateSEOKeywordsAI({
          name: appData.name,
          developer: appData.developer,
          category: appData.category,
          description: appData.description
        });
        updatedFields.tags = tags;
      }

      await docRef.set(updatedFields, { merge: true });

      res.json({
        success: true,
        message: "تم تحديث البيانات بالذكاء الاصطناعي وحفظها مباشرة في قاعدة البيانات بنجاح! 🎉",
        updatedFields
      });
    } catch (err: any) {
      console.error("Admin Regenerate App AI error:", err);
      res.status(500).json({ error: err.message || "حدث خطأ أثناء إعادة التوليد بـ Firestore" });
    }
  });
  app.post("/api/admin/upgrade-all-apps-ai", verifyAdminToken, async (req, res) => {
    try {
      const db = getFirebaseDb();
      if (!db) {
        return res.status(500).json({ error: "تعذر الاتصال بقاعدة بيانات Firestore" });
      }

      const snapshot = await db.collection("apps").get();
      if (snapshot.empty) {
        return res.json({ success: true, updatedCount: 0, message: "لا توجد تطبيقات للترقية حالياً." });
      }

      let updatedCount = 0;
      const docs = snapshot.docs;

      for (const appDoc of docs) {
        const appData = appDoc.data();
        const metadata = {
          name: appData.name,
          developer: appData.developer || "الشركة المطورة الرسمية",
          category: appData.category || "تطبيقات",
          playStoreUrl: appData.playStoreUrl || "",
          appStoreUrl: appData.appStoreUrl || "",
          rating: appData.rating || 4.5,
          rawDescription: appData.description || ""
        };

        try {
          const aiResult = await generateAppReviewAI(metadata);
          await db.collection("apps").doc(appDoc.id).set({
            description: aiResult.article,
            tags: aiResult.tags || appData.tags || [],
            category: aiResult.category || appData.category || "تطبيقات"
          }, { merge: true });

          updatedCount++;
        } catch (err) {
          console.error(`Failed to bulk upgrade app ${appDoc.id}`, err);
        }
      }

      res.json({
        success: true,
        updatedCount,
        message: `تم ترقية وتطوير ${updatedCount} تطبيقاً بنجاح إلى مراجعات صحفية عميقة (1500+ كلمة) مع الكلمات المفتاحية!`
      });
    } catch (err: any) {
      console.error("Bulk upgrade apps AI error:", err);
      res.status(500).json({ error: err.message || "حدث خطأ أثناء تطوير كافة التطبيقات." });
    }
  });
  app.post("/api/ai/tts", async (req, res) => {
    try {
      const { text, voiceId } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ success: false, message: "نص الرسالة مطلوب" });
      }

      const ttsResult = await generateElevenLabsTTS(text, voiceId);
      res.json(ttsResult);
    } catch (err: any) {
      console.error("TTS endpoint error:", err);
      res.status(500).json({ success: false, exhausted: true, message: err?.message || "خطأ داخلي في توليد الصوت" });
    }
  });
}
