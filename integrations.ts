import express from "express";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import * as core from "../server-core";
import type { KeyItem, EnvConfigData } from "../server-core";

const { safeWorkerFetch, safeParseResponse, app, PORT, resolveActiveGeminiApiKey, resolveActiveOpenAiApiKey, getGeminiSdkClient, sanitizeCategory, fetchAppStoreUrl, normalizePackageId, scrapePlayStore, readDB, writeDB, verifyAdminToken, searchPlayStoreUrl, lookupAppStore, markdownToFormattedHtml, generateExhaustiveFallbackReview, generateAppReviewAI, generateSEOKeywordsAI, handleScrapeAndReview, webDbInstance, getWebFirestoreInstance, getFirebaseDb, discoverNewPlayStorePackages, pullAndReviewApps, analyzeFeatureQueryAI, normalizeText, ARABIC_STOP_WORDS, extractSearchKeywords, fetchiTunesCandidates, handleSearchAndScrape, APPROVED_APPS_FILE, APPS_CACHE_FILE, getApprovedAppsList, getFullAppsCacheList, addAppToApprovedAppsJson, removeAppFromApprovedAppsJson, purgeAllAppsData, generateSmartDiagnosticReport, generateLiveDiagnosticAgentResponse, triggerGithubDeploy, getGoogleAccessTokenFromRefreshToken, submitToGoogleIndexing, DEFAULT_PROQ_GROQ_KEYS, DEFAULT_ELEVENLABS_KEYS, sealGithubSecret, getActiveKeyString, LOCAL_CONFIG_FILE, getSystemEnvConfigFromFs, saveSystemEnvConfigToFs, rotateElevenLabsKeyIfExhausted, switchElevenLabsKeyExplicit, generateElevenLabsTTS, callGroqLlamaChatEngine, callMultimodalVisionAgent, rotateGeminiKeyIfExhausted, rotateGroqKeyIfExhausted, switchGroqKeyExplicit, syncGithubSecretsHelper, runDailyAppsPullIfNeeded, setupDailyAppsCron, ensureGeminiKeysInFirestore, ensureAdminFirebaseInitialized, cleanSlugForSitemap, getLocalAppsCache, updateLocalAppsCache, formatSitemapDate, getIndexedAppPages } = core;

export function registerRoutes(app: express.Express) {
  app.post("/api/onesignal/send", verifyAdminToken, async (req, res) => {
    const { title, message, url } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "العنوان ومحتوى الإشعار مطلوبان" });
    }

    let appId = process.env.ONESIGNAL_APP_ID;
    let apiKey = process.env.ONESIGNAL_REST_API_KEY;

    // Try reading from Firestore settings/global dynamically!
    try {
      const db = getFirebaseDb();
      if (db) {
        const settingsDoc = await db.collection("settings").doc("global").get();
        if (settingsDoc.exists) {
          const data = settingsDoc.data();
          if (data) {
            if (data.oneSignalAppId) appId = data.oneSignalAppId;
            if (data.oneSignalRestKey) apiKey = data.oneSignalRestKey;
          }
        }
      }
    } catch (e) {
      console.error("Error reading OneSignal keys from Firestore", e);
    }

    if (!appId || !apiKey) {
      console.log("OneSignal credentials are not configured. Simulating notification push:", { title, message, url });
      return res.json({
        success: true,
        simulated: true,
        message: "تمت محاكاة إرسال الإشعار بنجاح! يرجى تكوين معلمات OneSignal (معرّف التطبيق ومفتاح الوصول البرمجي) في إعدادات لوحة التحكم لتفعيل الإرسال الحقيقي للمشتركين."
      });
    }

    try {
      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Basic ${apiKey}`
        },
        body: JSON.stringify({
          app_id: appId,
          included_segments: ["All"],
          contents: { en: message, ar: message },
          headings: { en: title, ar: title },
          url: url || undefined
        })
      });

      const data = await safeParseResponse(response, {});
      if (!response.ok) {
        throw new Error(data.errors?.[0] || "فشل إرسال الإشعار عبر OneSignal API.");
      }

      res.json({
        success: true,
        data
      });
    } catch (err: any) {
      console.error("OneSignal push error:", err);
      res.status(500).json({ error: err.message || "حدث خطأ غير متوقع أثناء إرسال الإشعار عبر OneSignal." });
    }
  });
  app.post("/api/indexing/publish", async (req, res) => {
    try {
      const { url, slug, appId, title, name, source } = req.body;
      if (!url && !slug && !appId) {
        return res.status(400).json({ error: "الرابط (url) أو slug أو appId مطلوب لتمريره لـ Google Indexing API" });
      }

      const rawSlug = slug || appId || (url ? url.replace(/^https?:\/\/[^\/]+\//, '') : '');
      const cleanSlug = String(rawSlug).toLowerCase().replace(/^\/+|\.html$/gi, '').trim();

      if (cleanSlug) {
        addAppToApprovedAppsJson({
          id: appId || `manual_${cleanSlug}`,
          name: title || name || cleanSlug,
          slug: cleanSlug,
          cleanSlug: cleanSlug,
          url: url || `https://roohpro.com/app/${cleanSlug}`,
          isApproved: true,
          status: "published",
          source: source || "يدوي من لوحة التحكم"
        });
      }

      const result = await submitToGoogleIndexing({ url: url || `https://roohpro.com/app/${cleanSlug}`, slug: cleanSlug, appId });
      res.json({
        ...result,
        cleanSlug,
        url: url || `https://roohpro.com/app/${cleanSlug}`,
        addedToApprovedApps: true
      });
    } catch (err: any) {
      console.error("API Indexing publish endpoint error:", err);
      res.status(500).json({ success: false, error: err.message || "حدث خطأ أثناء أرشفة الرابط." });
    }
  });
  app.post("/api/admin/trigger-deploy-and-index", verifyAdminToken, async (req, res) => {
    try {
      const { appId, slug, url, title, name } = req.body;
      const siteUrl = process.env.SITE_URL || "https://roohpro.com";
      const rawSlug = slug || appId || (url ? url.replace(/^https?:\/\/[^\/]+\//, '') : '');
      const cleanSlug = String(rawSlug).toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
      const targetUrl = url || `${siteUrl}/${cleanSlug}`;

      if (cleanSlug) {
        addAppToApprovedAppsJson({
          id: appId || `app_${cleanSlug}`,
          name: title || name || cleanSlug,
          slug: cleanSlug,
          cleanSlug: cleanSlug,
          url: targetUrl,
          isApproved: true,
          status: "published"
        });
      }

      const [ghResult, googleResult] = await Promise.all([
        triggerGithubDeploy({ appId, slug: cleanSlug, url: targetUrl }),
        submitToGoogleIndexing(targetUrl)
      ]);

      res.json({
        success: true,
        github: ghResult,
        googleIndexing: googleResult,
        targetUrl,
        cleanSlug,
        message: "تم تنفيذ عملية الأرشفة الفورية وتنبيه GitHub Actions و Google Indexing API بنجاح! 🚀"
      });
    } catch (err: any) {
      console.error("Trigger deploy and index error:", err);
      res.status(500).json({ success: false, error: err.message || "فشل تنبيه السيرفر بالأرشفة." });
    }
  });
}
