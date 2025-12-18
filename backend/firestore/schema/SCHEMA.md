# CrixOne Firestore Schema

## Collection Structure

### 1. matches/{matchId}
Live match data fetched from external cricket API and normalized.

```json
{
  "matchId": "string (unique)",
  "teams": {
    "team1": {
      "name": "string",
      "imageUrl": "string"
    },
    "team2": {
      "name": "string",
      "imageUrl": "string"
    }
  },
  "seriesName": "string",
  "matchType": "T20 | ODI | TEST",
  "venue": "string",
  "tossWinner": "string (team name)",
  "tossDecision": "BAT | BOWL",
  "startTime": "timestamp (server timestamp)",
  "status": "UPCOMING | LIVE | FINISHED",
  "scorecard": {
    "innings1": {
      "team": "string",
      "runs": "number",
      "wickets": "number",
      "overs": "number"
    },
    "innings2": {
      "team": "string",
      "runs": "number",
      "wickets": "number",
      "overs": "number"
    }
  },
  "innings": {
    "current": "number (1 or 2)",
    "currentOver": "number",
    "currentBall": "number"
  },
  "squads": {
    "team1": [
      {
        "playerId": "string",
        "name": "string",
        "role": "BATTER | BOWLER | ALL_ROUNDER",
        "imageUrl": "string"
      }
    ],
    "team2": [
      {
        "playerId": "string",
        "name": "string",
        "role": "BATTER | BOWLER | ALL_ROUNDER",
        "imageUrl": "string"
      }
    ]
  },
  "predictionLockTime": "timestamp (innings start + 5 mins)",
  "battlesLockTime": "timestamp (first innings end)",
  "createdAt": "timestamp (server timestamp)"
}
```

### 2. users/{uid}
User profile and stats.

```json
{
  "uid": "string (Firebase Auth UID)",
  "email": "string (optional, for phone OTP users)",
  "phoneNumber": "string (optional, for phone OTP users)",
  "authType": "ANONYMOUS | PHONE",
  "displayName": "string (optional)",
  "points": "number (default: 0)",
  "crowns": "number (default: 0)",
  "xp": "number (default: 0)",
  "createdAt": "timestamp (server timestamp)",
  "lastActiveAt": "timestamp (server timestamp)",
  "unlockedThemes": ["string array of theme IDs"],
  "selectedTheme": "string (default theme ID)",
  "fcmToken": "string (for push notifications)",
  "quizStats": {
    "totalQuizzesAttempted": "number",
    "correctAnswers": "number",
    "currentStreak": "number",
    "lastQuizDate": "timestamp",
    "totalCrownsEarned": "number",
    "perfectDaysInMonth": ["date strings"]
  },
  "battleStats": {
    "totalBattles": "number",
    "wins": "number",
    "losses": "number",
    "totalCrownsEarned": "number",
    "perfectBattlesInMonthCount": "number",
    "perfectBattleMatches": ["matchId array"]
  }
}
```

### 3. predictions/{matchId}/{uid}
User predictions for a match.

```json
{
  "uid": "string",
  "matchId": "string",
  "matchWinner": "string (team name or null before prediction)",
  "overPredictions": [
    {
      "over": "number",
      "predictedRuns": "number",
      "actualRuns": "number (populated after over)",
      "points": "number (populated after over)",
      "locked": "boolean"
    }
  ],
  "totalPredictionPoints": "number (default: 0)",
  "lockedAt": "timestamp",
  "submittedAt": "timestamp (server timestamp)"
}
```

### 4. battles/{matchId}/global/{uid}
Global (public) battle participation.

```json
{
  "uid": "string",
  "matchId": "string",
  "battleType": "BATTER_VS_BATTER | ALLROUNDER_VS_ALLROUNDER | BOWLER_VS_BOWLER",
  "selectedPlayer": {
    "playerId": "string",
    "playerName": "string",
    "team": "string"
  },
  "points": "number (default: 0)",
  "rank": "number (populated after battle resolution)",
  "lockedAt": "timestamp",
  "changed": "boolean (if player was changed via advantage)",
  "changedAt": "timestamp (if changed)",
  "submittedAt": "timestamp (server timestamp)"
}
```

### 5. battles/{matchId}/private/{roomId}/{uid}
Private battle participation.

```json
{
  "uid": "string",
  "matchId": "string",
  "roomId": "string",
  "battleType": "BATTER_VS_BATTER | ALLROUNDER_VS_ALLROUNDER | BOWLER_VS_BOWLER",
  "selectedPlayer": {
    "playerId": "string",
    "playerName": "string",
    "team": "string"
  },
  "points": "number (default: 0)",
  "lockedAt": "timestamp",
  "changed": "boolean",
  "changedAt": "timestamp",
  "submittedAt": "timestamp (server timestamp)"
}
```

### 6. rooms/{roomId}
Private battle room details.

```json
{
  "roomId": "string",
  "matchId": "string",
  "battleType": "BATTER_VS_BATTER | ALLROUNDER_VS_ALLROUNDER | BOWLER_VS_BOWLER",
  "passwordHash": "string (bcrypt hash)",
  "createdBy": "string (uid)",
  "createdAt": "timestamp (server timestamp)",
  "updatedAt": "timestamp (server timestamp)",
  "participants": ["uid array"],
  "isActive": "boolean"
}
```

### 7. leaderboards/{matchId}/global/{uid}
Per-match global leaderboard.

```json
{
  "uid": "string",
  "matchId": "string",
  "totalPoints": "number",
  "rank": "number",
  "predictions": "number",
  "battles": "number",
  "updatedAt": "timestamp (server timestamp)"
}
```

### 8. leaderboards/{matchId}/private/{roomId}/{uid}
Private room leaderboard.

```json
{
  "uid": "string",
  "matchId": "string",
  "roomId": "string",
  "totalPoints": "number",
  "rank": "number",
  "updatedAt": "timestamp (server timestamp)"
}
```

### 9. leaderboards/monthly/{month}/{uid}
Monthly leaderboard.

```json
{
  "uid": "string",
  "month": "string (YYYY-MM)",
  "totalPoints": "number",
  "crownsEarned": "number",
  "rank": "number",
  "updatedAt": "timestamp (server timestamp)"
}
```

### 10. notifications/{uid}/{notificationId}
User notifications for FCM.

```json
{
  "notificationId": "string",
  "uid": "string",
  "type": "MATCH_STARTING | PREDICTION_CLOSING | BATTLE_RESULT | CROWN_EARNED",
  "title": "string",
  "body": "string",
  "matchId": "string (optional)",
  "read": "boolean (default: false)",
  "createdAt": "timestamp (server timestamp)"
}
```

## Key Design Decisions

1. **Server Timestamps Only**: All timestamps use Firestore server timestamps to prevent client manipulation.
2. **No Client Point Writing**: Clients cannot write points or crowns; Cloud Functions handle all scoring.
3. **Prediction Lock**: Frontend enforces lock display; backend validates timestamps.
4. **Battle Change Advantage**: Stored in battle document; enforced by `enforceBattleChangeRules()`.
5. **Distributed Leaderboards**: Separate global and private leaderboards for accurate ranking.

## Indexes Needed

- `leaderboards/matchId/global`: Compound index (matchId, totalPoints DESC, updatedAt DESC)
- `leaderboards/monthly/month`: Compound index (month, totalPoints DESC)
- `predictions/{matchId}`: Compound index (matchId, submittedAt DESC)
- `battles/{matchId}/global`: Compound index (matchId, submittedAt DESC)
