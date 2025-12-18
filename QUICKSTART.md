# CrixOne - Quick Start Guide

## 5-Minute Setup

### Step 1: Get Firebase Project
```bash
# Go to https://console.firebase.google.com
# Create new project → "crixone-app"
# Copy Project ID
```

### Step 2: Initialize Firebase CLI
```bash
npm install -g firebase-tools
firebase login
firebase use --add
# Select your project ID
```

### Step 3: Deploy Backend
```bash
cd backend/functions
npm install
npm run build
npm run deploy
```

### Step 4: Setup Firestore
```bash
# In Firebase Console:
# 1. Enable Firestore (Start in Production)
# 2. Deploy rules from firebase.json
firebase deploy --only firestore:rules
```

### Step 5: Setup Frontend
```bash
cd frontend
npm install
npm start
# Press 'a' for Android or 'i' for iOS
```

**Done!** ✅ App is running locally with emulators.

---

## Key Files to Know

| File | Purpose | Edit When |
|------|---------|-----------|
| [backend/functions/src/index.ts](backend/functions/src/index.ts) | All Cloud Functions | Adding new functions |
| [backend/firestore/schema/SCHEMA.md](backend/firestore/schema/SCHEMA.md) | Database design | Changing data structure |
| [backend/firestore/rules/firestore.rules](backend/firestore/rules/firestore.rules) | Security rules | Changing access control |
| [frontend/src/lib/firebase.ts](frontend/src/lib/firebase.ts) | Firebase config | Setting real Firebase creds |
| [frontend/src/screens/HomeScreen.tsx](frontend/src/screens/HomeScreen.tsx) | Match listing | Adding UI features |
| [frontend/src/screens/MatchDetailScreen.tsx](frontend/src/screens/MatchDetailScreen.tsx) | Predictions & battles | Modifying forms |

---

## Important Concepts

### 1. Server Timestamps (Sacred!)
```typescript
// ✅ CORRECT - Server decides timestamp
await db.collection("predictions").add({
  submittedAt: serverTimestamp(),
});

// ❌ WRONG - Client timestamp can be spoofed
await db.collection("predictions").add({
  submittedAt: new Date(),
});
```

### 2. Points Never Written by Client
```typescript
// ✅ CORRECT - Cloud Function calculates & writes
// In Cloud Function:
await userRef.update({
  points: admin.firestore.FieldValue.increment(50),
});

// ❌ WRONG - Client tries to set points
// This fails in security rules!
await userRef.update({
  points: 500,
});
```

### 3. Predictions Lock Time
```typescript
// ✅ CORRECT - Check against server timestamp
const now = new Date();
const isLocked = now > match.predictionLockTime.toDate();

// ❌ WRONG - Trusting client time
const isLocked = new Date() > match.predictionLockTime;
```

---

## Testing Checklist

### Before Going Live

- [ ] **Anonymous Login**: User can login without phone
- [ ] **Prediction Submit**: Can submit prediction, locked after time
- [ ] **Battle Pick**: Can select player for all 3 battle types
- [ ] **Leaderboard**: Points show correctly after over completes
- [ ] **Crown Award**: User gets crown for match champion
- [ ] **Private Room**: Can create room and invite friend
- [ ] **Notifications**: Get FCM notification on important events
- [ ] **Offline**: Offline changes sync when online

### Emulator Testing

```bash
# Start emulators
firebase emulators:start

# Test in frontend
# Go to http://localhost:4000 (Emulator Suite)
# Can see Firestore data in real-time
# Can trigger Cloud Functions from CLI
```

---

## Common Tasks

### Add New Match Type
```typescript
// 1. Update SCHEMA.md with new type
matchType: "COUNTY" | "T20" | "ODI" | "TEST"

// 2. Update cricketAPI.ts normalization
type: apiMatch.format === 'county' ? 'COUNTY' : 'T20'

// 3. No rule changes needed (open read)
```

### Add New Crown Type
```typescript
// 1. Update SCHEMA.md with new category
"quizStats.specialCrownsEarned": number

// 2. Update updateQuizProgress() function
// 3. Update assignMatchChampionCrown() function
// 4. Frontend shows new icon/animation
```

### Change Prediction Lock Time
```typescript
// In fetchAndSyncMatches():
predictionLockTime: admin.firestore.Timestamp.fromDate(
  new Date(apiMatch.startDate.getTime() + 10 * 60 * 1000) // Changed from 5 to 10 minutes
)

// Redeploy: npm run deploy
```

