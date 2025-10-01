import { Block, Box, GameObj, isAnimated, isColorable, isHasTriggers, isNonAnimated, Portal, SpriteBox } from "./class.ts";
import { Assets, Texture, TilingSprite, groupD8, Sprite, AnimatedSprite, Graphics } from "pixi.js";
import { app, debugContainer } from "../pages/Game";
import { gameObjs } from "./main.ts";
import { UNIT, π, type Angle } from "../constants.ts";

// キーイベント
export let pressingEvent: Record<"u" | "d" | "l" | "r", boolean> = {
    u: false,
    d: false,
    l: false,
    r: false,
}; // 押し中
export let pressingTimeForKeyboard: Record<"u" | "d" | "l" | "r", number> = {
    u: 0,
    d: 0,
    l: 0,
    r: 0,
};
export let pressStartEvent: Record<"u" | "d" | "l" | "r", boolean> = {
    u: false,
    d: false,
    l: false,
    r: false,
}; // 押し始め
const KEY_MAP: Record<string, "u" | "d" | "l" | "r"> = {
    ArrowUp: "u",
    w: "u",
    " ": "u",
    ArrowDown: "d",
    s: "d",
    ArrowLeft: "l",
    a: "l",
    ArrowRight: "r",
    d: "r",
};
// 押し始めイベントをリセット
export const clearPressStart = () => {
    pressStartEvent = { u: false, d: false, l: false, r: false };
};
// 箱の回転
export const rotate = (box: Box, ang: Angle, originW: number, originH: number) => {
    if (ang === 0) return;
    const convertedRelX = (box.relX * originH) / originW;
    const convertedRelY = (box.relY * originW) / originH;
    const convertedW = (box.w * originH) / originW;
    const convertedH = (box.h * originW) / originH;
    if (ang === 90) {
        box.relX = originW - (convertedRelY + convertedH);
        box.relY = convertedRelX;
        box.w = convertedH;
        box.h = convertedW;
    } else if (ang === 180) {
        box.relX = originW - (box.relX + box.w);
        box.relY = originH - (box.relY + box.h);
        box.w = box.w;
        box.h = box.h;
    } else if (ang === -90) {
        box.relX = convertedRelY;
        box.relY = originH - (convertedRelX + convertedW);
        box.w = convertedH;
        box.h = convertedW;
    }
    if (box instanceof SpriteBox) rotate(box.origin, ang, originW, originH);
};
// 画像
export let playerTextures: Texture[];
export let playerIdleFrames: Texture[];
export let playerWalkFrames: Texture[];
export let playerJumpFrames: Texture[];
export let playerFallFrames: Texture[];
export let playerLadderMoveFrames: Texture[];
export let playerLadderIdleFrames: Texture[];
export let blockTexture: Texture;
export let blockDeactivatedLineTexture: Texture;
export let ladderTexture: Texture;
export let keyTexture: Texture;
export let onewayTexture: Texture;
export let leverTextures: Texture[];
export let portalTextures: Texture[];
export let pushBlockTexture: Texture;
export let buttonTextures: Texture[];
export let moveBlockTextures: Texture[];
// sprite加工
export const editTexture = (obj: GameObj, state: string, newRotId: number) => {
    const key = `${state}_${newRotId}`;
    if (isAnimated(obj)) {
        let textures;
        if (obj.generatedFrames.has(key)) {
            textures = obj.generatedFrames.get(key) as Texture[];
        } else {
            const newFrames = obj.baseFrames[state].map(
                (texture) =>
                    new Texture({
                        source: (texture as Texture).source,
                        rotate: newRotId,
                    })
            );
            textures = newFrames;
            obj.generatedFrames.set(key, newFrames);
        }
        obj.container.children.forEach((child) => {
            if (child instanceof AnimatedSprite) {
                const sprite = child;
                sprite.textures = textures;
                if (!sprite.playing) {
                    sprite.play();
                }
            }
        });
    } else if (isNonAnimated(obj)) {
        let texture;
        if (obj.generatedTextures.has(key)) {
            texture = obj.generatedTextures.get(key) as Texture;
        } else {
            const newTexture = new Texture({
                source: obj.baseTextures[state].source,
                rotate: newRotId,
            });
            texture = newTexture;
            obj.generatedTextures.set(key, newTexture);
        }
        obj.container.children.forEach((child) => {
            if (child instanceof Sprite) {
                const sprite = child;
                sprite.texture = texture;
            }
        });
    }
};
export const rotateTexture = (obj: GameObj, ang: number) => {
    let rotId = 0;
    rotId = (obj.container.children[0] as Sprite).texture.rotate;
    editTexture(obj, obj.textureState, groupD8.add((8 - ang / 45) % 8, rotId));
};
export const flipX = (obj: GameObj) => {
    let rotId = 0;
    rotId = (obj.container.children[0] as Sprite).texture.rotate;
    editTexture(obj, obj.textureState, groupD8.add(groupD8.MIRROR_HORIZONTAL, rotId));
};
export const changeTexture = (obj: GameObj, state: string) => {
    if (obj.textureState === state) return;
    obj.textureState = state;
    let rotId = 0;
    rotId = (obj.container.children[0] as Sprite).texture.rotate;
    editTexture(obj, state, rotId);
};
// spriteを描画する
export const drawSprite = (obj: GameObj) => {
    const container = obj.container;
    let rotId = (obj.container.children[0] as Sprite | undefined)?.texture.rotate ?? 0;
    const removed = container.removeChildren();
    for (const child of removed) {
        child.destroy({ children: true });
    }
    obj.spriteBoxes.forEach((spriteBox) => {
        let sprite;
        if (isAnimated(obj)) {
            sprite = new AnimatedSprite(obj.baseFrames[obj.textureState]);
            sprite.animationSpeed = 0.125;
        } else if (isNonAnimated(obj)) {
            sprite = new Sprite(obj.baseTextures[obj.textureState]);
        } else {
            throw new Error("The object does not extend Animated nor NonAnimated");
        }
        sprite.anchor.set(0);
        sprite.x = spriteBox.origin.relX * UNIT;
        sprite.y = spriteBox.origin.relY * UNIT;
        sprite.width = spriteBox.origin.w * UNIT;
        sprite.height = spriteBox.origin.h * UNIT;
        container.addChild(sprite);
        if (!(spriteBox.relX === spriteBox.origin.relX && spriteBox.relY === spriteBox.origin.relY && spriteBox.w === spriteBox.origin.w && spriteBox.h === spriteBox.origin.h)) {
            const mask = new Graphics().rect(spriteBox.relX * UNIT, spriteBox.relY * UNIT, spriteBox.w * UNIT, spriteBox.h * UNIT).fill();
            container.addChild(mask);
            sprite.mask = mask;
        }
    });
    editTexture(obj, obj.textureState, rotId);
    if (obj instanceof Portal) {
        const sprite = new Sprite(
            new Texture({
                source: portalTextures[1].source,
                rotate: (8 - obj.ang / 45) % 8,
            })
        );
        const [l, r, t, b, w, h] = [obj.spriteBoxes[0].l, obj.spriteBoxes[0].r, obj.spriteBoxes[0].t, obj.spriteBoxes[0].b, obj.spriteBoxes[0].w, obj.spriteBoxes[0].h];
        if (obj.ang === 0) {
            sprite.x = l * UNIT;
            sprite.y = (t - h) * UNIT;
        } else if (obj.ang === 90) {
            sprite.x = r * UNIT;
            sprite.y = t * UNIT;
        } else if (obj.ang === 180) {
            sprite.x = l * UNIT;
            sprite.y = b * UNIT;
        } else if (obj.ang === -90) {
            sprite.x = (l - w) * UNIT;
            sprite.y = t * UNIT;
        }
        sprite.width = w * UNIT;
        sprite.height = h * UNIT;
        sprite.zIndex = -1;
        app.stage.addChild(sprite);
    }
};
// デバッグ用
export const drawDebug = () => {
    const removed = debugContainer.removeChildren();
    for (const child of removed) {
        child.destroy({ children: true });
    }
    for (const obj of gameObjs) {
        obj.spriteBoxes.forEach((s) => {
            debugContainer.addChild(new Graphics().rect(s.l * UNIT, s.t * UNIT, s.w * UNIT, s.h * UNIT).fill({ color: 0xffffff, alpha: 0.5 }));
        });
        if (isHasTriggers(obj))
            obj.triggers.forEach((t) => {
                debugContainer.addChild(new Graphics().rect(t.l * UNIT, t.t * UNIT, t.w * UNIT, t.h * UNIT).fill({ color: 0xffff00, alpha: 0.5 }));
            });
        obj.hitboxes.forEach((h) => {
            debugContainer.addChild(new Graphics().rect(h.l * UNIT, h.t * UNIT, h.w * UNIT || 1, h.h * UNIT || 1).stroke({ color: 0x00ff00, width: 2 }));
            if (h.cornerLen > 0.05) {
                debugContainer.addChild(new Graphics().rect((h.l + h.cornerLen) * UNIT, (h.t + h.cornerLen) * UNIT, (h.w - h.cornerLen * 2) * UNIT || 1, (h.h - h.cornerLen * 2) * UNIT || 1).stroke({ color: 0x00ffff, width: 2 }));
            }
        });
        obj.hiddenHitboxes.forEach((h) => {
            debugContainer.addChild(new Graphics().rect(h.l * UNIT, h.t * UNIT, h.w * UNIT || 1, h.h * UNIT || 1).stroke({ color: 0x000000, width: 2 }));
        });
        debugContainer.addChild(new Graphics().circle(obj.x * UNIT, obj.y * UNIT, 4).fill(0xff0000));
    }
};
// sprite初期化
export const setSprite = (obj: GameObj) => {
    const container = obj.container;
    container.x = obj.x * UNIT;
    container.y = obj.y * UNIT;
    container.width = UNIT;
    container.height = UNIT;
    drawSprite(obj);
    if (isColorable(obj) && obj.color) container.tint = obj.color;
    rotateTexture(obj, obj.ang);
    app.stage.addChild(container);
};
// 点線囲い
export const blockDashLine = (obj: Block) => {
    if (!obj.color) return;
    const w = obj.spriteBoxes[0].w * UNIT;
    const h = obj.spriteBoxes[0].h * UNIT;
    const borderThickness = 0.125 * UNIT;
    const scale = borderThickness / blockDeactivatedLineTexture.height;
    // 上辺
    const tEdge = new TilingSprite({
        texture: blockDeactivatedLineTexture,
        width: w,
        height: borderThickness,
    });
    tEdge.x = 0;
    tEdge.y = 0;
    tEdge.tileScale = { x: scale * 2, y: scale };
    obj.container.addChild(tEdge);
    // 下辺
    const bEdge = new TilingSprite({
        texture: blockDeactivatedLineTexture,
        width: w,
        height: borderThickness,
    });
    bEdge.rotation = π;
    bEdge.x = w;
    bEdge.y = h;
    bEdge.tileScale = { x: scale * 2, y: scale };
    obj.container.addChild(bEdge);
    // 左辺
    const lEdge = new TilingSprite({
        texture: blockDeactivatedLineTexture,
        width: h,
        height: borderThickness,
    });
    lEdge.rotation = -π / 2;
    lEdge.x = 0;
    lEdge.y = h;
    lEdge.tileScale = { x: scale * 2, y: scale };
    obj.container.addChild(lEdge);
    // 右辺
    const rEdge = new TilingSprite({
        texture: blockDeactivatedLineTexture,
        width: h,
        height: borderThickness,
    });
    rEdge.rotation = π / 2;
    rEdge.x = w;
    rEdge.y = 0;
    rEdge.tileScale = { x: scale * 2, y: scale };
    obj.container.addChild(rEdge);
    obj.container.tint = obj.color;
};
// 描画更新
export const updateSprites = () => {
    gameObjs.forEach((obj) => {
        const container = obj.container;
        container.x = obj.x * UNIT;
        container.y = obj.y * UNIT;
        // オフ状態のブロックを半透明にする
        if (obj instanceof Block) {
            obj.container.children.forEach((child) => {
                if (!obj.isSolid && !(child instanceof TilingSprite)) {
                    child.alpha = 0.2;
                } else child.alpha = 1;
            });
        }
    });
};
// 初期化関数
export async function onLoad() {
    // 画像のパスを配列にまとめる
    const assetUrls = [...Array.from({ length: 7 }, (_, i) => `/player${i}.png`), "/block.png", "/block_deactivated_line.png", "/ladder.png", "/key.png", "/oneway.png", "/lever_off.png", "/lever_on.png", "/portal_front.png", "/portal_back.png", "/pushblock.png", "/button_off.png", "/button_on.png", "/moveblock_off.png", "/moveblock_on.png"];

    // すべてのアセットを並行して読み込む
    const textures = await Assets.load(assetUrls);

    // 読み込んだテクスチャをグローバル変数に割り当てる
    playerTextures = Array.from({ length: 7 }, (_, i) => textures[`/player${i}.png`]);
    playerIdleFrames = [playerTextures[0]];
    playerWalkFrames = [playerTextures[1], playerTextures[0], playerTextures[2], playerTextures[0]];
    playerJumpFrames = [playerTextures[3]];
    playerFallFrames = [playerTextures[4]];
    playerLadderMoveFrames = [playerTextures[4], playerTextures[5]];
    playerLadderIdleFrames = [playerTextures[6]];
    blockTexture = textures["/block.png"];
    blockDeactivatedLineTexture = textures["/block_deactivated_line.png"];
    ladderTexture = textures["/ladder.png"];
    keyTexture = textures["/key.png"];
    onewayTexture = textures["/oneway.png"];
    leverTextures = [textures["/lever_off.png"], textures["/lever_on.png"]];
    portalTextures = [textures["/portal_front.png"], textures["/portal_back.png"]];
    pushBlockTexture = textures["/pushblock.png"];
    buttonTextures = [textures["/button_off.png"], textures["/button_on.png"]];
    moveBlockTextures = [textures["/moveblock_off.png"], textures["/moveblock_on.png"]];

    // nearest-neighbor scaling を適用
    assetUrls.forEach((url) => {
        const texture = textures[url];
        if (texture) {
            texture.source.scaleMode = "nearest";
        }
    });
    // キーイベント
    document.addEventListener("keydown", (e) => {
        if (!Object.keys(KEY_MAP).includes(e.key)) return;
        const direction = KEY_MAP[e.key];
        pressingEvent[direction] = true;
        pressStartEvent[direction] = !pressingTimeForKeyboard[direction] ? true : false;
        pressingTimeForKeyboard[direction] = pressingTimeForKeyboard[direction] >= 0 ? pressingTimeForKeyboard[direction] + 1 : 0;
    });
    document.addEventListener("keyup", (e) => {
        if (!Object.keys(KEY_MAP).includes(e.key)) return;
        const direction = KEY_MAP[e.key];
        pressingEvent[direction] = false;
        pressingTimeForKeyboard[direction] = 0;
        pressStartEvent[direction] = false;
    });
}
