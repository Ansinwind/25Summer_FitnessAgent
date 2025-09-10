// 智能健身计划 - JavaScript功能文件（增强版）

// 全局变量
let currentDate = new Date();
let selectedGoal = 'strength';
let isDarkMode = false;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    initializeTheme();
    initializeCalendar();
    initializeGoalButtons();
    initializeWorkoutTimer();
    initializeProgressCharts();
    initializeModal();
    initializeAnimations();
    initializeAPIStatusCheck();
}

// 主题切换功能
function initializeTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // 检查本地存储的主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        updateTheme();
    }
    
    themeToggle.addEventListener('click', function() {
        isDarkMode = !isDarkMode;
        updateTheme();
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

function updateTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if (isDarkMode) {
        body.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun';
    } else {
        body.removeAttribute('data-theme');
        themeIcon.className = 'fas fa-moon';
    }
}

// 日历功能
function initializeCalendar() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const currentMonthEl = document.querySelector('.current-month');
    
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', function() {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateCalendar();
        });
        
        nextBtn.addEventListener('click', function() {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateCalendar();
        });
        
        updateCalendar();
    }
}

function updateCalendar() {
    const currentMonthEl = document.querySelector('.current-month');
    const calendarDays = document.getElementById('calendar-days');
    
    if (currentMonthEl) {
        // 更新月份显示
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', 
                           '7月', '8月', '9月', '10月', '11月', '12月'];
        currentMonthEl.textContent = `${currentDate.getFullYear()}年${monthNames[currentDate.getMonth()]}`;
    }
    
    // 生成日历
    generateCalendarDays();
}

function generateCalendarDays() {
    const calendarDays = document.getElementById('calendar-days');
    if (!calendarDays) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // 清空日历
    calendarDays.innerHTML = '';
    
    // 添加上个月的日期（空白）
    for (let i = 0; i < firstDayWeek; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        calendarDays.appendChild(dayEl);
    }
    
    // 添加当月日期
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        
        // 标记今天
        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayEl.classList.add('today');
        }
        
        // 随机标记有训练的日子
        if (Math.random() > 0.6) {
            dayEl.classList.add('has-workout');
        }
        
        // 添加点击事件
        dayEl.addEventListener('click', function() {
            selectCalendarDay(dayEl, day);
        });
        
        calendarDays.appendChild(dayEl);
    }
}

function selectCalendarDay(dayEl, day) {
    // 移除其他选中状态
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 添加选中状态
    dayEl.classList.add('selected');
    
    // 显示该日的训练计划
    showDayWorkout(day);
}

function showDayWorkout(day) {
    // 这里可以显示选中日期的训练计划
    console.log(`显示 ${day} 日的训练计划`);
}