### Add New Notification Type
```typescript
// 1. Update Firestore schema
type: "MATCH_STARTING" | "PREDICTION_CLOSING" | "BATTLE_RESULT" | "CROWN_EARNED" | "NEW_TYPE"

// 2. Add sendNotification() call in appropriate function

// 3. Handle in frontend (optional, for UI display)
```

---

## Debugging

### View Function Logs
```bash
firebase functions:log
```

### Check Firestore
```bash
# In Firebase Console:
# Firestore Database → Collections → Inspect data
# Can see all documents in real-time
```

### Check Auth
```bash
# In Firebase Console:
# Authentication → Users → See all signed-in users
```

### Check FCM
```bash
# In Firebase Console:
# Cloud Messaging → Monitor deliveries
```

### Local Emulator Suite
```bash
# Access at: http://localhost:4000
# Can see:
# - Firestore data
# - Function logs
# - Auth users
# - More features
```

---

## Troubleshooting

### "Project not found"
```bash
firebase use --add
# Select your project
```

### "Permission denied" Error
```bash
# Update security rules
firebase deploy --only firestore:rules
```

### "Function timeout"
```bash
# Increase in firebase.json:
"functions": {
  "timeoutSeconds": 120
}
```

### "Points not updating"
```bash
# Check:
1. Cloud Function executed (logs show no error)
2. User has submitted prediction (Firestore shows doc)
3. Lock time has passed (check timestamp)
4. Backend can read match data (full scorecard present)
```

### "Notifications not received"
```bash
# Check:
1. FCM token saved in user document
2. Device has notification permission
3. App is subscribed to topic
4. FCM service working in Firebase Console
```

---

## Performance Tips

### Optimize Reads
```typescript
// ❌ Slow - fetches entire collection
const all = await getDocs(collection(db, "leaderboards"));

// ✅ Fast - fetches limited results
const q = query(
  collection(db, "leaderboards"),
  limit(10),
  orderBy("totalPoints", "desc")
);
const results = await getDocs(q);
```

### Batch Writes
```typescript
// ❌ Slow - 100 separate write operations
for (const user of users) {
  await updateUser(user);
}

// ✅ Fast - 1 batch operation
const batch = db.batch();
for (const user of users) {
  batch.update(userRef, { points: user.points });
}
await batch.commit();
```

### Cache Static Data
```typescript
// Frontend: Cache match data
const [matches, setMatches] = useState(null);

useEffect(() => {
  if (!matches) {
    fetchMatches().then(setMatches);
  }
}, []);
```

---

## Deployment Steps

### Test Locally First
```bash
# Start emulators
firebase emulators:start

# Run frontend with emulator
# Test all features
```

### Deploy to Staging
```bash
# Create separate Firebase project
firebase use staging

# Deploy rules
firebase deploy --only firestore:rules

# Deploy functions
firebase functions:deploy
```

### Deploy to Production
```bash
# Switch to production project
firebase use production

# Deploy rules (review them first!)
firebase deploy --only firestore:rules

# Deploy functions (with same caution)
firebase functions:deploy

# Monitor immediately after
firebase functions:log --follow
```

---

## Security Best Practices

### ✅ Do

- Use server timestamps only
- Validate user UID in Cloud Functions
- Write points only in Cloud Functions
- Keep API keys in environment variables
- Enable Firestore rules in production
- Monitor access logs
- Rate limit API endpoints
- Use HTTPS only

### ❌ Don't

- Trust client timestamps
- Let client write points
- Hardcode API keys
- Disable Firestore rules
- Allow unlimited function calls
- Store sensitive data unencrypted
- Expose internal APIs
- Skip security audit

---

## Next: Build Phase

Once working locally, you can:

1. **Add more screens**
   - Player details
   - Historical stats
   - Settings/profile
   - Rules explanation

2. **Improve UI**
   - Real design (not just Text + Button)
   - Animations
   - Dark mode
   - Theming system

3. **Add features**
   - Social (follow, chat)
   - Achievements
   - Daily challenges
   - Replays

4. **Launch**
   - App Store (iOS)
   - Google Play (Android)
   - Public beta testing
   - Marketing

---

## Help & Support

1. **Code Issues**: Check [backend/functions/src/index.ts](backend/functions/src/index.ts)
2. **Database Issues**: Check [backend/firestore/schema/SCHEMA.md](backend/firestore/schema/SCHEMA.md)
3. **Security Issues**: Check [backend/firestore/rules/firestore.rules](backend/firestore/rules/firestore.rules)
4. **Setup Issues**: Check [DEPLOYMENT.md](DEPLOYMENT.md)
5. **API Integration**: Check [backend/functions/src/cricketAPI.ts](backend/functions/src/cricketAPI.ts)

---

**Build Status**: ✅ Ready for Development  
**Last Updated**: December 2024
