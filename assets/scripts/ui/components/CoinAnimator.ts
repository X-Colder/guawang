import { Node, Graphics, Color, tween, Vec3, UIOpacity } from 'cc';
import { UIFactory } from './UIFactory';
import { CyberRenderer } from './CyberRenderer';
import { RankThemeManager, RankTheme } from './RankThemeManager';
import { MeritSystem } from '../../core/MeritSystem';
import { HexagramGenerator, YaoType } from '../../divination/HexagramGenerator';

export class CoinAnimator {

    private parent: Node;
    private coinNodes: Node[] = [];
    private theme: RankTheme;

    constructor(parent: Node, theme?: RankTheme) {
        this.parent = parent;
        this.theme = theme || RankThemeManager.instance.getTheme(MeritSystem.instance.getRankInfo().major);
    }

    createCoins(count: number = 3, y: number = 0): Node[] {
        const container = UIFactory.createNode('coinAnimArea', this.parent);
        container.setPosition(0, y);
        this.coinNodes = RankThemeManager.instance.renderCoinGroup(
            container, count, this.theme, 80
        );
        return this.coinNodes;
    }

    // 单次掷铜钱动画
    animateToss(onComplete?: () => void): void {
        const totalDuration = 0.8;
        const flips = 5;

        for (let i = 0; i < this.coinNodes.length; i++) {
            const coin = this.coinNodes[i];
            const delay = i * 0.06;

            // 先抛起
            const startPos = coin.position.clone();
            const peakY = startPos.y + 40 + Math.random() * 20;

            tween(coin)
                .delay(delay)
                // 抛起阶段
                .to(totalDuration * 0.3, {
                    position: new Vec3(startPos.x + (Math.random() - 0.5) * 10, peakY, 0)
                })
                // 翻转阶段（多次Y轴压缩模拟翻转）
                .call(() => this.doFlipSequence(coin, flips, totalDuration * 0.4))
                // 落下阶段
                .delay(totalDuration * 0.4)
                .to(totalDuration * 0.2, { position: startPos })
                // 落地弹跳
                .to(0.06, { position: new Vec3(startPos.x, startPos.y + 5, 0) })
                .to(0.06, { position: startPos })
                // 落地震颤
                .to(0.03, { position: new Vec3(startPos.x + 2, startPos.y, 0) })
                .to(0.03, { position: new Vec3(startPos.x - 2, startPos.y, 0) })
                .to(0.03, { position: startPos })
                .call(() => {
                    if (i === this.coinNodes.length - 1) {
                        onComplete?.();
                    }
                })
                .start();
        }
    }

    private doFlipSequence(coin: Node, flips: number, totalTime: number): void {
        const flipTime = totalTime / (flips * 2);
        let t = tween(coin);
        for (let f = 0; f < flips; f++) {
            t = t
                .to(flipTime, { scale: new Vec3(1, 0.05, 1) })
                .to(flipTime, { scale: new Vec3(1, 1, 1) });
        }
        t.start();
    }

    // 老阳/老阴爆裂粒子效果
    static spawnExplosion(
        parent: Node,
        x: number, y: number,
        isOldYang: boolean,
        theme: RankTheme
    ): void {
        const color = isOldYang
            ? new Color(255, 200, 60, 255)  // 老阳金光
            : new Color(60, 80, 255, 255);  // 老阴蓝光
        const count = 12;

        for (let i = 0; i < count; i++) {
            const dot = UIFactory.createNode(`explosion_${i}`, parent);
            const g = dot.addComponent(Graphics);
            const size = 1 + Math.random() * 3;
            g.fillColor = new Color(color.r, color.g, color.b, 200);
            g.circle(0, 0, size);
            g.fill();
            dot.setPosition(x, y);

            const angle = (i / count) * Math.PI * 2;
            const dist = 30 + Math.random() * 50;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;

            const opacity = dot.addComponent(UIOpacity);
            tween(dot)
                .to(0.5, { position: new Vec3(x + dx, y + dy, 0) })
                .start();
            tween(opacity)
                .to(0.5, { opacity: 0 })
                .call(() => dot.destroy())
                .start();
        }

        // 中心闪光
        const flash = UIFactory.createNode('flash', parent);
        const fg = flash.addComponent(Graphics);
        fg.fillColor = new Color(color.r, color.g, color.b, 40);
        fg.circle(0, 0, 25);
        fg.fill();
        flash.setPosition(x, y);
        const flashOpacity = flash.addComponent(UIOpacity);
        tween(flashOpacity)
            .to(0.3, { opacity: 0 })
            .call(() => flash.destroy())
            .start();
        tween(flash)
            .to(0.3, { scale: new Vec3(2, 2, 1) })
            .start();
    }

