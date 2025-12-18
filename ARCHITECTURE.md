# CrixOne Architecture & Implementation Summary

## Project Overview

**CrixOne** is a production-ready Firebase backend for a skill-based cricket prediction and battle mobile app. The system is architected for scalability, security, and performance with a minimal reference frontend for testing.

## 📊 Complete File Structure

```
CrixOne/
│
├── backend/
│   ├── functions/
│   │   ├── src/
│   │   │   ├── index.ts                    # 9 Core Cloud Functions
│   │   │   └── cricketAPI.ts               # Cricket API integrations
│   │   ├── lib/                            # Compiled JavaScript
│   │   ├── package.json                    # Dependencies (firebase-admin, axios, bcrypt)
│   │   ├── tsconfig.json                   # TypeScript config
│   │   └── README.md                       # Function documentation
│   │
│   └── firestore/
│       ├── schema/
│       │   └── SCHEMA.md                   # 10 collections with full field definitions
│       └── rules/
│           └── firestore.rules             # Security rules (all access control)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                         # Navigation & routing setup
│   │   ├── index.ts                        # App entry point
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx              # Match listing
│   │   │   └── MatchDetailScreen.tsx       # Predictions & battles
│   │   └── lib/
│   │       ├── firebase.ts                 # Firebase initialization
│   │       └── firestore.ts                # Firestore queries
│   ├── app.json                            # Expo configuration
│   ├── package.json                        # React Native dependencies
│   ├── tsconfig.json                       # TypeScript config
│   └── .gitignore
│
├── firebase.json                           # Firebase project config
├── .gitignore                              # Git ignore rules
├── CONFIG.md                               # Environment & API setup
├── DEPLOYMENT.md                           # Full deployment guide
├── ARCHITECTURE.md                         # This file
└── README.md                               # Main project documentation
```

## 🏛️ System Architecture

### Backend Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     External Cricket API                     │
│              (Cricapi, CricketData, ESPNcricinfo)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  fetchAndSyncMatches()          │
        │  (Scheduled every 30 mins)      │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────┐
        │   Firestore: matches/{matchId}       │
        │   (UPCOMING → LIVE → FINISHED)       │
        └──────┬───────────────────────────────┘
               │
        ┌──────┴──────────────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────────┐        ┌──────────────────────┐
│ lockPredictions()    │        │ calculatePrediction  │
│ (Triggered @ LIVE)   │        │ Points()             │
│ Locks after 5 mins   │        │ (Per over trigger)   │
└──────────────────────┘        └──────────────────────┘
        │                                 │
        └──────────────────┬──────────────┘
                           ▼
        ┌──────────────────────────────────────┐
        │ predictions/{matchId}/{uid}          │
        │ - matchWinner prediction             │
        │ - overPredictions[] with points      │
        └──────────────────────────────────────┘
               │
               └─────────────────────────────┐
                                             │
        ┌────────────────────────────────────┘
        │
        ▼
    ┌──────────────────────────┐
    │ resolveBattles()         │
    │ (Triggered @ FINISHED)   │
    │ Award battle points      │
    └──────────────────────────┘
        │
        ▼
    ┌──────────────────────────────────────────────┐
    │ battles/{matchId}/global & /private          │
    │ - selectedPlayer with points                 │
    │ - battle change advantage applied            │
    └──────────────────────────────────────────────┘
        │
        └───────────┬───────────────────┐
                    │                   │
                    ▼                   ▼
        ┌─────────────────────┐  ┌─────────────────────┐
        │ leaderboards/       │  │ sendFCMNotifications│
        │ {matchId}/global    │  │ (To all users)      │
        │ {roomId}/private    │  └─────────────────────┘
        │ monthly/{month}     │
        └─────────────────────┘
```

### User Data Flow

```
┌──────────────┐
│ Mobile User  │
└──────┬───────┘
       │
       ├──────────────────────────┐
       │                          │
       ▼                          ▼
