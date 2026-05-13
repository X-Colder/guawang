import { Node, Graphics, Color, Label, tween, Vec3, UIOpacity } from 'cc';
import { UIFactory } from '../ui/components/UIFactory';
import { CyberRenderer } from '../ui/components/CyberRenderer';
import { CyberEffects } from '../ui/components/CyberEffects';
import { RankThemeManager } from '../ui/components/RankThemeManager';
import { HexagramDisplay } from '../ui/components/HexagramDisplay';
import { SceneManager, SceneName } from '../ui/components/SceneManager';
import { EventManager, GameEvents } from '../core/EventManager';
import { MeritSystem } from '../core/MeritSystem';
import { HexagramDatabase } from '../data/HexagramDatabase';
import { DailySignSystem, DailyHexagram } from './DailySignSystem';

export class DailySignScene {
    private page: Node | null = null;
    private contentNode: Node | null = null;

    build(page: Node, w: number, h: number): void {
        this.page = page;
        this.contentNode = UIFactory.createNode('content', page);

        EventManager.instance.on(GameEvents.SCENE_CHANGE, (scene: SceneName) => {
            if (scene === SceneName.DAILY_SIGN as any) {
                this.onPageEnter(w, h);
            }
        });
    }

    private onPageEnter(w: number, h: number): void {
        if (this.contentNode) {
            this.contentNode.destroyAllChildren();
        }

        const daily = DailySignSystem.instance.todayHexagram;
        const hexData = HexagramDatabase.getByIndex(daily.hexagramIndex);
        const theme = RankThemeManager.instance.getTheme(MeritSystem.instance.getRankInfo().major);

        // 背景
        const bg = this.contentNode!.addComponent(Graphics);
        bg.fillColor = new Color(3, 3, 12, 255);
        bg.rect(-w / 2, -h / 2, w, h);
        bg.fill();

        // 节气特殊背景
        if (daily.isSpecialDay) {
            this.renderSolarTermBg(this.contentNode!, w, h, daily.solarTerm!);
        } else {
            CyberEffects.createFloatingParticles(this.contentNode!, w, h, 15, theme.primaryColor);
        }

        // 顶部标题
        const titleColor = daily.isSpecialDay ? UIFactory.COLORS.NEON_GOLD : UIFactory.COLORS.NEON_CYAN;
        const titleText = daily.isSpecialDay ? `天机日签 · ${daily.solarTerm}` : '天机日签';
        UIFactory.createLabel(this.contentNode!, titleText, 32, titleColor, 'title')
            .node.setPosition(0, h / 2 - 90);

        // 日期
        UIFactory.createLabel(this.contentNode!, daily.date, 16,
            UIFactory.COLORS.TEXT_DIM, 'date')
            .node.setPosition(0, h / 2 - 125);

        // 节气寓意
        if (daily.isSpecialDay) {
            const termInfo = DailySignSystem.instance.getSolarTermInfo();
            if (termInfo) {
                UIFactory.createLabel(this.contentNode!, termInfo.meaning, 18,
                    UIFactory.COLORS.NEON_GOLD, 'termMeaning')
                    .node.setPosition(0, h / 2 - 155);
            }

            // 功德加成提示
            UIFactory.createLabel(this.contentNode!, '🌟 节气天象·今日功德获取×1.5', 16,
                new Color(255, 220, 100, 255), 'bonus')
                .node.setPosition(0, h / 2 - 185);
        }

        // 中央卦象展示
        const hexDisplay = new HexagramDisplay(this.contentNode!, 0, 30, 1.2);
        hexDisplay.displayHexagram(
            daily.result.yaoLines,
            daily.result.changingLines,
            !daily.viewed // 首次查看播放动画
        );

        // 卦名 + 性质
        const natureColor = hexData.nature.includes('凶')
            ? UIFactory.COLORS.NEON_RED
            : UIFactory.COLORS.NEON_GREEN;

        UIFactory.createLabel(this.contentNode!, hexData.fullName, 28,
            titleColor, 'hexName')
            .node.setPosition(0, -130);

        UIFactory.createLabel(this.contentNode!, `【${hexData.nature}】`, 20,
            natureColor, 'nature')
            .node.setPosition(0, -165);

        // 今日天机解读
        const { node: panel } = UIFactory.createPanel(
            this.contentNode!, w - 80, 160,
            new Color(10, 15, 35, 200), 'readingPanel'
        );
        panel.setPosition(0, -270);

        CyberEffects.addNeonBorder(panel, w - 80, 160,
            new Color(titleColor.r, titleColor.g, titleColor.b, 80));

        UIFactory.createLabel(panel, '【今日天机】', 18, titleColor, 'readingTitle')
            .node.setPosition(0, 55);

        const readingLabel = UIFactory.createLabel(panel, hexData.layer1_overview, 16,
            UIFactory.COLORS.TEXT_PRIMARY, 'reading');
        readingLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        readingLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        readingLabel.node.setPosition(0, 0);

        // 返回按钮
        UIFactory.createButton(this.contentNode!, '纳入心田，返回', 220, 48, () => {
            DailySignSystem.instance.markViewed();
            SceneManager.instance.goBack();
        }, {
            fontSize: 20,
            borderColor: titleColor,
            name: 'btnBack',
        }).setPosition(0, -h / 2 + 80);

        // 首次查看标记
        if (!daily.viewed) {
            DailySignSystem.instance.markViewed();
        }
    }

    private renderSolarTermBg(parent: Node, w: number, h: number, termName: string): void {
        // 节气特殊粒子（金色）
        CyberEffects.createFloatingParticles(parent, w, h, 25, UIFactory.COLORS.NEON_GOLD);

        // 节气符文环
        const runeNode = UIFactory.createNode('termRune', parent);
        const g = runeNode.addComponent(Graphics);
        CyberRenderer.drawRuneCircle(g, 0, 0, 200, 48,
            new Color(255, 200, 60, 30));
        tween(runeNode)
            .repeatForever(
                tween(runeNode).by(30, { eulerAngles: new Vec3(0, 0, 360) })
            )
            .start();
    }
}
