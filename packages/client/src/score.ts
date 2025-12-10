/**
 * Score tracking system
 */

interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  kills: number;
  deaths: number;
}

export class ScoreManager {
  private scores: Map<string, PlayerScore> = new Map();

  /**
   * Initialize or get a player's score
   */
  initPlayer(playerId: string, playerName: string): void {
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, {
        playerId,
        playerName,
        score: 0,
        kills: 0,
        deaths: 0
      });
    }
  }

  /**
   * Add points to a player
   */
  addPoints(playerId: string, points: number): void {
    const playerScore = this.scores.get(playerId);
    if (playerScore) {
      playerScore.score += points;
    }
  }

  /**
   * Record a kill
   */
  addKill(killerId: string, victimId: string): void {
    const killer = this.scores.get(killerId);
    const victim = this.scores.get(victimId);

    if (killer) {
      killer.kills++;
      killer.score += 100; // Kill reward
    }

    if (victim) {
      victim.deaths++;
      victim.score = Math.max(0, victim.score - 50); // Death penalty
    }
  }

  /**
   * Get player score
   */
  getScore(playerId: string): number {
    return this.scores.get(playerId)?.score || 0;
  }

  /**
   * Get all scores sorted by score
   */
  getLeaderboard(): PlayerScore[] {
    return Array.from(this.scores.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Get player rank (1-based)
   */
  getRank(playerId: string): number {
    const leaderboard = this.getLeaderboard();
    const index = leaderboard.findIndex(p => p.playerId === playerId);
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Render score UI
   */
  renderUI(ctx: CanvasRenderingContext2D, localPlayerId: string): void {
    const leaderboard = this.getLeaderboard();
    const localPlayer = this.scores.get(localPlayerId);

    if (!localPlayer) return;

    ctx.save();

    // Background panel
    const panelWidth = 280;
    const panelHeight = 120;
    const padding = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00FFFF';

    ctx.fillRect(padding, padding, panelWidth, panelHeight);
    ctx.strokeRect(padding, padding, panelWidth, panelHeight);

    // Title
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SCOREBOARD', padding + 15, padding + 30);

    // Local player stats
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Score: ${Math.floor(localPlayer.score)}`, padding + 15, padding + 55);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Kills: ${localPlayer.kills}  Deaths: ${localPlayer.deaths}`, padding + 15, padding + 75);
    ctx.fillText(`Rank: #${this.getRank(localPlayerId)} / ${leaderboard.length}`, padding + 15, padding + 95);

    // K/D ratio
    const kd = localPlayer.deaths > 0 ? (localPlayer.kills / localPlayer.deaths).toFixed(2) : localPlayer.kills.toFixed(2);
    ctx.fillText(`K/D: ${kd}`, padding + 15, padding + 115);

    ctx.restore();
  }

  /**
   * Clear all scores
   */
  clear(): void {
    this.scores.clear();
  }
}
