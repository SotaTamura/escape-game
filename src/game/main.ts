import { app } from "../pages/Game.tsx";
import { updateSprites, clearPressStart, pressStartEvent, MAP_BLOCK_LEN, blockDashLine, setSprite, rotateTexture, changeTexture, UNIT, PX_PER_UNIT } from "./base.ts";
import { GameObj, Player, Block, Ladder, Key, Oneway, isNonAnimated, isAnimated, Lever, PushBlock, Portal, Button, MoveBlock } from "./class.ts";
import { BitmapText } from "pixi.js";

export let hint: string;
export let gameObjs: GameObj[];
export let players: Player[];
export let blocks: Block[];
export let ladders: Ladder[];
export let keys: Key[];
export let oneways: Oneway[];
export let levers: Lever[];
export let pushBlocks: PushBlock[];
export let portals: Portal[];
export let portalTexts: BitmapText[];
export let buttons: Button[];
export let moveBlocks: MoveBlock[];
// export let questions: GameObj[];
// export let rotations: GameObj[];

// オブジェクト削除
const remove = (obj: GameObj) => {
  const typeArrays: GameObj[][] = [players, blocks, ladders, keys, oneways, levers, portals, pushBlocks, buttons, moveBlocks];
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
  for (const moveBlock of moveBlocks) {
    if (moveBlock.color === color) {
      changeTexture(moveBlock, moveBlock.isActivated ? "off" : "on");
      moveBlock.isActivated = !moveBlock.isActivated;
    }
  }
  for (const block of blocks)
    if (block.color === color) {
      block.isSolid = !block.isSolid;
    }
  for (const oneway of oneways)
    if (oneway.color === color) {
      if (oneway.angle === 0) {
        oneway.y -= oneway.hitboxH;
        oneway.angle = 180;
      } else if (oneway.angle === 180) {
        oneway.y += oneway.hitboxH;
        oneway.angle = 0;
      } else if (oneway.angle === 90) {
        oneway.x += oneway.hitboxW;
        oneway.angle = -90;
      } else if (oneway.angle === -90) {
        oneway.x -= oneway.hitboxW;
        oneway.angle = 90;
      }
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
  levers = [];
  portals = [];
  portalTexts = [];
  pushBlocks = [];
  buttons = [];
  moveBlocks = [];
  let data;
  try {
    data = await import(`./stagesJSON/stage${i}.json`);
  } catch {
    data = await import(`./stagesJSON/stage1.json`);
  }
  hint = data.default.properties[0].value;
  for (let layer of data.default.layers) {
    if (layer.objects)
      for (let obj of layer.objects) {
        let newObj;
        let newW = obj.width / PX_PER_UNIT;
        let newH = obj.height / PX_PER_UNIT;
        let newX = obj.x / PX_PER_UNIT;
        let newY = obj.y / PX_PER_UNIT;
        if (obj.rotation === 0) {
          newY -= newH;
        } else if (obj.rotation === 90) {
          [newW, newH] = [newH, newW];
        } else if (obj.rotation === 180) {
          newX -= newW;
        } else if (obj.rotation === -90) {
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
        } else if (obj.gid === 10) {
          newObj = new Button(newX, newY, newW, newH, obj.rotation, layer.tintcolor);
          buttons.push(newObj);
        } else if (obj.gid === 11) {
          newObj = new MoveBlock(newX, newY, newW, newH, obj.rotation, layer.tintcolor, false);
          moveBlocks.push(newObj);
        } else if (obj.gid === 12) {
          newObj = new MoveBlock(newX, newY, newW, newH, obj.rotation, layer.tintcolor, true);
          moveBlocks.push(newObj);
        } else {
          throw new Error(`Unknown gid ${obj.gid}`);
        }
        gameObjs.push(newObj);
        setSprite(newObj); // pixiに反映
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
      if (!lever.isBeingContacted) {
        activate(lever.color);
        changeTexture(lever, lever.textureState === "on" ? "off" : "on");
        lever.isBeingContacted = true;
      }
    } else {
      lever.isBeingContacted = false;
    }
  }
  // ボタン
  for (const button of buttons) {
    const isPressed = [...players, ...pushBlocks].some((moveObj) => {
      if (button.angle === 0) return moveObj.innerHitboxBottom >= button.hitboxTop - button.hitboxH / 2 && moveObj.innerHitboxBottom <= button.hitboxTop && !(moveObj.innerHitboxRight <= button.hitboxLeft || moveObj.innerHitboxLeft >= button.hitboxRight);
      else if (button.angle === 90) return moveObj.innerHitboxLeft <= button.hitboxRight + button.hitboxW / 2 && moveObj.innerHitboxLeft >= button.hitboxRight && !(moveObj.innerHitboxBottom <= button.hitboxTop || moveObj.innerHitboxTop >= button.hitboxBottom);
      else if (button.angle === 180) return moveObj.innerHitboxTop <= button.hitboxBottom + button.hitboxH / 2 && moveObj.innerHitboxTop >= button.hitboxBottom && !(moveObj.innerHitboxRight <= button.hitboxLeft || moveObj.innerHitboxLeft >= button.hitboxRight);
      else if (button.angle === -90) return moveObj.innerHitboxRight >= button.hitboxLeft - button.hitboxW / 2 && moveObj.innerHitboxRight <= button.hitboxLeft && !(moveObj.innerHitboxBottom <= button.hitboxTop || moveObj.innerHitboxTop >= button.hitboxBottom);
    });
    if (isPressed) {
      if (!button.isPressed) {
        activate(button.color);
        changeTexture(button, "on");
        button.isPressed = true;
      }
    } else {
      if (button.isPressed) {
        activate(button.color);
        changeTexture(button, "off");
        button.isPressed = false;
      }
    }
  }
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
  for (const moveBlock of moveBlocks) {
    moveBlock.strength = { top: moveBlock.initStrength, bottom: moveBlock.initStrength, left: moveBlock.initStrength, right: moveBlock.initStrength };
    moveBlock.isOnBlock = null;
    moveBlock.handlePortal(portals); //ポータル
    if (moveBlock.angle === 0) {
      moveBlock.vy = moveBlock.isActivated ? -0.08 : 0;
    }
    if (moveBlock.angle === 90) {
      moveBlock.vx = moveBlock.isActivated ? 0.08 : 0;
    }
    if (moveBlock.angle === 180) {
      moveBlock.vy = moveBlock.isActivated ? 0.08 : 0;
    }
    if (moveBlock.angle === -90) {
      moveBlock.vx = moveBlock.isActivated ? -0.08 : 0;
    }
  }
  for (let i = 0; i < [...players, ...pushBlocks, ...moveBlocks].length; i++) {
    for (const moveObj of [...players, ...pushBlocks, ...moveBlocks]) {
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
  for (const moveBlock of moveBlocks) {
    moveBlock.x += moveBlock.vx;
    moveBlock.y += moveBlock.vy; //移動
    if (moveBlock.right < 0 || moveBlock.left > MAP_BLOCK_LEN || moveBlock.bottom < 0 || moveBlock.top > MAP_BLOCK_LEN) {
      // ゴール
      remove(moveBlock);
    }
  }
  clearPressStart();
  updateSprites();
};
