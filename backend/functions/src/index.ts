import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface Match {
  matchId: string;
  teams: {
    team1: { name: string; imageUrl: string };
    team2: { name: string; imageUrl: string };
  };
  seriesName: string;
  matchType: "T20" | "ODI" | "TEST";
  venue: string;
  tossWinner: string;
  tossDecision: "BAT" | "BOWL";
  startTime: admin.firestore.Timestamp;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  scorecard: {
    innings1?: { team: string; runs: number; wickets: number; overs: number };
    innings2?: { team: string; runs: number; wickets: number; overs: number };
  };
  innings: { current: number; currentOver: number; currentBall: number };
  squads: {
    team1: Array<{ playerId: string; name: string; role: string; imageUrl: string }>;
    team2: Array<{ playerId: string; name: string; role: string; imageUrl: string }>;
  };
  predictionLockTime: admin.firestore.Timestamp;
  battlesLockTime: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

interface User {
  uid: string;
  authType: "ANONYMOUS" | "PHONE";
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  points: number;
  crowns: number;
  xp: number;
  unlockedThemes: string[];
  selectedTheme: string;
  fcmToken?: string;
  quizStats: {
    totalQuizzesAttempted: number;
    correctAnswers: number;
    currentStreak: number;
    lastQuizDate?: admin.firestore.Timestamp;
    totalCrownsEarned: number;
    perfectDaysInMonth: string[];
  };
  battleStats: {
    totalBattles: number;
    wins: number;
    losses: number;
    totalCrownsEarned: number;
    perfectBattlesInMonthCount: number;
    perfectBattleMatches: string[];
  };
  createdAt: admin.firestore.Timestamp;
  lastActiveAt: admin.firestore.Timestamp;
}

interface Battle {
  uid: string;
  matchId: string;
  battleType: "BATTER_VS_BATTER" | "ALLROUNDER_VS_ALLROUNDER" | "BOWLER_VS_BOWLER";
  selectedPlayer: { playerId: string; playerName: string; team: string };
  points: number;
  lockedAt: admin.firestore.Timestamp;
  changed?: boolean;
  changedAt?: admin.firestore.Timestamp;
  submittedAt: admin.firestore.Timestamp;
}

// ==========================================
// 1. FETCH AND SYNC MATCHES
// ==========================================
/**
 * Scheduled function to fetch cricket matches from external API
 * and normalize them into Firestore.
 * Runs every 30 minutes during match season.
 */
export const fetchAndSyncMatches = functions
  .region("asia-south1")
  .pubsub.schedule("every 30 minutes")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    try {
      // TODO: Replace with actual cricket API (e.g., ESPNcricinfo, Cricapi, etc.)
      // Example: const response = await axios.get("https://api.cricapi.com/v1/currentMatches");

      // For now, we'll assume matches are synced from external source
      console.log("Fetch and sync matches executed at", new Date().toISOString());

      // Example flow (uncomment when API is chosen):
      // const matches = response.data.data;
      // for (const match of matches) {
      //   const normalizedMatch = normalizeMatchData(match);
      //   await db.collection("matches").doc(match.id).set(normalizedMatch, { merge: true });
      // }

      return { success: true, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error("Error fetching matches:", error);
      return { success: false, error: String(error) };
    }
  });

// ==========================================
// 2. LOCK PREDICTIONS
// ==========================================
/**
 * Triggered when match status changes to LIVE.
 * Locks all predictions 5 minutes after match starts.
 */
