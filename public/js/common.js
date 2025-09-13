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
        profileText.textContent = `身高: ${profile.height}cm | 体重: ${profile.weight}kg | 目标: ${displayGoal}`;
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

    // 通用API调用
    static async apiCall(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }
}


// 全局初始化
document.addEventListener('DOMContentLoaded', () => {
    CommonUtils.checkUserProfile();
    CommonUtils.beautifyInputUI();
    CommonUtils.loadMarked();
});
