const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios'); // 用于调用外部API

const app = express();
const PORT = 3000;

// --- 中间件 ---
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 托管前端文件

// --- 数据库连接 (示例) ---
// mongoose.connect('mongodb://localhost:27017/fitnessAgent')
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.error(err));
// Mongoose Schema 和 Model 定义会在这里...

// --- API 路由 ---

/**
 * @route POST /api/user
 * @desc 创建或更新用户信息 (这里简化为仅打印)
 */
app.post('/api/user', (req, res) => {
    console.log('Received user profile:', req.body);
    // 在真实项目中，这里会存入数据库
    res.status(201).json({ message: 'User profile saved' });
});


/**
 * @route POST /api/generate-plan
 * @desc 调用百炼API生成计划
 */
app.post('/api/generate-plan', async (req, res) => {
    const userProfile = req.body;
    
    // 1. 构建发送给百炼API的Prompt
    const prompt = `
        你是一个专业的健身教练和营养师。请为以下用户制定一个为期一周的健身和饮食计划。
        用户信息：
        - 身高: ${userProfile.height} cm
        - 体重: ${user.profile.weight} kg
        - 目标: ${userProfile.goal === 'muscle_gain' ? '增肌' : '减脂'}
        - 锻炼频率: ${userProfile.frequency === '3_times_week' ? '每周3-4次' : '每周1-2次'}

        请以JSON格式返回，包含两个主键: "workoutPlan" 和 "dietPlan"。
        "workoutPlan" 应包含周一到周日的每日锻炼安排，如果某天是休息日，请注明。
        "dietPlan" 应包含推荐的早、中、晚餐。
    `;
    
    console.log("Sending prompt to Bailian API:", prompt);
    
    try {
        // 2. 调用百炼API (这里是模拟调用)
        // const bailianResponse = await axios.post('https://bailian.api.aliyun.com/...', {
        //     appId: 'YOUR_APP_ID',
        //     prompt: prompt
        // }, {
        //     headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
        // });
        // const planData = bailianResponse.data; // 假设返回的是JSON

        // --- MOCK DATA (模拟百炼API返回) ---
        // 在真实环境中，你会解析真实的API响应
        const mockPlanData = {
            workoutPlan: {
                "星期一": { title: "胸部与三头肌", description: "杠铃卧推, 哑铃飞鸟, 绳索下压" },
                "星期二": { title: "休息日", description: "轻度拉伸或散步" },
                "星期三": { title: "背部与二头肌", description: "引体向上, 杠铃划船, 哑铃弯举" },
                "星期四": { title: "休息日", description: "轻度拉伸或散步" },
                "星期五": { title: "腿部与肩部", description: "深蹲, 腿举, 哑铃推举" },
                "星期六": { title: "有氧运动", description: "跑步或游泳30分钟" },
                "星期日": { title: "休息日", description: "完全休息" },
            },
            dietPlan: {
                breakfast: "燕麦粥，一个鸡蛋，一杯牛奶",
                lunch: "鸡胸肉沙拉，一份糙米饭",
                dinner: "清蒸鱼，炒时蔬，少量红薯"
            }
        };
        // ------------------------------------
        
        // 3. (可选) 根据计划内容，调用其他API获取图片/视频
        // 例如，根据"杠铃卧推"去WGER API查询图片

        res.json(mockPlanData);

    } catch (error) {
        console.error("Error calling Bailian API:", error);
        res.status(500).json({ error: "Failed to generate plan" });
    }
});

/**
 * @route POST /api/consult
 * @desc 代理 DashScope 运动医疗咨询接口，格式参考官方示例
 */
app.post('/api/consult', async (req, res) => {
    // 推荐用环境变量存储敏感信息
    const apiKey = process.env.DASHSCOPE_API_KEY || 'sk-7c7502b929b74ebab83df17102d277c8'; // 可直接写死测试
    const appId = process.env.DASHSCOPE_APP_ID || '31a3841a6db6402da1b066231595f912'; // 替换为实际应用ID

    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

    // 前端传来的内容直接作为 prompt
    const userMessage = req.body.userMessage || '';
    const systemPrompt = req.body.systemPrompt || '';

    const data = {
        input: {
            prompt: `${systemPrompt}\n${userMessage}`
        },
        parameters: {},
        debug: {}
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            res.json({ text: response.data.output.text });
        } else {
            res.status(response.status).json({
                request_id: response.headers['request_id'],
                code: response.status,
                message: response.data.message
            });
        }
    } catch (error) {
        console.error(`Error calling DashScope: ${error.message}`);
        if (error.response) {
            res.status(error.response.status).json({
                error: error.message,
                data: error.response.data
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// 其他API路由，如医疗咨询、路线记录等，可以类似地添加

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});