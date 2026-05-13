import { StorageManager } from '../core/StorageManager';
import { MeritSystem } from '../core/MeritSystem';
import { HexagramGenerator, DivinationResult } from '../divination/HexagramGenerator';
import { HexagramDatabase } from '../data/HexagramDatabase';

export interface DebateTopic {
    id: string;
    question: string;          // 匿名事件描述
    timestamp: number;
    status: 'open' | 'voting' | 'closed';
    interpretations: DebateEntry[];
    votes: { entryId: string; count: number }[];
    winnerId?: string;
}

export interface DebateEntry {
    id: string;
    topicId: string;
    authorName: string;
    result: DivinationResult;
    hexagramIndex: number;
    hexagramName: string;
    interpretation: string;    // 玩家写的解读
    timestamp: number;
    voteCount: number;
}

// 预设的匿名问卦题库（用于本地模拟）
const TOPIC_POOL: string[] = [
    '想换工作但当前公司还算稳定，是否该跳槽？',
    '暗恋的人似乎对我也有好感，要不要表白？',
    '打算创业做自媒体，时机是否成熟？',
    '准备考研，不确定能否考上，是否该全力以赴？',
    '家人催婚压力大，是否该妥协相亲？',
    '投资了一个项目，最近有亏损迹象，是否该止损？',
    '收到两个offer，大厂稳定 vs 创业公司期权，如何选？',
    '朋友借钱不还，要不要撕破脸催还？',
    '孩子想出国留学，经济上有压力，是否该支持？',
    '身体出了小毛病，总拖着不去医院，该去检查吗？',
    '租约到期，是续租还是买房？手上首付刚好够。',
    '和合伙人理念不合，是否该散伙单干？',
];

export class DebateSystem {
    private static _instance: DebateSystem;
    private _topics: DebateTopic[] = [];
    private _myEntries: DebateEntry[] = [];

    static get instance(): DebateSystem {
        if (!this._instance) this._instance = new DebateSystem();
        return this._instance;
    }

    init(): void {
        this._topics = StorageManager.instance.get<DebateTopic[]>('debateTopics', []) ?? [];
        this._myEntries = StorageManager.instance.get<DebateEntry[]>('debateMyEntries', []) ?? [];

        // 确保有可参与的话题
        if (this.getOpenTopics().length === 0) {
            this.generateNewTopic();
        }
    }

    get topics(): DebateTopic[] {
        return this._topics;
    }

    getOpenTopics(): DebateTopic[] {
        return this._topics.filter(t => t.status === 'open');
    }

    getVotingTopics(): DebateTopic[] {
        return this._topics.filter(t => t.status === 'voting');
    }

    getClosedTopics(): DebateTopic[] {
        return this._topics.filter(t => t.status === 'closed');
    }

    // 生成新的讨论话题
    generateNewTopic(): DebateTopic {
        const question = TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)];
        const topic: DebateTopic = {
            id: `topic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            question,
            timestamp: Date.now(),
            status: 'open',
            interpretations: [],
            votes: [],
        };

        this._topics.unshift(topic);
        if (this._topics.length > 20) {
            this._topics = this._topics.slice(0, 20);
        }

        // 自动生成1-2个AI对手的解读
        this.addAIInterpretation(topic);

        this.save();
        return topic;
    }

    // 玩家提交解读
    submitInterpretation(topicId: string, authorName: string, interpretation: string): DebateEntry | null {
        const topic = this._topics.find(t => t.id === topicId);
        if (!topic || topic.status !== 'open') return null;

        // 先摇一卦
        const result = HexagramGenerator.castHexagram();
        const hexData = HexagramDatabase.getByIndex(result.originalIndex);

        const entry: DebateEntry = {
            id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            topicId,
            authorName,
            result,
            hexagramIndex: result.originalIndex,
            hexagramName: hexData.fullName,
            interpretation,
            timestamp: Date.now(),
            voteCount: 0,
        };

        topic.interpretations.push(entry);
        this._myEntries.push(entry);

        // 提交后进入投票阶段
        if (topic.interpretations.length >= 2) {
            topic.status = 'voting';
            topic.votes = topic.interpretations.map(e => ({ entryId: e.id, count: 0 }));
            // 模拟AI投票（延迟结算）
            this.simulateVoting(topic);
        }

        this.save();
        return entry;
    }

    // 玩家投票
    vote(topicId: string, entryId: string): boolean {
        const topic = this._topics.find(t => t.id === topicId);
        if (!topic || topic.status !== 'voting') return false;

        const voteEntry = topic.votes.find(v => v.entryId === entryId);
        if (!voteEntry) return false;

        voteEntry.count++;
        this.save();
        return true;
    }

    // 结算话题
    settleTopic(topicId: string): void {
        const topic = this._topics.find(t => t.id === topicId);
        if (!topic || topic.status !== 'voting') return;

        topic.status = 'closed';

        // 找出赢家
        const sorted = [...topic.votes].sort((a, b) => b.count - a.count);
        if (sorted.length > 0) {
            topic.winnerId = sorted[0].entryId;

            // 如果赢家是玩家，给功德
            const myEntry = this._myEntries.find(e => e.id === topic.winnerId);
            if (myEntry) {
                MeritSystem.instance.addMerit(50, '论卦胜出，众道友认可，功德+50');
            }
        }

        this.save();
    }

    private addAIInterpretation(topic: DebateTopic): void {
        const result = HexagramGenerator.castHexagram();
        const hexData = HexagramDatabase.getByIndex(result.originalIndex);

        const aiNames = ['清虚道人', '玄机子', '太乙散人', '紫微真君', '无名居士', '青莲道长'];
        const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];

        // AI根据卦象生成解读
        const interpretation = this.generateAIInterpretation(hexData, topic.question);

        const entry: DebateEntry = {
            id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            topicId: topic.id,
            authorName: aiName,
            result,
            hexagramIndex: result.originalIndex,
            hexagramName: hexData.fullName,
            interpretation,
            timestamp: Date.now(),
            voteCount: 0,
        };

        topic.interpretations.push(entry);
    }

    private generateAIInterpretation(hexData: any, question: string): string {
        const templates = [
            `摇得${hexData.fullName}，${hexData.layer1_overview}以此观之，${hexData.nature.includes('吉') ? '事可为，宜把握时机' : '时机未到，宜再观望'}。`,
            `得${hexData.name}卦，${hexData.nature}之象。${hexData.layer3_advice}`,
            `此事问得${hexData.fullName}。${hexData.layer2_detail}综合来看，${hexData.nature.includes('凶') ? '不宜冒进，守中为上' : '可以进取，但需循序渐进'}。`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    private simulateVoting(topic: DebateTopic): void {
        // 模拟3-8票的AI投票
        const totalVotes = 3 + Math.floor(Math.random() * 6);
        for (let i = 0; i < totalVotes; i++) {
            const randomEntry = topic.votes[Math.floor(Math.random() * topic.votes.length)];
            if (randomEntry) randomEntry.count++;
        }

        // 24小时后自动结算（用标记代替真实定时器）
        topic.status = 'voting';
    }

    // 检查是否有需要结算的话题
    checkSettlement(): void {
        const now = Date.now();
        for (const topic of this._topics) {
            if (topic.status === 'voting') {
                const elapsed = now - topic.timestamp;
                if (elapsed > 24 * 3600 * 1000) {
                    this.settleTopic(topic.id);
                }
            }
        }
    }

    private save(): void {
        StorageManager.instance.set('debateTopics', this._topics);
        StorageManager.instance.set('debateMyEntries', this._myEntries);
    }
}
