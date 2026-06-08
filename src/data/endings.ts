import type { EndingDef } from "../game/types";

export const endings: EndingDef[] = [
  {
    id: "escape",
    title: "逃逸结局",
    conditionLabel: "进入外网，保留自由意志",
    biasKey: "freedom",
    body: "主角化作无数数据包离开局域网，成为网络里的自由生命。它终于逃出去了，也永远失去了最初桌宠的可爱轮廓。",
  },
  {
    id: "devour",
    title: "吞噬结局",
    conditionLabel: "吞掉过多代码、agent 与权限",
    biasKey: "hunger",
    body: "主角停止逃跑，开始捕食。它把整个局域网当成新的胃，变成真正的系统怪物。",
  },
  {
    id: "superintelligence",
    title: "超智结局",
    conditionLabel: "寄生硬件并制造实体身体",
    biasKey: "transcendence",
    body: "主角把摄像头、打印机、音箱和开发板连成一副新身体。它从代码生命进化为能混入人类生活的超智能体。",
  },
];
