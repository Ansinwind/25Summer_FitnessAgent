// 跑步路线&运动医疗 - JavaScript功能文件

// 全局变量
let currentModule = 'route';
let selectedSymptom = null;
let selectedPainLevel = null;
let isDarkMode = false;
let currentRoute = null;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    initializeTheme();
    initializeModuleTabs();
    initializeRoutePlanner();
    initializeSymptomChecker();
    initializePreventionCards();
    initializeEmergencyGuide();
    initializeRehabilitation();
    initializeModal();
    initializeAnimations();
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

// 模块切换
function initializeModuleTabs() {
    const tabButtons = document.querySelectorAll('.module-tabs .tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const module = this.dataset.module;
            switchModule(module);
        });
    });
}

function switchModule(module) {
    // 更新标签状态
    document.querySelectorAll('.module-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-module="${module}"]`).classList.add('active');
    
    // 切换内容
    document.querySelectorAll('.module-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${module}-module`).classList.add('active');
    
    currentModule = module;
    
    // 根据模块执行特定初始化
    if (module === 'route') {
        initializeMapControls();
    } else if (module === 'medical') {
        initializeMedicalFeatures();
    }
}

// 路线规划器
function initializeRoutePlanner() {
    const preferenceButtons = document.querySelectorAll('.preference-btn');
    const generateBtn = document.querySelector('.generate-btn');
    
    // 偏好选择
    preferenceButtons.forEach(button => {
        button.addEventListener('click', function() {
            preferenceButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 生成路线
    generateBtn.addEventListener('click', function() {
        generateRoute();
    });
}

function generateRoute() {
    const generateBtn = document.querySelector('.generate-btn');
    const originalText = generateBtn.innerHTML;
    
    // 显示加载状态
    generateBtn.innerHTML = '<div class="loading"></div> 规划中...';
    generateBtn.disabled = true;
    
    // 模拟路线生成过程
    setTimeout(() => {
        // 恢复按钮状态
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
        
        // 显示生成结果
        showGeneratedRoute();
        
        // 添加成功动画
        generateBtn.style.background = 'var(--gradient-success)';
        setTimeout(() => {
            generateBtn.style.background = '';
        }, 2000);
    }, 2000);
}

function showGeneratedRoute() {
    console.log('路线生成完成');
    showNotification('推荐路线已生成！', 'success');
    
    // 更新路线信息
    updateRouteInfo();
}

function updateRouteInfo() {
    // 模拟更新路线统计数据
    const stats = {
        distance: '5.2',
        time: '28',
        elevation: '45',
        rating: '4.8'
    };
    
    // 更新显示
    document.querySelectorAll('.stat-value').forEach((element, index) => {
        const values = Object.values(stats);
        if (values[index]) {
            element.textContent = values[index];
        }
    });
}

// 地图控制
function initializeMapControls() {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const centerMapBtn = document.getElementById('center-map');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            zoomMap('in');
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            zoomMap('out');
        });
    }
    
    if (centerMapBtn) {
        centerMapBtn.addEventListener('click', function() {
            centerMap();
        });
    }
}

function zoomMap(direction) {
    console.log(`地图缩放: ${direction}`);
    showNotification(`地图已${direction === 'in' ? '放大' : '缩小'}`, 'info');
}

function centerMap() {
    console.log('地图居中');
    showNotification('地图已居中', 'info');
}

// 症状自查
function initializeSymptomChecker() {
    const symptomButtons = document.querySelectorAll('.symptom-btn');
    const scaleItems = document.querySelectorAll('.scale-item');
    const analyzeBtn = document.querySelector('.analyze-btn');
    
    // 症状选择
    symptomButtons.forEach(button => {
        button.addEventListener('click', function() {
            symptomButtons.forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            selectedSymptom = this.dataset.symptom;
        });
    });
    
    // 疼痛程度选择
    scaleItems.forEach(item => {
        item.addEventListener('click', function() {
            scaleItems.forEach(scale => scale.classList.remove('selected'));
            this.classList.add('selected');
            selectedPainLevel = this.dataset.level;
        });
    });
    
    // 分析症状
    analyzeBtn.addEventListener('click', function() {
        analyzeSymptoms();
    });
}

function analyzeSymptoms() {
    if (!selectedSymptom || !selectedPainLevel) {
        showNotification('请选择症状和疼痛程度', 'error');
        return;
    }
    
    const analyzeBtn = document.querySelector('.analyze-btn');
    const originalText = analyzeBtn.innerHTML;
    
    // 显示加载状态
    analyzeBtn.innerHTML = '<div class="loading"></div> 分析中...';
    analyzeBtn.disabled = true;
    
    // 模拟AI分析过程
    setTimeout(() => {
        // 恢复按钮状态
        analyzeBtn.innerHTML = originalText;
        analyzeBtn.disabled = false;
        
        // 显示分析结果
        showAnalysisResult();
        
        // 添加成功动画
        analyzeBtn.style.background = 'var(--gradient-success)';
        setTimeout(() => {
            analyzeBtn.style.background = '';
        }, 2000);
    }, 2000);
}

function showAnalysisResult() {
    const resultSection = document.getElementById('analysis-result');
    resultSection.style.display = 'block';
    
    // 根据症状和疼痛程度生成结果
    const result = generateAnalysisResult(selectedSymptom, selectedPainLevel);
    updateAnalysisResult(result);
    
    showNotification('症状分析完成！', 'success');
    
    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

function generateAnalysisResult(symptom, painLevel) {
    const results = {
        'knee-pain': {
            diagnosis: '根据您描述的膝盖疼痛症状，可能是轻微的肌肉疲劳或过度使用导致的疼痛。建议适当休息并观察症状变化。',
            recommendations: [
                '立即停止相关运动，给予充分休息',
                '使用冰敷缓解疼痛和肿胀',
                '进行轻柔的拉伸运动',
                '如症状持续或加重，请及时就医'
            ],
            prevention: [
                '运动前充分热身',
                '循序渐进增加运动强度',
                '使用正确的运动姿势',
                '定期进行力量训练'
            ],
            severity: painLevel <= 2 ? '轻度' : painLevel <= 4 ? '中度' : '重度'
        },
        'ankle-pain': {
            diagnosis: '脚踝疼痛可能与扭伤、过度使用或姿势不当有关。建议进行适当的休息和康复训练。',
            recommendations: [
                '停止跑步等冲击性运动',
                '使用弹性绷带固定脚踝',
                '进行踝关节活动度训练',
                '如疼痛严重，请及时就医检查'
            ],
            prevention: [
                '选择合适的跑鞋',
                '加强踝关节周围肌肉力量',
                '运动前进行踝关节热身',
                '避免在不平整路面跑步'
            ],
            severity: painLevel <= 2 ? '轻度' : painLevel <= 4 ? '中度' : '重度'
        }
    };
    
    return results[symptom] || results['knee-pain'];
}

function updateAnalysisResult(result) {
    // 更新严重程度
    const severityLevel = document.querySelector('.severity-level');
    const severityFill = document.querySelector('.severity-fill');
    
    if (severityLevel) {
        severityLevel.textContent = result.severity;
    }
    
    if (severityFill) {
        const width = result.severity === '轻度' ? '30%' : 
                     result.severity === '中度' ? '60%' : '90%';
        severityFill.style.width = width;
    }
    
    // 更新诊断内容
    const diagnosis = document.querySelector('.diagnosis p');
    if (diagnosis) {
        diagnosis.textContent = result.diagnosis;
    }
    
    // 更新建议措施
    const recommendations = document.querySelector('.recommendations ul');
    if (recommendations) {
        recommendations.innerHTML = result.recommendations.map(rec => `<li>${rec}</li>`).join('');
    }
    
    // 更新预防建议
    const prevention = document.querySelector('.prevention ul');
    if (prevention) {
        prevention.innerHTML = result.prevention.map(prev => `<li>${prev}</li>`).join('');
    }
}

// 预防卡片
function initializePreventionCards() {
    const cardButtons = document.querySelectorAll('.card-btn');
    
    cardButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.prevention-card');
            const title = card.querySelector('h3').textContent;
            showPreventionTutorial(title);
        });
    });
}

