import { Color, Node, Graphics, tween, UIOpacity, Vec3 } from 'cc';
import { UIFactory } from './UIFactory';
import { CyberRenderer } from './CyberRenderer';
import { MajorRank, MinorRank, RankInfo } from '../../core/MeritSystem';

export interface RankTheme {
    major: MajorRank;
    name: string;

    // 颜色方案
    bgColor: Color;
    primaryColor: Color;     // 主霓虹色
    secondaryColor: Color;   // 辅助霓虹色
    accentColor: Color;      // 强调色
    textColor: Color;        // 文字颜色

    // 卦盘样式
    baguaStyle: 'dim' | 'basic' | 'glow' | 'hologram' | 'celestial' | 'divine';
    baguaRadius: number;

    // 粒子特效
    particleCount: number;
    particleSizeRange: [number, number];
    particleSpeedRange: [number, number];

    // 背景特效
    hasStarfield: boolean;
    hasDataStream: boolean;
    dataStreamDensity: number;  // 0-1
    hasRuneCircle: boolean;
    hasScanLines: boolean;

    // 动画速度
    rotationSpeed: number;  // 八卦旋转速度（秒/圈）
    glowPulseSpeed: number; // 流光脉冲周期

    // 铜钱样式
    coinDetail: 'simple' | 'medium' | 'full';
    coinGlowIntensity: number; // 0-1

    // 面板样式
    panelCornerStyle: 'round' | 'cut' | 'tech';
    panelBorderAlpha: number;  // 0-255
}

