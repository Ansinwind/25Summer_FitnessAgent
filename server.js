require('dotenv').config();
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
 * @route POST /api/dispatch
 * @desc 根据condition分发到不同AI接口
 */
app.post('/api/dispatch', async (req, res) => {
    const { prompt, condition, userProfile, customRequest, userMessage, systemPrompt } = req.body;

    try {
        if (condition === 'A') {
            // 健身饮食计划
            // 构造prompt
            const displayGoal = userProfile?.goal === 'muscle_gain' ? '增肌' : '减脂';
            const planPrompt = prompt || `
                你是一个专业的健身教练和营养师。请为以下用户制定一个为期一周的健身和饮食计划。
                用户信息：
                - 身高: ${userProfile?.height} cm
                - 体重: ${userProfile?.weight} kg
                - 目标: ${displayGoal}
                - 锻炼频率: ${userProfile?.frequency === '3_times_week' ? '每周3-4次' : '每周1-2次'}
                个性化需求: "${customRequest || '无特殊要求'}"
                请以HTML格式返回，锻炼和饮食建议分开。
            `;
            // 调用工作流API
            const apiKey = process.env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY;
            const appId = process.env.DASHSCOPE_APP_ID || process.env.PLAN_APP_ID;
            const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;
            const data = {
                input: { prompt: planPrompt, condition: "A" },
                parameters: {},
                debug: {}
            };
            const response = await axios.post(url, data, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.json({ text: response.data.output.text });

        } else if (condition === 'B') {
            // 路线规划
            const routePrompt = prompt || `作为一名本地运动向导，请根据以下需求，为我生成一段吸引人的锻炼路线文字描述。需求: "${customRequest}" 请提供路线的大致位置、长度、特点（例如风景、路况、适合时间等）。`;
            const apiKey = process.env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY;
            const appId = process.env.DASHSCOPE_APP_ID || process.env.ROUTE_APP_ID;
            const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;
            const data = {
                input: { prompt: routePrompt, condition: "B" },
                parameters: {},
                debug: {}
            };
            const response = await axios.post(url, data, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.json({ text: response.data.output.text });

        } else if (condition === 'C') {
            // 运动医疗咨询
            const consultPrompt = prompt || `${systemPrompt || ''}\n${userMessage || ''}`;
            const apiKey = process.env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY;
            const appId = process.env.DASHSCOPE_APP_ID || process.env.PORT_APP_ID;
            const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;
            const data = {
                input: { prompt: consultPrompt, condition: "C" },
                parameters: {},
                debug: {}
            };
            const response = await axios.post(url, data, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.json({ text: response.data.output.text });

        } else {
            return res.status(400).json({ error: 'Invalid condition' });
        }
    } catch (error) {
        console.error('Dispatch API error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// 其他API路由，如医疗咨询、路线记录等，可以类似地添加

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});