# SpeedHype - Automotive Community Platform

![SpeedHype](https://img.shields.io/badge/SpeedHype-Automotive%20Community-blue)
![React](https://img.shields.io/badge/React-19.2.8-61DAFB)
![Express](https://img.shields.io/badge/Express-5.0-000000)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248)
![Clerk](https://img.shields.io/badge/Clerk-Authentication-6C47FF)

SpeedHype is a modern automotive community platform designed for car and bike enthusiasts to connect, share experiences, and discover content. This MERN stack application provides a premium automotive experience with Clerk authentication, responsive design, and a clean, dark automotive aesthetic.

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern UI library with hooks
- **Vite** - Next-generation build tool
- **React Router 7** - Client-side routing
- **Tailwind CSS 4** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **Clerk React SDK** - Authentication and user management
- **Socket.IO Client** - Authenticated live community chat
- **Notifications** - Activity updates for blogs, communities, and vehicle launches

### Backend
- **Node.js** - JavaScript runtime
- **Express 5** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Clerk Node SDK** - Backend authentication verification
- **Socket.IO** - Real-time community chat transport
- **Cloudinary** - Community covers and chat image/video uploads
- **Activity feed** - Recent blogs, communities, vehicle launches, trending tags, and community suggestions
- **Car catalog** - Searchable, filtered India-market vehicle records with source-attributed variants
- **LangGraph ingestion worker** - Separate, scheduled source ingestion with robots-policy checks and evidence-grounded extraction

### Authentication
- **Clerk** - Complete authentication solution
- **No custom JWT/bcrypt** - All auth handled by Clerk
- **Protected routes** - Both frontend and backend

## 📁 Project Structure

```
SpeedHype/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── layouts/       # Page layouts
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API client services
│   │   └── ...
│   ├── public/
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Auth & other middleware
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   └── ...
│   └── package.json
├── docs/                  # Documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (local or Atlas cluster)
- **Clerk Account** ([sign up here](https://clerk.com))

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd SpeedHype

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Configuration

#### Frontend (.env.local in client/)
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:5000/api
```

#### Backend (.env in server/)
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLIENT_ORIGIN=http://localhost:5173
```

Cloudinary is used for optional community covers and chat image/video attachments. Keep its API secret in the server environment only. Chat attachments are limited to 12 MB.

### 3. Clerk Setup
1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Copy your **Publishable Key** to `VITE_CLERK_PUBLISHABLE_KEY`
3. Copy your **Secret Key** to `CLERK_SECRET_KEY`
4. Configure redirect URLs in Clerk dashboard:
   - `http://localhost:5173/sign-in`
   - `http://localhost:5173/sign-up`

### 4. Run the Application

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 🔐 Authentication Architecture

SpeedHype uses **Clerk** for complete authentication handling:

### Frontend Authentication Flow
1. User visits `/sign-in` or `/sign-up` pages
2. Clerk handles the authentication UI
3. Upon successful auth, Clerk manages session state
4. `useUser()` hook provides user data
5. `useAuth()` hook provides token access

### Backend Authentication Flow
1. Frontend includes Clerk token in `Authorization: Bearer <token>` header
2. Backend middleware verifies token with Clerk API
3. Verified user data is attached to `req.auth`
4. Routes can access authenticated user information

### API Client Service
The `client/src/services/api.js` provides authentication helpers:

```javascript
import { useAuth } from '@clerk/react';
import { createAuthenticatedRequest, authenticatedRequest } from './services/api';

// Example 1: Create authenticated API instance
const { getToken } = useAuth();
const authApi = await createAuthenticatedRequest(getToken);
const userData = await authApi.get('/auth/me');

// Example 2: Make single authenticated request
const result = await authenticatedRequest(getToken, 'GET', '/auth/me');

// Example 3: Make authenticated POST request
const postResult = await authenticatedRequest(
  getToken, 
  'POST', 
  '/posts', 
  { title: 'New Post' }
);
```

## 📱 Application Features

### Public Routes
- `/` - Landing page with hero and feature cards
- `/sign-in` - Clerk-powered sign in
- `/sign-up` - Clerk-powered sign up
- `/*` - 404 page for unknown routes

### Protected Routes (Require Authentication)
- `/dashboard` - User dashboard with welcome message
- `/profile` - User profile using Clerk components
- `/feed` - Recent stories, communities, vehicle launches, trending topics, and suggestions
- `/notifications` - Recent SpeedHype activity and unread updates
- `/communities` - Search, filter, join, and manage communities
- `/communities/new` - Create an automotive community
- `/communities/:communityId` - Community information, members, and real-time chat
- `/communities/:communityId/edit` - Edit a community as its creator
- `/blogs` - Automotive blogs
- `/cars` - Searchable, paginated car-spec catalog
- `/cars/catalog/:carId` - Vehicle specifications, variants, images, and source attribution
- `/cars/new` - Add a vehicle launch to the SpeedHype database and activity feed
- `/compare` - Vehicle comparison (placeholder)

### UI Design
- **Modern automotive aesthetic** - Dark theme with premium styling
- **Responsive design** - Works on mobile, tablet, and desktop
- **Tailwind CSS** - Utility-first styling approach
- **Component-based** - Reusable UI components

## 🧪 Testing

### Verification Checklist
- [ ] Frontend runs on port 5173
- [ ] Backend runs on port 5000
- [ ] MongoDB connects successfully
- [ ] Sign up works with Clerk
- [ ] Sign in works with Clerk
- [ ] Sign out works properly
- [ ] UserButton displays correctly
- [ ] Profile page loads Clerk components
- [ ] Protected routes redirect unauthenticated users
- [ ] `/api/health` returns 200 OK
- [ ] `/api/auth/me` rejects unauthenticated requests
- [ ] `/api/auth/me` accepts authenticated requests
- [ ] Clerk tokens reach backend correctly
- [ ] No secrets exposed in code
- [ ] 404 page works correctly
- [ ] UI is responsive across devices

### Running Tests
```bash
# Backend tests (when implemented)
cd server
npm test

# Frontend tests (when implemented)
cd client
npm test
```

## 🔧 Development

### Code Style
- **ESLint** - Code linting and formatting
- **ES Modules** - Using `import/export` syntax
- **Functional components** - React hooks pattern
- **Error boundaries** - Graceful error handling

### Git Workflow
```bash
# Create feature branch
git checkout -b feat/feature-name

# Make changes and commit
git add .
git commit -m "feat: add feature description"

# Push to remote
git push -u origin feat/feature-name

# Create pull request
```

### Environment Variables Security
- Never commit `.env` files
- Use `.env.example` as template
- Add `.env*` to `.gitignore`
- Use different keys for development/production

## 📚 Documentation

- **`docs/08-ai-development.md`** - Kiro-assisted development log
- **`docs/`** - Additional project documentation
- **API Documentation** - Available via inline code comments

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check `MONGO_URI` in server/.env
   - Verify MongoDB service is running
   - Test connection with MongoDB Compass

2. **Clerk Authentication Errors**
   - Verify Clerk keys are correct
   - Check redirect URLs in Clerk dashboard
   - Ensure CORS allows localhost:5173

3. **CORS Issues**
   - Backend CORS middleware should allow `http://localhost:5173`
   - Check browser console for CORS errors

4. **Environment Variables Not Loading**
   - Restart dev servers after changing .env files
   - Check variable names match exactly
   - Verify .env files are in correct directories

### Debug Mode
```bash
# Frontend with debug logging
cd client
npm run dev -- --debug

# Backend with debug logging
cd server
DEBUG=* npm run dev
```

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**SpeedHype** - Your Automotive World. One Platform. 🏎️✨

## Car catalog and AI ingestion pipeline

The public Cars page (`/cars`) only shows **admin-approved** records from MongoDB. New data is collected by a separate Python service (LangGraph) using **Tavily** search and a **local Ollama model** for extraction (no paid LLM API), saved as `pending`, and published only after an administrator reviews it at `/admin/cars`. Full design: [docs/DATA_INGESTION_ARCHITECTURE.md](docs/DATA_INGESTION_ARCHITECTURE.md).

> The pipeline reports *evidence checks*, not truth. Every value must have a quote that exists in the retrieved source text; important specs are cross-checked across domains; conflicts and gaps are flagged. LLM output is never labelled "verified" - an admin approves each record.

### Setup (free tiers)

1. Install [Ollama](https://ollama.com) and pull a model (`ollama pull <model>`; check with `curl http://localhost:11434/api/tags`). Create a free [Tavily](https://app.tavily.com) key (≈1,000 credits/month) for web search.
2. Install and configure the Python service:

   ```powershell
   cd ai-services
   py -3 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   Copy-Item .env.example .env   # then fill TAVILY_API_KEY, MONGO_URI, CAR_INGESTION_SHARED_SECRET and set OLLAMA_MODEL (blank = auto-pick)
   ```

   `MONGO_URI` must point at the same Atlas database as `server/.env`. The Tavily key and Mongo URI live only in `ai-services/.env` (git-ignored). Ollama needs no key; the dashboard shows whether Ollama is reachable and which model is in use. Pending records can be edited (**Edit specs**), re-extracted (**Retry extraction**), approved or rejected.
3. In `server/.env` set `CAR_INGESTION_SHARED_SECRET` (same value), `CAR_CATALOG_ADMIN_USER_IDS` (comma-separated Clerk user IDs allowed to run/review) and optionally `CAR_INGESTION_AGENT_AUTOSTART=true` + `PYTHON_EXECUTABLE`. Or start the service manually: `cd ai-services; .\.venv\Scripts\python.exe -m uvicorn agent.main:app --host 127.0.0.1 --port 8010`.
4. Sign in as an admin, open **Cars → Open admin console** (`/admin/cars`), choose a count (start with 5) and press *Start ingestion*. Watch status/logs/errors, then approve or reject each pending record (warnings require a written justification; image links are removed unless you confirm permission).
5. Existing deployments: run `node server/scripts/backfill-review-status.js --apply` once if you have car records created before the review workflow (they have no `reviewStatus` and would otherwise be hidden).

### Safeguards

- Admin-only: Clerk session verified in Express, admin allow-list enforced server-side; the acting user id is taken from the session, never from the request body. Express → Python uses a loopback-only, shared-secret API.
- Free-tier protection: per-run cap (`MAX_CARS_PER_RUN`), daily/monthly counters persisted in MongoDB, request timeouts, retries with backoff, and a clean `quota_exhausted` stop that keeps partial results.
- Sources: Tavily is restricted to official manufacturer domains plus a small secondary allow-list; results from any other domain are discarded. The service does not crawl sites itself. Images are stored as links with attribution only (never downloaded), flagged `unverified`.
- Idempotent: unique `identityKey` (brand|model|variant|year); re-runs skip existing cars and never overwrite approved/rejected records.
- Tests (offline, synthetic pages + throw-away Mongo DB): `cd ai-services; .\.venv\Scripts\python.exe -m unittest tests.test_ingestion`.

## Legacy configured-source agent

The earlier worker (`/trigger`, OpenAI-based, explicit reviewed source URLs) remains in `ai-services/agent/main.py` and is unchanged; the admin console uses the new pipeline instead. Records pushed through its `/car-catalog/ingestion/records` endpoint are now also created as `pending`.

The catalog (`/cars`) is stored separately from the community launch posts used by the existing activity feed. Catalog records include brand/model/variant, launch year, India body style, price in INR when published, specifications, permitted image URLs, and source/license attribution. Unknown source fields stay empty; the ingestion agent does not fill missing facts from model knowledge. Variant records are deduplicated by brand, model, variant, and model year.

### Legacy source policy and prerequisites

The worker does **not** discover or scrape arbitrary websites by default. Publicly accessible pages are not automatically licensed for automated collection. Configure only manufacturer pages or APIs that you have reviewed and that permit this access and reuse. The worker checks each exact hostname against an explicit allowlist and checks `robots.txt` before fetching every page. A source with a disallow rule, unavailable robots policy, unreviewed terms, failed citation validation, or an off-allowlist redirect is skipped. Image reuse is off by default and must be separately permitted for each source.

The LangGraph flow fetches each explicitly configured, reviewed source page, extracts a candidate with an evidence quote per field, and reconciles candidates only when brand, model, model year, and stated variant match. It may fill a missing field from another configured page for that same exact vehicle; conflicting values are omitted. Each stored field retains its source title, URL, and supporting quote, visible under “Specification evidence” on the details page. Unsupported optional values are omitted, while records without evidence for brand/model/model year/category are rejected. The worker never guesses missing prices or variant names. Price is stored only when an approved source explicitly states an INR amount; absent or non-INR prices stay empty. Category must be explicitly supported and unambiguous, using one of `sedan`, `suv`, `hatchback`, `truck`, `coupe`, `convertible`, `electric`, or `hybrid`.

### Configure and run

1. Set `server/.env` from `server/.env.example`. Keep `CAR_INGESTION_SHARED_SECRET` private and set `CAR_SOURCE_ALLOWED_DOMAINS` to the same host allowlist you use for the agent. Set `CAR_CATALOG_ADMIN_USER_IDS` to comma-separated Clerk user IDs. Set `CAR_INGESTION_AGENT_AUTOSTART=true` and `PYTHON_EXECUTABLE` to the interpreter that has the worker requirements installed. Never put these values in the client environment.
2. Install Python 3.11+ and create the worker environment:

   ```powershell
   cd ai-services
   py -3 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

   On macOS/Linux, use `python3 -m venv .venv`, `.venv/bin/python -m pip install -r requirements.txt`, and copy `.env.example` to `.env`.
3. In `ai-services/.env`, use the same internal shared secret as the server; set `EXPRESS_API_URL` to the Express API URL, configure a server-side `OPENAI_API_KEY`, and choose a model with structured-output support. Set `SOURCE_POLICY_APPROVED=true` only after reviewing every configured source’s terms and robots policy. Provide `CAR_SOURCE_ALLOWED_DOMAINS` and `CAR_SOURCE_URLS` as a JSON array. Every source entry requires an HTTPS `url`, `source_name`, `license`, and a reviewed `terms_reviewed: true`. A direct product page uses `page_type: "detail"` (the default). A reviewed manufacturer listing page can use `page_type: "listing"`, a restrictive `product_link_pattern` matching product URL paths, and optional `max_pages` (capped at 50); the worker follows only same-host links matching that pattern and checks robots rules on every page. To enable cross-source lookup for missing fields, add a reviewed same-host `search_url_template` containing exactly one `{query}` placeholder and a product-link pattern; the agent queries it with the exact extracted brand/model/year/variant, then fetches at most five same-host matching pages per model. Every result page still has to pass robots and evidence checks. The worker determines the category from explicit source evidence. Set `image_reuse_permitted: true` only when the source explicitly permits reuse of its images.

   Example shape (replace the placeholder with a real, reviewed source; it is not a working data provider):

   ```env
   CAR_SOURCE_ALLOWED_DOMAINS=api.manufacturer.example
   SOURCE_POLICY_APPROVED=true
   CAR_SOURCE_URLS=[{"url":"https://api.manufacturer.example/vehicles/model","source_name":"Manufacturer API","license":"Reviewed permitted terms","license_url":"https://api.manufacturer.example/terms","terms_reviewed":true,"image_reuse_permitted":false,"search_url_template":"https://api.manufacturer.example/search?q={query}","product_link_pattern":"/vehicles/[a-z0-9-]+"}]
   ```

4. Set `PYTHON_EXECUTABLE` in `server/.env` to the Python interpreter containing the worker dependencies and set `CAR_INGESTION_AGENT_AUTOSTART=true`. Starting the Express server launches the separate worker process; it runs once on startup and then every `CAR_INGESTION_INTERVAL_HOURS` (24 by default) while the worker remains running. Alternatively, start it separately from `ai-services` with `.\.venv\Scripts\python.exe -m uvicorn agent.main:app --host 127.0.0.1 --port 8010`.
5. A configured Clerk administrator can start a run from the Cars catalog page. The browser calls the authenticated Express admin route; Express then calls the worker with the server-only shared secret. The ingestion-records endpoint accepts requests only with that internal secret and approved source domains.

The admin control is disabled until both Express and the agent are configured. The worker exposes its control API only on loopback by default. Do not expose that port publicly or share either server secret.