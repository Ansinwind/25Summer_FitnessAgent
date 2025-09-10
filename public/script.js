document.addEventListener('DOMContentLoaded', () => {
    const onboardingModal = document.getElementById('onboarding-modal');
    const userInfoForm = document.getElementById('user-info-form');
    const profileText = document.getElementById('profile-text');
    const editProfileBtn = document.getElementById('edit-profile-btn');

    // 内容滑动相关
    const navButtons = document.querySelectorAll('.nav-btn');
    const contentSlider = document.getElementById('content-slider');

    // 检查本地是否已有用户信息
    const checkUserProfile = () => {
        const userProfile = localStorage.getItem('userProfile');
        if (!userProfile) {
            onboardingModal.style.display = 'flex';
        } else {
            onboardingModal.style.display = 'none';
            const profile = JSON.parse(userProfile);
            updateProfileDisplay(profile);
            fetchInitialPlan(profile); // 获取初始计划
        }
    };

    // 更新右上角用户信息显示
    const updateProfileDisplay = (profile) => {
        profileText.textContent = `身高: ${profile.height}cm | 体重: ${profile.weight}kg | 目标: ${profile.goal}`;
    };

    // 提交用户信息表单
    userInfoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userProfile = {
            height: document.getElementById('height').value,
            weight: document.getElementById('weight').value,
            goal: document.getElementById('goal').value,
            frequency: document.getElementById('frequency').value
        };
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        
        // 发送到后端保存
        await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile)
        });

        checkUserProfile();
    });

    // 编辑信息按钮
    editProfileBtn.addEventListener('click', () => {
        onboardingModal.style.display = 'flex';
    });
    
    // 导航栏滑动逻辑
    navButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            contentSlider.style.transform = `translateX(-${index * (100 / navButtons.length)}%)`;
        });
    });

    // --- API 调用与内容渲染 ---
    
    // 获取健身与饮食计划
    const fetchInitialPlan = async (profile) => {
        console.log('Fetching plan for:', profile);
        try {
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            const data = await response.json();
            
            // 渲染日历和饮食建议
            renderWorkoutCalendar(data.workoutPlan);
            renderDietRecommendation(data.dietPlan);

        } catch (error) {
            console.error('Error fetching plan:', error);
            // 可以在页面上显示错误信息
        }
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

    // 初始化地图
    const initMap = () => {
        const map = L.map('map').setView([39.9042, 116.4074], 13); // 默认北京
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
        // 后续可以添加路线规划和记录功能
    };

    // 初始化页面
    checkUserProfile();
    initMap();
});