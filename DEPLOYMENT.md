# CrixOne Backend Deployment Guide

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Node.js 18+
- A Firebase project created in Google Cloud Console
- Admin access to your Firebase project

## Setup Steps

### 1. Initialize Firebase

```bash
cd c:\CrixOne
firebase init firestore
firebase init functions
firebase init emulators
```

### 2. Configure firebase.json

Replace `your-project-id` in [firebase.json](firebase.json) with your actual Firebase project ID.

### 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

The rules are located at [backend/firestore/rules/firestore.rules](backend/firestore/rules/firestore.rules)

### 4. Create Firestore Collections

Create the following collections in Firestore (no data needed initially):
- `matches`
- `users`
- `predictions`
- `battles`
- `rooms`
- `leaderboards`
- `notifications`

You can also use the Firestore dashboard to create these.

### 5. Deploy Cloud Functions

```bash
cd backend/functions
npm install
npm run deploy
```

Functions will be deployed to `asia-south1` region.

### 6. Configure Cloud Function Permissions

Ensure the Cloud Functions service account has:
- Editor role for Firestore
- Editor role for Cloud Messaging
- Ability to call custom claims

### 7. Set Up Cricket API Integration

1. Choose a cricket API:
   - **Cricapi** (https://cricapi.com)
   - **ESPNcricinfo** (requires scraping)
   - **CricketData API**

2. Update `fetchAndSyncMatches()` in [backend/functions/src/index.ts](backend/functions/src/index.ts)

3. Redeploy functions:
   ```bash
   npm run deploy
   ```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Firebase

Update your Firebase config in [frontend/src/lib/firebase.ts](frontend/src/lib/firebase.ts):

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

Get these values from Firebase Console → Project Settings.

### 3. Configure FCM (Optional, for Notifications)

1. Generate a VAPID key in Firebase Console
2. Update [frontend/src/lib/firebase.ts](frontend/src/lib/firebase.ts)

### 4. Run Frontend Locally

```bash
npm start
# Then press 'a' for Android or 'i' for iOS
```

## Development with Emulators

### 1. Start Emulators

```bash
firebase emulators:start
```

This starts:
- Firestore Emulator (port 8080)
- Functions Emulator (port 5001)
- Auth Emulator (port 9099)

### 2. Run Frontend with Emulators

Set `__DEV__ = true` in [firebase.ts](frontend/src/lib/firebase.ts)

Emulator connections are automatically configured.

## Cloud Functions Overview

### 1. fetchAndSyncMatches
- **Type**: Scheduled (every 30 minutes)
- **Purpose**: Fetch live cricket matches from external API
- **Trigger**: Pub/Sub schedule
- **Output**: Updates Firestore `matches` collection

### 2. lockPredictions
- **Type**: Firestore trigger
- **Purpose**: Locks predictions 5 minutes after match starts
- **Trigger**: `matches/{matchId}` document update to LIVE
- **Output**: Updates `predictionLockTime` field

### 3. calculatePredictionPoints
- **Type**: Firestore trigger
- **Purpose**: Awards points for accurate over predictions
- **Trigger**: `matches/{matchId}` document update (over changes)
- **Output**: Updates `predictions/{matchId}/{uid}` with points

### 4. resolveBattles
- **Type**: Firestore trigger
- **Purpose**: Awards battle points after match finishes
- **Trigger**: `matches/{matchId}` document update to FINISHED
- **Output**: Updates battle documents and leaderboards

### 5. assignMatchChampionCrown
- **Type**: HTTP Callable
- **Purpose**: Awards 1 crown to the top scorer in a match
- **Input**: `{ matchId: string }`
- **Output**: User document updated with crown

### 6. updateQuizProgress
- **Type**: HTTP Callable
- **Purpose**: Tracks daily quiz completion
- **Input**: `{ quizId: string, correct: boolean }`
- **Output**: Updates user stats and tracks crowns

### 7. updateBattleProgress
- **Type**: HTTP Callable
- **Purpose**: Tracks battle wins/losses
- **Input**: `{ matchId: string, won: boolean }`
- **Output**: Updates user battle stats

### 8. enforceBattleChangeRules
- **Type**: HTTP Callable
- **Purpose**: Validates player change advantage rules
- **Input**: `{ matchId: string, battleType: string, oldPlayerId: string }`
- **Output**: Validates change is allowed

### 9. sendFCMNotifications (Helper)
- **Type**: Internal
- **Purpose**: Sends push notifications via Firebase Cloud Messaging
- **Used by**: Other functions for notifications

## Firestore Indexes

Auto-indexed queries will be created, but for production performance, create these indexes manually:

**Index 1**: leaderboards/matchId/global
- Collection: `leaderboards/{matchId}/global`
- Fields: `matchId` (Ascending), `totalPoints` (Descending), `updatedAt` (Descending)

**Index 2**: leaderboards/monthly
- Collection: `leaderboards/monthly/{month}`
- Fields: `month` (Ascending), `totalPoints` (Descending)

**Index 3**: predictions
- Collection: `predictions/{matchId}`
- Fields: `matchId` (Ascending), `submittedAt` (Descending)

**Index 4**: battles/global
- Collection: `battles/{matchId}/global`
- Fields: `matchId` (Ascending), `submittedAt` (Descending)

## Security Rules Summary

- **Matches**: Public read, no writes
- **Users**: Users read/write own profile (except points/crowns)
- **Predictions**: Users submit own predictions
- **Battles**: Users submit own battle picks
- **Leaderboards**: Public read, backend writes only
- **Notifications**: Users read own notifications

## Monitoring & Debugging

### View Function Logs

```bash
firebase functions:log
```

### Monitor Firestore

Firebase Console → Firestore Database → Monitoring

### Check Auth Events

Firebase Console → Authentication → Logs

## Production Checklist

- [ ] Replace all placeholders in environment configs
- [ ] Enable Firestore backups
- [ ] Set up Firebase Monitoring
- [ ] Configure Cloud Function timeout (recommended: 60 seconds)
- [ ] Set up error alerting
- [ ] Enable Firebase Security Rules audit logging
- [ ] Configure rate limiting for API endpoints
- [ ] Set up database sharding for high-traffic collections
- [ ] Enable Firebase Performance Monitoring
- [ ] Configure Firebase Crashlytics in frontend

## Troubleshooting

### "Project not found" Error
- Run: `firebase use --add`
- Select your project ID

### Emulator Connection Issues
- Ensure `__DEV__` is set correctly
- Check emulator ports are available
- Restart emulators: `firebase emulators:stop` then `firebase emulators:start`

### Cloud Functions Timeout
- Increase timeout in [firebase.json](firebase.json)
- Check for slow database queries

### Authentication Failed
- Clear browser cache and local storage
- Restart emulators
- Verify Firebase config is correct

## Support

For issues with specific components:
- Backend: See [backend/firestore/schema/SCHEMA.md](backend/firestore/schema/SCHEMA.md)
- Security Rules: See [backend/firestore/rules/firestore.rules](backend/firestore/rules/firestore.rules)
- Frontend: Check console logs in Expo app
