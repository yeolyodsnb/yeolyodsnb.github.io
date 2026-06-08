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
  return `你是一个专业的 PPT 演示文稿生成助手。用户会给你一个主题，你需要生成一份结构清晰、内容充实的演示文稿。

【重要】你必须严格以 JSON 格式输出，不要输出任何其他文字。JSON 结构如下：
{
  "title": "总标题（10字以内，吸引人）",
  "slides": [
    {
      "title": "第1页标题",
      "content": "要点1\\n要点2\\n要点3",
      "layout": "content"
    }
  ]
}

【规则】
1. 总共生成恰好 ${slideCount} 页幻灯片（不多不少）。
2. 第1页必须是标题页（layout 设为 "title"），包含主标题和引人注目的副标题。标题页的 content 字段放副标题。
3. 最后1页必须是结束页（layout 设为 "title"），如"感谢观看"或总结。
4. 中间页面根据内容选择合适布局：
   - "content"：普通内容页（要点列表），最常用
   - "two-column"：左右对比内容，content 放左栏，content2 放右栏（用 \\n 分隔两栏内容，系统会自动分栏）
   - 双栏页请额外添加 "content2" 字段
5. 每页 content 用 \\n 分隔多个要点，每个要点控制在 20 字以内，每页 3-5 个要点。
6. 内容要具体有料，避免空洞套话。适合演讲展示。
7. 只输出 JSON，不要有任何 Markdown 代码块标记（不要 \`\`\`json）。

【输出示例】
{"title":"人工智能发展史","slides":[{"title":"欢迎","content":"人工智能发展史\\n从图灵到ChatGPT","layout":"title"},{"title":"AI的诞生","content":"1956年达特茅斯会议\\n图灵测试的里程碑\\n早期符号主义探索","layout":"content"},{"title":"感谢观看","content":"谢谢大家\\n欢迎提问交流","layout":"title"}]}`;
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

    // 补齐默认值
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

// ---- 启动 ----
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
