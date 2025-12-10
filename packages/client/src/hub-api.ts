/**
 * INNSPIRE Hub API Client
 * Integrates with the hackathon hub for score submission
 */

const HUB_API_BASE = 'https://innspirechristmashackathon-sandbox.mxapps.io/rest/game/v1';

// Your game's hosted game key from the hub
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

export interface ScoreResponse {
  success: boolean;
  message?: string;
}

/**
 * Hub API Client for score submission
 */
export class HubApiClient {
  private playerKey: string | null = null;
  private playerName: string = 'Player';
  private scoreSubmitted: boolean = false;

  constructor(playerKey?: string, playerName?: string) {
    this.playerKey = playerKey || null;
    this.playerName = playerName || 'Player';
    console.log('🎯 Hub API Client initialized', { playerKey: this.playerKey, playerName: this.playerName });
  }

  /**
   * Set the player key and name
   */
  setPlayer(playerKey: string, playerName: string): void {
    this.playerKey = playerKey;
    this.playerName = playerName;
    console.log('🔑 Player set:', { playerKey, playerName });
  }

  /**
   * Submit score to the hub
   * @param score - Score between 0-100
   */
  async submitScore(score: number, playerName?: string): Promise<ScoreResponse> {
    if (!this.playerKey) {
      console.error('❌ Cannot submit score: No playerKey provided');
      return { success: false, message: 'No playerKey provided' };
    }

    if (this.scoreSubmitted) {
      console.warn('⚠️ Score already submitted for this session');
      return { success: false, message: 'Score already submitted' };
    }

    // Clamp score to 0-100 range
    const clampedScore = Math.max(0, Math.min(100, Math.floor(score)));
    const name = playerName || this.playerName;

    const payload: ScoreSubmissionPayload = {
      HostedGameKey: HOSTED_GAME_KEY,
      PlayerScores: [
        {
          Score: clampedScore,
          Player: {
            Name: name,
            PlayerKey: this.playerKey
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
        return {
          success: false,
          message: `HTTP ${response.status}: ${errorText}`
        };
      }

      const data = await response.json();
      this.scoreSubmitted = true;
      console.log('✅ Score submitted successfully:', data);

      return { success: true, message: 'Score submitted successfully' };
    } catch (error) {
      console.error('❌ Error submitting score:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if score has been submitted
   */
  hasSubmittedScore(): boolean {
    return this.scoreSubmitted;
  }

  /**
   * Reset submission state (for testing)
   */
  resetSubmissionState(): void {
    this.scoreSubmitted = false;
    console.log('🔄 Submission state reset');
  }
}
