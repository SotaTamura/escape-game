import { app } from "../pages/Game.tsx";
import {
  updateSprites,
  clearPressStart,
  pressStartEvent,
  pressingEvent,
  MAP_BLOCK_LEN,
  blockDashLine,
  setSprite,
  rotateTexture,
  changeTexture,
  UNIT,
} from "./base.ts";
import {
  GameObj,
  Player,
  Block,
  Ladder,
  Key,
  Oneway,
  isNonAnimated,
  isAnimated,
} from "./class.ts";
import { BitmapText, UNIFORM_TO_ARRAY_SETTERS } from "pixi.js";

export let gameObjs: GameObj[];
export let players: Player[];
export let blocks: Block[];
export let ladders: Ladder[];
export let keys: Key[];
export let oneways: Oneway[];
export let pushBlocks: GameObj[];
export let moveBlocks: GameObj[];
export let goals: GameObj[];
export let portals: GameObj[];
export let levers: GameObj[];
export let buttons: GameObj[];
export let questions: GameObj[];
export let rotations: GameObj[];
export let texts: BitmapText[];

// オブジェクト削除
const remove = (obj: GameObj) => {
  const typeArrays: GameObj[][] = [players, blocks, ladders, keys, oneways];
  for (let typeArray of typeArrays) {
    const index = typeArray.indexOf(obj);
    if (index !== -1) {
      typeArray.splice(index, 1);
      gameObjs = gameObjs.filter((item) => item !== obj);
      if (isNonAnimated(obj)) obj.sprite.destroy();
      else if (isAnimated(obj)) obj.animatedSprite.destroy();
    }
  }
};
// オブジェクトの状態切り替え
const activate = (color: string) => {
  // for (const moveBlock of moveBlocks) {
  //   if (moveBlock.color === color) {
  //     if (moveBlock.ang === 0) moveBlock.vy = moveBlock.vy ? 0 : -0.08;
  //     if (moveBlock.ang === 1 / 2) moveBlock.vx = moveBlock.vx ? 0 : 0.08;
  //     if (moveBlock.ang === 1) moveBlock.vy = moveBlock.vy ? 0 : 0.08;
  //     if (moveBlock.ang === 3 / 2) moveBlock.vx = moveBlock.vx ? 0 : -0.08;
  //   }
  // }
  for (const block of blocks)
    if (block.color === color) {
      block.isSolid = !block.isSolid;
    }
  for (const oneway of oneways)
    if (oneway.color === color) {
      if (oneway.angle === 0) oneway.y -= oneway.hitboxH;
      else if (oneway.angle === 180) oneway.y += oneway.hitboxH;
      else if (oneway.angle === 90) oneway.x += oneway.hitboxW;
      else if (oneway.angle === 270) oneway.x -= oneway.hitboxW;
      oneway.angle = (oneway.angle + 180) % 360;
      rotateTexture(oneway, 180);
    }
};
// マップ作成
export const loadStage = async (i: number) => {
  // 初期化
  gameObjs = [];
  players = [];
  blocks = [];
  ladders = [];
  keys = [];
  oneways = [];
  texts = [];
  // app.stage.removeChildren().forEach((child) => child.destroy());
  let data;
  try {
    data = await import(`./stagesJSON/stage${i}.json`);
  } catch {
    data = await import(`./stagesJSON/stage1.json`);
  }
  for (let layer of data.default.layers) {
    if (layer.objects)
      for (let obj of layer.objects) {
        let newObj;
        let newW = obj.width / 16;
        let newH = obj.height / 16;
        let newX = obj.x / 16;
        let newY = obj.y / 16;
        if (obj.text) {
          const text = new BitmapText({
            text: obj.text.text,
            x: newX * UNIT,
            y: newY * UNIT,
            visible: false,
            style: {
              fontFamily: ["Orbitron", "Yusei Magic", "sans-serif"],
              wordWrapWidth: newW * UNIT,
              wordWrap: true,
              fontSize: newH * UNIT,
              breakWords: true,
              fill: 0x000000,
            },
          });
          texts.push(text);
          app.stage.addChild(text);
        } else {
          if (obj.rotation === 0) {
            newY -= newH;
          } else if (obj.rotation === 90) {
            [newW, newH] = [newH, newW];
          } else if (obj.rotation === 180) {
            newX -= newW;
          } else if (obj.rotation === 270) {
            [newW, newH] = [newH, newW];
            newX -= newW;
            newY -= newH;
          }
          if (obj.gid === 1) {
            newObj = new Player(newX, newY, newW, newH, obj.rotation);
            players.push(newObj);
          } else if (obj.gid === 2) {
            newObj = new Block(
              newX,
              newY,
              newW,
              newH,
              obj.rotation,
              true,
              layer.tintcolor
            );
            blocks.push(newObj);
            blockDashLine(newObj); // 点線囲い
          } else if (obj.gid === 3) {
            newObj = new Block(
              newX,
              newY,
              newW,
              newH,
              obj.rotation,
              false,
              layer.tintcolor
            );
            blocks.push(newObj);
            blockDashLine(newObj); // 点線囲い
          } else if (obj.gid === 4) {
            newObj = new Ladder(newX, newY, newW, newH, obj.rotation);
            ladders.push(newObj);
          } else if (obj.gid === 5) {
            newObj = new Key(
              newX,
              newY,
              newW,
              newH,
              obj.rotation,
              layer.tintcolor
            );
            keys.push(newObj);
          } else if (obj.gid === 6) {
            newObj = new Oneway(
              newX,
              newY,
              newW,
              newH,
              obj.rotation,
              layer.tintcolor
            );
            oneways.push(newObj);
          } else {
            throw new Error(`Unknown gid ${obj.gid}`);
          }
          gameObjs.push(newObj);
          setSprite(newObj); // pixiに反映
        }
      }
  }
};
export let isComplete = false;
export const update = (handleComplete: () => void) => {
  // プレイヤーの移動
  for (const player of players) {
    player.vy += 0.01; // 重力加速度
    player.handleLadder(ladders); //ハシゴ
    const otherSolidObjs = gameObjs.filter(
      (obj) => obj !== player && obj.isSolid
    );
    player.handleHorizontalMove(); // 左右移動
    player.isOnBlock = null;
    player.isOnLadder = null;
    player.collideBottom(otherSolidObjs); // 着地
    player.collideBottomWithLadder(ladders); // ハシゴの上に着地
    if (pressStartEvent.up && (player.isOnBlock || player.isOnLadder))
      player.vy = -0.2; // ジャンプ
    player.collideTop(otherSolidObjs); // 天井衝突
    player.collideLeft(otherSolidObjs); // 左壁衝突
    player.collideRight(otherSolidObjs); // 右壁衝突
    if (player.isInLadder) {
      if (pressingEvent.up || pressingEvent.down)
        changeTexture(player, "ladderMove");
      else changeTexture(player, "ladderIdle");
    } else if (!(player.isOnBlock || player.isOnLadder))
      changeTexture(player, "jump");
    else {
      if (player.vx === 0) changeTexture(player, "idle");
      else changeTexture(player, "walk");
    }
    player.x += player.vx;
    player.y += player.vy; // 移動
    // ゴール
    if (
      player.right < 0 ||
      player.left > MAP_BLOCK_LEN ||
      player.bottom < 0 ||
      player.top > MAP_BLOCK_LEN
    ) {
      remove(player);
      if (players.length === 0) {
        handleComplete();
      }
    }
  }
  // 鍵
  for (const key of keys)
    for (const player of players) {
      if (player.colliding(key)) {
        remove(key);
        activate(key.color);
      }
      break;
    }
  clearPressStart();
  updateSprites();
};
