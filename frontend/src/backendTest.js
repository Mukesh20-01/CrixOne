import { db } from "./lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Test Firebase Firestore connection by adding a health check document
 * @returns {Promise<boolean>} - Returns true if connection successful
 */
export async function testFirebaseConnection() {
  try {
    console.log("[FirebaseTest] Starting Firebase connection test...");

    // Reference to healthCheck collection
    const healthCheckRef = collection(db, "healthCheck");

    // Add a test document with server timestamp
    const docRef = await addDoc(healthCheckRef, {
      status: "ok",
      timestamp: serverTimestamp(),
    });

    console.log("[FirebaseTest] ✓ Connection successful!");
    console.log("[FirebaseTest] Document ID:", docRef.id);
    console.log("[FirebaseTest] Data written to 'healthCheck' collection");

    return true;
  } catch (error) {
    console.error("[FirebaseTest] ✗ Connection failed!");
    console.error("[FirebaseTest] Error:", error.message);
    console.error("[FirebaseTest] Error code:", error.code);

    return false;
  }
}