// 训练目标选择
function initializeGoalButtons() {
    const goalButtons = document.querySelectorAll('.goal-btn');
    
    goalButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除其他按钮的active状态
            goalButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加当前按钮的active状态
            this.classList.add('active');
            
            // 更新选中的目标
            selectedGoal = this.dataset.goal;
            
            // 添加动画效果
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// AI训练计划生成（增强版）
function generateWorkoutPlan() {
    const generateBtn = document.querySelector('.generate-btn');
    const originalText = generateBtn.innerHTML;
    
    // 收集表单数据
    const formData = collectFormData();
    
    // 验证表单数据
    if (!validateFormData(formData)) {
        return;
    }
    
    // 显示加载状态
    generateBtn.innerHTML = '<div class="loading"></div> 生成中...';
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    
    // 调用AI API
    callAIAPI(formData)
        .then(result => {
            // 恢复按钮状态
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
            generateBtn.classList.remove('loading');
            
            // 显示生成结果
            showGeneratedPlan(result);
            
            // 添加成功动画
            generateBtn.classList.add('success');
            setTimeout(() => {
                generateBtn.classList.remove('success');
            }, 2000);
        })
        .catch(error => {
            // 恢复按钮状态
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
            generateBtn.classList.remove('loading');
            
            // 显示错误状态
            generateBtn.classList.add('error');
            showNotification('生成失败: ' + error.message, 'error');
            
            setTimeout(() => {
                generateBtn.classList.remove('error');
            }, 3000);
        });
}

// 收集表单数据
function collectFormData() {
    const goal = document.querySelector('.goal-btn.active')?.dataset.goal || 'strength';
    const duration = document.querySelector('.form-select')?.value || '45';
    const intensity = document.querySelectorAll('.form-select')[1]?.value || 'intermediate';
    const description = document.querySelector('.form-textarea')?.value || '';
    const equipment = Array.from(document.querySelectorAll('.equipment-checkbox input:checked')).map(cb => cb.value);
    const apiKey = document.getElementById('api-key')?.value || '';
    const aiModel = document.getElementById('ai-model')?.value || 'gpt-4';
    
    return {
        goal,
        duration,
        intensity,
        description,
        equipment,
        apiKey,
        aiModel
    };
}

// 验证表单数据
function validateFormData(data) {
    if (!data.description.trim()) {
        showNotification('请填写个人描述', 'error');
        return false;
    }
    
    if (data.equipment.length === 0) {
        showNotification('请至少选择一种训练设备', 'error');
        return false;
    }
    
    return true;
}

// 调用AI API
async function callAIAPI(formData) {
    const prompt = generatePrompt(formData);
    
    // 如果有API Key，使用真实的OpenAI API
    if (formData.apiKey) {
        return await callOpenAIAPI(prompt, formData.apiKey, formData.aiModel);
    } else {
        // 否则使用模拟API
        return await callMockAPI(prompt, formData);
    }
}

// 生成AI提示词
function generatePrompt(data) {
    const goalMap = {
        'strength': '增肌塑形',
        'cardio': '有氧减脂',
        'flexibility': '柔韧性训练',
        'endurance': '耐力提升'
    };
    
    const intensityMap = {
        'beginner': '初级',
        'intermediate': '中级',
        'advanced': '高级'
    };
    
    const equipmentMap = {
        'bodyweight': '自重训练',
        'dumbbells': '哑铃',
        'barbell': '杠铃',
        'resistance-bands': '弹力带',
        'gym': '健身房设备'
    };
    
    return `请为我制定一个${goalMap[data.goal]}的训练计划。

训练要求：
- 训练时长：${data.duration}分钟
- 训练强度：${intensityMap[data.intensity]}
- 可用设备：${data.equipment.map(eq => equipmentMap[eq]).join('、')}
- 个人情况：${data.description}

请提供详细的训练计划，包括：
1. 热身运动（5-10分钟）
2. 主要训练动作（每个动作包含组数、次数、休息时间）
3. 拉伸放松（5-10分钟）
4. 训练注意事项
5. 营养建议

请用中文回答，格式清晰，便于执行。`;
}

// 调用真实的OpenAI API
async function callOpenAIAPI(prompt, apiKey, model) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业的健身教练，擅长制定个性化的训练计划。请根据用户的需求提供科学、安全、有效的训练方案。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
            content: data.choices[0].message.content,
            model: model,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`OpenAI API调用失败: ${error.message}`);
    }
}

// 模拟API调用
async function callMockAPI(prompt, formData) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 根据用户输入生成模拟的训练计划
    const mockPlan = generateMockPlan(formData);
    
    return {
        content: mockPlan,
        model: 'Mock AI',
        timestamp: new Date().toISOString()
    };
}

// 生成模拟训练计划
function generateMockPlan(data) {
    const goalMap = {
        'strength': '增肌塑形',
        'cardio': '有氧减脂',
        'flexibility': '柔韧性训练',
        'endurance': '耐力提升'
    };
    
    const intensityMap = {
        'beginner': '初级',
        'intermediate': '中级',
        'advanced': '高级'
    };
    
    const equipmentMap = {
        'bodyweight': '自重训练',
        'dumbbells': '哑铃',
        'barbell': '杠铃',
        'resistance-bands': '弹力带',
        'gym': '健身房设备'
    };
    
    const goal = goalMap[data.goal];
    const intensity = intensityMap[data.intensity];
    const equipment = data.equipment.map(eq => equipmentMap[eq]).join('、');
    
    return ` ${goal}训练计划 (${data.duration}分钟)

 训练信息：
 目标：${goal}
 强度：${intensity}
 设备：${equipment}
 个人情况：${data.description}

 热身运动 (5-10分钟)
1. 关节活动 - 2分钟
    颈部、肩部、腰部、膝盖、脚踝各方向活动
2. 动态拉伸 - 3分钟
    手臂环绕、腿部摆动、腰部扭转
3. 轻度有氧 - 5分钟
    原地踏步、高抬腿、开合跳

 主要训练 (${data.duration - 20}分钟)
${generateMainExercises(data)}

 拉伸放松 (10分钟)
1. 静态拉伸 - 每个动作保持30秒
    胸部拉伸、肩部拉伸、腿部拉伸
2. 深呼吸放松 - 2分钟
    腹式呼吸，全身放松

 注意事项：
 训练前确保充分热身
 动作标准比重量更重要
 如有不适立即停止
 保持充足的水分补充
 循序渐进，不要急于求成

 营养建议：
 训练前1小时：少量碳水化合物
 训练后30分钟内：蛋白质+碳水化合物
 全天充足饮水：2-3升
 均衡饮食，避免过度节食

 个性化建议：
根据您的描述"${data.description}"，建议重点关注动作的标准性和安全性。${intensity === '初级' ? '作为初学者，建议从基础动作开始，逐步提高强度。' : intensity === '中级' ? '作为中级训练者，可以适当增加训练强度和复杂度。' : '作为高级训练者，可以挑战更高难度的动作和组合。'}

记住：坚持比完美更重要！加油！`;
}

