# DataLens AI — Autonomous AI Data Analyst Platform

> **Tagline:** Turn data into decisions.  
> **Architecture:** Deterministic Analytics & ML Engine + Generative AI Reasoning (Gemini) + Multi-Tier Persistence (Cloud Firestore, Server Runtime Storage, Local Cache).

DataLens AI is an autonomous AI data analyst platform designed to transform raw tabular datasets (CSV, TSV, XLSX) into actionable insights, interactive statistical visualizations, predictive machine learning models, and executive analyst reports. It bridges the gap between natural language reasoning and deterministic mathematical computation by separating analytical calculations from LLM interpretation.

---

## Table of Contents

1. [Architectural Principles](#architectural-principles)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Key Capabilities & Features](#key-capabilities--features)
5. [AI Analyst & Function Calling Architecture](#ai-analyst--function-calling-architecture)
6. [Deterministic Analytics Engine](#deterministic-analytics-engine)
7. [Deterministic Machine Learning Engine](#deterministic-machine-learning-engine)
8. [What-If Scenario Simulation](#what-if-scenario-simulation)
9. [Automated Executive Reports](#automated-executive-reports)
10. [Data Ingestion & Profiling](#data-ingestion--profiling)
11. [Multi-Tier Data Persistence Strategy](#multi-tier-data-persistence-strategy)
12. [Security & Access Control Model](#security--access-control-model)
13. [API Reference](#api-reference)
14. [Project Structure](#project-structure)
15. [Environment Variables & Setup](#environment-variables--setup)
16. [Testing & Verification](#testing--verification)

---

## Architectural Principles

DataLens AI adheres strictly to the rule: **"Deterministic software for deterministic work; Generative AI for reasoning, intent detection, and synthesis."**

```
┌────────────────────────────────────────────────────────┐
│                   User Question / Prompt               │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│           Gemini Model (Reasoning & Intent)            │
│  - Understands analytical intent from user inquiry     │
│  - Selects and orchestrates validated tool calls       │
└──────────────────────────┬─────────────────────────────┘
                           │ Validated Tool Call Arguments
                           ▼
┌────────────────────────────────────────────────────────┐
│     Deterministic Analytics & ML Computation Engine     │
│  - Descriptive statistics (Mean, Median, StdDev, IQR)  │
│  - Pearson / Spearman correlation matrices             │
│  - Outlier detection (Tukey IQR / Z-Score)             │
│  - Regression & Classification algorithms (R², F1)     │
│  - What-If baseline vs. scenario delta math            │
└──────────────────────────┬─────────────────────────────┘
                           │ Computed Numerical Evidence
                           ▼
┌────────────────────────────────────────────────────────┐
│              Gemini Executive Synthesis                │
│  - Formulates structured answers backed by evidence    │
│  - Explains methodology & analytical caveats           │
│  - Generates interactive chart specifications          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│      Clean UI Presentation (Answer, Evidence, Charts)  │
└────────────────────────────────────────────────────────┘
```

1. **Deterministic Computation for Numerical Results:** Numerical values (aggregations, statistics, correlations, model metrics, scenario deltas) are computed directly by deterministic algorithms rather than asking the LLM to perform arithmetic.
2. **Untrusted Input Handling:** User-uploaded files, query inputs, and model outputs are validated, sanitized, and bounded before processing.
3. **Graceful Degradation:** If the Gemini API encounters rate limits (HTTP 429) or is temporarily unavailable, the system automatically activates a deterministic fallback engine that executes user queries and returns structured findings.

---

## System Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                           Client (React 19)                           │
│  - React Router v7 SPA with Protected & Public Route Guards           │
│  - Modular UI components (Tailwind CSS v4, Lucide icons, Recharts v3) │
│  - Reactive AuthContext with Firebase Authentication state            │
│  - Client-side offline cache (localStorage fallback)                  │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │ HTTP / REST (Bearer JWT Auth)
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    Full-Stack Server (Node.js / Express)              │
│  - Port 3000 unified backend (Vite middleware in dev, static in prod) │
│  - Firebase ID Token parsing & expiry verification                    │
│  - Owner-based access control on dataset and analysis routes          │
│  - Rate Limiter (Per-user buckets + Global Gemini 429 Cooldown)       │
│  - Multi-Step AI Orchestrator with 16 Validated Tool Declarations     │
│  - Deterministic Math & ML Computation Subsystems                     │
│  - Server-side runtime disk storage (`data/datasets/`, `data/analyses`)│
└─────────────────┬───────────────────────────────────┬─────────────────┘
                  │                                   │
                  ▼                                   ▼
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│     Cloud Firestore Database     │ │         Google Gemini API        │
│  - `users/{uid}` profiles        │ │  - Configurable via GEMINI_MODEL │
│  - `datasets/{id}` metadata      │ │  - Multi-step tool calling loop  │
│  - `analyses/{id}` records       │ │  - Grounded system instructions  │
│  - `reports/{id}` documents      │ │  - Automatic quota cooldown      │
└──────────────────────────────────┘ └──────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework:** React 19 (`^19.0.1`) with TypeScript Strict Mode
- **Bundler & Dev Server:** Vite 6 (`^6.2.3`)
- **Routing:** React Router v7 (`^7.18.3`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite` `^4.1.14`), Lucide React icons (`^0.546.0`)
- **Visualizations:** Recharts v3 (`^3.10.1`) for Bar, Line, Scatter, Histogram, and Matrix views
- **Document Rendering:** React-Markdown (`^10.1.0`)

### Backend
- **Runtime:** Node.js 22 (`@types/node` `^22.14.0`)
- **Execution:** TypeScript via `tsx` in development, `esbuild` bundled CommonJS in production
- **Web Server:** Express 4 (`^4.21.2`)
- **File Ingestion:** Multer (`^2.3.0`), PapaParse (`^5.7.0`), SheetJS / xlsx (`^0.18.5`)
- **Authentication Handling:** Server-side Firebase ID token payload decoding, claim validation (`uid`), and timestamp expiry verification

### AI & Machine Learning
- **SDK:** `@google/genai` (`^2.4.0`)
- **AI Model:** Configurable via `GEMINI_MODEL` (defaults to `gemini-3.8-flash` in code or `gemini-3.5-flash` in environment)
- **Deterministic Math Engine:** Descriptive statistics, Pearson and Spearman correlation, Tukey IQR and Z-Score outlier detection, grouped aggregations, date resampling
- **Deterministic ML Engine:** Linear Regression, Ridge/L2, Logistic Regression, Decision Trees, Random Forest Regressor/Classifier, Gradient Boosting Regressor/Classifier, train/test splitting, MAE, RMSE, R², Accuracy, Precision, Recall, F1-Score, Confusion Matrix, Feature Importance

### Persistence & Storage
- **Authentication:** Firebase Authentication (Email/Password, Google Sign-In, Password Reset)
- **Cloud Database:** Cloud Firestore with user-isolated security rules
- **Server Runtime Storage:** Local file persistence in `data/datasets/<uid>/` and `data/analyses/<uid>/`
- **Client Cache:** Browser `localStorage` fallback for offline UI resilience

---

## Key Capabilities & Features

### 1. Dataset Ingestion & Automatic Profiling
- Supports `.csv`, `.tsv`, and `.xlsx` / `.xls` file uploads up to 50 MB.
- Automatically infers logical column types (Numeric, Categorical, Datetime, Boolean, Text).
- Computes **Data Quality Score (0–100)** based on cell completeness, column completeness penalties, row duplication rate, and variance.
- Identifies **Potential Target Variables** suitable for regression or classification.
- Sanitizes column headers and extracts sample values.

### 2. Autonomous Gemini AI Analyst
- Conversational interface with context retention.
- Multi-step tool-calling loop that executes analytical tools before synthesizing answers.
- Formats structured responses into:
  - **Executive Answer:** Clear, direct summary of findings.
  - **Supporting Evidence:** Verified metrics from deterministic tool runs.
  - **Methodology:** Explicit computation steps taken.
  - **Caveats & Limitations:** Sample size notices, missing data considerations, correlation vs. causation warnings.
  - **Interactive Chart Specifications:** Structured specifications rendered via Recharts.

### 3. Deterministic Analytics Explorer
- **Summary Statistics:** Mean, median, standard deviation, variance, min, max, 25th/75th percentiles, IQR, skewness, kurtosis.
- **Correlation Matrix:** Pearson and Spearman coefficients across numeric dimensions with relationship strength classifications.
- **Outlier Detection:** Tukey IQR (1.5x IQR) and Z-Score (3.0 threshold) identifying anomaly row indices and severity.
- **Group-By & Aggregations:** Multi-column grouping with sum, mean, median, min, max, count, and distinct counts.
- **Trend Analysis:** Time-series resampling (day, week, month, quarter, year) with directional change calculations.
- **Distribution Histograms:** Equi-width binning with density curves.

### 4. Deterministic Machine Learning Engine
- Automated validation of candidate features and targets (checking zero variance, missingness, cardinality, and data leakage).
- **Algorithms:** Linear Regression, Random Forest Regressor, Gradient Boosting Regressor, Logistic Regression, Random Forest Classifier, Gradient Boosting Classifier.
- **Evaluation Metrics:**
  - *Regression:* MAE, MSE, RMSE, R² Score, Actual vs. Predicted plots.
  - *Classification:* Accuracy, Precision, Recall, F1-Score, Class-level metrics, Confusion Matrix.
  - *Interpretability:* Computed feature importances ranked in descending order.

### 5. What-If Scenario Simulator
- Interactive sensitivity analysis comparing baseline feature inputs with modified scenario values.
- Evaluates absolute and percentage deltas with deterministic model recalculation.
- Identifies the primary drivers responsible for outcome shifts.

### 6. Automated Executive Analyst Reports
- Comprehensive analytical report generation compiling dataset overview, data quality breakdown, statistical highlights, correlation findings, anomaly summaries, and recommendations.
- Markdown rendering with browser print / PDF export capability.

---

## AI Analyst & Function Calling Architecture

The AI layer (`src/server/ai/`) implements an autonomous agent loop with **16 validated tool declarations**:

| Tool Declaration | Description |
|---|---|
| `get_dataset_profile` | Retrieves row/column counts, types, quality score, and null rates. |
| `get_column_statistics` | Calculates exact mean, median, std, percentiles, skewness, kurtosis. |
| `get_unique_values` | Returns distinct categorical values and frequency distributions. |
| `group_by` | Performs categorical grouping with aggregations (mean, sum, median, etc.). |
| `calculate_correlation` | Computes Pearson / Spearman / Kendall correlation matrices. |
| `detect_outliers` | Detects anomalies via Tukey IQR or Z-Score thresholds. |
| `detect_trends` | Analyzes chronological time-series trends and directionality. |
| `analyze_distribution` | Generates histogram bin distributions and quantiles. |
| `assess_data_quality` | Evaluates completeness, duplication, and hygiene recommendations. |
| `compare_groups` | Compares two categories against a numeric metric (e.g., SUV vs. Sedan). |
| `get_sample_records` | Safely samples up to 5 representative sanitized rows. |
| `create_chart_specification` | Generates a structured chart spec (Bar, Line, Scatter, Histogram, Heatmap). |
| `validate_ml_task` | Assesses feasibility of target and feature selections for ML. |
| `train_ml_model` | Trains regression/classification models and computes test metrics. |
| `predict_target_value` | Generates deterministic point predictions for custom feature vectors. |
| `perform_what_if_scenario` | Computes baseline vs. scenario sensitivity analysis. |

### Quota Resilience & Fallback Engine
When Gemini returns a 429 quota exhaustion error:
1. `recordGeminiQuotaExceeded` places Gemini into a 15–30 second cooldown window to prevent retry storms.
2. The orchestrator routes the query to `handleFallbackDeterministicResponse`.
3. The fallback engine executes relevant deterministic tools directly based on query keywords (e.g., correlation, outliers, averages, price) and formats a structured Markdown response with complete evidence and methodology.

---

## Multi-Tier Data Persistence Strategy

DataLens AI uses a multi-tier persistence model:

1. **Cloud Firestore (Primary Cloud Database):**
   - Collections: `users`, `datasets`, `analyses`, `reports`.
   - Secured by UID matching rules in `firestore.rules`.
2. **Server Runtime Disk Storage (`data/datasets/<uid>/`, `data/analyses/<uid>/`):**
   - Stores parsed dataset JSON profiles, raw row data, and completed analysis records on the server filesystem.
3. **Client-Side Cache (`localStorage`):**
   - Caches analysis and report records in browser storage (`datalens_analyses_<uid>`, `datalens_datasets_<uid>`, `datalens_reports_<uid>`) to preserve UI responsiveness and handle transient network disruptions.
   - Dispatches custom `datalens:metrics-updated` window events to keep Dashboard counters and UI metrics synchronized.

### Dashboard Metrics Scope & Active Dataset Isolation
- **Active Dataset Scoping:** Dashboard **Analyses** and **Insights** metric counters are strictly scoped to the currently active dataset.
- **Matching Records:** When an active `datasetId` exists, only analysis records whose `datasetId` matches the active dataset are counted.
- **Zero-State Behavior:** When no active dataset exists (e.g., prior to uploading or selecting a dataset), dataset-scoped Analyses and Insights display as `0`.
- **Non-Destructive Persistence:** Historical analyses and insights from previous datasets remain securely persisted on disk and in Firestore; switching datasets or clearing selection never deletes previous analysis records.
- **Dynamic Recalculation:** Selecting or switching the active dataset immediately recalculates metrics for the newly active dataset.
- **Multi-Tenant Isolation:** Dataset and analysis ownership remains strictly verified and isolated to the authenticated user (`ownerId == request.auth.uid`).

---

## Security & Access Control Model

### Server-Side Token Authorization (`src/server/auth/tokenVerification.ts`)
- Protected endpoints require `Authorization: Bearer <token>`.
- Decodes the Firebase ID token payload, validates user identifier claims (`uid` / `user_id` / `sub`), and checks expiration (`exp`).
- Rejects unauthenticated requests with HTTP 401 (`UNAUTHENTICATED`).
- Enforces resource ownership: requests targeting datasets owned by another UID return HTTP 403 (`FORBIDDEN`).

### Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /datasets/{datasetId} {
      allow read, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null && resource.data.ownerId == request.auth.uid && request.resource.data.ownerId == request.auth.uid;
    }
    match /analyses/{analysisId} {
      allow read, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null && resource.data.ownerId == request.auth.uid && request.resource.data.ownerId == request.auth.uid;
    }
    match /reports/{reportId} {
      allow read, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null && resource.data.ownerId == request.auth.uid && request.resource.data.ownerId == request.auth.uid;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## API Reference

All API routes are served on port `3000` under the `/api/` prefix:

### Datasets
- `GET /api/datasets` — List user-owned dataset profiles.
- `GET /api/datasets/:id` — Get single dataset profile and sample preview rows.
- `GET /api/datasets/:id/profile` — Get dataset profile metadata.
- `POST /api/datasets/upload` — Ingest and profile a CSV, TSV, or XLSX file (`multipart/form-data`).
- `DELETE /api/datasets/:id` — Delete dataset profile and raw row files.

### Analytics
- `GET /api/datasets/:id/analytics/overview` — Dataset statistics and completeness overview.
- `GET /api/datasets/:id/analytics/statistics/:column` — Detailed column distribution and quantiles.
- `GET /api/datasets/:id/analytics/correlation` — Pearson and Spearman correlation matrix.
- `POST /api/datasets/:id/analytics/distributions` — Histogram bin calculation for a column.
- `POST /api/datasets/:id/analytics/group-by` — Grouped aggregations (mean, sum, count, min, max, median).
- `POST /api/datasets/:id/analytics/outliers` — Tukey IQR or Z-score outlier anomaly detection.
- `POST /api/datasets/:id/analytics/trends` — Time-series resampled trend direction analysis.
- `GET /api/datasets/:id/analytics/data-quality` — Data quality scoring and hygiene assessment.
- `POST /api/datasets/:id/analytics/query` — Filtered dataset querying with pagination.

### AI Analyst
- `POST /api/ai/analyze` — Run multi-step Gemini tool calling analysis on a dataset query.
- `GET /api/ai/health` — AI service health check and active Gemini model configuration.

### Machine Learning
- `POST /api/ml/validate` — Validate target and feature suitability for ML.
- `POST /api/ml/train` — Train and evaluate a regression or classification model.
- `GET /api/ml/models` — List trained models for a dataset.
- `GET /api/ml/models/:id` — Retrieve model details, evaluation metrics, and feature importances.
- `POST /api/ml/models/:id/predict` — Run prediction on custom feature inputs.
- `POST /api/ml/models/:id/what-if` — Perform baseline vs. scenario sensitivity analysis.
- `DELETE /api/ml/models/:id` — Delete a trained model.

### Reports & User Workspace
- `GET /api/reports` — List user reports.
- `GET /api/reports/:id` — Get full report by ID.
- `POST /api/reports/generate` — Generate an executive analyst report for a dataset.
- `POST /api/datasets/:id/reports/generate` — Generate report using URL dataset ID.
- `POST /api/reports/:id/regenerate` — Refresh an existing report with latest data.
- `DELETE /api/reports/:id` — Delete a report.
- `GET /api/user/profile` — Get user profile metadata.
- `POST /api/user/profile` — Update user profile.
- `GET /api/user/metrics?datasetId=:id` — Workspace metrics (datasets, reports, and active-dataset-scoped analyses and insights). Validates dataset ownership against the authenticated user's datasets; returns 0 for dataset-scoped metrics if no active datasetId is supplied.
- `GET /api/analyses` — List user analysis records.
- `GET /api/analyses/:id` — Get single analysis record.
- `POST /api/analyses` — Save an analysis record.
- `DELETE /api/analyses/:id` — Delete an analysis record.
- `GET /api/health` — Backend system health status.

---

## Project Structure

```
.
├── firestore.rules                 # Cloud Firestore security rules
├── storage.rules                   # Firebase Storage security rules
├── metadata.json                   # Application metadata & platform permissions
├── server.ts                       # Unified Express backend & API router
├── vite.config.ts                  # Vite configuration with Tailwind plugin
├── package.json                    # Scripts and dependencies
│
├── src/
│   ├── components/
│   │   ├── auth/                   # Auth cards, Google button, config alerts
│   │   ├── layout/                 # Navbar, Sidebar, Header, Footer
│   │   └── ui/                     # Button, Input, Modal, Badge, Card, Skeleton
│   ├── contexts/
│   │   └── AuthContext.tsx         # Firebase Auth state & user session provider
│   ├── hooks/
│   │   ├── useAuth.ts              # Authentication hook
│   │   └── useTheme.ts             # Dark/Light theme manager
│   ├── pages/
│   │   ├── Landing.tsx             # Public landing page
│   │   ├── Login.tsx               # Sign-in
│   │   ├── Signup.tsx              # Account creation
│   │   ├── ForgotPassword.tsx      # Password recovery
│   │   ├── Dashboard.tsx           # Workspace summary & metrics
│   │   ├── Datasets.tsx            # Dataset upload, table preview, and management
│   │   ├── Analyses.tsx            # AI Analyst chat & deterministic explorer
│   │   ├── Reports.tsx             # Executive reports generator & viewer
│   │   └── Settings.tsx            # Profile & theme configuration
│   ├── routes/
│   │   ├── ProtectedRoute.tsx      # Auth guard for workspace pages
│   │   └── PublicOnlyRoute.tsx     # Redirects logged-in users to /dashboard
│   ├── server/
│   │   ├── ai/
│   │   │   ├── geminiClient.ts     # GoogleGenAI SDK client initialization
│   │   │   ├── orchestrator.ts     # Multi-step AI tool loop & fallback engine
│   │   │   ├── rateLimiter.ts      # Rate limiter & 429 quota cooldown manager
│   │   │   ├── sensitiveData.ts    # PII / column sanitization
│   │   │   ├── systemPrompt.ts     # Grounded system instructions for Gemini
│   │   │   ├── toolDefinitions.ts  # 16 Gemini Function Declarations
│   │   │   └── toolExecutor.ts     # Deterministic dispatch of analytical tools
│   │   ├── analyses/
│   │   │   └── analysisService.ts  # Analysis records disk persistence & metrics
│   │   ├── auth/
│   │   │   └── tokenVerification.ts# JWT token extraction & verification
│   │   ├── datasets/
│   │   │   └── datasetService.ts   # CSV/XLSX parsing, profiling & disk storage
│   │   └── reports/
│   │       └── reportService.ts    # Automated executive report compiler
│   ├── services/
│   │   ├── api.ts                  # Client HTTP service for REST endpoints
│   │   ├── auth.ts                 # Firebase client authentication helpers
│   │   ├── deterministicMath.ts    # Exact statistical calculation algorithms
│   │   ├── deterministicMl.ts      # Exact ML training, evaluation & what-if engine
│   │   ├── firebase.ts             # Firebase client SDK initialization
│   │   └── firestore.ts            # Client Firestore operations & cache fallback
│   ├── tests/
│   │   ├── ai_analyst_presentation.test.ts # AI output formatting tests
│   │   ├── ai_quota_fallback.test.ts       # 429 rate-limit fallback tests
│   │   ├── car_dataset_e2e.test.ts         # Complete end-to-end dataset flow
│   │   ├── dashboard_metrics_persistence.test.ts # Metrics synchronization tests
│   │   ├── firestore_security.test.ts      # Firestore rule security validation
│   │   └── security.test.ts                # Token & route security tests
│   └── types/                              # Strict TypeScript interfaces
│       ├── ai.ts
│       ├── analysis.ts
│       ├── dataset.ts
│       ├── ml.ts
│       ├── report.ts
│       └── user.ts
```

---

## Environment Variables & Setup

Create a `.env` file based on `.env.example`:

```env
# Gemini API Configuration (Server-Side Secret - Never exposed to client)
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.5-flash"
GEMINI_MAX_OUTPUT_TOKENS="4096"
GEMINI_TIMEOUT_SECONDS="30"
MAX_TOOL_CALLS_PER_REQUEST="10"
AI_REQUESTS_PER_MINUTE="30"
AI_REQUESTS_PER_DAY="500"

# Application URL
APP_URL="http://localhost:3000"

# Firebase Client Configuration (Web SDK)
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

### Running Locally

```bash
# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Run TypeScript type check
npm run lint

# Run automated test suite
npm run test:frontend

# Build for production
npm run build
npm start
```

---

## Testing & Verification

The repository includes a comprehensive automated test suite with **51 tests passing across 6 test suites** executed via Vitest (`npm run test:frontend`):

1. **`security.test.ts` (15 tests):** Token parsing, Bearer format validation, expired JWT rejection, and cross-user data isolation.
2. **`firestore_security.test.ts` (7 tests):** Document access control, ownership verification, and update privilege validation.
3. **`ai_analyst_presentation.test.ts` (8 tests):** Clean executive Markdown output, segregation of evidence/methodology, and zero internal tool leaking.
4. **`dashboard_metrics_persistence.test.ts` (11 tests):** Verification of dataset-scoped Analyses and Insights metrics, zero-state initialization, dynamic context switching, non-destructive persistence, multi-tenant isolation, and event synchronization.
5. **`car_dataset_e2e.test.ts` (7 tests):** Real-world Car Market dataset ingestion, profiling, statistical distribution, correlation matrix, regression ML training, what-if sensitivity, and AI inquiry.
6. **`ai_quota_fallback.test.ts` (3 tests):** Gemini 429 rate limit detection, cooldown activation, and automatic deterministic fallback execution.
