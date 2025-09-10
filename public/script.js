document.addEventListener('DOMContentLoaded', () => {
    // --- 元素获取 ---
    const onboardingModal = document.getElementById('onboarding-modal');
    const userInfoForm = document.getElementById('user-info-form');
    const planRequestModal = document.getElementById('plan-request-modal'); // 新增
    const planRequestForm = document.getElementById('plan-request-form'); // 新增
    const profileText = document.getElementById('profile-text');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const navButtons = document.querySelectorAll('.nav-btn');
    const contentSlider = document.getElementById('content-slider');
    const generateRouteBtn = document.getElementById('generate-route-btn'); // 新增
    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');

    // --- 数据映射 ---
    const goalMap = {
        'weight_loss': '减脂塑形',
        'muscle_gain': '增肌',
        'keep_fit': '保持健康'
    };

    // --- 功能函数 ---

    // 检查用户资料是否存在
    const checkUserProfile = () => {
        const userProfile = localStorage.getItem('userProfile');
        if (!userProfile) {
            onboardingModal.style.display = 'flex';
        } else {
            onboardingModal.style.display = 'none';
            planRequestModal.style.display = 'none';
            const profile = JSON.parse(userProfile);
            updateProfileDisplay(profile);
            // 如果已有计划，可以从localStorage加载，这里为简化，每次都显示模拟数据
            mockFetchInitialPlan();
        }
    };

    // 更新顶部显示的用户信息
    const updateProfileDisplay = (profile) => {
        const displayGoal = goalMap[profile.goal] || profile.goal;
        profileText.textContent = `身高: ${profile.height}cm | 体重: ${profile.weight}kg | 目标: ${displayGoal}`;
    };

    // 渲染锻炼日历
    const renderWorkoutCalendar = (content) => {
        const calendarEl = document.getElementById('workout-calendar');
        // 现在可以直接渲染AI返回的字符串
        calendarEl.innerHTML = `<h3>本周锻炼日历</h3>${content}`;
    };
    
    // 渲染饮食建议
    const renderDietRecommendation = (content) => {
        const dietEl = document.getElementById('diet-recommendation');
        // 现在可以直接渲染AI返回的字符串
        dietEl.innerHTML = `<h3>今日饮食建议</h3>${content}`;
    };

    // 初始化地图
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

    // --- 生成健身饮食计划 ---
    const generatePlanWithAI = async (userProfile, customRequest) => {
        renderWorkoutCalendar("AI正在为您生成锻炼计划...");
        renderDietRecommendation("AI正在为您生成饮食建议...");

        try {
            const response = await fetch('http://localhost:3000/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    condition: "A",
                    userProfile,
                    customRequest
                })
            });
            const result = await response.json();
            if (result && result.text) {
                const html = result.text;
                const workoutPart = html.substring(html.indexOf("<h4>锻炼计划"), html.indexOf("<h4>饮食建议"));
                const dietPart = html.substring(html.indexOf("<h4>饮食建议"));
                renderWorkoutCalendar(workoutPart);
                renderDietRecommendation(dietPart);
            } else {
                renderWorkoutCalendar("<p style='color:red;'>未能获取有效计划。</p>");
                renderDietRecommendation("");
            }
        } catch (error) {
            console.error("AI plan generation failed:", error);
            renderWorkoutCalendar("<p style='color:red;'>计划生成失败，请稍后再试。</p>");
            renderDietRecommendation("");
        }
    };

    // --- 生成锻炼路线描述 ---
    const generateRouteWithAI = async () => {
        const routeRequestInput = document.getElementById("route-request-input");
        const routeDescriptionEl = document.getElementById("route-description");
        const userRequest = routeRequestInput.value.trim();

        if (userRequest === "") {
            routeDescriptionEl.innerHTML = '<p style="color:orange;">请输入您的路线需求。</p>';
            return;
        }

        routeDescriptionEl.innerHTML = "AI正在规划路线...";

        try {
            const response = await fetch('http://localhost:3000/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    condition: "B",
                    customRequest: userRequest
                })
            });
            const result = await response.json();
            let aiText = "";
            if (result && result.text) {
                aiText = result.text;
            } else {
                aiText = '<p style="color:red;">未能获取有效的AI回复。</p>';
            }
            if (window.marked) {
                routeDescriptionEl.innerHTML = marked.parse(aiText);
            } else {
                routeDescriptionEl.innerHTML = aiText;
            }
        } catch (error) {
            console.error("AI route generation failed:", error);
            routeDescriptionEl.innerHTML = '<p style="color:red;">路线生成失败，请稍后再试。</p>';
        }
    };

    // --- 运动医疗咨询 ---
    const sendMessageToAI = async (userMessage) => {
        appendMessage(userMessage, 'user');
        chatInput.value = '';

        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'chat-message ai-message';
        thinkingElement.textContent = 'AI 正在思考中...';
        chatBox.appendChild(thinkingElement);
        chatBox.scrollTop = chatBox.scrollHeight;

        // 用户资料上下文
        const userProfileString = localStorage.getItem('userProfile');
        const userProfile = userProfileString ? JSON.parse(userProfileString) : {};
        const displayGoal = goalMap[userProfile.goal] || '未指定';
        const profileContext = `用户的基本信息是：身高 ${userProfile.height || '未知'}cm, 体重 ${userProfile.weight || '未知'}kg, 健身目标是 ${displayGoal}.`;

        // 系统提示
        const systemPrompt = `你是一位资深的运动康复专家，拥有丰富的运动医学、运动生理学和康复治疗知识。你的专长在于通过症状分析判断运动损伤，并提供科学的恢复建议。${profileContext} 请用中文回答。`;

        try {
            const response = await fetch('http://localhost:3000/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    condition: "C",
                    userMessage,
                    systemPrompt
                })
            });

            chatBox.removeChild(thinkingElement);

            const result = await response.json();
            if (result && result.text) {
                appendMessage(result.text, 'ai');
            } else {
                appendMessage('抱歉，AI未返回有效内容。', 'ai');
            }
        } catch (error) {
            console.error('聊天功能出错:', error);
            chatBox.removeChild(thinkingElement);
            appendMessage(`抱歉，连接服务时出错：${error.message}`, 'ai');
        }
    };

    const appendMessage = (message, sender) => {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        messageElement.textContent = message;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    };
    
    // --- 事件监听器 ---

    // 提交基本信息表单
    userInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userProfile = {
            height: document.getElementById('height').value,
            weight: document.getElementById('weight').value,
            goal: document.getElementById('goal').value,
            frequency: document.getElementById('frequency').value
        };
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        onboardingModal.style.display = 'none';
        planRequestModal.style.display = 'flex'; // 显示第二个模态框
        updateProfileDisplay(userProfile);
    });

    // 提交个性化需求表单
    planRequestForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const customRequest = document.getElementById('custom-plan-request').value;
        const userProfile = JSON.parse(localStorage.getItem('userProfile'));
        planRequestModal.style.display = 'none';
        generatePlanWithAI(userProfile, customRequest); // 调用AI生成计划
    });
    
    // 编辑按钮
    editProfileBtn.addEventListener('click', () => {
        onboardingModal.style.display = 'flex';
    });
    
    // 导航按钮切换
    navButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            contentSlider.style.transform = `translateX(-${index * (100 / navButtons.length)}%)`;
        });
    });

    // 生成路线按钮
    generateRouteBtn.addEventListener('click', generateRouteWithAI);

    // 聊天发送按钮
    sendChatBtn.addEventListener('click', () => sendMessageToAI(chatInput.value.trim()));
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessageToAI(chatInput.value.trim());
        }
    });

    // --- 初始化 ---
    checkUserProfile();
    initMap();
    
    // （旧的模拟数据函数，可保留作为备用）
    const mockFetchInitialPlan = () => {
        const workoutPlan = `<ul>
            <li><strong>星期一:</strong> 胸部 & 三头肌 <br> <small>卧推, 绳索下压, 哑铃飞鸟</small></li>
            <li><strong>星期二:</strong> 休息 <br> <small>轻度拉伸或散步</small></li>
            <li><strong>星期三:</strong> 背部 & 二头肌 <br> <small>引体向上, 杠铃划船, 弯举</small></li>
            ...
        </ul>`;
        const dietPlan = `<p><strong>早餐:</strong> 燕麦片，鸡蛋，一杯牛奶</p>
                          <p><strong>午餐:</strong> 鸡胸肉沙拉，糙米饭</p>
                          <p><strong>晚餐:</strong> 烤三文鱼，蒸蔬菜</p>`;
        renderWorkoutCalendar(workoutPlan);
        renderDietRecommendation(dietPlan);
    };
});