    // 光轨拖尾
    static createLightTrail(
        parent: Node,
        startX: number, startY: number,
        endX: number, endY: number,
        color: Color,
        duration: number = 0.4
    ): void {
        const trail = UIFactory.createNode('trail', parent);
        const g = trail.addComponent(Graphics);

        g.strokeColor = new Color(color.r, color.g, color.b, 150);
        g.lineWidth = 2;
        g.moveTo(startX, startY);
        g.lineTo(endX, endY);
        g.stroke();

        // 渐隐
        const opacity = trail.addComponent(UIOpacity);
        tween(opacity)
            .to(duration, { opacity: 0 })
            .call(() => trail.destroy())
            .start();
    }

    // 动爻红光脉冲环
    static createChangingPulse(
        parent: Node,
        x: number, y: number,
        lineWidth: number
    ): Node {
        const pulse = UIFactory.createNode('pulse', parent);
        const g = pulse.addComponent(Graphics);

        g.strokeColor = new Color(255, 60, 80, 100);
        g.lineWidth = 2;
        // 在爻线两端画扩散环
        g.circle(x - lineWidth / 2, y, 8);
        g.stroke();
        g.circle(x + lineWidth / 2, y, 8);
        g.stroke();

        const opacity = pulse.addComponent(UIOpacity);
        tween(opacity)
            .repeatForever(
                tween(opacity)
                    .to(0.4, { opacity: 40 })
                    .to(0.4, { opacity: 180 })
            )
            .start();

        tween(pulse)
            .repeatForever(
                tween(pulse)
                    .to(0.6, { scale: new Vec3(1.3, 1.3, 1) })
                    .to(0.6, { scale: new Vec3(1, 1, 1) })
            )
            .start();

        return pulse;
    }

    // 爻线生成动画（带光效）
    static animateYaoAppear(
        parent: Node,
        yaoIndex: number,
        yaoValue: number,
        lineWidth: number,
        lineGap: number,
        theme: RankTheme,
        onComplete?: () => void
    ): Node {
        const y = (yaoIndex - 2.5) * lineGap;
        const node = UIFactory.createNode(`yaoAnim_${yaoIndex}`, parent);
        node.setPosition(0, y);

        const isYang = HexagramGenerator.isYang(yaoValue);
        const isChanging = HexagramGenerator.isChangingLine(yaoValue);
        const color = isChanging ? UIFactory.COLORS.NEON_RED : theme.primaryColor;

        // 先画光效展开
        const expandNode = UIFactory.createNode('expand', node);
        const expandG = expandNode.addComponent(Graphics);
        expandG.strokeColor = new Color(color.r, color.g, color.b, 60);
        expandG.lineWidth = 12;
        expandG.moveTo(-2, 0);
        expandG.lineTo(2, 0);
        expandG.stroke();

        // 从中心向两边展开
        tween(expandNode)
            .to(0.2, { scale: new Vec3(lineWidth / 4, 1, 1) })
            .call(() => {
                expandNode.destroy();

                // 画正式的爻线
                const lineG = node.addComponent(Graphics);
                CyberRenderer.drawYaoLine(
                    lineG, 0, 0, isYang, isChanging,
                    lineWidth, 5, theme.primaryColor, UIFactory.COLORS.NEON_RED
                );

                // 老阳/老阴爆裂效果
                if (isChanging) {
                    CoinAnimator.spawnExplosion(
                        parent, 0, y,
                        yaoValue === YaoType.OLD_YANG,
                        theme
                    );
                    CoinAnimator.createChangingPulse(node, 0, 0, lineWidth);
                }

                onComplete?.();
            })
            .start();

        // 淡入
        const opacity = node.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 255 }).start();

        return node;
    }
}
