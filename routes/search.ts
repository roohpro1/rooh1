import express from "express";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import * as core from "../server-core";
import type { KeyItem, EnvConfigData } from "../server-core";

const { safeWorkerFetch, safeParseResponse, app, PORT, resolveActiveGeminiApiKey, resolveActiveOpenAiApiKey, getGeminiSdkClient, sanitizeCategory, fetchAppStoreUrl, normalizePackageId, scrapePlayStore, readDB, writeDB, verifyAdminToken, searchPlayStoreUrl, lookupAppStore, markdownToFormattedHtml, generateExhaustiveFallbackReview, generateAppReviewAI, generateSEOKeywordsAI, handleScrapeAndReview, webDbInstance, getWebFirestoreInstance, getFirebaseDb, discoverNewPlayStorePackages, pullAndReviewApps, analyzeFeatureQueryAI, normalizeText, ARABIC_STOP_WORDS, extractSearchKeywords, fetchiTunesCandidates, handleSearchAndScrape, APPROVED_APPS_FILE, APPS_CACHE_FILE, getApprovedAppsList, getFullAppsCacheList, addAppToApprovedAppsJson, removeAppFromApprovedAppsJson, purgeAllAppsData, generateSmartDiagnosticReport, generateLiveDiagnosticAgentResponse, triggerGithubDeploy, getGoogleAccessTokenFromRefreshToken, submitToGoogleIndexing, DEFAULT_PROQ_GROQ_KEYS, DEFAULT_ELEVENLABS_KEYS, sealGithubSecret, getActiveKeyString, LOCAL_CONFIG_FILE, getSystemEnvConfigFromFs, saveSystemEnvConfigToFs, rotateElevenLabsKeyIfExhausted, switchElevenLabsKeyExplicit, generateElevenLabsTTS, callGroqLlamaChatEngine, callMultimodalVisionAgent, rotateGeminiKeyIfExhausted, rotateGroqKeyIfExhausted, switchGroqKeyExplicit, syncGithubSecretsHelper, runDailyAppsPullIfNeeded, setupDailyAppsCron, ensureGeminiKeysInFirestore, ensureAdminFirebaseInitialized, cleanSlugForSitemap, getLocalAppsCache, updateLocalAppsCache, formatSitemapDate, getIndexedAppPages } = core;