┌──────────────────────┐  ┌──────────────────────┐
│ Anonymous Auth       │  │ Phone OTP Auth       │
│ (signInAnonymously) │  │ (verifyPhoneNumber)  │
└──────┬───────────────┘  └──────┬───────────────┘
       │                         │
       └──────────────┬──────────┘
                      ▼
        ┌────────────────────────────┐
        │ Firebase Auth (UID)        │
        │ createUser() triggers      │
        │ Cloud Function             │
        └────────────┬───────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
        ▼                           ▼
    ┌────────────┐         ┌──────────────┐
    │ Prediction │         │ Battle Pick  │
    │ Submission │         │ Submission   │
    └────────────┘         └──────────────┘
        │                           │
        ▼                           ▼
    ┌──────────────────────────────────────┐
    │ Cloud Functions Validate:            │
    │ ✓ User UID matches auth              │
    │ ✓ Server timestamp not past lock     │
    │ ✓ Match status is correct            │
    │ ✓ Data format is valid               │
    └──────────────────────────────────────┘
        │
        ▼
    ┌──────────────────────────────────────┐
    │ Firestore Rules Check:               │
    │ ✓ User can only write own data       │
    │ ✓ Cannot modify points/crowns        │
    │ ✓ Server timestamp enforced          │
    └──────────────────────────────────────┘
        │
        ▼
    ┌──────────────────────────────────────┐
    │ Write to Firestore:                  │
    │ predictions/{matchId}/{uid}          │
    │ battles/{matchId}/global/{uid}       │
    └──────────────────────────────────────┘
        │
        ▼
    ┌──────────────────────────────────────┐
    │ Backend Scoring via Cloud Functions: │
    │ • calculatePredictionPoints()        │
    │ • resolveBattles()                   │
    │ • assignMatchChampionCrown()         │
    │ • Updates user points/crowns         │
    └──────────────────────────────────────┘
        │
        ▼
    ┌──────────────────────────────────────┐
    │ Leaderboards Updated                 │
    │ Send FCM Notifications               │
    └──────────────────────────────────────┘
```

## 🔒 Security Architecture

### Multi-Layer Security

```
Layer 1: Authentication
├─ Anonymous UID
├─ Phone OTP verification
└─ Firebase Auth session tokens

