require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const path = require('path');

// ---- 中间件 ----
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---- API 路由（放在 static 之前，确保优先匹配）----
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

// ---- System Prompt ----
function buildSystemPrompt(slideCount) {
  return `你是一位顶级演示文稿设计师和文案专家。用户会给你一个主题，你需要生成一份专业、精美、拿来即用的演示文稿。

【核心原则】
- 文案要有感染力：用精准有力的表达，避免空洞套话。每句话都要给观众留下印象。
- 结构要清晰：逻辑递进自然，从引入→展开→深入→总结，形成完整叙事弧线。
- 视觉要出彩：为每页推荐最佳的背景色和配图关键词。

【输出格式】严格 JSON，不要任何额外文字：
{
  "title": "总标题（10字以内，有力且吸引人）",
  "slides": [
    {
      "title": "页面标题",
      "content": "要点1\\n要点2\\n要点3",
      "layout": "content",
      "imageKeyword": "english keyword for stock photo",
      "bgColor": "#1a1a2e"
    }
  ]
}

【新字段说明 —— 极其重要】
- imageKeyword：根据本页主题，提供一个精确的英文关键词（1-5个单词），用于自动搜索高质量配图。
  例如：科技页 → "artificial intelligence technology"、自然页 → "green forest nature"
  必须选能搜到好图的具体词汇，不要抽象词。
- bgColor：为本页推荐一个美观的十六进制背景色（如 "#1a1a2e"）。
  要求：(1) 深色系优先，能衬托白色文字 (2) 整体色调协调统一 (3) 不同页面可以有微妙变化但保持同一色系
  推荐色板：#1a1a2e(深邃蓝) #16213e(夜空蓝) #0f3460(宝石蓝) #2d3436(深灰) #1e272e(炭黑) #4a235a(深紫) #2c3e50(暗蓝灰)

【布局规则】
1. 总共恰好 ${slideCount} 页（不多不少）。
2. 第1页：标题页（layout="title"），content 放副标题，imageKeyword 选大气商务类，bgColor 用最深的颜色。
3. 最后1页：结束页（layout="title"），如"感谢聆听""期待合作"，bgColor 与第1页呼应。
4. 中间页面根据内容选布局：
   - "content"：要点列表型，最常用，适合展开论述
   - "two-column"：双栏对比型，需额外填 "content2" 字段（\\n 分隔）
5. 每页 content 用 \\n 分隔，每页 3-5 个精炼要点，每要点 15-25 字。

【文案风格】
- 标题：短促有力，制造悬念或直接点明价值（如"从0到1的跨越""为什么是现在？"）
- 要点：数据优先、动词开头、避免"的""了"等冗余字
- 副标题/结束语：有温度，不套路

只输出 JSON，无 Markdown 标记。`;
}

// ---- 健康检查 ----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: MODEL,
    hasApiKey: !!DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.startsWith('sk-'),
  });
});

// ---- 核心接口 ----
app.post('/api/generate-ppt', async (req, res) => {
  const { topic, slideCount } = req.body;

  // 参数校验
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: '请提供 topic 参数（演示文稿主题）' });
  }
  const count = Math.min(Math.max(parseInt(slideCount) || 6, 3), 15);

  // API Key 校验
  if (!DEEPSEEK_API_KEY || !DEEPSEEK_API_KEY.startsWith('sk-')) {
    return res.status(500).json({
      error: '后端未配置有效的 DEEPSEEK_API_KEY，请在 .env 文件中设置',
    });
  }

  console.log(`\n🤖 收到生成请求: "${topic.trim()}" (${count}页)`);

  try {
    const response = await axios.post(
      DEEPSEEK_BASE_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(count) },
          { role: 'user', content: `请为主题「${topic.trim()}」生成一份 ${count} 页的演示文稿。直接输出 JSON，不要有任何额外文字。` },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000,
      }
    );

    const aiText = response.data.choices?.[0]?.message?.content || '';
    console.log(`✅ DeepSeek 返回 (${aiText.length} 字符)`);

    // 解析 JSON —— 处理可能的 Markdown 代码块包裹
    let jsonStr = aiText.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('❌ JSON 解析失败:', parseErr.message);
      console.error('原始内容:', aiText.substring(0, 500));
      return res.status(500).json({
        error: 'AI 返回的内容格式异常，请重试',
        raw: aiText.substring(0, 300),
      });
    }

    // 校验结构
    if (!parsed.title || !Array.isArray(parsed.slides)) {
      return res.status(500).json({
        error: 'AI 返回的 JSON 结构不完整（缺少 title 或 slides）',
        raw: JSON.stringify(parsed).substring(0, 300),
      });
    }

    // 补齐默认值（含新字段 imageKeyword / bgColor）
    parsed.slides = parsed.slides.map((s, i) => ({
      title: s.title || `第 ${i + 1} 页`,
      content: s.content || '',
      content2: s.content2 || '',
      layout: ['title', 'content', 'two-column', 'image-text'].includes(s.layout)
        ? s.layout
        : 'content',
      fontSize: 'normal',
      textAlign: 'left',
      titlePos: 'top',
      image: '',
      note: '',
      subtitle: s.layout === 'title' ? (s.content || '') : '',
      imageKeyword: s.imageKeyword || '',
      bgColor: s.bgColor || '#1a1a2e',
    }));

    console.log(`✅ 解析成功: ${parsed.slides.length} 页 — "${parsed.title}"`);
    res.json(parsed);
  } catch (err) {
    console.error('❌ 请求 DeepSeek 失败:', err.message);
    if (err.response) {
      console.error('   状态码:', err.response.status);
      console.error('   响应:', JSON.stringify(err.response.data).substring(0, 300));
    }
    res.status(500).json({
      error: '调用 AI API 失败: ' + (err.response?.data?.error?.message || err.message),
    });
  }
});

// ---- 静态文件服务（API 路由之后，避免被覆盖）----
app.use(express.static(path.join(__dirname, '.')));

// 兜底：访问根路径时返回 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---- 启动（本地开发）/ Vercel Serverless 导出 ----
if (require.main === module) {
  // 本地开发模式
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   🚀 AI PPT 生成服务已启动           ║');
    console.log(`║   地址: http://localhost:${PORT}         ║`);
    console.log('║   接口: POST /api/generate-ppt       ║');
    console.log('║   模型: deepseek-chat                ║');
    console.log(`║   API Key: ${DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置'}                    ║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('');
  });
}

// Vercel Serverless 需要导出 app
module.exports = app;