export const lockPredictions = functions
  .region("asia-south1")
  .firestore.document("matches/{matchId}")
  .onUpdate(async (change: functions.Change<admin.firestore.DocumentSnapshot>) => {
    const matchData = change.after.data() as Match;
    const prevData = change.before.data() as Match;

    // Only process if status changed to LIVE
    if (prevData.status !== "LIVE" && matchData.status === "LIVE") {
      const predictionLockTime = admin.firestore.Timestamp.fromDate(
        new Date(matchData.startTime.toDate().getTime() + 5 * 60 * 1000)
      );

      // Update match with lock time
      await change.after.ref.update({ predictionLockTime });

      // Send notifications to all users who haven't locked predictions
      const predictionsSnapshot = await db
        .collectionGroup("predictions")
        .where("matchId", "==", matchData.matchId)
        .where("locked", "==", false)
        .get();

      const userIds: string[] = [];
      predictionsSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
        userIds.push(doc.id);
      });

      await sendBatchNotifications(
        userIds,
        "Prediction Closing Soon",
        `Predictions for ${matchData.teams.team1.name} vs ${matchData.teams.team2.name} lock in 5 minutes!`,
        "PREDICTION_CLOSING",
        matchData.matchId
      );
    }
  });

// ==========================================
// 3. CALCULATE PREDICTION POINTS
// ==========================================
/**
 * Triggered after each over is completed.
 * Validates user predictions against actual over results.
 */
export const calculatePredictionPoints = functions
  .region("asia-south1")
  .firestore.document("matches/{matchId}")
  .onUpdate(async (change: functions.Change<admin.firestore.DocumentSnapshot>) => {
    const matchData = change.after.data() as Match;
    const prevData = change.before.data() as Match;

    // Only process if innings changed
    if (prevData.innings.currentOver !== matchData.innings.currentOver) {
      const completedOver = prevData.innings.currentOver;
      const matchId = change.after.id;

      // Get all predictions for this match
      const predictionsSnapshot = await db
        .collectionGroup("predictions")
        .where("matchId", "==", matchId)
        .get();

      for (const doc of predictionsSnapshot.docs) {
        const prediction = doc.data();
        const uid = doc.ref.parent.parent?.id;

        if (!uid) continue;

        // Find the over prediction
        const overPredictionIndex = prediction.overPredictions.findIndex(
          (op: any) => op.over === completedOver
        );

        if (overPredictionIndex !== -1 && matchData.scorecard.innings1) {
          const actualRuns = matchData.scorecard.innings1.runs; // Simplified
          const predictedRuns = prediction.overPredictions[overPredictionIndex].predictedRuns;

          // Calculate points (simple logic: ±5 runs = max points)
          const points = Math.max(0, 10 - Math.abs(actualRuns - predictedRuns));

          // Update prediction
          prediction.overPredictions[overPredictionIndex].actualRuns = actualRuns;
          prediction.overPredictions[overPredictionIndex].points = points;
          prediction.overPredictions[overPredictionIndex].locked = true;
          prediction.totalPredictionPoints = (prediction.totalPredictionPoints || 0) + points;

          await doc.ref.update({
            overPredictions: prediction.overPredictions,
            totalPredictionPoints: prediction.totalPredictionPoints,
          });

          // Update user leaderboard
          await updateLeaderboardEntry(uid, matchId, points, "PREDICTION");
        }
      }
    }
  });

// ==========================================
// 4. RESOLVE BATTLES
// ==========================================
/**
 * Triggered when match status changes to FINISHED.
 * Calculates battle points based on player performance.
 */
