# CrixOne - Cricket Prediction & Battle Backend

A complete Firebase-based backend for a skill-based cricket prediction and battle mobile app, built with **Expo/React Native** frontend reference implementation.

## 🎯 Overview

CrixOne is a **no-payment, no-betting** skill-based cricket prediction app where users can:

- **Predict** match outcomes and over-by-over results
- **Battle** in player selection challenges (3 types per match)
- **Compete** in global and private leaderboards
- **Earn** points and collectible crowns
- **Unlock** cosmetic themes with crowns

## 📁 Project Structure

```
CrixOne/
├── backend/
│   ├── functions/                    # Cloud Functions (Node.js 18+)
│   │   ├── src/
│   │   │   └── index.ts             # All 9 Cloud Functions
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── firestore/
│       ├── schema/
│       │   └── SCHEMA.md             # Firestore schema & design
│       └── rules/
│           └── firestore.rules       # Security rules
│
├── frontend/                         # Expo/React Native Reference
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx       # Match listing
│   │   │   └── MatchDetailScreen.tsx # Predictions & battles
│   │   └── lib/
│   │       ├── firebase.ts           # Firebase config & init
│   │       └── firestore.ts          # Firestore queries
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── firebase.json                     # Firebase configuration
├── DEPLOYMENT.md                     # Setup & deployment guide
└── README.md                         # This file
```

## 🚀 Quick Start

### Backend Deployment

1. **Initialize Firebase**
   ```bash
   cd CrixOne
   firebase init
   firebase use --add  # Select your project
   ```

2. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Deploy Cloud Functions**
   ```bash
   cd backend/functions
   npm install
   npm run deploy
   ```

4. **Create Firestore Collections** (via Firebase Console)

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Firebase** in `src/lib/firebase.ts`

3. **Run Locally**
   ```bash
   npm start
   # Press 'a' for Android or 'i' for iOS
   ```

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Firebase Firestore (NoSQL Database)
- Firebase Cloud Functions (Node.js 18+)
- Firebase Authentication (Anonymous + Phone OTP)
- Firebase Cloud Messaging (Push Notifications)

**Frontend (Reference):**
- Expo (React Native)
- TypeScript
- Firebase SDK
- React Navigation

### Key Design Principles

1. **Server Timestamps Only**: All timestamps are server-generated to prevent manipulation
2. **No Client Point Writing**: Cloud Functions exclusively handle all scoring
3. **Prediction Lock**: Backend validates against `predictionLockTime` timestamp
4. **Zero Payment**: No money, betting, or in-app purchases
5. **Skill-Based Only**: Rankings based on prediction accuracy and battle performance

## 📊 Firestore Schema

### Collections

- **matches/{matchId}**: Live cricket match data
- **users/{uid}**: User profiles with stats
- **predictions/{matchId}/{uid}**: User predictions
- **battles/{matchId}/global/{uid}**: Global battle picks
- **battles/{matchId}/private/{roomId}/{uid}**: Private battle picks
- **rooms/{roomId}**: Private room metadata
- **leaderboards/{matchId}/global/{uid}**: Match leaderboards
- **leaderboards/{matchId}/private/{roomId}/{uid}**: Room leaderboards
- **leaderboards/monthly/{month}/{uid}**: Monthly rankings
- **notifications/{uid}/{notificationId}**: User notifications

See [backend/firestore/schema/SCHEMA.md](backend/firestore/schema/SCHEMA.md) for detailed field definitions.

## 🔐 Security Rules

All rules are defined in [backend/firestore/rules/firestore.rules](backend/firestore/rules/firestore.rules)

**Key Rules:**
- ✅ Public read access to matches and global leaderboards
- ✅ Users can only read/write their own data
- ✅ Clients cannot write points, crowns, or rankings
- ✅ Backend enforces all score calculations
- ✅ Server timestamps prevent manipulation

## ☁️ Cloud Functions (9 Required)

| Function | Type | Purpose |
|----------|------|---------|
| `fetchAndSyncMatches` | Scheduled | Fetch cricket API data every 30 mins |
| `lockPredictions` | Trigger | Lock predictions 5 mins after match starts |
| `calculatePredictionPoints` | Trigger | Award points after each over completes |
| `resolveBattles` | Trigger | Calculate battle points when match finishes |
| `assignMatchChampionCrown` | Callable | Award crown to top scorer |
| `updateQuizProgress` | Callable | Track daily quiz & crown progress |
| `updateBattleProgress` | Callable | Track battle wins & consistency crowns |
| `enforceBattleChangeRules` | Callable | Validate rank-based change advantages |
| `sendFCMNotifications` | Helper | Send push notifications |

See [backend/functions/src/index.ts](backend/functions/src/index.ts) for full implementation.

## 🎮 Core Features

### 1. Predictions
- **Match Winner**: Predict team outcome
- **Over-by-Over**: Predict runs each over
- **Lock Mechanism**: Backend enforces `predictionLockTime`
- **Scoring**: Points awarded based on accuracy

### 2. Battles (3 Types Per Match)
- **Batter vs Batter**: Select your batter
- **All-rounder vs All-rounder**: Select your all-rounder
- **Bowler vs Bowler**: Select your bowler

