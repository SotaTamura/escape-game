import { Sprite, Texture, Container } from "pixi.js";
import { blockTexture, keyTexture, ladderTexture, onewayTexture, playerIdleFrames, playerWalkFrames, pressingEvent, flipX, playerJumpFrames, playerFallFrames, playerLadderMoveFrames, playerLadderIdleFrames, leverTextures, pushBlockTexture, portalTextures, changeTexture, buttonTextures, moveBlockTextures, drawSprite, rotate } from "./base.ts";
import { SPEED, BLOCK_STRENGTH, STRENGTH_MOVE_BLOCK, PLAYER_STRENGTH, STRENGTH_PUSH_BLOCK, type Angle, CORNER_LEN, MOVE_OBJ_CORNER_LEN } from "../constants.ts";

// 箱
export class Box {
    owner: GameObj;
    relX: number;
    relY: number;
    w: number;
    h: number;
    counterpart: Record<"u" | "d" | "l" | "r", Box | null>;
    constructor(owner: GameObj, relX: number, relY: number, w: number, h: number) {
        this.owner = owner;
        this.relX = relX;
        this.relY = relY;
        this.w = w;
        this.h = h;
        this.counterpart = { u: null, d: null, l: null, r: null };
    }
    get relL(): number {
        return this.relX;
    }
    get relR(): number {
        return this.relX + this.w;
    }
    get relT(): number {
        return this.relY;
    }
    get relB(): number {
        return this.relY + this.h;
    }
    get l(): number {
        return this.owner.x + this.relL;
    }
    get r(): number {
        return this.owner.x + this.relR;
    }
    get t(): number {
        return this.owner.y + this.relT;
    }
    get b(): number {
        return this.owner.y + this.relB;
    }
    get centerX(): number {
        return this.l + this.w / 2;
    }
    get centerY(): number {
        return this.t + this.h / 2;
    }
}
// 当たり判定
export class Hitbox extends Box {
    cornerLen: number;
    counterpart: Record<"u" | "d" | "l" | "r", Hitbox | null>; //portalで使用
    counterpartHidden: Record<"u" | "d" | "l" | "r", Hitbox | null>; //portalで使用
    constructor(owner: GameObj, relX: number, relY: number, w: number, h: number, cornerLen: number) {
        super(owner, relX, relY, w, h);
        this.cornerLen = cornerLen;
        this.counterpart = { u: null, d: null, l: null, r: null };
        this.counterpartHidden = { u: null, d: null, l: null, r: null };
    }
    get innerL(): number {
        return this.l + this.cornerLen;
    }
    get innerR(): number {
        return this.r - this.cornerLen;
    }
    get innerT(): number {
        return this.t + this.cornerLen;
    }
    get innerB(): number {
        return this.b - this.cornerLen;
    }
}
// 描画する箱
export class SpriteBox extends Box {
    origin: Box;
    counterpart: Record<"u" | "d" | "l" | "r", SpriteBox | null>;
    constructor(owner: GameObj, relX: number, relY: number, w: number, h: number, origin: Box) {
        super(owner, relX, relY, w, h);
        this.origin = origin;
        this.counterpart = { u: null, d: null, l: null, r: null };
    }
}
// オブジェクト
export abstract class GameObj {
    x: number;
    y: number;
    ang: Angle;
    hitboxes: Hitbox[];
    hiddenHitboxes: Hitbox[];
    spriteBoxes: SpriteBox[];
    vx: number;
    vy: number;
    textureState: string;
    isSolid: boolean;
    initStrength: number;
    strength: Record<"t" | "b" | "l" | "r", number>; //数の大小によって、各方向から押されたときに動くか動かないか決まる
    onBlock: GameObj | null;
    inLadder: Ladder | null;
    movingInPortals: Portal[];
    container: Container;
    constructor(
        x: number,
        y: number,
        ang: Angle,
        hitboxes: {
            relX: number;
            relY: number;
            w: number;
            h: number;
        }[],
        spriteBoxes: {
            relX: number;
            relY: number;
            w: number;
            h: number;
        }[],
        textureState: string,
        isSolid: boolean,
        strength: number,
        cornerLen: number = CORNER_LEN
    ) {
        this.x = x;
        this.y = y;
        this.ang = ang;
        this.vx = 0;
        this.vy = 0;
        this.hitboxes = hitboxes.map((b) => new Hitbox(this, b.relX, b.relY, b.w, b.h, cornerLen));
        this.hiddenHitboxes = [];
        this.spriteBoxes = spriteBoxes.map((b) => new SpriteBox(this, b.relX, b.relY, b.w, b.h, new Box(this, b.relX, b.relY, b.w, b.h)));
        this.textureState = textureState;
        this.isSolid = isSolid;
        this.initStrength = strength;
        this.strength = { t: strength, b: strength, l: strength, r: strength };
        this.onBlock = null;
        this.inLadder = null;
        this.movingInPortals = [];
        this.container = new Container();
    }
    get boundingBox(): { l: number; r: number; t: number; b: number } {
        const allBoxes = [...this.hitboxes, ...this.spriteBoxes];
        const minL = Math.min(...allBoxes.map((b) => b.l));
        const maxR = Math.max(...allBoxes.map((b) => b.r));
        const minT = Math.min(...allBoxes.map((b) => b.t));
        const maxB = Math.max(...allBoxes.map((b) => b.b));
        return { l: minL, r: maxR, t: minT, b: maxB };
    }
    // 重なり判定
    collidingBox(box: Box): boolean {
        return this.hitboxes.some((thisBox) => thisBox.l < box.r && thisBox.r > box.l && thisBox.t < box.b && thisBox.b > box.t);
    }
    // --- [難解ゾーン] 衝突処理いろいろ ここから ---
    //着地
    collideBottom(objs: GameObj[]) {
        // 最も良い衝突解決策を保持するオブジェクト。yは最も高い位置（最小値）を見つけるためにInfinityで初期化。
        let resolvedCollision = {
            y: Infinity,
            vy: this.vy,
            onBlock: null as GameObj | null,
            strengthT: this.strength.t,
        };
        let hasCollision = false; // 衝突があったかどうかを示すフラグ
        // 衝突する可能性のあるすべてのオブジェクトをループ
        for (const obj of objs) {
            // 特定の条件下では衝突を無視する
            // 1. 相手が上方向以外の一方通行ブロックの場合
            // 2. 自分の下方向への強さが相手の上方向への強さより大きい場合（通り抜ける）
            if ((obj instanceof Oneway && obj.ang !== 0) || this.strength.b > obj.strength.t) continue;
            // 自分の各ヒットボックスと相手の各ヒットボックスをチェック
            for (const thisBox of [...this.hitboxes, ...this.hiddenHitboxes]) {
                for (const objBox of obj.hitboxes) {
                    if (this.hiddenHitboxes.includes(thisBox) && !(obj instanceof Portal)) continue;
                    // 衝突条件のチェック
                    // 1. 現在、自分の底が相手の上より上にある
                    // 2. 次のフレームで、自分の底が相手の上に達する、またはそれを越える
                    // 3. 水平方向で重なっている（現在または次のフレームで）
                    if (thisBox.innerB <= objBox.t && thisBox.b + this.vy >= objBox.t + obj.vy && !((thisBox.innerR <= objBox.l || thisBox.innerL >= objBox.r) && (thisBox.innerR + this.vx <= objBox.l + obj.vx || thisBox.innerL + this.vx >= objBox.r + obj.vx))) {
                        // 衝突した場合、新しいY座標を計算（相手の真上に着地）
                        const newY = objBox.t - thisBox.relB;
                        // 新しい垂直速度を計算。moveBlockの強さのオブジェクト同士なら速度を0に、そうでなければ相手の速度に合わせる（動く床など）
                        const newVy = this.strength.b === obj.strength.t && this.strength.b === STRENGTH_MOVE_BLOCK ? 0 : obj.vy;
                        // より高い位置への着地が見つかった場合、解決策を更新
                        if (newY < resolvedCollision.y) {
                            resolvedCollision = {
                                y: newY,
                                vy: newVy,
                                onBlock: obj,
                                strengthT: obj.strength.t,
                            };
                        } else if (newY === resolvedCollision.y) {
                            // 同じ高さの場合は、下向き速度が遅い（上向き速度が速い）方を優先
                            if (newVy < resolvedCollision.vy) {
                                resolvedCollision.vy = newVy;
                                resolvedCollision.onBlock = obj;
                                resolvedCollision.strengthT = obj.strength.t;
                            }
                        }
                        hasCollision = true;
                    }
                }
            }
        }
        // 衝突が検出され、かつ自分が下に移動していた場合にのみ、位置と速度を更新
        if (hasCollision && this.vy - resolvedCollision.vy >= 0) {
            this.y = resolvedCollision.y;
            this.vy = resolvedCollision.vy;
            this.onBlock = resolvedCollision.onBlock; // どのブロックに乗っているかを記録
            this.strength.t = resolvedCollision.strengthT; // 強さを更新
        }
    }
    // 天井衝突
    collideTop(objs: GameObj[]) {
        let resolvedCollision = {
            y: -Infinity,
            vy: this.vy,
            strengthB: this.strength.b,
        };
        let hasCollision = false;
        for (const obj of objs) {
            if ((obj instanceof Oneway && obj.ang !== 180) || this.strength.t > obj.strength.b) continue;
            for (const thisBox of [...this.hitboxes, ...this.hiddenHitboxes]) {
                for (const objBox of obj.hitboxes) {
                    if (this.hiddenHitboxes.includes(thisBox) && !(obj instanceof Portal)) continue;
                    if (thisBox.innerT >= objBox.b && thisBox.t + this.vy <= objBox.b + obj.vy && !((thisBox.innerR <= objBox.l || thisBox.innerL >= objBox.r) && (thisBox.innerR + this.vx <= objBox.l + obj.vx || thisBox.innerL + this.vx >= objBox.r + obj.vx))) {
                        const newY = objBox.b - thisBox.relT;
                        const newVy = this.strength.t === obj.strength.b && this.strength.t === STRENGTH_MOVE_BLOCK ? 0 : obj.vy;
                        if (newY > resolvedCollision.y) {
                            resolvedCollision = {
                                y: newY,
                                vy: newVy,
                                strengthB: obj.strength.b,
                            };
                        } else if (newY === resolvedCollision.y) {
                            if (newVy > resolvedCollision.vy) {
                                resolvedCollision.vy = newVy;
                                resolvedCollision.strengthB = obj.strength.b;
                            }
                        }
                        hasCollision = true;
                    }
                }
            }
        }
        if (hasCollision && this.vy - resolvedCollision.vy <= 0) {
            this.y = resolvedCollision.y;
            this.vy = resolvedCollision.vy;
            this.strength.b = resolvedCollision.strengthB;
        }
    }
    // 左側衝突
    collideLeft(objs: GameObj[]) {
        let resolvedCollision = {
            x: -Infinity,
            vx: this.vx,
            strengthR: this.strength.r,
        };
        let hasCollision = false;
        for (const obj of objs) {
            if ((obj instanceof Oneway && obj.ang !== 90) || this.strength.l > obj.strength.r) continue;
            for (const thisBox of [...this.hitboxes, ...this.hiddenHitboxes]) {
                for (const objBox of obj.hitboxes) {
                    if (this.hiddenHitboxes.includes(thisBox) && !(obj instanceof Portal)) continue;
                    if (thisBox.innerL >= objBox.r && thisBox.l + this.vx <= objBox.r + obj.vx && !((thisBox.innerB <= objBox.t || thisBox.innerT >= objBox.b) && (thisBox.innerB + this.vy <= objBox.t + obj.vy || thisBox.innerT + this.vy >= objBox.b + obj.vy))) {
                        const newX = objBox.r - thisBox.relL;
                        const newVx = this.strength.l === obj.strength.r && this.strength.l === STRENGTH_MOVE_BLOCK ? 0 : obj.vx;
                        if (newX > resolvedCollision.x) {
                            resolvedCollision = {
                                x: newX,
                                vx: newVx,
                                strengthR: obj.strength.r,
                            };
                        } else if (newX === resolvedCollision.x) {
                            if (newVx > resolvedCollision.vx) {
                                resolvedCollision.vx = newVx;
                                resolvedCollision.strengthR = obj.strength.r;
                            }
                        }
                        hasCollision = true;
                    }
                }
            }
        }
        if (hasCollision && this.vx - resolvedCollision.vx <= 0) {
            this.x = resolvedCollision.x;
            this.vx = resolvedCollision.vx;
            this.strength.r = resolvedCollision.strengthR;
        }
    }
    // 右側衝突
    collideRight(objs: GameObj[]) {
        let resolvedCollision = {
            x: Infinity,
            vx: this.vx,
            strengthL: this.strength.l,
        };
        let hasCollision = false;
        for (const obj of objs) {
            if ((obj instanceof Oneway && obj.ang !== -90) || this.strength.r > obj.strength.l) continue;
            for (const thisBox of [...this.hitboxes, ...this.hiddenHitboxes]) {
                for (const objBox of obj.hitboxes) {
                    if (this.hiddenHitboxes.includes(thisBox) && !(obj instanceof Portal)) continue;
                    if (thisBox.innerR <= objBox.l && thisBox.r + this.vx >= objBox.l + obj.vx && !((thisBox.innerB <= objBox.t || thisBox.innerT >= objBox.b) && (thisBox.innerB + this.vy <= objBox.t + obj.vy || thisBox.innerT + this.vy >= objBox.b + obj.vy))) {
                        const newX = objBox.l - thisBox.relR;
                        const newVx = this.strength.r === obj.strength.l && this.strength.r === STRENGTH_MOVE_BLOCK ? 0 : obj.vx;
                        if (newX < resolvedCollision.x) {
                            resolvedCollision = {
                                x: newX,
                                vx: newVx,
                                strengthL: obj.strength.l,
                            };
                        } else if (newX === resolvedCollision.x) {
                            if (newVx < resolvedCollision.vx) {
                                resolvedCollision.vx = newVx;
                                resolvedCollision.strengthL = obj.strength.l;
                            }
                        }
                        hasCollision = true;
                    }
                }
            }
        }
        if (hasCollision && this.vx - resolvedCollision.vx >= 0) {
            this.x = resolvedCollision.x;
            this.vx = resolvedCollision.vx;
            this.strength.l = resolvedCollision.strengthL;
        }
    }
    // --- 衝突処理いろいろ ここまで ---
    // ポータル
    handlePortal(portals: Portal[]) {
        this.movingInPortals = [];
        for (const p of portals) {
            const entrance = p.triggers[0];
            const exitPortals = portals.filter((p2) => p2.id === p.id && p2 !== p);
            let exit;
            if (exitPortals.length === 1) {
                exit = portals.filter((p2) => p2.id === p.id && p2 !== p)[0].triggers[0];
            } else if (exitPortals.length === 0) {
                throw new Error(`There is only 1 portal with id ${p.id}`);
            } else {
                throw new Error(`There are ${exitPortals.length + 1} portals with id ${p.id}`);
            }
            // 右方向
            if (p.ang === -90) {
                const distanceX = exit.r - entrance.l;
                const distanceY = exit.t - entrance.t;
                for (const hitbox of this.hitboxes) {
                    if (hitbox.t >= entrance.t && hitbox.b <= entrance.b && hitbox.r >= entrance.l && hitbox.l < entrance.r) {
                        if (hitbox.counterpart.r && hitbox.counterpartHidden.r && hitbox.counterpart.r.counterpartHidden.l) {
                            hitbox.counterpart.r.relX -= Math.min(hitbox.r - entrance.l, hitbox.w);
                            hitbox.counterpart.r.w += Math.min(hitbox.r - entrance.l, hitbox.w);
                            hitbox.counterpartHidden.r.relX = entrance.centerX - this.x;
                            hitbox.counterpart.r.counterpartHidden.l.relX = exit.centerX - this.x;
                        } else {
                            hitbox.counterpart.r = new Hitbox(this, exit.r - this.x, distanceY + hitbox.relY, hitbox.r - entrance.l, hitbox.h, hitbox.cornerLen);
                            hitbox.counterpart.r.counterpart.l = hitbox;
                            this.hitboxes.push(hitbox.counterpart.r);
                            hitbox.counterpartHidden.r = new Hitbox(this, entrance.centerX - this.x, hitbox.relY, 0, hitbox.h, 0);
                            hitbox.counterpart.r.counterpartHidden.l = new Hitbox(this, exit.centerX - this.x, distanceY + hitbox.relY, 0, hitbox.h, 0);
                            this.hiddenHitboxes.push(hitbox.counterpartHidden.r, hitbox.counterpart.r.counterpartHidden.l);
                        }
                        hitbox.w = entrance.l - hitbox.l;
                        if (hitbox.w < 0) {
                            this.hitboxes = this.hitboxes.filter((h) => h !== hitbox);
                            hitbox.counterpart.r.counterpart.l = null;
                            this.hiddenHitboxes = this.hiddenHitboxes.filter((h) => h !== hitbox.counterpartHidden.r && h !== hitbox.counterpart.r?.counterpartHidden.l);
                            hitbox.counterpartHidden.r = null;
                            hitbox.counterpart.r.counterpartHidden.l = null;
                            hitbox.counterpart.r.w = Math.round(hitbox.counterpart.r.w * 1000) / 1000;
                        }
                    }
                }
                for (const spriteBox of this.spriteBoxes) {
                    if (spriteBox.t >= entrance.t && spriteBox.b <= entrance.b && spriteBox.r >= entrance.l && spriteBox.l < entrance.r) {
                        if (spriteBox.counterpart.r) {
                            spriteBox.counterpart.r.relX -= Math.min(spriteBox.r - entrance.l, spriteBox.w);
                            spriteBox.counterpart.r.w += Math.min(spriteBox.r - entrance.l, spriteBox.w);
                        } else {
                            spriteBox.counterpart.r = new SpriteBox(this, exit.r - this.x, distanceY + spriteBox.relY, spriteBox.r - entrance.l, spriteBox.h, new Box(this, distanceX + spriteBox.origin.relX, distanceY + spriteBox.origin.relY, spriteBox.origin.w, spriteBox.origin.h));
                            spriteBox.counterpart.r.counterpart.l = spriteBox;
                            this.spriteBoxes.push(spriteBox.counterpart.r);
                        }
                        spriteBox.w = entrance.l - spriteBox.l;
                        if (spriteBox.w < 0) {
                            this.spriteBoxes = this.spriteBoxes.filter((s) => s !== spriteBox);
                            spriteBox.counterpart.r.counterpart.l = null;
                            spriteBox.counterpart.r.w = Math.round(spriteBox.counterpart.r.w * 1000) / 1000;
                        }
                        drawSprite(this);
                    }
                }
            }
            // 左方向
            if (p.ang === 90) {
                const distanceX = exit.l - entrance.r;
                const distanceY = exit.t - entrance.t;
                for (const hitbox of this.hitboxes) {
                    if (hitbox.t >= entrance.t && hitbox.b <= entrance.b && hitbox.l <= entrance.r && hitbox.r > entrance.l) {
                        if (hitbox.counterpart.l && hitbox.counterpartHidden.l && hitbox.counterpart.l.counterpartHidden.r) {
                            hitbox.counterpart.l.w += Math.min(entrance.r - hitbox.l, hitbox.w);
                            hitbox.counterpartHidden.l.relX = entrance.centerX - this.x;
                            hitbox.counterpart.l.counterpartHidden.r.relX = exit.centerX - this.x;
                        } else {
                            hitbox.counterpart.l = new Hitbox(this, exit.l - entrance.r + hitbox.relX, distanceY + hitbox.relY, entrance.r - hitbox.l, hitbox.h, hitbox.cornerLen);
                            hitbox.counterpart.l.counterpart.r = hitbox;
                            this.hitboxes.push(hitbox.counterpart.l);
                            hitbox.counterpartHidden.l = new Hitbox(this, entrance.centerX - this.x, hitbox.relY, 0, hitbox.h, 0);
                            hitbox.counterpart.l.counterpartHidden.r = new Hitbox(this, exit.centerX - this.x, distanceY + hitbox.relY, 0, hitbox.h, 0);
                            this.hiddenHitboxes.push(hitbox.counterpartHidden.l, hitbox.counterpart.l.counterpartHidden.r);
                        }
                        const delta = entrance.r - hitbox.l;
                        hitbox.relX += delta;
                        hitbox.w -= delta;
                        if (hitbox.w < 0) {
                            this.hitboxes = this.hitboxes.filter((h) => h !== hitbox);
                            hitbox.counterpart.l.counterpart.r = null;
                            this.hiddenHitboxes = this.hiddenHitboxes.filter((h) => h !== hitbox.counterpartHidden.l && h !== hitbox.counterpart.l?.counterpartHidden.r);
                            hitbox.counterpartHidden.l = null;
                            hitbox.counterpart.l.counterpartHidden.r = null;
                            hitbox.counterpart.l.w = Math.round(hitbox.counterpart.l.w * 1000) / 1000;
                        }
                    }
                }
                for (const spriteBox of this.spriteBoxes) {
                    if (spriteBox.t >= entrance.t && spriteBox.b <= entrance.b && spriteBox.l <= entrance.r && spriteBox.r > entrance.l) {
                        if (spriteBox.counterpart.l) {
                            spriteBox.counterpart.l.w += Math.min(entrance.r - spriteBox.l, spriteBox.w);
                        } else {
                            spriteBox.counterpart.l = new SpriteBox(this, exit.l - entrance.r + spriteBox.relX, distanceY + spriteBox.relY, entrance.r - spriteBox.l, spriteBox.h, new Box(this, distanceX + spriteBox.origin.relX, distanceY + spriteBox.origin.relY, spriteBox.origin.w, spriteBox.origin.h));
                            spriteBox.counterpart.l.counterpart.r = spriteBox;
                            this.spriteBoxes.push(spriteBox.counterpart.l);
                        }
                        const delta = entrance.r - spriteBox.l;
                        spriteBox.relX += delta;
                        spriteBox.w -= delta;
                        if (spriteBox.w < 0) {
                            this.spriteBoxes = this.spriteBoxes.filter((s) => s !== spriteBox);
                            spriteBox.counterpart.l.counterpart.r = null;
                            spriteBox.counterpart.l.w = Math.round(spriteBox.counterpart.l.w * 1000) / 1000;
                        }
                        drawSprite(this);
                    }
                }
            }
            // 下方向
            if (p.ang === 0) {
                const distanceX = exit.l - entrance.l;
                const distanceY = exit.b - entrance.t;
                for (const hitbox of this.hitboxes) {
                    if (hitbox.l >= entrance.l && hitbox.r <= entrance.r && hitbox.b >= entrance.t && hitbox.t < entrance.b) {
                        if (hitbox.counterpart.d && hitbox.counterpartHidden.d && hitbox.counterpart.d.counterpartHidden.u) {
                            hitbox.counterpart.d.relY -= Math.min(hitbox.b - entrance.t, hitbox.h);
                            hitbox.counterpart.d.h += Math.min(hitbox.b - entrance.t, hitbox.h);
                            hitbox.counterpartHidden.d.relY = entrance.centerY - this.y;
                            hitbox.counterpart.d.counterpartHidden.u.relY = exit.centerY - this.y;
                        } else {
                            hitbox.counterpart.d = new Hitbox(this, distanceX + hitbox.relX, exit.b - this.y, hitbox.w, hitbox.b - entrance.t, hitbox.cornerLen);
                            hitbox.counterpart.d.counterpart.u = hitbox;
                            this.hitboxes.push(hitbox.counterpart.d);
                            hitbox.counterpartHidden.d = new Hitbox(this, hitbox.relX, entrance.centerY - this.y, hitbox.w, 0, 0);
                            hitbox.counterpart.d.counterpartHidden.u = new Hitbox(this, distanceX + hitbox.relX, exit.centerY - this.y, hitbox.w, 0, 0);
                            this.hiddenHitboxes.push(hitbox.counterpartHidden.d, hitbox.counterpart.d.counterpartHidden.u);
                        }
                        hitbox.h = entrance.t - hitbox.t;
                        if (hitbox.h < 0) {
                            this.hitboxes = this.hitboxes.filter((h) => h !== hitbox);
                            hitbox.counterpart.d.counterpart.u = null;
                            this.hiddenHitboxes = this.hiddenHitboxes.filter((h) => h !== hitbox.counterpartHidden.d && h !== hitbox.counterpart.d?.counterpartHidden.u);
                            hitbox.counterpartHidden.d = null;
                            hitbox.counterpart.d.counterpartHidden.u = null;
                            hitbox.counterpart.d.h = Math.round(hitbox.counterpart.d.h * 1000) / 1000;
                        }
                    }
                }
                for (const spriteBox of this.spriteBoxes) {
                    if (spriteBox.l >= entrance.l && spriteBox.r <= entrance.r && spriteBox.b >= entrance.t && spriteBox.t < entrance.b) {
                        if (spriteBox.counterpart.d) {
                            spriteBox.counterpart.d.relY -= Math.min(spriteBox.b - entrance.t, spriteBox.h);
                            spriteBox.counterpart.d.h += Math.min(spriteBox.b - entrance.t, spriteBox.h);
                        } else {
                            spriteBox.counterpart.d = new SpriteBox(this, distanceX + spriteBox.relX, exit.b - this.y, spriteBox.w, spriteBox.b - entrance.t, new Box(this, distanceX + spriteBox.origin.relX, distanceY + spriteBox.origin.relY, spriteBox.origin.w, spriteBox.origin.h));
                            spriteBox.counterpart.d.counterpart.u = spriteBox;
                            this.spriteBoxes.push(spriteBox.counterpart.d);
                        }
                        spriteBox.h = entrance.t - spriteBox.t;
                        if (spriteBox.h < 0) {
                            this.spriteBoxes = this.spriteBoxes.filter((s) => s !== spriteBox);
                            spriteBox.counterpart.d.counterpart.u = null;
                            spriteBox.counterpart.d.h = Math.round(spriteBox.counterpart.d.h * 1000) / 1000;
                        }
                        drawSprite(this);
                    }
                }
            }
            // 上方向
            if (p.ang === 180) {
                const distanceX = exit.l - entrance.l;
                const distanceY = exit.t - entrance.b;
                for (const hitbox of this.hitboxes) {
                    if (hitbox.l >= entrance.l && hitbox.r <= entrance.r && hitbox.t <= entrance.b && hitbox.b > entrance.t) {
                        if (hitbox.counterpart.u && hitbox.counterpartHidden.u && hitbox.counterpart.u.counterpartHidden.d) {
                            hitbox.counterpart.u.h += Math.min(entrance.b - hitbox.t, hitbox.h);
                            hitbox.counterpartHidden.u.relY = entrance.centerY - this.y;
                            hitbox.counterpart.u.counterpartHidden.d.relY = exit.centerY - this.y;
                        } else {
                            hitbox.counterpart.u = new Hitbox(this, distanceX + hitbox.relX, exit.t - entrance.b + hitbox.relY, hitbox.w, entrance.b - hitbox.t, hitbox.cornerLen);
                            hitbox.counterpart.u.counterpart.d = hitbox;
                            this.hitboxes.push(hitbox.counterpart.u);
                            hitbox.counterpartHidden.u = new Hitbox(this, hitbox.relX, entrance.centerY - this.y, hitbox.w, 0, 0);
                            hitbox.counterpart.u.counterpartHidden.d = new Hitbox(this, distanceX + hitbox.relX, exit.centerY - this.y, hitbox.w, 0, 0);
                            this.hiddenHitboxes.push(hitbox.counterpartHidden.u, hitbox.counterpart.u.counterpartHidden.d);
                        }
                        const delta = entrance.b - hitbox.t;
                        hitbox.relY += delta;
                        hitbox.h -= delta;
                        if (hitbox.h < 0) {
                            this.hitboxes = this.hitboxes.filter((h) => h !== hitbox);
                            hitbox.counterpart.u.counterpart.d = null;
                            this.hiddenHitboxes = this.hiddenHitboxes.filter((h) => h !== hitbox.counterpartHidden.u && h !== hitbox.counterpart.u?.counterpartHidden.d);
                            hitbox.counterpartHidden.u = null;
                            hitbox.counterpart.u.counterpartHidden.d = null;
                            hitbox.counterpart.u.h = Math.round(hitbox.counterpart.u.h * 1000) / 1000;
                        }
                    }
                }
                for (const spriteBox of this.spriteBoxes) {
                    if (spriteBox.l >= entrance.l && spriteBox.r <= entrance.r && spriteBox.t <= entrance.b && spriteBox.b > entrance.t) {
                        if (spriteBox.counterpart.u) {
                            spriteBox.counterpart.u.h += Math.min(entrance.b - spriteBox.t, spriteBox.h);
                        } else {
                            spriteBox.counterpart.u = new SpriteBox(this, distanceX + spriteBox.relX, exit.t - entrance.b + spriteBox.relY, spriteBox.w, entrance.b - spriteBox.t, new Box(this, distanceX + spriteBox.origin.relX, distanceY + spriteBox.origin.relY, spriteBox.origin.w, spriteBox.origin.h));
                            spriteBox.counterpart.u.counterpart.d = spriteBox;
                            this.spriteBoxes.push(spriteBox.counterpart.u);
                        }
                        const delta = entrance.b - spriteBox.t;
                        spriteBox.relY += delta;
                        spriteBox.h -= delta;
                        if (spriteBox.h < 0) {
                            this.spriteBoxes = this.spriteBoxes.filter((s) => s !== spriteBox);
                            spriteBox.counterpart.u.counterpart.d = null;
                            spriteBox.counterpart.u.h = Math.round(spriteBox.counterpart.u.h * 1000) / 1000;
                        }
                        drawSprite(this);
                    }
                }
            }
        }
    }
}
// 色
interface Colorable extends GameObj {
    color: string | undefined;
}
export function isColorable(obj: GameObj): obj is Colorable {
    return "color" in obj;
}
// アニメーション
interface NonAnimated extends GameObj {
    baseTextures: Record<string, Texture>; //元となるテクスチャ
    generatedTextures: Map<string, Texture>; //"状態+groupD8の値"をインデックスとして、回転・反転後のテクスチャをキャッシュする
}
export function isNonAnimated(obj: GameObj): obj is NonAnimated {
    return "baseTextures" in obj && "generatedTextures" in obj;
}
interface Animated extends GameObj {
    baseFrames: Record<string, Texture[]>;
    generatedFrames: Map<string, Texture[]>;
}
export function isAnimated(obj: GameObj): obj is Animated {
    return "baseFrames" in obj && "generatedFrames" in obj;
}
// トリガーボックス
interface hasTriggers extends GameObj {
    triggers: Box[];
}
export function isHasTriggers(obj: GameObj): obj is hasTriggers {
    return "triggers" in obj;
}
// プレイヤー
export class Player extends GameObj implements Animated {
    baseFrames: Record<string, Texture[]>;
    generatedFrames: Map<string, Texture[]>;
    constructor(x: number, y: number, w: number, h: number, ang: Angle) {
        super(x, y, ang, [{ relX: 0, relY: 0, w: w, h: h }], [{ relX: 0, relY: 0, w: w, h: h }], "idle", true, PLAYER_STRENGTH, MOVE_OBJ_CORNER_LEN);
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
    override collideBottom(objs: GameObj[]) {
        let resolvedCollision = {
            y: Infinity,
            vy: this.vy,
            onBlock: null as GameObj | null,
            strengthT: this.strength.t,
        };
        let hasCollision = false;

        for (const obj of objs) {
            if ((obj instanceof Oneway && obj.ang !== 0) || this.strength.b > obj.strength.t) continue;
            for (const thisBox of [...this.hitboxes, ...this.hiddenHitboxes]) {
                for (const objBox of obj.hitboxes) {
                    if (this.hiddenHitboxes.includes(thisBox) && !(obj instanceof Portal)) continue;
                    if (((obj instanceof Ladder && !pressingEvent.d && thisBox.b <= objBox.t && thisBox.b + this.vy >= objBox.t + obj.vy) || !(obj instanceof Ladder)) && thisBox.innerB <= objBox.t && thisBox.b + this.vy >= objBox.t + obj.vy && !((thisBox.innerR <= objBox.l || thisBox.innerL >= objBox.r) && (thisBox.innerR + this.vx < objBox.l + obj.vx || thisBox.innerL + this.vx > objBox.r + obj.vx))) {
                        const newY = objBox.t - thisBox.relB;
                        const newVy = this.strength.b === obj.strength.t && this.strength.b === STRENGTH_MOVE_BLOCK ? 0 : obj.vy;

                        if (newY < resolvedCollision.y) {
                            resolvedCollision = {
                                y: newY,
                                vy: newVy,
                                onBlock: obj,
                                strengthT: obj.strength.t,
                            };
                        } else if (newY === resolvedCollision.y) {
                            if (newVy < resolvedCollision.vy) {
                                resolvedCollision = {
                                    y: newY,
                                    vy: newVy,
                                    onBlock: obj,
                                    strengthT: obj.strength.t,
                                };
                            } else if (resolvedCollision.onBlock && newVy === resolvedCollision.vy && obj.initStrength > resolvedCollision.onBlock.initStrength) {
                                resolvedCollision.onBlock = obj;
                                resolvedCollision.strengthT = obj.strength.t;
                            }
                        }
                        hasCollision = true;
                    }
                }
            }
        }

        if (hasCollision && this.vy - resolvedCollision.vy >= 0) {
            this.y = resolvedCollision.y;
            this.vy = resolvedCollision.vy;
            this.onBlock = resolvedCollision.onBlock;
            if (this.onBlock) {
                this.strength.t = this.onBlock.strength.t;
            }
        }
    }
    handleLadder(ladders: Ladder[]) {
        // ハシゴ
        for (const ladder of ladders) {
            // 梯子判定
            if (this.collidingBox(ladder.triggers[0])) {
                this.inLadder = ladder;
                break;
            } else this.inLadder = null;
        }
        if (this.inLadder) {
            if (pressingEvent.u && pressingEvent.d) this.vy = 0;
            else if (pressingEvent.u) {
                if (this.hitboxes[0].b - SPEED <= this.inLadder.hitboxes[0].t) {
                    this.y = this.inLadder.hitboxes[0].t - this.hitboxes[0].relB;
                    this.vy = 0;
                } else {
                    this.vy = -SPEED;
                } //梯子を登る
            } else if (pressingEvent.d) this.vy = SPEED; // 梯子を下る
            else this.vy = 0;
        }
    }
    handleHorizontalMove() {
        const currentRotation = (this.container.children[0] as Sprite).texture.rotate;
        if (pressingEvent.l && pressingEvent.r) this.vx = 0;
        else if (pressingEvent.l) {
            if (currentRotation === 0) flipX(this);
            this.vx = -SPEED;
        } else if (pressingEvent.r) {
            if (currentRotation === 12) flipX(this);
            this.vx = SPEED;
        } else this.vx = 0;
    }
    handleTexture() {
        if (this.inLadder) {
            if (pressingEvent.u || pressingEvent.d) changeTexture(this, "ladderMove");
            else changeTexture(this, "ladderIdle");
        } else if (!this.onBlock) changeTexture(this, "jump");
        else {
            if (pressingEvent.l || pressingEvent.r) changeTexture(this, "walk");
            else changeTexture(this, "idle");
        }
    }
}
// ブロック
export class Block extends GameObj implements Colorable, NonAnimated {
    color: string | undefined;
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    constructor(x: number, y: number, w: number, h: number, ang: Angle, isSolid: boolean, color: string | undefined) {
        super(x, y, ang, [{ relX: 0, relY: 0, w: w, h: h }], [{ relX: 0, relY: 0, w: w, h: h }], "default", isSolid, BLOCK_STRENGTH);
        this.color = color;
        this.baseTextures = { default: blockTexture };
        this.generatedTextures = new Map();
        this.generatedTextures.set("default_0", blockTexture);
    }
}
// ハシゴ
export class Ladder extends GameObj implements NonAnimated, hasTriggers {
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    triggers: Box[];
    constructor(x: number, y: number, w: number, h: number, ang: Angle) {
        super(x, y, ang, [{ relX: 0, relY: 0, w: w, h: h }], [{ relX: 0, relY: 0, w: w, h: h }], "default", false, BLOCK_STRENGTH);
        this.baseTextures = { default: ladderTexture };
        this.generatedTextures = new Map();
        this.generatedTextures.set("default_0", ladderTexture);
        this.triggers = [new Box(this, 0, 0, w, h)];
    }
}
// 鍵
export class Key extends GameObj implements Colorable, NonAnimated, hasTriggers {
    color: string | undefined;
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    triggers: Box[];
    constructor(x: number, y: number, w: number, h: number, ang: Angle, color: string | undefined) {
        super(x, y, ang, [{ relX: 0, relY: 0, w: w, h: h }], [{ relX: 0, relY: 0, w: w, h: h }], "default", false, -1);
        this.color = color;
        this.baseTextures = { default: keyTexture };
        this.generatedTextures = new Map();
        this.generatedTextures.set("default_0", keyTexture);
        this.triggers = [new Box(this, 0.2, 0.2, w - 0.4, h - 0.4)];
    }
}
// 一方通行ブロック
export class Oneway extends GameObj implements Colorable, NonAnimated {
    color: string | undefined;
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    constructor(x: number, y: number, w: number, h: number, ang: Angle, color: string | undefined) {
        super(x, y, ang, [{ relX: 0, relY: 0, w: w, h: h }], [{ relX: 0, relY: 0, w: w, h: h }], "default", true, BLOCK_STRENGTH);
        this.color = color;
        this.baseTextures = { default: onewayTexture };
        this.generatedTextures = new Map();
        this.generatedTextures.set("default_0", onewayTexture);
    }
}
// レバー
export class Lever extends GameObj implements Colorable, NonAnimated, hasTriggers {
    color: string | undefined;
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    isBeingContacted: boolean;
    triggers: Box[];
    constructor(x: number, y: number, w: number, h: number, ang: Angle, color: string | undefined) {
        super(x, y, ang, [{ relX: 0, relY: 0, w: w, h: h }], [{ relX: 0, relY: 0, w: w, h: h }], "off", false, -1);
        this.color = color;
        this.baseTextures = { off: leverTextures[0], on: leverTextures[1] };
        this.generatedTextures = new Map();
        this.generatedTextures.set("off_0", leverTextures[0]);
        this.isBeingContacted = false;
        this.triggers = [new Box(this, 0.2, 0.2, w - 0.4, h - 0.4)];
    }
}
// ポータル
export class Portal extends GameObj implements NonAnimated, hasTriggers {
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    triggers: Box[];
    id: string;
    constructor(x: number, y: number, w: number, h: number, ang: Angle, id: string) {
        super(
            x,
            y,
            ang,
            [
                { relX: 0, relY: 0, w: 0, h: h / 2 },
                { relX: w, relY: 0, w: 0, h: h / 2 },
                { relX: 0, relY: h / 2, w: w, h: 0 },
            ],
            [{ relX: 0, relY: 0, w: w, h: h }],
            "default",
            true,
            BLOCK_STRENGTH
        );
        this.baseTextures = { default: portalTextures[0] };
        this.generatedTextures = new Map();
        this.generatedTextures.set("default_0", portalTextures[0]);
        this.id = id;
        this.triggers = [new Box(this, 0, 0, w, h / 2)];
        [...this.hitboxes, ...this.triggers].forEach((t) => {
            rotate(t, ang, w, h);
        });
    }
}
// 押しブロック
export class PushBlock extends GameObj implements NonAnimated {
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    constructor(x: number, y: number, w: number, h: number, ang: Angle) {
        super(x, y, ang, [{ relX: 0, relY: 0, w: w, h: h }], [{ relX: 0, relY: 0, w: w, h: h }], "default", true, STRENGTH_PUSH_BLOCK, 0.2);
        this.baseTextures = { default: pushBlockTexture };
        this.generatedTextures = new Map();
        this.generatedTextures.set("default_0", pushBlockTexture);
    }
    handleLadder(ladders: Ladder[]) {
        // ハシゴ
        for (const ladder of ladders) {
            // 梯子判定
            if (this.collidingBox(ladder.triggers[0])) {
                this.inLadder = ladder;
                break;
            } else this.inLadder = null;
        }
        if (this.inLadder) this.vy = 0;
    }
}
// ボタン
export class Button extends GameObj implements Colorable, NonAnimated {
    color: string | undefined;
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    isPressed: Boolean;
    constructor(x: number, y: number, w: number, h: number, ang: Angle, color: string | undefined) {
        super(x, y, ang, [{ relX: 0, relY: (3 / 4) * h, w: w, h: h / 4 }], [{ relX: 0, relY: 0, w: w, h: h }], "off", true, BLOCK_STRENGTH);
        this.hitboxes.forEach((b) => {
            rotate(b, ang, w, h);
        });
        this.color = color;
        this.baseTextures = { off: buttonTextures[0], on: buttonTextures[1] };
        this.generatedTextures = new Map();
        this.generatedTextures.set("off_0", buttonTextures[0]);
        this.isPressed = false;
    }
}
// 駆動ブロック
export class MoveBlock extends GameObj implements Colorable, NonAnimated {
    color: string | undefined;
    baseTextures: Record<string, Texture>;
    generatedTextures: Map<string, Texture>;
    isActivated: boolean;
    constructor(x: number, y: number, w: number, h: number, ang: Angle, color: string | undefined, isActivated: boolean) {
        super(x, y, ang, [{ relX: 0, relY: 0, w: w, h: h }], [{ relX: 0, relY: 0, w: w, h: h }], isActivated ? "on" : "off", true, STRENGTH_MOVE_BLOCK);
        this.color = color;
        this.baseTextures = { off: moveBlockTextures[0], on: moveBlockTextures[1] };
        this.generatedTextures = new Map();
        this.generatedTextures.set(`${isActivated ? "on" : "off"}_0`, moveBlockTextures[isActivated ? 1 : 0]);
        this.isActivated = isActivated;
    }
}