export const resolveBattles = functions
  .region("asia-south1")
  .firestore.document("matches/{matchId}")
  .onUpdate(async (change: functions.Change<admin.firestore.DocumentSnapshot>) => {
    const matchData = change.after.data() as Match;
    const prevData = change.before.data() as Match;

    if (prevData.status !== "FINISHED" && matchData.status === "FINISHED") {
      const matchId = change.after.id;

      // Process global battles
      const globalBattlesSnapshot = await db
        .collection("battles")
        .doc(matchId)
        .collection("global")
        .get();

      for (const doc of globalBattlesSnapshot.docs) {
        const battle = doc.data() as Battle;
        const points = calculateBattlePoints(battle, matchData);

        await doc.ref.update({
          points,
          rank: 0, // Will be calculated in ranking function
        });

        // Update user stats
        const userRef = db.collection("users").doc(battle.uid);
        await userRef.update({
          points: admin.firestore.FieldValue.increment(points),
          xp: admin.firestore.FieldValue.increment(points * 2),
          "battleStats.totalBattles": admin.firestore.FieldValue.increment(1),
        });

        // Update leaderboard
        await updateLeaderboardEntry(battle.uid, matchId, points, "BATTLE");
      }

      // Process private battles
      const privateRoomsSnapshot = await db
        .collection("battles")
        .doc(matchId)
        .collection("private")
        .get();

      for (const roomDoc of privateRoomsSnapshot.docs) {
        const battlesSnapshot = await roomDoc.ref.collection("all").get();

        for (const doc of battlesSnapshot.docs) {
          const battle = doc.data() as Battle;
          const points = calculateBattlePoints(battle, matchData);

          await doc.ref.update({
            points,
            rank: 0,
          });

          // Update private leaderboard
          await updatePrivateLeaderboardEntry(battle.uid, matchId, roomDoc.id, points);
        }
      }

      // Send notifications
      const userIds: string[] = [];
      globalBattlesSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
        userIds.push(doc.id);
      });

      await sendBatchNotifications(
        userIds,
        "Battle Results Ready",
        `Check your battle results for ${matchData.teams.team1.name} vs ${matchData.teams.team2.name}`,
        "BATTLE_RESULT",
        matchId
      );
    }
  });

// ==========================================
// 5. ASSIGN MATCH CHAMPION CROWN
// ==========================================
/**
 * Awards 1 crown to the highest points user in a match.
 */
export const assignMatchChampionCrown = functions
  .region("asia-south1")
  .https.onCall(async (data: { matchId: string }, context: functions.https.CallableContext) => {
    if (!context.auth) throw new Error("Unauthenticated");

    const { matchId } = data;

    // Get match
    const matchDoc = await db.collection("matches").doc(matchId).get();
    if (!matchDoc.exists) throw new Error("Match not found");

    // Get leaderboard for match
    const leaderboardSnapshot = await db
      .collection("leaderboards")
      .doc(matchId)
      .collection("global")
      .orderBy("totalPoints", "desc")
      .limit(1)
      .get();

    if (leaderboardSnapshot.empty) throw new Error("No leaderboard data");

    const champion = leaderboardSnapshot.docs[0].data();
    const champUid = leaderboardSnapshot.docs[0].id;

    // Award crown
    await db.collection("users").doc(champUid).update({
      crowns: admin.firestore.FieldValue.increment(1),
      xp: admin.firestore.FieldValue.increment(100),
    });

    // Send notification
    await sendNotification(
      champUid,
      "You Are the Match Champion!",
      `You earned 1 crown for being the #1 scorer in this match!`,
      "CROWN_EARNED",
      matchId
    );

    return { success: true, champion: champUid, crownAwarded: true };
  });

// ==========================================
// 6. UPDATE QUIZ PROGRESS
// ==========================================
/**
 * Processes daily quiz completion and tracks crown progress.
 */
