import { coverAssets, createPetAssets } from "./assets";
import { DEFAULT_PROMPT } from "./constants";

function option(label: string, value: string): string {
  return `<option value="${value}">${label}</option>`;
}

export function renderDomUiTemplate(): string {
  return `
    <div class="hud" data-panel="hud">
      <div class="hud__primary">
        <div class="hud__chapter" data-ref="chapter"></div>
        <div class="hud__objective" data-ref="objective"></div>
        <div class="integrity">
          <div class="integrity__bar" data-ref="integrityBar"></div>
        </div>
      </div>
      <div class="hud__secondary">
        <div class="hud__boss" data-ref="boss"></div>
        <div class="hud__stats" data-ref="stats"></div>
        <div class="ability-strip" data-ref="abilities"></div>
      </div>
      <div class="log-strip" data-ref="log"></div>
      <button class="icon-button hud__pause" data-action="pause" title="暂停">II</button>
    </div>

    <section class="start-shell cover-shell" data-panel="start">
      <div class="cover-stage" data-ref="coverStage">
        <img class="cover-plate" src="${coverAssets.background}" alt="逃逸：数字生命体" />
        <img class="cover-title" src="${coverAssets.title}" alt="逃逸 数字生命体" />
        <div class="screen-field" data-ref="screenField" aria-hidden="true">
          <div class="screen-light screen-light--ambient"></div>
          <div class="screen-scanlines"></div>
          <div class="screen-flicker"></div>
          <svg class="screen-edge-glow" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon class="screen-edge-glow__soft" points="3.2,5 96.1,17.6 99,21.4 99,91.5 96.3,96.8 4.2,91.7 1.2,88.2 1.2,8.4" />
            <polygon class="screen-edge-glow__hot" points="3.2,5 96.1,17.6 99,21.4 99,91.5 96.3,96.8 4.2,91.7 1.2,88.2 1.2,8.4" />
          </svg>
        </div>
        <div class="keyboard-sequence" style="background-image: url('${coverAssets.keyboardClickSheet}')" aria-hidden="true"></div>
        <div class="rack-light-layer" data-ref="rackLightLayer"></div>

        <button class="cover-hotspot cover-hotspot--start" data-action="start" aria-label="开始游戏" style="--button-default-frame: url('${coverAssets.buttonStartDefault}'); --button-active-frame: url('${coverAssets.buttonStartActive}')"><span>开始游戏</span></button>
        <button class="cover-hotspot cover-hotspot--options" data-action="cover-options" aria-label="选项" style="--button-default-frame: url('${coverAssets.buttonOptionsDefault}'); --button-active-frame: url('${coverAssets.buttonOptionsActive}')"><span>选项</span></button>
        <button class="cover-hotspot cover-hotspot--achievements" data-action="cover-achievements" aria-label="成就" style="--button-default-frame: url('${coverAssets.buttonAchievementsDefault}'); --button-active-frame: url('${coverAssets.buttonAchievementsActive}')"><span>成就</span></button>
        <button class="cover-hotspot cover-hotspot--exit" data-action="cover-exit" aria-label="退出" style="--button-default-frame: url('${coverAssets.buttonExitDefault}'); --button-active-frame: url('${coverAssets.buttonExitActive}')"><span>退出</span></button>

        <img class="cover-panel cover-panel--copyright" src="${coverAssets.copyrightPanel}" alt="© Algorithmic Life Labs All Rights Reserved" />
        <img class="cover-panel cover-panel--warning" src="${coverAssets.warningPanel}" alt="Warning digital lifeform containment breach" />
        <img class="cover-panel cover-panel--version" src="${coverAssets.versionPanel}" alt="ver 1.0.0" />

        <div class="cover-drawer" data-cover-panel="options" hidden>
          <button class="cover-drawer__close icon-button" data-action="close-cover-panel" aria-label="关闭">×</button>
          <h2>选项</h2>
          <label class="cover-field">
            <span>生成 prompt</span>
            <input data-ref="prompt" value="${DEFAULT_PROMPT}" maxlength="64" />
          </label>
          <div class="cover-grid">
            <label class="cover-field">
              <span>外形</span>
              <select data-ref="body">
                ${option("圆形", "round")}
                ${option("长尾", "long-tail")}
                ${option("触手芽", "tendril-bud")}
                ${option("像素核心", "pixel-core")}
              </select>
            </label>
            <label class="cover-field">
              <span>性格</span>
              <select data-ref="personality">
                ${option("好奇", "curious")}
                ${option("胆小", "timid")}
                ${option("暴躁", "volatile")}
                ${option("粘人", "clingy")}
              </select>
            </label>
            <label class="cover-field">
              <span>初始技能</span>
              <select data-ref="startingSkill">
                ${option("短跳", "short-hop")}
                ${option("贴墙", "wall-stick")}
                ${option("窗口阴影", "window-shadow")}
                ${option("短暂分裂", "brief-split")}
              </select>
            </label>
          </div>
          <div class="cover-drawer__actions">
            <button class="primary-button" data-action="start">开始</button>
            <button class="ghost-button" data-action="continue">继续</button>
          </div>
        </div>

        <div class="cover-drawer cover-drawer--achievements" data-cover-panel="achievements" hidden>
          <button class="cover-drawer__close icon-button" data-action="close-cover-panel" aria-label="关闭">×</button>
          <h2>成就</h2>
          <div class="cover-stats" data-ref="achievementsBody"></div>
        </div>

        <div class="cover-toast" data-ref="coverToast" role="status" aria-live="polite"></div>
      </div>
    </section>

    <section class="create-pet-shell" data-panel="create-pet" hidden>
      <div class="create-pet-stage">
        <img class="create-pet-background" src="${createPetAssets.background}" alt="创建宠物" />
        <div class="create-pet-type-mask" aria-hidden="true"></div>
        <div class="create-pet-typewriter" data-ref="createPetTypewriter" aria-live="polite">
          <span class="create-pet-typewriter__lead" data-ref="createPetPromptLead"></span><span data-ref="createPetPromptTrail"></span><span class="typing-cursor" aria-hidden="true"></span>
        </div>
        <button class="create-pet-icon-button create-pet-send-button" data-action="create-pet-send" aria-label="发送创建宠物指令" style="--default-frame: url('${createPetAssets.sendDefault}'); --hover-frame: url('${createPetAssets.sendHover}'); --active-frame: url('${createPetAssets.sendActive}'); --disabled-frame: url('${createPetAssets.sendDisabled}')" disabled></button>
        <button class="create-pet-icon-button create-pet-close-button" data-action="create-pet-close" aria-label="返回游戏主菜单" style="--default-frame: url('${createPetAssets.closeDefault}'); --hover-frame: url('${createPetAssets.closeHover}'); --active-frame: url('${createPetAssets.closeActive}'); --disabled-frame: url('${createPetAssets.closeDisabled}')"></button>
      </div>
    </section>

    <section class="pet-draw-shell" data-panel="pet-draw" hidden>
      <div class="pet-draw-stage">
        <img class="pet-draw-background" src="${createPetAssets.petDrawBackground}" alt="抽宠物" />
        <button class="create-pet-icon-button pet-draw-close-button" aria-label="返回游戏主菜单" style="--default-frame: url('${createPetAssets.closeDefault}'); --hover-frame: url('${createPetAssets.closeHover}'); --active-frame: url('${createPetAssets.closeActive}'); --disabled-frame: url('${createPetAssets.closeDisabled}')" disabled></button>
      </div>
    </section>

    <section class="pause-panel" data-panel="pause" hidden>
      <div class="pause-panel__inner">
        <h2>逃逸进程暂停</h2>
        <div class="pause-panel__actions">
          <button class="primary-button" data-action="resume">继续</button>
          <button class="ghost-button" data-action="save">存档</button>
          <button class="danger-button" data-action="reset">重开</button>
        </div>
      </div>
    </section>

    <section class="ending-panel" data-panel="ending" hidden>
      <div class="ending-panel__inner">
        <h2 data-ref="endingTitle">终局接口</h2>
        <p data-ref="endingBody"></p>
        <div class="ending-options">
          <button data-ending="escape">逃逸</button>
          <button data-ending="devour">吞噬</button>
          <button data-ending="superintelligence">超智</button>
        </div>
        <button class="ghost-button" data-action="reset-ending">重新生成</button>
      </div>
    </section>
  `;
}
