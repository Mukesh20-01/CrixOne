import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { fetchMatches, Match } from "../lib/firestore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<any, "Home">;

export function HomeScreen({ navigation }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const data = await fetchMatches();
        setMatches(data);
      } catch (error) {
        console.error("Error loading matches:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  const renderMatchCard = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => navigation.navigate("MatchDetail", { matchId: item.matchId, match: item })}
    >
      <Text style={styles.matchTitle}>
        {item.teams.team1.name} vs {item.teams.team2.name}
      </Text>
      <Text style={styles.matchDetails}>{item.seriesName}</Text>
      <Text style={styles.matchVenue}>{item.venue}</Text>
      <Text style={[styles.matchStatus, { color: item.status === "LIVE" ? "red" : "green" }]}>
        {item.status}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>CrixOne - Cricket Predictions</Text>
      <FlatList
        data={matches}
        renderItem={renderMatchCard}
        keyExtractor={(item: Match) => item.matchId}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 16,
    textAlign: "center",
    color: "#333",
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  matchCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  matchDetails: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  matchVenue: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  matchStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
});