export const updateQuizProgress = functions
  .region("asia-south1")
  .https.onCall(async (data: { quizId: string; correct: boolean }, context: functions.https.CallableContext) => {
    if (!context.auth) throw new Error("Unauthenticated");

    const uid = context.auth.uid;
    const { correct } = data;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) throw new Error("User not found");

    const userData = userDoc.data() as User;
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Update stats
    const updates: any = {
      "quizStats.totalQuizzesAttempted": admin.firestore.FieldValue.increment(1),
      "quizStats.lastQuizDate": admin.firestore.FieldValue.serverTimestamp(),
    };

    if (correct) {
      updates["quizStats.correctAnswers"] = admin.firestore.FieldValue.increment(1);
      updates.xp = admin.firestore.FieldValue.increment(5);
    }

    // Track perfect days
    if (!userData.quizStats.perfectDaysInMonth.includes(today)) {
      // Check if user answered correctly for today
      const hasAnsweredToday = userData.quizStats.perfectDaysInMonth.some((d) =>
        d.startsWith(currentMonth)
      );

      if (correct && !hasAnsweredToday) {
        updates["quizStats.perfectDaysInMonth"] = admin.firestore.FieldValue.arrayUnion(today);

        const perfectDaysCount = userData.quizStats.perfectDaysInMonth.filter((d) =>
          d.startsWith(currentMonth)
        ).length + 1;

        // Award crown every 10 perfect days (max 3/month)
        if (perfectDaysCount % 10 === 0 && perfectDaysCount <= 30) {
          updates.crowns = admin.firestore.FieldValue.increment(1);
          updates["quizStats.totalCrownsEarned"] = admin.firestore.FieldValue.increment(1);

          await sendNotification(
            uid,
            "Quiz Consistency Crown Earned!",
            "You earned 1 crown for 10 perfect quiz days this month!",
            "CROWN_EARNED"
          );
        }
      }
    }

    await userRef.update(updates);
    return { success: true };
  });

// ==========================================
// 7. UPDATE BATTLE PROGRESS
// ==========================================
/**
 * Tracks battle performance and awards crowns for consistency.
 */
export const updateBattleProgress = functions
  .region("asia-south1")
  .https.onCall(async (data: { matchId: string; won: boolean }, context: functions.https.CallableContext) => {
    if (!context.auth) throw new Error("Unauthenticated");

    const uid = context.auth.uid;
    const { matchId, won } = data;

    const userRef = db.collection("users").doc(uid);
    const currentMonth = new Date().toISOString().substring(0, 7);

    const updates: any = {
      "battleStats.totalBattles": admin.firestore.FieldValue.increment(1),
    };

    if (won) {
      updates["battleStats.wins"] = admin.firestore.FieldValue.increment(1);
      updates["battleStats.perfectBattlesInMonthCount"] = admin.firestore.FieldValue.increment(1);
      updates["battleStats.perfectBattleMatches"] = admin.firestore.FieldValue.arrayUnion(matchId);

      // Award crown for 10 perfect battles in a month
      const userDoc = await userRef.get();
      const userData = userDoc.data() as User;

      if (
        userData.battleStats.perfectBattlesInMonthCount + 1 === 10 &&
        userData.battleStats.totalCrownsEarned < 3
      ) {
        updates.crowns = admin.firestore.FieldValue.increment(1);
        updates["battleStats.totalCrownsEarned"] = admin.firestore.FieldValue.increment(1);

        await sendNotification(
          uid,
          "Battle Consistency Crown Earned!",
          "You earned 1 crown for winning 10 battles this month!",
          "CROWN_EARNED",
          matchId
        );
      }
    } else {
      updates["battleStats.losses"] = admin.firestore.FieldValue.increment(1);
    }

    await userRef.update(updates);
    return { success: true };
  });

// ==========================================
// 8. ENFORCE BATTLE CHANGE RULES
// ==========================================
/**
 * Validates and enforces battle change advantage based on previous rank.
 */
export const enforceBattleChangeRules = functions
  .region("asia-south1")
  .https.onCall(async (data: { matchId: string; battleType: string; oldPlayerId: string }, context: functions.https.CallableContext) => {
    if (!context.auth) throw new Error("Unauthenticated");

    const uid = context.auth.uid;
    const { matchId, battleType } = data;

    // Get current match
    const matchDoc = await db.collection("matches").doc(matchId).get();
    if (!matchDoc.exists) throw new Error("Match not found");

    const match = matchDoc.data() as Match;

    // Check if first innings has started
    if (match.status !== "LIVE" || match.innings.current !== 1) {
      throw new Error("Can only change pick during first innings");
    }

    // Get previous match's leaderboard (assume prev match ID is stored)
    // This is simplified; in production, you'd track match sequences
    const previousLeaderboard = await db
      .collection("leaderboards")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (previousLeaderboard.empty) {
      throw new Error("No previous match data found");
    }

    const userRank = previousLeaderboard.docs[0].data().rank || 999;
    let changesAllowed = 0;

    if (userRank === 1) changesAllowed = 3; // 1st place can change all 3
    else if (userRank === 2) changesAllowed = 2; // 2nd place can change 2
    else if (userRank === 3) changesAllowed = 1; // 3rd place can change 1

    // Check how many changes user has already made
    const battlesSnapshot = await db
      .collection("battles")
      .doc(matchId)
      .collection("global")
      .where("uid", "==", uid)
      .where("changed", "==", true)
      .get();

    const changesUsed = battlesSnapshot.size;

    if (changesUsed >= changesAllowed) {
      throw new Error(`You have exhausted your ${changesAllowed} allowed changes`);
    }

    return { success: true, changesAllowed, changesUsed };
  });

