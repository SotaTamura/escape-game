import {
  Block,
  GameObj,
  isAnimated,
  isColorable,
  isNonAnimated,
} from "./class.ts";
import { Assets, Texture, Container, TilingSprite, groupD8 } from "pixi.js";
import { app } from "../pages/Game";
import { gameObjs } from "./main.ts";

// 定数
const π = Math.PI;
export const STAGE_LEN = 8;
export const STEP = 1000 / 60;
export const RESOLUTION = 1024;
export const MAP_BLOCK_LEN = 16;
const UNIT = RESOLUTION / MAP_BLOCK_LEN;
// キーイベント
export let pressingEvent: Record<string, boolean> = {}; // 押し中
export let pressingTimeForKeyboard: Record<string, number> = {};
export let pressStartEvent: Record<string, boolean> = {}; // 押し始め
const KEY_MAP: Record<string, string> = {
  ArrowUp: "up",
  w: "up",
  " ": "up",
  ArrowDown: "down",
  s: "down",
  ArrowLeft: "left",
  a: "left",
  ArrowRight: "right",
  d: "right",
};
// 押し始めイベントをリセット
export const clearPressStart = () => {
  Object.keys(pressStartEvent).forEach(
    (eventName) => (pressStartEvent[eventName] = false)
  );
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
// sprite加工
export const editTexture = (obj: GameObj, state: string, newRotId: number) => {
  const key = `${state}_${newRotId}`;
  if (isAnimated(obj)) {
    if (obj.generatedFrames.has(key)) {
      obj.animatedSprite.textures = obj.generatedFrames.get(key) as Texture[];
    } else {
      const newFrames = obj.baseFrames[state].map(
        (texture) =>
          new Texture({
            source: (texture as Texture).source,
            rotate: newRotId,
          })
      );
      obj.animatedSprite.textures = newFrames;
      obj.generatedFrames.set(key, newFrames);
    }
    obj.animatedSprite.play();
  } else if (isNonAnimated(obj)) {
    if (obj.generatedTextures.has(key)) {
      obj.sprite.texture = obj.generatedTextures.get(key) as Texture;
    } else {
      const newTexture = new Texture({
        source: obj.baseTextures[state].source,
        rotate: newRotId,
      });
      obj.sprite.texture = newTexture;
      obj.generatedTextures.set(key, newTexture);
    }
  }
};
export const rotateTexture = (obj: GameObj, angle: number) => {
  let rotId;
  if (isAnimated(obj)) rotId = obj.animatedSprite.texture.rotate;
  else if (isNonAnimated(obj)) rotId = obj.sprite.texture.rotate;
  else throw new Error("The object does not extend Animated nor NonAnimated");
  editTexture(obj, obj.textureState, groupD8.add((8 - angle / 45) % 8, rotId));
};
export const flipX = (obj: GameObj) => {
  let rotId;
  if (isAnimated(obj)) rotId = obj.animatedSprite.texture.rotate;
  else if (isNonAnimated(obj)) rotId = obj.sprite.texture.rotate;
  else throw new Error("The object does not extend Animated nor NonAnimated");
  editTexture(
    obj,
    obj.textureState,
    groupD8.add(groupD8.MIRROR_HORIZONTAL, rotId)
  );
};
export const changeTexture = (obj: GameObj, state: string) => {
  if (obj.textureState === state) return;
  obj.textureState = state;
  let rotId;
  if (isAnimated(obj)) rotId = obj.animatedSprite.texture.rotate;
  else if (isNonAnimated(obj)) rotId = obj.sprite.texture.rotate;
  else throw new Error("The object does not extend Animated nor NonAnimated");
  editTexture(obj, state, rotId);
};
// sprite初期化
export const setSprite = (obj: GameObj) => {
  let sprite;
  if (isAnimated(obj)) sprite = obj.animatedSprite;
  else if (isNonAnimated(obj)) sprite = obj.sprite;
  else throw new Error("The object does not extend Animated nor NonAnimated");
  sprite.anchor = 0;
  sprite.width = obj.w * UNIT;
  sprite.height = obj.h * UNIT;
  sprite.x = obj.x * UNIT;
  sprite.y = obj.y * UNIT;
  if (isColorable(obj)) sprite.tint = obj.color;
  rotateTexture(obj, obj.angle);
  app.stage.addChild(sprite);
};
// 点線囲い
export const blockDashLine = (obj: Block) => {
  const w = obj.w * UNIT;
  const h = obj.h * UNIT;
  const borderThickness = 0.125 * UNIT;
  const scale = borderThickness / blockDeactivatedLineTexture.height;
  // 四辺をまとめて入れるコンテナ
  const borderContainer = new Container();
  borderContainer.x = obj.x * UNIT;
  borderContainer.y = obj.y * UNIT;
  borderContainer.width = w;
  borderContainer.height = h;
  // 上辺
  const topEdge = new TilingSprite({
    texture: blockDeactivatedLineTexture,
    width: w,
    height: borderThickness,
  });
  topEdge.x = 0;
  topEdge.y = 0;
  topEdge.tileScale = { x: scale * 2, y: scale };
  borderContainer.addChild(topEdge);
  // 下辺
  const bottomEdge = new TilingSprite({
    texture: blockDeactivatedLineTexture,
    width: w,
    height: borderThickness,
  });
  bottomEdge.rotation = π;
  bottomEdge.x = w;
  bottomEdge.y = h;
  bottomEdge.tileScale = { x: scale * 2, y: scale };
  borderContainer.addChild(bottomEdge);
  // 左辺
  const leftEdge = new TilingSprite({
    texture: blockDeactivatedLineTexture,
    width: h,
    height: borderThickness,
  });
  leftEdge.rotation = -π / 2;
  leftEdge.x = 0;
  leftEdge.y = h;
  leftEdge.tileScale = { x: scale * 2, y: scale };
  borderContainer.addChild(leftEdge);
  // 右辺
  const rightEdge = new TilingSprite({
    texture: blockDeactivatedLineTexture,
    width: h,
    height: borderThickness,
  });
  rightEdge.rotation = π / 2;
  rightEdge.x = w;
  rightEdge.y = 0;
  rightEdge.tileScale = { x: borderThickness * 2, y: borderThickness };
  borderContainer.addChild(rightEdge);
  borderContainer.tint = obj.color;
  app.stage.addChild(borderContainer);
};
// 描画更新
export const updateSprites = () => {
  gameObjs.forEach((obj) => {
    let sprite;
    if (isAnimated(obj)) sprite = obj.animatedSprite;
    else if (isNonAnimated(obj)) sprite = obj.sprite;
    else throw new Error("The object does not extend Animated nor NonAnimated");
    sprite.anchor = 0;
    sprite.width = obj.w * UNIT;
    sprite.height = obj.h * UNIT;
    sprite.x = obj.x * UNIT;
    sprite.y = obj.y * UNIT;
    // オフ状態のブロックを半透明にする
    if (obj instanceof Block) {
      if (!obj.isSolid) {
        sprite.alpha = 0.2;
      } else sprite.alpha = 1;
    }
  });
};
// 初期化関数
export async function onLoad() {
  // 画像読み込み
  for (let i = 0; i <= 6; i++) {
    await Assets.load(`/player${i}.png`);
  }
  playerTextures = [0, 1, 2, 3, 4, 5, 6].map((i) =>
    Texture.from(`/player${i}.png`)
  );
  playerIdleFrames = [playerTextures[0]];
  playerWalkFrames = [
    playerTextures[1],
    playerTextures[0],
    playerTextures[2],
    playerTextures[0],
  ];
  playerJumpFrames = [playerTextures[3]];
  playerFallFrames = [playerTextures[4]];
  playerLadderMoveFrames = [playerTextures[4], playerTextures[5]];
  playerLadderIdleFrames = [playerTextures[6]];
  blockTexture = await Assets.load("/block.png");
  blockDeactivatedLineTexture = await Assets.load(
    "/block_deactivated_line.png"
  );
  ladderTexture = await Assets.load("/ladder.png");
  keyTexture = await Assets.load("/key.png");
  onewayTexture = await Assets.load("/oneway.png");
  [
    ...playerTextures,
    blockTexture,
    blockDeactivatedLineTexture,
    ladderTexture,
    keyTexture,
    onewayTexture,
  ].forEach((texture) => {
    texture.source.scaleMode = "nearest";
  });
  // キーイベント
  document.addEventListener("keydown", (e) => {
    if (!Object.keys(KEY_MAP).includes(e.key)) return;
    const direction = KEY_MAP[e.key];
    pressingEvent[direction] = true;
    pressStartEvent[direction] = !pressingTimeForKeyboard[direction]
      ? true
      : false;
    pressingTimeForKeyboard[direction] =
      pressingTimeForKeyboard[direction] >= 0
        ? pressingTimeForKeyboard[direction] + 1
        : 0;
  });
  document.addEventListener("keyup", (e) => {
    if (!Object.keys(KEY_MAP).includes(e.key)) return;
    const direction = KEY_MAP[e.key];
    pressingEvent[direction] = false;
    pressingTimeForKeyboard[direction] = 0;
    pressStartEvent[direction] = false;
  });
}