export function registerRoutes(app: express.Express) {
  app.post("/api/search-candidates", async (req: express.Request, res: express.Response) => {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: "الرجاء إدخال اسم التطبيق أو شرح الميزة للبحث عنها." });
    }

    const cleanQuery = query.trim();
    console.log(`\n=================== [SEARCH CANDIDATES INITIATED] ===================`);
    console.log(`[Search Candidates API] 🔍 Received Query: "${cleanQuery}"`);

    let networkErrorOccurred = false;

    try {
      // Check if query is a direct Play Store link or package ID (e.g., com.whatsapp)
      if (cleanQuery.startsWith("http") || cleanQuery.includes("play.google.com") || cleanQuery.includes("id=")) {
        let pkgId = cleanQuery;
        if (pkgId.includes("id=")) {
          const urlObj = new URL(pkgId.startsWith("http") ? pkgId : `https://${pkgId}`);
          pkgId = urlObj.searchParams.get("id") || "";
        }
        if (pkgId) {
          console.log(`[Search Candidates API] Direct package ID detected: ${pkgId}`);
          const metadata = await scrapePlayStore(pkgId);
          return res.json({
            success: true,
            isFeatureSearch: false,
            candidates: [{
              packageId: metadata.packageId,
              name: metadata.name,
              iconUrl: metadata.iconUrl,
              developer: metadata.developer,
              rating: metadata.rating,
              category: metadata.category,
              playStoreUrl: metadata.playStoreUrl
            }]
          });
        }
      }

      // Step 0: Check Local Cache (data/apps_cache.json) & Firestore FIRST before external store queries
      try {
        const localCacheList = getFullAppsCacheList();
        if (Array.isArray(localCacheList) && localCacheList.length > 0) {
          const qNorm = cleanQuery.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, '');
          const localMatches = localCacheList.filter(app => {
            if (!app) return false;
            const nameNorm = (app.name || "").toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, '');
            const slugNorm = (app.slug || app.cleanSlug || "").toLowerCase();
            const pkgNorm = (app.id || app.packageId || "").toLowerCase();
            const tagsStr = Array.isArray(app.tags) ? app.tags.join(" ").toLowerCase() : "";

            return (
              (nameNorm && (nameNorm.includes(qNorm) || qNorm.includes(nameNorm))) ||
              (slugNorm && (slugNorm === qNorm || slugNorm.includes(qNorm))) ||
              (pkgNorm && (pkgNorm === qNorm || pkgNorm.includes(qNorm))) ||
              (tagsStr && tagsStr.includes(qNorm))
            );
          });

          if (localMatches.length > 0) {
            console.log(`[Search Candidates API] 🎯 Found ${localMatches.length} matching app(s) in local cache for query "${cleanQuery}"`);
            const cachedCandidates = localMatches.slice(0, 8).map(app => ({
              packageId: app.id || app.packageId || app.slug,
              name: app.name,
              iconUrl: app.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.name)}&size=512&background=4f46e5&color=ffffff&bold=true`,
              developer: app.developer || "الشركة المطورة الرسمية",
              rating: app.rating || 4.8,
              category: app.category || "تطبيقات",
              playStoreUrl: app.playStoreUrl || `https://play.google.com/store/apps/details?id=${app.id}`,
              appStoreUrl: app.appStoreUrl || "",
              isLocal: true,
              slug: app.slug || app.cleanSlug
            }));

            return res.json({
              success: true,
              isFeatureSearch: false,
              isLocalMatch: true,
              query: cleanQuery,
              candidates: cachedCandidates
            });
          }
        }
      } catch (cacheLookupErr) {
        console.warn("[Search Candidates API] Local cache lookup notice:", cacheLookupErr);
      }

      // Step 1: AI Analysis to extract recommended app names and keywords
      const featureAiResult = await analyzeFeatureQueryAI(cleanQuery);
      console.log(`[Search Candidates API] 🤖 AI Search Analysis:`, featureAiResult);

      const candidatePackageIds: string[] = [];
      const directCandidates: any[] = [];

      if (featureAiResult.recommendedPackages && featureAiResult.recommendedPackages.length > 0) {
        for (const pId of featureAiResult.recommendedPackages) {
          if (pId && !candidatePackageIds.includes(pId)) {
            candidatePackageIds.push(pId);
          }
        }
      }

      // Build comprehensive search terms list
      const searchTermsToTry: string[] = [cleanQuery];

      if (featureAiResult.recommendedAppNames && featureAiResult.recommendedAppNames.length > 0) {
        for (const appName of featureAiResult.recommendedAppNames) {
          if (appName && !searchTermsToTry.includes(appName)) {
            searchTermsToTry.push(appName);
          }
        }
      }

      if (featureAiResult.searchKeywords && featureAiResult.searchKeywords.length > 0) {
        for (const kw of featureAiResult.searchKeywords) {
          if (kw && !searchTermsToTry.includes(kw)) {
            searchTermsToTry.push(kw);
          }
        }
      }

      const extractedKeywords = extractSearchKeywords(cleanQuery);
      for (const kw of extractedKeywords) {
        if (!searchTermsToTry.includes(kw)) {
          searchTermsToTry.push(kw);
        }
      }

      console.log(`[Search Candidates API] 📋 Search Terms to Execute:`, searchTermsToTry);

      // Step 2: Parallel Search on Google Play HTML Scraper
      await Promise.all(
        searchTermsToTry.slice(0, 4).map(async (searchTerm) => {
          try {
            const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(searchTerm)}&c=apps&hl=ar`;
            console.log(`[Search Candidates API] Querying Play Store: ${searchUrl}`);
            const response = await fetch(searchUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
                "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7"
              }
            });

            if (response.ok) {
              const html = await response.text();
              let countForTerm = 0;
              const matches = [...html.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9_\-\.]+)/g)];
              for (const m of matches) {
                const pId = m[1];
                if (
                  pId.includes(".") &&
                  !pId.startsWith("com.app.") &&
                  !pId.endsWith("-review") &&
                  !["undefined", "null"].includes(pId.toLowerCase()) &&
                  !candidatePackageIds.includes(pId) &&
                  /^[a-zA-Z][a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-\.]+$/.test(pId)
                ) {
                  candidatePackageIds.push(pId);
                  countForTerm++;
                }
              }
              console.log(`[Search Candidates API] Play Store query "${searchTerm}" found ${countForTerm} package IDs`);
            } else {
              console.warn(`[Search Candidates API] Play Store HTTP status ${response.status} for term "${searchTerm}"`);
            }
          } catch (e) {
            console.warn(`[Search Candidates API] Play Store fetch exception for "${searchTerm}":`, e);
            networkErrorOccurred = true;
          }
        })
      );

      // Step 3: Parallel Search on iTunes API (Supports international & Arabic apps)
      await Promise.all(
        searchTermsToTry.slice(0, 4).map(async (searchTerm) => {
          const saItems = await fetchiTunesCandidates(searchTerm, "SA");
          const egItems = await fetchiTunesCandidates(searchTerm, "EG");
          const usItems = await fetchiTunesCandidates(searchTerm, "US");

          for (const item of [...saItems, ...egItems, ...usItems]) {
            if (!directCandidates.some(c => c.packageId.toLowerCase() === item.packageId.toLowerCase() || c.name.toLowerCase() === item.name.toLowerCase())) {
              directCandidates.push(item);
            }
          }
        })
      );

      // Step 4: FALLBACK MECHANISM - If search yielded fewer than 2 candidates, trigger keyword breakdown fallback
      if (candidatePackageIds.length === 0 && directCandidates.length === 0 && extractedKeywords.length > 0) {
        console.log(`[Search Candidates API] ⚠️ Initial search returned 0 apps. Executing Keyword Breakdown Fallback with keywords:`, extractedKeywords);
        for (const kw of extractedKeywords) {
          const fallbackiTunes = await fetchiTunesCandidates(kw, "SA");
          for (const item of fallbackiTunes) {
            if (!directCandidates.some(c => c.packageId.toLowerCase() === item.packageId.toLowerCase() || c.name.toLowerCase() === item.name.toLowerCase())) {
              directCandidates.push(item);
            }
          }

          if (directCandidates.length >= 5) break;
        }
      }

      // Step 5: Gather and scrape metadata for candidate Google Play package IDs
      const topPackageIds = candidatePackageIds.slice(0, 6);
      if (topPackageIds.length === 0 && directCandidates.length === 0) {
        if (/^[a-zA-Z0-9_\-\.]+$/.test(cleanQuery)) {
          topPackageIds.push(cleanQuery);
        }
      }

      let playCandidates: any[] = [];
      if (topPackageIds.length > 0) {
        const candidatesResults = await Promise.allSettled(
          topPackageIds.map(async (pId) => {
            return await scrapePlayStore(pId);
          })
        );

        playCandidates = (await Promise.all(
          candidatesResults
            .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && !!r.value && !!r.value.name)
            .map(async (r) => {
              const pId = r.value.packageId;
              const playUrl = r.value.playStoreUrl || `https://play.google.com/store/apps/details?id=${pId}`;
              let appStoreUrl = "";
              try {
                appStoreUrl = await fetchAppStoreUrl(r.value.name, pId);
              } catch (e) {}

              return {
                packageId: pId,
                name: r.value.name,
                iconUrl: r.value.iconUrl,
                developer: r.value.developer || "غير محدد",
                rating: r.value.rating || 4.5,
                category: r.value.category || "تطبيقات",
                playStoreUrl: playUrl,
                appStoreUrl: appStoreUrl
              };
            })
        ));
      }

      // Merge Play Store candidates and iTunes candidates seamlessly
      const allCandidates: any[] = [];
      for (const item of [...playCandidates, ...directCandidates]) {
        if (!allCandidates.some(c => c.packageId.toLowerCase() === item.packageId.toLowerCase() || c.name.toLowerCase() === item.name.toLowerCase())) {
          allCandidates.push(item);
        }
      }

      console.log(`[Search Candidates API] 📊 Final Candidate Count: ${allCandidates.length}`);

      if (allCandidates.length === 0) {
        if (networkErrorOccurred) {
          console.warn(`[Search Candidates API] Returning 503 NETWORK_ERROR due to store connection failure`);
          return res.status(503).json({
            success: false,
            errorType: "NETWORK_ERROR",
            error: "تعذر الاتصال بالمتجر حالياً، يرجى المحاولة لاحقاً."
          });
        }

        console.warn(`[Search Candidates API] Returning 404 NOT_FOUND`);
        return res.status(404).json({
          success: false,
          errorType: "NOT_FOUND",
          error: "عذراً، لم يتم العثور على تطبيقات مطابقة لاسم البحث في متجر التطبيقات. يُرجى التثبت من صحة اسم التطبيق أو الكلمات المفتاحية وإعادة المحاولة."
        });
      }

      console.log(`[Search Candidates API] ✅ Responding with ${allCandidates.length} candidate apps`);
      res.json({
        success: true,
        isFeatureSearch: featureAiResult.isFeatureSearch,
        query: cleanQuery,
        candidates: allCandidates
      });

    } catch (err: any) {
      console.error("[Search Candidates API] ❌ Unhandled Exception:", err);
      res.status(500).json({
        success: false,
        errorType: "SERVER_ERROR",
        error: "حدث خطأ غير متوقع في الخادم أثناء البحث عن التطبيقات. يُرجى المحاولة لاحقاً."
      });
    }
  });
  app.post("/api/search-and-scrape", handleSearchAndScrape);
}
