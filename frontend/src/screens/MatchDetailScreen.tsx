import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { submitPrediction, submitBattle, Match } from "../lib/firestore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<any, "MatchDetail">;

export function MatchDetailScreen({ route }: Props) {
  const { match } = route.params as { match: Match };
  const [matchWinner, setMatchWinner] = useState<string>("");
  const [overRuns, setOverRuns] = useState<string>("");
  const [selectedBattleType, setSelectedBattleType] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const battleTypes = [
    "BATTER_VS_BATTER",
    "ALLROUNDER_VS_ALLROUNDER",
    "BOWLER_VS_BOWLER",
  ];

  const handleSubmitPrediction = async () => {
    if (!matchWinner) {
      Alert.alert("Error", "Please select a match winner");
      return;
    }

    setLoading(true);
    try {
      const overPredictions = overRuns ? [{ over: 1, predictedRuns: parseInt(overRuns) }] : [];

      await submitPrediction(match.matchId, matchWinner, overPredictions);
      Alert.alert("Success", "Prediction submitted!");
      setMatchWinner("");
      setOverRuns("");
    } catch (error) {
      Alert.alert("Error", String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBattle = async () => {
    if (!selectedBattleType || !selectedPlayer) {
      Alert.alert("Error", "Please select battle type and player");
      return;
    }

    setLoading(true);
    try {
      const player = {
        playerId: selectedPlayer,
        playerName: selectedPlayer,
        team: matchWinner || match.teams.team1.name,
      };

      await submitBattle(match.matchId, selectedBattleType, player);
      Alert.alert("Success", "Battle pick submitted!");
      setSelectedBattleType("");
      setSelectedPlayer("");
    } catch (error) {
      Alert.alert("Error", String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Match Details</Text>

      <View style={styles.matchInfoCard}>
        <Text style={styles.teamName}>{match.teams.team1.name}</Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.teamName}>{match.teams.team2.name}</Text>
        <Text style={styles.details}>{match.seriesName}</Text>
        <Text style={styles.details}>{match.venue}</Text>
        <Text style={[styles.status, { color: match.status === "LIVE" ? "red" : "green" }]}>
          Status: {match.status}
        </Text>
      </View>

      {/* PREDICTIONS SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Match Winner Prediction</Text>

        <TouchableOpacity
          style={[styles.selectionButton, matchWinner === match.teams.team1.name && styles.selected]}
          onPress={() => setMatchWinner(match.teams.team1.name)}
        >
          <Text style={styles.buttonText}>{match.teams.team1.name}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectionButton, matchWinner === match.teams.team2.name && styles.selected]}
          onPress={() => setMatchWinner(match.teams.team2.name)}
        >
          <Text style={styles.buttonText}>{match.teams.team2.name}</Text>
        </TouchableOpacity>

        <Text style={styles.inputLabel}>Predicted Over 1 Runs</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter predicted runs"
          keyboardType="numeric"
          value={overRuns}
          onChangeText={setOverRuns}
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmitPrediction}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>Submit Prediction</Text>
        </TouchableOpacity>
      </View>

      {/* BATTLES SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Battle Type</Text>

        {battleTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.selectionButton, selectedBattleType === type && styles.selected]}
            onPress={() => setSelectedBattleType(type)}
          >
            <Text style={styles.buttonText}>{type.replace(/_/g, " ")}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.inputLabel}>Select Player</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter player name"
          value={selectedPlayer}
          onChangeText={setSelectedPlayer}
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmitBattle}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>Submit Battle</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  matchInfoCard: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  teamName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  vs: {
    fontSize: 14,
    color: "#999",
    marginVertical: 8,
  },
  details: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  selectionButton: {
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  selected: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    fontSize: 14,
    color: "#333",
  },
  inputLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
