import express from "express";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import * as core from "../server-core";
import type { KeyItem, EnvConfigData } from "../server-core";

const { safeWorkerFetch, safeParseResponse, app, PORT, resolveActiveGeminiApiKey, resolveActiveOpenAiApiKey, getGeminiSdkClient, sanitizeCategory, fetchAppStoreUrl, normalizePackageId, scrapePlayStore, readDB, writeDB, verifyAdminToken, searchPlayStoreUrl, lookupAppStore, markdownToFormattedHtml, generateExhaustiveFallbackReview, generateAppReviewAI, generateSEOKeywordsAI, handleScrapeAndReview, webDbInstance, getWebFirestoreInstance, getFirebaseDb, discoverNewPlayStorePackages, pullAndReviewApps, analyzeFeatureQueryAI, normalizeText, ARABIC_STOP_WORDS, extractSearchKeywords, fetchiTunesCandidates, handleSearchAndScrape, APPROVED_APPS_FILE, APPS_CACHE_FILE, getApprovedAppsList, getFullAppsCacheList, addAppToApprovedAppsJson, removeAppFromApprovedAppsJson, purgeAllAppsData, generateSmartDiagnosticReport, generateLiveDiagnosticAgentResponse, triggerGithubDeploy, getGoogleAccessTokenFromRefreshToken, submitToGoogleIndexing, DEFAULT_PROQ_GROQ_KEYS, DEFAULT_ELEVENLABS_KEYS, sealGithubSecret, getActiveKeyString, LOCAL_CONFIG_FILE, getSystemEnvConfigFromFs, saveSystemEnvConfigToFs, rotateElevenLabsKeyIfExhausted, switchElevenLabsKeyExplicit, generateElevenLabsTTS, callGroqLlamaChatEngine, callMultimodalVisionAgent, rotateGeminiKeyIfExhausted, rotateGroqKeyIfExhausted, switchGroqKeyExplicit, syncGithubSecretsHelper, runDailyAppsPullIfNeeded, setupDailyAppsCron, ensureGeminiKeysInFirestore, ensureAdminFirebaseInitialized, cleanSlugForSitemap, getLocalAppsCache, updateLocalAppsCache, formatSitemapDate, getIndexedAppPages } = core;

