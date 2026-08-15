import express from "express";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import * as core from "../server-core";
import type { KeyItem, EnvConfigData } from "../server-core";

const { safeWorkerFetch, safeParseResponse, app, PORT, resolveActiveGeminiApiKey, resolveActiveOpenAiApiKey, getGeminiSdkClient, sanitizeCategory, fetchAppStoreUrl, normalizePackageId, scrapePlayStore, readDB, writeDB, verifyAdminToken, searchPlayStoreUrl, lookupAppStore, markdownToFormattedHtml, generateExhaustiveFallbackReview, generateAppReviewAI, generateSEOKeywordsAI, handleScrapeAndReview, webDbInstance, getWebFirestoreInstance, getFirebaseDb, discoverNewPlayStorePackages, pullAndReviewApps, analyzeFeatureQueryAI, normalizeText, ARABIC_STOP_WORDS, extractSearchKeywords, fetchiTunesCandidates, handleSearchAndScrape, APPROVED_APPS_FILE, APPS_CACHE_FILE, getApprovedAppsList, getFullAppsCacheList, addAppToApprovedAppsJson, removeAppFromApprovedAppsJson, purgeAllAppsData, generateSmartDiagnosticReport, generateLiveDiagnosticAgentResponse, triggerGithubDeploy, getGoogleAccessTokenFromRefreshToken, submitToGoogleIndexing, DEFAULT_PROQ_GROQ_KEYS, DEFAULT_ELEVENLABS_KEYS, sealGithubSecret, getActiveKeyString, LOCAL_CONFIG_FILE, getSystemEnvConfigFromFs, saveSystemEnvConfigToFs, rotateElevenLabsKeyIfExhausted, switchElevenLabsKeyExplicit, generateElevenLabsTTS, callGroqLlamaChatEngine, callMultimodalVisionAgent, rotateGeminiKeyIfExhausted, rotateGroqKeyIfExhausted, switchGroqKeyExplicit, syncGithubSecretsHelper, runDailyAppsPullIfNeeded, setupDailyAppsCron, ensureGeminiKeysInFirestore, ensureAdminFirebaseInitialized, cleanSlugForSitemap, getLocalAppsCache, updateLocalAppsCache, formatSitemapDate, getIndexedAppPages } = core;