// 生成主要训练动作
function generateMainExercises(data) {
    const exercises = {
        'strength': {
            'bodyweight': [
                '1. 俯卧撑 - 3组  8-15次',
                '2. 深蹲 - 3组  12-20次',
                '3. 平板支撑 - 3组  30-60秒',
                '4. 引体向上 - 3组  5-12次',
                '5. 单腿深蹲 - 2组  8-12次/腿'
            ],
            'dumbbells': [
                '1. 哑铃卧推 - 3组  8-12次',
                '2. 哑铃深蹲 - 3组  10-15次',
                '3. 哑铃划船 - 3组  8-12次',
                '4. 哑铃肩推 - 3组  8-12次',
                '5. 哑铃弯举 - 3组  10-15次'
            ]
        },
        'cardio': {
            'bodyweight': [
                '1. 开合跳 - 3组  30秒',
                '2. 高抬腿 - 3组  30秒',
                '3. 波比跳 - 3组  8-15次',
                '4. 登山者 - 3组  30秒',
                '5. 跳跃深蹲 - 3组  10-15次'
            ]
        }
    };
    
    const goalExercises = exercises[data.goal] || exercises['strength'];
    const equipmentExercises = goalExercises[data.equipment[0]] || goalExercises['bodyweight'];
    
    return equipmentExercises.join('\n   ');
}

function showGeneratedPlan(result) {
    // 显示生成结果区域
    const resultSection = document.getElementById('generation-result');
    const resultContent = document.getElementById('result-content');
    const generationTime = document.getElementById('generation-time');
    const aiModelUsed = document.getElementById('ai-model-used');
    const goalUsed = document.getElementById('goal-used');
    
    if (resultSection && resultContent) {
        // 更新内容
        resultContent.textContent = result.content;
        
        if (generationTime) {
            generationTime.textContent = new Date(result.timestamp).toLocaleString('zh-CN');
        }
        
        if (aiModelUsed) {
            aiModelUsed.textContent = result.model;
        }
        
        // 获取当前选中的目标
        const activeGoal = document.querySelector('.goal-btn.active');
        const goalText = activeGoal ? activeGoal.querySelector('span').textContent : '未知';
        
        if (goalUsed) {
            goalUsed.textContent = goalText;
        }
        
        // 显示结果区域
        resultSection.classList.add('show');
        
        // 滚动到结果区域
        resultSection.scrollIntoView({ behavior: 'smooth' });
        
        // 显示成功通知
        showNotification('AI训练计划已生成！', 'success');
        
        // 初始化复制功能
        initializeCopyFunction();
    }
}

// 初始化复制功能
function initializeCopyFunction() {
    const copyBtn = document.getElementById('copy-result');
    const resultContent = document.getElementById('result-content');
    
    if (copyBtn && resultContent) {
        copyBtn.addEventListener('click', function() {
            const text = resultContent.textContent;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    showNotification('训练计划已复制到剪贴板！', 'success');
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> 复制计划';
                    }, 2000);
                }).catch(err => {
                    console.error('复制失败:', err);
                    showNotification('复制失败，请手动选择复制', 'error');
                });
            } else {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    showNotification('训练计划已复制到剪贴板！', 'success');
                } catch (err) {
                    showNotification('复制失败，请手动选择复制', 'error');
                }
                document.body.removeChild(textArea);
            }
        });
    }
}

