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

### Backend
- **Node.js** - JavaScript runtime
- **Express 5** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Clerk Node SDK** - Backend authentication verification

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
```

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
- `/feed` - Automotive content feed (placeholder)
- `/communities` - Community discussions (placeholder)
- `/blogs` - Automotive blogs (placeholder)
- `/cars` - Car database (placeholder)
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