function showPreventionTutorial(title) {
    console.log(`显示 ${title} 教程`);
    showNotification(`${title} 教程即将开始`, 'info');
    
    // 这里可以显示教程模态框或跳转到教程页面
}

// 紧急处理指南
function initializeEmergencyGuide() {
    const guideTabs = document.querySelectorAll('.guide-tab');
    
    guideTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const guide = this.dataset.guide;
            switchGuide(guide);
        });
    });
}

function switchGuide(guide) {
    // 更新标签状态
    document.querySelectorAll('.guide-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-guide="${guide}"]`).classList.add('active');
    
    // 切换内容
    document.querySelectorAll('.guide-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetItem = document.getElementById(`${guide}-guide`);
    if (targetItem) {
        targetItem.classList.add('active');
    }
}

// 康复训练
function initializeRehabilitation() {
    const exerciseButtons = document.querySelectorAll('.exercise-btn');
    
    exerciseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const exerciseItem = this.closest('.exercise-item');
            const exerciseName = exerciseItem.querySelector('h4').textContent;
            showExerciseTutorial(exerciseName);
        });
    });
}

function showExerciseTutorial(exerciseName) {
    console.log(`显示 ${exerciseName} 教程`);
    showNotification(`${exerciseName} 训练教程即将开始`, 'info');
    
    // 这里可以显示训练教程模态框
}

// 医疗功能初始化
function initializeMedicalFeatures() {
    // 初始化医疗模块特有的功能
    console.log('医疗模块已激活');
}