export function registerRoutes(app: express.Express) {
  app.get(['/approved-apps.json', '/api/approved-apps'], async (req, res) => {
    try {
      let list = getApprovedAppsList();
      if (!list || list.length === 0) {
        try {
          const r2Res = await fetch("https://roohpro.com/approved-apps.json");
          if (r2Res.ok) {
            const r2Data = await r2Res.json();
            if (Array.isArray(r2Data) && r2Data.length > 0) {
              list = r2Data;
              const dir = path.dirname(APPROVED_APPS_FILE);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(APPROVED_APPS_FILE, JSON.stringify(list, null, 2), "utf-8");
            }
          }
        } catch (e) {}
      }
      res.header("Content-Type", "application/json; charset=utf-8");
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(list || []);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to fetch approved apps" });
    }
  });
  app.get(['/data/apps_cache.json', '/apps_cache.json', '/api/apps_cache'], async (req, res) => {
    try {
      let list = getFullAppsCacheList();
      if (!list || list.length === 0) {
        try {
          const r2Res = await fetch("https://roohpro.com/data/apps_cache.json");
          if (r2Res.ok) {
            const r2Data = await r2Res.json();
            if (Array.isArray(r2Data) && r2Data.length > 0) {
              list = r2Data;
            }
          }
        } catch (e) {}
      }
      res.header("Content-Type", "application/json; charset=utf-8");
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(list || []);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to fetch apps cache" });
    }
  });
  app.post("/api/admin/purge-all-apps", async (req, res) => {
    try {
      const result = await purgeAllAppsData();
      res.json(result);
    } catch (err: any) {
      console.error("Error during purge endpoint call:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to purge apps" });
    }
  });
  app.post("/api/admin/approve-app", async (req, res) => {
    const { appId } = req.body;
    if (!appId) {
      return res.status(400).json({ error: "Missing appId parameter." });
    }

    try {
      const db = getFirebaseDb();
      let appData: any = null;

      if (db) {
        const docRef = db.collection("apps").doc(appId);
        const snap = await docRef.get();
        if (snap.exists) {
          appData = snap.data();
          await docRef.update({
            status: "published",
            isApproved: true,
            updatedAt: new Date().toISOString()
          });
        }
      }

      if (!appData) {
        appData = { id: appId, name: appId, slug: appId };
      }

      appData.status = "published";
      appData.isApproved = true;

      // Register in approved-apps.json for lightweight R2 & Sitemap reads
      addAppToApprovedAppsJson(appData);

      const cleanSlug = (appData.slug || appId).replace(/^\/+|\.html$/gi, '');
      submitToGoogleIndexing({ slug: cleanSlug, id: appId, name: appData.name || appId })
        .catch(err => console.warn("[Google Indexing API auto-trigger warning]", err));

      res.json({
        success: true,
        message: "تم اعتماد ونشر التطبيق بنجاح وتسجيله في قائمة approved-apps.json وخريطة الموقع!",
        cleanSlug,
        url: `https://roohpro.com/app/${cleanSlug}`
      });
    } catch (err: any) {
      console.error("Error approving app:", err);
      res.status(500).json({ error: err?.message || "Failed to approve app." });
    }
  });
  app.post("/api/admin/delete-app", async (req, res) => {
    const { appId, slug } = req.body;
    if (!appId && !slug) {
      return res.status(400).json({ error: "Missing appId or slug parameter." });
    }

    const targetId = appId ? String(appId).trim() : "";
    const targetSlug = slug ? String(slug).toLowerCase().replace(/^\/+|\.html$/gi, '').trim() : targetId;

    try {
      ensureAdminFirebaseInitialized();
      const db = getFirebaseDb();

      // 1. Delete document from Firestore 'apps' collection
      if (db) {
        if (targetId) {
          try { await db.collection("apps").doc(targetId).delete(); } catch (e) {}
        }
        if (targetSlug) {
          const snap = await db.collection("apps").where("slug", "==", targetSlug).get().catch(() => null);
          if (snap && !snap.empty) {
            for (const docSnap of snap.docs) {
              try { if (docSnap.ref?.delete) await docSnap.ref.delete(); else if (webDbInstance) await deleteDoc(docSnap.ref); } catch (e) {}
            }
          }
        }

        // 2. Delete document from Firestore 'indexed_urls' collection (page indexing)
        if (targetId) {
          try { await db.collection("indexed_urls").doc(`idx_appr_${targetId}`).delete(); } catch (e) {}
        }
        if (targetSlug) {
          const idxSnap = await db.collection("indexed_urls").where("slug", "==", targetSlug).get().catch(() => null);
          if (idxSnap && !idxSnap.empty) {
            for (const docSnap of idxSnap.docs) {
              try { if (docSnap.ref?.delete) await docSnap.ref.delete(); else if (webDbInstance) await deleteDoc(docSnap.ref); } catch (e) {}
            }
          }
        }

        // 3. Delete from 'search_logs' or 'user_searches' collection if any
        const searchLogsSnap = await db.collection("search_logs").get().catch(() => null);
        if (searchLogsSnap && !searchLogsSnap.empty) {
          for (const docSnap of searchLogsSnap.docs) {
            const d = docSnap.data();
            if (d.appId === targetId || d.slug === targetSlug || d.cleanSlug === targetSlug) {
              try { if (docSnap.ref?.delete) await docSnap.ref.delete(); else if (webDbInstance) await deleteDoc(docSnap.ref); } catch (e) {}
            }
          }
        }
      }

      // 4. Remove from server db.json if exists
      const dbData = readDB() as any;
      if (dbData && Array.isArray(dbData.apps)) {
        dbData.apps = dbData.apps.filter((a: any) => {
          const aId = String(a.id || '').trim();
          const aSlug = String(a.slug || a.cleanSlug || '').toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
          return aId !== targetId && aSlug !== targetSlug;
        });
        writeDB(dbData);
      }

      // 5. Remove from approved-apps.json, apps_cache.json, and Cloudflare R2 files
      removeAppFromApprovedAppsJson(targetId || targetSlug, targetSlug);

      res.json({
        success: true,
        message: "تم حذف التطبيق وجميع مراجعاته وروابطه وملفاته كلياً من جميع المصادر بنجاح!",
        appId: targetId,
        slug: targetSlug
      });
    } catch (err: any) {
      console.error("Error in delete-app endpoint:", err);
      res.status(500).json({ error: err?.message || "Failed to delete application." });
    }
  });
  app.post("/api/admin/sync-all-published-apps", verifyAdminToken, async (req: express.Request, res: express.Response) => {
    try {
      const result = await syncAllPublishedAppsToArchive();
      res.json({
        success: true,
        message: `تمت مزامنة وأرشفة كافة التطبيقات المنشورة (${result.syncedCount} تطبيق) وتنظيف الروابط اليتيمة بنجاح!`,
        ...result
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "حدث خطأ أثناء مزامنة التطبيقات المنشورة" });
    }
  });
  app.get("/api/cron/pull-10-apps", async (req, res) => {
    try {
      const results = await pullAndReviewApps(10);
      res.json({ success: true, message: "Daily cron app pull executed successfully", ...results });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || err });
    }
  });
  app.post("/api/admin/pull-10-apps", verifyAdminToken, async (req, res) => {
    try {
      const results = await pullAndReviewApps(10);
      res.json({ success: true, message: "تم سحب مراجعات 10 تطبيقات بنجاح وحفظها كـ 'تحت المراجعة'!", ...results });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "حدث خطأ أثناء سحب الـ 10 تطبيقات." });
    }
  });
  app.post("/api/admin/clean-sync-urls", verifyAdminToken, async (req: express.Request, res: express.Response) => {
    try {
      ensureAdminFirebaseInitialized();
      const db = getFirebaseDb();
      if (!db) {
        return res.status(500).json({ error: "تعذر الاتصال بقاعدة بيانات الفايربيز" });
      }

      const snapshot = await db.collection("apps").get();
      if (snapshot.empty) {
        return res.json({ success: true, updatedCount: 0, message: "لا توجد تطبيقات مسجلة في قاعدة البيانات حالياً." });
      }

      let updatedCount = 0;
      const batch = db.batch();

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const rawSlug = String(data.slug || docSnap.id || "").trim();
        const cleanSlug = rawSlug.split('?')[0].split('#')[0].replace(/\.html$/i, "").trim() || docSnap.id;
      
        const cleanArticleUrl = `https://roohpro.com/app/${cleanSlug}`;
        const r2FileKey = `${cleanSlug}.html`;
        const r2Url = `https://roohpro.com/${r2FileKey}`;

        if (
          data.slug !== cleanSlug ||
          data.articleUrl !== cleanArticleUrl ||
          data.r2FileKey !== r2FileKey ||
          data.r2Url !== r2Url
        ) {
          batch.update(docSnap.ref, {
            slug: cleanSlug,
            articleUrl: cleanArticleUrl,
            r2FileKey: r2FileKey,
            r2Url: r2Url,
            updatedAt: new Date()
          });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
      }

      console.log(`[Clean & Sync URLs API] ✅ Processed ${snapshot.size} documents, updated ${updatedCount} documents with clean short URLs.`);

      res.json({
        success: true,
        totalApps: snapshot.size,
        updatedCount,
        message: `تمت مزامنة وتنظيف الروابط بنجاح! 🎉\nتمت معالجة ${snapshot.size} تطبيق، وتحديث ${updatedCount} تطبيق بالروابط القصيرة والنظيفة (https://roohpro.com/clean-slug) في الفايربيز.`
      });
    } catch (err: any) {
      console.error("[Clean & Sync URLs API Error]:", err);
      res.status(500).json({ error: err.message || "فشلت عملية مزامنة وتنظيف الروابط." });
    }
  });
  app.post(['/api/archive/push', '/api/admin/approve-app'], async (req, res) => {
    try {
      const { keyword, category, title, sourcePortal, appId, slug, name } = req.body || {};
      const rawKey = keyword || slug || appId || "";
      const cleanKey = cleanSlugForSitemap(rawKey || "app");
      const cleanCat = (category || "app").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
      const cleanTitle = title || name || cleanKey;
      const portal = sourcePortal || "portal-1";
      const siteUrl = process.env.SITE_URL || "https://roohpro.com";
    
      // Construct unified domain canonical URL: https://roohpro.com/${category}/${keyword}
      const finalUrl = `${siteUrl}/${cleanCat}/${cleanKey}`;

      // Update approved-apps.json on disk if present
      try {
        const approvedPath = path.join(process.cwd(), "public", "approved-apps.json");
        let list: any[] = [];
        if (fs.existsSync(approvedPath)) {
          list = JSON.parse(fs.readFileSync(approvedPath, "utf-8"));
        }
        const updatedItem = {
          id: appId || cleanKey,
          name: cleanTitle,
          slug: cleanKey,
          cleanSlug: cleanKey,
          keyword: cleanKey,
          category: cleanCat,
          sourcePortal: portal,
          url: finalUrl,
          isApproved: true,
          status: "published",
          updatedAt: new Date().toISOString()
        };
        const newList = [updatedItem, ...list.filter((a: any) => (a.slug || a.cleanSlug || a.keyword) !== cleanKey)];
        fs.writeFileSync(approvedPath, JSON.stringify(newList, null, 2), "utf-8");
      } catch (fsErr) {
        console.warn("Local approved-apps.json update notice:", fsErr);
      }

      return res.json({
        success: true,
        url: finalUrl,
        keyword: cleanKey,
        category: cleanCat,
        title: cleanTitle,
        sourcePortal: portal,
        message: "تمت الأرشفة بالنمط الموحد للدومين"
      });
    } catch (err: any) {
      console.error("Archive push error:", err);
      return res.status(500).json({ success: false, message: err?.message || "خطأ في استقبال الأرشفة" });
    }
  });
}
