# Testing Analytics Guide

## Quick Start - Test Analytics Locally

### Method 1: Browser Console (Easiest)

1. **Start the app in dev mode**:
   ```bash
   npm run dev
   ```

2. **Open Developer Tools**:
   - Press `Cmd+Option+I` (Mac) or `F12` (Windows/Linux)
   - Go to the Console tab

3. **Look for analytics events**:
   - You'll see `[PostHog]` debug messages for every event
   - Example output:
     ```
     [Analytics] Initialized with key: phc_develo...
     [PostHog] Tracking: session_start
     [PostHog] Tracking: $pageview { $current_url: 'dashboard' }
     ```

4. **Trigger some events**:
   - Navigate between pages (Dashboard → Knowledge Hub → Memory)
   - Create a knowledge base
   - Upload a document
   - Run a search query
   - Watch the console for tracking events

---

## Method 2: Use PostHog Dashboard (See Real Data)

### Option A: Create Free PostHog Account

1. **Sign up** at https://app.posthog.com (free tier available)

2. **Get your API key**:
   - After signup, go to Project Settings
   - Copy your Project API Key (starts with `phc_`)

3. **Update .env file**:
   ```env
   VITE_POSTHOG_KEY=phc_your_actual_key_here
   VITE_POSTHOG_HOST=https://app.posthog.com
   VITE_ENABLE_ANALYTICS_DEV=true
   ```

4. **Restart the app**:
   ```bash
   npm run dev
   ```

5. **View events in PostHog**:
   - Go to https://app.posthog.com/events
   - You'll see events appear in real-time (may take ~30 seconds)
   - Click on any event to see its properties

### Option B: Use PostHog Cloud (US Region)

If you already have a PostHog Cloud account:
```env
VITE_POSTHOG_KEY=your_project_key
VITE_POSTHOG_HOST=https://us.posthog.com
VITE_ENABLE_ANALYTICS_DEV=true
```

---

## Method 3: Mock Testing (No PostHog Account Needed)

If you just want to test that events are being called correctly without sending data:

1. **Add console logging** to verify events:
   - Already implemented! Just check the browser console
   - Every `analytics.track()` call will be logged

2. **Test specific features**:

   **Knowledge Base Events:**
   ```
   - Create KB → Check for: analytics.trackKnowledgeBase('created', ...)
   - Upload docs → Check for: analytics.trackDocument('uploaded', ...)
   - Delete KB → Check for: analytics.trackKnowledgeBase('deleted', ...)
   ```

   **Search Events:**
   ```
   - Run RAG query → Check for: analytics.trackSearch(query, resultCount, 'rag_query')
   ```

   **Navigation Events:**
   ```
   - Click any nav icon → Check for: analytics.trackPageView(pageName)
   ```

   **Prompt Events:**
   ```
   - Create prompt → Check for: analytics.trackPrompt('created', ...)
   - Execute prompt → Check for: analytics.trackPrompt('used', ...)
   ```

---

## Verify Analytics Integration

### Checklist of Events to Test:

- [ ] **Session Tracking**
  - [ ] `session_start` (on app launch)
  - [ ] `session_end` (on app close)

- [ ] **Navigation**
  - [ ] `$pageview` with `dashboard`
  - [ ] `$pageview` with `knowledge`
  - [ ] `$pageview` with `memory`
  - [ ] `$pageview` with `symbols`

- [ ] **Knowledge Base**
  - [ ] `knowledge_base` with action: `created`
  - [ ] `knowledge_base` with action: `opened`
  - [ ] `knowledge_base` with action: `deleted`

- [ ] **Documents**
  - [ ] `document` with action: `uploaded`
  - [ ] `document` with action: `viewed`
  - [ ] `document` with action: `deleted`
  - [ ] `search` (from RAG queries)

- [ ] **Specs & Prompts**
  - [ ] `spec` events (created, edited, deleted)
  - [ ] `prompt` events (created, used, edited)

- [ ] **Memory**
  - [ ] `memory` with action: `viewed`
  - [ ] `memory` with action: `searched`

- [ ] **Symbol Graph**
  - [ ] `symbol_graph` with action: `opened`
  - [ ] `symbol_graph` with action: `analyzed`

- [ ] **Errors**
  - [ ] `error` events when things fail

---

## Example: Testing a Complete Flow

1. Start app → Look for `session_start` event
2. Click Dashboard → Look for `$pageview: dashboard`
3. Click Knowledge Hub → Look for `$pageview: knowledge`
4. Create new KB → Look for `knowledge_base` with action `created`
5. Upload a document → Look for `document` with action `uploaded`
6. Search for something → Look for `search` event
7. Close app → Look for `session_end` with duration

---

## Production Setup

When ready for production:

1. **Get production PostHog key**
2. **Update .env** (or use environment variables):
   ```env
   VITE_POSTHOG_KEY=phc_your_production_key
   VITE_POSTHOG_HOST=https://app.posthog.com
   # Remove or set to false:
   VITE_ENABLE_ANALYTICS_DEV=false
   ```

3. **Analytics will auto-enable in production builds**:
   ```bash
   npm run build
   npm start
   ```

---

## Troubleshooting

### "No events showing up"
- Check browser console for `[Analytics] Initialized` message
- Verify `VITE_ENABLE_ANALYTICS_DEV=true` in .env
- Make sure you restarted the dev server after changing .env

### "Analytics Disabled" in console
- Check that `.env` file exists
- Verify `VITE_ENABLE_ANALYTICS_DEV=true`
- Restart dev server: `npm run dev`

### "Events in console but not in PostHog dashboard"
- Events can take 30-60 seconds to appear
- Check your API key is correct
- Verify you're looking at the right project in PostHog

### "CORS errors"
- This shouldn't happen with PostHog Cloud
- If using self-hosted PostHog, check CORS settings

---

## Privacy Considerations

The analytics implementation is privacy-focused:
- ✅ No autocapture (only manual events)
- ✅ No session recording
- ✅ No pageview autocapture
- ✅ Only tracks feature usage, not user data
- ✅ Can be completely disabled by not setting API key

---

## Advanced: Custom Event Properties

You can add custom properties to any event:

```typescript
analytics.trackKnowledgeBase('created', kbId, {
  documentCount: 10,
  customProperty: 'value',
  tags: ['tag1', 'tag2']
})
```

All properties will show up in PostHog event details!
