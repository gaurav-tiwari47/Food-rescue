# 🥗 Food Rescue App

A full-stack MERN application that connects surplus food donors (restaurants, homes, events) with NGOs and volunteers who can distribute it before it goes to waste.

---

## 📁 Project Structure

```
food-app/
├── frontend/                        # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/
│   │   │   ├── authApi.js           # Axios calls: login, register, getMe
│   │   │   └── foodApi.js           # Axios calls: CRUD + claim food
│   │   ├── components/
│   │   │   ├── FoodCard.jsx         # Reusable listing card with claim button
│   │   │   ├── Loader.jsx           # Spinner component
│   │   │   ├── Navbar.jsx           # Responsive nav, auth-aware
│   │   │   └── ProtectedRoute.jsx   # Redirects unauthenticated users
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global auth state (user, token, login, logout)
│   │   ├── hooks/
│   │   │   └── useAuth.js           # Convenience hook for AuthContext
│   │   ├── pages/
│   │   │   ├── Home.jsx             # All available listings + hero + filters
│   │   │   ├── Login.jsx            # Login form
│   │   │   ├── Register.jsx         # Register form with role selection
│   │   │   ├── AddFood.jsx          # Create listing form with geolocation
│   │   │   ├── Dashboard.jsx        # User's listings + claimed food tabs
│   │   │   └── NotFound.jsx         # 404 fallback
│   │   ├── utils/
│   │   │   ├── formatDate.js        # Date formatting + time-until-expiry
│   │   │   └── getDistance.js       # Haversine distance + GPS detection
│   │   ├── App.jsx                  # Route definitions
│   │   ├── main.jsx                 # React root, BrowserRouter + AuthProvider
│   │   └── index.css                # Tailwind directives + custom utilities
│   ├── .env                         # VITE_API_URL
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── backend/                         # Node.js + Express + MongoDB
    ├── src/
    │   ├── config/
    │   │   └── db.js                # Mongoose connection
    │   ├── controllers/
    │   │   ├── authController.js    # register, login, getMe
    │   │   └── foodController.js    # getAllFood, getMyListings, createFood, claimFood, deleteFood
    │   ├── middleware/
    │   │   ├── authMiddleware.js    # JWT verification, adminOnly guard
    │   │   └── errorMiddleware.js   # 404 + global error handler
    │   ├── models/
    │   │   ├── User.js              # User schema (name, email, password, role)
    │   │   └── Food.js              # Food schema (title, status, expiryTime, geo, etc.)
    │   ├── routes/
    │   │   ├── authRoutes.js        # POST /register, POST /login, GET /me
    │   │   └── foodRoutes.js        # GET /, POST /, GET /my, PUT /:id/claim, DELETE /:id
    │   ├── utils/
    │   │   └── generateToken.js     # Signs JWT with 7-day expiry
    │   ├── app.js                   # Express app (middleware + routes + error handlers)
    │   └── server.js                # Entry point: DB connect → server.listen
    ├── .env.example
    ├── nodemon.json
    └── package.json
```

---

## ⚙️ How Files Connect

```
main.jsx
  └─ BrowserRouter + AuthProvider
       └─ App.jsx (Routes)
            ├─ Navbar.jsx           ← reads useAuth()
            ├─ ProtectedRoute.jsx   ← reads useAuth()
            ├─ Home.jsx             → foodApi.fetchAllFood() → GET /api/food
            ├─ Login.jsx            → authApi.loginUser()   → POST /api/auth/login
            ├─ Register.jsx         → authApi.registerUser()→ POST /api/auth/register
            ├─ AddFood.jsx          → foodApi.createFoodListing() → POST /api/food
            └─ Dashboard.jsx        → foodApi.fetchMyListings / fetchClaimedByMe

AuthContext.jsx
  ├─ Stores user + token in state + localStorage
  ├─ Provides login(), register(), logout() to whole app
  └─ useAuth.js is the consumer hook

authApi.js / foodApi.js
  └─ Axios instance with base URL from VITE_API_URL
       └─ Interceptor auto-attaches Bearer token from localStorage

Backend:
server.js → connectDB() → app.listen()
app.js → cors, json middleware → /api/auth routes → /api/food routes → error handlers
authRoutes → authController (register/login/getMe)
foodRoutes → [protect middleware] → foodController (CRUD)
authMiddleware → verifies JWT → attaches req.user
errorMiddleware → catches all errors, formats JSON response
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)
- npm

---

### 1. Clone / Create the Project

```bash
git clone <your-repo-url> food-app
cd food-app
```

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/food-rescue
JWT_SECRET=change_this_to_a_long_random_string
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
🚀 Server running on http://localhost:5000
```

Test the health endpoint:
```bash
curl http://localhost:5000/api/health
# {"status":"OK","message":"Food Rescue API is running 🥗"}
```

---

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

