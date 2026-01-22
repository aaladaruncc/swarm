# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your Next.js application. The integration includes:

- **PostHog Provider**: Updated with reverse proxy configuration, exception capture, and debug mode for development
- **Reverse Proxy**: Added Next.js rewrites to proxy PostHog requests through `/ingest` to avoid ad blockers
- **Server-side Client**: Created `posthog-server.ts` for server-side event tracking
- **User Identification**: Automatic user identification on sign-up and sign-in events
- **Event Tracking**: Comprehensive tracking across authentication, testing, and landing page interactions
- **Error Tracking**: Integrated exception capture via ErrorBoundary and PostHog's `capture_exceptions` feature

## Events Instrumented

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `user_signed_up` | User successfully creates a new account | `src/app/login/page.tsx` |
| `user_signed_in` | User successfully logs into their account | `src/app/login/page.tsx` |
| `test_created` | User starts a new batch test simulation | `src/app/dashboard/tests/new/page.tsx` |
| `personas_generated` | AI personas are generated for a test run | `src/app/dashboard/tests/new/page.tsx` |
| `screenshot_test_started` | User starts a screenshot-based static analysis test | `src/app/dashboard/tests/new/page.tsx` |
| `swarm_created` | User creates and saves a new persona swarm | `src/app/dashboard/swarms/new/page.tsx` |
| `test_terminated` | User manually terminates a running test | `src/app/dashboard/tests/[id]/page.tsx` |
| `report_exported` | User exports a test report as PDF | `src/app/dashboard/tests/[id]/page.tsx` |
| `test_shared` | User enables sharing for a completed test | `src/app/dashboard/tests/[id]/page.tsx` |
| `share_link_copied` | User copies the share link to clipboard | `src/app/dashboard/tests/[id]/page.tsx` |
| `cta_clicked` | User clicks a call-to-action button on the landing page | `src/components/landing/hero.tsx` |
| `pricing_plan_clicked` | User clicks on a pricing plan | `src/components/landing/pricing.tsx` |
| `error_boundary_triggered` | React error boundary catches an unhandled error | `src/components/ErrorBoundary.tsx` |

## Files Modified

| File | Changes |
|------|---------|
| `.env.local` | Added PostHog API key and host |
| `next.config.js` | Added reverse proxy rewrites for PostHog |
| `src/components/PostHogProvider.tsx` | Updated with reverse proxy, exception capture, debug mode |
| `src/lib/posthog-server.ts` | **New** - Server-side PostHog client |
| `src/app/login/page.tsx` | Added user identification and sign-up/sign-in events |
| `src/app/dashboard/tests/new/page.tsx` | Added test creation and persona generation events |
| `src/app/dashboard/swarms/new/page.tsx` | Added swarm creation event |
| `src/app/dashboard/tests/[id]/page.tsx` | Added terminate, export, share events |
| `src/components/landing/hero.tsx` | Added CTA click tracking |
| `src/components/landing/pricing.tsx` | Added pricing plan click tracking |
| `src/components/ErrorBoundary.tsx` | Added PostHog exception capture |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/295740/dashboard/1111260) - Main dashboard with all key metrics

### Insights
- [User Sign-ups & Sign-ins Trend](https://us.posthog.com/project/295740/insights/JFLEzzx4) - Track user registration and authentication over time
- [Test Creation Funnel](https://us.posthog.com/project/295740/insights/OOAgERHN) - Conversion funnel from persona generation to test creation
- [Landing Page CTA Performance](https://us.posthog.com/project/295740/insights/bQ7sLiOH) - Track hero and pricing CTA clicks
- [Test Engagement & Sharing](https://us.posthog.com/project/295740/insights/MJwWJzXb) - Monitor PDF exports, sharing, and terminations
- [Error Tracking](https://us.posthog.com/project/295740/insights/pN4tMnw9) - Monitor application errors

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

The skill includes:
- Reference documentation for Next.js App Router integration
- User identification patterns
- Example code for common PostHog patterns
