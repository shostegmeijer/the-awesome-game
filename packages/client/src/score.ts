/**
 * Score tracking system
 */

import type { PlayerScore } from '@awesome-game/shared';


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
    const panelHeight = 150;
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

    // Rank display (larger and more prominent)
    const rank = this.getRank(localPlayerId);
    const totalPlayers = leaderboard.length;

    // Calculate hub score based on placement
    const hubScore = this.calculateHubScore(rank);

    // Rank medal color
    let rankColor = '#FFFFFF';
    if (rank === 1) rankColor = '#FFD700'; // Gold
    else if (rank === 2) rankColor = '#C0C0C0'; // Silver
    else if (rank === 3) rankColor = '#CD7F32'; // Bronze

    ctx.fillStyle = rankColor;
    ctx.font = 'bold 24px Arial';
    ctx.shadowBlur = 15;
    ctx.shadowColor = rankColor;
    ctx.fillText(`#${rank} / ${totalPlayers}`, padding + 15, padding + 60);

    // Hub score indicator
    ctx.font = '12px Arial';
    ctx.fillStyle = '#FFAA00';
    ctx.shadowBlur = 5;
    ctx.fillText(`Hub Score: ${hubScore}`, padding + 120, padding + 60);

    // Local player stats
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Score: ${Math.floor(localPlayer.score)}`, padding + 15, padding + 85);

    ctx.font = '12px Arial';
    ctx.fillStyle = '#AAAAAA';
    const botKillsText = typeof localPlayer.botKills === 'number' ? `  Bot Kills: ${localPlayer.botKills}` : '';
    ctx.fillText(`Kills: ${localPlayer.kills}  Deaths: ${localPlayer.deaths}${botKillsText}`, padding + 15, padding + 105);

    // K/D ratio
    const kd = localPlayer.deaths > 0 ? (localPlayer.kills / localPlayer.deaths).toFixed(2) : localPlayer.kills.toFixed(2);
    ctx.fillText(`K/D: ${kd}`, padding + 15, padding + 125);

    ctx.restore();
  }

  /**
   * Calculate hub score from rank (same logic as server)
   */
  private calculateHubScore(rank: number): number {
    if (rank <= 0) return 0;

    const placementScores = [100, 80, 60, 40, 20];
    if (rank <= placementScores.length) {
      return placementScores[rank - 1];
    }
    return 20;
  }

  /**
   * Clear all scores
   */
  clear(): void {
    this.scores.clear();
  }

  /**
   * Apply a server-authoritative snapshot of scores
   */
  applySnapshot(snapshot: Array<PlayerScore>): void {
    // Replace existing map with incoming values
    const next = new Map<string, PlayerScore>();
    for (const s of snapshot as Array<PlayerScore>) {
      next.set(s.playerId, {
        playerId: s.playerId,
        playerName: s.playerName,
        score: s.score,
        kills: s.kills,
        deaths: s.deaths,
        botKills: s.botKills,
      });
    }
    this.scores = next;
  }
}
