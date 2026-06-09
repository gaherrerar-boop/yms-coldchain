# YMS Deployment Guide - Netlify + Firebase

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` with your Firebase credentials:
```
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

3. Run locally:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Firebase Setup

1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable Email/Password authentication
4. Copy credentials to `.env.local`
5. Deploy Firestore rules from `firestore.rules`
6. Create Firestore collections (empty):
   - users
   - yard_tasks
   - yard_visits
   - docks
   - queue_tickets
   - carriers
   - plants
   - audit_log
   - chat
   - presence
   - return_authorizations

7. Add Netlify domain to Firebase Auth → Settings → Authorized domains

## Netlify Deployment

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables:
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_MESSAGING_SENDER_ID
   - VITE_FIREBASE_APP_ID
   - VITE_FIREBASE_DATABASE_URL

5. Deploy!

## Firestore Rules Emergency Mode

If role-based rules cause access issues, replace `firestore.rules` content with `firestore.rules.simple` temporarily. This allows authenticated users to read/write all data.

⚠️ **WARNING**: Never use simplified rules in production. Implement proper role-based access control for security.

## Testing Checklist

- [ ] Login works with Firebase Auth
- [ ] Users can create tasks
- [ ] Docks appear in real-time
- [ ] Chat works between two users
- [ ] Presence shows online users
- [ ] Data persists after page reload
- [ ] Different users see changes in real-time
- [ ] Logout clears session properly

## Troubleshooting

**Error: Firestore not initialized**
→ Check that Firebase credentials are correct in `.env.local` or Netlify environment variables

**Error: User profile not found**
→ Admin must create user profile in Firestore `users/{uid}` with:
- nombre: string
- email: string
- rol: string (administrador, supervisor, guardia, patio, anden, visualizador)
- cd: string (center/location code)
- activo: boolean

**Blank screen after login**
→ Check browser console for errors. Verify Firestore rules allow read access.

**Port 5173 already in use**
→ Set PORT=5174 or kill process: `lsof -i :5173 | grep node | awk '{print $2}' | xargs kill`
