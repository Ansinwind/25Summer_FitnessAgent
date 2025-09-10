// 智能饮食计划 - JavaScript功能文件

// 全局变量
let currentDate = new Date();
let selectedGoal = 'weight-loss';
let isDarkMode = false;
let currentTab = 'vitamins';

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    initializeTheme();
    initializeDateSelector();
    initializeGoalButtons();
    initializeMacroChart();
    initializeMealFilter();
    initializeAnalysisTabs();
    initializeRecipeCards();
    initializeModal();
    initializeAnimations();
    initializeRangeSlider();
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

// 日期选择器
function initializeDateSelector() {
    const prevBtn = document.getElementById('prev-day');
    const nextBtn = document.getElementById('next-day');
    const currentDateEl = document.querySelector('.current-date');
    
    prevBtn.addEventListener('click', function() {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDateDisplay();
    });
    
    nextBtn.addEventListener('click', function() {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDateDisplay();
    });
    
    updateDateDisplay();
}

function updateDateDisplay() {
    const currentDateEl = document.querySelector('.current-date');
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    currentDateEl.textContent = currentDate.toLocaleDateString('zh-CN', options);
    
    // 更新营养数据
    updateNutritionData();
}

// 饮食目标选择
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
            
            // 更新推荐卡路里
            updateCalorieTarget();
        });
    });
}

function updateCalorieTarget() {
    const calorieInput = document.querySelector('.form-input');
    const calorieTargets = {
        'weight-loss': 1800,
        'muscle-gain': 2500,
        'maintenance': 2200,
        'performance': 2800
    };
    
    calorieInput.value = calorieTargets[selectedGoal] || 2200;
}

// 宏量营养素图表
function initializeMacroChart() {
    const macroChart = document.getElementById('macro-chart');
    if (macroChart) {
        drawMacroChart(macroChart);
    }
}

function drawMacroChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    
    // 数据
    const data = [
        { label: '蛋白质', value: 120, color: '#FF6B35' },
        { label: '碳水', value: 200, color: '#4A90E2' },
        { label: '脂肪', value: 65, color: '#7ED321' }
    ];
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2;
    
    // 绘制饼图
    data.forEach(item => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        
        // 绘制标签
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
        const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
        
        ctx.fillStyle = '#1A1A1A';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`${item.value}g`, labelX, labelY);
        
        currentAngle += sliceAngle;
    });
    
    // 绘制中心圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // 中心文字
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('总摄入', centerX, centerY - 5);
    ctx.font = '14px Inter';
    ctx.fillText(`${total}g`, centerX, centerY + 15);
}

// 餐单过滤器
function initializeMealFilter() {
    const filterButtons = document.querySelectorAll('.meal-filter .filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除其他按钮的active状态
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加当前按钮的active状态
            this.classList.add('active');
            
            // 过滤餐单
            const filter = this.textContent;
            filterMeals(filter);
        });
    });
}

function filterMeals(filter) {
    const mealCards = document.querySelectorAll('.meal-card');
    
    mealCards.forEach(card => {
        if (filter === '全部') {
            card.style.display = 'block';
        } else {
            const mealType = card.classList.contains('breakfast') ? '早餐' :
                           card.classList.contains('lunch') ? '午餐' :
                           card.classList.contains('dinner') ? '晚餐' :
                           card.classList.contains('snack') ? '加餐' : '';
            
            if (mealType === filter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// 营养成分分析标签页
function initializeAnalysisTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除其他按钮的active状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加当前按钮的active状态
            this.classList.add('active');
            
            // 切换内容
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // 隐藏所有内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 显示选中的内容
    document.getElementById(tabId).classList.add('active');
    currentTab = tabId;
    
    // 根据标签页绘制相应图表
    if (tabId === 'fiber') {
        drawFiberChart();
    }
}

function drawFiberChart() {
    const fiberChart = document.getElementById('fiber-chart');
    if (!fiberChart) return;
    
    const ctx = fiberChart.getContext('2d');
    const width = fiberChart.width = fiberChart.offsetWidth;
    const height = fiberChart.height = fiberChart.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    
    // 绘制环形进度条
    const progress = 0.85; // 85% 完成度
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (progress * 2 * Math.PI);
    
    // 背景圆环
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 20;
    ctx.stroke();
    
    // 进度圆环
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#7ED321';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // 中心文字
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 20px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('28g', centerX, centerY - 5);
    ctx.font = '14px Inter';
    ctx.fillText('膳食纤维', centerX, centerY + 15);
}

// 食谱卡片功能
function initializeRecipeCards() {
    const recipeButtons = document.querySelectorAll('.recipe-btn');
    
    recipeButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('primary')) {
                // 查看详情
                showRecipeDetail(this);
            } else if (this.classList.contains('secondary')) {
                // 收藏/取消收藏
                toggleFavorite(this);
            }
        });
    });
}

