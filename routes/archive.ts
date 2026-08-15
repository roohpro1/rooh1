import express from "express";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import * as core from "../server-core";
import type { KeyItem, EnvConfigData } from "../server-core";

const { safeWorkerFetch, safeParseResponse, app, PORT, resolveActiveGeminiApiKey, resolveActiveOpenAiApiKey, getGeminiSdkClient, sanitizeCategory, fetchAppStoreUrl, normalizePackageId, scrapePlayStore, readDB, writeDB, verifyAdminToken, searchPlayStoreUrl, lookupAppStore, markdownToFormattedHtml, generateExhaustiveFallbackReview, generateAppReviewAI, generateSEOKeywordsAI, handleScrapeAndReview, webDbInstance, getWebFirestoreInstance, getFirebaseDb, discoverNewPlayStorePackages, pullAndReviewApps, analyzeFeatureQueryAI, normalizeText, ARABIC_STOP_WORDS, extractSearchKeywords, fetchiTunesCandidates, handleSearchAndScrape, APPROVED_APPS_FILE, APPS_CACHE_FILE, getApprovedAppsList, getFullAppsCacheList, addAppToApprovedAppsJson, removeAppFromApprovedAppsJson, purgeAllAppsData, generateSmartDiagnosticReport, generateLiveDiagnosticAgentResponse, triggerGithubDeploy, getGoogleAccessTokenFromRefreshToken, submitToGoogleIndexing, DEFAULT_PROQ_GROQ_KEYS, DEFAULT_ELEVENLABS_KEYS, sealGithubSecret, getActiveKeyString, LOCAL_CONFIG_FILE, getSystemEnvConfigFromFs, saveSystemEnvConfigToFs, rotateElevenLabsKeyIfExhausted, switchElevenLabsKeyExplicit, generateElevenLabsTTS, callGroqLlamaChatEngine, callMultimodalVisionAgent, rotateGeminiKeyIfExhausted, rotateGroqKeyIfExhausted, switchGroqKeyExplicit, syncGithubSecretsHelper, runDailyAppsPullIfNeeded, setupDailyAppsCron, ensureGeminiKeysInFirestore, ensureAdminFirebaseInitialized, cleanSlugForSitemap, getLocalAppsCache, updateLocalAppsCache, formatSitemapDate, getIndexedAppPages } = core;

export function registerRoutes(app: express.Express) {
  app.get("/ads.txt", async (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
  
    // Since we run in Cloud Run container and we want ads.txt to be editable via Firebase settings,
    // we try to dynamically read the settings document from Firestore or return a default/fallback.
    // We can load firebase config and fetch from firestore.
    try {
      const db = getFirebaseDb();
      if (db) {
        const settingsDoc = await db.collection("settings").doc("global").get();
        if (settingsDoc.exists) {
          const data = settingsDoc.data();
          if (data && data.adsTxtContent) {
            return res.send(data.adsTxtContent);
          }
        }
      }
    } catch (e) {
      console.error("Error reading ads.txt from Firestore", e);
    }

    // Fallback default ads.txt content
    res.send("# AdSense ads.txt Configuration\n# Please add your publisher ID inside the admin dashboard to generate your ads.txt dynamically\n");
  });
  app.get(['/api/archive/list', '/api/archive'], (req, res) => {
    try {
      const list = getApprovedAppsList() || [];
      const siteUrl = process.env.SITE_URL || "https://roohpro.com";
      const mapped = list.map((item: any) => {
        const cat = item.category || "app";
        const key = item.keyword || item.cleanSlug || item.slug || item.id;
        return {
          id: item.id || key,
          url: item.url || `${siteUrl}/${cat}/${key}`,
          title: item.name || item.title || key,
          keyword: key,
          category: cat,
          source_portal: item.sourcePortal || "portal-1",
          created_at: item.updatedAt || new Date().toISOString()
        };
      });
      return res.json({ success: true, count: mapped.length, links: mapped });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || "خطأ في جلب الأرشيف" });
    }
  });
}
