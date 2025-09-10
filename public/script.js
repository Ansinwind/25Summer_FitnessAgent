document.addEventListener('DOMContentLoaded', () => {
    const onboardingModal = document.getElementById('onboarding-modal');
    const userInfoForm = document.getElementById('user-info-form');
    const profileText = document.getElementById('profile-text');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const navButtons = document.querySelectorAll('.nav-btn');
    const contentSlider = document.getElementById('content-slider');

    const goalMap = {
        'weight_loss': '减脂塑形',
        'muscle_gain': '增肌',
        'keep_fit': '保持健康'
    };
    const frequencyMap = {
        '1-2_times_week': '每周1-2次',
        '3-4_times_week': '每周3-4次',
        '5_times_week': '每周5次以上'
    };

    const checkUserProfile = () => {
        const userProfile = localStorage.getItem('userProfile');
        if (!userProfile) {
            onboardingModal.style.display = 'flex';
        } else {
            onboardingModal.style.display = 'none';
            const profile = JSON.parse(userProfile);
            updateProfileDisplay(profile);
            // Mock initial plan for demonstration
            mockFetchInitialPlan(profile);
        }
    };

    const updateProfileDisplay = (profile) => {
        const displayGoal = goalMap[profile.goal] || profile.goal;
        profileText.textContent = `身高: ${profile.height}cm | 体重: ${profile.weight}kg | 目标: ${displayGoal}`;
    };

    userInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userProfile = {
            height: document.getElementById('height').value,
            weight: document.getElementById('weight').value,
            goal: document.getElementById('goal').value,
            frequency: document.getElementById('frequency').value
        };
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        checkUserProfile();
    });

    editProfileBtn.addEventListener('click', () => {
        onboardingModal.style.display = 'flex';
    });
    
    navButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            contentSlider.style.transform = `translateX(-${index * (100 / navButtons.length)}%)`;
        });
    });

    const mockFetchInitialPlan = (profile) => {
        const workoutPlan = {
            "星期一": { title: "胸部 & 三头肌", description: "卧推, 绳索下压, 哑铃飞鸟" },
            "星期二": { title: "休息", description: "轻度拉伸或散步" },
            "星期三": { title: "背部 & 二头肌", description: "引体向上, 杠铃划船, 弯举" },
            "星期四": { title: "休息", description: "保证充足睡眠" },
            "星期五": { title: "腿部 & 肩部", description: "深蹲, 腿举, 推举" },
            "星期六": { title: "有氧运动", description: "跑步或游泳30分钟" },
            "星期日": { title: "休息", description: "放松和恢复" }
        };
        const dietPlan = {
            breakfast: "燕麦片，鸡蛋，一杯牛奶",
            lunch: "鸡胸肉沙拉，糙米饭",
            dinner: "烤三文鱼，蒸蔬菜"
        };
        renderWorkoutCalendar(workoutPlan);
        renderDietRecommendation(dietPlan);
    };

    const renderWorkoutCalendar = (plan) => {
        const calendarEl = document.getElementById('workout-calendar');
        let html = '<h3>本周锻炼日历</h3><ul>';
        for (const [day, workout] of Object.entries(plan)) {
            html += `<li><strong>${day}:</strong> ${workout.title} <br> <small>${workout.description}</small></li>`;
        }
        html += '</ul>';
        calendarEl.innerHTML = html;
    };
    
    const renderDietRecommendation = (plan) => {
        const dietEl = document.getElementById('diet-recommendation');
        let html = '<h3>今日饮食建议</h3>';
        html += `<p><strong>早餐:</strong> ${plan.breakfast}</p>`;
        html += `<p><strong>午餐:</strong> ${plan.lunch}</p>`;
        html += `<p><strong>晚餐:</strong> ${plan.dinner}</p>`;
        dietEl.innerHTML = html;
    };

    const initMap = () => {
        try {
            const map = L.map('map').setView([39.9042, 116.4074], 13); // 默认北京
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);
        } catch(e) {
            console.error("Map initialization failed:", e);
            document.getElementById('map').innerHTML = "地图加载失败。";
        }
    };

    // --- 运动医疗咨询聊天功能 ---
    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');

    const appendMessage = (message, sender) => {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        messageElement.textContent = message;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const handleSendMessage = async () => {
        const userMessage = chatInput.value.trim();
        if (userMessage === '') return;

        appendMessage(userMessage, 'user');
        chatInput.value = '';

        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'chat-message ai-message';
        thinkingElement.textContent = 'AI 正在思考中...';
        chatBox.appendChild(thinkingElement);
        chatBox.scrollTop = chatBox.scrollHeight;

        // 从localStorage获取用户资料以提供上下文
        const userProfileString = localStorage.getItem('userProfile');
        const userProfile = userProfileString ? JSON.parse(userProfileString) : {};
        const displayGoal = goalMap[userProfile.goal] || '未指定';
        const profileContext = `用户的基本信息是：身高 ${userProfile.height || '未知'}cm, 体重 ${userProfile.weight || '未知'}kg, 健身目标是 ${displayGoal}.`;
        
        const systemPrompt = `你是一名专业的运动医疗顾问和健身教练。请根据用户的健康信息和问题，提供专业、简洁、安全的建议。${profileContext} 请用中文回答。`;
        const userQuery = userMessage;
        const apiKey = ""; 

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API 请求失败，状态码: ${response.status}`);
            }

            const result = await response.json();
            
            chatBox.removeChild(thinkingElement);

            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
                const aiResponse = result.candidates[0].content.parts[0].text;
                appendMessage(aiResponse, 'ai');
            } else {
                 appendMessage('抱歉，我暂时无法生成回复，请检查请求或稍后再试。', 'ai');
            }
        } catch (error) {
            console.error('聊天功能出错:', error);
            chatBox.removeChild(thinkingElement);
            appendMessage('抱歉，我遇到了一点问题，无法连接到服务。请检查您的网络连接或稍后再试。', 'ai');
        }
    };

    sendChatBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSendMessage();
        }
    });

    // --- 初始化页面 ---
    checkUserProfile();
    initMap();
});