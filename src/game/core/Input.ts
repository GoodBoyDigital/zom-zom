/**
 * Keyboard and mouse state. Movement is arrow keys (WASD also works),
 * aim follows the mouse, left button fires.
 */
export class Input {
  private keys = new Set<string>();
  private pressedThisStep = new Set<string>();
  /** Mouse position in canvas CSS pixels. */
  public mouseX = 0;
  public mouseY = 0;
  public hasMouse = false;
  public fireHeld = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  public destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }

  public isDown(code: string) {
    return this.keys.has(code);
  }

  /** True once per key press. Call consumePresses() after each simulation step. */
  public wasPressed(code: string) {
    return this.pressedThisStep.has(code);
  }

  public consumePresses() {
    this.pressedThisStep.clear();
  }

  /** Normalised movement vector from arrows / WASD. */
  public moveAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown("ArrowLeft") || this.isDown("KeyA")) x -= 1;
    if (this.isDown("ArrowRight") || this.isDown("KeyD")) x += 1;
    if (this.isDown("ArrowUp") || this.isDown("KeyW")) y -= 1;
    if (this.isDown("ArrowDown") || this.isDown("KeyS")) y += 1;
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  public reset() {
    this.keys.clear();
    this.pressedThisStep.clear();
    this.fireHeld = false;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    if (!this.keys.has(e.code)) this.pressedThisStep.add(e.code);
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => this.reset();

  private updateMouse(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    this.hasMouse = true;
  }

  private onPointerMove = (e: PointerEvent) => this.updateMouse(e);

  private onPointerDown = (e: PointerEvent) => {
    this.updateMouse(e);
    if (e.button === 0) this.fireHeld = true;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.button === 0) this.fireHeld = false;
  };

  private onContextMenu = (e: Event) => e.preventDefault();
}
