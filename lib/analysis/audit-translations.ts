import type { LighthouseCategory } from "./constants";

export interface AuditTranslation {
  title: string;
  description: string;
  recommendation: string;
}

/**
 * Maps common Lighthouse audit IDs to operator-friendly language.
 */
export const AUDIT_TRANSLATIONS: Record<string, AuditTranslation> = {
  "first-contentful-paint": {
    title: "Slow initial load",
    description:
      "Visitors wait too long before any content appears on screen.",
    recommendation:
      "Optimize server response time, reduce render-blocking resources, and improve caching.",
  },
  "largest-contentful-paint": {
    title: "Main content loads slowly",
    description:
      "The primary visible content takes too long to display, hurting first impressions.",
    recommendation:
      "Compress hero images, preload key assets, and improve hosting performance.",
  },
  "total-blocking-time": {
    title: "Page feels unresponsive",
    description:
      "JavaScript blocks the main thread, making the site feel sluggish after load.",
    recommendation:
      "Split large scripts, defer non-critical JS, and reduce third-party scripts.",
  },
  "cumulative-layout-shift": {
    title: "Content jumps while loading",
    description:
      "Layout shifts frustrate users and can cause mis-clicks on buttons and links.",
    recommendation:
      "Set explicit dimensions on images and ads; reserve space for dynamic content.",
  },
  "speed-index": {
    title: "Visual progress is slow",
    description: "The page appears to load slowly even if some metrics are acceptable.",
    recommendation:
      "Prioritize above-the-fold content and streamline critical rendering path.",
  },
  "interactive": {
    title: "Delayed interactivity",
    description: "Users cannot reliably tap or click elements soon after the page loads.",
    recommendation:
      "Reduce JavaScript execution time and eliminate long tasks on the main thread.",
  },
  "color-contrast": {
    title: "Hard-to-read text",
    description:
      "Text contrast is insufficient for many users, including those with low vision.",
    recommendation:
      "Increase contrast between text and background to meet WCAG guidelines.",
  },
  "image-alt": {
    title: "Images missing descriptions",
    description:
      "Screen reader users miss context when images lack alternative text.",
    recommendation: "Add concise, descriptive alt text to all meaningful images.",
  },
  "label": {
    title: "Form fields lack labels",
    description:
      "Users may not understand what information belongs in each form field.",
    recommendation:
      "Associate visible labels with every input, select, and textarea.",
  },
  "link-name": {
    title: "Unclear link text",
    description:
      'Links like "click here" do not explain destination or purpose.',
    recommendation: "Use descriptive link text that stands alone out of context.",
  },
  "document-title": {
    title: "Missing or weak page title",
    description:
      "Browser tabs and search results rely on a clear, unique page title.",
    recommendation:
      "Add a descriptive <title> tag that reflects the page content.",
  },
  "meta-description": {
    title: "Missing meta description",
    description:
      "Search engines may generate snippets instead of using your intended summary.",
    recommendation:
      "Write a unique meta description (150–160 characters) for each key page.",
  },
  "http-status-code": {
    title: "Page returns errors",
    description: "The server responded with a non-success status for this URL.",
    recommendation:
      "Fix broken pages, redirects, and server errors so the site returns HTTP 200.",
  },
  "is-crawlable": {
    title: "Page may block search engines",
    description:
      "Robots directives or headers could prevent indexing of important content.",
    recommendation:
      "Review robots.txt and meta robots tags; allow indexing of public pages.",
  },
  "canonical": {
    title: "Canonical URL issues",
    description:
      "Search engines may split ranking signals across duplicate URLs.",
    recommendation:
      "Add a correct rel=canonical link pointing to the preferred URL.",
  },
  "uses-https": {
    title: "Not fully secured with HTTPS",
    description:
      "Visitors and browsers expect encrypted connections for trust and SEO.",
    recommendation:
      "Serve all pages over HTTPS with a valid TLS certificate.",
  },
  "is-on-https": {
    title: "Insecure content detected",
    description: "Some resources load over HTTP on an HTTPS page.",
    recommendation: "Update all asset URLs to HTTPS and fix mixed content.",
  },
  "errors-in-console": {
    title: "JavaScript errors in browser",
    description:
      "Console errors can break features and signal poor quality to visitors.",
    recommendation:
      "Fix reported JS errors and test critical flows in production.",
  },
  "inspector-issues": {
    title: "Browser compatibility issues",
    description: "DevTools reported problems that may affect user experience.",
    recommendation:
      "Address flagged issues in Chrome DevTools Issues panel.",
  },


"server-response-time": {
  title: "Slow server response",
  description:
    "The server is taking too long to respond, delaying everything else on the page.",
  recommendation:
    "Upgrade hosting, enable caching, or optimise your server-side code to respond faster.",
},
"network-dependency-tree": {
  title: "Too many network requests",
  description:
    "The page relies on a long chain of requests before it can fully load.",
  recommendation:
    "Reduce third-party scripts, combine files where possible, and load non-critical resources after the page loads.",
},
"largest-contentful-paint-element": {
  title: "Main content loads too slowly",
  description:
    "The most important visible element takes too long to appear for visitors.",
  recommendation:
    "Optimise and preload your hero image or main content block to appear faster.",
},
"render-blocking-resources": {
  title: "Resources blocking page load",
  description:
    "CSS or JavaScript files are preventing the page from displaying quickly.",
  recommendation:
    "Defer non-critical scripts and inline essential CSS to unblock rendering.",
},
"unused-javascript": {
  title: "Unused JavaScript slowing the page",
  description:
    "JavaScript that is never used is still being downloaded by every visitor.",
  recommendation:
    "Remove unused code, split bundles, and load scripts only when needed.",
},
"unused-css-rules": {
  title: "Unused CSS bloating the page",
  description:
    "Stylesheets contain rules that are never applied, wasting bandwidth.",
  recommendation:
    "Purge unused CSS using a tool like PurgeCSS or review manually.",
},
"uses-optimized-images": {
  title: "Images not fully optimised",
  description:
    "Some images are larger than necessary, slowing down page load.",
  recommendation:
    "Compress and resize images to their display size before uploading.",
},
"uses-responsive-images": {
  title: "Images not sized for device",
  description:
    "Visitors on mobile are downloading desktop-sized images unnecessarily.",
  recommendation:
    "Serve appropriately sized images using srcset or a responsive image solution.",
},
"efficient-animated-content": {
  title: "Animated images wasting bandwidth",
  description:
    "GIFs and large animations consume significantly more data than video formats.",
  recommendation:
    "Replace GIF animations with MP4 or WebM video for better performance.",
},


};

export const CATEGORY_SUMMARIES: Record<
  LighthouseCategory,
  { strong: string; moderate: string; weak: string }
> = {
  performance: {
    strong:
      "The site loads quickly, giving visitors a smooth first experience.",
    moderate:
      "Load times are acceptable but could be improved to reduce bounce risk.",
    weak:
      "Slow loading likely hurts conversions and frustrates mobile visitors.",
  },
  accessibility: {
    strong:
      "The site is broadly accessible to users with disabilities.",
    moderate:
      "Some accessibility gaps may exclude portions of your audience.",
    weak:
      "Significant barriers exist for users relying on assistive technology.",
  },
  seo: {
    strong:
      "The page is well structured for search engine discovery.",
    moderate:
      "SEO fundamentals are partially in place; competitors may outrank you.",
    weak:
      "Search visibility is at risk due to missing or weak SEO signals.",
  },
  "best-practices": {
    strong:
      "The site follows modern security and development best practices.",
    moderate:
      "Some technical issues could affect trust, security, or reliability.",
    weak:
      "Critical best-practice failures may undermine trust and performance.",
  },
};
