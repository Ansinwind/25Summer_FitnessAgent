// 计划页功能
class PlanPage {
    constructor() {
        this.calendarYear = new Date().getFullYear();
        this.calendarMonth = new Date().getMonth(); // 0-11
        this.lastParsedPlan = null; // 最近一次解析后的 JSON
        this.metrics = this.loadMetrics();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderMonthlyCalendar(this.calendarYear, this.calendarMonth, this.lastParsedPlan);

        // 预置欢迎语
        const planChatBox = document.getElementById('plan-chat-box');
        if (planChatBox && !planChatBox.dataset.prefilled) {
            CommonUtils.appendChatMessage(planChatBox, '你好，我可以为你制定个人锻炼和饮食计划，还可以为你生成相应日历哦，快告诉我你的需求吧！', 'ai');
            planChatBox.dataset.prefilled = '1';
        }

        // 恢复已采用的计划
        try {
            const adopted = localStorage.getItem('adoptedPlan');
            if (adopted) {
                const parsed = JSON.parse(adopted);
                this.lastParsedPlan = parsed;
                this.renderMonthlyCalendar(this.calendarYear, this.calendarMonth, this.lastParsedPlan);
                this.renderDietFromJson(parsed);
            }
        } catch {}

        // 初始化图表
        this.initStatsChart();
        this.renderStats('weight_bmi');
    }

