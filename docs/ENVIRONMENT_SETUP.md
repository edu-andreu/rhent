# Environment Configuration

## Overview

The application now uses environment variables for configuration instead of hardcoded values. This allows for easier deployment across different environments (development, staging, production).

---

## Setup

### 1. Create `.env` file

Copy the example file:
```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` and set the following variables:

```env
# Required
VITE_SUPABASE_PROJECT_ID=your-project-id-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional (has defaults)
VITE_SUPABASE_EDGE_FUNCTION_SLUG=make-server-918f1e54
VITE_ENV=development
```

### 3. Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → Extract project ID (the subdomain part)
   - **anon/public key** → Use as `VITE_SUPABASE_ANON_KEY`

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID | `iclkknwhafsluomwtcxp` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_EDGE_FUNCTION_SLUG` | Edge function slug | `make-server-918f1e54` |
| `VITE_SUPABASE_URL` | Full Supabase URL | Constructed from project ID |
| `VITE_ENV` | Environment name | `development` |

---

## Usage in Code

### Import Configuration

```typescript
import { supabaseConfig, buildFunctionUrl, buildStorageUrl } from "../shared/config/env";

// Access project ID
const projectId = supabaseConfig.projectId;

// Access public key
const anonKey = supabaseConfig.publicAnonKey;

// Build function URL
const url = buildFunctionUrl("payment-methods");
// Returns: https://{projectId}.supabase.co/functions/v1/{slug}/payment-methods

// Build storage URL
const imageUrl = buildStorageUrl("photos", "image.jpg");
// Returns: https://{projectId}.supabase.co/storage/v1/object/public/photos/image.jpg
```

### Application Config

```typescript
import { appConfig } from "../shared/config/env";

// Check debug mode
if (appConfig.isDebugMode()) {
  // Debug code
}

// Check environment
if (appConfig.isProduction()) {
  // Production-only code
}
```

---

## Backward Compatibility

The old `src/utils/supabase/info.tsx` file is still available for backward compatibility, but all new code should use `src/shared/config/env.ts`.

The environment configuration system falls back to hardcoded values if environment variables are not set, ensuring the application continues to work during migration.

---

## Security Notes

⚠️ **Important:**
- Never commit `.env` files to version control
- `.env.example` is safe to commit (contains no secrets)
- Use different keys for different environments
- Rotate keys regularly
- Use service role keys only on the server side (never in client code)

---

## Migration Status

✅ **Completed:**
- Created `src/shared/config/env.ts`
- Updated API client to use env config
- Updated all components with hardcoded URLs
- Created `.env.example` template

🔄 **In Progress:**
- Migrating remaining direct fetch calls to use API client

---

## Troubleshooting

### Environment Variables Not Loading

1. **Check file location**: `.env` must be in the project root
2. **Check variable prefix**: Must start with `VITE_` for Vite projects
3. **Restart dev server**: Changes require a restart
4. **Check spelling**: Variable names are case-sensitive

### Fallback Values Being Used

If environment variables are not set, the system will use hardcoded fallback values. Check:
1. `.env` file exists and is in the correct location
2. Variables are prefixed with `VITE_`
3. Dev server was restarted after creating `.env`

---

## Next Steps

1. Set up environment variables for your deployment environment
2. Update CI/CD pipelines to inject environment variables
3. Consider using Supabase's environment variable management for production
