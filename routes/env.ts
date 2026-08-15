import express from "express";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import * as core from "../server-core";
import type { KeyItem, EnvConfigData } from "../server-core";

const { safeWorkerFetch, safeParseResponse, app, PORT, resolveActiveGeminiApiKey, resolveActiveOpenAiApiKey, getGeminiSdkClient, sanitizeCategory, fetchAppStoreUrl, normalizePackageId, scrapePlayStore, readDB, writeDB, verifyAdminToken, searchPlayStoreUrl, lookupAppStore, markdownToFormattedHtml, generateExhaustiveFallbackReview, generateAppReviewAI, generateSEOKeywordsAI, handleScrapeAndReview, webDbInstance, getWebFirestoreInstance, getFirebaseDb, discoverNewPlayStorePackages, pullAndReviewApps, analyzeFeatureQueryAI, normalizeText, ARABIC_STOP_WORDS, extractSearchKeywords, fetchiTunesCandidates, handleSearchAndScrape, APPROVED_APPS_FILE, APPS_CACHE_FILE, getApprovedAppsList, getFullAppsCacheList, addAppToApprovedAppsJson, removeAppFromApprovedAppsJson, purgeAllAppsData, generateSmartDiagnosticReport, generateLiveDiagnosticAgentResponse, triggerGithubDeploy, getGoogleAccessTokenFromRefreshToken, submitToGoogleIndexing, DEFAULT_PROQ_GROQ_KEYS, DEFAULT_ELEVENLABS_KEYS, sealGithubSecret, getActiveKeyString, LOCAL_CONFIG_FILE, getSystemEnvConfigFromFs, saveSystemEnvConfigToFs, rotateElevenLabsKeyIfExhausted, switchElevenLabsKeyExplicit, generateElevenLabsTTS, callGroqLlamaChatEngine, callMultimodalVisionAgent, rotateGeminiKeyIfExhausted, rotateGroqKeyIfExhausted, switchGroqKeyExplicit, syncGithubSecretsHelper, runDailyAppsPullIfNeeded, setupDailyAppsCron, ensureGeminiKeysInFirestore, ensureAdminFirebaseInitialized, cleanSlugForSitemap, getLocalAppsCache, updateLocalAppsCache, formatSitemapDate, getIndexedAppPages } = core;