// API状态检查
function checkAPIStatus() {
    const apiKey = document.getElementById('api-key');
    if (!apiKey) return;
    
    const apiStatus = document.querySelector('.api-status') || createAPIStatusElement();
    
    if (apiKey.value) {
        // 简单的API Key格式验证
        if (apiKey.value.startsWith('sk-') && apiKey.value.length > 20) {
            apiStatus.className = 'api-status connected';
            apiStatus.innerHTML = '<i class="fas fa-check-circle"></i> API Key 已配置';
        } else {
            apiStatus.className = 'api-status error';
            apiStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> API Key 格式错误';
        }
    } else {
        apiStatus.className = 'api-status disconnected';
        apiStatus.innerHTML = '<i class="fas fa-info-circle"></i> 将使用模拟AI生成';
    }
}

// 创建API状态元素
function createAPIStatusElement() {
    const apiConfig = document.querySelector('.api-config');
    if (!apiConfig) return null;
    
    const statusElement = document.createElement('div');
    statusElement.className = 'api-status disconnected';
    statusElement.innerHTML = '<i class="fas fa-info-circle"></i> 将使用模拟AI生成';
    apiConfig.appendChild(statusElement);
    return statusElement;
}

// 初始化API状态检查
function initializeAPIStatusCheck() {
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', checkAPIStatus);
        // 初始检查
        checkAPIStatus();
    }
}

// 训练计时器
function initializeWorkoutTimer() {
    const workoutTimer = document.querySelector('.workout-timer');
    
    if (workoutTimer) {
        workoutTimer.addEventListener('click', function() {
            startWorkoutTimer();
        });
    }
}

function startWorkoutTimer() {
    // 这里可以实现训练计时器功能
    console.log('开始训练计时');
    showNotification('训练计时器已启动！', 'info');
}

// 动作演示模态框
function initializeModal() {
    const modal = document.getElementById('demo-modal');
    const closeBtn = document.querySelector('.close-btn');
    const demoButtons = document.querySelectorAll('.demo-btn');
    
    if (modal && closeBtn) {
        // 关闭模态框
        closeBtn.addEventListener('click', function() {
            closeModal();
        });
        
        // 点击背景关闭模态框
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
            }
        });
    }
    
    // 打开模态框
    demoButtons.forEach(button => {
        button.addEventListener('click', function() {
            openModal();
        });
    });
}

function openModal() {
    const modal = document.getElementById('demo-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('demo-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// 进度图表
function initializeProgressCharts() {
    // 训练频率图表
    const frequencyChart = document.getElementById('frequency-chart');
    if (frequencyChart) {
        drawFrequencyChart(frequencyChart);
    }
    
    // 卡路里消耗图表
    const caloriesChart = document.getElementById('calories-chart');
    if (caloriesChart) {
        drawCaloriesChart(caloriesChart);
    }
}

function drawFrequencyChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // 模拟数据
    const data = [3, 5, 4, 6, 7, 4, 5];
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    // 绘制简单的柱状图
    const barWidth = width / data.length * 0.8;
    const maxValue = Math.max(...data);
    
    ctx.fillStyle = '#FF6B35';
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * (height - 40);
        const x = (index * width / data.length) + (width / data.length - barWidth) / 2;
        const y = height - barHeight - 20;
        
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 绘制数值
        ctx.fillStyle = '#1A1A1A';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + barWidth / 2, y - 5);
        ctx.fillStyle = '#FF6B35';
    });
}

function drawCaloriesChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // 模拟数据
    const data = [200, 350, 280, 420, 380, 300, 250];
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    // 绘制简单的折线图
    const maxValue = Math.max(...data);
    const pointSpacing = width / (data.length - 1);
    
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = index * pointSpacing;
        const y = height - 20 - (value / maxValue) * (height - 40);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        // 绘制数据点
        ctx.fillStyle = '#4A90E2';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
    });
    
    ctx.stroke();
}

// 动画效果
function initializeAnimations() {
    // 添加页面加载动画
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            section.style.transition = 'all 0.6s ease-out';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, index * 200);
    });
    
    // 添加悬停动画
    const cards = document.querySelectorAll('.stat-item, .workout-item, .goal-btn');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

