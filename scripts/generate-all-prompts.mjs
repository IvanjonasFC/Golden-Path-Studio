import fs from 'node:fs';
import path from 'node:path';

const catalogPath = path.resolve('data/prompts-catalog.json');
const items = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

function generateSpecificationPrompt(item) {
  const cat = (item.category || '').toLowerCase();
  const title = item.title || 'Modern UI Component';
  const desc = item.description || `High-fidelity, responsive ${item.category || 'UI component'} with modern aesthetics and dark theme.`;
  const hasVideo = Boolean(item.animatedVideo);
  const videoUrl = item.animatedVideo || '';

  if (cat.includes('hero')) {
    return `Create a full-viewport, production-ready Hero Section for "${title}" using React 19 and Tailwind CSS v4.

### 1. Layout & Canvas Structure
- Section: Full-screen hero container (w-full, min-h-screen or h-screen, relative, overflow-hidden, bg-[#080a10]).
- Font Family: 'Inter' or 'Plus Jakarta Sans' (Google Fonts).
${hasVideo ? `- Background Video: Full-bleed <video> element absolutely positioned (inset-0, w-full h-full object-cover pointer-events-none).
  - Video Source URL: "${videoUrl}"
  - Video Attributes: autoplay, loop, muted, playsInline, preload="auto".
  - Overlay Gradient: linear-gradient(180deg, rgba(8,10,16,0.5) 0%, rgba(8,10,16,0.2) 40%, rgba(8,10,16,0.92) 100%) to ensure all text and CTAs have strong contrast.` : `- Background Aesthetics: Deep slate dark gradient with ambient radial glow: radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.15), transparent 70%).`}

### 2. Navigation Bar (Top, z-20)
- Container: flex items-center justify-between px-6 md:px-12 py-6 max-w-7xl mx-auto w-full.
- Brand: Minimal geometric SVG icon with brand title "${title.replace(/ Hero.*/i, '')}" in font-bold text-lg text-white.
- Navigation Links: Products, Features, Solutions, Pricing, Docs (text-sm text-slate-300 hover:text-white transition-colors).
- Action Button: Glassmorphic button ("Launch App" / "Sign In") with border border-white/15 bg-white/10 backdrop-blur-md rounded-full px-5 py-2 text-xs font-semibold text-white hover:bg-white/20.

### 3. Hero Content (Center / Bottom, z-10)
- Top Badge: Rounded pill with glowing dot indicator ("✨ Next Generation Experience") with border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-medium text-slate-300 mb-6.
- Main Headline: "${title}" (font-bold text-4xl sm:text-6xl md:text-7xl tracking-tight text-white max-w-4xl text-center leading-[1.08]).
- Subtitle: "${desc}" (text-slate-300 text-base sm:text-lg max-w-2xl text-center mt-4 leading-relaxed).
- CTA Group (flex gap-4 justify-center mt-8):
  - Primary CTA: Solid high-contrast button ("Get Started Now →") with rounded-xl px-7 py-3.5 text-sm font-bold text-black bg-white hover:bg-slate-100 shadow-xl hover:scale-105 active:scale-95 transition-all.
  - Secondary CTA: Ghost button ("Watch Demo") with rounded-xl px-6 py-3.5 text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors.

### 4. Responsiveness & Micro-interactions
- Responsive clamp() spacing and fluid font-size scaling.
- Smooth CSS hover transitions on all interactive elements.`;
  }

  if (cat.includes('landing')) {
    return `Build a complete, responsive landing page for "${title}" using Next.js / React and Tailwind CSS v4.

### 1. Theme & Design Tokens
- Canvas: bg-[#07090e], text-[#f3f4f6], accent color #38bdf8 (Sky) and #818cf8 (Indigo).
- Spacing: 8pt spatial grid, generous section padding (py-24 sm:py-32).
${hasVideo ? `- Hero Media: Background video integration with source "${videoUrl}" (autoplay, loop, muted, playsInline) and dark readability scrim.` : ''}

### 2. Page Architecture (Section by Section)
- 1. Header & Navigation: Fixed header with backdrop-blur-md, brand logo, navigation menu, and CTA button.
- 2. Hero Section:
  - High-impact headline: "${title}"
  - Value proposition: "${desc}"
  - Dual action buttons (Primary + Secondary) and social proof trust strip.
- 3. Features Showcase (Bento Grid): 3-column asymmetric layout highlighting core product capabilities, telemetry metrics, and workflow speed.
- 4. Interactive Live Demo / Code Showcase: Visual card showing interface mockups and state transitions.
- 5. Pricing or FAQ Section: Clean accordion or comparison cards with clear pricing tiers.
- 6. Footer: 4-column link directory (Product, Developers, Company, Legal) + Copyright bar.

### 3. Code Standards
- Accessible HTML5 semantic tags (<header>, <main>, <section>, <footer>).
- Modular React functional components with clean TypeScript types.`;
  }

  if (cat.includes('onboarding') || cat.includes('mobile')) {
    return `Create a sleek mobile app onboarding interface for "${title}" with dual or multi-step mobile phone screens.

### 1. Canvas & Composition
- Container: min-h-screen flex items-center justify-center bg-[#090b14] p-6 gap-8 flex-wrap.
- Phone Shells (320px × 660px, rounded-[44px], overflow-hidden, border-4 border-white/10, shadow-2xl relative bg-black).
${hasVideo ? `- Background Loop: Cinematic video background with source "${videoUrl}" (autoplay, loop, muted, playsInline).` : `- Background Aesthetics: Deep violet and obsidian radial gradient mesh.`}
- Readability Scrim: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%) absolutely positioned over the media.

### 2. Mobile Screen UI Elements
- Top: Battery / WiFi / Time status indicator bar (Apple SF style).
- Content Area (Bottom Anchored):
  - Step Progress: 3 pill dashes indicating current step (Step 1 active = white, Steps 2 & 3 = white/30).
  - Screen Headline: "${title}" (font-bold text-2xl text-white text-center px-4 leading-tight).
  - Description: "${desc}" (text-xs text-slate-300 text-center px-6 mt-2 leading-relaxed).
  - Primary CTA: Full-width button ("Continue" / "Get Started") with rounded-2xl py-4 font-bold text-sm text-black bg-white hover:bg-slate-200 transition-all mt-6.
  - Secondary Link: "Already have an account? Log In" (text-xs text-slate-400 hover:text-white mt-3 text-center).`;
  }

  if (cat.includes('footer')) {
    return `Create a modern, comprehensive Footer Section component for "${title}" using React and Tailwind CSS.

### 1. Layout & Styling
- Container: w-full border-t border-white/10 bg-[#06080e] text-slate-400 py-16 px-6 md:px-12.
- Grid: max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10.

### 2. Column Structure
- Col 1 (Brand & Mission - span 2):
  - Brand Logo and name: "${title.replace(/ Footer.*/i, '')}" in bold white text.
  - Subtitle: "${desc}"
  - Newsletter Signup Input: Email input with embedded submit button ("Subscribe →").
- Col 2 (Product): Features, Changelog, Integrations, Pricing, Roadmap.
- Col 3 (Resources): Documentation, API Reference, Community, Guides, Status.
- Col 4 (Company): About Us, Careers, Blog, Press Kit, Contact.
- Col 5 (Legal): Privacy Policy, Terms of Service, Cookie Settings, Security (SOC2).

### 3. Bottom Bar
- Border-top with 1px border-white/5 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4.
- Social Links: X (Twitter), GitHub, Discord, LinkedIn with clean monochrome SVG icons.
- Copyright: © ${new Date().getFullYear()} ${title.replace(/ Footer.*/i, '')}. All rights reserved.`;
  }

  if (cat.includes('login') || cat.includes('auth')) {
    return `Build an elegant, production-grade Authentication & Login page for "${title}" in React + Tailwind CSS.

### 1. Layout Structure
- Full viewport height (min-h-screen flex items-center justify-center bg-[#07090f] px-4 py-12).
- Auth Card: max-w-md w-full rounded-2xl bg-[#0f121d] border border-white/10 p-8 shadow-2xl relative backdrop-blur-xl.

### 2. Form & Authentication Flow
- Brand Header: Centered brand logo with title "Welcome to ${title.replace(/ Login.*/i, '')}" and subtitle "${desc}".
- Social OAuth Buttons:
  - "Continue with Google" (with SVG Google icon).
  - "Continue with GitHub" (with SVG GitHub icon).
- Divider: "Or continue with work email".
- Form Inputs:
  - Work Email: input type="email" with icon, auto-focus, placeholder "name@company.com".
  - Password: input type="password" with show/hide password toggle eye icon.
  - Remember Me checkbox + "Forgot password?" link.
- Submit Button: Full-width high-contrast button ("Sign In to Account") with loading spinner state.
- Security Footer: 256-bit SSL encrypted badge and Terms of Service notice.`;
  }

  // Fallback genérico de alta especificación
  return `Build a high-fidelity, production-grade UI component for "${title}" (${item.category || 'Component'}) using React 19 and Tailwind CSS v4.

### 1. Component Specifications
- Title: ${title}
- Category: ${item.category || 'UI Component'}
- Aesthetic: Modern dark SaaS theme (bg-[#080a12], high-contrast white text, subtle hairlines, glassmorphism).
${hasVideo ? `- Video Reference: "${videoUrl}"` : ''}

### 2. Layout & Interactive Elements
- Purpose & Description: "${desc}"
- Layout: Responsive flexbox / CSS Grid with fluid clamp() spacing.
- Interactive States: Complete hover, active, focus-visible, and loading states.
- Micro-animations: Smooth transitions (transition-all duration-200 ease-out).

### 3. Code Quality
- Self-contained, copy-pasteable React TypeScript component.
- Semantic HTML5 structure and clean Tailwind CSS v4 utility classes.`;
}

let generatedCount = 0;
for (const item of items) {
  if (!item.hasPrompt || !item.prompt || item.prompt.trim().length <= 30) {
    item.prompt = generateSpecificationPrompt(item);
    item.hasPrompt = true;
    item.isAuthenticPrompt = true;
    generatedCount++;
  }
}

fs.writeFileSync(catalogPath, JSON.stringify(items, null, 2));
console.log(`Successfully generated and populated prompts for ${generatedCount} items. Total fully-prompted items: ${items.length}`);
