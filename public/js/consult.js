// 医疗咨询页功能
class ConsultPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        // 预置欢迎语
        const chatBox = document.getElementById('chat-box');
        if (chatBox && !chatBox.dataset.prefilled) {
            CommonUtils.appendChatMessage(chatBox, '你好，如果你在运动中遇到了健康问题，我可以为你提供一些建议！', 'ai');
            chatBox.dataset.prefilled = '1';
        }
    }

    bindEvents() {
        // 聊天发送按钮
        const sendChatBtn = document.getElementById('send-chat-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (sendChatBtn) {
            sendChatBtn.addEventListener('click', () => this.sendMessageToAI(chatInput.value.trim()));
        }
        
        if (chatInput) {
            chatInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.sendMessageToAI(chatInput.value.trim());
                }
            });
        }
    }

    // 发送消息到AI
    async sendMessageToAI(userMessage) {
        const chatBox = document.getElementById('chat-box');
        const chatInput = document.getElementById('chat-input');
        
        this.appendMessage(userMessage, 'user');
        chatInput.value = '';

        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'chat-message ai-message';
        thinkingElement.textContent = 'AI 正在思考中...';
        chatBox.appendChild(thinkingElement);
        chatBox.scrollTop = chatBox.scrollHeight;

        // 用户资料上下文
        const userProfileString = localStorage.getItem('userProfile');
        const userProfile = userProfileString ? JSON.parse(userProfileString) : {};
        const displayGoal = CommonUtils.goalMap[userProfile.goal] || '未指定';
        const profileContext = `用户的基本信息是：身高 ${userProfile.height || '未知'}cm, 体重 ${userProfile.weight || '未知'}kg, 健身目标是 ${displayGoal}.`;

        try {
            const response = await fetch('http://localhost:3000/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    condition: "C",
                    userMessage,
                    profileContext
                })
            });

            chatBox.removeChild(thinkingElement);

            const result = await response.json();
            if (result && result.text) {
                this.appendMessage(result.text, 'ai', true);
            } else {
                this.appendMessage('抱歉，AI未返回有效内容。', 'ai');
            }
        } catch (error) {
            console.error('聊天功能出错:', error);
            chatBox.removeChild(thinkingElement);
            this.appendMessage(`抱歉，连接服务时出错：${error.message}`, 'ai');
        }
    }

    // 添加消息到聊天框
    appendMessage(message, sender) {
        const chatBox = document.getElementById('chat-box');
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        
        // 支持 Markdown 渲染
        if (window.marked && sender === 'ai') {
            messageElement.innerHTML = marked.parse(message);
        } else {
            messageElement.textContent = message;
        }
        
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// 初始化医疗咨询页
document.addEventListener('DOMContentLoaded', () => {
    new ConsultPage();
});