// 通知系统
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-color);
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
    `;
    
    // 根据类型设置颜色
    if (type === 'success') {
        notification.style.borderLeft = '4px solid var(--primary-green)';
    } else if (type === 'error') {
        notification.style.borderLeft = '4px solid #EF4444';
    } else {
        notification.style.borderLeft = '4px solid var(--primary-orange)';
    }
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 完成训练项目
function completeExercise(button) {
    const workoutItem = button.closest('.workout-item');
    const exerciseName = workoutItem.querySelector('h3').textContent;
    
    // 添加完成动画
    button.innerHTML = '<i class="fas fa-check"></i> 已完成';
    button.style.background = 'var(--primary-green)';
    button.disabled = true;
    
    // 更新进度
    updateProgress();
    
    // 显示完成通知
    showNotification(`${exerciseName} 已完成！`, 'success');
    
    // 添加完成效果
    workoutItem.style.opacity = '0.7';
    workoutItem.style.transform = 'scale(0.98)';
}

// 更新进度
function updateProgress() {
    const completedExercises = document.querySelectorAll('.complete-btn[disabled]').length;
    const totalExercises = document.querySelectorAll('.complete-btn').length;
    const progress = (completedExercises / totalExercises) * 100;
    
    // 更新进度条
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
    
    // 如果全部完成，显示庆祝效果
    if (completedExercises === totalExercises) {
        showNotification('恭喜！今日训练计划全部完成！', 'success');
        celebrateCompletion();
    }
}

// 庆祝完成效果
function celebrateCompletion() {
    // 创建彩带效果
    for (let i = 0; i < 50; i++) {
        createConfetti();
    }
}

function createConfetti() {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${['#FF6B35', '#4A90E2', '#7ED321'][Math.floor(Math.random() * 3)]};
        top: -10px;
        left: ${Math.random() * 100}%;
        z-index: 4000;
        animation: confetti-fall 3s linear forwards;
    `;
    
    // 添加动画样式
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes confetti-fall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(confetti);
    
    // 清理
    setTimeout(() => {
        if (confetti.parentNode) {
            confetti.parentNode.removeChild(confetti);
        }
    }, 3000);
}

// 绑定完成按钮事件
document.addEventListener('click', function(e) {
    if (e.target.closest('.complete-btn') && !e.target.closest('.complete-btn').disabled) {
        completeExercise(e.target.closest('.complete-btn'));
    }
});

// 绑定生成按钮事件
document.addEventListener('click', function(e) {
    if (e.target.closest('.generate-btn')) {
        generateWorkoutPlan();
    }
});

// 时间过滤器
function initializeTimeFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除其他按钮的active状态
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加当前按钮的active状态
            this.classList.add('active');
            
            // 更新图表
            const filter = this.textContent;
            updateCharts(filter);
        });
    });
}

function updateCharts(filter) {
    // 根据时间过滤器更新图表数据
    console.log(`更新图表数据: ${filter}`);
    
    // 重新绘制图表
    const frequencyChart = document.getElementById('frequency-chart');
    const caloriesChart = document.getElementById('calories-chart');
    
    if (frequencyChart) {
        drawFrequencyChart(frequencyChart);
    }
    if (caloriesChart) {
        drawCaloriesChart(caloriesChart);
    }
}

// 初始化时间过滤器
document.addEventListener('DOMContentLoaded', function() {
    initializeTimeFilter();
});

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter 生成训练计划
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateWorkoutPlan();
    }
    
    // 空格键开始/暂停训练
    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        startWorkoutTimer();
    }
});

// 性能优化：防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 响应式处理
function handleResize() {
    // 重新绘制图表以适应新尺寸
    const frequencyChart = document.getElementById('frequency-chart');
    const caloriesChart = document.getElementById('calories-chart');
    
    if (frequencyChart) {
        drawFrequencyChart(frequencyChart);
    }
    if (caloriesChart) {
        drawCaloriesChart(caloriesChart);
    }
}

// 监听窗口大小变化
window.addEventListener('resize', debounce(handleResize, 250));

// 导出功能（如果需要）
function exportWorkoutPlan() {
    const workoutData = {
        date: currentDate.toISOString(),
        goal: selectedGoal,
        exercises: Array.from(document.querySelectorAll('.workout-item')).map(item => ({
            name: item.querySelector('h3').textContent,
            sets: item.querySelector('p').textContent,
            completed: item.querySelector('.complete-btn').disabled
        }))
    };
    
    const dataStr = JSON.stringify(workoutData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `workout-plan-${currentDate.toISOString().split('T')[0]}.json`;
    link.click();
}

console.log('智能健身计划模块已加载完成！');
