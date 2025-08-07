import { AnimatedSprite, Sprite, Texture } from "pixi.js";
import {
  blockTexture,
  keyTexture,
  ladderTexture,
  onewayTexture,
  playerIdleFrames,
  playerWalkFrames,
  pressingEvent,
  flipX,
  playerJumpFrames,
  playerFallFrames,
  playerLadderMoveFrames,
  playerLadderIdleFrames,
} from "./base.ts";
import { dt } from "./main.ts";

// オブジェクト
export abstract class GameObj {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  hitboxXStart: number;
  hitboxXEnd: number;
  hitboxYStart: number;
  hitboxYEnd: number;
  hitboxW: number;
  hitboxH: number;
  vx: number;
  vy: number;
  textureState: string;
  isSolid: boolean;
  cornerCorrectLen: number;
  isOnBlock: GameObj | null;
  isInLadder: Ladder | null;
  isOnLadder: Ladder | null;
  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    hitboxXStart: number,
    hitboxXEnd: number,
    hitboxYStart: number,
    hitboxYEnd: number,
    textureState: string,
    isSolid: boolean,
    cornerCorrectLen: number
  ) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.hitboxXStart = hitboxXStart;
    this.hitboxXEnd = hitboxXEnd;
    this.hitboxYStart = hitboxYStart;
    this.hitboxYEnd = hitboxYEnd;
    this.hitboxW = hitboxXEnd - hitboxXStart;
    this.hitboxH = hitboxYEnd - hitboxYStart;
    this.textureState = textureState;
    this.isSolid = isSolid;
    this.cornerCorrectLen = cornerCorrectLen;
    this.isOnBlock = null;
    this.isInLadder = null;
    this.isOnLadder = null;
  }
  get left(): number {
    return this.x;
  }
  get right(): number {
    return this.x + this.w;
  }
  get top(): number {
    return this.y;
  }
  get bottom(): number {
    return this.y + this.h;
  }
  get hitboxLeft(): number {
    return this.x + this.hitboxXStart;
  }
  get hitboxRight(): number {
    return this.x + this.hitboxXEnd;
  }
  get hitboxTop(): number {
    return this.y + this.hitboxYStart;
  }
  get hitboxBottom(): number {
    return this.y + this.hitboxYEnd;
  }
  get innerHitboxLeft(): number {
    return this.hitboxLeft + this.cornerCorrectLen;
  }
  get innerHitboxRight(): number {
    return this.hitboxRight - this.cornerCorrectLen;
  }
  get innerHitboxTop(): number {
    return this.hitboxTop + this.cornerCorrectLen;
  }
  get innerHitboxBottom(): number {
    return this.hitboxBottom - this.cornerCorrectLen;
  }
  // 重なり判定
  colliding(obj: GameObj): boolean {
    return (
      this.hitboxLeft < obj.hitboxRight &&
      this.hitboxRight > obj.hitboxLeft &&
      this.hitboxTop < obj.hitboxBottom &&
      this.hitboxBottom > obj.hitboxTop
    );
  }
  //着地
  collideBottom(objs: GameObj[]) {
    for (const obj of objs) {
      if (obj instanceof Oneway && obj.angle !== 0) continue;
      if (
        this.vy >= 0 &&
        this.innerHitboxBottom <= obj.hitboxTop &&
        this.hitboxBottom + this.vy * dt >= obj.hitboxTop &&
        !(
          (this.innerHitboxRight <= obj.hitboxLeft ||
            this.innerHitboxLeft >= obj.hitboxRight) &&
          (this.innerHitboxRight + this.vx * dt <= obj.hitboxLeft ||
            this.innerHitboxLeft + this.vx * dt >= obj.hitboxRight)
        )
      ) {
        this.y = obj.hitboxTop - this.hitboxYEnd;
        this.vx += obj.vx;
        this.vy = obj.vy;
        this.isOnBlock = obj;
        break;
      }
    }
  }
  collideBottomWithLadder(ladders: Ladder[]) {
    for (const ladder of ladders)
      if (
        this.vy >= 0 &&
        this.hitboxBottom <= ladder.hitboxTop &&
        this.hitboxBottom + this.vy * dt >= ladder.hitboxTop &&
        !(
          (this.innerHitboxRight <= ladder.hitboxLeft ||
            this.innerHitboxLeft >= ladder.hitboxRight) &&
          (this.innerHitboxRight + this.vx * dt <= ladder.hitboxLeft ||
            this.innerHitboxLeft + this.vx * dt >= ladder.hitboxRight)
        )
      ) {
        this.y = ladder.hitboxTop - this.hitboxYEnd;
        this.vx += ladder.vx;
        this.vy = ladder.vy;
        this.isOnLadder = ladder;
        break;
      }
  }
  // 天井衝突
  collideTop(objs: GameObj[]) {
    for (const obj of objs) {
      if (obj instanceof Oneway && obj.angle !== 180) continue;
      if (
        this.vy <= 0 &&
        this.innerHitboxTop >= obj.hitboxBottom &&
        this.hitboxTop + this.vy * dt <= obj.hitboxBottom + obj.vy * dt &&
        !(
          (this.innerHitboxRight <= obj.hitboxLeft ||
            this.innerHitboxLeft >= obj.hitboxRight) &&
          (this.innerHitboxRight + this.vx * dt <= obj.hitboxLeft ||
            this.innerHitboxLeft + this.vx * dt >= obj.hitboxRight)
        )
      ) {
        this.y = obj.hitboxBottom;
        this.vy = 0;
        break;
      }
    }
  }
  // 左側衝突
  collideLeft(objs: GameObj[]) {
    for (const obj of objs) {
      if (obj instanceof Oneway && obj.angle !== 90) continue;
      if (
        this.vx <= 0 &&
        this.innerHitboxLeft >= obj.hitboxRight &&
        this.hitboxLeft + this.vx * dt <= obj.hitboxRight &&
        !(
          (this.innerHitboxBottom <= obj.hitboxTop ||
            this.innerHitboxTop >= obj.hitboxBottom) &&
          (this.innerHitboxBottom + this.vy * dt <= obj.hitboxTop ||
            this.innerHitboxTop + this.vy * dt >= obj.hitboxBottom)
        )
      ) {
        this.x = obj.hitboxRight;
        this.vx = 0;
        break;
      }
    }
  }
  // 右側衝突
  collideRight(objs: GameObj[]) {
    for (const obj of objs) {
      if (obj instanceof Oneway && obj.angle !== 270) continue;
      if (
        this.vx >= 0 &&
        this.innerHitboxRight <= obj.hitboxLeft &&
        this.hitboxRight + this.vx * dt >= obj.hitboxLeft &&
        !(
          (this.innerHitboxBottom <= obj.hitboxTop ||
            this.innerHitboxTop >= obj.hitboxBottom) &&
          (this.innerHitboxBottom + this.vy * dt <= obj.hitboxTop ||
            this.innerHitboxTop + this.vy * dt >= obj.hitboxBottom)
        )
      ) {
        this.x = obj.hitboxLeft - this.hitboxXEnd;
        this.vx = 0;
        break;
      }
    }
  }
}
// 色
interface Colorable extends GameObj {
  color: string;
}
export function isColorable(obj: GameObj): obj is Colorable {
  return "color" in obj;
}
// アニメーション
interface NonAnimated extends GameObj {
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>; //"状態+groupD8の値"をインデックスとして、回転・反転後のテクスチャをキャッシュする
}
export function isNonAnimated(obj: GameObj): obj is NonAnimated {
  return "sprite" in obj && "generatedTextures" in obj;
}
interface Animated extends GameObj {
  animatedSprite: AnimatedSprite;
  baseFrames: Record<string, Texture[]>;
  generatedFrames: Map<string, Texture[]>;
}
export function isAnimated(obj: GameObj): obj is Animated {
  return "animatedSprite" in obj && "generatedFrames" in obj;
}
// プレイヤー
export class Player extends GameObj implements Animated {
  animatedSprite: AnimatedSprite;
  baseFrames: Record<string, Texture[]>;
  generatedFrames: Map<string, Texture[]>;
  constructor(x: number, y: number, w: number, h: number, angle: number) {
    super(x, y, w, h, angle, 0, w, 0, h, "idle", true, 0.2);
    const animatedSprite = new AnimatedSprite(playerIdleFrames);
    animatedSprite.animationSpeed = 0.125;
    this.animatedSprite = animatedSprite;
    this.baseFrames = {
      idle: playerIdleFrames,
      walk: playerWalkFrames,
      jump: playerJumpFrames,
      fall: playerFallFrames,
      ladderMove: playerLadderMoveFrames,
      ladderIdle: playerLadderIdleFrames,
    };
    this.generatedFrames = new Map();
    this.generatedFrames.set("idle_0", playerIdleFrames);
  }
  override collideBottomWithLadder(ladders: Ladder[]) {
    if (pressingEvent.down) return;
    super.collideBottomWithLadder(ladders);
  }
  handleLadder(ladders: Ladder[], dt: number) {
    // ハシゴ
    for (const ladder of ladders) {
      // 梯子判定
      if (this.colliding(ladder)) {
        this.isInLadder = ladder;
        break;
      } else this.isInLadder = null;
    }
    if (this.isInLadder) {
      if (pressingEvent.up && pressingEvent.down) this.vy = 0;
      else if (pressingEvent.up) {
        if (this.hitboxBottom - 0.005 * dt <= this.isInLadder.hitboxTop) {
          this.y = this.isInLadder.hitboxTop - this.hitboxYEnd;
          this.vy = 0;
        } else {
          this.vy = -0.005;
        } //梯子を登る
      } else if (pressingEvent.down) this.vy = 0.005; // 梯子を下る
      else this.vy = 0;
    }
  }
  handleHorizontalMove() {
    if (pressingEvent.left && pressingEvent.right) this.vx = 0;
    else if (pressingEvent.left) {
      if (this.animatedSprite.texture.rotate === 0) flipX(this);
      this.vx = -0.005;
    } else if (pressingEvent.right) {
      if (this.animatedSprite.texture.rotate === 12) flipX(this);
      this.vx = 0.005;
    } else this.vx = 0;
  }
}
// ブロック
export class Block extends GameObj implements Colorable, NonAnimated {
  color: string;
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>;
  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    isSolid: boolean,
    color: string
  ) {
    super(x, y, w, h, angle, 0, w, 0, h, "default", isSolid, 0);
    this.color = color;
    this.sprite = new Sprite(blockTexture);
    this.baseTextures = { default: blockTexture };
    this.generatedTextures = new Map();
    this.generatedTextures.set("default_0", blockTexture);
  }
}
// ハシゴ
export class Ladder extends GameObj implements NonAnimated {
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>;
  constructor(x: number, y: number, w: number, h: number, angle: number) {
    super(x, y, w, h, angle, 0, w, 0, h, "default", false, 0);
    this.sprite = new Sprite(ladderTexture);
    this.baseTextures = { default: ladderTexture };
    this.generatedTextures = new Map();
    this.generatedTextures.set("default_0", ladderTexture);
  }
}
// 鍵
export class Key extends GameObj implements Colorable, NonAnimated {
  color: string;
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>;
  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    color: string
  ) {
    super(x, y, w, h, angle, 0.2, w - 0.2, 0.2, h - 0.2, "default", false, 0);
    this.color = color;
    this.sprite = new Sprite(keyTexture);
    this.baseTextures = { default: keyTexture };
    this.generatedTextures = new Map();
    this.generatedTextures.set("default_0", keyTexture);
  }
}
// 一方通行ブロック
export class Oneway extends GameObj implements Colorable, NonAnimated {
  color: string;
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>;
  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    color: string
  ) {
    super(x, y, w, h, angle, 0, w, 0, h, "default", true, 0);
    this.color = color;
    this.sprite = new Sprite(onewayTexture);
    this.baseTextures = { default: onewayTexture };
    this.generatedTextures = new Map();
    this.generatedTextures.set("default_0", onewayTexture);
  }
}
