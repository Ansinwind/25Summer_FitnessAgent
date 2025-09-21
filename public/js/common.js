// 全局功能和工具函数
class CommonUtils {
    // 数据映射
    static goalMap = {
        'weight_loss': '减脂塑形',
        'muscle_gain': '增肌',
        'keep_fit': '保持健康'
    };

    // 检查用户资料是否存在
    static checkUserProfile() { 
        const userProfile = localStorage.getItem('userProfile');
        const profileText = document.getElementById('profile-text');
        
        if (!userProfile) {
            // 无资料时进入主页
            try {
                const homeBtn = document.querySelector('.nav-btn[data-target="home"]');
                if (homeBtn) homeBtn.click();
            } catch {}
        } else {
            const profile = JSON.parse(userProfile);
            this.updateProfileDisplay(profile);
        }
    }

    // 更新顶部显示的用户信息
    static updateProfileDisplay(profile) {
        const profileText = document.getElementById('profile-text');
        const displayGoal = this.goalMap[profile.goal] || profile.goal;
        const age = profile.age ? ` | 年龄: ${profile.age}岁` : '';
        const gender = profile.gender ? ` | 性别: ${profile.gender === 'male' ? '男' : '女'}` : '';
        profileText.textContent = `身高: ${profile.height}cm | 体重: ${profile.weight}kg${age}${gender} | 目标: ${displayGoal}`;
    }

    // 美化输入区域
    static beautifyInputUI() {
        const inputs = [
            'route-request-input',
            'plan-chat-input', 
            'chat-input'
        ];
        const buttons = [
            'generate-route-btn',
            'plan-chat-send',
            'send-chat-btn'
        ];

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.boxShadow = 'none';
                el.style.border = 'none';
                el.style.borderRadius = '8px';
                el.style.background = '#0f0f10';
                el.style.color = '#fff';
                el.style.fontSize = '16px';
            }
        });

        buttons.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderRadius = '8px';
                el.style.boxShadow = 'none';
                el.style.fontWeight = 'bold';
                el.style.backgroundColor = '#ff7a00';
                el.style.color = '#000';
            }
        });
    }

    // 动态加载 marked.js
    static loadMarked() {
        if (!window.marked) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            document.head.appendChild(script);
        }
    }

    // 通用聊天消息渲染
    static appendChatMessage(container, message, sender = 'user') {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}-message`;
        if (window.marked && sender === 'ai') {
            msgDiv.innerHTML = marked.parse(message);
        } else {
            msgDiv.textContent = message;
        }
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        return msgDiv;
    }

    // 通用API调用（增强版 - 支持状态传递）
    static async apiCall(url, data) {
        // 自动添加当前健身状态
        if (window.fitnessStateManager && !data.fitnessState) {
            data.fitnessState = window.fitnessStateManager.state;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    // 导出用户数据
    static exportUserData() {
        try {
            const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            const metrics = JSON.parse(localStorage.getItem('metrics') || '{}');
            const exerciseFeedback = JSON.parse(localStorage.getItem('exerciseFeedback') || '[]');
            const completedDays = JSON.parse(localStorage.getItem('completedDays') || '{}');
            const adoptedPlan = JSON.parse(localStorage.getItem('adoptedPlan') || '{}');
            const adoptedRoute = JSON.parse(localStorage.getItem('adoptedRoute') || '{}');
            const medicalConsultations = JSON.parse(localStorage.getItem('medicalConsultations') || '[]');

            const exportData = {
                userProfile,
                metrics,
                exerciseFeedback,
                completedDays,
                adoptedPlan,
                adoptedRoute,
                medicalConsultations,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `fitness-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert('数据导出成功！');
        } catch (error) {
            console.error('导出数据失败:', error);
            alert('导出数据失败，请重试');
        }
    }

    // 导入用户数据
    static importUserData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                // 验证数据格式
                if (!importData.version || !importData.userProfile) {
                    throw new Error('无效的数据文件格式');
                }

                // 导入数据到localStorage
                if (importData.userProfile) {
                    localStorage.setItem('userProfile', JSON.stringify(importData.userProfile));
                }
                if (importData.metrics) {
                    localStorage.setItem('metrics', JSON.stringify(importData.metrics));
                }
                if (importData.exerciseFeedback) {
                    localStorage.setItem('exerciseFeedback', JSON.stringify(importData.exerciseFeedback));
                }
                if (importData.completedDays) {
                    localStorage.setItem('completedDays', JSON.stringify(importData.completedDays));
                }
                if (importData.adoptedPlan) {
                    localStorage.setItem('adoptedPlan', JSON.stringify(importData.adoptedPlan));
                }
                if (importData.adoptedRoute) {
                    localStorage.setItem('adoptedRoute', JSON.stringify(importData.adoptedRoute));
                }
                if (importData.medicalConsultations) {
                    localStorage.setItem('medicalConsultations', JSON.stringify(importData.medicalConsultations));
                }

                // 更新显示
                this.updateProfileDisplay(importData.userProfile);
                
                alert('数据导入成功！页面将刷新以应用新数据。');
                window.location.reload();
            } catch (error) {
                console.error('导入数据失败:', error);
                alert('导入数据失败：' + error.message);
            }
        };
        reader.readAsText(file);
    }
}


// 全局初始化
document.addEventListener('DOMContentLoaded', () => {
    CommonUtils.checkUserProfile();
    CommonUtils.beautifyInputUI();
    CommonUtils.loadMarked();
});
