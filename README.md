# Payment Book 📖

A personal outgoing payment ledger mobile application designed for tracking ceremonial and event expenses.

## 1. Architecture
- **Frontend (`mobile/`):** React Native (Expo SDK 58), TypeScript, Tailwind Theme, Vector Icons.
- **Backend (`backend/`):** Node.js, Express, TypeScript, Mongoose, JWT Auth, Bcrypt.js.
- **Database:** MongoDB Atlas (Cloud).
- **Deployment:** Vercel (Backend), Expo Go / EAS Build (Android APK).

---

## 2. Local Development

### A. Start the Backend Server:
```bash
# Check backend/.env (MONGODB_URI and JWT_SECRET)
npm run dev:backend
```
The backend starts at `http://localhost:5000`.
Health check: `http://localhost:5000/api/v1/health`

### B. Start the Mobile App:
```bash
npm run dev:mobile
```
Download the **Expo Go** app on your physical mobile phone and scan the terminal QR Code.

> **Mobile Tip:** To test the backend locally from a physical phone on the same Wi-Fi, update `mobile/src/config/env.ts` with your computer's local LAN IP (e.g., `http://192.168.1.XX:5000/api/v1`) or your Vercel live URL.

---

## 3. Deploying the Backend to Vercel
1. Push this repository to GitHub.
2. Go to your Vercel Dashboard and click **Import Project**.
3. **Root Directory:** select `backend`.
4. Add Environment Variables:
   - `MONGODB_URI`: Your MongoDB Atlas Connection String
   - `JWT_SECRET`: Your Secret JWT key
5. Click **Deploy**. You will receive a live URL (e.g. `https://your-api.vercel.app`).
6. Set this URL in `mobile/src/config/env.ts` (`EXPO_PUBLIC_API_BASE_URL`).

---

## 4. Building the Android APK
```bash
cd mobile
npx eas-cli login
npx eas-cli build -p android --profile preview
```
Once the cloud build finishes, EAS will provide a direct download link for the installable `.apk` file.
