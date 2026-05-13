import { Node, Label, Graphics, Color, UITransform, EditBox, tween, UIOpacity, Vec3 } from 'cc';
import { UIFactory } from '../components/UIFactory';
import { CyberEffects } from '../components/CyberEffects';
import { SceneManager, SceneName } from '../components/SceneManager';
import { ToastManager } from '../components/ToastManager';
import { EventManager, GameEvents } from '../../core/EventManager';
import { GameManager, DivinationRecord } from '../../core/GameManager';
import { MeritSystem, MeritReasons } from '../../core/MeritSystem';
import { HexagramDatabase } from '../../data/HexagramDatabase';

export class HistoryScene {
    private page: Node | null = null;
    private contentNode: Node | null = null;
    private detailNode: Node | null = null;

    build(page: Node, w: number, h: number): void {
        this.page = page;
        this.contentNode = UIFactory.createNode('content', page);

        EventManager.instance.on(GameEvents.SCENE_CHANGE, (scene: SceneName) => {
            if (scene === SceneName.HISTORY) {
                this.onPageEnter(w, h);
            }
        });
    }

    private onPageEnter(w: number, h: number): void {
        if (this.contentNode) {
            this.contentNode.destroyAllChildren();
        }

        // 背景
        const bg = this.contentNode!.addComponent(Graphics);
        bg.fillColor = new Color(5, 5, 15, 255);
        bg.rect(-w / 2, -h / 2, w, h);
        bg.fill();

        // 标题
        UIFactory.createLabel(this.contentNode!, '卦录复盘', 32,
            UIFactory.COLORS.NEON_GOLD, 'title')
            .node.setPosition(0, h / 2 - 80);

        // 返回按钮
        UIFactory.createButton(this.contentNode!, '返回', 120, 40, () => {
            SceneManager.instance.goBack();
        }, {
            fontSize: 20,
            borderColor: UIFactory.COLORS.TEXT_SECONDARY,
            name: 'btnBack',
        }).setPosition(-w / 2 + 80, h / 2 - 50);

        const records = GameManager.instance.records;

        if (records.length === 0) {
            UIFactory.createLabel(this.contentNode!, '暂无卦录，去起卦吧', 20,
                UIFactory.COLORS.TEXT_DIM, 'empty')
                .node.setPosition(0, 0);
            return;
        }

        // 记录列表
        const { scrollView, content: scrollContent } = UIFactory.createScrollView(
            this.contentNode!, w - 40, h - 180, 'historyScroll'
        );
        scrollView.node.setPosition(0, -30);

        for (const record of records) {
            this.createRecordCard(scrollContent, w - 60, record);
        }
    }

    private createRecordCard(parent: Node, width: number, record: DivinationRecord): void {
        const cardH = 100;
        const { node: card } = UIFactory.createPanel(
            parent, width, cardH,
            new Color(12, 18, 35, 200), `record_${record.id}`
        );

        const origHex = HexagramDatabase.getByIndex(record.originalHexagram);
        const hexName = origHex?.fullName || `卦象#${record.originalHexagram}`;
        const date = new Date(record.timestamp);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        // 卦名
        UIFactory.createLabel(card, hexName, 22,
            UIFactory.COLORS.NEON_CYAN, 'hexName')
            .node.setPosition(-width / 4, 20);

        // 日期
        UIFactory.createLabel(card, dateStr, 14,
            UIFactory.COLORS.TEXT_DIM, 'date')
            .node.setPosition(width / 3, 20);

        // 问题
        const questionText = record.question.length > 16
            ? record.question.substring(0, 16) + '...'
            : record.question;
        UIFactory.createLabel(card, `问: ${questionText}`, 16,
            UIFactory.COLORS.TEXT_SECONDARY, 'question')
            .node.setPosition(0, -10);

        // 复盘状态
        const statusText = record.reviewed ? '已复盘' : '未复盘';
        const statusColor = record.reviewed ? UIFactory.COLORS.NEON_GREEN : UIFactory.COLORS.TEXT_DIM;
        UIFactory.createLabel(card, statusText, 14, statusColor, 'status')
            .node.setPosition(width / 3, -10);

        // 点击展开复盘
        card.on(Node.EventType.TOUCH_END, () => {
            this.showReviewPanel(record);
        });
    }

    private showReviewPanel(record: DivinationRecord): void {
        if (this.detailNode) {
            this.detailNode.destroy();
        }

        const w = UIFactory.getScreenSize().width;
        const h = UIFactory.getScreenSize().height;

        this.detailNode = UIFactory.createNode('reviewPanel', this.contentNode!);
        const mask = this.detailNode.addComponent(Graphics);
        mask.fillColor = new Color(0, 0, 0, 180);
        mask.rect(-w / 2, -h / 2, w, h);
        mask.fill();

        const panelW = w - 80;
        const panelH = 400;
        const { node: panel } = UIFactory.createPanel(
            this.detailNode, panelW, panelH,
            new Color(10, 15, 35, 240), 'reviewContent'
        );

        CyberEffects.addNeonBorder(panel, panelW, panelH, UIFactory.COLORS.NEON_GOLD);

        const origHex = HexagramDatabase.getByIndex(record.originalHexagram);

        UIFactory.createLabel(panel, `复盘: ${origHex?.fullName || '未知卦'}`, 24,
            UIFactory.COLORS.NEON_GOLD, 'title')
            .node.setPosition(0, panelH / 2 - 35);

        UIFactory.createLabel(panel, `问: ${record.question}`, 18,
            UIFactory.COLORS.TEXT_PRIMARY, 'question')
            .node.setPosition(0, panelH / 2 - 75);

        // 已有复盘笔记
        if (record.reviewNote) {
            UIFactory.createLabel(panel, `笔记: ${record.reviewNote}`, 16,
                UIFactory.COLORS.TEXT_SECONDARY, 'note')
                .node.setPosition(0, 0);
        }

        // 输入复盘笔记
        if (!record.reviewed) {
            const editBox = UIFactory.createEditBox(
                panel, '写下你的复盘感悟...', panelW - 60, 50, 'reviewInput'
            );
            editBox.node.setPosition(0, -20);

            UIFactory.createButton(panel, '提交复盘', 160, 44, () => {
                const note = editBox.string?.trim();
                if (note && note.length > 0) {
                    GameManager.instance.addReviewNote(record.id, note);
                    MeritSystem.instance.addMerit(
                        MeritReasons.REVIEW_RECORD.amount,
                        MeritReasons.REVIEW_RECORD.text
                    );
                    this.detailNode?.destroy();
                    this.detailNode = null;
                    // 刷新列表
                    const screenSize = UIFactory.getScreenSize();
                    this.onPageEnter(screenSize.width, screenSize.height);
                } else {
                    ToastManager.instance.showSystemTip('请输入复盘内容');
                }
            }, {
                fontSize: 18,
                borderColor: UIFactory.COLORS.NEON_GREEN,
                name: 'btnSubmitReview',
            }).setPosition(0, -90);
        }

        // 关闭
        UIFactory.createButton(panel, '关闭', 120, 40, () => {
            this.detailNode?.destroy();
            this.detailNode = null;
        }, {
            fontSize: 18,
            borderColor: UIFactory.COLORS.TEXT_SECONDARY,
            name: 'btnClose',
        }).setPosition(0, -panelH / 2 + 35);

        UIFactory.fadeIn(this.detailNode, 0.2);
    }
}
