import { Graphics, Color, Vec2, UIOpacity, Node, tween, Vec3, UITransform } from 'cc';
import { UIFactory } from './UIFactory';

/**
 * 赛博修仙风格 专用矢量绘图引擎
 * 所有视觉元素均通过 Graphics API 代码绘制，无需外部图片资源
 */
export class CyberRenderer {

    // ==================== 赛博铜钱 ====================

    static drawCyberCoin(
        g: Graphics,
        cx: number, cy: number,
        radius: number,
        glowColor: Color,
        detail: 'simple' | 'medium' | 'full' = 'medium'
    ): void {
        // 最外层光晕
        if (detail !== 'simple') {
            g.strokeColor = new Color(glowColor.r, glowColor.g, glowColor.b, 20);
            g.lineWidth = radius * 0.3;
            g.circle(cx, cy, radius * 1.15);
            g.stroke();
        }

        // 外圈主线
        g.strokeColor = glowColor;
        g.lineWidth = 2.5;
        g.circle(cx, cy, radius);
        g.stroke();

        // 外圈内描边
        g.strokeColor = new Color(glowColor.r, glowColor.g, glowColor.b, 120);
        g.lineWidth = 1;
        g.circle(cx, cy, radius * 0.88);
        g.stroke();

        // 方孔（中央正方形）
        const holeSize = radius * 0.3;
        g.strokeColor = glowColor;
        g.lineWidth = 2;
        g.rect(cx - holeSize, cy - holeSize, holeSize * 2, holeSize * 2);
        g.stroke();

        // 方孔内十字纹
        if (detail === 'full') {
            g.strokeColor = new Color(glowColor.r, glowColor.g, glowColor.b, 80);
            g.lineWidth = 1;
            g.moveTo(cx, cy - holeSize * 0.6);
            g.lineTo(cx, cy + holeSize * 0.6);
            g.stroke();
            g.moveTo(cx - holeSize * 0.6, cy);
            g.lineTo(cx + holeSize * 0.6, cy);
            g.stroke();
        }

        // 四方铭文装饰线（上下左右各一条短线）
        const textDist = radius * 0.65;
        const textLen = radius * 0.18;
        g.strokeColor = new Color(glowColor.r, glowColor.g, glowColor.b, 160);
        g.lineWidth = 1.5;
        // 上
        g.moveTo(cx - textLen, cy + textDist);
        g.lineTo(cx + textLen, cy + textDist);
        g.stroke();
        // 下
        g.moveTo(cx - textLen, cy - textDist);
        g.lineTo(cx + textLen, cy - textDist);
        g.stroke();
        // 左
        g.moveTo(cx - textDist, cy - textLen);
        g.lineTo(cx - textDist, cy + textLen);
        g.stroke();
        // 右
        g.moveTo(cx + textDist, cy - textLen);
        g.lineTo(cx + textDist, cy + textLen);
        g.stroke();

        // 外圈四角小圆点装饰
        if (detail !== 'simple') {
            const dotDist = radius * 0.78;
            const dotR = 1.5;
            g.fillColor = new Color(glowColor.r, glowColor.g, glowColor.b, 180);
            for (let angle = Math.PI / 4; angle < Math.PI * 2; angle += Math.PI / 2) {
                g.circle(cx + Math.cos(angle) * dotDist, cy + Math.sin(angle) * dotDist, dotR);
                g.fill();
            }
        }

        // 外圈刻度线（8个方位）
        if (detail === 'full') {
            const tickInner = radius * 0.92;
            const tickOuter = radius * 0.98;
            g.strokeColor = new Color(glowColor.r, glowColor.g, glowColor.b, 100);
            g.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                g.moveTo(cx + Math.cos(angle) * tickInner, cy + Math.sin(angle) * tickInner);
                g.lineTo(cx + Math.cos(angle) * tickOuter, cy + Math.sin(angle) * tickOuter);
                g.stroke();
            }
        }
    }

    // 铜钱正面（阳面，三条横线代表"开"字）
    static drawCoinYangFace(g: Graphics, cx: number, cy: number, radius: number, color: Color): void {
        this.drawCyberCoin(g, cx, cy, radius, color, 'full');
        const lineLen = radius * 0.25;
        const lineGap = radius * 0.12;
        g.strokeColor = color;
        g.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
            const y = cy + textDist(i, lineGap, radius);
            g.moveTo(cx - lineLen, cy + i * lineGap + radius * 0.45);
            g.lineTo(cx + lineLen, cy + i * lineGap + radius * 0.45);
            g.stroke();
        }
    }

    // ==================== 八卦符号 ====================

    static drawTrigram(
        g: Graphics,
        cx: number, cy: number,
        lines: number[], // [bottom, middle, top], 1=阳 0=阴
        lineWidth: number = 30,
        lineThickness: number = 4,
        gap: number = 10,
        color: Color = UIFactory.COLORS.NEON_CYAN
    ): void {
        g.strokeColor = color;
        g.lineWidth = lineThickness;

        for (let i = 0; i < 3; i++) {
            const y = cy + (i - 1) * gap;
            const halfW = lineWidth / 2;
            const breakGap = lineWidth * 0.12;

            if (lines[i] === 1) {
                // 阳爻：连续
                g.moveTo(cx - halfW, y);
                g.lineTo(cx + halfW, y);
                g.stroke();
            } else {
                // 阴爻：中间断开
                g.moveTo(cx - halfW, y);
                g.lineTo(cx - breakGap, y);
                g.stroke();
                g.moveTo(cx + breakGap, y);
                g.lineTo(cx + halfW, y);
                g.stroke();
            }
        }
    }

    // 带光效的八卦符号
    static drawGlowTrigram(
        g: Graphics,
        cx: number, cy: number,
        lines: number[],
        size: number,
        color: Color
    ): void {
        // 底层光晕
        const glowColor = new Color(color.r, color.g, color.b, 30);
        this.drawTrigram(g, cx, cy, lines, size, 12, size * 0.35, glowColor);
        // 主体
        this.drawTrigram(g, cx, cy, lines, size, 3, size * 0.35, color);
    }

    // ==================== 太极图 ====================

    static drawTaiJiDetailed(
        g: Graphics,
        cx: number, cy: number,
        radius: number,
        yangColor: Color,
        yinColor: Color = UIFactory.COLORS.BG_DARK
    ): void {
        // 外圈
        g.strokeColor = yangColor;
        g.lineWidth = 2;
        g.circle(cx, cy, radius);
        g.stroke();

        // 阳鱼（右半圆 + 上小半圆 - 下小半圆）
        g.fillColor = yangColor;
        // 右侧大半圆
        g.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2, false);
        g.lineTo(cx, cy + radius);
        g.fill();

        // 上小半圆（阳鱼鼓起）
        g.fillColor = yangColor;
        g.arc(cx, cy - radius / 2, radius / 2, Math.PI / 2, -Math.PI / 2, true);
        g.fill();

        // 下小半圆（阴鱼鼓起，覆盖）
        g.fillColor = yinColor;
        g.arc(cx, cy + radius / 2, radius / 2, -Math.PI / 2, Math.PI / 2, true);
        g.fill();

        // 阳鱼眼（小黑点在上半）
        g.fillColor = yinColor;
        g.circle(cx, cy - radius / 2, radius / 6);
        g.fill();

        // 阴鱼眼（小白点在下半）
        g.fillColor = yangColor;
        g.circle(cx, cy + radius / 2, radius / 6);
        g.fill();

        // 外圈光晕
        g.strokeColor = new Color(yangColor.r, yangColor.g, yangColor.b, 40);
        g.lineWidth = radius * 0.15;
        g.circle(cx, cy, radius * 1.1);
        g.stroke();
    }

    // ==================== 六爻显示 ====================

    static drawYaoLine(
        g: Graphics,
        cx: number, cy: number,
        isYang: boolean,
        isChanging: boolean,
        lineWidth: number = 100,
        lineThickness: number = 6,
        normalColor: Color = UIFactory.COLORS.NEON_CYAN,
        changingColor: Color = UIFactory.COLORS.NEON_RED
    ): void {
        const color = isChanging ? changingColor : normalColor;
        const halfW = lineWidth / 2;
        const breakGap = 8;

        // 底层光晕
        if (isChanging) {
            g.strokeColor = new Color(changingColor.r, changingColor.g, changingColor.b, 30);
            g.lineWidth = lineThickness * 3;
            if (isYang) {
                g.moveTo(cx - halfW, cy);
                g.lineTo(cx + halfW, cy);
                g.stroke();
            } else {
                g.moveTo(cx - halfW, cy);
                g.lineTo(cx - breakGap, cy);
                g.stroke();
                g.moveTo(cx + breakGap, cy);
                g.lineTo(cx + halfW, cy);
                g.stroke();
            }
        }

        // 主爻线
        g.strokeColor = color;
        g.lineWidth = lineThickness;
        if (isYang) {
            g.moveTo(cx - halfW, cy);
            g.lineTo(cx + halfW, cy);
            g.stroke();
        } else {
            g.moveTo(cx - halfW, cy);
            g.lineTo(cx - breakGap, cy);
            g.stroke();
            g.moveTo(cx + breakGap, cy);
            g.lineTo(cx + halfW, cy);
            g.stroke();
        }

        // 两端端点装饰
        const dotR = 2;
        g.fillColor = color;
        g.circle(cx - halfW, cy, dotR);
        g.fill();
        g.circle(cx + halfW, cy, dotR);
        g.fill();

        // 动爻标记：两侧小三角
        if (isChanging) {
            const triSize = 5;
            g.fillColor = changingColor;
            // 左三角
            g.moveTo(cx - halfW - triSize * 2, cy);
            g.lineTo(cx - halfW - triSize * 2 - triSize, cy - triSize);
            g.lineTo(cx - halfW - triSize * 2 - triSize, cy + triSize);
            g.closePath();
            g.fill();
            // 右三角
            g.moveTo(cx + halfW + triSize * 2, cy);
            g.lineTo(cx + halfW + triSize * 2 + triSize, cy - triSize);
            g.lineTo(cx + halfW + triSize * 2 + triSize, cy + triSize);
            g.closePath();
            g.fill();
        }
    }

    // 绘制完整六爻卦象
    static drawHexagram(
        g: Graphics,
        cx: number, cy: number,
        lines: number[], // 6 lines, 0=yin, 1=yang
        changingLines: number[], // indices of changing lines
        lineWidth: number = 100,
        lineGap: number = 22,
        normalColor: Color = UIFactory.COLORS.NEON_CYAN,
        changingColor: Color = UIFactory.COLORS.NEON_RED
    ): void {
        for (let i = 0; i < 6; i++) {
            const y = cy + (i - 2.5) * lineGap;
            const isChanging = changingLines.includes(i);
            this.drawYaoLine(g, cx, y, lines[i] === 1, isChanging, lineWidth, 5, normalColor, changingColor);
        }
    }

    // ==================== 赛博边框和面板 ====================

    static drawCyberPanel(
        g: Graphics,
        x: number, y: number,
        width: number, height: number,
        bgColor: Color,
        borderColor: Color,
        cornerStyle: 'round' | 'cut' | 'tech' = 'tech'
    ): void {
        const hw = width / 2;
        const hh = height / 2;
        const cut = Math.min(12, width * 0.05, height * 0.05);

        // 背景
        g.fillColor = bgColor;
        if (cornerStyle === 'round') {
            g.roundRect(x - hw, y - hh, width, height, 8);
        } else if (cornerStyle === 'cut') {
            // 切角矩形
            g.moveTo(x - hw + cut, y - hh);
            g.lineTo(x + hw - cut, y - hh);
            g.lineTo(x + hw, y - hh + cut);
            g.lineTo(x + hw, y + hh - cut);
            g.lineTo(x + hw - cut, y + hh);
            g.lineTo(x - hw + cut, y + hh);
            g.lineTo(x - hw, y + hh - cut);
            g.lineTo(x - hw, y - hh + cut);
            g.closePath();
        } else {
            // Tech风格：左上右下切角
            g.moveTo(x - hw + cut, y + hh);
            g.lineTo(x + hw, y + hh);
            g.lineTo(x + hw, y - hh + cut);
            g.lineTo(x + hw - cut, y - hh);
            g.lineTo(x - hw, y - hh);
            g.lineTo(x - hw, y + hh - cut);
            g.closePath();
        }
        g.fill();

        // 边框
        g.strokeColor = borderColor;
        g.lineWidth = 1.5;
        if (cornerStyle === 'round') {
            g.roundRect(x - hw, y - hh, width, height, 8);
        } else if (cornerStyle === 'cut') {
            g.moveTo(x - hw + cut, y - hh);
            g.lineTo(x + hw - cut, y - hh);
            g.lineTo(x + hw, y - hh + cut);
            g.lineTo(x + hw, y + hh - cut);
            g.lineTo(x + hw - cut, y + hh);
            g.lineTo(x - hw + cut, y + hh);
            g.lineTo(x - hw, y + hh - cut);
            g.lineTo(x - hw, y - hh + cut);
            g.closePath();
        } else {
            g.moveTo(x - hw + cut, y + hh);
            g.lineTo(x + hw, y + hh);
            g.lineTo(x + hw, y - hh + cut);
            g.lineTo(x + hw - cut, y - hh);
            g.lineTo(x - hw, y - hh);
            g.lineTo(x - hw, y + hh - cut);
            g.closePath();
        }
        g.stroke();

        // 角落装饰线
        if (cornerStyle === 'tech') {
            const deco = cut * 1.5;
            g.strokeColor = new Color(borderColor.r, borderColor.g, borderColor.b, 100);
            g.lineWidth = 1;
            // 右上角装饰
            g.moveTo(x + hw - deco, y - hh);
            g.lineTo(x + hw, y - hh + deco);
            g.stroke();
            // 左下角装饰
            g.moveTo(x - hw, y + hh - deco);
            g.lineTo(x - hw + deco, y + hh);
            g.stroke();
        }
    }

    // ==================== 数据流 / 矩阵雨 ====================

    static drawDataStreamColumn(
        g: Graphics,
        x: number,
        startY: number,
        length: number,
        charHeight: number,
        color: Color,
        fadeSteps: number = 8
    ): void {
        for (let i = 0; i < fadeSteps; i++) {
            const y = startY - i * charHeight;
            const alpha = Math.floor(255 * (1 - i / fadeSteps));
            const segWidth = 4 + Math.random() * 8;
            const segHeight = 2;

            g.fillColor = new Color(color.r, color.g, color.b, alpha);
            g.rect(x - segWidth / 2, y - segHeight / 2, segWidth, segHeight);
            g.fill();
        }
    }

    // ==================== 符文环 ====================

    static drawRuneCircle(
        g: Graphics,
        cx: number, cy: number,
        radius: number,
        segments: number,
        color: Color,
        runeChars: string = '☰☱☲☳☴☵☶☷'
    ): void {
        // 外环
        g.strokeColor = new Color(color.r, color.g, color.b, 60);
        g.lineWidth = 1;
        g.circle(cx, cy, radius);
        g.stroke();

        // 刻度
        g.strokeColor = new Color(color.r, color.g, color.b, 100);
        g.lineWidth = 1;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const inner = radius * 0.92;
            const outer = radius * (i % (segments / 8) === 0 ? 1.0 : 0.96);
            g.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
            g.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
            g.stroke();
        }

        // 四方位小圆点
        g.fillColor = color;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2 - Math.PI / 2;
            g.circle(cx + Math.cos(angle) * radius * 1.05, cy + Math.sin(angle) * radius * 1.05, 2.5);
            g.fill();
        }
    }

    // ==================== 功德进度条 ====================

    static drawMeritProgressBar(
        g: Graphics,
        x: number, y: number,
        width: number, height: number,
        progress: number,
        bgColor: Color,
        fillColor: Color,
        glowColor: Color
    ): void {
        const r = height / 2;

        // 背景
        g.fillColor = bgColor;
        g.roundRect(x, y, width, height, r);
        g.fill();

        // 填充
        const fillW = width * Math.max(0.01, Math.min(1, progress));
        if (fillW > 0) {
            // 光晕层
            g.fillColor = new Color(glowColor.r, glowColor.g, glowColor.b, 30);
            g.roundRect(x - 2, y - 2, fillW + 4, height + 4, r + 2);
            g.fill();

            // 填充层
            g.fillColor = fillColor;
            g.roundRect(x, y, fillW, height, r);
            g.fill();

            // 顶部高光线
            g.strokeColor = new Color(255, 255, 255, 60);
            g.lineWidth = 1;
            g.moveTo(x + r, y + 2);
            g.lineTo(x + fillW - r, y + 2);
            g.stroke();
        }

        // 外框
        g.strokeColor = new Color(fillColor.r, fillColor.g, fillColor.b, 80);
        g.lineWidth = 1;
        g.roundRect(x, y, width, height, r);
        g.stroke();
    }

    // ==================== 卡牌边框 ====================

    static drawAlmanacCard(
        g: Graphics,
        cx: number, cy: number,
        width: number, height: number,
        unlocked: boolean,
        borderColor: Color,
        bgColor: Color
    ): void {
        const hw = width / 2;
        const hh = height / 2;

        // 背景
        g.fillColor = bgColor;
        g.roundRect(cx - hw, cy - hh, width, height, 6);
        g.fill();

        if (unlocked) {
            // 已解锁：发光边框
            g.strokeColor = borderColor;
            g.lineWidth = 1.5;
            g.roundRect(cx - hw, cy - hh, width, height, 6);
            g.stroke();

            // 角落装饰
            const corner = 6;
            g.strokeColor = new Color(borderColor.r, borderColor.g, borderColor.b, 200);
            g.lineWidth = 2;
            // 左上
            g.moveTo(cx - hw, cy + hh - corner);
            g.lineTo(cx - hw, cy + hh);
            g.lineTo(cx - hw + corner, cy + hh);
            g.stroke();
            // 右下
            g.moveTo(cx + hw, cy - hh + corner);
            g.lineTo(cx + hw, cy - hh);
            g.lineTo(cx + hw - corner, cy - hh);
            g.stroke();
        } else {
            // 未解锁：暗淡虚线
            g.strokeColor = new Color(60, 70, 90, 100);
            g.lineWidth = 1;
            g.roundRect(cx - hw, cy - hh, width, height, 6);
            g.stroke();

            // 锁纹（对角线）
            g.strokeColor = new Color(40, 50, 70, 60);
            g.lineWidth = 0.5;
            for (let d = -width; d < width + height; d += 12) {
                const x1 = cx - hw + Math.max(0, d);
                const y1 = cy - hh + Math.max(0, -d);
                const x2 = cx - hw + Math.min(width, d + height);
                const y2 = cy - hh + Math.min(height, -d + width);
                if (x1 < cx + hw && y1 < cy + hh) {
                    g.moveTo(x1, y1);
                    g.lineTo(x2, y2);
                    g.stroke();
                }
            }
        }
    }

    // ==================== 赛博按钮 ====================

    static drawCyberButton(
        g: Graphics,
        cx: number, cy: number,
        width: number, height: number,
        borderColor: Color,
        bgColor: Color = new Color(15, 25, 50, 200),
        style: 'default' | 'primary' | 'danger' = 'default'
    ): void {
        const hw = width / 2;
        const hh = height / 2;
        const cut = 8;

        // 背景
        g.fillColor = bgColor;
        g.moveTo(cx - hw + cut, cy - hh);
        g.lineTo(cx + hw, cy - hh);
        g.lineTo(cx + hw, cy + hh - cut);
        g.lineTo(cx + hw - cut, cy + hh);
        g.lineTo(cx - hw, cy + hh);
        g.lineTo(cx - hw, cy - hh + cut);
        g.closePath();
        g.fill();

        // 边框
        g.strokeColor = borderColor;
        g.lineWidth = style === 'primary' ? 2 : 1.5;
        g.moveTo(cx - hw + cut, cy - hh);
        g.lineTo(cx + hw, cy - hh);
        g.lineTo(cx + hw, cy + hh - cut);
        g.lineTo(cx + hw - cut, cy + hh);
        g.lineTo(cx - hw, cy + hh);
        g.lineTo(cx - hw, cy - hh + cut);
        g.closePath();
        g.stroke();

        // 顶部高光
        if (style === 'primary') {
            g.strokeColor = new Color(borderColor.r, borderColor.g, borderColor.b, 80);
            g.lineWidth = 1;
            g.moveTo(cx - hw + cut + 5, cy - hh);
            g.lineTo(cx + hw - 5, cy - hh);
            g.stroke();
        }

        // 左下角小三角装饰
        g.fillColor = new Color(borderColor.r, borderColor.g, borderColor.b, 60);
        g.moveTo(cx - hw, cy - hh + cut);
        g.lineTo(cx - hw + cut, cy - hh);
        g.lineTo(cx - hw + cut, cy - hh + cut);
        g.closePath();
        g.fill();
    }

    // ==================== 扫描线效果 ====================

    static drawScanLines(
        g: Graphics,
        x: number, y: number,
        width: number, height: number,
        lineGap: number = 4,
        alpha: number = 15
    ): void {
        g.fillColor = new Color(0, 0, 0, alpha);
        for (let ly = y; ly < y + height; ly += lineGap * 2) {
            g.rect(x, ly, width, lineGap);
            g.fill();
        }
    }

    // ==================== 环形计量表 ====================

    static drawArcMeter(
        g: Graphics,
        cx: number, cy: number,
        radius: number,
        progress: number,
        trackColor: Color,
        fillColor: Color,
        lineWidth: number = 6,
        startAngle: number = Math.PI * 0.75,
        endAngle: number = Math.PI * 2.25
    ): void {
        // 轨道
        g.strokeColor = trackColor;
        g.lineWidth = lineWidth;
        g.arc(cx, cy, radius, startAngle, endAngle, false);
        g.stroke();

        // 填充
        const fillEnd = startAngle + (endAngle - startAngle) * Math.min(1, progress);
        g.strokeColor = fillColor;
        g.lineWidth = lineWidth;
        g.arc(cx, cy, radius, startAngle, fillEnd, false);
        g.stroke();

        // 端点发光
        const endX = cx + Math.cos(fillEnd) * radius;
        const endY = cy + Math.sin(fillEnd) * radius;
        g.fillColor = new Color(fillColor.r, fillColor.g, fillColor.b, 60);
        g.circle(endX, endY, lineWidth);
        g.fill();
        g.fillColor = fillColor;
        g.circle(endX, endY, lineWidth * 0.4);
        g.fill();
    }
}

function textDist(i: number, gap: number, radius: number): number {
    return i * gap + radius * 0.45;
}
