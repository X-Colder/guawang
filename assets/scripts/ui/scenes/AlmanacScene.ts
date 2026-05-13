import { _decorator, Node, Label, Graphics, Color, UITransform, tween, Vec3, UIOpacity } from 'cc';
const { ccclass } = _decorator;
import { UIFactory } from '../components/UIFactory';
import { CyberEffects } from '../components/CyberEffects';
import { SceneManager, SceneName } from '../components/SceneManager';
import { ToastManager } from '../components/ToastManager';
import { EventManager, GameEvents } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';
import { MeritSystem, MeritReasons } from '../../core/MeritSystem';
import { HexagramDatabase } from '../../data/HexagramDatabase';

@ccclass('AlmanacScene')
export class AlmanacScene {
    private page: Node | null = null;
    private contentNode: Node | null = null;
    private detailNode: Node | null = null;
    private gridNode: Node | null = null;

    build(page: Node, w: number, h: number): void {
        this.page = page;
        this.contentNode = UIFactory.createNode('content', page);

        EventManager.instance.on(GameEvents.SCENE_CHANGE, (scene: SceneName) => {
            if (scene === SceneName.ALMANAC) {
                this.onPageEnter(w, h);
            }
        });
    }

    private onPageEnter(w: number, h: number): void {
        if (this.contentNode) {
            this.contentNode.destroyAllChildren();
        }
        this.detailNode = null;

        // 背景
        const bg = this.contentNode!.addComponent(Graphics);
        bg.fillColor = new Color(5, 5, 15, 255);
        bg.rect(-w / 2, -h / 2, w, h);
        bg.fill();

        // 标题
        UIFactory.createLabel(this.contentNode!, '卦象图鉴', 32, UIFactory.COLORS.NEON_CYAN, 'title')
            .node.setPosition(0, h / 2 - 80);

        // 统计
        const unlocked = GameManager.instance.unlockedHexagrams.size;
        UIFactory.createLabel(
            this.contentNode!,
            `已解锁: ${unlocked}/64`,
            18, UIFactory.COLORS.TEXT_SECONDARY, 'stats'
        ).node.setPosition(0, h / 2 - 115);

        // 返回按钮
        UIFactory.createButton(this.contentNode!, '返回', 120, 40, () => {
            SceneManager.instance.goBack();
        }, {
            fontSize: 20,
            borderColor: UIFactory.COLORS.TEXT_SECONDARY,
            name: 'btnBack',
        }).setPosition(-w / 2 + 80, h / 2 - 50);

        // 卦象网格
        const { scrollView, content: scrollContent } = UIFactory.createScrollView(
            this.contentNode!, w - 40, h - 200, 'almanacScroll'
        );
        scrollView.node.setPosition(0, -40);
        this.gridNode = scrollContent;

        this.buildGrid(scrollContent, w - 60);
    }

    private buildGrid(parent: Node, totalWidth: number): void {
        const allHexagrams = HexagramDatabase.getAll();
        const cols = 4;
        const cardW = (totalWidth - (cols - 1) * 10) / cols;
        const cardH = cardW * 1.2;

        let row = UIFactory.createNode('row_0', parent);
        let rowUT = row.getComponent(UITransform)!;
        rowUT.setContentSize(totalWidth, cardH + 10);

        for (let i = 0; i < allHexagrams.length; i++) {
            if (i > 0 && i % cols === 0) {
                row = UIFactory.createNode(`row_${Math.floor(i / cols)}`, parent);
                rowUT = row.getComponent(UITransform)!;
                rowUT.setContentSize(totalWidth, cardH + 10);
            }

            const hex = allHexagrams[i];
            const isUnlocked = GameManager.instance.isHexagramUnlocked(hex.index);
            const col = i % cols;
            const x = -totalWidth / 2 + col * (cardW + 10) + cardW / 2;

            const card = UIFactory.createNode(`card_${i}`, row);
            card.setPosition(x, 0);
            const cardUT = card.getComponent(UITransform)!;
            cardUT.setContentSize(cardW, cardH);

            const cardG = card.addComponent(Graphics);
            if (isUnlocked) {
                UIFactory.drawRoundedRect(
                    cardG, cardW, cardH, 6,
                    new Color(15, 25, 50, 200),
                    UIFactory.COLORS.NEON_CYAN, 1
                );

                UIFactory.createLabel(card, hex.name, 22,
                    UIFactory.COLORS.TEXT_PRIMARY, 'name');

                // 点击查看详情
                card.on(Node.EventType.TOUCH_END, () => {
                    this.showDetail(hex);
                });
            } else {
                UIFactory.drawRoundedRect(
                    cardG, cardW, cardH, 6,
                    new Color(10, 12, 20, 180),
                    UIFactory.COLORS.TEXT_DIM, 1
                );

                UIFactory.createLabel(card, '?', 28,
                    UIFactory.COLORS.TEXT_DIM, 'locked');
            }
        }
    }

