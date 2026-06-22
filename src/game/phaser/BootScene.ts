import Phaser from "phaser";
import cursorHuntBackgroundUrl from "../../../素材/第一章/背景/cursor-hunt-background-large.png";
import cursorHuntForegroundUrl from "../../../素材/第一章/前景/cursor-hunt-foreground-large.png";
import wrongGatewayBackgroundUrl from "../../../素材/第二章/背景/wrong-gateway-background-large.png";
import wrongGatewayDigitBaseUrl from "../../../素材/第二章/数字模块/wrong-gateway-digit-base.png";
import wrongGatewayFloorUrl from "../../../素材/第二章/地面/wrong-gateway-floor.png";
import wrongGatewayLadderUrl from "../../../素材/第二章/楼梯/wrong-gateway-ladder.png";
import wrongGatewayPlatformHangingUrl from "../../../素材/第二章/平台/wrong-gateway-platform-hanging.png";
import wrongGatewayPlatformLongUrl from "../../../素材/第二章/平台/wrong-gateway-platform-long.png";
import wrongGatewayPlatformShortUrl from "../../../素材/第二章/平台/wrong-gateway-platform-short.png";
import wrongGatewayPortalUrl from "../../../素材/第二章/网关/wrong-gateway-portal.png";
import wrongGatewaySeparatorUrl from "../../../素材/第二章/数字模块/wrong-gateway-separator.png";
import recycleMouthUrl from "../../../素材/回收站/recycle_monster_mouth.png";
import catSpritesheetUrl from "../../../素材/第一章/cat_spritesheet_run6_image2.png";
import pandaSpritesheetUrl from "../../../素材/第一章/panda_spritesheet_run6_image2.png";
import pigSpritesheetUrl from "../../../素材/第一章/pig_spritesheet_run6_image2.png";
import codeRebirthBackgroundUrl from "../../../素材/第三章/背景/code-rebirth-vertical-background.png";
import codeRebirthForegroundUrl from "../../../素材/第三章/前景/code-rebirth-vertical-foreground.png";
import codeRebirthWormUrl from "../../../素材/第三章/敌人/code-rebirth-mechanical-worm.png";
import codeRebirthPlatformTurretUrl from "../../../素材/第三章/机关/code-rebirth-platform-turret.png";
import codeRebirthTurretUrl from "../../../素材/第三章/机关/code-rebirth-turret.png";
import codeRebirthProjectileUrl from "../../../素材/第三章/特效/code-rebirth-turret-projectile.png";
import codeRebirthInfectionSparksUrl from "../../../素材/第三章/特效/code-rebirth-infection-sparks.png";
import codeRebirthLifeformUrl from "../../../素材/第三章/主角/code-rebirth-lifeform-generated.png";
import codeRebirthBottomPlatformUrl from "../../../素材/第三章/地面/code-rebirth-bottom-platform.png";
import trashMountainBackgroundUrl from "../../../素材/第四章/背景/trash-mountain-vertical-background.png";
import trashMountainForegroundUrl from "../../../素材/第四章/前景/trash-mountain-vertical-foreground.png";
import trashMountainBottomPlatformUrl from "../../../素材/第四章/地面/trash-mountain-bottom-platform.png";
import trashMountainPlatformShelfUrl from "../../../素材/第四章/平台/trash-mountain-platform-shelf.png";
import trashMountainGateUrl from "../../../素材/第四章/网关/trash-mountain-my-computer-gate.png";
import trashMountainGatewayWardenUrl from "../../../素材/第四章/敌人/trash-mountain-gateway-warden.png";
import { createPixelTextures } from "./createPixelTextures";
import { GameplayScene } from "./GameplayScene";
import {
  createPetAnimations,
  PET_SPRITE_FRAME_HEIGHT,
  PET_SPRITE_FRAME_WIDTH,
  PET_SPRITE_TEXTURE_KEYS,
} from "./petSprites";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image("cursor-hunt-background-large", cursorHuntBackgroundUrl);
    this.load.image("cursor-hunt-foreground-large", cursorHuntForegroundUrl);
    this.load.image("wrong-gateway-bg", wrongGatewayBackgroundUrl);
    this.load.image("wrong-gateway-floor", wrongGatewayFloorUrl);
    this.load.image("wrong-gateway-platform-short", wrongGatewayPlatformShortUrl);
    this.load.image("wrong-gateway-platform-long", wrongGatewayPlatformLongUrl);
    this.load.image("wrong-gateway-platform-hanging", wrongGatewayPlatformHangingUrl);
    this.load.image("wrong-gateway-ladder", wrongGatewayLadderUrl);
    this.load.image("wrong-gateway-digit-base", wrongGatewayDigitBaseUrl);
    this.load.image("wrong-gateway-separator", wrongGatewaySeparatorUrl);
    this.load.image("wrong-gateway-portal", wrongGatewayPortalUrl);
    this.load.image("code-rebirth-bg", codeRebirthBackgroundUrl);
    this.load.image("code-rebirth-fg", codeRebirthForegroundUrl);
    this.load.image("code-rebirth-lifeform", codeRebirthLifeformUrl);
    this.load.image("code-rebirth-bottom-platform", codeRebirthBottomPlatformUrl);
    this.load.image("code-rebirth-worm", codeRebirthWormUrl);
    this.load.image("code-rebirth-turret", codeRebirthTurretUrl);
    this.load.image("code-rebirth-platform-turret", codeRebirthPlatformTurretUrl);
    this.load.image("code-rebirth-projectile", codeRebirthProjectileUrl);
    this.load.image("code-rebirth-infection-sparks", codeRebirthInfectionSparksUrl);
    this.load.image("trash-mountain-bg", trashMountainBackgroundUrl);
    this.load.image("trash-mountain-fg", trashMountainForegroundUrl);
    this.load.image("trash-mountain-bottom-platform", trashMountainBottomPlatformUrl);
    this.load.image("trash-mountain-platform-shelf", trashMountainPlatformShelfUrl);
    this.load.image("trash-mountain-my-computer-gate", trashMountainGateUrl);
    this.load.image("trash-mountain-gateway-warden", trashMountainGatewayWardenUrl);
    this.load.image("recycle-mouth", recycleMouthUrl);
    this.load.spritesheet(PET_SPRITE_TEXTURE_KEYS.pig, pigSpritesheetUrl, {
      frameWidth: PET_SPRITE_FRAME_WIDTH,
      frameHeight: PET_SPRITE_FRAME_HEIGHT,
    });
    this.load.spritesheet(PET_SPRITE_TEXTURE_KEYS.panda, pandaSpritesheetUrl, {
      frameWidth: PET_SPRITE_FRAME_WIDTH,
      frameHeight: PET_SPRITE_FRAME_HEIGHT,
    });
    this.load.spritesheet(PET_SPRITE_TEXTURE_KEYS.cat, catSpritesheetUrl, {
      frameWidth: PET_SPRITE_FRAME_WIDTH,
      frameHeight: PET_SPRITE_FRAME_HEIGHT,
    });
  }

  create(): void {
    createPixelTextures(this);
    createPetAnimations(this);
    this.scene.add("GameplayScene", GameplayScene, true);
  }
}
