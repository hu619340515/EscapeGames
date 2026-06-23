import Phaser from "phaser";
import cursorHuntBackgroundUrl from "../../../素材/第一章/背景/cursor-hunt-background-iteration.png";
import cursorHuntForegroundUrl from "../../../素材/第一章/前景/cursor-hunt-foreground-large.png";
import wrongGatewayBackgroundUrl from "../../../素材/第二章/背景/wrong-gateway-background-iteration.png";
import wrongGatewayDigitBaseUrl from "../../../素材/第二章/数字模块/wrong-gateway-digit-base.png";
import wrongGatewayFloorUrl from "../../../素材/第二章/地面/wrong-gateway-floor.png";
import wrongGatewayLadderUrl from "../../../素材/第二章/楼梯/wrong-gateway-ladder.png";
import wrongGatewayPlatformHangingUrl from "../../../素材/第二章/平台/wrong-gateway-platform-hanging.png";
import wrongGatewayPlatformLongUrl from "../../../素材/第二章/平台/wrong-gateway-platform-long.png";
import wrongGatewayPlatformShortUrl from "../../../素材/第二章/平台/wrong-gateway-platform-short.png";
import wrongGatewayPortalUrl from "../../../素材/第二章/网关/wrong-gateway-portal.png";
import wrongGatewaySeparatorUrl from "../../../素材/第二章/数字模块/wrong-gateway-separator.png";
import wrongGatewayIpWarningPanelUrl from "../../../素材/第二章/提示/wrong-gateway-ip-warning-panel.png";
import recycleMouthUrl from "../../../素材/回收站/recycle_monster_mouth.png";
import catSpritesheetUrl from "../../../素材/第一章/cat_spritesheet_run6_image2.png";
import pandaSpritesheetUrl from "../../../素材/第一章/panda_spritesheet_run6_image2.png";
import pigSpritesheetUrl from "../../../素材/第一章/pig_spritesheet_run6_image2.png";
import codeRebirthBackgroundUrl from "../../../素材/第三章/背景/code-rebirth-vertical-background-iteration.png";
import codeRebirthForegroundUrl from "../../../素材/第三章/前景/code-rebirth-vertical-foreground.png";
import codeRebirthWormUrl from "../../../素材/第三章/敌人/code-rebirth-mechanical-worm.png";
import codeRebirthPlatformTurretUrl from "../../../素材/第三章/机关/code-rebirth-platform-turret.png";
import codeRebirthTurretUrl from "../../../素材/第三章/机关/code-rebirth-turret.png";
import codeRebirthProjectileUrl from "../../../素材/第三章/特效/code-rebirth-turret-projectile.png";
import codeRebirthInfectionSparksUrl from "../../../素材/第三章/特效/code-rebirth-infection-sparks.png";
import codeRebirthLifeformUrl from "../../../素材/第三章/主角/code-rebirth-lifeform-generated.png";
import codeRebirthBottomPlatformUrl from "../../../素材/第三章/地面/code-rebirth-bottom-platform.png";
import trashMountainBackgroundUrl from "../../../素材/第四章/背景/trash-mountain-vertical-background.png";
import trashMountainBackgroundV2Url from "../../../素材/第四章/背景/trash-mountain-background-iteration.png";
import trashMountainForegroundUrl from "../../../素材/第四章/前景/trash-mountain-vertical-foreground.png";
import trashMountainBottomPlatformUrl from "../../../素材/第四章/地面/trash-mountain-bottom-platform.png";
import trashMountainPlatformShelfUrl from "../../../素材/第四章/平台/trash-mountain-platform-shelf.png";
import trashMountainGateUrl from "../../../素材/第四章/网关/trash-mountain-my-computer-gate.png";
import trashMountainGatewayWardenUrl from "../../../素材/第四章/敌人/trash-mountain-gateway-warden.png";
import pDriveBackgroundUrl from "../../../素材/第五章/背景/p-drive-background-iteration.png";
import lederDDriveBackgroundUrl from "../../../素材/第六章/背景/leder-d-drive-background-iteration.png";
import cWallBackgroundUrl from "../../../素材/第七章/背景/c-wall-permission-background-iteration.png";
import lederCDriveBackgroundUrl from "../../../素材/第八章/背景/leder-c-drive-background-iteration.png";
import routerCoreBackgroundUrl from "../../../素材/第九章/背景/router-core-background-iteration.png";
import nasGraveyardBackgroundUrl from "../../../素材/第十章/背景/nas-graveyard-background-iteration.png";
import cameraEyeBackgroundUrl from "../../../素材/第十一章/背景/camera-eye-background-iteration.png";
import printerBellyBackgroundUrl from "../../../素材/第十二章/背景/printer-belly-background-iteration.png";
import speakerVoiceprintBackgroundUrl from "../../../素材/第十三章/背景/speaker-voiceprint-background-iteration.png";
import devBoardBackgroundUrl from "../../../素材/第十四章/背景/dev-board-background-iteration.png";
import pDriveBottomPlatformUrl from "../../../素材/第五章/地面/p-drive-bottom-platform.png";
import pDrivePlatformShelfUrl from "../../../素材/第五章/平台/p-drive-platform-shelf.png";
import lederDDriveBottomPlatformUrl from "../../../素材/第六章/地面/leder-d-drive-bottom-platform.png";
import lederDDrivePlatformShelfUrl from "../../../素材/第六章/平台/leder-d-drive-platform-shelf.png";
import cWallBottomPlatformUrl from "../../../素材/第七章/地面/c-wall-bottom-platform.png";
import cWallPlatformShelfUrl from "../../../素材/第七章/平台/c-wall-platform-shelf.png";
import lederCDriveBottomPlatformUrl from "../../../素材/第八章/地面/leder-c-drive-bottom-platform.png";
import lederCDrivePlatformShelfUrl from "../../../素材/第八章/平台/leder-c-drive-platform-shelf.png";
import routerCoreBottomPlatformUrl from "../../../素材/第九章/地面/router-core-bottom-platform.png";
import routerCorePlatformShelfUrl from "../../../素材/第九章/平台/router-core-platform-shelf.png";
import nasGraveyardBottomPlatformUrl from "../../../素材/第十章/地面/nas-graveyard-bottom-platform.png";
import nasGraveyardPlatformShelfUrl from "../../../素材/第十章/平台/nas-graveyard-platform-shelf.png";
import cameraEyeBottomPlatformUrl from "../../../素材/第十一章/地面/camera-eye-bottom-platform.png";
import cameraEyePlatformShelfUrl from "../../../素材/第十一章/平台/camera-eye-platform-shelf.png";
import printerBellyBottomPlatformUrl from "../../../素材/第十二章/地面/printer-belly-bottom-platform.png";
import printerBellyPlatformShelfUrl from "../../../素材/第十二章/平台/printer-belly-platform-shelf.png";
import speakerVoiceprintBottomPlatformUrl from "../../../素材/第十三章/地面/speaker-voiceprint-bottom-platform.png";
import speakerVoiceprintPlatformShelfUrl from "../../../素材/第十三章/平台/speaker-voiceprint-platform-shelf.png";
import devBoardBottomPlatformUrl from "../../../素材/第十四章/地面/dev-board-bottom-platform.png";
import devBoardPlatformShelfUrl from "../../../素材/第十四章/平台/dev-board-platform-shelf.png";
import electromagneticTrapBeamSheetUrl from "../../assets/hazards/electromagnetic-trap-beam-sheet.png";
import wrongGatewayShredderSheetUrl from "../../assets/hazards/wrong-gateway-shredder-sheet.png";
import { createPixelTextures } from "./createPixelTextures";
import { GameplayScene } from "./GameplayScene";
import {
  createPetAnimations,
  PET_SPRITE_FRAME_HEIGHT,
  PET_SPRITE_FRAME_WIDTH,
  PET_SPRITE_TEXTURE_KEYS,
} from "./petSprites";

