import { app } from "../pages/Game.tsx";
import { updateSprites, clearPressStart, pressStartEvent, MAP_BLOCK_LEN, blockDashLine, setSprite, rotateTexture, changeTexture, UNIT, PX_PER_UNIT } from "./base.ts";
import { GameObj, Player, Block, Ladder, Key, Oneway, isNonAnimated, isAnimated, Lever, PushBlock, Portal } from "./class.ts";
import { BitmapText } from "pixi.js";

export let hintTexts: BitmapText[];
export let portalTexts: BitmapText[];
export let gameObjs: GameObj[];
export let players: Player[];
export let blocks: Block[];
export let ladders: Ladder[];
export let keys: Key[];
export let oneways: Oneway[];
export let levers: Lever[];
export let pushBlocks: PushBlock[];
// export let moveBlocks: GameObj[];
export let portals: Portal[];
// export let buttons: GameObj[];
// export let questions: GameObj[];
// export let rotations: GameObj[];

// オブジェクト削除
const remove = (obj: GameObj) => {
  const typeArrays: GameObj[][] = [players, blocks, ladders, keys, oneways, levers, portals, pushBlocks];
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
  portalTexts = [];
  hintTexts = [];
  gameObjs = [];
  players = [];
  blocks = [];
  ladders = [];
  keys = [];
  oneways = [];
  levers = [];
  portals = [];
  pushBlocks = [];
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
        let newW = obj.width / PX_PER_UNIT;
        let newH = obj.height / PX_PER_UNIT;
        let newX = obj.x / PX_PER_UNIT;
        let newY = obj.y / PX_PER_UNIT;
        if (obj.text) {
          const text = new BitmapText({
            text: obj.text.text,
            x: newX * UNIT,
            y: newY * UNIT,
            visible: false,
            style: {
              fontFamily: ["Makinas", "sans-serif"],
              wordWrapWidth: newW * UNIT,
              wordWrap: true,
              fontSize: newH * UNIT,
              breakWords: true,
              fill: 0x000000
            }
          });
          hintTexts.push(text);
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
            newObj = new Block(newX, newY, newW, newH, obj.rotation, true, layer.tintcolor);
            blocks.push(newObj);
            blockDashLine(newObj); // 点線囲い
          } else if (obj.gid === 3) {
            newObj = new Block(newX, newY, newW, newH, obj.rotation, false, layer.tintcolor);
            blocks.push(newObj);
            blockDashLine(newObj); // 点線囲い
          } else if (obj.gid === 4) {
            newObj = new Ladder(newX, newY, newW, newH, obj.rotation);
            ladders.push(newObj);
          } else if (obj.gid === 5) {
            newObj = new Key(newX, newY, newW, newH, obj.rotation, layer.tintcolor);
            keys.push(newObj);
          } else if (obj.gid === 6) {
            newObj = new Oneway(newX, newY, newW, newH, obj.rotation, layer.tintcolor);
            oneways.push(newObj);
          } else if (obj.gid === 7) {
            newObj = new Portal(newX, newY, newW, newH, obj.rotation, obj.type);
            portals.push(newObj);
          } else if (obj.gid === 8) {
            newObj = new Lever(newX, newY, newW, newH, obj.rotation, layer.tintcolor);
            levers.push(newObj);
          } else if (obj.gid === 9) {
            newObj = new PushBlock(newX, newY, newW, newH, obj.rotation);
            pushBlocks.push(newObj);
          } else {
            throw new Error(`Unknown gid ${obj.gid}`);
          }
          gameObjs.push(newObj);
          setSprite(newObj); // pixiに反映
        }
      }
  }
  for (const portal of portals) {
    const portalText = new BitmapText({
      text: portal.id,
      x: (portal.x + portal.w / 2) * UNIT,
      y: (portal.y + portal.h / 2) * UNIT,
      style: {
        fontFamily: ["Makinas", "sans-serif"],
        fontSize: (3 / 4) * UNIT,
        fill: 0xffffff,
        align: "center"
      }
    });
    portalText.anchor.set(0.5);
    portalTexts.push(portalText);
    app.stage.addChild(portalText);
  }
};
export let isComplete = false;
export const update = (handleComplete: () => void) => {
  // 動くオブジェクト
  for (const player of players) {
    player.strength = { top: player.initStrength, bottom: player.initStrength, left: player.initStrength, right: player.initStrength };
    player.isOnBlock = null;
    player.vy += 0.01; // 重力加速度
    player.handleLadder(ladders); //ハシゴ
    player.handlePortal(portals); //ポータル
    player.handleHorizontalMove(); // 左右移動
  }
  for (const pushBlock of pushBlocks) {
    pushBlock.vx = 0;
    pushBlock.strength = { top: pushBlock.initStrength, bottom: pushBlock.initStrength, left: pushBlock.initStrength, right: pushBlock.initStrength };
    pushBlock.isOnBlock = null;
    pushBlock.vy += 0.01; // 重力加速度
    pushBlock.handleLadder(ladders); //ハシゴ
    pushBlock.handlePortal(portals); //ポータル
  }
  for (let i = 0; i < [...players, ...pushBlocks].length; i++) {
    for (const moveObj of [...players, ...pushBlocks]) {
      const otherSolidObjs = gameObjs.filter((obj) => obj !== moveObj && obj.isSolid);
      moveObj.collideBottom([...otherSolidObjs, ...ladders]); // 着地
      if (moveObj instanceof Player && pressStartEvent.up && moveObj.isOnBlock) moveObj.vy = -0.2; // ジャンプ
      moveObj.collideTop(otherSolidObjs); // 天井衝突
      moveObj.collideLeft(otherSolidObjs); // 左壁衝突
      moveObj.collideRight(otherSolidObjs); // 右壁衝突
    }
  }
  for (const player of players) {
    const otherSolidObjs = gameObjs.filter((obj) => obj !== player && obj.isSolid);

    player.collideTop(otherSolidObjs); // 天井衝突
    player.handleTexture();
    player.x += player.vx;
    player.y += player.vy; // 移動
    if (player.right < 0 || player.left > MAP_BLOCK_LEN || player.bottom < 0 || player.top > MAP_BLOCK_LEN) {
      // ゴール
      remove(player);
      if (players.length === 0) {
        handleComplete();
      }
    }
  }
  for (const pushBlock of pushBlocks) {
    pushBlock.x += pushBlock.vx;
    pushBlock.y += pushBlock.vy; // 移動
    if (pushBlock.right < 0 || pushBlock.left > MAP_BLOCK_LEN || pushBlock.bottom < 0 || pushBlock.top > MAP_BLOCK_LEN) {
      // ゴール
      remove(pushBlock);
    }
  }
  // 鍵
  for (const key of keys)
    if (players.some((player) => player.colliding(key))) {
      remove(key);
      activate(key.color);
    }
  // レバー
  for (const lever of levers) {
    const isColliding = players.some((player) => player.colliding(lever));
    if (isColliding) {
      if (!lever.isPlayerContacting) {
        activate(lever.color);
        changeTexture(lever, lever.textureState === "on" ? "off" : "on");
        lever.isPlayerContacting = true;
      }
    } else {
      lever.isPlayerContacting = false;
    }
  }
  clearPressStart();
  updateSprites();
};
