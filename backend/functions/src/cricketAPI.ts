// backend/functions/src/cricketAPI.ts
// Cricket API Integration Module
// Supports: Cricapi, ESPNcricinfo, CricketData

import axios from 'axios';
import * as admin from 'firebase-admin';
import * as cheerio from 'cheerio';

// ==========================================
// CRICKET API TYPES
// ==========================================

export interface CricketAPIMatch {
  id: string;
  team1: string;
  team2: string;
  type: 'T20' | 'ODI' | 'TEST';
  status: 'scheduled' | 'live' | 'completed';
  venue?: string;
  series?: string;
  startDate: Date;
  current?: {
    inning: number;
    runs: number;
    wickets: number;
    overs: number;
  };
  teams?: Array<{
    name: string;
    imageUrl?: string;
    squad?: Array<{
      playerId: string;
      name: string;
      role: 'BATTER' | 'BOWLER' | 'ALL_ROUNDER';
      imageUrl?: string;
    }>;
  }>;
}

// ==========================================
// 1. CRICAPI INTEGRATION
// ==========================================

class CricAPIProvider {
  private apiKey: string;
  private baseUrl = 'https://api.cricapi.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCurrentMatches(): Promise<CricketAPIMatch[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/currentMatches`,
        {
          params: {
            apikey: this.apiKey,
            offset: 0,
          },
        }
      );

      return response.data.data.map((match: any) => this.normalizeMatch(match));
    } catch (error) {
      console.error('Cricapi error:', error);
      throw error;
    }
  }

  async getMatchInfo(matchId: string): Promise<CricketAPIMatch | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/matchInfo`,
        {
          params: {
            apikey: this.apiKey,
            id: matchId,
          },
        }
      );

      if (!response.data.data) return null;
      return this.normalizeMatch(response.data.data);
    } catch (error) {
      console.error('Cricapi matchInfo error:', error);
      return null;
    }
  }

  private normalizeMatch(apiMatch: any): CricketAPIMatch {
    const statusMap: { [key: string]: 'scheduled' | 'live' | 'completed' } = {
      'scheduled': 'scheduled',
      'live': 'live',
      'completed': 'completed',
      'Scheduled': 'scheduled',
      'Live': 'live',
      'Completed': 'completed',
    };

    return {
      id: apiMatch.id,
      team1: apiMatch.team1,
      team2: apiMatch.team2,
      type: apiMatch.matchType || 'T20',
      status: statusMap[apiMatch.status] || 'scheduled',
      venue: apiMatch.venue,
      series: apiMatch.series,
      startDate: new Date(apiMatch.date),
      current: apiMatch.score ? {
        inning: apiMatch.score[0]?.inning || 1,
        runs: apiMatch.score[0]?.r || 0,
        wickets: apiMatch.score[0]?.w || 0,
        overs: parseFloat(apiMatch.score[0]?.o || '0'),
      } : undefined,
    };
  }
}

// ==========================================
// 2. CRICKETDATA INTEGRATION
// ==========================================

class CricketDataProvider {
  private apiKey: string;
  private baseUrl = 'https://api.cricketdata.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCurrentMatches(): Promise<CricketAPIMatch[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/matches`,
        {
          headers: {
            'x-api-key': this.apiKey,
          },
          params: {
            status: ['scheduled', 'live'],
          },
        }
      );

      return response.data.matches.map((match: any) => this.normalizeMatch(match));
    } catch (error) {
      console.error('CricketData error:', error);
      throw error;
    }
  }

  async getMatchInfo(matchId: string): Promise<CricketAPIMatch | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/matches/${matchId}`,
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        }
      );

      return this.normalizeMatch(response.data);
    } catch (error) {
      console.error('CricketData matchInfo error:', error);
      return null;
    }
  }

  private normalizeMatch(apiMatch: any): CricketAPIMatch {
    return {
      id: apiMatch.id,
      team1: apiMatch.teams[0].name,
      team2: apiMatch.teams[1].name,
      type: apiMatch.format.toUpperCase() as 'T20' | 'ODI' | 'TEST',
      status: apiMatch.status.toLowerCase() as 'scheduled' | 'live' | 'completed',
      venue: apiMatch.venue?.name,
      series: apiMatch.series?.name,
      startDate: new Date(apiMatch.startDate),
      current: apiMatch.currentInnings ? {
        inning: apiMatch.currentInnings.number,
        runs: apiMatch.currentInnings.runs,
        wickets: apiMatch.currentInnings.wickets,
        overs: apiMatch.currentInnings.overs,
      } : undefined,
      teams: apiMatch.teams.map((team: any) => ({
        name: team.name,
        imageUrl: team.flagUrl,
        squad: team.squad?.map((player: any) => ({
          playerId: player.id,
          name: player.name,
          role: this.mapRole(player.role),
          imageUrl: player.imageUrl,
        })) || [],
      })),
    };
  }

  private mapRole(role: string): 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('bat')) return 'BATTER';
    if (lowerRole.includes('bowl')) return 'BOWLER';
    return 'ALL_ROUNDER';
  }
}

// ==========================================
// 3. ESPNCRICINFO SCRAPER
// ==========================================

class ESPNCricinfProvider {
  private baseUrl = 'https://www.espncricinfo.com';

  async getCurrentMatches(): Promise<CricketAPIMatch[]> {
    // Note: ESPNcricinfo doesn't have a public API
    // This is a simplified scraper - use with caution
    // Real implementation would need sophisticated parsing
    try {
      const response = await axios.get(`${this.baseUrl}/ci/content/current/matches`);
      const $ = cheerio.load(response.data);

      const matches: CricketAPIMatch[] = [];

      // Simplified selector - actual selectors vary by page structure
      $('a.match-item').each((i: number, el: any) => {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href) return;

        matches.push({
          id: href.split('/').pop() || '',
          team1: $el.find('.team-1')?.text() || '',
          team2: $el.find('.team-2')?.text() || '',
          type: 'T20',
          status: 'scheduled',
          startDate: new Date(),
        });
      });

      return matches;
    } catch (error) {
      console.error('ESPNCricinfo scraper error:', error);
      return [];
    }
  }

  async getMatchInfo(matchId: string): Promise<CricketAPIMatch | null> {
    // Implementation depends on page structure
    return null;
  }
}

// ==========================================
// 4. FACTORY AND PROVIDER SELECTION
// ==========================================

type ProviderType = 'cricapi' | 'cricketdata' | 'espncricinfo';

export class CricketDataProviderFactory {
  static create(provider: ProviderType, apiKey?: string): CricAPIProvider | CricketDataProvider | ESPNCricinfProvider {
    switch (provider) {
      case 'cricapi':
        if (!apiKey) throw new Error('CricAPI key required');
        return new CricAPIProvider(apiKey);

      case 'cricketdata':
        if (!apiKey) throw new Error('CricketData key required');
        return new CricketDataProvider(apiKey);

      case 'espncricinfo':
        return new ESPNCricinfProvider();

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

// ==========================================
// 5. FIRESTORE NORMALIZATION
// ==========================================

export function normalizeToFirestore(
  apiMatch: CricketAPIMatch
): Record<string, any> {
  const statusMap: { [key: string]: 'UPCOMING' | 'LIVE' | 'FINISHED' } = {
    'scheduled': 'UPCOMING',
    'live': 'LIVE',
    'completed': 'FINISHED',
  };

  return {
    matchId: apiMatch.id,
    teams: {
      team1: {
        name: apiMatch.team1,
        imageUrl: apiMatch.teams?.[0]?.imageUrl || '',
      },
      team2: {
        name: apiMatch.team2,
        imageUrl: apiMatch.teams?.[1]?.imageUrl || '',
      },
    },
    seriesName: apiMatch.series || 'Unknown',
    matchType: apiMatch.type,
    venue: apiMatch.venue || 'TBD',
    tossWinner: '', // Usually not available in API until match starts
    tossDecision: 'BAT',
    startTime: admin.firestore.Timestamp.fromDate(apiMatch.startDate),
    status: statusMap[apiMatch.status],
    scorecard: {
      innings1: apiMatch.current?.inning === 1 ? {
        team: apiMatch.team1,
        runs: apiMatch.current.runs,
        wickets: apiMatch.current.wickets,
        overs: apiMatch.current.overs,
      } : undefined,
      innings2: apiMatch.current?.inning === 2 ? {
        team: apiMatch.team2,
        runs: apiMatch.current.runs,
        wickets: apiMatch.current.wickets,
        overs: apiMatch.current.overs,
      } : undefined,
    },
    innings: {
      current: apiMatch.current?.inning || 1,
      currentOver: Math.floor(apiMatch.current?.overs || 0),
      currentBall: Math.round((apiMatch.current?.overs || 0) % 1 * 6),
    },
    squads: {
      team1: apiMatch.teams?.[0]?.squad || [],
      team2: apiMatch.teams?.[1]?.squad || [],
    },
    predictionLockTime: admin.firestore.Timestamp.fromDate(
      new Date(apiMatch.startDate.getTime() + 5 * 60 * 1000)
    ),
    battlesLockTime: admin.firestore.Timestamp.fromDate(
      new Date(apiMatch.startDate.getTime() + 
        (50 * 6 * 1000)) // Simplified: assume 50 overs
    ),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

export default {
  CricAPIProvider,
  CricketDataProvider,
  ESPNCricinfProvider,
  CricketDataProviderFactory,
  normalizeToFirestore,
};