// ==========================================
// 9. SEND FCM NOTIFICATIONS
// ==========================================
/**
 * Sends push notifications via Firebase Cloud Messaging.
 */
async function sendNotification(
  uid: string,
  title: string,
  body: string,
  type: "MATCH_STARTING" | "PREDICTION_CLOSING" | "BATTLE_RESULT" | "CROWN_EARNED",
  matchId?: string
): Promise<void> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data() as User;
    if (!userData.fcmToken) return;

    await messaging.send({
      token: userData.fcmToken,
      notification: { title, body },
      data: {
        type,
        matchId: matchId || "",
      },
    });
  } catch (error) {
    console.error(`Error sending notification to ${uid}:`, error);
  }
}

async function sendBatchNotifications(
  uids: string[],
  title: string,
  body: string,
  type: "MATCH_STARTING" | "PREDICTION_CLOSING" | "BATTLE_RESULT" | "CROWN_EARNED",
  matchId?: string
): Promise<void> {
  const promises = uids.map((uid) => sendNotification(uid, title, body, type, matchId));
  await Promise.allSettled(promises);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateBattlePoints(battle: Battle, matchData: Match): number {
  // Simplified battle points calculation
  // In production, fetch player performance stats and calculate based on role

  const selectedPlayer = battle.selectedPlayer;
  let points = 0;

  // Check if player performed well (simplified logic)
  // Real logic would analyze scorecard.innings1 and innings2
  if (selectedPlayer.team === matchData.teams.team1.name) {
    // Award points based on batting/bowling performance
    points = 50; // Placeholder
  } else {
    points = 40;
  }

  return points;
}

async function updateLeaderboardEntry(
  uid: string,
  matchId: string,
  points: number,
  type: "PREDICTION" | "BATTLE"
): Promise<void> {
  const leaderboardRef = db
    .collection("leaderboards")
    .doc(matchId)
    .collection("global")
    .doc(uid);

  const existingDoc = await leaderboardRef.get();

  if (existingDoc.exists) {
    const data = existingDoc.data();
    const fieldName = type === "PREDICTION" ? "predictions" : "battles";

    await leaderboardRef.update({
      totalPoints: admin.firestore.FieldValue.increment(points),
      [fieldName]: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    const fieldObj = {
      predictions: type === "PREDICTION" ? 1 : 0,
      battles: type === "BATTLE" ? 1 : 0,
    };

    await leaderboardRef.set({
      uid,
      matchId,
      totalPoints: points,
      rank: 0,
      ...fieldObj,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function updatePrivateLeaderboardEntry(
  uid: string,
  matchId: string,
  roomId: string,
  points: number
): Promise<void> {
  const leaderboardRef = db
    .collection("leaderboards")
    .doc(matchId)
    .collection("private")
    .doc(roomId)
    .collection("rankings")
    .doc(uid);

  const existingDoc = await leaderboardRef.get();

  if (existingDoc.exists) {
    await leaderboardRef.update({
      totalPoints: admin.firestore.FieldValue.increment(points),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await leaderboardRef.set({
      uid,
      matchId,
      roomId,
      totalPoints: points,
      rank: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

export default admin;
