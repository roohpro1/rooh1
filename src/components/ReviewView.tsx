import React from "react";
import { Helmet } from "react-helmet-async";
import { AppReview, GlobalSettings } from "../types";
import { AppDetails } from "./AppDetails";

interface ReviewViewProps {
  app: AppReview;
  globalSettings: GlobalSettings;
  onNavigate: (view: "home" | "app" | "admin" | "privacy", id?: string) => void;
  siblingApps?: AppReview[];
  onOpenAppRequestModal?: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  app,
  globalSettings,
  onNavigate,
  siblingApps = []
}) => {
  // Generate SEO dynamic variables
  const cleanSlugPath = (app.cleanSlug || app.slug || app.id)
    .replace(/^\/+|\.html$/gi, '')
    .replace(/-review$/i, '');
  const siteUrl = typeof window !== "undefined" ? (window.location.hostname.includes("rooh") ? "https://roohpro.com" : window.location.origin) : "https://roohpro.com";
  const canonicalUrl = `${siteUrl}/app/${cleanSlugPath}`;

  const seoTitle = app.metaTitle || `${app.name} - مراجعة شاملة وتثبيت آمن | اكتشف تطبيق`;
  const seoDescription = app.metaDescription || (app.description ? app.description.slice(0, 155) : `احصل على مراجعة تفصيلية وشاملة لتطبيق ${app.name} مع روابط التنزيل المباشرة والآمنة 100%.`);
  const appRating = app.rating || 4.8;
  const reviewContent = app.content || app.description || `${app.name} هو تطبيق ممتاز متاح لمستخدمي الهواتف الذكية.`;

  // Keywords string generation
  let keywordsStr = "";
  if (Array.isArray(app.seoKeywords)) {
    keywordsStr = app.seoKeywords.join(", ");
  } else if (typeof app.seoKeywords === "string") {
    keywordsStr = app.seoKeywords;
  } else if (app.tags && app.tags.length > 0) {
    keywordsStr = app.tags.join(", ") + `, تنزيل ${app.name}, مراجعة ${app.name}, تطبيق ${app.name}`;
  } else {
    keywordsStr = `تنزيل ${app.name}, مراجعة ${app.name}, تحميل ${app.name}, تطبيقات مجانية, متجر التطبيقات`;
  }

  // Construct Schema.org JSON-LD (SoftwareApplication + Review + AggregateRating)
  const schemaOrgJSONLD = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${canonicalUrl}#software`,
        "name": app.name,
        "operatingSystem": app.operatingSystem || "ANDROID, IOS",
        "applicationCategory": app.category || "Application",
        "image": app.iconUrl,
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "SAR"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": appRating.toString(),
          "bestRating": "5",
          "worstRating": "1",
          "ratingCount": "1250",
          "reviewCount": "480"
        }
      },
      {
        "@type": "Review",
        "@id": `${canonicalUrl}#review`,
        "itemReviewed": {
          "@type": "SoftwareApplication",
          "name": app.name,
          "image": app.iconUrl
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": appRating.toString(),
          "bestRating": "5",
          "worstRating": "1"
        },
        "name": seoTitle,
        "author": {
          "@type": "Organization",
          "name": app.authorName || "منصة روح - اكتشف تطبيق",
          "url": siteUrl
        },
        "publisher": {
          "@type": "Organization",
          "name": "منصة روح",
          "url": siteUrl
        },
        "reviewBody": reviewContent.replace(/[\r\n]+/g, " ")
      }
    ]
  };

  // Check approval status: published vs pending draft
  const isPublished = app.status === 'published' || app.status === undefined;

  const pageTitle = `${app.name} | منصة روح`;
  const ogImage = app.iconUrl || `https://roohpro.com/assets/images/og-${cleanSlugPath}.jpg`;
  const twitterImage = app.iconUrl || `https://roohpro.com/assets/images/twitter-${cleanSlugPath}.jpg`;

  const ldJsonData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `${app.name} | منصة روح`,
    "description": seoDescription,
    "url": canonicalUrl,
    "publisher": {
      "@type": "Organization",
      "name": "Rooh Platform",
      "logo": {
        "@type": "ImageObject",
        "url": "https://roohpro.com/assets/images/logo.png"
      }
    }
  };

  return (
    <>
      <Helmet>
        {/* وسوم السيو الأساسية */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>{pageTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={keywordsStr} />
        <meta name="robots" content={isPublished ? "index, follow" : "noindex, nofollow"} />

        {/* وسم Canonical لمنع تكرار المحتوى */}
        <link rel="canonical" href={canonicalUrl} />

        {/* وسوم Open Graph لمشاركة الروابط بفاعلية (WhatsApp, Facebook) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Rooh Platform" />

        {/* وسوم Twitter Cards (X) */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={twitterImage} />

        {/* البيانات المنظمة (JSON-LD) المخصصة للصفحة */}
        <script type="application/ld+json">
          {JSON.stringify(ldJsonData)}
        </script>
      </Helmet>

      {/* Render unchanged existing UI view */}
      <AppDetails
        app={app}
        globalSettings={globalSettings}
        onBack={() => onNavigate("home")}
        otherApps={siblingApps}
        onNavigate={onNavigate as any}
        onAboutClick={() => {}}
      />
    </>
  );
};