const RANK_THEMES: RankTheme[] = [
    // ========== 凡俗卦徒 ==========
    {
        major: MajorRank.FAN_SU,
        name: '凡俗卦徒',
        bgColor: new Color(5, 5, 12, 255),
        primaryColor: new Color(60, 70, 100, 255),
        secondaryColor: new Color(40, 50, 80, 255),
        accentColor: new Color(80, 90, 120, 255),
        textColor: new Color(150, 160, 180, 255),
        baguaStyle: 'dim',
        baguaRadius: 120,
        particleCount: 5,
        particleSizeRange: [0.5, 1.5],
        particleSpeedRange: [0.3, 0.8],
        hasStarfield: false,
        hasDataStream: false,
        dataStreamDensity: 0,
        hasRuneCircle: false,
        hasScanLines: false,
        rotationSpeed: 40,
        glowPulseSpeed: 4,
        coinDetail: 'simple',
        coinGlowIntensity: 0.2,
        panelCornerStyle: 'round',
        panelBorderAlpha: 60,
    },

    // ========== 静道修士 ==========
    {
        major: MajorRank.JING_DAO,
        name: '静道修士',
        bgColor: new Color(5, 8, 18, 255),
        primaryColor: new Color(60, 160, 255, 255),
        secondaryColor: new Color(40, 120, 220, 255),
        accentColor: new Color(100, 200, 255, 255),
        textColor: new Color(180, 200, 240, 255),
        baguaStyle: 'basic',
        baguaRadius: 130,
        particleCount: 12,
        particleSizeRange: [0.5, 2],
        particleSpeedRange: [0.5, 1.2],
        hasStarfield: false,
        hasDataStream: false,
        dataStreamDensity: 0,
        hasRuneCircle: false,
        hasScanLines: true,
        rotationSpeed: 30,
        glowPulseSpeed: 3,
        coinDetail: 'medium',
        coinGlowIntensity: 0.4,
        panelCornerStyle: 'round',
        panelBorderAlpha: 100,
    },

    // ========== 观爻真人 ==========
    {
        major: MajorRank.GUAN_YAO,
        name: '观爻真人',
        bgColor: new Color(5, 8, 22, 255),
        primaryColor: new Color(0, 220, 255, 255),
        secondaryColor: new Color(0, 180, 230, 255),
        accentColor: new Color(60, 255, 200, 255),
        textColor: new Color(200, 230, 255, 255),
        baguaStyle: 'glow',
        baguaRadius: 140,
        particleCount: 20,
        particleSizeRange: [1, 3],
        particleSpeedRange: [0.5, 1.5],
        hasStarfield: false,
        hasDataStream: true,
        dataStreamDensity: 0.3,
        hasRuneCircle: true,
        hasScanLines: true,
        rotationSpeed: 25,
        glowPulseSpeed: 2.5,
        coinDetail: 'medium',
        coinGlowIntensity: 0.6,
        panelCornerStyle: 'cut',
        panelBorderAlpha: 150,
    },

    // ========== 演卦灵尊 ==========
    {
        major: MajorRank.YAN_GUA,
        name: '演卦灵尊',
        bgColor: new Color(8, 5, 20, 255),
        primaryColor: new Color(140, 80, 255, 255),
        secondaryColor: new Color(180, 100, 255, 255),
        accentColor: new Color(255, 120, 255, 255),
        textColor: new Color(220, 200, 255, 255),
        baguaStyle: 'hologram',
        baguaRadius: 145,
        particleCount: 30,
        particleSizeRange: [1, 3.5],
        particleSpeedRange: [0.8, 2],
        hasStarfield: true,
        hasDataStream: true,
        dataStreamDensity: 0.5,
        hasRuneCircle: true,
        hasScanLines: true,
        rotationSpeed: 20,
        glowPulseSpeed: 2,
        coinDetail: 'full',
        coinGlowIntensity: 0.8,
        panelCornerStyle: 'tech',
        panelBorderAlpha: 180,
    },

    // ========== 易道圣者 ==========
    {
        major: MajorRank.YI_DAO,
        name: '易道圣者',
        bgColor: new Color(3, 3, 15, 255),
        primaryColor: new Color(180, 120, 255, 255),
        secondaryColor: new Color(255, 180, 80, 255),
        accentColor: new Color(255, 200, 120, 255),
        textColor: new Color(240, 220, 255, 255),
        baguaStyle: 'celestial',
        baguaRadius: 155,
        particleCount: 40,
        particleSizeRange: [1, 4],
        particleSpeedRange: [1, 2.5],
        hasStarfield: true,
        hasDataStream: true,
        dataStreamDensity: 0.7,
        hasRuneCircle: true,
        hasScanLines: true,
        rotationSpeed: 18,
        glowPulseSpeed: 1.8,
        coinDetail: 'full',
        coinGlowIntensity: 0.9,
        panelCornerStyle: 'tech',
        panelBorderAlpha: 220,
    },

    // ========== 太极道主 ==========
    {
        major: MajorRank.TAI_JI,
        name: '太极道主',
        bgColor: new Color(2, 2, 5, 255),
        primaryColor: new Color(255, 200, 60, 255),
        secondaryColor: new Color(255, 160, 40, 255),
        accentColor: new Color(255, 240, 180, 255),
        textColor: new Color(255, 240, 200, 255),
        baguaStyle: 'divine',
        baguaRadius: 165,
        particleCount: 60,
        particleSizeRange: [1, 5],
        particleSpeedRange: [1.2, 3],
        hasStarfield: true,
        hasDataStream: true,
        dataStreamDensity: 1.0,
        hasRuneCircle: true,
        hasScanLines: true,
        rotationSpeed: 15,
        glowPulseSpeed: 1.5,
        coinDetail: 'full',
        coinGlowIntensity: 1.0,
        panelCornerStyle: 'tech',
        panelBorderAlpha: 255,
    },
];

export class RankThemeManager {
    private static _instance: RankThemeManager;

    static get instance(): RankThemeManager {
        if (!this._instance) this._instance = new RankThemeManager();
        return this._instance;
    }

    getTheme(major: MajorRank): RankTheme {
        return RANK_THEMES[major] || RANK_THEMES[0];
    }

