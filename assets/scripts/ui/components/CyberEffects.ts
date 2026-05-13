import { Node, Graphics, tween, Vec3, UITransform, Color, UIOpacity, math } from 'cc';
import { UIFactory } from './UIFactory';
import { MeritSystem, MajorRank } from '../../core/MeritSystem';

export class CyberEffects {

    // 绘制旋转八卦法阵
    static createBaguaArray(parent: Node, radius: number = 160): { node: Node; startRotation: () => void } {
        const node = UIFactory.createNode('baguaArray', parent);
        const g = node.addComponent(Graphics);

        const rank = MeritSystem.instance.getRankInfo();
        const glowIntensity = Math.min(1, rank.major / 5);
        const baseColor = this.getRankColor(rank.major);

        // 外圈
        g.strokeColor = new Color(baseColor.r, baseColor.g, baseColor.b, Math.floor(80 + glowIntensity * 175));
        g.lineWidth = 2;
        g.circle(0, 0, radius);
        g.stroke();

        // 内圈
        g.strokeColor = new Color(baseColor.r, baseColor.g, baseColor.b, Math.floor(40 + glowIntensity * 100));
        g.lineWidth = 1;
        g.circle(0, 0, radius * 0.7);
        g.stroke();

        // 八卦线
        const trigramLines = [
            [1, 1, 1], // 乾
            [0, 0, 0], // 坤
            [1, 0, 0], // 震
            [0, 1, 1], // 巽
            [0, 1, 0], // 坎
            [1, 0, 1], // 离
            [1, 1, 0], // 兑
            [0, 0, 1], // 艮
        ];

        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8 - Math.PI / 2;
            const cx = Math.cos(angle) * radius * 0.85;
            const cy = Math.sin(angle) * radius * 0.85;
            this.drawMiniTrigram(g, cx, cy, trigramLines[i], 12, baseColor);
        }

        // 中央太极
        this.drawTaiJi(g, 0, 0, radius * 0.25, baseColor);

        const startRotation = () => {
            tween(node)
                .repeatForever(
                    tween(node).by(20, { eulerAngles: new Vec3(0, 0, -360) })
                )
                .start();
        };