export function registerRoutes(app: express.Express) {
  app.post("/api/developer/verify-pin", async (req, res) => {
    try {
      const { email, pin, resetPin } = req.body;
      if (!email || !pin) {
        return res.status(400).json({ error: 'يرجى كتابة البريد الإلكتروني وكلمة المرور/الرمز السري' });
      }
      const cleanEmail = email.trim().toLowerCase();
      const stringPin = String(pin).trim();

      if (!stringPin) {
        return res.status(400).json({ error: 'كلمة المرور / الرمز السري لا يمكن أن يكون فارغاً' });
      }

      const knownAdmins = ["dodorooh1@gmail.com", "rooh1dodo@gmail.com", "rooh50dodo@gmail.com", "admin@discoverapp.com"];
      if (process.env.ADMIN_EMAIL) {
        knownAdmins.push(process.env.ADMIN_EMAIL.trim().toLowerCase());
      }

      // 1. البحث والتحقق في قاعدة بيانات الفايربيز (Firestore)
      let firestoreUserFound = false;
      let firestorePinMatched = false;
      let firestoreUserData: any = null;

      try {
        const db = getFirebaseDb();
        if (db) {
          const userRef = db.collection('users').doc(cleanEmail);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            firestoreUserFound = true;
            firestoreUserData = userSnap.data();
            const storedPin = firestoreUserData?.pin;
            if (storedPin !== undefined && storedPin !== null && String(storedPin).trim() !== "") {
              if (String(storedPin).trim() === stringPin) {
                firestorePinMatched = true;
              }
            } else if (knownAdmins.includes(cleanEmail) || firestoreUserData?.role === 'admin') {
              // إذا لم يكن الرمز السري معرفاً سابقاً لحساب الأدمن/المطور، نعتمد الرمز المدخل ونحدثه
              firestorePinMatched = true;
              try {
                await userRef.set({ pin: stringPin, role: 'admin', updatedAt: new Date().toISOString() }, { merge: true });
              } catch (e) {}
            }
          }
        }
      } catch (fsErr) {
        console.warn('Backend Firestore pin lookup error:', fsErr);
      }

      // 2. البحث والتحقق في قاعدة البيانات المحلية db.json
      const dbData = readDB();
      const localUserIndex = (dbData.users || []).findIndex((u: any) => (u.emailOrPhone || "").toLowerCase() === cleanEmail);
      const localUser = localUserIndex >= 0 ? dbData.users[localUserIndex] : null;

      // خيار إعادة التعيين الصريح أو التسجيل المباشر للمطور
      if (resetPin) {
        const updatedDevData = {
          ...(firestoreUserData || localUser || {}),
          emailOrPhone: cleanEmail,
          name: firestoreUserData?.name || localUser?.name || 'المطور (Developer)',
          pin: stringPin,
          role: 'admin',
          updatedAt: new Date().toISOString()
        };

        try {
          const db = getFirebaseDb();
          if (db) {
            await db.collection('users').doc(cleanEmail).set(updatedDevData, { merge: true });
          }
        } catch (e) {
          console.warn("Failed to reset pin in Firestore:", e);
        }

        if (localUserIndex >= 0) {
          dbData.users[localUserIndex].pin = stringPin;
          writeDB(dbData);
        } else {
          dbData.users = dbData.users || [];
          dbData.users.push(updatedDevData);
          writeDB(dbData);
        }

        return res.json({ success: true, message: 'تم تحديث كلمة المرور وتسجيل الدخول بنجاح!' });
      }

      // إذا تم العثور على الحساب في الفايربيز
      if (firestoreUserFound) {
        if (firestorePinMatched) {
          return res.json({ success: true, message: 'تم التوثيق بنجاح عبر الفايربيز (Firebase Firestore)' });
        } else {
          return res.status(401).json({ 
            error: 'كلمة المرور / الرمز السري غير مطابقة للرمز المسجل! اضغط على "تحديث كلمة المرور" لاستبدالها بكلمة المرور الجديدة.',
            allowReset: true 
          });
        }
      }

      // إذا تم العثور على الحساب في القاعدة المحلية
      if (localUser) {
        if (localUser.pin !== undefined && String(localUser.pin).trim() === stringPin) {
          try {
            const db = getFirebaseDb();
            if (db) {
              await db.collection('users').doc(cleanEmail).set({
                emailOrPhone: cleanEmail,
                pin: stringPin,
                role: localUser.role || 'admin',
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          } catch (e) {}
          return res.json({ success: true, message: 'تم التوثيق والمزامنة بنجاح مع الفايربيز' });
        } else {
          return res.status(401).json({ 
            error: 'كلمة المرور غير صحيحة! يمكن الضغط على "تحديث كلمة المرور" للبدء بكلمة المرور الجديدة.',
            allowReset: true 
          });
        }
      }

      // 3. إذا لم يوجد الحساب سابقاً: إنشاء وتسجيل حساب المطور مع كلمة المرور المدخلة تلقائياً في الفايربيز
      const initialDevData = {
        emailOrPhone: cleanEmail,
        name: 'المطور (Developer)',
        coins: 150000,
        earnings: 7500.0,
        completedTasks: [],
        completedVideos: [],
        pin: stringPin,
        role: 'admin',
        registeredAt: new Date().toISOString()
      };

      try {
        const db = getFirebaseDb();
        if (db) {
          await db.collection('users').doc(cleanEmail).set(initialDevData, { merge: true });
        }
      } catch (fsErr) {
        console.warn('Failed to save initial developer data to Firestore:', fsErr);
      }

      dbData.users = dbData.users || [];
      dbData.users.push(initialDevData);
      writeDB(dbData);

      return res.json({ success: true, message: 'تم تسجيل حساب المطور وكلمة المرور بنجاح في الفايربيز!' });

    } catch (err) {
      console.error('Error in verify-pin endpoint:', err);
      res.status(500).json({ error: 'حدث خطأ في السيرفر أثناء معالجة تسجيل الدخول' });
    }
  });
}
