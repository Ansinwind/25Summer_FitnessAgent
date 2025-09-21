// 医疗咨询页功能
class ConsultPage {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    // 预置欢迎语
    const chatBox = document.getElementById("chat-box");
    if (chatBox && !chatBox.dataset.prefilled) {
      CommonUtils.appendChatMessage(
        chatBox,
        "你好，如果你在运动中遇到了健康问题，我可以为你提供一些建议！",
        "ai"
      );
      chatBox.dataset.prefilled = "1";
    }

    // 更新医疗咨询历史显示
    this.updateConsultationHistory();

    // 更新病史记录显示
    this.updateMedicalHistoryDisplay();
  }

  bindEvents() {
    // 聊天发送按钮
    const sendChatBtn = document.getElementById("send-chat-btn");
    const chatInput = document.getElementById("chat-input");

    if (sendChatBtn) {
      sendChatBtn.addEventListener("click", () =>
        this.sendMessageToAI(chatInput.value.trim())
      );
    }

    if (chatInput) {
      chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          this.sendMessageToAI(chatInput.value.trim());
        }
      });
    }
  }

  // 发送消息到AI
  async sendMessageToAI(userMessage) {
    const chatBox = document.getElementById("chat-box");
    const chatInput = document.getElementById("chat-input");

    this.appendMessage(userMessage, "user");
    chatInput.value = "";

    const thinkingElement = document.createElement("div");
    thinkingElement.className = "chat-message ai-message";
    thinkingElement.textContent = "AI 正在思考中...";
    chatBox.appendChild(thinkingElement);
    chatBox.scrollTop = chatBox.scrollHeight;

    // 用户资料上下文
    const userProfileString = localStorage.getItem("userProfile");
    const userProfile = userProfileString ? JSON.parse(userProfileString) : {};
    const displayGoal = CommonUtils.goalMap[userProfile.goal] || "未指定";
    const profileContext = `用户的基本信息是：身高 ${
      userProfile.height || "未知"
    }cm, 体重 ${userProfile.weight || "未知"}kg, 健身目标是 ${displayGoal}.`;

    try {
      // 获取当前健身状态
      const fitnessState = window.fitnessStateManager
        ? window.fitnessStateManager.state
        : {};

      const response = await fetch("http://localhost:3000/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition: "C",
          customRequest: userMessage,
          profileContext,
          fitnessState, // 传递状态信息
        }),
      });

      chatBox.removeChild(thinkingElement);

      const result = await response.json();
      if (result && result.text) {
        this.appendMessage(result.text, "ai", true);

        // 保存医疗咨询记录
        this.saveMedicalConsultation(userMessage, result.text);

        // 尝试从AI回复中提取医疗建议并保存为病史记录
        this.extractAndSaveMedicalAdvice(result.text, userMessage);

        // 更新状态管理器
        if (window.fitnessStateManager) {
          window.fitnessStateManager.updateState("C", result.text);
        }

        // 标记健康状态已变化，计划页面可弹窗
        localStorage.setItem("healthStatusChanged", "1");
      } else {
        this.appendMessage("抱歉，AI未返回有效内容。", "ai");
      }
    } catch (error) {
      console.error("聊天功能出错:", error);
      chatBox.removeChild(thinkingElement);
      this.appendMessage(`抱歉，连接服务时出错：${error.message}`, "ai");
    }
  }

  // 添加消息到聊天框
  appendMessage(message, sender) {
    const chatBox = document.getElementById("chat-box");
    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${sender}-message`;

    // 支持 Markdown 渲染
    if (window.marked && sender === "ai") {
      messageElement.innerHTML = marked.parse(message);
    } else {
      messageElement.textContent = message;
    }

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // 保存医疗咨询记录
  saveMedicalConsultation(userMessage, aiResponse) {
    try {
      const consultationRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        userMessage: userMessage,
        aiResponse: aiResponse,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      };

      // 获取现有医疗咨询记录
      const existingConsultations = JSON.parse(
        localStorage.getItem("medicalConsultations") || "[]"
      );
      existingConsultations.push(consultationRecord);

      // 只保留最近50条记录
      if (existingConsultations.length > 50) {
        existingConsultations.splice(0, existingConsultations.length - 50);
      }

      // 保存到localStorage
      localStorage.setItem(
        "medicalConsultations",
        JSON.stringify(existingConsultations)
      );

      console.log("✅ 医疗咨询记录已保存:", consultationRecord);

      // 更新医疗咨询历史显示
      this.updateConsultationHistory();
    } catch (error) {
      console.error("❌ 保存医疗咨询记录失败:", error);
    }
  }

  // 更新医疗咨询历史显示
  updateConsultationHistory() {
    const historyContainer = document.getElementById("consultation-history");
    if (!historyContainer) return;

    const consultations = JSON.parse(
      localStorage.getItem("medicalConsultations") || "[]"
    );

    if (consultations.length === 0) {
      historyContainer.innerHTML = '<p class="no-history">暂无医疗咨询记录</p>';
      return;
    }

    let historyHTML = "<h4>📋 医疗咨询历史</h4>";
    historyHTML += '<div class="consultation-list">';
    consultations
      .slice(-10)
      .reverse()
      .forEach((consultation) => {
        const curedFlag = consultation.cured ? true : false;
        historyHTML +=
          '<div class="consultation-item">' +
          '<div class="consultation-header">' +
          '<span class="consultation-date">' +
          consultation.date +
          " " +
          consultation.time +
          "</span>" +
          '<button class="btn btn-sm btn-secondary" onclick="consultPage.viewConsultationDetail(' +
          consultation.id +
          ')">查看详情</button>' +
          (curedFlag
            ? '<button class="btn btn-sm btn-success" style="margin-left:8px;background:#4caf50;cursor:default;" disabled>已痊愈</button>'
            : `<button class="btn btn-sm btn-success" style="margin-left:8px;" id="cure-btn-${consultation.id}">痊愈</button>`) +
          "</div>" +
          '<div class="consultation-preview">' +
          "<strong>问题：</strong>" +
          consultation.userMessage.substring(0, 100) +
          (consultation.userMessage.length > 100 ? "..." : "") +
          "</div>" +
          "</div>";
      });
    historyHTML += "</div>";
    historyContainer.innerHTML = historyHTML;
    // innerHTML 渲染后再绑定痊愈按钮事件
    consultations
      .slice(-10)
      .reverse()
      .forEach((consultation) => {
        const btn = document.getElementById(`cure-btn-${consultation.id}`);
        if (btn) {
          btn.onclick = () => this.handleRecovery(consultation.id);
        }
      });
  }

  // 痊愈按钮处理：跳转首页并触发计划弹窗
  handleRecovery = (id) => {
    // 删除对应医疗咨询记录
    let consultations = JSON.parse(
      localStorage.getItem("medicalConsultations") || "[]"
    );
    const idx = consultations.findIndex((c) => c.id === id);
    if (idx !== -1) {
      if (confirm("确认用户已痊愈？将自动删除该病史并刷新锻炼计划。")) {
        // 彻底全方位永久消除所有病情相关信息
        // 1. 清空所有病史相关 localStorage 字段
        localStorage.setItem("medicalHistory", "[]");
        localStorage.setItem("medicalConsultations", "[]");
        localStorage.setItem("adoptedPlan", JSON.stringify({}));
        localStorage.setItem("planHistory", JSON.stringify([]));
        localStorage.setItem("curedConsultationInfo", JSON.stringify({}));
        localStorage.setItem("lastPlanUpdate", "");
        // 2. 清空用户资料中的所有病情字段
        const userProfile = JSON.parse(
          localStorage.getItem("userProfile") || "{}"
        );
        userProfile.medical_history = "";
        userProfile.current_medications = "";
        userProfile.allergies = "";
        userProfile.feedbackHistory = [];
        localStorage.setItem("userProfile", JSON.stringify(userProfile));
        // 3. 清空所有反馈相关数据
        localStorage.setItem("exerciseFeedback", JSON.stringify([]));
        // 4. 清空所有历史变更、诊断、咨询相关数据
        localStorage.setItem("profileChangeHistory", JSON.stringify([]));
        localStorage.setItem("completedDays", JSON.stringify({}));
        localStorage.setItem("adoptedRoute", JSON.stringify({}));
        // 5. 清空所有页面展示相关病情内容
        this.updateConsultationHistory();
        // 6. 跳转首页并触发计划弹窗
        const homeBtn = document.querySelector('.nav-btn[data-target="home"]');
        if (homeBtn) homeBtn.click();
        localStorage.setItem("healthStatusChanged", "1");
        setTimeout(function () {
          const planBtn = document.querySelector(
            '.nav-btn[data-target="plan"]'
          );
          if (planBtn) planBtn.click();
          window.location.reload();
        }, 300);
      }
    }
    // 更新最后咨询显示
    const lastElement = document.getElementById("last-history");
    if (lastElement && consultations.length > 0) {
      const lastConsultation = consultations[consultations.length - 1];
      lastElement.textContent = `最后咨询：${lastConsultation.date}`;
      lastElement.style.color = "#4caf50";
    } else if (lastElement) {
      lastElement.textContent = "最后咨询：无";
      lastElement.style.color = "#ff9800";
    }
  };

  // 查看医疗咨询详情
  viewConsultationDetail(consultationId) {
    const consultations = JSON.parse(
      localStorage.getItem("medicalConsultations") || "[]"
    );
    const consultation = consultations.find((c) => c.id === consultationId);

    if (!consultation) {
      alert("未找到该咨询记录");
      return;
    }

    const detailModal = document.createElement("div");
    detailModal.className = "consultation-detail-modal";
    detailModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏥 医疗咨询详情</h3>
                    <button class="close-btn" onclick="this.closest('.consultation-detail-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="consultation-detail">
                        <div class="detail-section">
                            <h4>📅 咨询时间</h4>
                            <p>${consultation.date} ${consultation.time}</p>
                        </div>
                        <div class="detail-section">
                            <h4>❓ 用户问题</h4>
                            <div class="user-question">${consultation.userMessage}</div>
                        </div>
                        <div class="detail-section">
                            <h4>🤖 AI回复</h4>
                            <div class="ai-response">${consultation.aiResponse}</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="consultPage.exportConsultation(${consultationId})">
                        💾 导出此咨询
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.consultation-detail-modal').remove()">
                        关闭
                    </button>
                </div>
            </div>
        `;

    // 添加样式
    detailModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

    const modalContent = detailModal.querySelector(".modal-content");
    modalContent.style.cssText = `
            background: #2a2c31;
            border: 1px solid #ff7a00;
            border-radius: 8px;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            width: 90%;
        `;

    document.body.appendChild(detailModal);
  }

  // 导出医疗咨询记录
  exportConsultation(consultationId) {
    const consultations = JSON.parse(
      localStorage.getItem("medicalConsultations") || "[]"
    );
    const consultation = consultations.find((c) => c.id === consultationId);

    if (!consultation) {
      alert("未找到该咨询记录");
      return;
    }

    try {
      const exportData = {
        consultation: consultation,
        userProfile: JSON.parse(localStorage.getItem("userProfile") || "{}"),
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `medical-consultation-${consultation.date.replace(
        /\//g,
        "-"
      )}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("✅ 医疗咨询记录导出成功！");
    } catch (error) {
      console.error("导出医疗咨询记录失败:", error);
      alert("❌ 导出医疗咨询记录失败: " + error.message);
    }
  }

  // 导出所有医疗咨询记录
  exportAllConsultations() {
    try {
      const consultations = JSON.parse(
        localStorage.getItem("medicalConsultations") || "[]"
      );
      const userProfile = JSON.parse(
        localStorage.getItem("userProfile") || "{}"
      );

      const exportData = {
        consultations: consultations,
        userProfile: userProfile,
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `all-medical-consultations-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("✅ 所有医疗咨询记录导出成功！");
    } catch (error) {
      console.error("导出所有医疗咨询记录失败:", error);
      alert("❌ 导出所有医疗咨询记录失败: " + error.message);
    }
  }

  // 清空医疗咨询记录
  clearAllConsultations() {
    if (confirm("⚠️ 确定要清空所有医疗咨询记录吗？此操作不可恢复！")) {
      try {
        localStorage.removeItem("medicalConsultations");
        this.updateConsultationHistory();
        alert("✅ 所有医疗咨询记录已清空！");
      } catch (error) {
        console.error("清空医疗咨询记录失败:", error);
        alert("❌ 清空医疗咨询记录失败: " + error.message);
      }
    }
  }

  // 更新病史记录显示
  updateMedicalHistoryDisplay() {
    const medicalHistory = JSON.parse(
      localStorage.getItem("medicalHistory") || "[]"
    );
    const countElement = document.getElementById("history-count");
    const lastElement = document.getElementById("last-history");

    // 痊愈后彻底屏蔽病史内容
    if (localStorage.getItem("medicalHistory") === "[]") {
      if (countElement) {
        countElement.textContent = "病史记录：0 条";
        countElement.style.color = "#ff9800";
      }
      if (lastElement) {
        lastElement.textContent = "最后病史：无";
        lastElement.style.color = "#ff9800";
      }
      return;
    }

    if (countElement) {
      countElement.textContent = `病史记录：${medicalHistory.length} 条`;
      countElement.style.color =
        medicalHistory.length > 0 ? "#4caf50" : "#ff9800";
    }
    if (lastElement && medicalHistory.length > 0) {
      const lastHistory = medicalHistory[medicalHistory.length - 1];
      lastElement.textContent = `最后病史：${lastHistory.date || "未知"}`;
      lastElement.style.color = "#4caf50";
    } else if (lastElement) {
      lastElement.textContent = "最后病史：无";
      lastElement.style.color = "#ff9800";
    }
  }

  // 显示病史记录
  showMedicalHistory() {
    const medicalHistory = JSON.parse(
      localStorage.getItem("medicalHistory") || "[]"
    );
    // 痊愈后彻底屏蔽病史内容
    if (
      localStorage.getItem("medicalHistory") === "[]" ||
      medicalHistory.length === 0
    ) {
      alert("暂无病史记录");
      return;
    }

    const modal = document.createElement("div");
    modal.className = "medical-history-modal";

    let historyHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏥 病史记录</h3>
                    <button class="close-btn" onclick="this.closest('.medical-history-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="history-list">
        `;

    medicalHistory.forEach((history, index) => {
      historyHTML += `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-date">${
                          history.date || "未知日期"
                        }</span>
                        <div class="history-actions">
                            <button class="btn btn-sm btn-secondary" onclick="consultPage.viewHistoryDetail(${index})">
                                查看详情
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="consultPage.deleteHistory(${index})">
                                删除
                            </button>
                        </div>
                    </div>
                    <div class="history-preview">
                        <strong>疾病：</strong>${history.disease || "未知"}
                        <br><strong>症状：</strong>${(
                          history.symptoms || ""
                        ).substring(0, 100)}${
        (history.symptoms || "").length > 100 ? "..." : ""
      }
                    </div>
                </div>
            `;
    });

    historyHTML += `
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="consultPage.exportMedicalHistory()">
                        💾 导出病史记录
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.medical-history-modal').remove()">
                        关闭
                    </button>
                </div>
            </div>
        `;

    modal.innerHTML = historyHTML;

    // 添加样式
    modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

    const modalContent = modal.querySelector(".modal-content");
    modalContent.style.cssText = `
            background: #2a2c31;
            border: 1px solid #ff7a00;
            border-radius: 8px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            width: 90%;
        `;

    document.body.appendChild(modal);
  }

  // 查看病史详情
  viewHistoryDetail(index) {
    const medicalHistory = JSON.parse(
      localStorage.getItem("medicalHistory") || "[]"
    );
    const history = medicalHistory[index];

    if (!history) {
      alert("未找到该病史记录");
      return;
    }

    const detailModal = document.createElement("div");
    detailModal.className = "history-detail-modal";
    detailModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏥 病史详情</h3>
                    <button class="close-btn" onclick="this.closest('.history-detail-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="history-detail">
                        <div class="detail-section">
                            <h4>📅 记录时间</h4>
                            <p>${history.date || "未知"}</p>
                        </div>
                        <div class="detail-section">
                            <h4>🏥 疾病名称</h4>
                            <p>${history.disease || "未知"}</p>
                        </div>
                        <div class="detail-section">
                            <h4>😷 症状描述</h4>
                            <div class="history-content">${
                              history.symptoms || "无记录"
                            }</div>
                        </div>
                        <div class="detail-section">
                            <h4>💊 治疗方案</h4>
                            <div class="history-content">${
                              history.treatment || "无记录"
                            }</div>
                        </div>
                        <div class="detail-section">
                            <h4>📊 严重程度</h4>
                            <p>${history.severity || "未知"}</p>
                        </div>
                        <div class="detail-section">
                            <h4>🏥 就诊医院</h4>
                            <p>${history.hospital || "未知"}</p>
                        </div>
                        <div class="detail-section">
                            <h4>👨‍⚕️ 主治医生</h4>
                            <p>${history.doctor || "未知"}</p>
                        </div>
                        <div class="detail-section">
                            <h4>📝 备注</h4>
                            <div class="history-content">${
                              history.notes || "无备注"
                            }</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" onclick="consultPage.deleteHistory(${index}); this.closest('.history-detail-modal').remove();">
                        🗑️ 删除此病史
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.history-detail-modal').remove()">
                        关闭
                    </button>
                </div>
            </div>
        `;

    // 添加样式
    detailModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1003;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

    const modalContent = detailModal.querySelector(".modal-content");
    modalContent.style.cssText = `
            background: #2a2c31;
            border: 1px solid #ff7a00;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            width: 90%;
        `;

    document.body.appendChild(detailModal);
  }

  // 删除病史记录
  deleteHistory(index) {
    if (confirm("确定要删除这条病史记录吗？")) {
      try {
        const medicalHistory = JSON.parse(
          localStorage.getItem("medicalHistory") || "[]"
        );

        if (index >= 0 && index < medicalHistory.length) {
          medicalHistory.splice(index, 1);
          localStorage.setItem(
            "medicalHistory",
            JSON.stringify(medicalHistory)
          );

          // 更新显示
          this.updateMedicalHistoryDisplay();

          alert("✅ 病史记录已删除");
        } else {
          alert("❌ 无效的索引");
        }
      } catch (error) {
        console.error("删除病史记录失败:", error);
        alert("❌ 删除病史记录失败: " + error.message);
      }
    }
  }

  // 清空病史记录
  clearMedicalHistory() {
    if (confirm("⚠️ 确定要清空所有病史记录吗？此操作不可恢复！")) {
      try {
        localStorage.setItem("medicalHistory", JSON.stringify([]));
        this.updateMedicalHistoryDisplay();
        alert("✅ 所有病史记录已清空！");
      } catch (error) {
        console.error("清空病史记录失败:", error);
        alert("❌ 清空病史记录失败: " + error.message);
      }
    }
  }

  // 导出病史记录
  exportMedicalHistory() {
    try {
      const medicalHistory = JSON.parse(
        localStorage.getItem("medicalHistory") || "[]"
      );
      const userProfile = JSON.parse(
        localStorage.getItem("userProfile") || "{}"
      );

      const exportData = {
        medicalHistory: medicalHistory,
        userProfile: userProfile,
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `medical-history-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("✅ 病史记录导出成功！");
    } catch (error) {
      console.error("导出病史记录失败:", error);
      alert("❌ 导出病史记录失败: " + error.message);
    }
  }

  // 从AI回复中提取医疗建议并保存为病史记录
  extractAndSaveMedicalAdvice(aiResponse, userMessage) {
    try {
      // 检查AI回复是否包含医疗建议关键词
      const medicalKeywords = [
        "建议",
        "推荐",
        "应该",
        "需要",
        "避免",
        "禁止",
        "注意",
        "警告",
        "症状",
        "疾病",
        "治疗",
        "康复",
        "恢复",
        "检查",
        "诊断",
        "药物",
        "手术",
        "理疗",
        "休息",
        "运动",
        "饮食",
      ];

      const hasMedicalAdvice = medicalKeywords.some(
        (keyword) =>
          aiResponse.includes(keyword) || userMessage.includes(keyword)
      );

      if (hasMedicalAdvice) {
        // 提取关键信息
        const extractedInfo = this.extractMedicalInfo(aiResponse, userMessage);

        if (extractedInfo) {
          this.addMedicalHistory(extractedInfo);
          console.log("✅ 已从AI回复中提取医疗建议并保存为病史记录");
        }
      }
    } catch (error) {
      console.error("❌ 提取医疗建议失败:", error);
    }
  }

  // 从AI回复中提取医疗信息
  extractMedicalInfo(aiResponse, userMessage) {
    try {
      const medicalInfo = {
        disease: this.extractDisease(aiResponse, userMessage),
        symptoms: this.extractSymptoms(aiResponse, userMessage),
        treatment: this.extractTreatment(aiResponse),
        severity: this.extractSeverity(aiResponse),
        notes: aiResponse.substring(0, 500), // 限制长度
      };

      // 只有当提取到有效信息时才返回
      if (
        medicalInfo.disease ||
        medicalInfo.symptoms ||
        medicalInfo.treatment
      ) {
        return medicalInfo;
      }

      return null;
    } catch (error) {
      console.error("❌ 提取医疗信息失败:", error);
      return null;
    }
  }

  // 提取疾病名称
  extractDisease(aiResponse, userMessage) {
    const diseaseKeywords = [
      "颈椎",
      "腰椎",
      "关节炎",
      "肌肉",
      "韧带",
      "肌腱",
      "神经",
      "骨折",
      "脱臼",
      "扭伤",
      "拉伤",
      "炎症",
      "疼痛",
      "麻木",
    ];

    for (const keyword of diseaseKeywords) {
      if (aiResponse.includes(keyword) || userMessage.includes(keyword)) {
        return keyword + "相关症状";
      }
    }

    return "运动相关健康问题";
  }

  // 提取症状描述
  extractSymptoms(aiResponse, userMessage) {
    const symptomKeywords = [
      "疼痛",
      "麻木",
      "无力",
      "僵硬",
      "肿胀",
      "发热",
      "发冷",
      "头晕",
      "恶心",
      "呕吐",
      "呼吸困难",
      "心悸",
      "疲劳",
    ];

    const foundSymptoms = symptomKeywords.filter(
      (symptom) => aiResponse.includes(symptom) || userMessage.includes(symptom)
    );

    return foundSymptoms.length > 0 ? foundSymptoms.join("、") : "未明确症状";
  }

  // 提取治疗方案
  extractTreatment(aiResponse) {
    const treatmentKeywords = [
      "休息",
      "冰敷",
      "热敷",
      "按摩",
      "理疗",
      "药物",
      "手术",
      "康复训练",
      "物理治疗",
      "针灸",
      "推拿",
      "运动疗法",
    ];

    const foundTreatments = treatmentKeywords.filter((treatment) =>
      aiResponse.includes(treatment)
    );

    return foundTreatments.length > 0
      ? foundTreatments.join("、")
      : "请咨询专业医生";
  }

  // 提取严重程度
  extractSeverity(aiResponse) {
    if (
      aiResponse.includes("紧急") ||
      aiResponse.includes("立即") ||
      aiResponse.includes("马上")
    ) {
      return "紧急";
    } else if (aiResponse.includes("严重") || aiResponse.includes("重度")) {
      return "严重";
    } else if (aiResponse.includes("轻微") || aiResponse.includes("轻度")) {
      return "轻微";
    } else {
      return "中等";
    }
  }

  // 添加病史记录（供外部调用）
  addMedicalHistory(historyData) {
    try {
      const medicalHistory = JSON.parse(
        localStorage.getItem("medicalHistory") || "[]"
      );

      const historyRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        ...historyData,
      };

      medicalHistory.push(historyRecord);

      // 只保留最近100条记录
      if (medicalHistory.length > 100) {
        medicalHistory.splice(0, medicalHistory.length - 100);
      }

      localStorage.setItem("medicalHistory", JSON.stringify(medicalHistory));
      this.updateMedicalHistoryDisplay();

      console.log("✅ 病史记录已保存:", historyRecord);
    } catch (error) {
      console.error("❌ 保存病史记录失败:", error);
    }
  }
}

// 初始化医疗咨询页
document.addEventListener("DOMContentLoaded", () => {
  window.consultPage = new ConsultPage();
});
