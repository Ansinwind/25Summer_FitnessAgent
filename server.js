require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// --- 中间件 ---
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
// 额外暴露根目录静态资源（用于访问 point.png）
app.use("/assets", express.static("."));

// --- 核心 AI API 工具函数 (封装) ---
const aiApiClient = axios.create({
  baseURL: "https://dashscope.aliyuncs.com/api/v1/apps/",
  headers: {
    Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
    "Content-Type": "application/json",
  },
});
// 从包含markdown/杂质的文本中尽量提取JSON字符串
function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  // 1) 优先匹配markdown代码块 ```json ... ``` 或 ``` ... ```
  let match = text.match(/```\s*json\s*([\s\S]*?)\s*```/i);
  if (match && match[1]) return match[1].trim();
  match = text.match(/```\s*([\s\S]*?)\s*```/);
  if (match && match[1]) return match[1].trim();
  // 2) 回退：取第一个 { 到最后一个 } 的子串
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1).trim();
  }
  return null;
}

// 重试机制
const retryApiCall = async (apiCall, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (
        error.response &&
        error.response.status === 429 &&
        i < maxRetries - 1
      ) {
        const delay = baseDelay * Math.pow(2, i); // 指数退避
        console.log(`API调用失败，${delay}ms后重试 (${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

/**
 * 将 AI 文本结果转为结构化 JSON
 * @param {string} aiText - 需要转换的文本
 * @returns {object} - 结构化的 JSON 对象
 */
async function toJson(aiText) {
  try {
    const appId = process.env.TOJSON_APP_ID;
    console.log("[toJson] using appId:", appId);
    if (!appId) {
      throw new Error("TOJSON_APP_ID environment variable not set");
    }

    const response = await retryApiCall(async () => {
      return await aiApiClient.post(`${appId}/completion`, {
        input: { prompt: aiText },
        parameters: {},
        debug: {},
      });
    });

    console.log("[toJson] API response:", response.data);

    // 尝试多种方式解析JSON
    let jsonResult = null;

    // 方式1: 直接获取json字段
    if (response.data.output && response.data.output.json) {
      jsonResult = response.data.output.json;
      console.log("[toJson] 从json字段获取:", jsonResult);
    }
    // 方式2: 从text字段解析JSON（类似select函数）
    else if (response.data.output && response.data.output.text) {
      const text = response.data.output.text;
      console.log("[toJson] 从text字段解析:", text);

      // 优先尝试从markdown/文本中精准提取子串
      const extracted = extractJsonFromText(text);
      if (extracted) {
        try {
          jsonResult = JSON.parse(extracted);
          console.log(
            "[toJson] 从提取的子串解析成功，keys=",
            Object.keys(jsonResult || {})
          );
        } catch (e) {
          console.log("[toJson] 子串解析失败:", e.message);
        }
      }

      // 如果仍失败，尝试直接解析整个text（可能抛错）
      if (!jsonResult) {
        try {
          jsonResult = JSON.parse(text);
          console.log("[toJson] 直接解析text成功:", jsonResult);
        } catch (e) {
          console.log("[toJson] 直接解析text失败:", e.message);
        }
      }
    }

    if (!jsonResult) {
      console.log("[toJson] 无法解析JSON，返回空对象");
      return {};
    }

    return jsonResult;
  } catch (error) {
    console.error("toJson API call failed:", error.message);
    throw new Error(`toJson API call failed: ${error.message}`);
  }
}

async function select(aiText) {
  try {
    const appId = process.env.Index_APP_ID;
    console.log("[select] using appId:", appId);
    if (!appId) {
      throw new Error("Index_APP_ID environment variable not set");
    }

    const response = await retryApiCall(async () => {
      return await aiApiClient.post(`${appId}/completion`, {
        input: { prompt: aiText },
        parameters: {},
        debug: {},
      });
    });

    console.log("[select] API response:", response.data);
    // API返回的是text字段包含JSON字符串，需要解析
    const textResponse = response.data.output.text;
    if (textResponse) {
      try {
        // 提取JSON部分（去除markdown代码块标记），更稳健
        const extracted = extractJsonFromText(textResponse);
        const jsonStr = extracted || textResponse;
        const parsed = JSON.parse(jsonStr);
        console.log("[select] parsed JSON:", parsed);
        return parsed;
      } catch (parseError) {
        console.error("[select] JSON parse error:", parseError.message);
        throw new Error(
          `Failed to parse JSON from response: ${parseError.message}`
        );
      }
    }
    throw new Error("No text response from API");
  } catch (error) {
    console.error("index API call failed:", error.message);
    throw new Error(`index API call failed: ${error.message}`);
  }
}

/**
 * 根据条件分发并调用相应的 AI 服务（增强版 - ABC一体化）
 * @param {object} data - 包含 prompt, condition, userProfile 等数据的请求体
 * @returns {object} - 包含 AI 生成文本和 JSON 结果的对象
 */
async function handleDispatch(data) {
  const {
    prompt,
    condition,
    userProfile,
    customRequest,
    userMessage,
    systemPrompt,
    fitnessState, // 新增：前端传递的状态信息
  } = data;
  let aiText = "";

  // 构建增强的提示词（ABC一体化）
  const enhancedPrompt = buildEnhancedPrompt(condition, userProfile, customRequest, fitnessState);

  switch (condition) {
    case "A":
      const planResponse = await retryApiCall(async () => {
        return await aiApiClient.post(`${process.env.PLAN_APP_ID}/completion`, {
          input: { prompt: enhancedPrompt },
        });
      });
      aiText = planResponse.data.output.text;
      const json = await toJson(aiText);
      console.log("[dispatch:A] aiText length =", aiText ? aiText.length : 0);
      console.log("[dispatch:A] Enhanced prompt used for ABC integration");
      
      // 可选：将结构化 JSON 转发到外部 API
      if (process.env.FORWARD_API_URL) {
        try {
          await axios.post(process.env.FORWARD_API_URL, json, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (forwardErr) {
          console.error(
            "Forward JSON to external API failed:",
            forwardErr.message
          );
        }
      }
      return { text: aiText, textLength: aiText ? aiText.length : 0, json };

    case "B":
      const routeResponse = await retryApiCall(async () => {
        return await aiApiClient.post(
          `${process.env.ROUTE_APP_ID}/completion`,
          {
            input: { prompt: enhancedPrompt },
          }
        );
      });
      aiText = routeResponse.data.output.text;
      console.log("[dispatch:B] aiText length =", aiText ? aiText.length : 0);
      console.log("[dispatch:B] Enhanced prompt used for ABC integration");

      let index = null;
      try {
        index = await select(aiText);
        console.log(
          "[dispatch:B] index result =",
          JSON.stringify(index, null, 2)
        );
      } catch (selectError) {
        console.error(
          "[dispatch:B] select function failed:",
          selectError.message
        );
        console.log("[dispatch:B] index result = null (due to error)");
      }

      return { text: aiText, textLength: aiText ? aiText.length : 0, index };

    case "C":
      const consultResponse = await aiApiClient.post(`${process.env.CONSULT_APP_ID}/completion`,
        { 
          input: { prompt: enhancedPrompt } 
        }
      );
      aiText = consultResponse.data.output.text;
      console.log("[dispatch:C] Enhanced prompt used for ABC integration");
      return { text: aiText };
    default:
      const error = new Error("Invalid condition");
      error.statusCode = 400;
      throw error;
  }
}

/**
 * 构建增强的提示词（ABC一体化设计）
 * @param {string} service - 服务类型 (A/B/C)
 * @param {object} userProfile - 用户资料
 * @param {string} customRequest - 用户请求
 * @param {object} fitnessState - 健身状态信息
 * @returns {string} - 增强的提示词
 */
function buildEnhancedPrompt(service, userProfile, customRequest, fitnessState = {}) {
  const context = getContextForService(service, fitnessState);
  let prompt = '';
  
  switch (service) {
    case 'A': // 计划生成
      prompt = buildPersonalizedContext(userProfile, customRequest);
      
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
      prompt = buildMedicalConsultationPrompt(userProfile, customRequest);
      
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

/**
 * 获取服务上下文
 * @param {string} service - 服务类型
 * @param {object} fitnessState - 健身状态
 * @returns {object} - 服务上下文
 */
function getContextForService(service, fitnessState) {
  const context = {
    dailyStatus: fitnessState.dailyStatus || 'normal',
    energyLevel: fitnessState.energyLevel || 5,
    lastActivity: fitnessState.lastActivity || null
  };
  
  switch (service) {
    case 'A':
      return {
        ...context,
        recentRoute: fitnessState.currentRoute || null,
        medicalAdvice: fitnessState.recentMedicalAdvice || null
      };
    case 'B':
      return {
        ...context,
        currentPlan: fitnessState.currentPlan || null,
        medicalAdvice: fitnessState.recentMedicalAdvice || null
      };
    case 'C':
      return {
        ...context,
        currentPlan: fitnessState.currentPlan || null,
        recentRoute: fitnessState.currentRoute || null
      };
  }
}

/**
 * 构建个性化上下文
 * @param {object} userProfile - 用户资料
 * @param {string} customRequest - 用户请求
 * @returns {string} - 个性化上下文
 */
function buildPersonalizedContext(userProfile, customRequest) {
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
        - 锻炼频率: ${
          userProfile?.frequency === "3-4_times_week" ? "每周3-4次" :
          userProfile?.frequency === "1-2_times_week" ? "每周1-2次" :
          userProfile?.frequency === "5_times_week" ? "每周5次以上" : "未知"
        }`;

  // 添加身体数据
  if (userProfile?.body_fat) {
    personalizedInfo += `\n- 体脂率: ${userProfile.body_fat}%`;
  }
  if (userProfile?.metabolic_rate) {
    personalizedInfo += `\n- 基础代谢率: ${userProfile.metabolic_rate} kcal/天`;
  }
  if (userProfile?.muscle_mass) {
    personalizedInfo += `\n- 肌肉量: ${userProfile.muscle_mass} kg`;
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

/**
 * 构建医疗咨询提示词
 * @param {object} userProfile - 用户资料
 * @param {string} customRequest - 用户请求
 * @returns {string} - 医疗咨询提示词
 */
function buildMedicalConsultationPrompt(userProfile, customRequest) {
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

// --- API 路由 ---
app.post("/api/user", (req, res) => {
  console.log("Received user profile:", req.body);
  // 在真实项目中，这里会存入数据库
  res.status(201).json({ message: "User profile saved" });
});

app.post("/api/dispatch", async (req, res, next) => {
  try {
    const result = await handleDispatch(req.body);
    res.json(result);
  } catch (error) {
    // 使用 next(error) 将错误传递给全局错误处理中间件
    next(error);
  }
});

// 已移除 ExerciseDB 代理

// --- 全局错误处理中间件 ---
app.use((err, req, res, next) => {
  console.error("Error encountered:", err.message);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const errorMessage =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "An internal server error occurred"
      : err.message;

  res.status(statusCode).json({
    error: errorMessage,
  });
});

// --- 启动服务器 ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
