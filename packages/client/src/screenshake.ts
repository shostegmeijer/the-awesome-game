/**
 * Screen shake effect system
 */

export class ScreenShake {
  private intensity: number = 0;
  private duration: number = 0;
  private startTime: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  /**
   * Trigger a screen shake
   */
  shake(intensity: number, duration: number): void {
    // If already shaking, add to existing shake if stronger
    if (intensity > this.intensity) {
      this.intensity = intensity;
      this.duration = duration;
      this.startTime = performance.now();
    }
  }

  /**
   * Update shake effect
   */
  update(): void {
    if (this.intensity <= 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const elapsed = performance.now() - this.startTime;
    const progress = elapsed / this.duration;

    if (progress >= 1) {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    // Decay intensity over time
    const currentIntensity = this.intensity * (1 - progress);

    // Random offset within intensity bounds
    this.offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
    this.offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
  }

  /**
   * Apply shake to canvas context
   */
  apply(ctx: CanvasRenderingContext2D): void {
    if (this.intensity > 0) {
      ctx.translate(this.offsetX, this.offsetY);
    }
  }

  /**
   * Reset shake transform
   */
  reset(ctx: CanvasRenderingContext2D): void {
    if (this.intensity > 0) {
      ctx.translate(-this.offsetX, -this.offsetY);
    }
  }

  /**
   * Get current shake offset (for UI elements)
   */
  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  /**
   * Check if currently shaking
   */
  isShaking(): boolean {
    return this.intensity > 0;
  }
}
