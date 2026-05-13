import { _decorator, Node, Label, Graphics, Color, UITransform, ScrollView, tween, UIOpacity, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { UIFactory } from '../components/UIFactory';
import { CyberEffects } from '../components/CyberEffects';
import { HexagramDisplay } from '../components/HexagramDisplay';
import { SceneManager, SceneName, SceneData } from '../components/SceneManager';
import { ToastManager } from '../components/ToastManager';
import { EventManager, GameEvents } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';
import { MeritSystem, MeritReasons, MeritPenalties } from '../../core/MeritSystem';
import { HexagramInterpreter } from '../../divination/HexagramInterpreter';
import { DivinationResult, HexagramGenerator } from '../../divination/HexagramGenerator';
import { HexagramDatabase } from '../../data/HexagramDatabase';

@ccclass('ReadingScene')
export class ReadingScene {
    private page: Node | null = null;
    private contentNode: Node | null = null;
    private hasCompletedReading: boolean = false;
    private currentRecordId: string = '';
    private isBadHexagram: boolean = false;
    private enterTimestamp: number = 0;

    build(page: Node, w: number, h: number): void {
        this.page = page;
        this.contentNode = UIFactory.createNode('content', page);

        EventManager.instance.on(GameEvents.SCENE_CHANGE, (scene: SceneName, data?: SceneData) => {
            if (scene === SceneName.READING) {
                this.onPageEnter(w, h, data);
            }
        });
    }

    private onPageEnter(w: number, h: number, data?: SceneData): void {
        if (this.contentNode) {
            this.contentNode.destroyAllChildren();
        }
        this.hasCompletedReading = false;
        this.enterTimestamp = Date.now();

        const result = data?.result as DivinationResult;
        const question = data?.question as string || '';
        this.currentRecordId = data?.recordId as string || '';

        if (!result) return;

        // 背景
        const bg = this.contentNode!.addComponent(Graphics);
        bg.fillColor = new Color(5, 5, 15, 255);
        bg.rect(-w / 2, -h / 2, w, h);
        bg.fill();

        // 标题
        UIFactory.createLabel(this.contentNode!, '全息排盘', 32, UIFactory.COLORS.NEON_CYAN, 'title')
            .node.setPosition(0, h / 2 - 80);

        UIFactory.createLabel(this.contentNode!, `所问: ${question}`, 16,
            UIFactory.COLORS.TEXT_SECONDARY, 'question')
            .node.setPosition(0, h / 2 - 115);

        // 获取卦象数据
        const origHex = HexagramDatabase.getByIndex(result.originalIndex);
        const changedHex = HexagramDatabase.getByIndex(result.changedIndex);

        if (!origHex) {
            UIFactory.createLabel(this.contentNode!, '卦象数据加载失败', 24,
                UIFactory.COLORS.NEON_RED, 'error')
                .node.setPosition(0, 0);
            return;
        }

        this.isBadHexagram = HexagramInterpreter.isBadHexagram(origHex.nature);

        // 本卦/变卦双显
        const dualContainer = UIFactory.createNode('dualDisplay', this.contentNode!);
        dualContainer.setPosition(0, h / 2 - 280);

        HexagramDisplay.createDualDisplay(
            dualContainer,
            result.originalLines,
            result.changedLines,
            result.yaoLines,
            result.changingLines,
            origHex.name,
            changedHex?.name || origHex.name,
            0.7
        );

        // 卦名+性质
        const natureColor = this.isBadHexagram ? UIFactory.COLORS.NEON_RED : UIFactory.COLORS.NEON_GREEN;
        UIFactory.createLabel(
            this.contentNode!, `${origHex.fullName}  【${origHex.nature}】`,
            24, natureColor, 'hexName'
        ).node.setPosition(0, h / 2 - 410);

        // 动爻说明
        if (result.changingLines.length > 0) {
            const changingText = HexagramGenerator.getChangingNature(result.changingLines.length);
            UIFactory.createLabel(this.contentNode!, changingText, 16,
                UIFactory.COLORS.TEXT_SECONDARY, 'changingNote')
                .node.setPosition(0, h / 2 - 440);
        }

        // 三层解读面板（使用 ScrollView）
        const readingY = -40;
        const panelW = w - 60;
        const { scrollView, content: scrollContent } = UIFactory.createScrollView(
            this.contentNode!, panelW, h / 2 + 40, 'readingScroll'
        );
        scrollView.node.setPosition(0, readingY);

        // 生成解读
        const interpretation = HexagramInterpreter.interpret(
            origHex,
            result.changingLines,
            changedHex && changedHex !== origHex ? changedHex : undefined
        );

        // 渲染三层解读
        for (const layer of interpretation.layers) {
            this.createReadingPanel(scrollContent, panelW - 20, layer.title, layer.content, layer.locked);
        }

        // 动爻注解
        if (interpretation.changingLineNotes.length > 0) {
            this.createReadingPanel(
                scrollContent, panelW - 20,
                '动爻详解',
                interpretation.changingLineNotes.join('\n\n'),
                false
            );
        }

        // 古文注解（高段位）
        if (interpretation.ancientText) {
            this.createReadingPanel(
                scrollContent, panelW - 20,
                '古传注解',
                interpretation.ancientText,
                false
            );
        }

        // 底部按钮
        const btnY = -h / 2 + 60;
        UIFactory.createButton(this.contentNode!, '卦象已观，返回', 240, 50, () => {
            this.onComplete();
        }, {
            fontSize: 22,
            borderColor: UIFactory.COLORS.NEON_CYAN,
            name: 'btnDone',
        }).setPosition(0, btnY);

        // 弃卦检测：监听页面离开
        EventManager.instance.on(GameEvents.SCENE_CHANGE, (scene: SceneName) => {
            if (scene !== SceneName.READING && !this.hasCompletedReading && this.enterTimestamp > 0) {
                const elapsed = Date.now() - this.enterTimestamp;
                if (elapsed < 5000) {
                    MeritSystem.instance.deductMerit(
                        MeritPenalties.ABANDON.amount,
                        MeritPenalties.ABANDON.text
                    );
                }
                this.enterTimestamp = 0;
            }
        });
    }

    private createReadingPanel(
        parent: Node, width: number,
        title: string, content: string, locked: boolean
    ): void {
        const panelH = locked ? 80 : Math.max(100, content.length * 1.2 + 60);
        const { node: panel } = UIFactory.createPanel(
            parent, width, panelH,
            new Color(12, 18, 35, 220), `panel_${title}`
        );

        CyberEffects.addNeonBorder(panel, width, panelH, UIFactory.COLORS.BORDER_GLOW, 3);

        // 标题
        UIFactory.createLabel(panel, `【${title}】`, 20, UIFactory.COLORS.NEON_CYAN, 'layerTitle')
            .node.setPosition(0, panelH / 2 - 25);

        if (locked) {
            UIFactory.createLabel(panel, '▣ 段位不足，暂未解锁此层解读', 16,
                UIFactory.COLORS.TEXT_DIM, 'locked')
                .node.setPosition(0, 0);
        } else {
            const contentLabel = UIFactory.createLabel(
                panel, content, 18, UIFactory.COLORS.TEXT_PRIMARY, 'layerContent'
            );
            contentLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
            contentLabel.node.getComponent(UITransform)!.setContentSize(width - 30, 0);
            contentLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
            contentLabel.node.setPosition(0, -10);
        }
    }

    private onComplete(): void {
        this.hasCompletedReading = true;
        this.enterTimestamp = 0;

        // 完整看完解读 +25功德
        MeritSystem.instance.addMerit(
            MeritReasons.COMPLETE_READING.amount,
            MeritReasons.COMPLETE_READING.text
        );

        // 如果是凶卦且没有重摇，额外 +40功德
        if (this.isBadHexagram) {
            MeritSystem.instance.addMerit(
                MeritReasons.ACCEPT_BAD.amount,
                MeritReasons.ACCEPT_BAD.text
            );
        }

        SceneManager.instance.goTo(SceneName.MAIN);
        SceneManager.instance.clearStack();
    }
}
