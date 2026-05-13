const STOP_WORDS = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
    '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那',
    '被', '从', '把', '让', '给', '向', '对', '又', '还', '能', '可以',
    '吗', '呢', '吧', '啊', '哦', '嗯', '呀', '么', '什么', '怎么',
    '为什么', '哪', '哪里', '谁', '多少', '几', '如何', '怎样',
    '这个', '那个', '这些', '那些', '哪个', '哪些',
    '想', '请', '问', '请问', '想问', '想知道',
    '能不能', '会不会', '是不是', '可不可以', '有没有',
    '应该', '可能', '大概', '或者', '以及', '而且', '但是', '虽然',
    '所以', '因为', '如果', '那么', '这样', '那样',
]);

// 同义词映射（将变体归一到统一关键词）
const SYNONYM_MAP: Record<string, string> = {
    '成功': '成', '顺利': '成', '能成': '成', '会成': '成',
    '赚钱': '财', '发财': '财', '收入': '财', '工资': '财', '薪资': '财', '挣钱': '财',
    '恋爱': '感情', '爱情': '感情', '对象': '感情', '男朋友': '感情', '女朋友': '感情',
    '结婚': '婚姻', '婚事': '婚姻', '嫁': '婚姻', '娶': '婚姻',
    '工作': '事业', '职业': '事业', '上班': '事业', '就业': '事业', '找工作': '事业',
    '考试': '考', '考研': '考', '考公': '考', '考证': '考', '高考': '考',
    '生病': '健康', '身体': '健康', '治病': '健康', '病': '健康',
    '旅行': '出行', '出差': '出行', '旅游': '出行', '去': '出行',
    '搬家': '迁', '搬迁': '迁', '换房': '迁',
    '分手': '离', '离婚': '离', '离开': '离',
};

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    count: number;       // 同题出现次数（含当前）
    similarity: number;  // 最高相似度
    matchedQuestion?: string;
}

export class DuplicateDetector {

    static extractKeywords(text: string): string[] {
        // 移除标点
        const cleaned = text.replace(/[，。！？、；：""''（）《》【】\s,.!?;:'"()\[\]{}<>]/g, ' ');
        // 按空格和常见分隔切分
        const segments = cleaned.split(/\s+/).filter(s => s.length > 0);

        // 简单的前向最大匹配（对短句够用）
        const keywords: string[] = [];
        for (const seg of segments) {
            let i = 0;
            while (i < seg.length) {
                let matched = false;
                // 尝试匹配最长的同义词
                for (let len = Math.min(4, seg.length - i); len >= 2; len--) {
                    const sub = seg.substring(i, i + len);
                    if (SYNONYM_MAP[sub]) {
                        keywords.push(SYNONYM_MAP[sub]);
                        i += len;
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    // 取2字词
                    if (i + 2 <= seg.length) {
                        const word = seg.substring(i, i + 2);
                        if (!STOP_WORDS.has(word)) {
                            const normalized = SYNONYM_MAP[word] || word;
                            keywords.push(normalized);
                        }
                        i += 2;
                    } else {
                        const ch = seg[i];
                        if (!STOP_WORDS.has(ch) && ch.trim()) {
                            keywords.push(ch);
                        }
                        i++;
                    }
                }
            }
        }
        return [...new Set(keywords)];
    }

    static jaccardSimilarity(setA: string[], setB: string[]): number {
        const a = new Set(setA);
        const b = new Set(setB);
        let intersection = 0;
        for (const item of a) {
            if (b.has(item)) intersection++;
        }
        const union = new Set([...a, ...b]).size;
        if (union === 0) return 0;
        return intersection / union;
    }

    static checkDuplicate(
        currentKeywords: string[],
        recentQuestions: { text: string; keywords: string[]; timestamp: number }[],
        threshold: number = 0.6
    ): DuplicateCheckResult {
        let maxSim = 0;
        let matchCount = 0;
        let matchedQ: string | undefined;

        for (const q of recentQuestions) {
            const sim = this.jaccardSimilarity(currentKeywords, q.keywords);
            if (sim >= threshold) {
                matchCount++;
                if (sim > maxSim) {
                    maxSim = sim;
                    matchedQ = q.text;
                }
            }
        }

        return {
            isDuplicate: matchCount > 0,
            count: matchCount + 1, // 含当前这次
            similarity: maxSim,
            matchedQuestion: matchedQ,
        };
    }
}