function showRecipeDetail(button) {
    const recipeCard = button.closest('.recipe-card');
    const recipeTitle = recipeCard.querySelector('h3').textContent;
    
    // 这里可以显示食谱详情模态框
    openRecipeModal(recipeTitle);
}

function toggleFavorite(button) {
    const icon = button.querySelector('i');
    
    if (icon.classList.contains('fas')) {
        // 取消收藏
        icon.classList.remove('fas');
        icon.classList.add('far');
        button.style.background = '#EF4444';
        showNotification('已取消收藏', 'info');
    } else {
        // 收藏
        icon.classList.remove('far');
        icon.classList.add('fas');
        button.style.background = '#EF4444';
        showNotification('已添加到收藏', 'success');
    }
}

// 模态框功能
function initializeModal() {
    const modal = document.getElementById('recipe-modal');
    const closeBtn = document.querySelector('.close-btn');
    
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

function openRecipeModal(recipeTitle) {
    const modal = document.getElementById('recipe-modal');
    const modalTitle = modal.querySelector('h4');
    
    modalTitle.textContent = recipeTitle;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('recipe-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// 范围滑块
function initializeRangeSlider() {
    const proteinRange = document.getElementById('protein-range');
    const rangeValue = document.querySelector('.range-value');
    
    if (proteinRange && rangeValue) {
        proteinRange.addEventListener('input', function() {
            rangeValue.textContent = this.value + '%';
        });
    }
}

// AI饮食计划生成
function generateDietPlan() {
    const generateBtn = document.querySelector('.generate-btn');
    const originalText = generateBtn.innerHTML;
    
    // 显示加载状态
    generateBtn.innerHTML = '<div class="loading"></div> 生成中...';
    generateBtn.disabled = true;
    
    // 模拟AI生成过程
    setTimeout(() => {
        // 恢复按钮状态
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
        
        // 显示生成结果
        showGeneratedPlan();
        
        // 添加成功动画
        generateBtn.style.background = 'var(--gradient-success)';
        setTimeout(() => {
            generateBtn.style.background = '';
        }, 2000);
    }, 2000);
}

function showGeneratedPlan() {
    console.log('AI饮食计划生成完成');
    showNotification('AI饮食计划已生成！', 'success');
    
    // 更新餐单数据
    updateMealData();
}

function updateMealData() {
    // 这里可以更新餐单数据
    console.log('更新餐单数据');
}

// 更新营养数据
function updateNutritionData() {
    // 根据日期更新营养数据
    console.log(`更新 ${currentDate.toDateString()} 的营养数据`);
    
    // 重新绘制图表
    const macroChart = document.getElementById('macro-chart');
    if (macroChart) {
        drawMacroChart(macroChart);
    }
}

// 餐品替换功能
function replaceMealItem(button) {
    const mealItem = button.closest('.meal-item');
    const itemName = mealItem.querySelector('h4').textContent;
    
    // 显示替换选项
    showReplacementOptions(itemName, mealItem);
}

function showReplacementOptions(itemName, mealItem) {
    // 这里可以显示替换选项模态框
    console.log(`替换 ${itemName}`);
    showNotification(`正在为 ${itemName} 寻找替代品...`, 'info');
    
    // 模拟替换过程
    setTimeout(() => {
        const newItemName = getRandomReplacement(itemName);
        updateMealItem(mealItem, newItemName);
        showNotification(`${itemName} 已替换为 ${newItemName}`, 'success');
    }, 1500);
}

function getRandomReplacement(originalItem) {
    const replacements = {
        '燕麦粥': ['全麦面包', '希腊酸奶', '水果沙拉'],
        '水煮蛋': ['煎蛋', '蒸蛋', '蛋饼'],
        '鸡胸肉沙拉': ['三文鱼沙拉', '牛肉沙拉', '豆腐沙拉'],
        '糙米饭': ['藜麦', '红薯', '全麦意面']
    };
    
    const options = replacements[originalItem] || ['健康替代品'];
    return options[Math.floor(Math.random() * options.length)];
}

function updateMealItem(mealItem, newItemName) {
    const itemTitle = mealItem.querySelector('h4');
    const itemImage = mealItem.querySelector('img');
    
    itemTitle.textContent = newItemName;
    itemImage.src = `https://via.placeholder.com/60?text=${encodeURIComponent(newItemName)}`;
    
    // 添加更新动画
    mealItem.style.transform = 'scale(0.95)';
    setTimeout(() => {
        mealItem.style.transform = '';
    }, 200);
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
    const cards = document.querySelectorAll('.meal-card, .recipe-card, .goal-btn');
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
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 刷新推荐
function refreshRecommendations() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const originalText = refreshBtn.innerHTML;
    
    // 显示加载状态
    refreshBtn.innerHTML = '<div class="loading"></div> 刷新中...';
    refreshBtn.disabled = true;
    
    // 模拟刷新过程
    setTimeout(() => {
        // 恢复按钮状态
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
        
        // 更新推荐内容
        updateRecommendations();
        showNotification('推荐已刷新！', 'success');
    }, 1500);
}

function updateRecommendations() {
    // 这里可以更新推荐食谱
    console.log('更新推荐食谱');
}

// 绑定事件监听器
document.addEventListener('click', function(e) {
    // 生成饮食计划按钮
    if (e.target.closest('.generate-btn')) {
        generateDietPlan();
    }
    
    // 刷新推荐按钮
    if (e.target.closest('.refresh-btn')) {
        refreshRecommendations();
    }
    
    // 替换餐品按钮
    if (e.target.closest('.action-btn.replace')) {
        replaceMealItem(e.target.closest('.action-btn.replace'));
    }
    
    // 收藏按钮
    if (e.target.closest('.action-btn.favorite')) {
        toggleFavorite(e.target.closest('.action-btn.favorite'));
    }
});

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter 生成饮食计划
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateDietPlan();
    }
    
    // R键刷新推荐
    if (e.key === 'r' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        refreshRecommendations();
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
    const macroChart = document.getElementById('macro-chart');
    const fiberChart = document.getElementById('fiber-chart');
    
    if (macroChart) {
        drawMacroChart(macroChart);
    }
    if (fiberChart && currentTab === 'fiber') {
        drawFiberChart();
    }
}

// 监听窗口大小变化
window.addEventListener('resize', debounce(handleResize, 250));

// 导出功能
function exportNutritionPlan() {
    const nutritionData = {
        date: currentDate.toISOString(),
        goal: selectedGoal,
        meals: Array.from(document.querySelectorAll('.meal-card')).map(card => ({
            type: card.classList.contains('breakfast') ? 'breakfast' :
                  card.classList.contains('lunch') ? 'lunch' :
                  card.classList.contains('dinner') ? 'dinner' : 'snack',
            items: Array.from(card.querySelectorAll('.meal-item')).map(item => ({
                name: item.querySelector('h4').textContent,
                description: item.querySelector('p').textContent
            }))
        }))
    };
    
    const dataStr = JSON.stringify(nutritionData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `nutrition-plan-${currentDate.toISOString().split('T')[0]}.json`;
    link.click();
}

console.log('智能饮食计划模块已加载完成！');