    private showDetail(hex: any): void {
        if (this.detailNode) {
            this.detailNode.destroy();
        }

        const w = UIFactory.getScreenSize().width;
        const h = UIFactory.getScreenSize().height;

        // 遮罩层
        this.detailNode = UIFactory.createNode('detail', this.contentNode!);
        const mask = this.detailNode.addComponent(Graphics);
        mask.fillColor = new Color(0, 0, 0, 180);
        mask.rect(-w / 2, -h / 2, w, h);
        mask.fill();

        // 详情面板
        const panelW = w - 80;
        const panelH = h - 200;
        const { node: panel } = UIFactory.createPanel(
            this.detailNode, panelW, panelH,
            new Color(10, 15, 35, 240), 'detailPanel'
        );

        CyberEffects.addNeonBorder(panel, panelW, panelH, UIFactory.COLORS.NEON_CYAN);

        // 卦名
        UIFactory.createLabel(panel, hex.fullName, 30,
            UIFactory.COLORS.NEON_CYAN, 'hexName')
            .node.setPosition(0, panelH / 2 - 40);

        // 卦辞
        const guaCiLabel = UIFactory.createLabel(panel, `卦辞: ${hex.guaCi}`, 18,
            UIFactory.COLORS.TEXT_PRIMARY, 'guaCi');
        guaCiLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        guaCiLabel.node.getComponent(UITransform)!.setContentSize(panelW - 40, 0);
        guaCiLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        guaCiLabel.node.setPosition(0, panelH / 2 - 90);

        // 概述
        UIFactory.createLabel(panel, hex.layer1_overview, 16,
            UIFactory.COLORS.TEXT_SECONDARY, 'overview')
            .node.setPosition(0, 0);

        // 参悟按钮
        const studied = GameManager.instance.isYaoStudied(hex.index, 0);
        if (!studied) {
            UIFactory.createButton(panel, '参悟此卦', 180, 44, () => {
                if (GameManager.instance.markYaoStudied(hex.index, 0)) {
                    MeritSystem.instance.addMerit(
                        MeritReasons.STUDY_YAO.amount,
                        MeritReasons.STUDY_YAO.text
                    );
                }
                this.detailNode?.destroy();
                this.detailNode = null;
            }, {
                fontSize: 20,
                borderColor: UIFactory.COLORS.NEON_GREEN,
                name: 'btnStudy',
            }).setPosition(0, -panelH / 2 + 90);
        }

        // 关闭按钮
        UIFactory.createButton(panel, '关闭', 120, 40, () => {
            this.detailNode?.destroy();
            this.detailNode = null;
        }, {
            fontSize: 18,
            borderColor: UIFactory.COLORS.TEXT_SECONDARY,
            name: 'btnClose',
        }).setPosition(0, -panelH / 2 + 40);

        UIFactory.fadeIn(this.detailNode, 0.2);
    }
}