**Picking Advantage** (based on previous rank):
- 🥇 1st Place: Change pick once in all 3 battles
- 🥈 2nd Place: Change pick once in any 2 battles
- 🥉 3rd Place: Change pick once in any 1 battle

### 3. Points & Scoring
- **Predictions**: Points based on accuracy
- **Battles**: Points based on player performance
- **Leaderboards**: Global & per-room rankings

### 4. Crowns (Cosmetic Rewards)
Earned through consistency, not payment:

- **Match Champion**: Highest points in match → 1 crown
- **Quiz Consistency**: 10 perfect days/month → 1 crown (max 3/month)
- **Battle Consistency**: 10 battle wins/month → 1 crown (max 3/month)

**Theme Unlocks**:
- 1 Crown → 1 IPL theme
- 2-8 Crowns → Remaining themes
- 10+ Crowns → Favorite team special theme

### 5. Leaderboards
- **Global**: All users ranked per match
- **Monthly**: Monthly rankings
- **Private Rooms**: Per-room rankings

## 📱 Frontend Features (Reference Implementation)

**HomeScreen**:
- List all upcoming, live, and finished matches
- Display match info (teams, series, venue, status)
- Navigate to match details

**MatchDetailScreen**:
- Submit match winner prediction
- Submit over-by-over predictions
- Select battle type (3 options)
- Select player for battle
- View submission status

**Notes**:
- Very basic UI (Text + Button)
- No complex design
- For testing and reference only
- Ready to be enhanced with real design

## 🔄 Data Flow

### Match Lifecycle

1. **UPCOMING**: New match created, users can predict
2. **LIVE**: Match starts
   - Predictions lock after 5 minutes
   - Users can still select battle picks
3. **FINISHED**: All over results calculated
   - Prediction points awarded
   - Battle points calculated
   - Leaderboards updated
   - Crowns assigned
   - Notifications sent

### User Scoring Flow

```
User submits prediction/battle
    ↓
Cloud Function validates timestamp
    ↓
Battle change rules enforced (if applicable)
    ↓
Points calculated based on performance
    ↓
User document updated (points, xp)
    ↓
Leaderboard entry created/updated
    ↓
Notification sent to user
```

## 🔔 Notifications (FCM)

Sent at key moments:
- `MATCH_STARTING`: Match begins soon
- `PREDICTION_CLOSING`: 5-minute lock warning
- `BATTLE_RESULT`: Battle resolved
- `CROWN_EARNED`: New crown awarded

## 📈 Scalability Considerations

- **Distributed Leaderboards**: Separate collections prevent hotspots
- **Batch Operations**: Cloud Functions use batch writes
- **Indexes**: Compound indexes for efficient queries
- **Sharding**: Ready for collection sharding if needed
- **Regional Functions**: Deployed to Asia-South1 for latency

## 🛠️ Development

### Local Development with Emulators

```bash
firebase emulators:start
```

Emulators started:
- Firestore (port 8080)
- Functions (port 5001)
- Auth (port 9099)

### Building & Testing

```bash
# Backend
cd backend/functions
npm run build    # Compile TypeScript
npm run serve    # Local testing

# Frontend
cd frontend
npm start        # Start Expo
```

### Linting & Type Checking

```bash
cd backend/functions
npx tsc --noEmit  # Type check
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Full setup instructions
- [Firestore Schema](backend/firestore/schema/SCHEMA.md) - Database design
- [Security Rules](backend/firestore/rules/firestore.rules) - Access control
- [Cloud Functions](backend/functions/src/index.ts) - Core logic

## ✅ Checklist for Production

- [ ] Replace Firebase config with real project
- [ ] Configure external cricket API
- [ ] Deploy Firestore rules
- [ ] Deploy all 9 Cloud Functions
- [ ] Create Firestore collections
- [ ] Set up FCM VAPID key
- [ ] Enable Firebase Monitoring
- [ ] Configure error alerting
- [ ] Test all prediction/battle flows
- [ ] Load test leaderboard queries
- [ ] Review security rules audit logs
- [ ] Enable automatic backups

## ❓ FAQ

**Q: Can users pay to win?**
A: No. CrixOne is 100% skill-based. No payment system exists.

**Q: How are points calculated?**
A: Backend Cloud Functions calculate based on prediction accuracy and player performance. No client manipulation possible.

**Q: Can a user change their prediction after locking?**
A: No. Backend enforces `predictionLockTime`. Frontend displays lock status.

**Q: What cricket API is recommended?**
A: Cricapi, ESPNcricinfo (scraping), or similar. Backend is API-agnostic.

**Q: How do private battles work?**
A: Users create a room with password, invite friends, and play. Scoring is same as global but on separate leaderboard.

**Q: Can users get infinite crowns?**
A: No. Monthly caps exist (3 per category = max 9/month).

## 🚀 Next Steps

1. Deploy backend to Firebase
2. Integrate with cricket API
3. Test all flows with emulators
4. Deploy frontend to TestFlight/Google Play
5. Monitor production metrics
6. Iterate based on user feedback

## 📞 Support

For issues or questions:
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
2. Review Cloud Function logs: `firebase functions:log`
3. Check Firestore audit logs in Console
4. Verify Firebase configuration matches project

## 📄 License

Private Project - All Rights Reserved

---

**Built with ❤️ for Cricket Enthusiasts**

Backend Version: 1.0.0
Frontend Version: 1.0.0
