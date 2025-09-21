// 统一的状态管理器 - ABC一体化设计
class FitnessStateManager {
    constructor() {
        this.state = {
            currentPlan: null,
            currentRoute: null,
            recentMedicalAdvice: null,
            dailyStatus: 'normal', // normal, tired, injured, recovering
            energyLevel: 5, // 1-10
            lastActivity: null,
            lastUpdate: new Date().toISOString()
        };
        this.loadState();
    }
    
    // 从本地存储加载状态
    loadState() {
        try {
            const savedState = localStorage.getItem('fitnessState');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                this.state = { ...this.state, ...parsed };
            }
        } catch (error) {
            console.error('加载状态失败:', error);
        }
    }
    
    // 保存状态到本地存储
    saveState() {
        try {
            this.state.lastUpdate = new Date().toISOString();
            localStorage.setItem('fitnessState', JSON.stringify(this.state));
        } catch (error) {
            console.error('保存状态失败:', error);
        }
    }
    
    // 更新状态
    updateState(service, data) {
        switch (service) {
            case 'A':
                this.state.currentPlan = data;
                this.state.energyLevel = this.calculateEnergyLevel(data);
                break;
            case 'B':
                this.state.currentRoute = data;
                this.state.lastActivity = new Date().toISOString();
                break;
            case 'C':
                this.state.recentMedicalAdvice = data;
                this.state.dailyStatus = this.analyzeMedicalStatus(data);
                break;
        }
        this.saveState();
    }
    
    // 计算能量水平
    calculateEnergyLevel(planData) {
        if (!planData || !planData.workoutPlan) return 5;
        
        const trainingDays = planData.workoutPlan.trainingDays || [];
        const totalExercises = trainingDays.reduce((sum, day) => sum + (day.exercises?.length || 0), 0);
        
        // 根据训练量计算能量水平
        if (totalExercises > 20) return 3; // 高强度
        if (totalExercises > 15) return 4; // 中高强度
        if (totalExercises > 10) return 5; // 中等
        if (totalExercises > 5) return 6;  // 中低强度
        return 7; // 低强度
    }
    
    // 分析医疗状态
    analyzeMedicalStatus(medicalAdvice) {
        if (!medicalAdvice) return 'normal';
        
        const advice = medicalAdvice.toLowerCase();
        
        if (advice.includes('停止') || advice.includes('禁止') || advice.includes('避免')) {
            return 'injured';
        }
        if (advice.includes('休息') || advice.includes('恢复') || advice.includes('疲劳')) {
            return 'recovering';
        }
        if (advice.includes('注意') || advice.includes('小心') || advice.includes('适度')) {
            return 'tired';
        }
        
        return 'normal';
    }
    
    // 获取当前状态用于其他服务
    getContextForService(service) {
        const context = {
            dailyStatus: this.state.dailyStatus,
            energyLevel: this.state.energyLevel,
            lastActivity: this.state.lastActivity
        };
        
        switch (service) {
            case 'A':
                return {
                    ...context,
                    recentRoute: this.state.currentRoute,
                    medicalAdvice: this.state.recentMedicalAdvice
                };
            case 'B':
                return {
                    ...context,
                    currentPlan: this.state.currentPlan,
                    medicalAdvice: this.state.recentMedicalAdvice
                };
            case 'C':
                return {
                    ...context,
                    currentPlan: this.state.currentPlan,
                    recentRoute: this.state.currentRoute
                };
        }
    }
    
    // 从医疗建议中提取健康约束
    extractHealthConstraints(medicalAdvice) {
        if (!medicalAdvice) return [];
        
        const constraints = [];
        const advice = medicalAdvice.toLowerCase();
        
        if (advice.includes('避免高强度') || advice.includes('降低强度')) {
            constraints.push('avoid_high_intensity');
        }
        if (advice.includes('膝盖') || advice.includes('膝关节')) {
            constraints.push('knee_protection');
        }
        if (advice.includes('心脏') || advice.includes('心血管')) {
            constraints.push('cardiac_consideration');
        }
        if (advice.includes('哮喘') || advice.includes('呼吸')) {
            constraints.push('respiratory_care');
        }
        if (advice.includes('腰部') || advice.includes('腰椎')) {
            constraints.push('back_protection');
        }
        
        return constraints;
    }
    
    // 分析训练强度
    analyzeTrainingIntensity(planData) {
        if (!planData || !planData.workoutPlan) return 'medium';
        
        const trainingDays = planData.workoutPlan.trainingDays || [];
        const totalExercises = trainingDays.reduce((sum, day) => sum + (day.exercises?.length || 0), 0);
        
        if (totalExercises > 20) return 'high';
        if (totalExercises > 10) return 'medium';
        return 'low';
    }
    
    // 分析训练类型
    analyzeTrainingType(planData) {
        if (!planData || !planData.workoutPlan) return [];
        
        const types = [];
        const trainingDays = planData.workoutPlan.trainingDays || [];
        
        trainingDays.forEach(day => {
            if (day.exercises) {
                day.exercises.forEach(exercise => {
                    const name = exercise.name?.toLowerCase() || '';
                    if (name.includes('跑步') || name.includes('有氧') || name.includes('cardio')) {
                        types.push('cardio');
                    }
                    if (name.includes('力量') || name.includes('举重') || name.includes('strength')) {
                        types.push('strength');
                    }
                    if (name.includes('拉伸') || name.includes('瑜伽') || name.includes('yoga')) {
                        types.push('flexibility');
                    }
                });
            }
        });
        
        return [...new Set(types)]; // 去重
    }
    
    // 增强路线规划提示词
    enhanceRouteWithHealthContext(userProfile, medicalAdvice, customRequest) {
        const healthConstraints = this.extractHealthConstraints(medicalAdvice);
        
        let routePrompt = `用户需求: "${customRequest}"`;
        
        // 根据医疗建议调整路线偏好
        if (healthConstraints.includes('avoid_high_intensity')) {
            routePrompt += `\n健康考虑：用户需要避免高强度运动，请推荐平缓、低强度的路线`;
        }
        
        if (healthConstraints.includes('knee_protection')) {
            routePrompt += `\n健康考虑：用户有膝盖问题，请推荐对膝盖友好的路线（避免陡坡、台阶）`;
        }
        
        if (healthConstraints.includes('cardiac_consideration')) {
            routePrompt += `\n健康考虑：用户有心脏问题，请推荐短距离、有医疗设施的路线`;
        }
        
        if (healthConstraints.includes('respiratory_care')) {
            routePrompt += `\n健康考虑：用户有呼吸问题，请推荐空气清新、低强度的路线`;
        }
        
        if (healthConstraints.includes('back_protection')) {
            routePrompt += `\n健康考虑：用户有腰部问题，请推荐平坦、无颠簸的路线`;
        }
        
        return routePrompt;
    }
    
    // 增强路线规划提示词（基于训练计划）
    enhanceRouteWithTrainingPlan(userProfile, currentPlan, customRequest) {
        const trainingIntensity = this.analyzeTrainingIntensity(currentPlan);
        const trainingType = this.analyzeTrainingType(currentPlan);
        
        let routePrompt = `用户需求: "${customRequest}"`;
        
        // 根据训练计划调整路线
        if (trainingIntensity === 'high') {
            routePrompt += `\n训练计划：用户今日有高强度训练，请推荐轻松、恢复性的路线`;
        } else if (trainingIntensity === 'low') {
            routePrompt += `\n训练计划：用户今日训练强度较低，可以推荐更有挑战性的路线`;
        }
        
        if (trainingType.includes('cardio')) {
            routePrompt += `\n训练计划：用户今日有有氧训练，请推荐适合有氧的路线（如跑步道、自行车道）`;
        }
        
        if (trainingType.includes('strength')) {
            routePrompt += `\n训练计划：用户今日有力量训练，请推荐短距离、低强度的路线作为补充`;
        }
        
        if (trainingType.includes('flexibility')) {
            routePrompt += `\n训练计划：用户今日有柔韧性训练，请推荐适合拉伸的路线（如公园、安静区域）`;
        }
        
        return routePrompt;
    }
    
    // 增强计划生成提示词
    enhancePlanWithRouteFeedback(userProfile, routeFeedback, customRequest) {
        let planContext = this.buildPersonalizedContext(userProfile, customRequest);
        
        if (routeFeedback && routeFeedback.completion === 'partial') {
            planContext += `\n注意：用户最近路线执行不完整，建议降低训练强度`;
        }
        
        if (routeFeedback && routeFeedback.difficulty > 4) {
            planContext += `\n注意：用户反馈路线难度较高，建议调整训练计划以匹配实际能力`;
        }
        
        if (routeFeedback && routeFeedback.distance > 10) {
            planContext += `\n注意：用户最近进行了长距离路线，建议今日安排恢复性训练`;
        }
        
        return planContext;
    }
    
    // 构建个性化上下文（从原有逻辑迁移）
    buildPersonalizedContext(userProfile, customRequest) {
        const displayGoal = userProfile?.goal === "muscle_gain" ? "增肌" : 
                           userProfile?.goal === "weight_loss" ? "减脂塑形" : "保持健康";
        const genderText = userProfile?.gender === "male" ? "男性" : 
                          userProfile?.gender === "female" ? "女性" : "未知";
        
        let personalizedInfo = `
            你是一个专业的健身教练和营养师。请为以下用户制定一个为期一周的健身和饮食计划。
            用户基本信息：
            - 身高: ${userProfile?.height || '未知'} cm
            - 体重: ${userProfile?.weight || '未知'} kg
            - 年龄: ${userProfile?.age || '未知'} 岁
            - 性别: ${genderText}
            - 目标: ${displayGoal}
            - 锻炼频率: ${this.getFrequencyText(userProfile?.frequency)}`;

        // 添加身体数据
        if (userProfile?.body_fat) {
            personalizedInfo += `\n- 体脂率: ${userProfile.body_fat}%`;
        }
        if (userProfile?.metabolic_rate) {
            personalizedInfo += `\n- 基础代谢率: ${userProfile.metabolic_rate} kcal/天`;
        }

        // 添加健康状况
        if (userProfile?.medical_history) {
            personalizedInfo += `\n- 过往病史: ${userProfile.medical_history}`;
        }
        if (userProfile?.current_medications) {
            personalizedInfo += `\n- 当前用药: ${userProfile.current_medications}`;
        }
        if (userProfile?.allergies) {
            personalizedInfo += `\n- 过敏史: ${userProfile.allergies}`;
        }

        // 添加运动偏好
        if (userProfile?.preferred_activities && userProfile.preferred_activities.length > 0) {
            personalizedInfo += `\n- 运动偏好: ${userProfile.preferred_activities.join(', ')}`;
        }

        // 添加历史反馈信息
        if (userProfile?.feedbackHistory && userProfile.feedbackHistory.length > 0) {
            personalizedInfo += `\n- 历史反馈记录:`;
            userProfile.feedbackHistory.slice(-3).forEach(feedback => {
                personalizedInfo += `\n  * ${feedback.date}: 强度${feedback.intensity}/5, 调整建议: ${feedback.adjustments.join(', ') || '无'}`;
                if (feedback.discomfortNotes) {
                    personalizedInfo += `, 不适症状: ${feedback.discomfortNotes}`;
                }
            });
        }

        return personalizedInfo + `\n个性化需求: "${customRequest || "无特殊要求"}"\n\n请根据以上信息制定详细的锻炼和饮食计划，锻炼和饮食建议分开。`;
    }
    
    // 获取频率文本
    getFrequencyText(frequency) {
        switch (frequency) {
            case "3-4_times_week": return "每周3-4次";
            case "1-2_times_week": return "每周1-2次";
            case "5_times_week": return "每周5次以上";
            default: return "未知";
        }
    }
    
    // 构建增强的提示词
    buildEnhancedPrompt(service, userProfile, customRequest) {
        const context = this.getContextForService(service);
        let prompt = '';
        
        switch (service) {
            case 'A': // 计划生成
                prompt = this.buildPersonalizedContext(userProfile, customRequest);
                
                // 加入路线执行反馈
                if (context.recentRoute) {
                    prompt += `\n最近路线执行情况：${JSON.stringify(context.recentRoute)}`;
                }
                
                // 加入医疗建议
                if (context.medicalAdvice) {
                    prompt += `\n最近医疗建议：${context.medicalAdvice}`;
                }
                
                // 加入当前状态
                prompt += `\n当前状态：${context.dailyStatus}，能量水平：${context.energyLevel}/10`;
                break;
                
            case 'B': // 路线规划
                prompt = `用户需求: "${customRequest}"`;
                
                // 加入训练计划
                if (context.currentPlan) {
                    prompt += `\n当前训练计划：${JSON.stringify(context.currentPlan)}`;
                }
                
                // 加入医疗建议
                if (context.medicalAdvice) {
                    prompt += `\n健康考虑：${context.medicalAdvice}`;
                }
                
                // 加入当前状态
                prompt += `\n当前状态：${context.dailyStatus}，能量水平：${context.energyLevel}/10`;
                break;
                
            case 'C': // 医疗咨询
                prompt = this.buildMedicalConsultationPrompt(userProfile, customRequest);
                
                // 加入训练计划
                if (context.currentPlan) {
                    prompt += `\n当前训练计划：${JSON.stringify(context.currentPlan)}`;
                }
                
                // 加入路线执行情况
                if (context.recentRoute) {
                    prompt += `\n最近路线执行：${JSON.stringify(context.recentRoute)}`;
                }
                
                // 加入当前状态
                prompt += `\n当前状态：${context.dailyStatus}，能量水平：${context.energyLevel}/10`;
                break;
        }
        
        return prompt;
    }
    
    // 构建医疗咨询提示词
    buildMedicalConsultationPrompt(userProfile, customRequest) {
        let medicalInfo = `用户咨询: "${customRequest}"\n\n用户基本信息：`;
        medicalInfo += `\n- 身高: ${userProfile?.height || '未知'} cm`;
        medicalInfo += `\n- 体重: ${userProfile?.weight || '未知'} kg`;
        medicalInfo += `\n- 年龄: ${userProfile?.age || '未知'} 岁`;
        medicalInfo += `\n- 性别: ${userProfile?.gender === "male" ? "男性" : userProfile?.gender === "female" ? "女性" : "未知"}`;
        
        if (userProfile?.medical_history) {
            medicalInfo += `\n- 过往病史: ${userProfile.medical_history}`;
        }
        if (userProfile?.current_medications) {
            medicalInfo += `\n- 当前用药: ${userProfile.current_medications}`;
        }
        if (userProfile?.allergies) {
            medicalInfo += `\n- 过敏史: ${userProfile.allergies}`;
        }
        
        // 添加最近的反馈信息
        if (userProfile?.feedbackHistory && userProfile.feedbackHistory.length > 0) {
            const recentFeedback = userProfile.feedbackHistory.slice(-2);
            medicalInfo += `\n- 最近运动反馈:`;
            recentFeedback.forEach(feedback => {
                medicalInfo += `\n  * ${feedback.date}: 强度${feedback.intensity}/5`;
                if (feedback.discomfortNotes) {
                    medicalInfo += `, 不适症状: ${feedback.discomfortNotes}`;
                }
            });
        }
        
        return medicalInfo + `\n\n请根据以上信息提供专业的运动医疗建议和分析。`;
    }
}

// 全局状态管理器实例
window.fitnessStateManager = new FitnessStateManager();