Verify `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the dev server:
```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔌 API Reference

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/register` | Public | `{name, email, password, role, phone}` | Register new user |
| POST | `/login` | Public | `{email, password}` | Login, returns JWT |
| GET | `/me` | 🔒 JWT | — | Get current user |

### Food Routes — `/api/food`

| Method | Endpoint | Auth | Body / Query | Description |
|--------|----------|------|--------------|-------------|
| GET | `/` | Public | `?category=cooked&status=available` | All food listings |
| POST | `/` | 🔒 JWT | Food form fields | Create a listing |
| GET | `/my` | 🔒 JWT | — | My listings |
| GET | `/claimed` | 🔒 JWT | — | Food I claimed |
| PUT | `/:id/claim` | 🔒 JWT | — | Claim a listing |
| DELETE | `/:id` | 🔒 JWT | — | Delete (owner/admin only) |

---

## 🐛 Common Bugs & Fixes

### ❌ CORS error in browser console
**Fix:** Make sure `CLIENT_URL` in `backend/.env` matches your Vite dev server URL exactly:
```env
CLIENT_URL=http://localhost:5173
```

### ❌ `MongoServerError: E11000 duplicate key`
**Cause:** Trying to register with an email that already exists.  
**Fix:** The error middleware catches this and returns `"Email already exists"`. On the frontend, show the `error` state message.

### ❌ JWT `TokenExpiredError`
**Cause:** Token older than 7 days.  
**Fix:** Frontend catches 401 responses. Log the user out and redirect to `/login`. Add an Axios response interceptor for automatic logout:
```js
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

### ❌ `Cannot read properties of null (reading 'name')`
**Cause:** `user` is null before `AuthContext` finishes loading from localStorage.  
**Fix:** The `loading` state in `AuthContext` prevents rendering until session is restored. Always check `if (loading) return <Loader />`.

### ❌ Vite env vars not working (`undefined`)
**Fix:** All Vite environment variables must be prefixed with `VITE_`:
```env
VITE_API_URL=http://localhost:5000/api   # ✅
API_URL=http://localhost:5000/api         # ❌ won't work
```

### ❌ Food listings not updating after claim
**Fix:** The `handleClaimed` callback in `Home.jsx` updates local state immediately (optimistic UI). Make sure you're passing it as the `onClaimed` prop to `FoodCard`.

### ❌ `bcrypt` install error on Windows
**Fix:** Use `bcryptjs` (pure JS) instead:
```bash
npm uninstall bcrypt && npm install bcryptjs
```
Then change all `require('bcrypt')` to `require('bcryptjs')`.

---

## 🌐 Deployment

### Backend — Railway / Render / Fly.io

1. Push your `backend/` folder to GitHub
2. Connect repo to [Railway](https://railway.app) or [Render](https://render.com)
3. Set environment variables in the dashboard:
   ```
   PORT=5000
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/food-rescue
   JWT_SECRET=your_production_secret_64chars
   NODE_ENV=production
   CLIENT_URL=https://your-frontend.vercel.app
   ```
4. Set start command: `node src/server.js`

### Frontend — Vercel

1. Push `frontend/` to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Set environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
4. Build command: `npm run build`
5. Output directory: `dist`

### MongoDB Atlas Setup

1. Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user
3. Whitelist IP: `0.0.0.0/0` (all) for cloud deployments
4. Get connection string → paste into `MONGO_URI`

---

## 🔮 Future Upgrades

### 1. 🔴 Real-time Notifications (Socket.io)
When food is claimed, notify the donor instantly:
```js
// backend: emit on claim
io.to(food.createdBy.toString()).emit("food-claimed", { foodId, claimedBy });

// frontend: listen in Dashboard
socket.on("food-claimed", ({ foodId }) => refetchListings());
```

### 2. 🗺️ Interactive Map (Leaflet / Google Maps)
Show food listings as pins on a map:
```bash
npm install leaflet react-leaflet
```
Use the `latitude` and `longitude` fields already stored in the Food model.

### 3. 📸 Image Upload (Cloudinary)
Replace the `imageUrl` text field with real file upload:
```bash
npm install cloudinary multer multer-storage-cloudinary
```
Add a `POST /api/upload` endpoint, return the Cloudinary URL to store in `Food.imageUrl`.

### 4. 📧 Email Notifications (Nodemailer / SendGrid)
Send emails on registration, food claim, and expiry reminders:
```bash
npm install nodemailer
```

### 5. ⏰ Auto-expire Cron Job
Mark listings as `expired` when `expiryTime` passes:
```bash
npm install node-cron
```
```js
cron.schedule("*/15 * * * *", async () => {
  await Food.updateMany(
    { status: "available", expiryTime: { $lt: new Date() } },
    { status: "expired" }
  );
});
```

### 6. 🛡️ Admin Panel
- View all users and listings
- Ban users, remove inappropriate listings
- Analytics dashboard (total rescued, by category, by city)
- Protected by `adminOnly` middleware (already built in `authMiddleware.js`)

### 7. 📊 Analytics
Track impact:
- Total kg of food rescued
- Number of meals served
- Top donors / NGOs leaderboard

### 8. 📱 Mobile App (React Native)
The entire backend API is ready — just build a React Native frontend consuming the same endpoints.

### 9. 🔐 OAuth (Google Login)
```bash
npm install passport passport-google-oauth20
```
Add Google OAuth flow alongside existing JWT auth.

### 10. 🌍 Multi-language (i18n)
Add Hindi, Tamil, Bengali support for wider reach across India:
```bash
npm install react-i18next i18next
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/realtime-claims`
3. Commit your changes: `git commit -m "Add socket.io realtime claim notifications"`
4. Push to the branch: `git push origin feature/realtime-claims`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

**Built to fight food waste 🌍 | Inspired by UN SDG Goal 2: Zero Hunger**
