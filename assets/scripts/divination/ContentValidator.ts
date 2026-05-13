export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

const GIBBERISH_PATTERNS = [
    /^[a-zA-Z0-9\s]+$/,                    // 纯英文/数字
    /^(.)\1{3,}/,                           // 重复字符 aaaa
    /^[哈呵嘿嘻哦啊嗯呃]{3,}/,              // 纯语气词
    /^[1-9\s]+$/,                           // 纯数字
    /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+$/, // 纯符号
];

const JOKE_KEYWORDS = [
    '测试', '试试', '随便', '无聊', '好玩', '玩玩',
    '傻逼', '操', '艹', '妈的', '卧槽', '牛逼', '他妈',
    '哈哈哈', '呵呵呵', '嘿嘿嘿',
    '买彩票', '中奖', '彩票号码', '双色球', '大乐透',
    '几点', '天气', '吃什么',
];

const EMOTIONAL_ONLY_PATTERNS = [
    /^(好烦|烦死了|累了|不想|算了|唉|呜呜|难过|伤心|开心|高兴|生气|愤怒){1,3}[啊呀哦嗯吧了的呢]?$/,
    /^我(好|很|真的好|太)(烦|累|难过|伤心|开心|生气)[了啊呀]?$/,
];

export class ContentValidator {

    static validate(input: string): ValidationResult {
        const trimmed = input.trim();

        if (trimmed.length === 0) {
            return { valid: false, reason: '请输入你想问之事' };
        }

        if (trimmed.length < 2) {
            return { valid: false, reason: '请输入正经所求之事，勿戏谑玩笑' };
        }

        if (trimmed.length > 100) {
            return { valid: false, reason: '凝神一事一问，请精简所求' };
        }

        for (const pattern of GIBBERISH_PATTERNS) {
            if (pattern.test(trimmed)) {
                return { valid: false, reason: '请输入正经所求之事，勿戏谑玩笑' };
            }
        }

        const lower = trimmed.toLowerCase();
        for (const keyword of JOKE_KEYWORDS) {
            if (lower.includes(keyword)) {
                return { valid: false, reason: '请输入正经所求之事，勿戏谑玩笑' };
            }
        }

        for (const pattern of EMOTIONAL_ONLY_PATTERNS) {
            if (pattern.test(trimmed)) {
                return { valid: false, reason: '请输入正经所求之事，勿戏谑玩笑' };
            }
        }

        // 至少包含2个中文字符
        const chineseChars = trimmed.match(/[一-龥]/g);
        if (!chineseChars || chineseChars.length < 2) {
            return { valid: false, reason: '请输入正经所求之事，勿戏谑玩笑' };
        }

        return { valid: true };
    }

    static isJokeInput(input: string): boolean {
        return !this.validate(input).valid;
    }
}
