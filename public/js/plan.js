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
    this.renderMonthlyCalendar(
      this.calendarYear,
      this.calendarMonth,
      this.lastParsedPlan
    );

    // 预置欢迎语
    const planChatBox = document.getElementById("plan-chat-box");
    if (planChatBox && !planChatBox.dataset.prefilled) {
      CommonUtils.appendChatMessage(
        planChatBox,
        "你好，我可以为你制定个人锻炼和饮食计划，还可以为你生成相应日历哦，快告诉我你的需求吧！",
        "ai"
      );
      planChatBox.dataset.prefilled = "1";
    }

    // 恢复已采用的计划
    try {
      const adopted = localStorage.getItem("adoptedPlan");
      if (adopted) {
        const parsed = JSON.parse(adopted);
        this.lastParsedPlan = parsed;
        this.renderMonthlyCalendar(
          this.calendarYear,
          this.calendarMonth,
          this.lastParsedPlan
        );
        this.renderDietFromJson(parsed);
      }
    } catch {}

    // 初始化图表
    this.initStatsChart();
    this.renderStats("weight_bmi");

    // 更新计划信息显示
    this.updatePlanInfoDisplay();

    // 启动定期检查
    this.schedulePlanUpdateCheck();

    // 检查数据完整性
    this.checkDataIntegrity();

    // 更新用户偏好和反馈记录显示
    this.updateUserPreferencesDisplay();
    this.updateExerciseFeedbackDisplay();

    // 健康状态变化弹窗逻辑
    if (localStorage.getItem("healthStatusChanged") === "1") {
      setTimeout(() => {
        const dialog = document.createElement("div");
        dialog.className = "health-change-dialog";
        dialog.innerHTML = `
            <div style="background:#fff;padding:24px 32px;border-radius:10px;box-shadow:0 2px 16px rgba(0,0,0,0.18);max-width:320px;margin:80px auto;text-align:center;">
              <h3 style="margin-bottom:16px;">检测到您的健康状态变化</h3>
              <p style="margin-bottom:24px;">是否需要变更锻炼计划？</p>
              <button id="health-change-yes" style="margin-right:16px;padding:8px 24px;background:#ff7a00;color:#fff;border:none;border-radius:4px;cursor:pointer;">是</button>
              <button id="health-change-no" style="padding:8px 24px;background:#eee;color:#333;border:none;border-radius:4px;cursor:pointer;">否</button>
            </div>
          `;
        dialog.style.cssText =
          "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;";
        document.body.appendChild(dialog);
        document.getElementById("health-change-yes").onclick = () => {
          document.body.removeChild(dialog);
          localStorage.removeItem("healthStatusChanged");
          // 自动填充输入框
          const planChatInput = document.getElementById("plan-chat-input");
          let planText = "";
          try {
            const adopted = localStorage.getItem("adoptedPlan");
            if (adopted) {
              planText = JSON.stringify(JSON.parse(adopted), null, 2);
            }
          } catch {}
          // 痊愈后自动去除输入内容中的所有病情相关描述
          if (localStorage.getItem("medicalHistory") === "[]") {
            planText = planText.replace(
              /(injured|疼痛|腰部不适|能量水平低|病史|健康状况|疾病|不适|受伤|腰痛|疲劳|低能量|慢性病|康复|恢复|诊断|症状|体征|medical|history|disease|illness|injury|pain|discomfort|fatigue|recovery|diagnosis|symptom|sign)[^\n]*\n?/gi,
              ""
            );
          }
          if (planChatInput) {
            planChatInput.value = `${planText}\n用户已完全痊愈，不需要考虑病情`;
            // 自动发送
            if (
              typeof planPage !== "undefined" &&
              planPage.handlePlanChatSend
            ) {
              planPage.handlePlanChatSend();
              // 隐藏输入内容
              planChatInput.value = "";
            }
          }
        };
        document.getElementById("health-change-no").onclick = () => {
          document.body.removeChild(dialog);
          localStorage.removeItem("healthStatusChanged");
        };
      }, 500);
    }
  }

  bindEvents() {
    // 计划聊天发送
    const planChatSend = document.getElementById("plan-chat-send");
    const planChatInput = document.getElementById("plan-chat-input");

    if (planChatSend) {
      planChatSend.addEventListener("click", () => this.handlePlanChatSend());
    }
    if (planChatInput) {
      planChatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          this.handlePlanChatSend();
        }
      });
    }

    // 月份切换按钮
    const prevBtn = document.getElementById("prev-month-btn");
    const nextBtn = document.getElementById("next-month-btn");

    if (prevBtn) {
      prevBtn.onclick = () => {
        this.calendarMonth -= 1;
        if (this.calendarMonth < 0) {
          this.calendarMonth = 11;
          this.calendarYear -= 1;
        }
        this.renderMonthlyCalendar(
          this.calendarYear,
          this.calendarMonth,
          this.lastParsedPlan
        );
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        this.calendarMonth += 1;
        if (this.calendarMonth > 11) {
          this.calendarMonth = 0;
          this.calendarYear += 1;
        }
        this.renderMonthlyCalendar(
          this.calendarYear,
          this.calendarMonth,
          this.lastParsedPlan
        );
      };
    }

    // 编辑按钮
    const editProfileBtn = document.getElementById("edit-profile-btn");
    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", () => {
        const homeBtn = document.querySelector('.nav-btn[data-target="home"]');
        if (homeBtn) homeBtn.click();
      });
    }

    // 用户信息表单
    const homeForm = document.getElementById("home-user-info-form");
    if (homeForm) {
      homeForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newUserProfile = {
          height: document.getElementById("home-height").value,
          weight: document.getElementById("home-weight").value,
          age: document.getElementById("home-age").value,
          gender: document.getElementById("home-gender").value,
          goal: document.getElementById("home-goal").value,
          frequency: document.getElementById("home-frequency").value,
          body_fat: document.getElementById("home-body_fat").value,
          metabolic_rate: document.getElementById("home-metabolic_rate").value,
          muscle_mass: document.getElementById("home-muscle_mass").value,
          medical_history: document.getElementById("home-medical_history")
            .value,
          current_medications: document.getElementById(
            "home-current_medications"
          ).value,
          allergies: document.getElementById("home-allergies").value,
          preferred_activities: Array.from(
            document.querySelectorAll(
              'input[name="home-preferred_activities"]:checked'
            )
          ).map((cb) => cb.value),
        };

        // 检测用户信息变化
        this.detectAndHandleProfileChanges(newUserProfile);

        localStorage.setItem("userProfile", JSON.stringify(newUserProfile));
        CommonUtils.updateProfileDisplay(newUserProfile);
        const planBtn = document.querySelector('.nav-btn[data-target="plan"]');
        if (planBtn) planBtn.click();
      });
    }

    // 图表切换
    const statsTabs = document.querySelectorAll(".stats-tab");
    statsTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        statsTabs.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const metric = btn.getAttribute("data-metric");
        this.renderStats(metric);
      });
    });

    // 录入表单
    const metricsForm = document.getElementById("metrics-form");
    if (metricsForm) {
      metricsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const date = document.getElementById("metrics-date").value;
        const weight = parseFloat(
          document.getElementById("metrics-weight").value
        );
        if (!date || !weight) return;
        const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        const h = profile.height ? Number(profile.height) / 100 : null;
        const bmi = h ? +(weight / (h * h)).toFixed(2) : null;
        this.metrics.entries.push({ date, weight, bmi });
        this.metrics.entries.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
        this.saveMetrics();
        const activeMetric =
          document
            .querySelector(".stats-tab.active")
            ?.getAttribute("data-metric") || "weight_bmi";
        this.renderStats(activeMetric);
      });
    }

    // 运动反馈系统
    this.bindFeedbackEvents();
  }

  loadMetrics() {
    try {
      const raw = localStorage.getItem("metrics");
      const parsed = raw ? JSON.parse(raw) : { entries: [] };
      if (!Array.isArray(parsed.entries)) parsed.entries = [];
      return parsed;
    } catch {
      return { entries: [] };
    }
  }
  saveMetrics() {
    try {
      localStorage.setItem("metrics", JSON.stringify(this.metrics));
      console.log("✅ 指标数据已保存:", this.metrics);
    } catch (error) {
      console.error("❌ 保存指标数据失败:", error);
    }
  }

  // 绑定反馈系统事件
  bindFeedbackEvents() {
    // 强度评价按钮
    const intensityBtns = document.querySelectorAll(".intensity-btn");
    intensityBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        intensityBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // 提交反馈按钮
    const submitFeedbackBtn = document.getElementById("submit-feedback-btn");
    if (submitFeedbackBtn) {
      submitFeedbackBtn.addEventListener("click", () =>
        this.submitExerciseFeedback()
      );
    }

    // 跳过反馈按钮
    const skipFeedbackBtn = document.getElementById("skip-feedback-btn");
    if (skipFeedbackBtn) {
      skipFeedbackBtn.addEventListener("click", () => this.hideFeedbackForm());
    }
  }

  // 显示反馈表单
  showFeedbackForm(exerciseData) {
    const feedbackForm = document.getElementById("exercise-feedback");
    if (feedbackForm) {
      feedbackForm.style.display = "block";
      feedbackForm.scrollIntoView({ behavior: "smooth" });
    }
  }

  // 隐藏反馈表单
  hideFeedbackForm() {
    const feedbackForm = document.getElementById("exercise-feedback");
    if (feedbackForm) {
      feedbackForm.style.display = "none";
    }
  }

  // 提交运动反馈
  submitExerciseFeedback() {
    const feedbackData = this.collectFeedbackData();
    if (!feedbackData.intensity) {
      alert("请选择运动强度评价");
      return;
    }

    // 保存反馈数据
    this.saveFeedbackData(feedbackData);

    // 根据反馈调整计划
    this.adjustPlanBasedOnFeedback(feedbackData);

    // 隐藏反馈表单
    this.hideFeedbackForm();

    alert("反馈已提交，系统将根据您的反馈调整后续计划");
  }

  // 收集反馈数据
  collectFeedbackData() {
    const intensity = document
      .querySelector(".intensity-btn.active")
      ?.getAttribute("data-intensity");
    const completion = document.querySelector(
      'input[name="completion"]:checked'
    )?.value;
    const bodyFeelings = Array.from(
      document.querySelectorAll('input[name="body_feeling"]:checked')
    ).map((cb) => cb.value);
    const adjustments = Array.from(
      document.querySelectorAll('input[name="adjustments"]:checked')
    ).map((cb) => cb.value);
    const discomfortNotes = document.getElementById("discomfort-notes").value;

    return {
      date: new Date().toISOString().split("T")[0],
      intensity: intensity ? parseInt(intensity) : null,
      completion,
      bodyFeelings,
      adjustments,
      discomfortNotes,
    };
  }

  // 保存反馈数据
  saveFeedbackData(feedbackData) {
    try {
      const existingFeedback = JSON.parse(
        localStorage.getItem("exerciseFeedback") || "[]"
      );
      existingFeedback.push(feedbackData);
      localStorage.setItem(
        "exerciseFeedback",
        JSON.stringify(existingFeedback)
      );
      console.log("✅ 反馈数据已保存:", feedbackData);
    } catch (error) {
      console.error("❌ 保存反馈数据失败:", error);
      // 尝试修复数据
      try {
        localStorage.setItem(
          "exerciseFeedback",
          JSON.stringify([feedbackData])
        );
        console.log("✅ 反馈数据已修复并保存");
      } catch (fixError) {
        console.error("❌ 修复反馈数据失败:", fixError);
      }
    }
  }

  // 根据反馈调整计划
  adjustPlanBasedOnFeedback(feedbackData) {
    const adjustments = feedbackData.adjustments || [];
    const intensity = feedbackData.intensity;
    const discomfortNotes = feedbackData.discomfortNotes;

    // 记录调整建议到用户资料中
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    if (!userProfile.feedbackHistory) {
      userProfile.feedbackHistory = [];
    }

    userProfile.feedbackHistory.push({
      date: feedbackData.date,
      adjustments,
      intensity,
      discomfortNotes,
      timestamp: new Date().toISOString(),
    });

    localStorage.setItem("userProfile", JSON.stringify(userProfile));

    // 检查是否需要更新计划
    this.checkAndUpdatePlan(feedbackData, userProfile);
  }

  // 检查并更新计划
  checkAndUpdatePlan(feedbackData, userProfile) {
    const updateNeeded = this.analyzeUpdateNeed(feedbackData, userProfile);

    if (updateNeeded.shouldUpdate) {
      this.showPlanUpdateNotification(
        updateNeeded.reason,
        updateNeeded.strategy
      );
    }
  }

  // 分析是否需要更新计划
  analyzeUpdateNeed(feedbackData, userProfile) {
    const feedbackHistory = userProfile.feedbackHistory || [];
    const recentFeedback = feedbackHistory.slice(-5); // 最近5次反馈

    // 检查强度过高
    if (feedbackData.intensity >= 4) {
      return {
        shouldUpdate: true,
        reason: "运动强度过高",
        strategy: "reduce_intensity",
      };
    }

    // 检查完成度低
    if (
      feedbackData.completion === "partial" ||
      feedbackData.completion === "not_completed"
    ) {
      return {
        shouldUpdate: true,
        reason: "计划完成度较低",
        strategy: "reduce_difficulty",
      };
    }

    // 检查不适症状
    if (feedbackData.discomfortNotes && feedbackData.discomfortNotes.trim()) {
      return {
        shouldUpdate: true,
        reason: "出现不适症状",
        strategy: "modify_exercises",
      };
    }

    // 检查连续疲劳
    const fatigueCount = recentFeedback.filter(
      (f) => f.bodyFeelings && f.bodyFeelings.includes("tired")
    ).length;

    if (fatigueCount >= 3) {
      return {
        shouldUpdate: true,
        reason: "连续疲劳反馈",
        strategy: "add_recovery",
      };
    }

    // 检查调整建议
    if (feedbackData.adjustments && feedbackData.adjustments.length > 0) {
      const hasIntensityAdjustment = feedbackData.adjustments.some(
        (adj) => adj.includes("降低强度") || adj.includes("提高强度")
      );

      if (hasIntensityAdjustment) {
        return {
          shouldUpdate: true,
          reason: "用户要求调整强度",
          strategy: "adjust_intensity",
        };
      }
    }

    return { shouldUpdate: false };
  }

  // 显示计划更新通知
  showPlanUpdateNotification(reason, strategy) {
    const notification = document.createElement("div");
    notification.className = "plan-update-notification";
    notification.innerHTML = `
            <div class="notification-content">
                <h4>📋 计划更新建议</h4>
                <p><strong>原因：</strong>${reason}</p>
                <p><strong>建议：</strong>${this.getStrategyDescription(
                  strategy
                )}</p>
                <div class="notification-actions">
                    <button class="btn btn-primary" onclick="planPage.updatePlanNow('${strategy}')">
                        立即更新计划
                    </button>
                    <button class="btn btn-secondary" onclick="planPage.dismissNotification(this)">
                        稍后提醒
                    </button>
                </div>
            </div>
        `;

    // 添加样式
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2a2c31;
            border: 1px solid #ff7a00;
            border-radius: 8px;
            padding: 20px;
            max-width: 400px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

    document.body.appendChild(notification);

    // 5秒后自动消失
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  // 获取策略描述
  getStrategyDescription(strategy) {
    const descriptions = {
      reduce_intensity: "降低运动强度，减少训练量",
      reduce_difficulty: "简化训练内容，提高完成度",
      modify_exercises: "调整运动类型，避免不适动作",
      add_recovery: "增加休息时间，安排恢复性训练",
      adjust_intensity: "根据反馈调整训练强度",
    };
    return descriptions[strategy] || "优化训练计划";
  }

  // 立即更新计划
  async updatePlanNow(strategy) {
    try {
      // 移除通知
      const notifications = document.querySelectorAll(
        ".plan-update-notification"
      );
      notifications.forEach((n) => n.remove());

      // 显示更新进度
      this.showUpdateProgress();

      // 构建更新提示词
      const updatePrompt = this.buildUpdatePrompt(strategy);

      // 调用AI生成新计划
      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: updatePrompt,
          condition: "A",
          userProfile: JSON.parse(localStorage.getItem("userProfile") || "{}"),
          customRequest: `根据反馈调整计划：${this.getStrategyDescription(
            strategy
          )}`,
        }),
      });

      const result = await response.json();

      if (result.text) {
        // 解析并显示新计划
        const parsed = await this.parsePlanText(result.text);
        this.renderPlanFromJson(parsed);

        // 保存计划版本
        this.savePlanVersion(parsed, strategy);

        // 显示成功消息
        this.showUpdateSuccess();
      }
    } catch (error) {
      console.error("更新计划失败:", error);
      alert("更新计划失败，请重试");
    }
  }

  // 构建更新提示词
  buildUpdatePrompt(strategy) {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    const feedbackHistory = userProfile.feedbackHistory || [];
    let recentFeedback = feedbackHistory.slice(-3);
    // 痊愈后自动清空 recentFeedback 中的所有病情相关字段
    if (localStorage.getItem("medicalHistory") === "[]") {
      recentFeedback = recentFeedback.map((fb) => ({
        ...fb,
        discomfortNotes: "",
        bodyFeelings: [],
        adjustments: [],
      }));
    }

    let prompt = `请根据用户反馈调整现有的健身计划。\n\n`;
    prompt += `用户基本信息：\n`;
    prompt += `- 身高: ${userProfile.height || "未知"} cm\n`;
    prompt += `- 体重: ${userProfile.weight || "未知"} kg\n`;
    prompt += `- 目标: ${userProfile.goal || "未知"}\n\n`;

    prompt += `最近反馈记录：\n`;
    if (localStorage.getItem("medicalHistory") === "[]") {
      // 痊愈后不显示任何反馈、调整建议、病情信息
      prompt += `用户已完全痊愈，不需要考虑病情。\n`;
    } else {
      recentFeedback.forEach((feedback) => {
        prompt += `- ${feedback.date}: 强度${feedback.intensity}/5, 完成度: ${feedback.completion}\n`;
        if (feedback.adjustments && feedback.adjustments.length > 0) {
          prompt += `  调整建议: ${feedback.adjustments.join(", ")}\n`;
        }
        if (feedback.discomfortNotes) {
          prompt += `  不适症状: ${feedback.discomfortNotes}\n`;
        }
      });
    }
    prompt += `\n调整策略: ${
      localStorage.getItem("medicalHistory") === "[]"
        ? "无"
        : this.getStrategyDescription(strategy)
    }\n\n`;
    prompt += `请生成调整后的健身计划，保持原有的计划结构，但根据反馈进行适当调整。`;

    return prompt;
  }

  // 保存计划版本
  savePlanVersion(plan, strategy) {
    const planHistory = JSON.parse(localStorage.getItem("planHistory") || "[]");
    const version = {
      id: Date.now(),
      plan: plan,
      strategy: strategy,
      timestamp: new Date().toISOString(),
      reason: this.getStrategyDescription(strategy),
    };

    planHistory.push(version);

    // 只保留最近10个版本
    if (planHistory.length > 10) {
      planHistory.splice(0, planHistory.length - 10);
    }

    localStorage.setItem("planHistory", JSON.stringify(planHistory));

    // 更新当前计划
    localStorage.setItem("adoptedPlan", JSON.stringify(plan));

    // 记录最后更新时间
    localStorage.setItem("lastPlanUpdate", new Date().toISOString());

    // 更新计划信息显示
    this.updatePlanInfoDisplay();
  }

  // 显示更新进度
  showUpdateProgress() {
    const progress = document.createElement("div");
    progress.id = "update-progress";
    progress.innerHTML = `
            <div class="progress-content">
                <div class="spinner"></div>
                <p>正在更新计划...</p>
            </div>
        `;
    progress.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2a2c31;
            border: 1px solid #ff7a00;
            border-radius: 8px;
            padding: 30px;
            z-index: 1001;
            text-align: center;
        `;

    document.body.appendChild(progress);
  }

  // 显示更新成功
  showUpdateSuccess() {
    const progress = document.getElementById("update-progress");
    if (progress) {
      progress.remove();
    }

    const success = document.createElement("div");
    success.innerHTML = `
            <div class="success-content">
                <h4>✅ 计划更新成功</h4>
                <p>您的健身计划已根据反馈进行调整</p>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                    确定
                </button>
            </div>
        `;
    success.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2a2c31;
            border: 1px solid #4caf50;
            border-radius: 8px;
            padding: 30px;
            z-index: 1001;
            text-align: center;
        `;

    document.body.appendChild(success);

    setTimeout(() => {
      if (success.parentNode) {
        success.remove();
      }
    }, 3000);
  }

  // 关闭通知
  dismissNotification(button) {
    const notification = button.closest(".plan-update-notification");
    if (notification) {
      notification.remove();
    }
  }

  // 显示计划版本历史
  showPlanHistory() {
    const planHistory = JSON.parse(localStorage.getItem("planHistory") || "[]");

    if (planHistory.length === 0) {
      alert("暂无计划版本历史");
      return;
    }

    const historyModal = document.createElement("div");
    historyModal.className = "plan-history-modal";
    historyModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📋 计划版本历史</h3>
                    <button class="close-btn" onclick="this.closest('.plan-history-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="version-list">
                        ${planHistory
                          .map(
                            (version, index) => `
                            <div class="version-item ${
                              index === planHistory.length - 1 ? "current" : ""
                            }">
                                <div class="version-info">
                                    <h4>版本 ${planHistory.length - index}</h4>
                                    <p class="version-date">${new Date(
                                      version.timestamp
                                    ).toLocaleString()}</p>
                                    <p class="version-reason">${
                                      version.reason
                                    }</p>
                                </div>
                                <div class="version-actions">
                                    <button class="btn btn-sm btn-primary" onclick="planPage.restorePlanVersion(${
                                      version.id
                                    })">
                                        恢复此版本
                                    </button>
                                    <button class="btn btn-sm btn-secondary" onclick="planPage.viewPlanVersion(${
                                      version.id
                                    })">
                                        查看详情
                                    </button>
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;

    // 添加样式
    historyModal.style.cssText = `
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

    const modalContent = historyModal.querySelector(".modal-content");
    modalContent.style.cssText = `
            background: #2a2c31;
            border: 1px solid #ff7a00;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            width: 90%;
        `;

    document.body.appendChild(historyModal);
  }

  // 恢复计划版本
  restorePlanVersion(versionId) {
    const planHistory = JSON.parse(localStorage.getItem("planHistory") || "[]");
    const version = planHistory.find((v) => v.id === versionId);

    if (!version) {
      alert("版本不存在");
      return;
    }

    if (
      confirm(
        `确定要恢复到此版本吗？\n\n版本信息：\n- 时间：${new Date(
          version.timestamp
        ).toLocaleString()}\n- 原因：${version.reason}`
      )
    ) {
      // 恢复计划
      localStorage.setItem("adoptedPlan", JSON.stringify(version.plan));

      // 重新渲染计划
      this.renderPlanFromJson(version.plan);

      // 关闭模态框
      const modal = document.querySelector(".plan-history-modal");
      if (modal) {
        modal.remove();
      }

      alert("计划已恢复到指定版本");
    }
  }

  // 查看计划版本详情
  viewPlanVersion(versionId) {
    const planHistory = JSON.parse(localStorage.getItem("planHistory") || "[]");
    const version = planHistory.find((v) => v.id === versionId);

    if (!version) {
      alert("版本不存在");
      return;
    }

    const detailModal = document.createElement("div");
    detailModal.className = "plan-detail-modal";
    detailModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📋 计划版本详情</h3>
                    <button class="close-btn" onclick="this.closest('.plan-detail-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="version-details">
                        <p><strong>版本时间：</strong>${new Date(
                          version.timestamp
                        ).toLocaleString()}</p>
                        <p><strong>更新原因：</strong>${version.reason}</p>
                        <p><strong>调整策略：</strong>${version.strategy}</p>
                    </div>
                    <div class="plan-preview">
                        <h4>计划预览：</h4>
                        <div class="plan-content">
                            ${this.formatPlanForPreview(version.plan)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="planPage.restorePlanVersion(${
                      version.id
                    }); this.closest('.plan-detail-modal').remove();">
                        恢复此版本
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.plan-detail-modal').remove()">
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
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            width: 90%;
        `;

    document.body.appendChild(detailModal);
  }

  // 格式化计划用于预览
  formatPlanForPreview(plan) {
    if (!plan) return "<p>无计划内容</p>";

    let html = "";

    if (plan.workoutPlan) {
      html += "<h5>🏃 训练计划：</h5>";
      html += '<div class="workout-preview">';
      Object.keys(plan.workoutPlan).forEach((day) => {
        html += `<div class="day-plan"><strong>${day}：</strong>${plan.workoutPlan[day]}</div>`;
      });
      html += "</div>";
    }

    if (plan.dietPlan) {
      html += "<h5>🍎 饮食计划：</h5>";
      html += '<div class="diet-preview">';
      Object.keys(plan.dietPlan).forEach((meal) => {
        html += `<div class="meal-plan"><strong>${meal}：</strong>${plan.dietPlan[meal]}</div>`;
      });
      html += "</div>";
    }

    return html || "<p>计划内容为空</p>";
  }

  // 自动检查计划更新（定期调用）
  schedulePlanUpdateCheck() {
    // 每天检查一次是否需要更新计划
    setInterval(() => {
      this.checkScheduledPlanUpdate();
    }, 24 * 60 * 60 * 1000); // 24小时
  }

  // 检查定期计划更新
  checkScheduledPlanUpdate() {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    const feedbackHistory = userProfile.feedbackHistory || [];

    if (feedbackHistory.length === 0) return;

    // 检查是否需要定期更新
    const lastUpdate = localStorage.getItem("lastPlanUpdate");
    const daysSinceUpdate = lastUpdate
      ? (Date.now() - new Date(lastUpdate).getTime()) / (24 * 60 * 60 * 1000)
      : 999;

    // 如果超过7天没有更新，且有一定数量的反馈，建议更新
    if (daysSinceUpdate >= 7 && feedbackHistory.length >= 3) {
      this.showPlanUpdateNotification("定期计划优化", "optimize_plan");
    }
  }

  // 导出计划数据
  exportPlanData() {
    try {
      const adoptedPlan = JSON.parse(
        localStorage.getItem("adoptedPlan") || "{}"
      );
      const planHistory = JSON.parse(
        localStorage.getItem("planHistory") || "[]"
      );
      const userProfile = JSON.parse(
        localStorage.getItem("userProfile") || "{}"
      );

      const exportData = {
        currentPlan: adoptedPlan,
        planHistory: planHistory,
        userProfile: {
          height: userProfile.height,
          weight: userProfile.weight,
          age: userProfile.age,
          gender: userProfile.gender,
          goal: userProfile.goal,
          frequency: userProfile.frequency,
        },
        feedbackHistory: userProfile.feedbackHistory || [],
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `fitness-plan-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("计划数据导出成功！");
    } catch (error) {
      console.error("导出计划数据失败:", error);
      alert("导出计划数据失败，请重试");
    }
  }

  // 更新计划信息显示
  updatePlanInfoDisplay() {
    const adoptedPlan = JSON.parse(localStorage.getItem("adoptedPlan") || "{}");
    const planHistory = JSON.parse(localStorage.getItem("planHistory") || "[]");

    const currentPlanInfo = document.getElementById("current-plan-info");
    const lastUpdateInfo = document.getElementById("last-update-info");

    if (currentPlanInfo) {
      if (Object.keys(adoptedPlan).length > 0) {
        currentPlanInfo.textContent = "当前计划：已采用";
        currentPlanInfo.style.color = "#4caf50";
      } else {
        currentPlanInfo.textContent = "当前计划：无";
        currentPlanInfo.style.color = "#ff9800";
      }
    }

    if (lastUpdateInfo) {
      if (planHistory.length > 0) {
        const lastVersion = planHistory[planHistory.length - 1];
        const updateDate = new Date(lastVersion.timestamp).toLocaleDateString();
        lastUpdateInfo.textContent = `最后更新：${updateDate}`;
        lastUpdateInfo.style.color = "#4caf50";
      } else {
        lastUpdateInfo.textContent = "最后更新：无";
        lastUpdateInfo.style.color = "#ff9800";
      }
    }
  }

  // 检测并处理用户信息变化
  detectAndHandleProfileChanges(newProfile) {
    const oldProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    const changes = this.detectProfileChanges(oldProfile, newProfile);

    if (changes.length > 0) {
      // 保存变化记录
      this.saveProfileChanges(changes, oldProfile, newProfile);

      // 检查是否有现有计划
      const adoptedPlan = JSON.parse(
        localStorage.getItem("adoptedPlan") || "{}"
      );
      if (Object.keys(adoptedPlan).length > 0) {
        // 延迟显示通知，确保页面切换完成
        setTimeout(() => {
          this.showProfileChangeNotification(changes);
        }, 1000);
      }
    }
  }

  // 检测用户信息变化
  detectProfileChanges(oldProfile, newProfile) {
    const changes = [];
    const importantFields = [
      "height",
      "weight",
      "age",
      "gender",
      "goal",
      "frequency",
    ];
    const healthFields = [
      "body_fat",
      "metabolic_rate",
      "muscle_mass",
      "medical_history",
      "current_medications",
      "allergies",
    ];

    // 检查重要字段变化
    importantFields.forEach((field) => {
      if (oldProfile[field] !== newProfile[field] && newProfile[field]) {
        changes.push({
          field: field,
          oldValue: oldProfile[field],
          newValue: newProfile[field],
          type: "important",
          description: this.getFieldDescription(field),
        });
      }
    });

    // 检查健康字段变化
    healthFields.forEach((field) => {
      if (oldProfile[field] !== newProfile[field] && newProfile[field]) {
        changes.push({
          field: field,
          oldValue: oldProfile[field],
          newValue: newProfile[field],
          type: "health",
          description: this.getFieldDescription(field),
        });
      }
    });

    // 检查运动偏好变化
    const oldActivities = oldProfile.preferred_activities || [];
    const newActivities = newProfile.preferred_activities || [];
    if (
      JSON.stringify(oldActivities.sort()) !==
      JSON.stringify(newActivities.sort())
    ) {
      changes.push({
        field: "preferred_activities",
        oldValue: oldActivities,
        newValue: newActivities,
        type: "preference",
        description: "运动偏好",
      });
    }

    return changes;
  }

  // 获取字段描述
  getFieldDescription(field) {
    const descriptions = {
      height: "身高",
      weight: "体重",
      age: "年龄",
      gender: "性别",
      goal: "健身目标",
      frequency: "锻炼频率",
      body_fat: "体脂率",
      metabolic_rate: "基础代谢率",
      muscle_mass: "肌肉量",
      medical_history: "过往病史",
      current_medications: "当前用药",
      allergies: "过敏史",
    };
    return descriptions[field] || field;
  }

  // 保存用户信息变化记录
  saveProfileChanges(changes, oldProfile, newProfile) {
    const changeRecord = {
      timestamp: new Date().toISOString(),
      changes: changes,
      oldProfile: oldProfile,
      newProfile: newProfile,
    };

    const profileChangeHistory = JSON.parse(
      localStorage.getItem("profileChangeHistory") || "[]"
    );
    profileChangeHistory.push(changeRecord);

    // 只保留最近20次变化记录
    if (profileChangeHistory.length > 20) {
      profileChangeHistory.splice(0, profileChangeHistory.length - 20);
    }

    localStorage.setItem(
      "profileChangeHistory",
      JSON.stringify(profileChangeHistory)
    );
  }

  // 显示用户信息变化通知
  showProfileChangeNotification(changes) {
    const notification = document.createElement("div");
    notification.className = "profile-change-notification";

    const importantChanges = changes.filter((c) => c.type === "important");
    const healthChanges = changes.filter((c) => c.type === "health");
    const preferenceChanges = changes.filter((c) => c.type === "preference");

    let changeSummary = "";
    if (importantChanges.length > 0) {
      changeSummary += `<strong>重要信息变化：</strong><br>`;
      importantChanges.forEach((change) => {
        changeSummary += `• ${change.description}: ${
          change.oldValue || "无"
        } → ${change.newValue}<br>`;
      });
    }

    if (healthChanges.length > 0) {
      changeSummary += `<strong>健康信息变化：</strong><br>`;
      healthChanges.forEach((change) => {
        changeSummary += `• ${change.description}: ${
          change.oldValue || "无"
        } → ${change.newValue}<br>`;
      });
    }

    if (preferenceChanges.length > 0) {
      changeSummary += `<strong>偏好变化：</strong><br>`;
      preferenceChanges.forEach((change) => {
        const oldPrefs =
          change.oldValue.length > 0 ? change.oldValue.join(", ") : "无";
        const newPrefs =
          change.newValue.length > 0 ? change.newValue.join(", ") : "无";
        changeSummary += `• ${change.description}: ${oldPrefs} → ${newPrefs}<br>`;
      });
    }

    notification.innerHTML = `
            <div class="notification-content">
                <h4>🔄 检测到用户信息变化</h4>
                <div class="change-summary">
                    ${changeSummary}
                </div>
                <p class="notification-message">您的健身计划可能需要根据新的信息进行调整。</p>
                <div class="notification-actions">
                    <button class="btn btn-primary" onclick="planPage.updatePlanForProfileChanges()">
                        🔄 更新计划
                    </button>
                    <button class="btn btn-secondary" onclick="planPage.dismissProfileChangeNotification(this)">
                        稍后处理
                    </button>
                </div>
            </div>
        `;

    // 添加样式
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2a2c31;
            border: 1px solid #4caf50;
            border-radius: 8px;
            padding: 20px;
            max-width: 450px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease-out;
        `;

    document.body.appendChild(notification);

    // 15秒后自动消失
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 15000);
  }

  // 根据用户信息变化更新计划
  async updatePlanForProfileChanges() {
    try {
      // 移除通知
      const notifications = document.querySelectorAll(
        ".profile-change-notification"
      );
      notifications.forEach((n) => n.remove());

      // 显示更新进度
      this.showUpdateProgress();

      // 构建基于用户信息变化的更新提示词
      const updatePrompt = this.buildProfileChangeUpdatePrompt();

      // 调用A服务生成新计划
      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: updatePrompt,
          condition: "A",
          userProfile: JSON.parse(localStorage.getItem("userProfile") || "{}"),
          customRequest: "根据用户信息变化更新健身计划",
        }),
      });

      const result = await response.json();

      if (result.text) {
        // 解析并显示新计划
        const parsed = await this.parsePlanText(result.text);
        this.renderPlanFromJson(parsed);

        // 保存计划版本
        this.savePlanVersion(parsed, "profile_change");

        // 显示成功消息
        this.showUpdateSuccess();
      }
    } catch (error) {
      console.error("根据用户信息变化更新计划失败:", error);
      alert("更新计划失败，请重试");
    }
  }

  // 构建基于用户信息变化的更新提示词
  buildProfileChangeUpdatePrompt() {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    let medicalHistoryArr = JSON.parse(
      localStorage.getItem("medicalHistory") || "[]"
    );
    // 痊愈后彻底清空 userProfile.medical_history 字段，防止任何地方残留
    if (Array.isArray(medicalHistoryArr) && medicalHistoryArr.length === 0) {
      userProfile.medical_history = "";
      localStorage.setItem("userProfile", JSON.stringify(userProfile));
    }
    const profileChangeHistory = JSON.parse(
      localStorage.getItem("profileChangeHistory") || "[]"
    );
    const latestChanges = profileChangeHistory[profileChangeHistory.length - 1];

    let prompt = `请根据用户信息变化更新现有的健身计划。\n\n`;
    prompt += `用户当前信息：\n`;
    prompt += `- 身高: ${userProfile.height || "未知"} cm\n`;
    prompt += `- 体重: ${userProfile.weight || "未知"} kg\n`;
    prompt += `- 年龄: ${userProfile.age || "未知"} 岁\n`;
    prompt += `- 性别: ${
      userProfile.gender === "male"
        ? "男性"
        : userProfile.gender === "female"
        ? "女性"
        : "未知"
    }\n`;
    prompt += `- 目标: ${userProfile.goal || "未知"}\n`;
    prompt += `- 锻炼频率: ${userProfile.frequency || "未知"}\n`;

    if (userProfile.body_fat) {
      prompt += `- 体脂率: ${userProfile.body_fat}%\n`;
    }
    if (userProfile.metabolic_rate) {
      prompt += `- 基础代谢率: ${userProfile.metabolic_rate} kcal/天\n`;
    }
    if (userProfile.muscle_mass) {
      prompt += `- 肌肉量: ${userProfile.muscle_mass} kg\n`;
    }
    // 痊愈后 medicalHistory 为空时彻底屏蔽病史内容，无论 userProfile.medical_history 字段内容如何
    // 痊愈后彻底屏蔽病史内容，无论 userProfile.medical_history 字段内容如何
    if (
      Array.isArray(medicalHistoryArr) &&
      medicalHistoryArr.length > 0 &&
      userProfile.medical_history &&
      userProfile.medical_history.trim()
    ) {
      prompt += `- 过往病史: ${userProfile.medical_history}\n`;
    } else if (
      Array.isArray(medicalHistoryArr) &&
      medicalHistoryArr.length === 0
    ) {
      // 痊愈后不显示病史
    }
    if (
      userProfile.preferred_activities &&
      userProfile.preferred_activities.length > 0
    ) {
      prompt += `- 运动偏好: ${userProfile.preferred_activities.join(", ")}\n`;
    }

    if (latestChanges && latestChanges.changes) {
      prompt += `\n最近信息变化：\n`;
      latestChanges.changes.forEach((change) => {
        prompt += `- ${change.description}: ${change.oldValue || "无"} → ${
          change.newValue
        }\n`;
      });
    }

    prompt += `\n请根据以上更新的用户信息，重新制定适合的健身和饮食计划。`;

    return prompt;
  }

  // 关闭用户信息变化通知
  dismissProfileChangeNotification(button) {
    const notification = button.closest(".profile-change-notification");
    if (notification) {
      notification.remove();
    }
  }

  // 显示用户信息变化历史
  showProfileChangeHistory() {
    const profileChangeHistory = JSON.parse(
      localStorage.getItem("profileChangeHistory") || "[]"
    );

    if (profileChangeHistory.length === 0) {
      alert("暂无用户信息变化记录");
      return;
    }

    const historyModal = document.createElement("div");
    historyModal.className = "profile-change-history-modal";
    historyModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📊 用户信息变化历史</h3>
                    <button class="close-btn" onclick="this.closest('.profile-change-history-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="change-history-list">
                        ${profileChangeHistory
                          .map(
                            (record, index) => `
                            <div class="change-record">
                                <div class="change-header">
                                    <h4>变化记录 ${
                                      profileChangeHistory.length - index
                                    }</h4>
                                    <span class="change-date">${new Date(
                                      record.timestamp
                                    ).toLocaleString()}</span>
                                </div>
                                <div class="change-details">
                                    ${record.changes
                                      .map(
                                        (change) => `
                                        <div class="change-item">
                                            <span class="change-field">${
                                              change.description
                                            }:</span>
                                            <span class="change-values">
                                                ${change.oldValue || "无"} → ${
                                          change.newValue
                                        }
                                            </span>
                                            <span class="change-type ${
                                              change.type
                                            }">${this.getChangeTypeLabel(
                                          change.type
                                        )}</span>
                                        </div>
                                    `
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;

    // 添加样式
    historyModal.style.cssText = `
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

    const modalContent = historyModal.querySelector(".modal-content");
    modalContent.style.cssText = `
            background: #2a2c31;
            border: 1px solid #4caf50;
            border-radius: 8px;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            width: 90%;
        `;

    document.body.appendChild(historyModal);
  }

  // 获取变化类型标签
  getChangeTypeLabel(type) {
    const labels = {
      important: "重要",
      health: "健康",
      preference: "偏好",
    };
    return labels[type] || type;
  }

  // 数据诊断和修复工具
  diagnoseAndFixData() {
    console.log("=== 数据诊断开始 ===");

    // 检查所有关键数据
    const dataKeys = [
      "userProfile",
      "metrics",
      "exerciseFeedback",
      "completedDays",
      "adoptedPlan",
      "adoptedRoute",
      "planHistory",
      "profileChangeHistory",
      "medicalConsultations",
      "medicalHistory",
    ];

    const dataStatus = {};
    let hasIssues = false;

    dataKeys.forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          dataStatus[key] = {
            exists: true,
            type: Array.isArray(parsed) ? "array" : typeof parsed,
            size: Array.isArray(parsed)
              ? parsed.length
              : Object.keys(parsed).length,
            data: parsed,
          };
        } else {
          dataStatus[key] = {
            exists: false,
            type: "null",
            size: 0,
            data: null,
          };
          hasIssues = true;
        }
      } catch (error) {
        dataStatus[key] = {
          exists: false,
          type: "error",
          size: 0,
          error: error.message,
          data: null,
        };
        hasIssues = true;
      }
    });

    console.log("数据状态:", dataStatus);

    if (hasIssues) {
      this.showDataDiagnosticModal(dataStatus);
    } else {
      alert("✅ 所有数据正常！");
    }

    return dataStatus;
  }

  // 显示数据诊断模态框
  showDataDiagnosticModal(dataStatus) {
    const modal = document.createElement("div");
    modal.className = "data-diagnostic-modal";

    let diagnosticHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔧 数据诊断结果</h3>
                    <button class="close-btn" onclick="this.closest('.data-diagnostic-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="diagnostic-summary">
                        <h4>数据状态概览</h4>
                        <div class="data-status-list">
        `;

    Object.keys(dataStatus).forEach((key) => {
      const status = dataStatus[key];
      const statusClass = status.exists ? "status-ok" : "status-error";
      const statusIcon = status.exists ? "✅" : "❌";

      diagnosticHTML += `
                <div class="data-status-item ${statusClass}">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="data-key">${key}:</span>
                    <span class="data-info">
                        ${
                          status.exists
                            ? `${status.type} (${status.size} 项)`
                            : status.error
                            ? `错误: ${status.error}`
                            : "缺失"
                        }
                    </span>
                </div>
            `;
    });

    diagnosticHTML += `
                        </div>
                    </div>
                    <div class="diagnostic-actions">
                        <button class="btn btn-primary" onclick="planPage.fixDataIssues()">
                            🔧 修复数据问题
                        </button>
                        <button class="btn btn-secondary" onclick="planPage.exportAllData()">
                            💾 导出所有数据
                        </button>
                        <button class="btn btn-secondary" onclick="planPage.clearAllData()">
                            🗑️ 清空所有数据
                        </button>
                    </div>
                </div>
            </div>
        `;

    modal.innerHTML = diagnosticHTML;

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
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            width: 90%;
        `;

    document.body.appendChild(modal);
  }

  // 修复数据问题
  fixDataIssues() {
    try {
      // 修复缺失的数据结构
      const defaultData = {
        userProfile: {},
        metrics: { entries: [] },
        exerciseFeedback: [],
        completedDays: {},
        adoptedPlan: {},
        adoptedRoute: {},
        planHistory: [],
        profileChangeHistory: [],
        medicalConsultations: [],
        medicalHistory: [],
      };

      Object.keys(defaultData).forEach((key) => {
        const existing = localStorage.getItem(key);
        if (!existing) {
          localStorage.setItem(key, JSON.stringify(defaultData[key]));
          console.log(`修复缺失数据: ${key}`);
        } else {
          try {
            JSON.parse(existing);
          } catch (error) {
            localStorage.setItem(key, JSON.stringify(defaultData[key]));
            console.log(`修复损坏数据: ${key}`);
          }
        }
      });

      // 关闭模态框
      const modal = document.querySelector(".data-diagnostic-modal");
      if (modal) {
        modal.remove();
      }

      alert("✅ 数据修复完成！页面将刷新以应用修复。");
      window.location.reload();
    } catch (error) {
      console.error("修复数据失败:", error);
      alert("❌ 修复数据失败: " + error.message);
    }
  }

  // 导出所有数据
  exportAllData() {
    try {
      const allData = {};
      const dataKeys = [
        "userProfile",
        "metrics",
        "exerciseFeedback",
        "completedDays",
        "adoptedPlan",
        "adoptedRoute",
        "planHistory",
        "profileChangeHistory",
        "medicalConsultations",
        "medicalHistory",
      ];

      dataKeys.forEach((key) => {
        const data = localStorage.getItem(key);
        if (data) {
          allData[key] = JSON.parse(data);
        } else {
          allData[key] = null;
        }
      });

      allData.exportDate = new Date().toISOString();
      allData.version = "1.0";
      allData.diagnostic = true;

      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `fitness-data-diagnostic-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("✅ 诊断数据导出成功！");
    } catch (error) {
      console.error("导出诊断数据失败:", error);
      alert("❌ 导出诊断数据失败: " + error.message);
    }
  }

  // 清空所有数据
  clearAllData() {
    if (confirm("⚠️ 确定要清空所有数据吗？此操作不可恢复！")) {
      try {
        const dataKeys = [
          "userProfile",
          "metrics",
          "exerciseFeedback",
          "completedDays",
          "adoptedPlan",
          "adoptedRoute",
          "planHistory",
          "profileChangeHistory",
          "medicalConsultations",
          "medicalHistory",
        ];

        dataKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        // 关闭模态框
        const modal = document.querySelector(".data-diagnostic-modal");
        if (modal) {
          modal.remove();
        }

        alert("✅ 所有数据已清空！页面将刷新。");
        window.location.reload();
      } catch (error) {
        console.error("清空数据失败:", error);
        alert("❌ 清空数据失败: " + error.message);
      }
    }
  }

  // 强制保存所有数据
  forceSaveAllData() {
    try {
      // 保存用户资料
      const userProfile = JSON.parse(
        localStorage.getItem("userProfile") || "{}"
      );
      localStorage.setItem("userProfile", JSON.stringify(userProfile));

      // 保存指标数据
      const metrics = JSON.parse(
        localStorage.getItem("metrics") || '{"entries":[]}'
      );
      localStorage.setItem("metrics", JSON.stringify(metrics));

      // 保存反馈数据
      const exerciseFeedback = JSON.parse(
        localStorage.getItem("exerciseFeedback") || "[]"
      );
      localStorage.setItem(
        "exerciseFeedback",
        JSON.stringify(exerciseFeedback)
      );

      // 保存完成天数
      const completedDays = JSON.parse(
        localStorage.getItem("completedDays") || "{}"
      );
      localStorage.setItem("completedDays", JSON.stringify(completedDays));

      // 保存已采用计划
      const adoptedPlan = JSON.parse(
        localStorage.getItem("adoptedPlan") || "{}"
      );
      localStorage.setItem("adoptedPlan", JSON.stringify(adoptedPlan));

      // 保存已采用路线
      const adoptedRoute = JSON.parse(
        localStorage.getItem("adoptedRoute") || "{}"
      );
      localStorage.setItem("adoptedRoute", JSON.stringify(adoptedRoute));

      // 保存计划历史
      const planHistory = JSON.parse(
        localStorage.getItem("planHistory") || "[]"
      );
      localStorage.setItem("planHistory", JSON.stringify(planHistory));

      // 保存用户信息变化历史
      const profileChangeHistory = JSON.parse(
        localStorage.getItem("profileChangeHistory") || "[]"
      );
      localStorage.setItem(
        "profileChangeHistory",
        JSON.stringify(profileChangeHistory)
      );

      // 保存医疗咨询记录
      const medicalConsultations = JSON.parse(
        localStorage.getItem("medicalConsultations") || "[]"
      );
      localStorage.setItem(
        "medicalConsultations",
        JSON.stringify(medicalConsultations)
      );

      // 保存病史记录
      const medicalHistory = JSON.parse(
        localStorage.getItem("medicalHistory") || "[]"
      );
      localStorage.setItem("medicalHistory", JSON.stringify(medicalHistory));

      console.log("✅ 所有数据已强制保存");
      alert("✅ 所有数据已强制保存！");
    } catch (error) {
      console.error("强制保存数据失败:", error);
      alert("❌ 强制保存数据失败: " + error.message);
    }
  }

  // 检查数据完整性
  checkDataIntegrity() {
    console.log("=== 检查数据完整性 ===");

    const dataKeys = [
      "userProfile",
      "metrics",
      "exerciseFeedback",
      "completedDays",
      "adoptedPlan",
      "adoptedRoute",
      "planHistory",
      "profileChangeHistory",
      "medicalConsultations",
      "medicalHistory",
    ];

    let hasIssues = false;
    const issues = [];

    dataKeys.forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (!data) {
          hasIssues = true;
          issues.push(`${key}: 数据缺失`);
        } else {
          JSON.parse(data);
          console.log(`✅ ${key}: 数据正常`);
        }
      } catch (error) {
        hasIssues = true;
        issues.push(`${key}: 数据损坏 (${error.message})`);
      }
    });

    if (hasIssues) {
      console.warn("⚠️ 发现数据问题:", issues);
      // 不自动修复，让用户手动选择
    } else {
      console.log("✅ 所有数据完整性检查通过");
    }

    return !hasIssues;
  }

  // 更新用户偏好记录显示
  updateUserPreferencesDisplay() {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    const preferences = userProfile.preferences || [];

    const countElement = document.getElementById("preferences-count");
    const lastElement = document.getElementById("last-preference");

    if (countElement) {
      countElement.textContent = `偏好记录：${preferences.length} 条`;
      countElement.style.color = preferences.length > 0 ? "#4caf50" : "#ff9800";
    }

    if (lastElement && preferences.length > 0) {
      const lastPreference = preferences[preferences.length - 1];
      lastElement.textContent = `最后偏好：${lastPreference.date || "未知"}`;
      lastElement.style.color = "#4caf50";
    } else if (lastElement) {
      lastElement.textContent = "最后偏好：无";
      lastElement.style.color = "#ff9800";
    }
  }

  // 更新运动反馈记录显示
  updateExerciseFeedbackDisplay() {
    const exerciseFeedback = JSON.parse(
      localStorage.getItem("exerciseFeedback") || "[]"
    );

    const countElement = document.getElementById("feedback-count");
    const lastElement = document.getElementById("last-feedback");

    if (countElement) {
      countElement.textContent = `反馈记录：${exerciseFeedback.length} 条`;
      countElement.style.color =
        exerciseFeedback.length > 0 ? "#4caf50" : "#ff9800";
    }

    if (lastElement && exerciseFeedback.length > 0) {
      const lastFeedback = exerciseFeedback[exerciseFeedback.length - 1];
      lastElement.textContent = `最后反馈：${lastFeedback.date || "未知"}`;
      lastElement.style.color = "#4caf50";
    } else if (lastElement) {
      lastElement.textContent = "最后反馈：无";
      lastElement.style.color = "#ff9800";
    }
  }

  // 显示用户偏好记录
  showUserPreferences() {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    const preferences = userProfile.preferences || [];

    if (preferences.length === 0) {
      alert("暂无用户偏好记录");
      return;
    }

    const modal = document.createElement("div");
    modal.className = "preferences-modal";

    let preferencesHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎯 用户偏好记录</h3>
                    <button class="close-btn" onclick="this.closest('.preferences-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="preferences-list">
        `;

    preferences.forEach((preference, index) => {
      preferencesHTML += `
                <div class="preference-item">
                    <div class="preference-header">
                        <span class="preference-date">${
                          preference.date || "未知日期"
                        }</span>
                        <div class="preference-actions">
                            <button class="btn btn-sm btn-secondary" onclick="planPage.viewPreferenceDetail(${index})">
                                查看详情
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="planPage.deletePreference(${index})">
                                删除
                            </button>
                        </div>
                    </div>
                    <div class="preference-preview">
                        <strong>类型：</strong>${preference.type || "未知"}
                        <br><strong>内容：</strong>${(
                          preference.content || ""
                        ).substring(0, 100)}${
        (preference.content || "").length > 100 ? "..." : ""
      }
                    </div>
                </div>
            `;
    });

    preferencesHTML += `
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="planPage.exportUserPreferences()">
                        💾 导出偏好记录
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.preferences-modal').remove()">
                        关闭
                    </button>
                </div>
            </div>
        `;

    modal.innerHTML = preferencesHTML;

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

  // 显示运动反馈记录
  showExerciseFeedback() {
    const exerciseFeedback = JSON.parse(
      localStorage.getItem("exerciseFeedback") || "[]"
    );

    if (exerciseFeedback.length === 0) {
      alert("暂无运动反馈记录");
      return;
    }

    const modal = document.createElement("div");
    modal.className = "feedback-modal";

    let feedbackHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💪 运动反馈记录</h3>
                    <button class="close-btn" onclick="this.closest('.feedback-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="feedback-list">
        `;

    exerciseFeedback.forEach((feedback, index) => {
      feedbackHTML += `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <span class="feedback-date">${
                          feedback.date || "未知日期"
                        }</span>
                        <div class="feedback-actions">
                            <button class="btn btn-sm btn-secondary" onclick="planPage.viewFeedbackDetail(${index})">
                                查看详情
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="planPage.deleteFeedback(${index})">
                                删除
                            </button>
                        </div>
                    </div>
                    <div class="feedback-preview">
                        <strong>强度：</strong>${feedback.intensity || "未知"}/5
                        <br><strong>完成度：</strong>${
                          feedback.completion || "未知"
                        }%
                        <br><strong>身体感受：</strong>${(
                          feedback.bodyFeelings || ""
                        ).substring(0, 50)}${
        (feedback.bodyFeelings || "").length > 50 ? "..." : ""
      }
                    </div>
                </div>
            `;
    });

    feedbackHTML += `
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="planPage.exportExerciseFeedback()">
                        💾 导出反馈记录
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.feedback-modal').remove()">
                        关闭
                    </button>
                </div>
            </div>
        `;

    modal.innerHTML = feedbackHTML;

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

  // 查看偏好详情
  viewPreferenceDetail(index) {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    const preferences = userProfile.preferences || [];
    const preference = preferences[index];

    if (!preference) {
      alert("未找到该偏好记录");
      return;
    }

    const detailModal = document.createElement("div");
    detailModal.className = "preference-detail-modal";
    detailModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎯 偏好详情</h3>
                    <button class="close-btn" onclick="this.closest('.preference-detail-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="preference-detail">
                        <div class="detail-section">
                            <h4>📅 记录时间</h4>
                            <p>${preference.date || "未知"}</p>
                        </div>
                        <div class="detail-section">
                            <h4>🏷️ 偏好类型</h4>
                            <p>${preference.type || "未知"}</p>
                        </div>
                        <div class="detail-section">
                            <h4>📝 偏好内容</h4>
                            <div class="preference-content">${
                              preference.content || "无内容"
                            }</div>
                        </div>
                        <div class="detail-section">
                            <h4>📊 偏好强度</h4>
                            <p>${preference.intensity || "未知"}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" onclick="planPage.deletePreference(${index}); this.closest('.preference-detail-modal').remove();">
                        🗑️ 删除此偏好
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.preference-detail-modal').remove()">
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

  // 查看反馈详情
  viewFeedbackDetail(index) {
    const exerciseFeedback = JSON.parse(
      localStorage.getItem("exerciseFeedback") || "[]"
    );
    const feedback = exerciseFeedback[index];

    if (!feedback) {
      alert("未找到该反馈记录");
      return;
    }

    const detailModal = document.createElement("div");
    detailModal.className = "feedback-detail-modal";
    detailModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💪 反馈详情</h3>
                    <button class="close-btn" onclick="this.closest('.feedback-detail-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="feedback-detail">
                        <div class="detail-section">
                            <h4>📅 反馈时间</h4>
                            <p>${feedback.date || "未知"}</p>
                        </div>
                        <div class="detail-section">
                            <h4>💪 运动强度</h4>
                            <p>${feedback.intensity || "未知"}/5</p>
                        </div>
                        <div class="detail-section">
                            <h4>✅ 完成度</h4>
                            <p>${feedback.completion || "未知"}%</p>
                        </div>
                        <div class="detail-section">
                            <h4>😊 身体感受</h4>
                            <div class="feedback-content">${
                              feedback.bodyFeelings || "无记录"
                            }</div>
                        </div>
                        <div class="detail-section">
                            <h4>⚠️ 不适症状</h4>
                            <div class="feedback-content">${
                              feedback.discomfortNotes || "无不适"
                            }</div>
                        </div>
                        <div class="detail-section">
                            <h4>🔧 调整建议</h4>
                            <div class="feedback-content">${
                              (feedback.adjustments || []).join(", ") ||
                              "无建议"
                            }</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" onclick="planPage.deleteFeedback(${index}); this.closest('.feedback-detail-modal').remove();">
                        🗑️ 删除此反馈
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.feedback-detail-modal').remove()">
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

  // 删除偏好记录
  deletePreference(index) {
    if (confirm("确定要删除这条偏好记录吗？")) {
      try {
        const userProfile = JSON.parse(
          localStorage.getItem("userProfile") || "{}"
        );
        const preferences = userProfile.preferences || [];

        if (index >= 0 && index < preferences.length) {
          preferences.splice(index, 1);
          userProfile.preferences = preferences;
          localStorage.setItem("userProfile", JSON.stringify(userProfile));

          // 更新显示
          this.updateUserPreferencesDisplay();

          alert("✅ 偏好记录已删除");
        } else {
          alert("❌ 无效的索引");
        }
      } catch (error) {
        console.error("删除偏好记录失败:", error);
        alert("❌ 删除偏好记录失败: " + error.message);
      }
    }
  }

  // 删除反馈记录
  deleteFeedback(index) {
    if (confirm("确定要删除这条反馈记录吗？")) {
      try {
        const exerciseFeedback = JSON.parse(
          localStorage.getItem("exerciseFeedback") || "[]"
        );

        if (index >= 0 && index < exerciseFeedback.length) {
          exerciseFeedback.splice(index, 1);
          localStorage.setItem(
            "exerciseFeedback",
            JSON.stringify(exerciseFeedback)
          );

          // 更新显示
          this.updateExerciseFeedbackDisplay();

          alert("✅ 反馈记录已删除");
        } else {
          alert("❌ 无效的索引");
        }
      } catch (error) {
        console.error("删除反馈记录失败:", error);
        alert("❌ 删除反馈记录失败: " + error.message);
      }
    }
  }

  // 清空用户偏好记录
  clearUserPreferences() {
    if (confirm("⚠️ 确定要清空所有用户偏好记录吗？此操作不可恢复！")) {
      try {
        const userProfile = JSON.parse(
          localStorage.getItem("userProfile") || "{}"
        );
        userProfile.preferences = [];
        localStorage.setItem("userProfile", JSON.stringify(userProfile));

        this.updateUserPreferencesDisplay();
        alert("✅ 所有用户偏好记录已清空！");
      } catch (error) {
        console.error("清空用户偏好记录失败:", error);
        alert("❌ 清空用户偏好记录失败: " + error.message);
      }
    }
  }

  // 清空运动反馈记录
  clearExerciseFeedback() {
    if (confirm("⚠️ 确定要清空所有运动反馈记录吗？此操作不可恢复！")) {
      try {
        localStorage.setItem("exerciseFeedback", JSON.stringify([]));
        this.updateExerciseFeedbackDisplay();
        alert("✅ 所有运动反馈记录已清空！");
      } catch (error) {
        console.error("清空运动反馈记录失败:", error);
        alert("❌ 清空运动反馈记录失败: " + error.message);
      }
    }
  }

  // 导出用户偏好记录
  exportUserPreferences() {
    try {
      const userProfile = JSON.parse(
        localStorage.getItem("userProfile") || "{}"
      );
      const preferences = userProfile.preferences || [];

      const exportData = {
        preferences: preferences,
        userProfile: userProfile,
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `user-preferences-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("✅ 用户偏好记录导出成功！");
    } catch (error) {
      console.error("导出用户偏好记录失败:", error);
      alert("❌ 导出用户偏好记录失败: " + error.message);
    }
  }

  // 导出运动反馈记录
  exportExerciseFeedback() {
    try {
      const exerciseFeedback = JSON.parse(
        localStorage.getItem("exerciseFeedback") || "[]"
      );
      const userProfile = JSON.parse(
        localStorage.getItem("userProfile") || "{}"
      );

      const exportData = {
        exerciseFeedback: exerciseFeedback,
        userProfile: userProfile,
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `exercise-feedback-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("✅ 运动反馈记录导出成功！");
    } catch (error) {
      console.error("导出运动反馈记录失败:", error);
      alert("❌ 导出运动反馈记录失败: " + error.message);
    }
  }

  initStatsChart() {
    const ctx = document.getElementById("planStatsChart");
    if (!ctx || !window.Chart) return;
    const grid = "#2a2c31";
    const font = "#a8a8a8";
    this.statsChart = new Chart(ctx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: grid }, ticks: { color: font } },
          y: { grid: { color: grid }, ticks: { color: font } },
        },
        plugins: { legend: { labels: { color: font } } },
      },
    });
  }

  renderStats(metric) {
    if (!this.statsChart) return;
    const entries = this.metrics.entries || [];
    if (metric === "weight_bmi") {
      const labels = entries.map((e) => e.date);
      const w = entries.map((e) => e.weight);
      const b = entries.map((e) => e.bmi);
      this.statsChart.data.labels = labels;
      this.statsChart.data.datasets = [
        {
          label: "体重(kg)",
          data: w,
          borderColor: "#ff7a00",
          backgroundColor: "rgba(255,122,0,0.2)",
          tension: 0.3,
        },
        {
          label: "BMI",
          data: b,
          borderColor: "#4dd0e1",
          backgroundColor: "rgba(77,208,225,0.2)",
          tension: 0.3,
        },
      ];
    } else if (metric === "weekly_completed") {
      const completed = JSON.parse(
        localStorage.getItem("completedDays") || "{}"
      );
      const map = new Map();
      Object.keys(completed).forEach((label) => {
        const d = new Date(`${new Date().getFullYear()}/${label}`);
        const key = `${d.getFullYear()}-W${this.getWeekNumber(d)}`;
        map.set(key, (map.get(key) || 0) + 1);
      });
      const keys = Array.from(map.keys()).sort().slice(-8);
      const vals = keys.map((k) => map.get(k));
      this.statsChart.data.labels = keys;
      this.statsChart.data.datasets = [
        {
          label: "每周完成天数",
          data: vals,
          borderColor: "#ff7a00",
          backgroundColor: "rgba(255,122,0,0.25)",
          tension: 0.3,
        },
      ];
    } else if (metric === "monthly_sessions") {
      const completed = JSON.parse(
        localStorage.getItem("completedDays") || "{}"
      );
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
        {
          label: "每日是否完成",
          data: vals,
          borderColor: "#ff7a00",
          backgroundColor: "rgba(255,122,0,0.25)",
          stepped: true,
        },
      ];
    }
    this.statsChart.update();
  }

  getWeekNumber(d) {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  }

  // 中文星期转索引（支持多种格式）
  zhWeekToIndex(dayName) {
    const map = {
      周日: 0,
      周一: 1,
      周二: 2,
      周三: 3,
      周四: 4,
      周五: 5,
      周六: 6,
      星期天: 0,
      星期一: 1,
      星期二: 2,
      星期三: 3,
      星期四: 4,
      星期五: 5,
      星期六: 6,
    };
    const cleaned = String(dayName || "").trim();

    // 直接匹配
    if (map.hasOwnProperty(cleaned)) return map[cleaned];

    // 处理 "周四 & 周日" 这种格式，取第一个
    if (cleaned.includes("&")) {
      const firstDay = cleaned.split("&")[0].trim();
      if (map.hasOwnProperty(firstDay)) return map[firstDay];
    }

    // 处理 "周四 周日" 这种格式，取第一个
    if (cleaned.includes(" ")) {
      const firstDay = cleaned.split(" ")[0].trim();
      if (map.hasOwnProperty(firstDay)) return map[firstDay];
    }

    return null;
  }

  // 构建训练星期集合
  buildTrainingWeekdaySet(parsed) {
    const set = new Set();
    const list =
      parsed &&
      parsed.workoutPlan &&
      Array.isArray(parsed.workoutPlan.trainingDays)
        ? parsed.workoutPlan.trainingDays
        : [];
    list.forEach((d) => {
      const idx = this.zhWeekToIndex(d.dayName);
      if (idx !== null && idx !== undefined) set.add(idx);
    });
    return set;
  }

  // 根据星期查找训练日
  findDayPlanByWeekday(parsed, weekdayIndex) {
    const list =
      parsed &&
      parsed.workoutPlan &&
      Array.isArray(parsed.workoutPlan.trainingDays)
        ? parsed.workoutPlan.trainingDays
        : [];
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
    const calendarEl = document.getElementById("plan-calendar");
    const titleEl = document.getElementById("calendar-title");
    if (!calendarEl || !titleEl) return;

    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const trainingWeekdays = this.buildTrainingWeekdaySet(
      parsed || this.lastParsedPlan || {}
    );

    titleEl.textContent = `${year}年 ${month + 1}月`;

    let html = "";
    for (let i = 0; i < 7; i++) {
      html += `<div style='font-weight:bold;color:#888;'>${weekDays[i]}</div>`;
    }
    for (let i = 0; i < startWeekday; i++) html += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const w = dateObj.getDay();
      const label = this.formatDateLabel(year, month, d);
      const hasPlan = trainingWeekdays.has(w);
      const classes = ["calendar-day"];
      if (hasPlan) classes.push("has-plan");
      html += `<div class='${classes.join(
        " "
      )}' data-date='${label}' data-w='${w}'>${d}</div>`;
    }
    const totalCells = 7 + startWeekday + daysInMonth;
    const rows = Math.ceil((totalCells - 7) / 7);
    const cellsToFill = rows < 6 ? (6 - rows) * 7 : 0;
    for (let i = 0; i < cellsToFill; i++) html += `<div></div>`;

    calendarEl.innerHTML = html;

    // 点击事件
    calendarEl.onclick = (e) => {
      const cell = e.target.closest(".calendar-day");
      if (!cell) return;
      calendarEl
        .querySelectorAll(".calendar-day")
        .forEach((el) => el.classList.remove("active"));
      cell.classList.add("active");
      const w = Number(cell.getAttribute("data-w"));
      const dateLabel = cell.getAttribute("data-date");
      const dayPlan = this.findDayPlanByWeekday(
        this.lastParsedPlan || parsed || {},
        w
      );
      if (dayPlan) {
        const dayCopy = { ...dayPlan, date: dateLabel };
        this.renderSelectedDayDetail(dayCopy);
      } else {
        this.renderSelectedDayDetail({ date: dateLabel, exercises: [] });
      }
    };

    // 高亮历史已完成
    try {
      const key = "completedDays";
      const store = JSON.parse(localStorage.getItem(key) || "{}");
      Object.keys(store || {}).forEach((label) => {
        if (!store[label]) return;
        const cell = calendarEl.querySelector(
          `.calendar-day[data-date='${label}']`
        );
        cell && cell.classList.add("completed");
      });
    } catch {}
  }

  // 渲染选中日期详情
  renderSelectedDayDetail(dayPlan) {
    const container = document.getElementById("plan-day-detail");
    if (!container) return;
    let html = "";
    const dayLabel = dayPlan.date || dayPlan.dayName || "";
    html += `<div class='plan-card' style='margin-bottom:12px;'>`;
    html += `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;'>
                    <div style='font-weight:bold;'>${dayLabel}${
      dayPlan.title ? `｜${dayPlan.title}` : ""
    }</div>
                    <button class='complete-btn' id='mark-complete-btn'>已完成</button>
                 </div>`;
    if (Array.isArray(dayPlan.exercises) && dayPlan.exercises.length > 0) {
      dayPlan.exercises.forEach((ex) => {
        html +=
          `<div style='display:flex;gap:12px;align-items:flex-start;margin-bottom:8px;'>` +
          `<div style='min-width:120px;'>${
            ex.gifUrl
              ? `<img src='${ex.gifUrl}' style='max-width:120px;border-radius:8px;'>`
              : ""
          }</div>` +
          `<div>` +
          `<div><strong>${ex.name || ""}</strong></div>` +
          `<div style='color:#555;'>组数: ${ex.sets || "-"}，次数: ${
            ex.reps || "-"
          }</div>` +
          `${
            ex.notes ? `<div style='color:#777;'>备注: ${ex.notes}</div>` : ""
          }` +
          `</div>` +
          `</div>`;
      });
    } else {
      html += `<div style='color:#777;'>暂无训练日数据。</div>`;
    }
    html += `</div>`;
    container.innerHTML = html;

    const completeBtn = document.getElementById("mark-complete-btn");
    if (completeBtn) {
      completeBtn.onclick = () => {
        try {
          const key = "completedDays";
          const store = JSON.parse(localStorage.getItem(key) || "{}");
          const label = dayPlan.date || dayPlan.dayName || "";
          store[label] = true;
          localStorage.setItem(key, JSON.stringify(store));

          const calendarEl = document.getElementById("plan-calendar");
          if (calendarEl) {
            const active = calendarEl.querySelector(".calendar-day.active");
            active && active.classList.add("completed");
          }

          // 显示反馈表单
          this.showFeedbackForm(dayPlan);
        } catch {}
      };
    }
  }

  // 渲染饮食建议
  renderDietFromJson(parsed) {
    const planSummaryEl = document.getElementById("plan-summary");
    if (!planSummaryEl) return;
    const diet = parsed && parsed.dietPlan ? parsed.dietPlan : null;
    if (!diet) return;

    let dietHtml = "<h3>饮食建议</h3>";

    // 每日热量
    if (diet.dailyCalories) {
      dietHtml += `<div class='plan-card'><strong>每日热量</strong><br>${diet.dailyCalories}</div>`;
    }

    // 餐食列表
    if (Array.isArray(diet.meals) && diet.meals.length) {
      diet.meals.forEach((meal) => {
        dietHtml += `<div class='plan-card meal-card' data-meal='${
          meal.mealName || meal.name || "餐食"
        }'>`;
        dietHtml += `<div style='font-weight:bold;margin-bottom:8px;'>${
          meal.mealName || meal.name || "餐食"
        }`;
        if (meal.timing) {
          dietHtml += ` <span style='color:#666;font-size:14px;'>(${meal.timing})</span>`;
        }
        dietHtml += `</div>`;

        if (Array.isArray(meal.foodItems) && meal.foodItems.length) {
          meal.foodItems.forEach((item) => {
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
      dietHtml +=
        `<div class='plan-card'><strong>注意事项</strong><ul style='margin:6px 0 0 18px;'>` +
        diet.notes.map((n) => `<li>${n}</li>`).join("") +
        `</ul></div>`;
    }

    planSummaryEl.innerHTML = dietHtml; // 使用 = 而不是 +=，避免重复添加

    // 采用/取消 控件
    const controls = document.createElement("div");
    controls.className = "adopt-controls";
    controls.innerHTML = `
            <button class='adopt-btn' id='adopt-plan-btn'>采用</button>
            <button class='cancel-btn' id='cancel-plan-btn'>取消</button>
        `;
    planSummaryEl.appendChild(controls);

    const adoptBtn = document.getElementById("adopt-plan-btn");
    const cancelBtn = document.getElementById("cancel-plan-btn");
    adoptBtn &&
      (adoptBtn.onclick = () => {
        try {
          localStorage.setItem(
            "adoptedPlan",
            JSON.stringify(this.lastParsedPlan || parsed || {})
          );
          alert("已采用该计划");
        } catch {}
      });
    cancelBtn &&
      (cancelBtn.onclick = () => {
        localStorage.removeItem("adoptedPlan");
        alert("已取消，未保存该计划");
      });

    // 绑定餐食悬停，显示营养扇形图
    const mealCards = planSummaryEl.querySelectorAll(".meal-card");
    mealCards.forEach((card, idx) => {
      const titleEl = card.querySelector("div");
      const pieWrap = card.querySelector(".meal-pie");
      const canvas = pieWrap ? pieWrap.querySelector("canvas") : null;
      let pieChart = null;
      const meal = (diet.meals || [])[idx] || {};
      const nutrients = Array.isArray(meal.nutrients) ? meal.nutrients : [];
      const labels = nutrients.map((n) => n.name);
      const values = nutrients.map((n) =>
        Number(String(n.details).replace(/[^\d.]/g, "") || 0)
      );

      const showPie = () => {
        if (!window.Chart || !canvas || labels.length === 0) return;
        pieWrap.style.display = "block";
        if (!pieChart) {
          pieChart = new Chart(canvas, {
            type: "pie",
            data: {
              labels,
              datasets: [
                {
                  data: values,
                  backgroundColor: [
                    "#ff7a00",
                    "#4dd0e1",
                    "#8e44ad",
                    "#2ecc71",
                    "#f1c40f",
                    "#e67e22",
                    "#e74c3c",
                  ],
                  borderColor: "#141416",
                },
              ],
            },
            options: {
              animation: { animateScale: true, animateRotate: true },
              plugins: { legend: { labels: { color: "#e6e6e6" } } },
            },
          });
        } else {
          // 触发一次更新以播放动画
          pieChart.destroy();
          pieChart = new Chart(canvas, {
            type: "pie",
            data: {
              labels,
              datasets: [
                {
                  data: values,
                  backgroundColor: [
                    "#ff7a00",
                    "#4dd0e1",
                    "#8e44ad",
                    "#2ecc71",
                    "#f1c40f",
                    "#e67e22",
                    "#e74c3c",
                  ],
                  borderColor: "#141416",
                },
              ],
            },
            options: {
              animation: { animateScale: true, animateRotate: true },
              plugins: { legend: { labels: { color: "#e6e6e6" } } },
            },
          });
        }
      };
      const hidePie = () => {
        if (pieWrap) pieWrap.style.display = "none";
      };

      card.addEventListener("mouseenter", () => {
        console.log(
          "[diet] hover meal:",
          meal.mealName || meal.name,
          nutrients
        );
        showPie();
      });
      card.addEventListener("mouseleave", hidePie);
    });
  }

  // 计划聊天发送处理
  async handlePlanChatSend() {
    const planChatInput = document.getElementById("plan-chat-input");
    const planChatBox = document.getElementById("plan-chat-box");
    const customRequest = planChatInput.value.trim();

    if (!customRequest) return;

    // 判断是否为自动健康弹窗触发（内容包含“这是我原来的锻炼计划，根据我现在的身体状况重新生成计划”）
    if (
      customRequest.includes(
        "这是我原来的锻炼计划，根据我现在的身体状况重新生成计划"
      )
    ) {
      // 不显示用户输入内容
      planChatInput.value = "";
    } else {
      CommonUtils.appendChatMessage(planChatBox, customRequest, "user");
      planChatInput.value = "";
    }
    const thinking = CommonUtils.appendChatMessage(
      planChatBox,
      "AI 正在思考中...",
      "ai"
    );

    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");

    // 获取当前健身状态
    const fitnessState = window.fitnessStateManager
      ? window.fitnessStateManager.state
      : {};

    try {
      const aiResult = await CommonUtils.apiCall(
        "http://localhost:3000/api/dispatch",
        {
          condition: "A",
          userProfile,
          customRequest,
          fitnessState, // 传递状态信息
        }
      );

      console.log("[plan] A分支完整返回:", aiResult); // 调试用

      if (thinking && thinking.parentNode)
        thinking.parentNode.removeChild(thinking);

      if (aiResult && (aiResult.json || aiResult.text)) {
        if (aiResult.text) {
          try {
            CommonUtils.appendChatMessage(planChatBox, aiResult.text, "ai");
          } catch {
            const div = document.createElement("div");
            div.className = "chat-message ai-message";
            div.textContent = aiResult.text;
            planChatBox.appendChild(div);
          }
          console.log("[plan] ai text length =", aiResult.textLength);
        }

        const parsed = aiResult.json || {};
        console.log("[plan] 解析的JSON数据:", parsed);
        console.log("[plan] JSON数据键名:", Object.keys(parsed));
        console.log("[plan] workoutPlan存在:", !!parsed.workoutPlan);
        console.log("[plan] dietPlan存在:", !!parsed.dietPlan);

        // 检查JSON数据格式
        if (parsed.workoutPlan && parsed.dietPlan) {
          console.log("[plan] 检测到有效的workoutPlan和dietPlan");

          // 遍历训练日，补充 GIF
          if (
            parsed.workoutPlan.trainingDays &&
            Array.isArray(parsed.workoutPlan.trainingDays)
          ) {
            console.log("[plan] 开始为训练动作获取GIF...");
            // 已移除 ExerciseDB 依赖，不再获取 GIF
            console.log("[plan] GIF获取完成");
          }

          // 保存并渲染月历高亮
          this.lastParsedPlan = parsed;
          this.renderMonthlyCalendar(
            this.calendarYear,
            this.calendarMonth,
            this.lastParsedPlan
          );

          // 饮食建议渲染
          this.renderDietFromJson(parsed);

          // 更新状态管理器
          if (window.fitnessStateManager) {
            window.fitnessStateManager.updateState("A", parsed);
          }

          // 默认选中当月当天
          const calendarEl = document.getElementById("plan-calendar");
          if (calendarEl) {
            const today = new Date();
            const sameMonth =
              today.getFullYear() === this.calendarYear &&
              today.getMonth() === this.calendarMonth;
            let targetCell = null;
            if (sameMonth) {
              const w = today.getDay();
              const label = `${this.calendarMonth + 1}/${today.getDate()}`;
              targetCell = calendarEl.querySelector(
                `.calendar-day.has-plan[data-w='${w}'][data-date='${label}']`
              );
            }
            if (!targetCell)
              targetCell = calendarEl.querySelector(".calendar-day.has-plan");
            if (targetCell) targetCell.click();
          }
        } else {
          console.log("[plan] JSON数据格式不正确，缺少workoutPlan或dietPlan");
          console.log("[plan] 尝试降级处理...");

          // 降级处理：即使格式不完全正确，也尝试渲染可用数据
          if (parsed.workoutPlan || parsed.dietPlan) {
            console.log("[plan] 检测到部分有效数据，进行降级渲染");
            this.lastParsedPlan = parsed;
            this.renderMonthlyCalendar(
              this.calendarYear,
              this.calendarMonth,
              this.lastParsedPlan
            );
            this.renderDietFromJson(parsed);
            CommonUtils.appendChatMessage(
              planChatBox,
              "部分数据已加载，但格式可能不完整。",
              "ai"
            );
          } else {
            CommonUtils.appendChatMessage(
              planChatBox,
              "AI返回的数据格式不正确，请重试。",
              "ai"
            );
          }
        }
      } else {
        console.log("[plan] 未获取到AI回复");
        CommonUtils.appendChatMessage(planChatBox, "未能获取AI回复。", "ai");
      }
    } catch (error) {
      console.error("[plan] 计划生成错误:", error);
      if (thinking && thinking.parentNode)
        thinking.parentNode.removeChild(thinking);
      CommonUtils.appendChatMessage(
        planChatBox,
        "计划生成失败，请稍后再试。",
        "ai"
      );
    }
  }
}

// 初始化计划页
document.addEventListener("DOMContentLoaded", () => {
  window.planPage = new PlanPage();
});