export function registerRoutes(app: express.Express) {
  app.get("/api/env/config", async (req, res) => {
    try {
      const full = req.query.full === "true";
      const config = await getSystemEnvConfigFromFs();

      if (!full) {
        const maskKey = (str: string) => (str && str.length > 8 ? `${str.slice(0, 7)}****${str.slice(-4)}` : "****");
        const maskedConfig: EnvConfigData = {
          ...config,
          geminiKeys: (config.geminiKeys || []).map((k) => ({ ...k, key: maskKey(k.key) })),
          groqKeys: (config.groqKeys || []).map((k) => ({ ...k, key: maskKey(k.key) })),
          elevenlabsKeys: (config.elevenlabsKeys || []).map((k) => ({ ...k, key: maskKey(k.key) })),
          openaiKeys: (config.openaiKeys || []).map((k) => ({ ...k, key: maskKey(k.key) })),
          onesignalAppIds: (config.onesignalAppIds || []).map((k) => ({ ...k, key: maskKey(k.key) })),
          onesignalRestKeys: (config.onesignalRestKeys || []).map((k) => ({ ...k, key: maskKey(k.key) })),
          googleRefreshTokens: (config.googleRefreshTokens || []).map((k) => ({ ...k, key: maskKey(k.key) })),
          githubTokens: (config.githubTokens || []).map((k) => ({ ...k, key: maskKey(k.key) }))
        };
        return res.json({ success: true, config: maskedConfig });
      }

      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "فشل جلب إعدادات المفاتيح" });
    }
  });
  app.post("/api/env/config", verifyAdminToken, async (req, res) => {
    try {
      const configData: EnvConfigData = req.body;
      if (!configData) {
        return res.status(400).json({ success: false, message: "بيانات الإعدادات غير صالحة" });
      }

      const saved = await saveSystemEnvConfigToFs(configData);
      if (!saved) {
        return res.status(500).json({ success: false, message: "فشل حفظ الإعدادات في قاعدة البيانات" });
      }

      let githubSynced = false;
      const ghSyncResult = await syncGithubSecretsHelper(configData);
      if (ghSyncResult.success) {
        githubSynced = true;
      }

      const updatedConfig = await getSystemEnvConfigFromFs();
      res.json({
        success: true,
        message: "تم حفظ الإعدادات بنجاح!",
        githubSynced,
        config: updatedConfig
      });
    } catch (err: any) {
      console.error("Save env config error:", err);
      res.status(500).json({ success: false, message: err.message || "حدث خطأ أثناء حفظ الإعدادات." });
    }
  });
  app.post("/api/env/gemini-status", verifyAdminToken, async (req, res) => {
    try {
      const { keys }: { keys: KeyItem[] } = req.body;
      if (!Array.isArray(keys)) {
        return res.status(400).json({ success: false, message: "مصفوفة المفاتيح مطلوبة" });
      }

      let hasRotated = false;
      const results: KeyItem[] = [];

      for (const item of keys) {
        if (!item.key || !item.key.trim()) {
          results.push({ ...item, status: "invalid", errorMessage: "مفتاح فارغ" });
          continue;
        }

        const startTime = Date.now();
        try {
          const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${item.key.trim()}`);
          const elapsed = Date.now() - startTime;

          if (testRes.ok) {
            results.push({
              ...item,
              status: "active",
              responseTimeMs: elapsed,
              errorMessage: undefined,
              lastChecked: new Date().toISOString()
            });
          } else {
            const status = testRes.status;
            const errData = await safeParseResponse(testRes, {});
            const msg = errData.error?.message || `HTTP ${status}`;

            if (status === 429 || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exceeded")) {
              hasRotated = true;
              results.push({
                ...item,
                status: "exhausted",
                responseTimeMs: elapsed,
                errorMessage: `انتهى الرصيد/الكووتا (429): ${msg}`,
                lastChecked: new Date().toISOString()
              });
            } else if (status === 400 || status === 403) {
              results.push({
                ...item,
                status: "invalid",
                responseTimeMs: elapsed,
                errorMessage: `مفتاح غير صالح أو محظور (${status}): ${msg}`,
                lastChecked: new Date().toISOString()
              });
            } else {
              results.push({
                ...item,
                status: "unknown",
                responseTimeMs: elapsed,
                errorMessage: msg,
                lastChecked: new Date().toISOString()
              });
            }
          }
        } catch (err: any) {
          results.push({
            ...item,
            status: "unknown",
            errorMessage: err.message || "تعذر الاتصال بخادم Gemini API",
            lastChecked: new Date().toISOString()
          });
        }
      }

      const currentConfig = await getSystemEnvConfigFromFs();
      currentConfig.geminiKeys = results;
      await saveSystemEnvConfigToFs(currentConfig);

      res.json({
        success: true,
        results,
        rotated: hasRotated
      });
    } catch (err: any) {
      console.error("Gemini status test error:", err);
      res.status(500).json({ success: false, message: err.message || "خطأ أثناء اختبار مفاتيح Gemini" });
    }
  });
  app.post(["/api/env/groq-status", "/api/env/proq-status", "/api/env/openai-status"], verifyAdminToken, async (req, res) => {
    try {
      const { keys }: { keys: KeyItem[] } = req.body;
      if (!Array.isArray(keys)) {
        return res.status(400).json({ success: false, message: "مصفوفة المفاتيح مطلوبة" });
      }

      let hasRotated = false;
      const results: KeyItem[] = [];

      for (const item of keys) {
        if (!item.key || !item.key.trim()) {
          results.push({ ...item, status: "invalid", errorMessage: "مفتاح فارغ" });
          continue;
        }

        const startTime = Date.now();
        try {
          const testRes = await fetch("https://api.groq.com/openai/v1/models", {
            headers: {
              "Authorization": `Bearer ${item.key.trim()}`
            }
          });

          const elapsed = Date.now() - startTime;

          if (testRes.ok) {
            results.push({
              ...item,
              status: "active",
              responseTimeMs: elapsed,
              errorMessage: undefined,
              lastChecked: new Date().toISOString()
            });
          } else {
            const status = testRes.status;
            const errData = await safeParseResponse(testRes, {});
            const msg = errData.error?.message || `HTTP ${status}`;

            if (status === 429 || msg.includes("quota") || msg.includes("exceeded") || msg.includes("rate_limit")) {
              hasRotated = true;
              results.push({
                ...item,
                status: "exhausted",
                responseTimeMs: elapsed,
                errorMessage: `انتهى الرصيد / حدود الطلبات (429): ${msg}`,
                lastChecked: new Date().toISOString()
              });
            } else if (status === 401 || status === 403) {
              results.push({
                ...item,
                status: "invalid",
                responseTimeMs: elapsed,
                errorMessage: `مفتاح غير صالح أو مرفوض (${status}): ${msg}`,
                lastChecked: new Date().toISOString()
              });
            } else {
              results.push({
                ...item,
                status: "unknown",
                responseTimeMs: elapsed,
                errorMessage: msg,
                lastChecked: new Date().toISOString()
              });
            }
          }
        } catch (err: any) {
          results.push({
            ...item,
            status: "unknown",
            errorMessage: err.message || "تعذر الاتصال بخادم Groq / Proq API",
            lastChecked: new Date().toISOString()
          });
        }
      }

      const currentConfig = await getSystemEnvConfigFromFs();
      currentConfig.groqKeys = results;
      await saveSystemEnvConfigToFs(currentConfig);

      res.json({
        success: true,
        results,
        rotated: hasRotated
      });
    } catch (err: any) {
      console.error("Groq status test error:", err);
      res.status(500).json({ success: false, message: err.message || "خطأ أثناء اختبار مفاتيح Groq/Proq" });
    }
  });
  app.post("/api/env/switch-groq-key", verifyAdminToken, async (req, res) => {
    try {
      const { target_index, reason } = req.body;
      const result = await switchGroqKeyExplicit(target_index ? Number(target_index) : undefined, reason);
      if (result.success) {
        res.json({ success: true, ...result });
      } else {
        res.status(400).json({ success: false, ...result });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "خطأ أثناء التبديل بين مفاتيح Groq API" });
    }
  });
  app.post("/api/env/elevenlabs-status", verifyAdminToken, async (req, res) => {
    try {
      const { keys }: { keys: KeyItem[] } = req.body;
      const targetKeys = Array.isArray(keys) && keys.length > 0 ? keys : DEFAULT_ELEVENLABS_KEYS;

      let hasRotated = false;
      const results: KeyItem[] = [];

      for (let idx = 0; idx < targetKeys.length; idx++) {
        const item = targetKeys[idx];
        if (!item.key || !item.key.trim()) {
          results.push({
            ...item,
            status: "invalid",
            label: item.label || `مفتاح ElevenLabs #${idx + 1}`,
            errorMessage: "مفتاح فارغ"
          });
          continue;
        }

        const startTime = Date.now();
        try {
          const testRes = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
            headers: {
              "xi-api-key": item.key.trim()
            }
          });

          const elapsed = Date.now() - startTime;

          if (testRes.ok) {
            const subData = await testRes.json();
            const charCount = subData?.character_count ?? 0;
            const charLimit = subData?.character_limit ?? 10000;
            const remaining = Math.max(0, charLimit - charCount);
            const tier = subData?.tier || "Free";

            const isExhausted = remaining <= 50;
            if (isExhausted) hasRotated = true;

            results.push({
              ...item,
              status: isExhausted ? "exhausted" : (remaining < 500 ? "low" : "active"),
              responseTimeMs: elapsed,
              label: item.label || `مفتاح ElevenLabs #${idx + 1} (${tier})`,
              remainingQuota: `${remaining.toLocaleString()} / ${charLimit.toLocaleString()} حرف`,
              errorMessage: isExhausted ? "تم استنفاد كوتا الحروف بالكامل" : undefined,
              lastChecked: new Date().toISOString()
            });
          } else {
            const status = testRes.status;
            const errData = await safeParseResponse(testRes, {});
            const msg = errData?.detail?.message || errData?.message || `HTTP ${status}`;

            if (status === 401 || status === 429 || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("character_limit")) {
              hasRotated = true;
              results.push({
                ...item,
                status: "exhausted",
                responseTimeMs: elapsed,
                label: item.label || `مفتاح ElevenLabs #${idx + 1}`,
                errorMessage: `انتهى الرصيد/الكووتا (${status}): ${msg}`,
                lastChecked: new Date().toISOString()
              });
            } else {
              results.push({
                ...item,
                status: "invalid",
                responseTimeMs: elapsed,
                label: item.label || `مفتاح ElevenLabs #${idx + 1}`,
                errorMessage: `مفتاح غير صالح (${status}): ${msg}`,
                lastChecked: new Date().toISOString()
              });
            }
          }
        } catch (err: any) {
          results.push({
            ...item,
            status: "unknown",
            label: item.label || `مفتاح ElevenLabs #${idx + 1}`,
            errorMessage: err.message || "تعذر الاتصال بخادم ElevenLabs API",
            lastChecked: new Date().toISOString()
          });
        }
      }

      const currentConfig = await getSystemEnvConfigFromFs();
      currentConfig.elevenlabsKeys = results;
      await saveSystemEnvConfigToFs(currentConfig);

      res.json({
        success: true,
        results,
        rotated: hasRotated
      });
    } catch (err: any) {
      console.error("ElevenLabs status test error:", err);
      res.status(500).json({ success: false, message: err.message || "خطأ أثناء فحص مفاتيح ElevenLabs" });
    }
  });
  app.post("/api/env/switch-elevenlabs-key", verifyAdminToken, async (req, res) => {
    try {
      const { target_index, reason } = req.body;
      const result = await switchElevenLabsKeyExplicit(target_index ? Number(target_index) : undefined, reason);
      if (result.success) {
        res.json({ success: true, ...result });
      } else {
        res.status(400).json({ success: false, ...result });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "خطأ أثناء التبديل بين مفاتيح ElevenLabs API" });
    }
  });
  app.post("/api/env/github-status", verifyAdminToken, async (req, res) => {
    try {
      const { tokens, repo }: { tokens: KeyItem[]; repo?: string } = req.body;
      const targetTokens = Array.isArray(tokens) && tokens.length > 0
        ? tokens
        : (process.env.GITHUB_TOKEN ? [{ id: "key_gh_env", key: process.env.GITHUB_TOKEN, label: "GitHub PAT Token", status: "active" as const }] : []);

      const results: KeyItem[] = [];

      for (const item of targetTokens) {
        if (!item.key || !item.key.trim()) {
          results.push({ ...item, status: "invalid", errorMessage: "مفتاح GitHub Token فارغ" });
          continue;
        }

        const startTime = Date.now();
        try {
          const ghRes = await fetch("https://api.github.com/user", {
            headers: {
              "Authorization": `Bearer ${item.key.trim()}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "RoohMe-App-Review-Engine"
            }
          });

          const elapsed = Date.now() - startTime;

          if (ghRes.ok) {
            const userData = await ghRes.json();
            results.push({
              ...item,
              status: "active",
              responseTimeMs: elapsed,
              errorMessage: undefined,
              label: item.label || `حساب GitHub: @${userData.login || 'مفتاح موثق'}`,
              lastChecked: new Date().toISOString()
            });
          } else {
            const status = ghRes.status;
            const errData = await safeParseResponse(ghRes, {});
            const msg = errData.message || `HTTP Status ${status}`;

            results.push({
              ...item,
              status: "invalid",
              responseTimeMs: elapsed,
              errorMessage: status === 401 ? "رمز الوصول (GitHub PAT) غير صالح أو انتهت صلاحيته" : `فشل الاتصال بـ GitHub (${status}): ${msg}`,
              lastChecked: new Date().toISOString()
            });
          }
        } catch (err: any) {
          results.push({
            ...item,
            status: "unknown",
            errorMessage: err.message || "تعذر الاتصال بـ GitHub API",
            lastChecked: new Date().toISOString()
          });
        }
      }

      const currentConfig = await getSystemEnvConfigFromFs();
      if (results.length > 0) {
        currentConfig.githubTokens = results;
        await saveSystemEnvConfigToFs(currentConfig);
      }

      res.json({
        success: true,
        results
      });
    } catch (err: any) {
      console.error("GitHub status test error:", err);
      res.status(500).json({ success: false, message: err.message || "خطأ أثناء اختبار توكن GitHub" });
    }
  });
  app.post("/api/env/sync-github", verifyAdminToken, async (req, res) => {
    try {
      const config = await getSystemEnvConfigFromFs();
      if (req.body.githubRepo) config.githubRepo = req.body.githubRepo;
      if (req.body.githubTokens) config.githubTokens = req.body.githubTokens;

      const result = await syncGithubSecretsHelper(config);
      if (result.success) {
        res.json({ success: true, count: result.count, message: "تمت المزامنة بنجاح مع GitHub Secrets!" });
      } else {
        res.status(400).json({ success: false, message: result.message || "فشلت المزامنة مع GitHub" });
      }
    } catch (err: any) {
      console.error("Manual GitHub sync error:", err);
      res.status(500).json({ success: false, message: err.message || "خطأ في المزامنة مع GitHub" });
    }
  });
}