    getThemeByRank(rank: RankInfo): RankTheme {
        const base = this.getTheme(rank.major);
        // 小阶影响粒子密度和光效强度的微调
        const minorFactor = 1 + rank.minor * 0.08; // 0~3 -> 1.0~1.24
        return {
            ...base,
            particleCount: Math.floor(base.particleCount * minorFactor),
            panelBorderAlpha: Math.min(255, Math.floor(base.panelBorderAlpha * (1 + rank.minor * 0.03))),
        };
    }

    // 渲染完整的段位主题背景
    renderBackground(parent: Node, w: number, h: number, theme: RankTheme): Node {
        const bgNode = UIFactory.createNode('themedBg', parent);

        // 底色
        const bgG = bgNode.addComponent(Graphics);
        bgG.fillColor = theme.bgColor;
        bgG.rect(-w / 2, -h / 2, w, h);
        bgG.fill();

        // 扫描线
        if (theme.hasScanLines) {
            CyberRenderer.drawScanLines(bgG, -w / 2, -h / 2, w, h, 3, 8);
        }

        // 星空
        if (theme.hasStarfield) {
            this.renderStarfield(bgNode, w, h, theme);
        }

        // 数据流
        if (theme.hasDataStream) {
            this.renderDataStream(bgNode, w, h, theme);
        }

        // 符文环
        if (theme.hasRuneCircle) {
            this.renderRuneCircle(bgNode, theme);
        }

        // 漂浮粒子
        this.renderParticles(bgNode, w, h, theme);

        return bgNode;
    }

    private renderStarfield(parent: Node, w: number, h: number, theme: RankTheme): void {
        const node = UIFactory.createNode('stars', parent);
        const g = node.addComponent(Graphics);
        const count = 60 + Math.floor(theme.particleCount * 0.5);

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * w;
            const y = (Math.random() - 0.5) * h;
            const size = 0.3 + Math.random() * 2;
            const brightness = Math.floor(60 + Math.random() * 195);
            g.fillColor = new Color(
                theme.primaryColor.r * 0.5 + 128,
                theme.primaryColor.g * 0.5 + 128,
                255,
                brightness
            );
            g.circle(x, y, size);
            g.fill();
        }

