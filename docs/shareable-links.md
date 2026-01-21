# Shareable Report Links

This document describes the implementation of shareable links for UX test reports, allowing users to share their test results publicly without requiring authentication.

## Overview

The shareable links feature enables users to:
- Generate unique, secure URLs for their test reports
- Share reports with stakeholders who don't have accounts
- Enable/disable sharing at any time
- Copy share links to clipboard with one click

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────────────┐       ┌─────────────────────────────┐  │
│  │  Test Detail Pages  │       │    Public Share Pages       │  │
│  │  - Share button     │       │  - /share/batch/[token]     │  │
│  │  - Copy link        │       │  - /share/screenshot/[token]│  │
│  │  - Toggle sharing   │       │  - No auth required         │  │
│  └─────────────────────┘       └─────────────────────────────┘  │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API                                     │
│  ┌─────────────────────┐       ┌─────────────────────────────┐  │
│  │  Share Management   │       │    Public Access Routes     │  │
│  │  (Authenticated)    │       │    (No Auth)                │  │
│  │                     │       │                             │  │
│  │  POST /:id/share    │       │  GET /api/share/batch/:token│  │
│  │  GET /:id/share     │       │  GET /api/share/screenshot/ │  │
│  └─────────────────────┘       │      :token                 │  │
│                                └─────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  batch_test_runs / screenshot_test_runs                     ││
│  │  - share_token (text, unique)                               ││
│  │  - share_enabled (boolean, default: false)                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Columns Added

Both `batch_test_runs` and `screenshot_test_runs` tables have these columns:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `share_token` | `text` | UNIQUE | Cryptographically secure token for public access |
| `share_enabled` | `boolean` | DEFAULT false | Whether the report is currently shared |

### Migration

```sql
-- packages/db/drizzle/0001_add_share_columns.sql
ALTER TABLE "batch_test_runs" ADD COLUMN IF NOT EXISTS "share_token" text UNIQUE;
ALTER TABLE "batch_test_runs" ADD COLUMN IF NOT EXISTS "share_enabled" boolean DEFAULT false;

ALTER TABLE "screenshot_test_runs" ADD COLUMN IF NOT EXISTS "share_token" text UNIQUE;
ALTER TABLE "screenshot_test_runs" ADD COLUMN IF NOT EXISTS "share_enabled" boolean DEFAULT false;
```

## API Endpoints

### Share Management (Authenticated)

#### Enable/Disable Sharing

```
POST /api/batch-tests/:id/share
POST /api/screenshot-tests/:id/share
```

**Request Body:**
```json
{
  "enabled": true  // or false to disable
}
```

**Response:**
```json
{
  "enabled": true,
  "shareToken": "abc123xyz...",
  "shareUrl": "https://yoursite.com/share/batch/abc123xyz...",
  "message": "Sharing enabled"
}
```

**Logic:**
1. Verify user owns the test
2. If enabling and no token exists, generate a new token using `crypto.randomBytes(16).toString("base64url")`
3. Update `share_enabled` and `share_token` in database
4. Return share status with full URL

#### Get Share Status

```
GET /api/batch-tests/:id/share
GET /api/screenshot-tests/:id/share
```

**Response:**
```json
{
  "enabled": true,
  "shareToken": "abc123xyz...",
  "shareUrl": "https://yoursite.com/share/batch/abc123xyz..."
}
```

### Public Access (No Authentication)

#### View Shared Batch Test

```
GET /api/share/batch/:token
```

**Response:** Full test report data (excluding sensitive user info)

**Security Checks:**
- Token must exist in database
- `share_enabled` must be `true`

#### View Shared Screenshot Test

```
GET /api/share/screenshot/:token
```

**Response:** Full screenshot analysis data with presigned S3 URLs

## Token Generation

Tokens are generated using Node.js's crypto module:

```typescript
import crypto from "crypto";

function generateShareToken(): string {
  return crypto.randomBytes(16).toString("base64url");
}
```

This produces:
- 16 bytes of random data
- Encoded as base64url (URL-safe)
- ~22 characters long
- Cryptographically secure
- Example: `n4bQgYhMfWWaL-qgxVrQFg`