        return { node, startRotation };
    }

    private static drawMiniTrigram(
        g: Graphics, cx: number, cy: number,
        lines: number[], lineLen: number, color: Color
    ): void {
        g.strokeColor = color;
        g.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
            const y = cy + (1 - j) * 6;
            if (lines[j] === 1) {
                // 阳爻：一整条线
                g.moveTo(cx - lineLen / 2, y);
                g.lineTo(cx + lineLen / 2, y);
            } else {
                // 阴爻：中间断开
                g.moveTo(cx - lineLen / 2, y);
                g.lineTo(cx - 2, y);
                g.moveTo(cx + 2, y);
                g.lineTo(cx + lineLen / 2, y);
            }
        }
        g.stroke();
    }

    private static drawTaiJi(g: Graphics, cx: number, cy: number, r: number, color: Color): void {
        g.strokeColor = color;
        g.lineWidth = 1.5;
        g.circle(cx, cy, r);
        g.stroke();

        // S曲线
        g.arc(cx, cy + r / 2, r / 2, Math.PI / 2, -Math.PI / 2, false);
        g.stroke();
        g.arc(cx, cy - r / 2, r / 2, -Math.PI / 2, Math.PI / 2, false);
        g.stroke();

        // 鱼眼
        g.fillColor = color;
        g.circle(cx, cy + r / 2, r / 6);
        g.fill();
        g.fillColor = UIFactory.COLORS.BG_DARK;
        g.circle(cx, cy - r / 2, r / 6);
        g.fill();
    }

    // 赛博数据流动画（纵向飘落的二进制字符）
    static createDataStream(parent: Node, width: number, height: number): Node {
        const node = UIFactory.createNode('dataStream', parent);
        const ut = node.getComponent(UITransform)!;
        ut.setContentSize(width, height);

        const rank = MeritSystem.instance.getRankInfo();
        if (rank.major < MajorRank.GUAN_YAO) return node; // 低段位无数据流

        const columns = Math.floor(width / 30);
        const chars = '01卦爻阴阳乾坤☰☷';

        for (let col = 0; col < columns; col++) {
            const charNode = UIFactory.createNode(`stream_${col}`, node);
            const label = UIFactory.createLabel(
                charNode,
                chars[Math.floor(Math.random() * chars.length)],
                14,
                new Color(0, 200, 255, Math.floor(30 + Math.random() * 60)),
                'char'
            );

            const x = -width / 2 + col * 30 + 15;
            const startY = height / 2 + Math.random() * 100;
            charNode.setPosition(x, startY);

            const duration = 3 + Math.random() * 5;
            tween(charNode)
                .repeatForever(
                    tween(charNode)
                        .set({ position: new Vec3(x, startY, 0) })
                        .to(duration, { position: new Vec3(x, -height / 2 - 30, 0) })
                        .call(() => {
                            label.string = chars[Math.floor(Math.random() * chars.length)];
                        })
                )
                .start();
        }

        return node;
    }

    // 霓虹描边矩形（用于面板边框）
    static addNeonBorder(
        node: Node,
        width: number,
        height: number,
        color: Color = UIFactory.COLORS.NEON_CYAN,
        pulseSpeed: number = 2
    ): Node {
        const borderNode = UIFactory.createNode('neonBorder', node);
        const g = borderNode.addComponent(Graphics);
        g.strokeColor = color;
        g.lineWidth = 1.5;
        g.roundRect(-width / 2, -height / 2, width, height, 8);
        g.stroke();

        let opacity = borderNode.addComponent(UIOpacity);
        tween(opacity)
            .repeatForever(
                tween(opacity)
                    .to(pulseSpeed / 2, { opacity: 100 })
                    .to(pulseSpeed / 2, { opacity: 255 })
            )
            .start();

        return borderNode;
    }

    // 粒子模拟（简单的漂浮光点）
    static createFloatingParticles(
        parent: Node,
        width: number,
        height: number,
        count: number = 20,
        color: Color = UIFactory.COLORS.NEON_CYAN
    ): Node {
        const node = UIFactory.createNode('particles', parent);
        const rank = MeritSystem.instance.getRankInfo();
        const actualCount = Math.floor(count * (0.3 + rank.minor * 0.2));

        for (let i = 0; i < actualCount; i++) {
            const dot = UIFactory.createNode(`p_${i}`, node);
            const g = dot.addComponent(Graphics);
            const size = 1 + Math.random() * 3;
            g.fillColor = new Color(color.r, color.g, color.b, Math.floor(60 + Math.random() * 120));
            g.circle(0, 0, size);
            g.fill();

            const x = (Math.random() - 0.5) * width;
            const y = (Math.random() - 0.5) * height;
            dot.setPosition(x, y);

            const dx = (Math.random() - 0.5) * 60;
            const dy = (Math.random() - 0.5) * 60;
            const dur = 3 + Math.random() * 4;

            tween(dot)
                .repeatForever(
                    tween(dot)
                        .to(dur, { position: new Vec3(x + dx, y + dy, 0) })
                        .to(dur, { position: new Vec3(x, y, 0) })
                )
                .start();
        }

        return node;
    }

    static getRankColor(major: MajorRank): Color {
        switch (major) {
            case MajorRank.FAN_SU: return new Color(80, 90, 120, 255);
            case MajorRank.JING_DAO: return new Color(60, 160, 255, 255);
            case MajorRank.GUAN_YAO: return new Color(0, 220, 255, 255);
            case MajorRank.YAN_GUA: return new Color(140, 80, 255, 255);
            case MajorRank.YI_DAO: return new Color(180, 100, 255, 255);
            case MajorRank.TAI_JI: return new Color(255, 200, 60, 255);
            default: return UIFactory.COLORS.NEON_CYAN;
        }
    }

    static getRankBgStyle(major: MajorRank): { bgColor: Color; hasStarfield: boolean } {
        switch (major) {
            case MajorRank.FAN_SU:
                return { bgColor: new Color(5, 5, 12, 255), hasStarfield: false };
            case MajorRank.JING_DAO:
                return { bgColor: new Color(6, 8, 18, 255), hasStarfield: false };
            case MajorRank.GUAN_YAO:
                return { bgColor: new Color(8, 10, 22, 255), hasStarfield: false };
            case MajorRank.YAN_GUA:
                return { bgColor: new Color(10, 8, 25, 255), hasStarfield: true };
            case MajorRank.YI_DAO:
                return { bgColor: new Color(5, 5, 20, 255), hasStarfield: true };
            case MajorRank.TAI_JI:
                return { bgColor: new Color(3, 3, 8, 255), hasStarfield: true };
            default:
                return { bgColor: UIFactory.COLORS.BG_DARK, hasStarfield: false };
        }
    }

    // 星空背景（高段位专属）
    static createStarfield(parent: Node, width: number, height: number): Node {
        const node = UIFactory.createNode('starfield', parent);
        const g = node.addComponent(Graphics);
        const starCount = 80;

        for (let i = 0; i < starCount; i++) {
            const x = (Math.random() - 0.5) * width;
            const y = (Math.random() - 0.5) * height;
            const size = 0.5 + Math.random() * 1.5;
            const brightness = Math.floor(100 + Math.random() * 155);
            g.fillColor = new Color(200, 210, 255, brightness);
            g.circle(x, y, size);
            g.fill();
        }

        let opacity = node.addComponent(UIOpacity);
        tween(opacity)
            .repeatForever(
                tween(opacity)
                    .to(3, { opacity: 160 })
                    .to(3, { opacity: 255 })
            )
            .start();

        return node;
    }
}
