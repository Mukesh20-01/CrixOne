import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { initializeAuth, requestFCMPermission } from "./lib/firebase";
import { testFirebaseConnection } from "./backendTest";
import { HomeScreen } from "./screens/HomeScreen";
import { MatchDetailScreen } from "./screens/MatchDetailScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Firebase Auth
        await initializeAuth();

        // Request FCM permissions
        await requestFCMPermission();

        // Test Firebase Firestore connection
        console.log("[App] Testing backend connection...");
        const connectionSuccess = await testFirebaseConnection();
        if (connectionSuccess) {
          console.log("[App] ✓ Backend connection verified");
        } else {
          console.warn("[App] ⚠ Backend connection test failed");
        }

        setInitialized(true);
      } catch (error) {
        console.error("App initialization error:", error);
        setInitialized(false);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Failed to initialize app. Please restart.</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#fff",
          },
          headerTintColor: "#333",
          headerTitleStyle: {
            fontWeight: "600",
            color: "#333",
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "CrixOne" }}
        />
        <Stack.Screen
          name="MatchDetail"
          component={MatchDetailScreen}
          options={{ title: "Match" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