        const opacity = node.addComponent(UIOpacity);
        tween(opacity)
            .repeatForever(
                tween(opacity).to(4, { opacity: 140 }).to(4, { opacity: 255 })
            )
            .start();
    }

    private renderDataStream(parent: Node, w: number, h: number, theme: RankTheme): void {
        const columns = Math.floor(w / 28 * theme.dataStreamDensity);
        const chars = '01卦爻阴阳乾坤震巽坎离艮兑☰☱☲☳☴☵☶☷';

        for (let col = 0; col < columns; col++) {
            const charNode = UIFactory.createNode(`ds_${col}`, parent);
            const label = UIFactory.createLabel(
                charNode,
                chars[Math.floor(Math.random() * chars.length)],
                10 + Math.floor(Math.random() * 6),
                new Color(
                    theme.primaryColor.r,
                    theme.primaryColor.g,
                    theme.primaryColor.b,
                    Math.floor(15 + Math.random() * 40)
                ),
                'c'
            );

            const x = -w / 2 + (col / columns) * w + Math.random() * 20;
            const startY = h / 2 + Math.random() * 200;
            charNode.setPosition(x, startY);

            const dur = 4 + Math.random() * 8;
            tween(charNode)
                .repeatForever(
                    tween(charNode)
                        .set({ position: new Vec3(x, startY, 0) })
                        .to(dur, { position: new Vec3(x, -h / 2 - 50, 0) })
                        .call(() => {
                            label.string = chars[Math.floor(Math.random() * chars.length)];
                        })
                )
                .start();
        }
    }

    private renderRuneCircle(parent: Node, theme: RankTheme): void {
        const node = UIFactory.createNode('runeCircle', parent);
        const g = node.addComponent(Graphics);
        CyberRenderer.drawRuneCircle(
            g, 0, 0, theme.baguaRadius * 1.4, 64,
            new Color(theme.primaryColor.r, theme.primaryColor.g, theme.primaryColor.b, 40)
        );

        tween(node)
            .repeatForever(
                tween(node).by(theme.rotationSpeed * 2, { eulerAngles: new Vec3(0, 0, 360) })
            )
            .start();
    }

    private renderParticles(parent: Node, w: number, h: number, theme: RankTheme): void {
        for (let i = 0; i < theme.particleCount; i++) {
            const dot = UIFactory.createNode(`pt_${i}`, parent);
            const g = dot.addComponent(Graphics);
            const size = theme.particleSizeRange[0] + Math.random() * (theme.particleSizeRange[1] - theme.particleSizeRange[0]);
            const alpha = Math.floor(30 + Math.random() * 80);
            g.fillColor = new Color(theme.primaryColor.r, theme.primaryColor.g, theme.primaryColor.b, alpha);
            g.circle(0, 0, size);
            g.fill();

            // 部分粒子用辅助色
            if (Math.random() > 0.7) {
                g.fillColor = new Color(theme.secondaryColor.r, theme.secondaryColor.g, theme.secondaryColor.b, alpha * 0.6);
                g.circle(0, 0, size * 0.6);
                g.fill();
            }

            const x = (Math.random() - 0.5) * w;
            const y = (Math.random() - 0.5) * h;
            dot.setPosition(x, y);

            const speed = theme.particleSpeedRange[0] + Math.random() * (theme.particleSpeedRange[1] - theme.particleSpeedRange[0]);
            const dx = (Math.random() - 0.5) * 80 * speed;
            const dy = (Math.random() - 0.5) * 80 * speed;
            const dur = 3 + Math.random() * 5;

            tween(dot)
                .repeatForever(
                    tween(dot)
                        .to(dur, { position: new Vec3(x + dx, y + dy, 0) })
                        .to(dur, { position: new Vec3(x, y, 0) })
                )
                .start();
        }
    }

    // 渲染主题化的八卦法阵
    renderBaguaArray(parent: Node, theme: RankTheme): { node: Node; startRotation: () => void } {
        const node = UIFactory.createNode('themeBagua', parent);
        const g = node.addComponent(Graphics);
        const r = theme.baguaRadius;
        const color = theme.primaryColor;

        // 外环
        if (theme.baguaStyle === 'divine') {
            // 太极道主：双色双环
            g.strokeColor = new Color(255, 200, 60, 200);
            g.lineWidth = 3;
            g.circle(0, 0, r);
            g.stroke();
            g.strokeColor = new Color(255, 160, 40, 120);
            g.lineWidth = 1.5;
            g.circle(0, 0, r * 1.08);
            g.stroke();
            g.strokeColor = new Color(255, 200, 60, 40);
            g.lineWidth = r * 0.12;
            g.circle(0, 0, r * 1.2);
            g.stroke();
        } else if (theme.baguaStyle === 'celestial') {
            // 易道圣者：紫金双色
            g.strokeColor = new Color(180, 120, 255, 180);
            g.lineWidth = 2.5;
            g.circle(0, 0, r);
            g.stroke();
            g.strokeColor = new Color(255, 200, 80, 80);
            g.lineWidth = 1;
            g.circle(0, 0, r * 1.05);
            g.stroke();
        } else if (theme.baguaStyle === 'hologram') {
            // 演卦灵尊：紫色全息
            g.strokeColor = new Color(color.r, color.g, color.b, 180);
            g.lineWidth = 2;
            g.circle(0, 0, r);
            g.stroke();
            g.strokeColor = new Color(color.r, color.g, color.b, 40);
            g.lineWidth = r * 0.08;
            g.circle(0, 0, r * 1.1);
            g.stroke();
        } else if (theme.baguaStyle === 'glow') {
            // 观爻真人：青蓝发光
            g.strokeColor = new Color(color.r, color.g, color.b, 150);
            g.lineWidth = 2;
            g.circle(0, 0, r);
            g.stroke();
            g.strokeColor = new Color(color.r, color.g, color.b, 25);
            g.lineWidth = r * 0.06;
            g.circle(0, 0, r * 1.08);
            g.stroke();
        } else if (theme.baguaStyle === 'basic') {
            // 静道修士：淡蓝微光
            g.strokeColor = new Color(color.r, color.g, color.b, 120);
            g.lineWidth = 1.5;
            g.circle(0, 0, r);
            g.stroke();
        } else {
            // 凡俗卦徒：暗淡
            g.strokeColor = new Color(color.r, color.g, color.b, 50);
            g.lineWidth = 1;
            g.circle(0, 0, r);
            g.stroke();
        }

        // 内圈
        g.strokeColor = new Color(color.r, color.g, color.b, Math.floor(30 + theme.coinGlowIntensity * 70));
        g.lineWidth = 1;
        g.circle(0, 0, r * 0.7);
        g.stroke();

        // 八卦符号
        const trigramDefs = [
            [1, 1, 1], [0, 0, 0], [1, 0, 0], [0, 1, 1],
            [0, 1, 0], [1, 0, 1], [1, 1, 0], [0, 0, 1],
        ];
        const trigramSize = theme.baguaStyle === 'dim' ? 8 : 12;
        const trigramAlpha = theme.baguaStyle === 'dim' ? 60 : 200;

        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8 - Math.PI / 2;
            const tx = Math.cos(angle) * r * 0.83;
            const ty = Math.sin(angle) * r * 0.83;
            CyberRenderer.drawTrigram(
                g, tx, ty, trigramDefs[i],
                trigramSize, 2.5, trigramSize * 0.4,
                new Color(color.r, color.g, color.b, trigramAlpha)
            );
        }

        // 中央太极
        const taijiColor = theme.baguaStyle === 'divine'
            ? new Color(255, 200, 60, 220)
            : new Color(color.r, color.g, color.b, Math.floor(80 + theme.coinGlowIntensity * 175));
        CyberRenderer.drawTaiJiDetailed(g, 0, 0, r * 0.2, taijiColor);

        // 旋转
        const startRotation = () => {
            tween(node)
                .repeatForever(
                    tween(node).by(theme.rotationSpeed, { eulerAngles: new Vec3(0, 0, -360) })
                )
                .start();
        };

        // 脉冲光效
        const opacity = node.addComponent(UIOpacity);
        tween(opacity)
            .repeatForever(
                tween(opacity)
                    .to(theme.glowPulseSpeed / 2, { opacity: 180 })
                    .to(theme.glowPulseSpeed / 2, { opacity: 255 })
            )
            .start();

        return { node, startRotation };
    }

    // 渲染主题化的铜钱组
    renderCoinGroup(
        parent: Node,
        count: number,
        theme: RankTheme,
        spacing: number = 70
    ): Node[] {
        const coins: Node[] = [];
        for (let i = 0; i < count; i++) {
            const coinNode = UIFactory.createNode(`coin_${i}`, parent);
            const g = coinNode.addComponent(Graphics);
            const cx = (i - (count - 1) / 2) * spacing;
            coinNode.setPosition(cx, 0);

            CyberRenderer.drawCyberCoin(
                g, 0, 0, 26,
                new Color(
                    theme.primaryColor.r,
                    theme.primaryColor.g,
                    theme.primaryColor.b,
                    Math.floor(120 + theme.coinGlowIntensity * 135)
                ),
                theme.coinDetail
            );

            // 浮动动画
            tween(coinNode)
                .repeatForever(
                    tween(coinNode)
                        .to(2 + i * 0.3, { position: new Vec3(cx, 10, 0) })
                        .to(2 + i * 0.3, { position: new Vec3(cx, -10, 0) })
                )
                .start();

            coins.push(coinNode);
        }
        return coins;
    }
}