## Frontend Components

### Test Detail Pages

Location:
- `/apps/web/src/app/dashboard/tests/[id]/page.tsx` (Batch tests)
- `/apps/web/src/app/dashboard/tests/screenshot/[id]/page.tsx` (Screenshot tests)

**State Management:**
```typescript
const [shareStatus, setShareStatus] = useState<ShareStatus | null>(null);
const [shareLoading, setShareLoading] = useState(false);
const [copied, setCopied] = useState(false);
```

**UI Flow:**
1. On load, fetch current share status
2. If not shared: Show "Share" button
3. If shared: Show green "Copy Link" button + X to disable
4. Clicking "Copy Link" copies URL to clipboard and shows "Copied!" feedback

### Public Share Pages

Location:
- `/apps/web/src/app/share/batch/[token]/page.tsx`
- `/apps/web/src/app/share/screenshot/[token]/page.tsx`

**Features:**
- No authentication required
- Read-only view of report
- "Shared Report" banner at top
- Shows creation date
- Handles errors gracefully (not found, sharing disabled)

## Security Considerations

### What's Protected

1. **Token Security**: Tokens are cryptographically random and unique
2. **Ownership Verification**: Only test owners can enable/disable sharing
3. **Data Filtering**: Public endpoints exclude sensitive user information
4. **Revocable Access**: Owners can disable sharing at any time

### What's Exposed in Public View

- Test results and scores
- Screenshots (via presigned S3 URLs with 1-hour expiry)
- Analysis data
- Persona information (name, age, occupation)
- Timestamps

### What's NOT Exposed

- User ID of test owner
- Internal database IDs
- Email addresses
- Account information

## API Client Functions

### batch-api.ts

```typescript
// Enable sharing
enableBatchTestSharing(id: string): Promise<ShareStatus & { message: string }>

// Disable sharing
disableBatchTestSharing(id: string): Promise<ShareStatus & { message: string }>

// Get current status
getBatchTestShareStatus(id: string): Promise<ShareStatus>
```

### screenshot-api.ts

```typescript
// Enable sharing
enableScreenshotTestSharing(id: string): Promise<ShareStatus & { message: string }>

// Disable sharing
disableScreenshotTestSharing(id: string): Promise<ShareStatus & { message: string }>

// Get current status
getScreenshotTestShareStatus(id: string): Promise<ShareStatus>
```

## File Locations

| Purpose | File Path |
|---------|-----------|
| Schema | `packages/db/src/schema.ts` |
| Migration | `packages/db/drizzle/0001_add_share_columns.sql` |
| Public Route Handler | `apps/api/src/routes/public-share.ts` |
| Batch Test Routes | `apps/api/src/routes/batch-tests.ts` |
| Screenshot Test Routes | `apps/api/src/routes/screenshot-tests.ts` |
| Main API Router | `apps/api/src/index.ts` |
| Batch API Client | `apps/web/src/lib/batch-api.ts` |
| Screenshot API Client | `apps/web/src/lib/screenshot-api.ts` |
| Batch Test Detail Page | `apps/web/src/app/dashboard/tests/[id]/page.tsx` |
| Screenshot Test Detail Page | `apps/web/src/app/dashboard/tests/screenshot/[id]/page.tsx` |
| Public Batch Share Page | `apps/web/src/app/share/batch/[token]/page.tsx` |
| Public Screenshot Share Page | `apps/web/src/app/share/screenshot/[token]/page.tsx` |

## Usage Example

```typescript
// In a React component
import { enableBatchTestSharing } from "@/lib/batch-api";

const handleShare = async () => {
  try {
    const { shareUrl } = await enableBatchTestSharing(testId);
    await navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard!");
  } catch (err) {
    console.error("Failed to share:", err);
  }
};
```

## Environment Variables

The share URL is constructed using:

```typescript
`${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/share/batch/${shareToken}`
```

Ensure `NEXT_PUBLIC_WEB_URL` is set in production to generate correct public URLs.
