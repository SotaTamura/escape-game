import { AnimatedSprite, Sprite, Texture } from "pixi.js";
import { blockTexture, keyTexture, ladderTexture, onewayTexture, playerIdleFrames, playerWalkFrames, pressingEvent, flipX, playerJumpFrames, playerFallFrames, playerLadderMoveFrames, playerLadderIdleFrames, leverTextures, pushBlockTexture, portalTexture, changeTexture } from "./base.ts";

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
  initStrength: number;
  strength: Record<"top" | "bottom" | "left" | "right", number>; //数の大小によって、各方向から押されたときに動くか動かないか決まる
  cornerCorrectLen: number;
  isOnBlock: GameObj | null;
  isInLadder: Ladder | null;
  isInPortal: Portal | null;
  constructor(x: number, y: number, w: number, h: number, angle: number, hitboxXStart: number, hitboxXEnd: number, hitboxYStart: number, hitboxYEnd: number, textureState: string, isSolid: boolean, strength: number, cornerCorrectLen: number) {
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
    this.initStrength = strength;
    this.strength = { top: strength, bottom: strength, left: strength, right: strength };
    this.cornerCorrectLen = cornerCorrectLen;
    this.isOnBlock = null;
    this.isInLadder = null;
    this.isInPortal = null;
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
    return this.hitboxLeft < obj.hitboxRight && this.hitboxRight > obj.hitboxLeft && this.hitboxTop < obj.hitboxBottom && this.hitboxBottom > obj.hitboxTop;
  }
  //着地
  collideBottom(objs: GameObj[]) {
    let nearestObj: GameObj | null = null;
    for (const obj of objs) {
      if ((obj instanceof Oneway && obj.angle !== 0) || this.strength.bottom > obj.strength.top) continue;
      if (this.innerHitboxBottom <= obj.hitboxTop && this.hitboxBottom + this.vy >= obj.hitboxTop + obj.vy && !((this.innerHitboxRight <= obj.hitboxLeft || this.innerHitboxLeft >= obj.hitboxRight) && (this.innerHitboxRight + this.vx <= obj.hitboxLeft + obj.vx || this.innerHitboxLeft + this.vx >= obj.hitboxRight + obj.vx))) {
        if (!nearestObj || obj.hitboxTop > nearestObj.hitboxTop) {
          nearestObj = obj;
        }
      }
    }
    if (nearestObj && this.vy - nearestObj.vy >= 0) {
      this.y = nearestObj.hitboxTop - this.hitboxYEnd;
      this.vy = nearestObj.vy;
      this.isOnBlock = nearestObj;
      this.strength.top = nearestObj.strength.top;
    }
  }
  // 天井衝突
  collideTop(objs: GameObj[]) {
    let nearestObj: GameObj | null = null;
    for (const obj of objs) {
      if ((obj instanceof Oneway && obj.angle !== 180) || this.strength.top > obj.strength.bottom) continue;
      if (this.innerHitboxTop >= obj.hitboxBottom && this.hitboxTop + this.vy <= obj.hitboxBottom + obj.vy && !((this.innerHitboxRight <= obj.hitboxLeft || this.innerHitboxLeft >= obj.hitboxRight) && (this.innerHitboxRight + this.vx <= obj.hitboxLeft + obj.vx || this.innerHitboxLeft + this.vx >= obj.hitboxRight + obj.vx))) {
        if (!nearestObj || obj.hitboxBottom < nearestObj.hitboxBottom) {
          nearestObj = obj;
        }
      }
    }
    if (nearestObj && this.vy - nearestObj.vy <= 0) {
      this.vy = nearestObj.hitboxBottom + nearestObj.vy - this.hitboxYStart - this.y;
      this.strength.bottom = nearestObj.strength.bottom;
    }
  }
  // 左側衝突
  collideLeft(objs: GameObj[]) {
    let nearestObj: GameObj | null = null;
    for (const obj of objs) {
      if ((obj instanceof Oneway && obj.angle !== 90) || this.strength.left > obj.strength.right) continue;
      if (this.innerHitboxLeft >= obj.hitboxRight && this.hitboxLeft + this.vx <= obj.hitboxRight + obj.vx && !((this.innerHitboxBottom <= obj.hitboxTop || this.innerHitboxTop >= obj.hitboxBottom) && (this.innerHitboxBottom + this.vy <= obj.hitboxTop + obj.vy || this.innerHitboxTop + this.vy >= obj.hitboxBottom + obj.vy))) {
        if (!nearestObj || obj.hitboxRight > nearestObj.hitboxRight) {
          nearestObj = obj;
        }
      }
    }
    if (nearestObj && this.vx - nearestObj.vx <= 0) {
      this.vx = nearestObj.hitboxRight + nearestObj.vx - this.hitboxXStart - this.x;
      this.strength.right = nearestObj.strength.right;
    }
  }
  // 右側衝突
  collideRight(objs: GameObj[]) {
    let nearestObj: GameObj | null = null;
    for (const obj of objs) {
      if ((obj instanceof Oneway && obj.angle !== 270) || this.strength.right > obj.strength.left) continue;
      if (this.innerHitboxRight <= obj.hitboxLeft && this.hitboxRight + this.vx >= obj.hitboxLeft + obj.vx && !((this.innerHitboxBottom <= obj.hitboxTop || this.innerHitboxTop >= obj.hitboxBottom) && (this.innerHitboxBottom + this.vy <= obj.hitboxTop + obj.vy || this.innerHitboxTop + this.vy >= obj.hitboxBottom + obj.vy))) {
        if (!nearestObj || obj.hitboxLeft < nearestObj.hitboxLeft) {
          nearestObj = obj;
        }
      }
    }
    if (nearestObj && this.vx - nearestObj.vx >= 0) {
      this.vx = nearestObj.hitboxLeft + nearestObj.vx - this.hitboxXEnd - this.x;
      this.strength.left = nearestObj.strength.left;
    }
  }
  handlePortal(portals: Portal[]) {
    const wasInPortal = this.isInPortal;
    this.isInPortal = null;
    for (const portal of portals) {
      if (this.colliding(portal)) {
        this.isInPortal = portal;
        break;
      }
    }
    if (this.isInPortal && !wasInPortal) {
      const destination = portals.filter((p) => p.id === this.isInPortal!.id && p !== this.isInPortal)[0];
      if (destination) {
        this.x = destination.x;
        this.y = destination.y;
        this.vx = 0;
        this.vy = 0;
        this.isInPortal = destination;
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
  baseTextures: Record<string, Texture>; //元となるテクスチャ
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
    super(x, y, w, h, angle, 0, w, 0, h, "idle", true, 10000, 0.2);
    const animatedSprite = new AnimatedSprite(playerIdleFrames);
    animatedSprite.animationSpeed = 0.125;
    this.animatedSprite = animatedSprite;
    this.baseFrames = {
      idle: playerIdleFrames,
      walk: playerWalkFrames,
      jump: playerJumpFrames,
      fall: playerFallFrames,
      ladderMove: playerLadderMoveFrames,
      ladderIdle: playerLadderIdleFrames
    };
    this.generatedFrames = new Map();
    this.generatedFrames.set("idle_0", playerIdleFrames);
  }
  override collideBottom(objs: GameObj[]) {
    let nearestObj: GameObj | null = null;
    for (const obj of objs) {
      if ((obj instanceof Oneway && obj.angle !== 0) || this.strength.bottom > obj.strength.top) continue;
      else if (((obj instanceof Ladder && !pressingEvent.down && this.hitboxBottom <= obj.hitboxTop && this.hitboxBottom + this.vy >= obj.hitboxTop + obj.vy) || !(obj instanceof Ladder)) && this.innerHitboxBottom <= obj.hitboxTop && this.hitboxBottom + this.vy >= obj.hitboxTop + obj.vy && !((this.innerHitboxRight <= obj.hitboxLeft || this.innerHitboxLeft >= obj.hitboxRight) && (this.innerHitboxRight + this.vx < obj.hitboxLeft + obj.vx || this.innerHitboxLeft + this.vx > obj.hitboxRight + obj.vx))) {
        if (!nearestObj || obj.hitboxTop > nearestObj.hitboxTop) {
          nearestObj = obj;
        }
      }
    }
    if (nearestObj && this.vy - nearestObj.vy >= 0) {
      this.y = nearestObj.hitboxTop - this.hitboxYEnd;
      this.vy = nearestObj.vy;
      this.isOnBlock = nearestObj;
      this.strength.top = nearestObj.strength.top;
    }
  }
  handleLadder(ladders: Ladder[]) {
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
        if (this.hitboxBottom - 0.08 <= this.isInLadder.hitboxTop) {
          this.y = this.isInLadder.hitboxTop - this.hitboxYEnd;
          this.vy = 0;
        } else {
          this.vy = -0.08;
        } //梯子を登る
      } else if (pressingEvent.down) this.vy = 0.08; // 梯子を下る
      else this.vy = 0;
    }
  }
  handleHorizontalMove() {
    if (pressingEvent.left && pressingEvent.right) this.vx = 0;
    else if (pressingEvent.left) {
      if (this.animatedSprite.texture.rotate === 0) flipX(this);
      this.vx = -0.08;
    } else if (pressingEvent.right) {
      if (this.animatedSprite.texture.rotate === 12) flipX(this);
      this.vx = 0.08;
    } else this.vx = 0;
  }
  handleTexture() {
    if (this.isInLadder) {
      if (pressingEvent.up || pressingEvent.down) changeTexture(this, "ladderMove");
      else changeTexture(this, "ladderIdle");
    } else if (!this.isOnBlock) changeTexture(this, "jump");
    else {
      if (pressingEvent.left || pressingEvent.right) changeTexture(this, "walk");
      else changeTexture(this, "idle");
    }
  }
}
// ブロック
export class Block extends GameObj implements Colorable, NonAnimated {
  color: string;
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>;
  constructor(x: number, y: number, w: number, h: number, angle: number, isSolid: boolean, color: string) {
    super(x, y, w, h, angle, 0, w, 0, h, "default", isSolid, 20000, 0);
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
    super(x, y, w, h, angle, 0, w, 0, h, "default", false, 20000, 0);
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
  constructor(x: number, y: number, w: number, h: number, angle: number, color: string) {
    super(x, y, w, h, angle, 0.2, w - 0.2, 0.2, h - 0.2, "default", false, -1, 0);
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
  constructor(x: number, y: number, w: number, h: number, angle: number, color: string) {
    super(x, y, w, h, angle, 0, w, 0, h, "default", true, 20000, 0);
    this.color = color;
    this.sprite = new Sprite(onewayTexture);
    this.baseTextures = { default: onewayTexture };
    this.generatedTextures = new Map();
    this.generatedTextures.set("default_0", onewayTexture);
  }
}
// レバー
export class Lever extends GameObj implements Colorable, NonAnimated {
  color: string;
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>;
  isPlayerContacting: boolean;
  constructor(x: number, y: number, w: number, h: number, angle: number, color: string) {
    super(x, y, w, h, angle, 0.2, w - 0.2, 0.2, h - 0.2, "off", false, -1, 0);
    this.color = color;
    this.sprite = new Sprite(leverTextures[0]);
    this.baseTextures = { off: leverTextures[0], on: leverTextures[1] };
    this.generatedTextures = new Map();
    this.generatedTextures.set("off_0", leverTextures[0]);
    this.isPlayerContacting = false;
  }
}
// ポータル
export class Portal extends GameObj implements NonAnimated {
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>;
  id: string;
  constructor(x: number, y: number, w: number, h: number, angle: number, id: string) {
    super(x, y, w, h, angle, w / 2, w / 2, h / 2, h / 2, "default", false, -1, 0);
    this.sprite = new Sprite(portalTexture);
    this.baseTextures = { default: portalTexture };
    this.generatedTextures = new Map();
    this.generatedTextures.set("default_0", portalTexture);
    this.id = id;
  }
}
// 押せるブロック
export class PushBlock extends GameObj implements NonAnimated {
  sprite: Sprite;
  baseTextures: Record<string, Texture>;
  generatedTextures: Map<string, Texture>;
  constructor(x: number, y: number, w: number, h: number, angle: number) {
    super(x, y, w, h, angle, 0, w, 0, h, "default", true, 5000, 0.2);
    this.sprite = new Sprite(pushBlockTexture);
    this.baseTextures = { default: pushBlockTexture };
    this.generatedTextures = new Map();
    this.generatedTextures.set("default_0", pushBlockTexture);
  }
  handleLadder(ladders: Ladder[]) {
    // ハシゴ
    for (const ladder of ladders) {
      // 梯子判定
      if (this.colliding(ladder)) {
        this.isInLadder = ladder;
        break;
      } else this.isInLadder = null;
    }
    if (this.isInLadder) this.vy = 0;
  }
}