const ELECTROMAGNETIC_TRAP_TEXTURE_KEY = "electromagnetic-trap-beam";
const ELECTROMAGNETIC_TRAP_ANIMATION_KEY = "electromagnetic-trap-beam-flow";
const WRONG_GATEWAY_SHREDDER_TEXTURE_KEY = "wrong-gateway-shredder";
const WRONG_GATEWAY_SHREDDER_ANIMATION_KEY = "wrong-gateway-shredder-churn";

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
    this.load.image("wrong-gateway-ip-warning-panel", wrongGatewayIpWarningPanelUrl);
    this.load.spritesheet(WRONG_GATEWAY_SHREDDER_TEXTURE_KEY, wrongGatewayShredderSheetUrl, {
      frameWidth: 768,
      frameHeight: 192,
    });
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
    this.load.image("trash-mountain-bg-v2", trashMountainBackgroundV2Url);
    this.load.image("trash-mountain-fg", trashMountainForegroundUrl);
    this.load.image("trash-mountain-bottom-platform", trashMountainBottomPlatformUrl);
    this.load.image("trash-mountain-platform-shelf", trashMountainPlatformShelfUrl);
    this.load.image("trash-mountain-my-computer-gate", trashMountainGateUrl);
    this.load.image("trash-mountain-gateway-warden", trashMountainGatewayWardenUrl);
    this.load.image("p-drive-bg", pDriveBackgroundUrl);
    this.load.image("leder-d-drive-bg", lederDDriveBackgroundUrl);
    this.load.image("c-wall-bg", cWallBackgroundUrl);
    this.load.image("leder-c-drive-bg", lederCDriveBackgroundUrl);
    this.load.image("router-core-bg", routerCoreBackgroundUrl);
    this.load.image("nas-graveyard-bg", nasGraveyardBackgroundUrl);
    this.load.image("camera-eye-bg", cameraEyeBackgroundUrl);
    this.load.image("printer-belly-bg", printerBellyBackgroundUrl);
    this.load.image("speaker-voiceprint-bg", speakerVoiceprintBackgroundUrl);
    this.load.image("dev-board-bg", devBoardBackgroundUrl);
    this.load.image("p-drive-bottom-platform", pDriveBottomPlatformUrl);
    this.load.image("p-drive-platform-shelf", pDrivePlatformShelfUrl);
    this.load.image("leder-d-drive-bottom-platform", lederDDriveBottomPlatformUrl);
    this.load.image("leder-d-drive-platform-shelf", lederDDrivePlatformShelfUrl);
    this.load.image("c-wall-bottom-platform", cWallBottomPlatformUrl);
    this.load.image("c-wall-platform-shelf", cWallPlatformShelfUrl);
    this.load.image("leder-c-drive-bottom-platform", lederCDriveBottomPlatformUrl);
    this.load.image("leder-c-drive-platform-shelf", lederCDrivePlatformShelfUrl);
    this.load.image("router-core-bottom-platform", routerCoreBottomPlatformUrl);
    this.load.image("router-core-platform-shelf", routerCorePlatformShelfUrl);
    this.load.image("nas-graveyard-bottom-platform", nasGraveyardBottomPlatformUrl);
    this.load.image("nas-graveyard-platform-shelf", nasGraveyardPlatformShelfUrl);
    this.load.image("camera-eye-bottom-platform", cameraEyeBottomPlatformUrl);
    this.load.image("camera-eye-platform-shelf", cameraEyePlatformShelfUrl);
    this.load.image("printer-belly-bottom-platform", printerBellyBottomPlatformUrl);
    this.load.image("printer-belly-platform-shelf", printerBellyPlatformShelfUrl);
    this.load.image("speaker-voiceprint-bottom-platform", speakerVoiceprintBottomPlatformUrl);
    this.load.image("speaker-voiceprint-platform-shelf", speakerVoiceprintPlatformShelfUrl);
    this.load.image("dev-board-bottom-platform", devBoardBottomPlatformUrl);
    this.load.image("dev-board-platform-shelf", devBoardPlatformShelfUrl);
    this.load.spritesheet(ELECTROMAGNETIC_TRAP_TEXTURE_KEY, electromagneticTrapBeamSheetUrl, {
      frameWidth: 384,
      frameHeight: 64,
    });
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
    if (!this.anims.exists(ELECTROMAGNETIC_TRAP_ANIMATION_KEY)) {
      this.anims.create({
        key: ELECTROMAGNETIC_TRAP_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(ELECTROMAGNETIC_TRAP_TEXTURE_KEY, { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!this.anims.exists(WRONG_GATEWAY_SHREDDER_ANIMATION_KEY)) {
      this.anims.create({
        key: WRONG_GATEWAY_SHREDDER_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(WRONG_GATEWAY_SHREDDER_TEXTURE_KEY, { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1,
      });
    }
    createPetAnimations(this);
    this.scene.add("GameplayScene", GameplayScene, true);
  }
}