    bindEvents() {
        // 计划聊天发送
        const planChatSend = document.getElementById('plan-chat-send');
        const planChatInput = document.getElementById('plan-chat-input');
        
        if (planChatSend) {
            planChatSend.addEventListener('click', () => this.handlePlanChatSend());
        }
        if (planChatInput) {
            planChatInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.handlePlanChatSend();
                }
            });
        }

        // 月份切换按钮
        const prevBtn = document.getElementById('prev-month-btn');
        const nextBtn = document.getElementById('next-month-btn');
        
        if (prevBtn) {
            prevBtn.onclick = () => {
                this.calendarMonth -= 1;
                if (this.calendarMonth < 0) { 
                    this.calendarMonth = 11; 
                    this.calendarYear -= 1; 
                }
                this.renderMonthlyCalendar(this.calendarYear, this.calendarMonth, this.lastParsedPlan);
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                this.calendarMonth += 1;
                if (this.calendarMonth > 11) { 
                    this.calendarMonth = 0; 
                    this.calendarYear += 1; 
                }
                this.renderMonthlyCalendar(this.calendarYear, this.calendarMonth, this.lastParsedPlan);
            };
        }

        // 编辑按钮
        const editProfileBtn = document.getElementById('edit-profile-btn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                const homeBtn = document.querySelector('.nav-btn[data-target="home"]');
                if (homeBtn) homeBtn.click();
            });
        }

        // 用户信息表单
        const homeForm = document.getElementById('home-user-info-form');
        if (homeForm) {
            homeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const userProfile = {
                    height: document.getElementById('home-height').value,
                    weight: document.getElementById('home-weight').value,
                    goal: document.getElementById('home-goal').value,
                    frequency: document.getElementById('home-frequency').value
                };
                localStorage.setItem('userProfile', JSON.stringify(userProfile));
                CommonUtils.updateProfileDisplay(userProfile);
                const planBtn = document.querySelector('.nav-btn[data-target="plan"]');
                if (planBtn) planBtn.click();
            });
        }

        // 图表切换
        const statsTabs = document.querySelectorAll('.stats-tab');
        statsTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                statsTabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const metric = btn.getAttribute('data-metric');
                this.renderStats(metric);
            });
        });

        // 录入表单
        const metricsForm = document.getElementById('metrics-form');
        if (metricsForm) {
            metricsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const date = document.getElementById('metrics-date').value;
                const weight = parseFloat(document.getElementById('metrics-weight').value);
                if (!date || !weight) return;
                const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                const h = profile.height ? Number(profile.height) / 100 : null;
                const bmi = h ? +(weight / (h * h)).toFixed(2) : null;
                this.metrics.entries.push({ date, weight, bmi });
                this.metrics.entries.sort((a,b) => new Date(a.date) - new Date(b.date));
                this.saveMetrics();
                const activeMetric = document.querySelector('.stats-tab.active')?.getAttribute('data-metric') || 'weight_bmi';
                this.renderStats(activeMetric);
            });
        }
    }

    loadMetrics() {
        try {
            const raw = localStorage.getItem('metrics');
            const parsed = raw ? JSON.parse(raw) : { entries: [] };
            if (!Array.isArray(parsed.entries)) parsed.entries = [];
            return parsed;
        } catch { return { entries: [] }; }
    }
    saveMetrics() {
        try { localStorage.setItem('metrics', JSON.stringify(this.metrics)); } catch {}
    }

    initStatsChart() {
        const ctx = document.getElementById('planStatsChart');
        if (!ctx || !window.Chart) return;
        const grid = '#2a2c31';
        const font = '#a8a8a8';
        this.statsChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: grid }, ticks: { color: font } },
                    y: { grid: { color: grid }, ticks: { color: font } }
                },
                plugins: { legend: { labels: { color: font } } }
            }
        });
    }

    renderStats(metric) {
        if (!this.statsChart) return;
        const entries = this.metrics.entries || [];
        if (metric === 'weight_bmi') {
            const labels = entries.map(e => e.date);
            const w = entries.map(e => e.weight);
            const b = entries.map(e => e.bmi);
            this.statsChart.data.labels = labels;
            this.statsChart.data.datasets = [
                { label: '体重(kg)', data: w, borderColor: '#ff7a00', backgroundColor: 'rgba(255,122,0,0.2)', tension: 0.3 },
                { label: 'BMI', data: b, borderColor: '#4dd0e1', backgroundColor: 'rgba(77,208,225,0.2)', tension: 0.3 }
            ];
        } else if (metric === 'weekly_completed') {
            const completed = JSON.parse(localStorage.getItem('completedDays') || '{}');
            const map = new Map();
            Object.keys(completed).forEach(label => {
                const d = new Date(`${new Date().getFullYear()}/${label}`);
                const key = `${d.getFullYear()}-W${this.getWeekNumber(d)}`;
                map.set(key, (map.get(key) || 0) + 1);
            });
            const keys = Array.from(map.keys()).sort().slice(-8);
            const vals = keys.map(k => map.get(k));
            this.statsChart.data.labels = keys;
            this.statsChart.data.datasets = [
                { label: '每周完成天数', data: vals, borderColor: '#ff7a00', backgroundColor: 'rgba(255,122,0,0.25)', tension: 0.3 }
            ];
        } else if (metric === 'monthly_sessions') {
            const completed = JSON.parse(localStorage.getItem('completedDays') || '{}');
            const today = new Date();
            const labels = [];
            const vals = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const label = `${d.getMonth() + 1}/${d.getDate()}`;
                labels.push(label);
                vals.push(completed[label] ? 1 : 0);
            }
            this.statsChart.data.labels = labels;
            this.statsChart.data.datasets = [
                { label: '每日是否完成', data: vals, borderColor: '#ff7a00', backgroundColor: 'rgba(255,122,0,0.25)', stepped: true }
            ];
        }
        this.statsChart.update();
    }

    getWeekNumber(d) {
        const onejan = new Date(d.getFullYear(),0,1);
        return Math.ceil((((d - onejan) / 86400000) + onejan.getDay()+1)/7);
    }

    // 中文星期转索引（支持多种格式）
    zhWeekToIndex(dayName) {
        const map = { 
            '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6,
            '星期天': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6
        };
        const cleaned = String(dayName || '').trim();
        
        // 直接匹配
        if (map.hasOwnProperty(cleaned)) return map[cleaned];
        
        // 处理 "周四 & 周日" 这种格式，取第一个
        if (cleaned.includes('&')) {
            const firstDay = cleaned.split('&')[0].trim();
            if (map.hasOwnProperty(firstDay)) return map[firstDay];
        }
        
        // 处理 "周四 周日" 这种格式，取第一个
        if (cleaned.includes(' ')) {
            const firstDay = cleaned.split(' ')[0].trim();
            if (map.hasOwnProperty(firstDay)) return map[firstDay];
        }
        
        return null;
    }

    // 构建训练星期集合
    buildTrainingWeekdaySet(parsed) {
        const set = new Set();
        const list = parsed && parsed.workoutPlan && Array.isArray(parsed.workoutPlan.trainingDays)
            ? parsed.workoutPlan.trainingDays : [];
        list.forEach(d => {
            const idx = this.zhWeekToIndex(d.dayName);
            if (idx !== null && idx !== undefined) set.add(idx);
        });
        return set;
    }

    // 根据星期查找训练日
    findDayPlanByWeekday(parsed, weekdayIndex) {
        const list = parsed && parsed.workoutPlan && Array.isArray(parsed.workoutPlan.trainingDays)
            ? parsed.workoutPlan.trainingDays : [];
        for (const d of list) {
            if (this.zhWeekToIndex(d.dayName) === weekdayIndex) return d;
        }
        return null;
    }

    // 格式化日期标签
    formatDateLabel(y, m, day) {
        const mm = m + 1;
        return `${mm}/${day}`;
    }

    // 渲染月历
    renderMonthlyCalendar(year, month, parsed) {
        const calendarEl = document.getElementById('plan-calendar');
        const titleEl = document.getElementById('calendar-title');
        if (!calendarEl || !titleEl) return;
        
        const weekDays = ['日','一','二','三','四','五','六'];
        const firstDay = new Date(year, month, 1);
        const startWeekday = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const trainingWeekdays = this.buildTrainingWeekdaySet(parsed || this.lastParsedPlan || {});

        titleEl.textContent = `${year}年 ${month + 1}月`;

        let html = '';
        for (let i = 0; i < 7; i++) {
            html += `<div style='font-weight:bold;color:#888;'>${weekDays[i]}</div>`;
        }
        for (let i = 0; i < startWeekday; i++) html += `<div></div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const w = dateObj.getDay();
            const label = this.formatDateLabel(year, month, d);
            const hasPlan = trainingWeekdays.has(w);
            const classes = ['calendar-day'];
            if (hasPlan) classes.push('has-plan');
            html += `<div class='${classes.join(' ')}' data-date='${label}' data-w='${w}'>${d}</div>`;
        }
        const totalCells = 7 + startWeekday + daysInMonth;
        const rows = Math.ceil((totalCells - 7) / 7);
        const cellsToFill = rows < 6 ? (6 - rows) * 7 : 0;
        for (let i = 0; i < cellsToFill; i++) html += `<div></div>`;

        calendarEl.innerHTML = html;

        // 点击事件
        calendarEl.onclick = (e) => {
            const cell = e.target.closest('.calendar-day');
            if (!cell) return;
            calendarEl.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('active'));
            cell.classList.add('active');
            const w = Number(cell.getAttribute('data-w'));
            const dateLabel = cell.getAttribute('data-date');
            const dayPlan = this.findDayPlanByWeekday(this.lastParsedPlan || parsed || {}, w);
            if (dayPlan) {
                const dayCopy = { ...dayPlan, date: dateLabel };
                this.renderSelectedDayDetail(dayCopy);
            } else {
                this.renderSelectedDayDetail({ date: dateLabel, exercises: [] });
            }
        };

        // 高亮历史已完成
        try {
            const key = 'completedDays';
            const store = JSON.parse(localStorage.getItem(key) || '{}');
            Object.keys(store || {}).forEach(label => {
                if (!store[label]) return;
                const cell = calendarEl.querySelector(`.calendar-day[data-date='${label}']`);
                cell && cell.classList.add('completed');
            });
        } catch {}
    }

    // 渲染选中日期详情
    renderSelectedDayDetail(dayPlan) {
        const container = document.getElementById('plan-day-detail');
        if (!container) return;
        let html = '';
        const dayLabel = dayPlan.date || dayPlan.dayName || '';
        html += `<div class='plan-card' style='margin-bottom:12px;'>`;
        html += `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;'>
                    <div style='font-weight:bold;'>${dayLabel}${dayPlan.title ? `｜${dayPlan.title}` : ''}</div>
                    <button class='complete-btn' id='mark-complete-btn'>已完成</button>
                 </div>`;
        if (Array.isArray(dayPlan.exercises) && dayPlan.exercises.length > 0) {
            dayPlan.exercises.forEach(ex => {
                html += `<div style='display:flex;gap:12px;align-items:flex-start;margin-bottom:8px;'>` +
                        `<div style='min-width:120px;'>${ex.gifUrl ? `<img src='${ex.gifUrl}' style='max-width:120px;border-radius:8px;'>` : ''}</div>` +
                        `<div>` +
                            `<div><strong>${ex.name || ''}</strong></div>` +
                            `<div style='color:#555;'>组数: ${ex.sets || '-'}，次数: ${ex.reps || '-'}</div>` +
                            `${ex.notes ? `<div style='color:#777;'>备注: ${ex.notes}</div>` : ''}` +
                        `</div>` +
                    `</div>`;
            });
        } else {
            html += `<div style='color:#777;'>暂无训练日数据。</div>`;
        }
        html += `</div>`;
        container.innerHTML = html;

        const completeBtn = document.getElementById('mark-complete-btn');
        if (completeBtn) {
            completeBtn.onclick = () => {
                try {
                    const key = 'completedDays';
                    const store = JSON.parse(localStorage.getItem(key) || '{}');
                    const label = dayPlan.date || dayPlan.dayName || '';
                    store[label] = true;
                    localStorage.setItem(key, JSON.stringify(store));

                    const calendarEl = document.getElementById('plan-calendar');
                    if (calendarEl) {
                        const active = calendarEl.querySelector('.calendar-day.active');
                        active && active.classList.add('completed');
                    }
                    alert('已标记为完成');
                } catch {}
            };
        }
    }

    // 渲染饮食建议
    renderDietFromJson(parsed) {
        const planSummaryEl = document.getElementById('plan-summary');
        if (!planSummaryEl) return;
        const diet = parsed && parsed.dietPlan ? parsed.dietPlan : null;
        if (!diet) return;
        
        let dietHtml = '<h3>饮食建议</h3>';
        
        // 每日热量
        if (diet.dailyCalories) {
            dietHtml += `<div class='plan-card'><strong>每日热量</strong><br>${diet.dailyCalories}</div>`;
        }
        
        // 餐食列表
        if (Array.isArray(diet.meals) && diet.meals.length) {
            diet.meals.forEach(meal => {
                dietHtml += `<div class='plan-card meal-card' data-meal='${meal.mealName || meal.name || "餐食"}'>`;
                dietHtml += `<div style='font-weight:bold;margin-bottom:8px;'>${meal.mealName || meal.name || '餐食'}`;
                if (meal.timing) {
                    dietHtml += ` <span style='color:#666;font-size:14px;'>(${meal.timing})</span>`;
                }
                dietHtml += `</div>`;
                
                if (Array.isArray(meal.foodItems) && meal.foodItems.length) {
                    meal.foodItems.forEach(item => {
                        dietHtml += `<div style='margin:6px 0;padding:6px 10px;background: var(--elevated-bg);border-radius:8px;color: var(--text-color);'>`;
                        dietHtml += `<strong>${item.name}</strong>`;
                        if (item.details) {
                            dietHtml += ` - ${item.details}`;
                        }
                        dietHtml += `</div>`;
                    });
                }
                // 预留营养扇形图容器
                dietHtml += `<div class='meal-pie' style='display:none;'>
                                <canvas></canvas>
                             </div>`;
                dietHtml += `</div>`;
            });
        }
        
        // 注意事项（如果有）
        if (Array.isArray(diet.notes) && diet.notes.length) {
            dietHtml += `<div class='plan-card'><strong>注意事项</strong><ul style='margin:6px 0 0 18px;'>` + diet.notes.map(n => `<li>${n}</li>`).join('') + `</ul></div>`;
        }
        
        planSummaryEl.innerHTML = dietHtml; // 使用 = 而不是 +=，避免重复添加

        // 采用/取消 控件
        const controls = document.createElement('div');
        controls.className = 'adopt-controls';
        controls.innerHTML = `
            <button class='adopt-btn' id='adopt-plan-btn'>采用</button>
            <button class='cancel-btn' id='cancel-plan-btn'>取消</button>
        `;
        planSummaryEl.appendChild(controls);

        const adoptBtn = document.getElementById('adopt-plan-btn');
        const cancelBtn = document.getElementById('cancel-plan-btn');
        adoptBtn && (adoptBtn.onclick = () => {
            try {
                localStorage.setItem('adoptedPlan', JSON.stringify(this.lastParsedPlan || parsed || {}));
                alert('已采用该计划');
            } catch {}
        });
        cancelBtn && (cancelBtn.onclick = () => {
            localStorage.removeItem('adoptedPlan');
            alert('已取消，未保存该计划');
        });

        // 绑定餐食悬停，显示营养扇形图
        const mealCards = planSummaryEl.querySelectorAll('.meal-card');
        mealCards.forEach((card, idx) => {
            const titleEl = card.querySelector('div');
            const pieWrap = card.querySelector('.meal-pie');
            const canvas = pieWrap ? pieWrap.querySelector('canvas') : null;
            let pieChart = null;
            const meal = (diet.meals || [])[idx] || {};
            const nutrients = Array.isArray(meal.nutrients) ? meal.nutrients : [];
            const labels = nutrients.map(n => n.name);
            const values = nutrients.map(n => Number(String(n.details).replace(/[^\d.]/g,'') || 0));

            const showPie = () => {
                if (!window.Chart || !canvas || labels.length === 0) return;
                pieWrap.style.display = 'block';
                if (!pieChart) {
                    pieChart = new Chart(canvas, {
                        type: 'pie',
                        data: {
                            labels,
                            datasets: [{
                                data: values,
                                backgroundColor: ['#ff7a00','#4dd0e1','#8e44ad','#2ecc71','#f1c40f','#e67e22','#e74c3c'],
                                borderColor: '#141416'
                            }]
                        },
                        options: {
                            animation: { animateScale: true, animateRotate: true },
                            plugins: {
                                legend: { labels: { color: '#e6e6e6' } },
                                datalabels: {
                                    color: '#000',
                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                    borderRadius: 4,
                                    padding: 4,
                                    formatter: (value, ctx) => {
                                        const label = ctx.chart.data.labels[ctx.dataIndex] || '';
                                        return `${label}: ${value}`;
                                    }
                                }
                            }
                        }
                    });
                } else {
                    // 触发一次更新以播放动画
                    pieChart.destroy();
                    pieChart = new Chart(canvas, {
                        type: 'pie',
                        data: { labels, datasets: [{ data: values, backgroundColor: ['#ff7a00','#4dd0e1','#8e44ad','#2ecc71','#f1c40f','#e67e22','#e74c3c'], borderColor: '#141416' }] },
                        options: {
                            animation: { animateScale: true, animateRotate: true },
                            plugins: { legend: { labels: { color: '#e6e6e6' } }, datalabels: { color: '#000', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 4, padding: 4, formatter: (v,ctx)=>`${ctx.chart.data.labels[ctx.dataIndex]}: ${v}` } }
                        }
                    });
                }
            };
            const hidePie = () => {
                if (pieWrap) pieWrap.style.display = 'none';
            };

            card.addEventListener('mouseenter', () => {
                console.log('[diet] hover meal:', meal.mealName || meal.name, nutrients);
                showPie();
            });
            card.addEventListener('mouseleave', hidePie);
        });
    }

    // 计划聊天发送处理
    async handlePlanChatSend() {
        const planChatInput = document.getElementById('plan-chat-input');
        const planChatBox = document.getElementById('plan-chat-box');
        const customRequest = planChatInput.value.trim();
        
        if (!customRequest) return;
        
        CommonUtils.appendChatMessage(planChatBox, customRequest, 'user');
        planChatInput.value = '';
        const thinking = CommonUtils.appendChatMessage(planChatBox, 'AI 正在思考中...', 'ai');
        
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        
        try {
            const aiResult = await CommonUtils.apiCall('http://localhost:3000/api/dispatch', {
                condition: "A",
                userProfile,
                customRequest
            });
            
            console.log('[plan] A分支完整返回:', aiResult); // 调试用
            
            if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
            
            if (aiResult && (aiResult.json || aiResult.text)) {
                if (aiResult.text) {
                    try {
                        CommonUtils.appendChatMessage(planChatBox, aiResult.text, 'ai');
                    } catch {
                        const div = document.createElement('div');
                        div.className = 'chat-message ai-message';
                        div.textContent = aiResult.text;
                        planChatBox.appendChild(div);
                    }
                    console.log('[plan] ai text length =', aiResult.textLength);
                }
                
                const parsed = aiResult.json || {};
                console.log('[plan] 解析的JSON数据:', parsed);
                console.log('[plan] JSON数据键名:', Object.keys(parsed));
                console.log('[plan] workoutPlan存在:', !!parsed.workoutPlan);
                console.log('[plan] dietPlan存在:', !!parsed.dietPlan);
                
                // 检查JSON数据格式
                if (parsed.workoutPlan && parsed.dietPlan) {
                    console.log('[plan] 检测到有效的workoutPlan和dietPlan');
                    
                    // 遍历训练日，补充 GIF
                    if (parsed.workoutPlan.trainingDays && Array.isArray(parsed.workoutPlan.trainingDays)) {
                        console.log('[plan] 开始为训练动作获取GIF...');
                        // 已移除 ExerciseDB 依赖，不再获取 GIF
                        console.log('[plan] GIF获取完成');
                    }
                    
                    // 保存并渲染月历高亮
                    this.lastParsedPlan = parsed;
                    this.renderMonthlyCalendar(this.calendarYear, this.calendarMonth, this.lastParsedPlan);
                    
                    // 饮食建议渲染
                    this.renderDietFromJson(parsed);
                    
                    // 默认选中当月当天
                    const calendarEl = document.getElementById('plan-calendar');
                    if (calendarEl) {
                        const today = new Date();
                        const sameMonth = (today.getFullYear() === this.calendarYear && today.getMonth() === this.calendarMonth);
                        let targetCell = null;
                        if (sameMonth) {
                            const w = today.getDay();
                            const label = `${this.calendarMonth + 1}/${today.getDate()}`;
                            targetCell = calendarEl.querySelector(`.calendar-day.has-plan[data-w='${w}'][data-date='${label}']`);
                        }
                        if (!targetCell) targetCell = calendarEl.querySelector('.calendar-day.has-plan');
                        if (targetCell) targetCell.click();
                    }
                } else {
                    console.log('[plan] JSON数据格式不正确，缺少workoutPlan或dietPlan');
                    console.log('[plan] 尝试降级处理...');
                    
                    // 降级处理：即使格式不完全正确，也尝试渲染可用数据
                    if (parsed.workoutPlan || parsed.dietPlan) {
                        console.log('[plan] 检测到部分有效数据，进行降级渲染');
                        this.lastParsedPlan = parsed;
                        this.renderMonthlyCalendar(this.calendarYear, this.calendarMonth, this.lastParsedPlan);
                        this.renderDietFromJson(parsed);
                        CommonUtils.appendChatMessage(planChatBox, '部分数据已加载，但格式可能不完整。', 'ai');
                    } else {
                        CommonUtils.appendChatMessage(planChatBox, 'AI返回的数据格式不正确，请重试。', 'ai');
                    }
                }
            } else {
                console.log('[plan] 未获取到AI回复');
                CommonUtils.appendChatMessage(planChatBox, '未能获取AI回复。', 'ai');
            }
        } catch (error) {
            console.error('[plan] 计划生成错误:', error);
            if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
            CommonUtils.appendChatMessage(planChatBox, '计划生成失败，请稍后再试。', 'ai');
        }
    }
}

// 初始化计划页
document.addEventListener('DOMContentLoaded', () => {
    new PlanPage();
});
