# Environment Configuration Guide

## Backend Configuration

### 1. Firebase Project Setup

Create `.firebaserc` in project root:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 2. Cloud Functions Environment Variables (Optional)

Create `backend/functions/.env`:

```env
# Cricket API Configuration
CRICKET_API_KEY=your_api_key
CRICKET_API_URL=https://api.cricapi.com/v1
CRICKET_API_MATCH_TYPES=t20,odi,test

# FCM Configuration
FCM_SERVER_KEY=your_fcm_server_key

# App Configuration
REGION=asia-south1
MATCH_SYNC_INTERVAL=1800000  # 30 minutes in milliseconds
PREDICTION_LOCK_MINUTES=5
```

Load in Cloud Functions using:
```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.CRICKET_API_KEY;
```

## Frontend Configuration

### 1. Firebase Config

Create or update `frontend/src/lib/firebase.ts`:

```typescript
// Get these from Firebase Console → Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc...",
};
```

### 2. Environment Variables

Create `frontend/.env`:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Development
EXPO_PUBLIC_DEV_MODE=false
EXPO_PUBLIC_USE_EMULATOR=false

# Cricket API
EXPO_PUBLIC_CRICKET_API_BASE_URL=https://api.cricapi.com/v1
```

### 3. Loading Environment Variables in Frontend

```typescript
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  // ... other fields
};
```

## Cricket API Integration

### Supported APIs

#### 1. Cricapi (Recommended)
- Website: https://cricapi.com
- Free tier: 300 requests/month
- Endpoints: `/currentMatches`, `/matches`, `/matchInfo`

```typescript
// Example
const response = await axios.get(
  'https://api.cricapi.com/v1/currentMatches',
  { params: { apikey: CRICKET_API_KEY } }
);
```

#### 2. ESPNcricinfo (Web Scraping)
- Website: https://www.espncricinfo.com
- Free: Requires scraping
- Libraries: cheerio, puppeteer

```typescript
// Example with cheerio
const $ = cheerio.load(html);
const matches = $('a.matches').map((i, el) => ({
  matchId: $(el).attr('href'),
  // ... extract data
})).get();
```

#### 3. CricketData
- Website: https://cricketdata.com
- API required
- Better documentation than Cricapi

```typescript
// Example
const response = await axios.get(
  'https://cricketdata.com/api/matches',
  { headers: { 'x-api-key': CRICKET_API_KEY } }
);
```

### Match Data Normalization

Example normalization function:

```typescript
function normalizeMatchData(apiMatch: any): Match {
  return {
    matchId: apiMatch.id || apiMatch.matchId,
    teams: {
      team1: {
        name: apiMatch.teams[0]?.name || apiMatch.team1,
        imageUrl: apiMatch.teams[0]?.imageUrl || '',
      },
      team2: {
        name: apiMatch.teams[1]?.name || apiMatch.team2,
        imageUrl: apiMatch.teams[1]?.imageUrl || '',
      },
    },
    seriesName: apiMatch.series || apiMatch.seriesName,
    matchType: apiMatch.type?.toUpperCase() || 'T20',
    venue: apiMatch.venue || 'TBD',
    tossWinner: apiMatch.toss?.winner || '',
    tossDecision: apiMatch.toss?.decision?.toUpperCase() || 'BAT',
    startTime: admin.firestore.Timestamp.fromDate(
      new Date(apiMatch.startDate)
    ),
    status: mapStatus(apiMatch.status),
    scorecard: {
      innings1: mapInnings(apiMatch.innings?.[0]),
      innings2: mapInnings(apiMatch.innings?.[1]),
    },
    innings: {
      current: apiMatch.currentInnings || 1,
      currentOver: apiMatch.currentOver || 0,
      currentBall: apiMatch.currentBall || 0,
    },
    squads: {
      team1: apiMatch.teams[0]?.squad || [],
      team2: apiMatch.teams[1]?.squad || [],
    },
    predictionLockTime: admin.firestore.Timestamp.fromDate(
      new Date(apiMatch.startDate.getTime() + 5 * 60 * 1000)
    ),
    battlesLockTime: admin.firestore.Timestamp.fromDate(
      new Date(apiMatch.startDate.getTime() + 
        (parseInt(apiMatch.innings?.[0]?.overs || '50') * 6 * 1000))
    ),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}
```

## Development vs Production

### Development Configuration

```env
# Use emulators
EXPO_PUBLIC_USE_EMULATOR=true

# Mock cricket data (optional)
EXPO_PUBLIC_USE_MOCK_DATA=true

# Verbose logging
EXPO_PUBLIC_DEBUG=true
```

### Production Configuration

```env
# Use real Firebase
EXPO_PUBLIC_USE_EMULATOR=false

# Real cricket API
EXPO_PUBLIC_USE_MOCK_DATA=false

# Minimal logging
EXPO_PUBLIC_DEBUG=false
```

## Secrets Management

### For Local Development

1. Create `.env.local` (git-ignored):
   ```env
   CRICKET_API_KEY=your_secret_key
   FCM_SERVER_KEY=your_secret
   ```

2. Load in code:
   ```typescript
   const apiKey = process.env.CRICKET_API_KEY;
   ```

### For Firebase Cloud Functions

1. Set via Firebase CLI:
   ```bash
   firebase functions:config:set cricketapi.key="your_key"
   firebase functions:config:set fcm.serverkey="your_key"
   ```

2. Access in code:
   ```typescript
   import * as functions from 'firebase-functions';
   const apiKey = functions.config().cricketapi.key;
   ```

### For Frontend (Expo)

Expo securely stores secrets in `app.json`:

```json
{
  "expo": {
    "extra": {
      "firebaseApiKey": "AIzaSyD...",
      "cricketApiKey": "your_key"
    }
  }
}
```

Access via:
```typescript
import Constants from 'expo-constants';
const apiKey = Constants.expoConfig?.extra?.cricketApiKey;
```

## Testing Configuration

### Unit Tests

Create `backend/functions/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

### Integration Tests

```bash
# Start emulators
firebase emulators:start

# Run tests against emulator
npm run test:integration
```

## Security Checklist

- [ ] Never commit `.env` files
- [ ] Rotate API keys regularly
- [ ] Use environment-specific keys
- [ ] Keep secrets in Firebase Secret Manager (prod)
- [ ] Use read-only API keys where possible
- [ ] Monitor API usage for abuse
- [ ] Implement rate limiting
- [ ] Use HTTPS everywhere
- [ ] Enable Firebase Security Rules
- [ ] Enable Firestore backups

## Troubleshooting

**"Firebase config not found"**
- Ensure `.env` is loaded before Firebase initialization
- Check paths are correct
- Verify all required fields are present

**"Cricket API returning 401"**
- Check API key is correct
- Verify API key has permission for endpoints used
- Check request rate limits not exceeded

**"FCM token not received"**
- Ensure VAPID key is correct
- Check notification permissions granted
- Verify FCM is initialized before requesting token

**"Emulator connection refused"**
- Start emulators: `firebase emulators:start`
- Verify ports 8080, 5001, 9099 are available
- Check firewall not blocking localhost

---

For more information, see [DEPLOYMENT.md](DEPLOYMENT.md)