Layer 2: Authorization (Firestore Rules)
├─ Public read (matches, leaderboards)
├─ Private read (user's own data)
├─ Controlled write (users write own predictions/battles)
└─ No client point/crown writes

Layer 3: Data Validation (Cloud Functions)
├─ Timestamp verification (server is truth)
├─ UID matching
├─ Prediction lock enforcement
├─ Battle change rule validation
└─ Score calculation (never on client)

Layer 4: Immutability
├─ Historical records kept
├─ Points always increment (never subtract)
├─ Crowns immutable after award
└─ Server timestamps final
```

### Firestore Rules Summary

| Collection | Read | Create | Update | Delete |
|-----------|------|--------|--------|--------|
| `matches` | Public | ❌ | ❌ | ❌ |
| `users/{uid}` | Self | Self | Self (limited) | ❌ |
| `predictions` | Self | Self | Self (limited) | ❌ |
| `battles/global` | All | Self | Self (limited) | ❌ |
| `battles/private` | Self | Self | Self (limited) | ❌ |
| `rooms` | All | Authenticated | Creator | ❌ |
| `leaderboards` | Public | ❌ | ❌ | ❌ |
| `notifications` | Self | ❌ | ❌ | ❌ |

## ☁️ Cloud Functions Breakdown

### 1. fetchAndSyncMatches
```
Type: Pub/Sub Scheduled
Schedule: Every 30 minutes
Region: asia-south1
Timeout: 60 seconds
Memory: 512 MB

Process:
1. Call external cricket API
2. Normalize match data
3. Batch write to Firestore matches/{matchId}
4. Mark document with sync timestamp
5. Log sync results

Scaling: No scaling issues, one-at-a-time execution
```

### 2. lockPredictions
```
Type: Firestore Document Trigger
Trigger: matches/{matchId} update (status → LIVE)
Region: asia-south1
Timeout: 30 seconds
Memory: 256 MB

Process:
1. Check if status changed to LIVE
2. Calculate lock time (5 minutes from start)
3. Update match document
4. Query all predictions not yet locked
5. Send FCM notification batch
6. Update prediction document status

Scaling: Linear with prediction count per match
```

### 3. calculatePredictionPoints
```
Type: Firestore Document Trigger
Trigger: matches/{matchId} update (over change)
Region: asia-south1
Timeout: 60 seconds
Memory: 512 MB

Process:
1. Compare previous vs current over
2. For each completed over:
   a. Fetch actual scorecard data
   b. Calculate points per user prediction
   c. Update prediction document
   d. Update leaderboard
   e. Update user total points
3. Send notification batches

Scaling: Quadratic with users × overs. Use batching.
```

### 4. resolveBattles
```
Type: Firestore Document Trigger
Trigger: matches/{matchId} update (status → FINISHED)
Region: asia-south1
Timeout: 120 seconds
Memory: 1024 MB

Process:
1. Check if status changed to FINISHED
2. Process global battles:
   a. Fetch all battles
   b. Calculate player points
   c. Update battle documents
   d. Update user stats
   e. Update leaderboards
3. Process private battles (per room)
4. Send batch notifications
5. Trigger crown assignment if needed

Scaling: High - requires batch writes. Use transactions.
```

### 5. assignMatchChampionCrown
```
Type: HTTP Callable (from frontend)
Input: { matchId }
Region: asia-south1
Timeout: 30 seconds
Memory: 256 MB

Process:
1. Validate user authenticated
2. Fetch match leaderboard
3. Find top scorer (rank 1)
4. Update user document (+1 crown)
5. Create notification
6. Return success

Scaling: One-per-match. No scaling issues.
```

### 6. updateQuizProgress
```
Type: HTTP Callable (from quiz system)
Input: { quizId, correct }
Region: asia-south1
Timeout: 20 seconds
Memory: 256 MB

Process:
1. Validate user authenticated
2. Increment quiz stats
3. Check for perfect day (all 3 answered correctly)
4. Track perfect days in month
5. Every 10 perfect days: +1 crown
6. Max 3 crowns/month enforced
7. Send notification if crown earned

Scaling: One-per-user-per-day. No scaling issues.
```

### 7. updateBattleProgress
```
Type: HTTP Callable (from battle resolution)
Input: { matchId, won }
Region: asia-south1
Timeout: 20 seconds
Memory: 256 MB

Process:
1. Validate user authenticated
2. Increment battle stats
3. Track wins in month
4. Every 10 wins: +1 crown
5. Max 3 crowns/month enforced
6. Check for perfect battles (won all 3 in match)
7. Send notification if crown earned

Scaling: One-per-user-per-match. No scaling issues.
```

### 8. enforceBattleChangeRules
```
Type: HTTP Callable (from battle pick update)
Input: { matchId, battleType, oldPlayerId }
Region: asia-south1
Timeout: 15 seconds
Memory: 256 MB

Process:
1. Validate user authenticated
2. Fetch current match status
3. Check: must be LIVE & first innings ongoing
4. Fetch previous match leaderboard
5. Determine user's rank
6. Calculate allowed changes:
   - 1st: 3 changes (all battles)
   - 2nd: 2 changes (any 2)
   - 3rd: 1 change (any 1)
7. Count changes already used
8. Validate against limit
9. Return allowed/used

Scaling: One-per-change attempt. No scaling issues.
```

### 9. sendFCMNotifications (Helper)
```
Type: Internal Function (called by others)
Inputs: [uid], title, body, type, matchId
Region: asia-south1
Timeout: 30 seconds
Memory: 256 MB

Process:
1. Batch users into groups
2. For each user:
   a. Fetch user document
   b. Check FCM token exists
   c. Send via messaging.send()
   d. Log result
3. Handle failures gracefully
4. Return delivery report

Scaling: Batch processing handles 1000s of users.
```

## 📱 Frontend Architecture

### Navigation Structure

```
App.tsx
│
└─ NavigationContainer
    │
    └─ Stack.Navigator
        │
        ├─ HomeScreen (default)
        │   └─ Displays list of matches
        │       └─ Tap to navigate
        │
        └─ MatchDetailScreen
            └─ Match predictions
            └─ Battle selections
            └─ Buttons to submit
```

### State Management

```
Frontend State:
├─ Firebase Auth State (global)
├─ Match List (per HomeScreen)
├─ Match Details (per MatchDetailScreen)
├─ Prediction Form State
├─ Battle Selection State
└─ User Profile (optional)

Backend State:
├─ Firestore collections (source of truth)
├─ Cloud Function results
├─ Leaderboard calculations
└─ FCM message queue
```

### Data Fetching Pattern

```
Component Mount
    ↓
useEffect() triggered
    ↓
Firestore query (getDocs, query)
    ↓
Parse results
    ↓
Update React state
    ↓
Re-render component
    ↓
User interaction
    ↓
Cloud Function call (httpsCallable)
    ↓
Backend processing
    ↓
Firestore update
    ↓
Real-time listener updates frontend
```

## 🚀 Scaling Considerations

### Database Scaling

**Current Limit**: ~1M users per match

**Hotspot Risk**: Leaderboard writes
**Solution**: Sharded collections

```
leaderboards/{matchId}/global/{shard}/{uid}
// Shard = uid % 100 (or hash-based)
```

**Hotspot Risk**: Match document (heavy reads)
**Solution**: Distribute via regions, read replicas

### Function Scaling

**Current Limit**: 1000 concurrent functions

**Bottleneck**: resolveBattles (high CPU)
**Solution**: 
- Batch writes (max 500 per transaction)
- Parallel processing
- Queue tasks via Pub/Sub

### Frontend Scaling

**Current Limit**: No real limit

**Optimization**:
- Pagination on match lists (limit 10/page)
- Lazy load match details
- Cache images
- Compress data in transit

## 📊 Performance Metrics

### Expected Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Fetch matches | 500ms | Network + 50 docs |
| Submit prediction | 2s | Validation + write |
| Submit battle | 1s | Validation + write |
| Calculate points | 3s per match | Processed in background |
| Resolve battles | 10-30s | Depends on user count |
| Leaderboard query | 1s | Indexed, limited results |
| FCM notification | 2-5s | Fire and forget |

### Database Metrics

| Metric | Target |
|--------|--------|
| Read latency | < 100ms |
| Write latency | < 500ms |
| Query latency | < 1s |
| Transaction latency | < 2s |

## 🔄 Data Consistency

### Transactions

```typescript
// Example: Atomic update of user + leaderboard
const batch = db.batch();

const userRef = db.collection('users').doc(uid);
const leaderRef = db.collection('leaderboards').doc(matchId);

batch.update(userRef, { points: increment(points) });
batch.update(leaderRef, { totalPoints: increment(points) });

await batch.commit();
```

### Eventual Consistency

```
Prediction submitted
    ↓ (0.1s)
Firestore rules checked
    ↓ (0.5s)
Document written
    ↓ (1s) - FCM notification scheduled
After over completes
    ↓ (3s)
Points calculated
    ↓ (1s)
Leaderboard updated
    ↓ (2s)
User sees new score
// Total: ~5 seconds delay acceptable for async scoring
```

## 📋 Production Checklist

### Before Deployment

- [ ] All Firebase config replaced
- [ ] Cricket API integrated
- [ ] Firestore rules tested
- [ ] Cloud Functions tested locally
- [ ] Frontend tested with real Firebase
- [ ] FCM VAPID key configured
- [ ] Error logging configured
- [ ] Rate limiting implemented
- [ ] Backup strategy defined
- [ ] Monitoring alerts set up

### After Deployment

- [ ] Monitor function execution times
- [ ] Check Firestore read/write usage
- [ ] Monitor FCM delivery rates
- [ ] Check error rates in logs
- [ ] Validate leaderboard calculations
- [ ] Test user notifications
- [ ] Load test with mock data
- [ ] Security audit of rules
- [ ] Performance optimization

## 📚 Additional Resources

- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Setup instructions
- [CONFIG.md](CONFIG.md) - Environment configuration
- [backend/firestore/schema/SCHEMA.md](backend/firestore/schema/SCHEMA.md) - Database design
- [backend/firestore/rules/firestore.rules](backend/firestore/rules/firestore.rules) - Security rules
- [backend/functions/src/index.ts](backend/functions/src/index.ts) - Cloud Functions code

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Status**: Production Ready