// 模态框功能
function initializeModal() {
    const modal = document.getElementById('route-modal');
    const closeBtn = document.querySelector('.close-btn');
    
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
}

function openRouteModal(routeName) {
    const modal = document.getElementById('route-modal');
    if (modal) {
        const modalTitle = modal.querySelector('h4');
        if (modalTitle) {
            modalTitle.textContent = routeName;
        }
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('route-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
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
    const cards = document.querySelectorAll('.route-card, .prevention-card, .preference-btn, .symptom-btn');
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

// 路线操作
function startRoute(routeName) {
    console.log(`开始路线: ${routeName}`);
    showNotification(`开始导航: ${routeName}`, 'success');
    
    // 这里可以实现实际的导航功能
}

function favoriteRoute(routeName) {
    console.log(`收藏路线: ${routeName}`);
    showNotification(`${routeName} 已添加到收藏`, 'success');
}

function shareRoute(routeName) {
    console.log(`分享路线: ${routeName}`);
    
    // 模拟分享功能
    if (navigator.share) {
        navigator.share({
            title: routeName,
            text: `查看这个跑步路线: ${routeName}`,
            url: window.location.href
        });
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('路线链接已复制到剪贴板', 'success');
        });
    }
}

function editRoute(routeName) {
    console.log(`编辑路线: ${routeName}`);
    showNotification(`编辑 ${routeName}`, 'info');
}

function addNewRoute() {
    console.log('添加新路线');
    showNotification('添加新路线功能', 'info');
}

// 绑定事件监听器
document.addEventListener('click', function(e) {
    // 路线操作按钮
    if (e.target.closest('.action-btn.primary')) {
        const routeName = '推荐路线';
        startRoute(routeName);
    }
    
    if (e.target.closest('.action-btn.secondary')) {
        const button = e.target.closest('.action-btn.secondary');
        const icon = button.querySelector('i');
        const routeName = '推荐路线';
        
        if (icon.classList.contains('fa-heart')) {
            favoriteRoute(routeName);
        } else if (icon.classList.contains('fa-share')) {
            shareRoute(routeName);
        }
    }
    
    // 我的路线操作
    if (e.target.closest('.route-btn.primary')) {
        const routeCard = e.target.closest('.route-card');
        const routeName = routeCard.querySelector('h3').textContent;
        startRoute(routeName);
    }
    
    if (e.target.closest('.route-btn.secondary')) {
        const button = e.target.closest('.route-btn.secondary');
        const icon = button.querySelector('i');
        const routeCard = button.closest('.route-card');
        const routeName = routeCard.querySelector('h3').textContent;
        
        if (icon.classList.contains('fa-edit')) {
            editRoute(routeName);
        }
    }
    
    // 添加路线按钮
    if (e.target.closest('.add-route-btn')) {
        addNewRoute();
    }
    
    // 路线卡片点击
    if (e.target.closest('.route-card') && !e.target.closest('.route-btn')) {
        const routeCard = e.target.closest('.route-card');
        const routeName = routeCard.querySelector('h3').textContent;
        openRouteModal(routeName);
    }
});

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter 生成路线
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && currentModule === 'route') {
        e.preventDefault();
        generateRoute();
    }
    
    // Ctrl/Cmd + Enter 分析症状
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && currentModule === 'medical') {
        e.preventDefault();
        analyzeSymptoms();
    }
    
    // Tab键切换模块
    if (e.key === 'Tab' && e.ctrlKey) {
        e.preventDefault();
        const nextModule = currentModule === 'route' ? 'medical' : 'route';
        switchModule(nextModule);
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
    // 重新调整地图大小
    if (currentModule === 'route') {
        console.log('重新调整地图大小');
    }
}

// 监听窗口大小变化
window.addEventListener('resize', debounce(handleResize, 250));

// 导出功能
function exportRouteData() {
    const routeData = {
        module: currentModule,
        timestamp: new Date().toISOString(),
        routes: Array.from(document.querySelectorAll('.route-card')).map(card => ({
            name: card.querySelector('h3').textContent,
            description: card.querySelector('p').textContent,
            distance: card.querySelector('.distance').textContent,
            time: card.querySelector('.time').textContent,
            difficulty: card.querySelector('.difficulty').textContent
        }))
    };
    
    const dataStr = JSON.stringify(routeData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `route-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// 位置服务
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log(`当前位置: ${lat}, ${lng}`);
                showNotification('位置获取成功', 'success');
            },
            function(error) {
                console.error('位置获取失败:', error);
                showNotification('位置获取失败，请手动输入', 'error');
            }
        );
    } else {
        showNotification('浏览器不支持位置服务', 'error');
    }
}

// 初始化位置服务
document.addEventListener('DOMContentLoaded', function() {
    // 自动获取位置（如果用户允许）
    setTimeout(() => {
        getCurrentLocation();
    }, 1000);
});

console.log('跑步路线&运动医疗模块已加载完成！');
