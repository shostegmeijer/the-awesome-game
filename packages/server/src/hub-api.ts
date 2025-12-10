/**
 * Server-side INNSPIRE Hub API Client
 * Automatically submits scores to the hackathon hub
 */

const HUB_API_BASE = 'https://innspirechristmashackathon-sandbox.mxapps.io/rest/game/v1';
const HOSTED_GAME_KEY = 'D9iMdB'; // Geometry game

export interface PlayerScore {
  Score: number;
  Player: {
    Name: string;
    PlayerKey: string;
  };
}

export interface ScoreSubmissionPayload {
  HostedGameKey: string;
  PlayerScores: PlayerScore[];
}

export interface HubPlayer {
  Name: string;
  PlayerKey: string;
}

export interface CurrentGameResponse {
  Players?: HubPlayer[];
  GameHosts?: any[];
}

/**
 * Fetch current game info from the hub
 */
export async function getCurrentGame(): Promise<CurrentGameResponse | null> {
  try {
    const response = await fetch(`${HUB_API_BASE}/Game/currentGame`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch current game:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching current game:', error);
    return null;
  }
}

/**
 * Get player name from playerKey
 */
export async function getPlayerName(playerKey: string): Promise<string | null> {
  const gameData = await getCurrentGame();

  if (!gameData || !gameData.Players) {
    return null;
  }

  const player = gameData.Players.find(p => p.PlayerKey === playerKey);
  return player ? player.Name : null;
}

/**
 * Submit scores to the INNSPIRE hub
 */
export async function submitScoreToHub(
  playerKey: string,
  playerName: string,
  score: number
): Promise<boolean> {
  // Clamp score to 0-100 range
  const clampedScore = Math.max(0, Math.min(100, Math.floor(score)));

  const payload: ScoreSubmissionPayload = {
    HostedGameKey: HOSTED_GAME_KEY,
    PlayerScores: [
      {
        Score: clampedScore,
        Player: {
          Name: playerName,
          PlayerKey: playerKey
        }
      }
    ]
  };

  try {
    console.log(`📤 Submitting score to hub:`, payload);

    const response = await fetch(`${HUB_API_BASE}/Game/Score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Score submission failed:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Score submitted successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error submitting score:', error);
    return false;
  }
}

/**
 * Calculate placement-based score for FFA game mode
 */
export function calculatePlacementScore(rank: number, totalPlayers: number): number {
  if (rank <= 0 || totalPlayers === 0) {
    return 0;
  }

  // Placement-based scoring for FFA
  // 1st place = 100 points
  // 2nd place = 80 points
  // 3rd place = 60 points
  // 4th place = 40 points
  // 5th+ place = 20 points
  const placementScores = [100, 80, 60, 40, 20];

  if (rank <= placementScores.length) {
    return placementScores[rank - 1];
  }

  return 20; // Minimum score for participation
}
