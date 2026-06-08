// ========== PPT Maker Pro ==========

// 主题配色
const THEMES = {
  purple: { bg: '#6c5ce7', text: '#ffffff', accent: '#a29bfe', name: '紫色' },
  blue:   { bg: '#0984e3', text: '#ffffff', accent: '#74b9ff', name: '蓝色' },
  green:  { bg: '#00b894', text: '#ffffff', accent: '#55efc4', name: '绿色' },
  orange: { bg: '#e17055', text: '#ffffff', accent: '#fab1a0', name: '橙色' },
  dark:   { bg: '#2d3436', text: '#ffffff', accent: '#636e72', name: '深色' },
  red:    { bg: '#d63031', text: '#ffffff', accent: '#ff7675', name: '红色' },
  teal:   { bg: '#00a8a8', text: '#ffffff', accent: '#48d1cc', name: '青色' },
  pink:   { bg: '#e84393', text: '#ffffff', accent: '#fd79a8', name: '粉红' },
};

// 布局图标映射
const LAYOUT_ICONS = {
  'content':    '📋',
  'title':      '🎯',
  'image-text': '🖼️',
  'two-column': '⬅➡',
  'image-only': '🖼',
};

// 字号映射
const FONT_SIZES = {
  small:  { title: 22, body: 14, exportTitle: 28, exportBody: 14 },
  normal: { title: 22, body: 14, exportTitle: 36, exportBody: 18 },
  large:  { title: 28, body: 18, exportTitle: 44, exportBody: 24 },
  xlarge: { title: 34, body: 22, exportTitle: 54, exportBody: 32 },
};

// ========== AI 生成配置 ==========
// 后端地址：本地开发 → localhost:3001，线上 → Vercel 云端
const API_BASE = (() => {
  try {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:${new URLSearchParams(window.location.search).get('port') || '3001'}`;
    }
    // 生产环境：优先读取用户自定义地址
    let savedBackend = '';
    try { savedBackend = (localStorage.getItem('ai_backend_url') || '').trim().replace(/^["']+|["']+$/g, ''); } catch (_) {}
    if (savedBackend && savedBackend.startsWith('http')) return savedBackend;
    // GitHub Pages → Vercel 后端
    if (window.location.hostname.endsWith('github.io')) {
      return 'https://ppt-maker-api.vercel.app';
    }
    // 其他环境使用同域
    return window.location.origin;
  } catch (_) {
    // 极端兜底：任何异常都返回 Vercel 地址
    return 'https://ppt-maker-api.vercel.app';
  }
})();

// ========== 撤销/重做历史 ==========
const HISTORY_LIMIT = 50;
let history = [];
let historyIndex = -1;
let _suppressHistory = false;

function pushHistory() {
  if (_suppressHistory) return;
  // 删除 historyIndex 之后的历史
  history = history.slice(0, historyIndex + 1);
  history.push({ slides: JSON.parse(JSON.stringify(slides)), index: currentIndex });
  if (history.length > HISTORY_LIMIT) history.shift();
  historyIndex = history.length - 1;
  updateUndoRedoBtns();
}

function updateUndoRedoBtns() {
  const undoBtn = $('undoBtn');
  const redoBtn = $('redoBtn');
  if (undoBtn) undoBtn.disabled = historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
}

function undoAction() {
  if (historyIndex <= 0) return;
  historyIndex--;
  _suppressHistory = true;
  const snap = history[historyIndex];
  slides = JSON.parse(JSON.stringify(snap.slides));
  currentIndex = Math.min(snap.index, slides.length - 1);
  renderSlideList();
  selectSlide(currentIndex);
  _suppressHistory = false;
  updateUndoRedoBtns();
  toast('↩ 已撤销');
}

function redoAction() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  _suppressHistory = true;
  const snap = history[historyIndex];
  slides = JSON.parse(JSON.stringify(snap.slides));
  currentIndex = Math.min(snap.index, slides.length - 1);
  renderSlideList();
  selectSlide(currentIndex);
  _suppressHistory = false;
  updateUndoRedoBtns();
  toast('↪ 已重做');
}

// ========== 草稿保存 ==========
const DRAFT_KEY = 'ppt_maker_draft';
const DRAFT_THEME_KEY = 'ppt_maker_theme';

function saveDraft() {
  saveCurrent();
  try {
    const draft = { slides, currentIndex, theme: currentTheme, ts: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    localStorage.setItem(DRAFT_THEME_KEY, currentTheme);
    toast('💾 草稿已保存');
  } catch (e) {
    toast('❌ 草稿保存失败（存储可能已满）');
  }
}

function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) { toast('暂无草稿'); return; }
  try {
    const draft = JSON.parse(raw);
    if (!Array.isArray(draft.slides) || draft.slides.length === 0) { toast('草稿数据异常'); return; }
    const date = new Date(draft.ts);
    const timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
    if (!confirm(`加载草稿？\n（保存于 ${timeStr}，共 ${draft.slides.length} 页）`)) return;
    slides = draft.slides;
    currentIndex = Math.min(draft.currentIndex || 0, slides.length - 1);
    if (draft.theme) setTheme(draft.theme);
    renderSlideList();
    selectSlide(currentIndex);
    pushHistory();
    toast('✅ 草稿已加载');
  } catch (e) {
    toast('❌ 草稿数据损坏');
  }
}

// 自动草稿恢复提示（页面加载时）
function checkAutoRestoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    if (!Array.isArray(draft.slides) || draft.slides.length === 0) return;
    const date = new Date(draft.ts);
    const timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
    // 用自定义 toast-like 提示
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:#2d3436;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;z-index:999;display:flex;gap:12px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,0.2)';
    tip.innerHTML = `📄 发现草稿（${timeStr}，${draft.slides.length}页）<button id="_restoreBtn" style="padding:4px 12px;background:#6c5ce7;border:none;color:#fff;border-radius:6px;cursor:pointer;font-size:12px">恢复</button><button id="_dismissBtn" style="padding:4px 10px;background:transparent;border:1px solid #666;color:#ccc;border-radius:6px;cursor:pointer;font-size:12px">忽略</button>`;
    document.body.appendChild(tip);
    tip.querySelector('#_restoreBtn').addEventListener('click', () => { loadDraft(); tip.remove(); });
    tip.querySelector('#_dismissBtn').addEventListener('click', () => tip.remove());
    setTimeout(() => tip.remove(), 8000);
  } catch (e) {}
}

// ========== JSON 导入/导出 ==========
function exportJson() {
  saveCurrent();
  const data = { version: 1, theme: currentTheme, slides };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (exportFileName.value.trim() || '演示文稿') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ JSON 已导出');
}

function importJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data.slides)) throw new Error('slides 字段缺失');
      if (!confirm(`导入 JSON？当前内容将被替换（共 ${data.slides.length} 页）`)) return;
      slides = data.slides;
      currentIndex = 0;
      if (data.theme) setTheme(data.theme);
      renderSlideList();
      selectSlide(0);
      pushHistory();
      toast('✅ JSON 已导入');
    } catch (err) {
      toast('❌ 导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
}
let slides = [
  { title: '欢迎使用 PPT 制作工具', subtitle: '', content: '点击左侧「+ 添加」创建新幻灯片\n选择版面布局和配色模板\n编辑完成后一键导出 PPTX 文件', content2: '', image: '', note: '', layout: 'content', fontSize: 'normal', textAlign: 'left', titlePos: 'top', bgColor: '', imageKeyword: '' },
  { title: '五大版面布局', subtitle: '', content: '内容页：标题 + 要点列表，适合正文', content2: '标题页：居中大标题，适合封面/章节页\n图文混排：图片与文字并排展示\n双栏：左右对比内容\n图片页：全屏图片展示', image: '', note: '', layout: 'two-column', fontSize: 'normal', textAlign: 'left', titlePos: 'top', bgColor: '', imageKeyword: '' },
  { title: '开始制作', subtitle: '祝你创作愉快 🎉', content: '', content2: '', image: '', note: '', layout: 'title', fontSize: 'large', textAlign: 'center', titlePos: 'middle', bgColor: '', imageKeyword: '' },
];

let currentIndex = 0;
let currentTheme = 'purple';

// ========== DOM 引用 ==========
const $ = id => document.getElementById(id);
const slideListEl    = $('slideList');
const addSlideBtn    = $('addSlideBtn');
const deleteSlideBtn = $('deleteSlideBtn');
const moveUpBtn      = $('moveUpBtn');
const moveDownBtn    = $('moveDownBtn');
const dupSlideBtn    = $('duplicateSlideBtn');
const exportBtn      = $('exportBtn');
const exportFileName = $('exportFileName');
const slideTitle     = $('slideTitle');
const slideSubtitle  = $('slideSubtitle');
const slideContent   = $('slideContent');
const slideContent2  = $('slideContent2');
const slideImage     = $('slideImage');
const slideNote      = $('slideNote');
const fontSizeSel    = $('fontSize');
const textAlignSel   = $('textAlign');
const titlePosSel    = $('titlePosition');
const previewSlide   = $('previewContent');
const previewTitle   = $('previewTitle');
const previewSubtitle = $('previewSubtitle');
const previewBody    = $('previewBody');
const previewBody2   = $('previewBody2');
const previewImage   = $('previewImage');
const subtitleGroup  = $('subtitleGroup');
const contentGroup   = $('contentGroup');
const content2Group  = $('content2Group');
const imageGroup     = $('imageGroup');

// ========== Toast ==========
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// ========== 保存当前编辑到数据模型 ==========
function saveCurrent() {
  const s = slides[currentIndex];
  s.title      = slideTitle.value;
  s.subtitle   = slideSubtitle.value;
  s.content    = slideContent.value;
  s.content2   = slideContent2.value;
  s.image      = slideImage.value;
  s.note       = slideNote.value;
  s.fontSize   = fontSizeSel.value;
  s.textAlign  = textAlignSel.value;
  s.titlePos   = titlePosSel.value;
}

// ========== 渲染幻灯片列表 ==========
function renderSlideList() {
  slideListEl.innerHTML = '';
  slides.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = i === currentIndex ? 'active' : '';
    li.innerHTML = `
      <span class="slide-num">#${i + 1}</span>
      <span class="layout-badge">${LAYOUT_ICONS[s.layout] || '📋'}</span>
      <span class="slide-label">${s.title || '无标题'}</span>
    `;
    li.addEventListener('click', () => { saveCurrent(); selectSlide(i); });
    slideListEl.appendChild(li);
  });
}

// ========== 选择幻灯片 ==========
// 翻页方向追踪（用于动画方向）
let lastSlideIndex = 0;

function selectSlide(index) {
  const direction = index > lastSlideIndex ? 'forward' : (index < lastSlideIndex ? 'backward' : 'none');
  lastSlideIndex = index;
  currentIndex = index;
  const s = slides[index];

  slideTitle.value     = s.title || '';
  slideSubtitle.value  = s.subtitle || '';
  slideContent.value   = s.content || '';
  slideContent2.value  = s.content2 || '';
  slideImage.value     = s.image || '';
  slideNote.value      = s.note || '';
  fontSizeSel.value    = s.fontSize || 'normal';
  textAlignSel.value   = s.textAlign || 'left';
  titlePosSel.value    = s.titlePos || 'top';

  // 同步布局按钮
  document.querySelectorAll('.layout-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.layout === s.layout);
  });

  toggleFieldsByLayout(s.layout);
  updatePreview(direction);
  renderSlideList();
}

// ========== 根据布局显示/隐藏字段 ==========
function toggleFieldsByLayout(layout) {
  const show = (el, v) => { if (el) el.style.display = v ? '' : 'none'; };

  switch (layout) {
    case 'title':
      show(subtitleGroup, true);
      show(contentGroup, false);
      show(content2Group, false);
      show(imageGroup, false);
      break;
    case 'content':
      show(subtitleGroup, false);
      show(contentGroup, true);
      show(content2Group, false);
      show(imageGroup, true);
      break;
    case 'two-column':
      show(subtitleGroup, false);
      show(contentGroup, true);
      show(content2Group, true);
      show(imageGroup, false);
      break;
    case 'image-text':
      show(subtitleGroup, false);
      show(contentGroup, true);
      show(content2Group, false);
      show(imageGroup, true);
      break;
    case 'image-only':
      show(subtitleGroup, true);
      show(contentGroup, false);
      show(content2Group, false);
      show(imageGroup, true);
      break;
    default:
      show(subtitleGroup, false);
      show(contentGroup, true);
      show(content2Group, false);
      show(imageGroup, true);
  }
}

// ========== 设置布局 ==========
function setLayout(layout) {
  const s = slides[currentIndex];
  s.layout = layout;
  document.querySelectorAll('.layout-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.layout === layout);
  });
  toggleFieldsByLayout(layout);
  updatePreview();
  renderSlideList();
  pushHistory();
}

// ========== 更新预览 ==========
function updatePreview(direction) {
  const s = slides[currentIndex];
  const theme = THEMES[currentTheme];
  const fs = FONT_SIZES[s.fontSize] || FONT_SIZES.normal;

  // 翻页动画：根据方向选择效果
  previewSlide.className = 'preview-slide';
  if (direction === 'forward') {
    previewSlide.classList.add('anim-slide-in');
  } else if (direction === 'backward') {
    previewSlide.classList.add('anim-fade-in');
  }
  // 动画结束后移除类名
  setTimeout(() => {
    previewSlide.classList.remove('anim-slide-in', 'anim-fade-in');
  }, 500);

  previewTitle.style.textAlign = '';
  previewBody.style.textAlign = '';

  // 背景（AI 指定色优先，其次用当前主题色）
  previewSlide.style.background = (s.bgColor && s.bgColor.startsWith('#')) ? s.bgColor : theme.bg;
  previewSlide.style.justifyContent = s.titlePos === 'middle' ? 'center' : 'flex-start';

  // 标题
  previewTitle.textContent = s.title || '标题预览';
  previewTitle.style.color = theme.text;
  previewTitle.style.fontSize = fs.title + 'px';

  // 副标题
  if (s.subtitle && s.layout === 'title') {
    previewSubtitle.style.display = '';
    previewSubtitle.textContent = s.subtitle;
    previewSubtitle.style.color = theme.text;
  } else if (s.subtitle && s.layout === 'image-only') {
    previewSubtitle.style.display = '';
    previewSubtitle.textContent = s.subtitle;
    previewSubtitle.style.color = theme.text;
  } else {
    previewSubtitle.style.display = 'none';
    previewSubtitle.textContent = '';
  }

  // 对齐
  if (s.textAlign === 'center') {
    previewTitle.style.textAlign = 'center';
    previewBody.style.textAlign = 'center';
    previewBody2.style.textAlign = 'center';
  } else if (s.textAlign === 'right') {
    previewTitle.style.textAlign = 'right';
    previewBody.style.textAlign = 'right';
    previewBody2.style.textAlign = 'right';
  }

  // 清空
  previewBody.innerHTML = '';
  previewBody2.innerHTML = '';
  previewBody2.style.display = 'none';
  previewImage.style.display = 'none';
  previewImage.src = '';

  // 根据布局渲染
  switch (s.layout) {
    case 'title':
      previewSlide.classList.add('title-layout');
      break;

    case 'content':
      renderPreviewLines(previewBody, s.content, fs.body, theme.text);
      if (s.image) renderPreviewImage();
      break;

    case 'two-column':
      previewSlide.style.flexDirection = 'row';
      previewSlide.style.gap = '16px';
      previewSlide.style.justifyContent = 'flex-start';
      previewBody.style.flex = '1';
      renderPreviewLines(previewBody, s.content, fs.body, theme.text);
      previewBody2.style.display = '';
      previewBody2.style.flex = '1';
      renderPreviewLines(previewBody2, s.content2, fs.body, theme.text);
      break;

    case 'image-text':
      previewSlide.classList.add('image-text-layout');
      {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-text-col';
        renderPreviewLines(wrapper, s.content, fs.body, theme.text);
        previewBody.appendChild(wrapper);
      }
      if (s.image) renderPreviewImage();
      break;

    case 'image-only':
      previewSlide.classList.add('image-layout');
      if (s.image) {
        renderPreviewImage();
        previewImage.style.maxHeight = '100%';
      }
      break;

    default:
      renderPreviewLines(previewBody, s.content, fs.body, theme.text);
  }
}

function renderPreviewLines(container, text, fontSize, color) {
  if (!text) return;
  const lines = text.split('\n').filter(l => l.trim());
  lines.forEach((line, i) => {
    const p = document.createElement('p');
    p.className = 'preview-text';
    p.textContent = '• ' + line;
    p.style.fontSize = fontSize + 'px';
    p.style.color = color;
    p.style.opacity = '0.85';
    p.style.animationDelay = (i * 0.08) + 's';
    container.appendChild(p);
  });
}

function renderPreviewImage() {
  const imgSrc = slides[currentIndex].image;
  if (!imgSrc) { previewImage.style.display = 'none'; return; }
  previewImage.style.display = '';
  previewImage.src = imgSrc;
  previewImage.onerror = () => { previewImage.style.display = 'none'; };
}

// ========== 设置主题 ==========
function setTheme(name, applyToAll) {
  currentTheme = name;
  document.querySelectorAll('.theme-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.theme === name);
  });
  // 清除当前页的 AI bgColor，让主题色生效
  if (applyToAll) {
    slides.forEach(s => { s.bgColor = ''; });
    toast('🎨 已将主题应用到全部幻灯片');
  } else {
    slides[currentIndex].bgColor = '';
  }
  updatePreview();
}

// ========== 幻灯片操作 ==========
function addSlide() {
  saveCurrent();
  const newSlide = {
    title: '新幻灯片', subtitle: '', content: '点击此处编辑内容', content2: '',
    image: '', note: '', layout: 'content', fontSize: 'normal', textAlign: 'left', titlePos: 'top',
    bgColor: '', imageKeyword: '',
  };
  slides.push(newSlide);
  selectSlide(slides.length - 1);
  pushHistory();
}

function deleteSlide() {
  if (slides.length <= 1) { toast('至少保留一张幻灯片'); return; }
  if (!confirm(`确定删除「${slides[currentIndex].title || '无标题'}」？`)) return;
  slides.splice(currentIndex, 1);
  if (currentIndex >= slides.length) currentIndex = slides.length - 1;
  selectSlide(currentIndex);
  pushHistory();
}

function moveSlide(up) {
  saveCurrent();
  const i = currentIndex;
  if (up && i === 0) return;
  if (!up && i === slides.length - 1) return;
  const target = up ? i - 1 : i + 1;
  [slides[i], slides[target]] = [slides[target], slides[i]];
  currentIndex = target;
  selectSlide(currentIndex);
  pushHistory();
  toast(up ? '已上移' : '已下移');
}

function duplicateSlide() {
  saveCurrent();
  const clone = JSON.parse(JSON.stringify(slides[currentIndex]));
  clone.title = (clone.title || '复制') + ' (副本)';
  slides.splice(currentIndex + 1, 0, clone);
  selectSlide(currentIndex + 1);
  pushHistory();
  toast('幻灯片已复制');
}

// ========== 导出 PPTX ==========
function exportPPTX() {
  saveCurrent();

  if (typeof PptxGenJS === 'undefined') {
    toast('PPT 库加载中，请稍候...'); return;
  }

  const pptx = new PptxGenJS();
  const theme = THEMES[currentTheme];
  pptx.defineLayout({ name: 'WIDE', width: '13.333', height: '7.5' });
  pptx.layout = 'WIDE';

  slides.forEach((slide, idx) => {
    const s = pptx.addSlide();
    const fs = FONT_SIZES[slide.fontSize] || FONT_SIZES.normal;
    // 背景色：AI 指定优先，兜底用主题色
    const slideBg = (slide.bgColor && slide.bgColor.startsWith('#')) ? slide.bgColor : theme.bg;
    s.background = { color: slideBg };

    // 顶部装饰条
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.1, fill: { color: theme.accent },
    });

    // 页码
    s.addText(`${idx + 1} / ${slides.length}`, {
      x: 11.5, y: 7.0, w: 1.5, h: 0.4,
      fontSize: 9, color: theme.accent, fontFace: 'Microsoft YaHei', align: 'right',
    });

    // 标题位置
    const titleY = slide.titlePos === 'middle' ? 2.4 : 0.8;

    // 根据布局导出
    switch (slide.layout) {
      case 'title':
        // 居中标题页
        if (slide.title) {
          s.addText(slide.title, {
            x: 1.5, y: 2.5, w: 10.333, h: 1.2,
            fontSize: fs.exportTitle, bold: true, color: theme.text,
            fontFace: 'Microsoft YaHei', align: 'center',
          });
        }
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 2, y: 3.8, w: 9.333, h: 0.8,
            fontSize: 18, color: theme.accent,
            fontFace: 'Microsoft YaHei', align: 'center',
          });
        }
        break;

      case 'content':
        exportTitleAndBody(s, slide, theme, fs, titleY);
        if (slide.image) exportImage(s, slide.image, 9, 2, 3.7, 3.7);
        break;

      case 'two-column':
        // 双栏
        if (slide.title) {
          s.addText(slide.title, {
            x: 1, y: titleY, w: 11.333, h: 0.9,
            fontSize: fs.exportTitle, bold: true, color: theme.text,
            fontFace: 'Microsoft YaHei', align: slide.textAlign,
          });
        }
        if (slide.content) {
          const lines = slide.content.split('\n').filter(l => l.trim());
          s.addText(lines.map((l, i) => ({
            text: l, options: {
              fontSize: fs.exportBody, color: theme.text, fontFace: 'Microsoft YaHei',
              bullet: { type: 'number' }, paraSpaceAfter: 6,
            },
          })), {
            x: 1, y: titleY + 1.2, w: 5.2, h: 4.5, valign: 'top',
          });
        }
        if (slide.content2) {
          const lines2 = slide.content2.split('\n').filter(l => l.trim());
          s.addText(lines2.map((l, i) => ({
            text: l, options: {
              fontSize: fs.exportBody, color: theme.text, fontFace: 'Microsoft YaHei',
              bullet: { type: 'number' }, paraSpaceAfter: 6,
            },
          })), {
            x: 7, y: titleY + 1.2, w: 5.2, h: 4.5, valign: 'top',
          });
        }
        // 中间分隔线
        s.addShape(pptx.ShapeType.rect, {
          x: 6.55, y: titleY + 1.2, w: 0.04, h: 4.5, fill: { color: theme.accent },
        });
        break;

      case 'image-text':
        // 图文混排
        if (slide.title) {
          s.addText(slide.title, {
            x: 1, y: titleY, w: 6.5, h: 0.9,
            fontSize: fs.exportTitle, bold: true, color: theme.text,
            fontFace: 'Microsoft YaHei', align: slide.textAlign,
          });
        }
        if (slide.content) {
          const lines = slide.content.split('\n').filter(l => l.trim());
          s.addText(lines.map((l, i) => ({
            text: l, options: {
              fontSize: fs.exportBody, color: theme.text, fontFace: 'Microsoft YaHei',
              bullet: { type: 'number' }, paraSpaceAfter: 6,
            },
          })), {
            x: 1, y: titleY + 1.2, w: 6.5, h: 4.5, valign: 'top',
          });
        }
        if (slide.image) exportImage(s, slide.image, 8.2, 1.5, 4.5, 4.8);
        break;

      case 'image-only':
        // 图片页
        if (slide.image) {
          s.addImage({
            path: slide.image,
            x: 0, y: 0, w: '100%', h: '100%',
            sizing: { type: 'cover', w: '100%', h: '100%' },
          }).catch(() => {});
        }
        if (slide.title || slide.subtitle) {
          // 底部半透明文字条
          s.addShape(pptx.ShapeType.rect, {
            x: 0, y: 5.8, w: '100%', h: 1.7,
            fill: { color: '000000', transparency: 40 },
          });
          if (slide.title) {
            s.addText(slide.title, {
              x: 1, y: 5.9, w: '11.333', h: 0.8,
              fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Microsoft YaHei',
            });
          }
          if (slide.subtitle) {
            s.addText(slide.subtitle, {
              x: 1, y: 6.6, w: '11.333', h: 0.6,
              fontSize: 14, color: 'DDDDDD', fontFace: 'Microsoft YaHei',
            });
          }
        }
        break;

      default:
        exportTitleAndBody(s, slide, theme, fs, titleY);
    }

    // 底部装饰条
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.4, w: '100%', h: 0.1, fill: { color: theme.accent },
    });

    // 备注
    if (slide.note) {
      s.addNotes(slide.note);
    }
  });

  // 下载
  const fname = exportFileName.value.trim() || '演示文稿';
  pptx.writeFile({ fileName: fname + '.pptx' })
    .then(() => toast('✅ 导出成功！'))
    .catch(() => toast('导出失败，请重试'));
}

function exportTitleAndBody(s, slide, theme, fs, titleY) {
  if (slide.title) {
    s.addText(slide.title, {
      x: 1, y: titleY, w: 11.333, h: 0.9,
      fontSize: fs.exportTitle, bold: true, color: theme.text,
      fontFace: 'Microsoft YaHei', align: slide.textAlign,
    });
  }
  if (slide.content) {
    const lines = slide.content.split('\n').filter(l => l.trim());
    const align = slide.textAlign;
    const bodyX = align === 'center' ? 1.5 : 1.2;
    const bodyW = align === 'center' ? 10.333 : 10.933;
    s.addText(lines.map((l, i) => ({
      text: l, options: {
        fontSize: fs.exportBody, color: theme.text, fontFace: 'Microsoft YaHei',
        bullet: { type: 'number' }, paraSpaceAfter: 6, align: align,
      },
    })), {
      x: bodyX, y: titleY + 1.2, w: bodyW, h: 4.5, valign: 'top',
    });
  }
}

function exportImage(s, url, x, y, w, h) {
  s.addImage({ path: url, x, y, w, h, sizing: { type: 'contain', w, h } })
    .catch(() => {});
}

// ========== 图片搜索引擎 ==========
// 双模式：Unsplash API（需 Key，高质量搜索） + Source 模式（无需 Key，开箱即用）

const imgSearchOverlay   = $('imageSearchOverlay');
const imgSearchInput     = $('imgSearchInput');
const imgSearchBtn       = $('imgSearchBtn');
const imgSearchResults   = $('imgSearchResults');
const imgSearchLoading   = $('imgSearchLoading');
const openImgSearchBtn   = $('openImageSearchBtn');
const closeImgSearchBtn  = $('closeImgSearchBtn');
const imgRefreshBtn      = $('imgRefreshBtn');
const apiKeyInput        = $('unsplashApiKeyInput');
const apiKeyStatus       = $('apiKeyStatus');
const apiKeySection      = $('apiKeySection');

// 搜索状态（用于"换一批"刷新）
let currentSearchQuery = '';
let currentSearchPage = 1;

// 从 localStorage 读取用户自己的 API Key
function getApiKey() {
  let key = localStorage.getItem('unsplash_api_key') || '';
  key = key.trim();
  // 去掉可能误包裹的首尾引号（用户复制时容易带进来）
  key = key.replace(/^["']+|["']+$/g, '');
  return key;
}

function saveApiKey(key) {
  localStorage.setItem('unsplash_api_key', key.trim());
}

function updateApiKeyUI() {
  const key = getApiKey();
  apiKeyInput.value = key;
  if (key) {
    apiKeyStatus.textContent = '✅ API Key 已配置';
    apiKeyStatus.style.color = '#27ae60';
  } else {
    apiKeyStatus.textContent = '未配置（仍可使用 Source 模式搜索）';
    apiKeyStatus.style.color = '#999';
  }
}

// 暴露给 HTML onclick
window.toggleApiSection = function() {
  apiKeySection.style.display = apiKeySection.style.display === 'none' ? '' : 'none';
};

window.saveAndCloseApi = function() {
  const key = apiKeyInput.value.trim();
  if (key) {
    saveApiKey(key);
    updateApiKeyUI();
    toast('✅ API Key 已保存');
  }
  apiKeySection.style.display = 'none';
};

function openImageSearch() {
  imgSearchOverlay.style.display = '';
  updateApiKeyUI();
  apiKeySection.style.display = 'none';
  imgSearchInput.focus();
}

function closeImageSearch() {
  imgSearchOverlay.style.display = 'none';
}

// ========== 模式一：Unsplash API 搜索（需 Key） ==========
async function searchImagesViaAPI(query, apiKey, page = 1) {
  // 使用 Authorization Header 传递 Client-ID，Key 不会暴露在 URL 中
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15&page=${page}`;
  const resp = await fetch(url, {
    headers: {
      'Authorization': 'Client-ID ' + apiKey
    }
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`API error ${resp.status}: ${errText}`);
  }
  const data = await resp.json();

  if (!data.results || data.results.length === 0) return false;

  data.results.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'img-result-card';
    card.title = `📷 ${photo.user.name} — 点击插入`;
    card.innerHTML = `
      <img src="${photo.urls.small}" alt="${photo.alt_description || query}" loading="lazy">
      <span class="img-author">📷 ${photo.user.name}</span>
    `;
    card.addEventListener('click', () => {
      slideImage.value = photo.urls.regular;
      slides[currentIndex].image = photo.urls.regular;
      updatePreview();
      closeImageSearch();
      toast('✅ 图片已插入！');
    });
    imgSearchResults.appendChild(card);
  });
  return true;
}

// ========== 模式二：Picsum Photos 备用方案（无需 Key，稳定可用） ==========
// 使用 picsum.photos 提供的随机高质量图片，种子基于查询关键词哈希
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function searchImagesViaSource(query, offset = 0) {
  const base = hashStr(query + Date.now() + offset);
  // 生成 15 张基于不同种子的随机图片
  for (let n = 0; n < 15; n++) {
    const seed = (base + n * 137) % 1000;
    const thumbUrl = `https://picsum.photos/seed/${seed}/300/225`;
    const fullUrl  = `https://picsum.photos/seed/${seed}/1280/720`;

    const card = document.createElement('div');
    card.className = 'img-result-card';
    card.title = '点击插入此图片';
    card.innerHTML = `
      <img src="${thumbUrl}" alt="${query}" loading="lazy" onerror="this.parentElement.style.display='none'">
      <span class="img-author">🖼️ Picsum Photos（随机精选）</span>
    `;
    card.addEventListener('click', () => {
      slideImage.value = fullUrl;
      slides[currentIndex].image = fullUrl;
      updatePreview();
      closeImageSearch();
      toast('✅ 图片已插入！');
    });
    imgSearchResults.appendChild(card);
  }
  // 提示用户备用模式的特性
  const hint = document.createElement('p');
  hint.style.cssText = 'grid-column:1/-1;font-size:11px;color:#bbb;text-align:center;padding:8px 0 0';
  hint.textContent = '💡 当前为随机模式，配置 Unsplash API Key 可按关键词精确搜图';
  imgSearchResults.appendChild(hint);
}

// ========== 统一搜索入口 ==========
async function searchImages(query, page = 1) {
  currentSearchQuery = query;
  currentSearchPage = page;
  imgSearchResults.innerHTML = '';
  imgSearchLoading.style.display = '';
  const apiKey = getApiKey();

  try {
    if (apiKey) {
      // 优先使用 API 模式
      const success = await searchImagesViaAPI(query, apiKey, page);
      imgSearchLoading.style.display = 'none';
      if (success === false) {
        imgSearchResults.innerHTML = '<p class="img-search-empty">😕 没有找到相关图片，换个关键词试试</p>';
      }
    } else {
      // 无 Key，使用 Source 模式
      imgSearchLoading.style.display = 'none';
      searchImagesViaSource(query, page);
    }
  } catch (err) {
    console.error('API 搜索失败，降级到 Source 模式:', err);
    imgSearchLoading.style.display = 'none';
    imgSearchResults.innerHTML = '';
    searchImagesViaSource(query, page);
    // 如果之前有 Key 但失效了，提示用户
    if (apiKey) {
      setTimeout(() => toast('⚠️ API Key 无效，已自动切换到备用搜索'), 500);
    }
  }
}

// 触发搜索
function triggerImageSearch() {
  const q = imgSearchInput.value.trim();
  if (q) searchImages(q, 1);
}

// 换一批
function refreshImageSearch() {
  if (!currentSearchQuery) {
    const q = imgSearchInput.value.trim();
    if (q) {
      searchImages(q, 1);
    } else {
      toast('请先输入关键词搜索');
    }
    return;
  }
  currentSearchPage++;
  searchImages(currentSearchQuery, currentSearchPage);
}

// ========== AI 生成 PPT ==========
const aiTopicInput    = $('aiTopicInput');
const aiSlideCount    = $('aiSlideCount');
const aiGenerateBtn   = $('aiGenerateBtn');
const aiProgress      = $('aiProgress');
const aiStatusDot     = $('aiBackendStatus');

// 兼容性超时 fetch（兼容旧浏览器，替代 AbortSignal.timeout）
async function timeoutFetch(url, init, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 检测后端是否在线
async function checkBackendHealth() {
  if (!API_BASE) {
    aiStatusDot.innerHTML = '● 未配置后端';
    aiStatusDot.className = 'ai-status-dot offline';
    aiStatusDot.title = '请在下方配置后端地址，或访问 localhost:3001 使用本地后端';
    aiGenerateBtn.disabled = true;
    console.log('ℹ️ GitHub Pages 无内置后端，请在控制台执行 localStorage.setItem("ai_backend_url", "https://你的-vercel-域名.vercel.app") 后刷新');
    return false;
  }
  console.log('🔍 检测后端:', `${API_BASE}/api/health`);
  try {
    const resp = await timeoutFetch(`${API_BASE}/api/health`, {}, 8000);
    const data = await resp.json();
    if (data.status === 'ok') {
      aiStatusDot.innerHTML = '● 后端在线';
      aiStatusDot.className = 'ai-status-dot online';
      aiGenerateBtn.disabled = false;
      console.log('✅ AI 后端连接正常:', API_BASE, '| 模型:', data.model, '| Key:', data.hasApiKey ? '已配置' : '未配置');
      return true;
    }
  } catch (e) {
    console.warn('⚠️ AI 后端未连接:', e.message);
  }
  aiStatusDot.innerHTML = '● 后端离线';
  aiStatusDot.className = 'ai-status-dot offline';
  aiGenerateBtn.disabled = true;
  return false;
}

// AI 生成按钮点击
async function handleAIGenerate() {
  const topic = aiTopicInput.value.trim();
  const slideCount = parseInt(aiSlideCount.value) || 6;

  if (!topic) {
    toast('请先输入 PPT 主题');
    aiTopicInput.focus();
    return;
  }

  // 先检查后端
  const healthy = await checkBackendHealth();
  if (!healthy) {
    toast('⚠️ AI 后端未启动，请在项目目录运行 node server.js');
    return;
  }

  // 确认覆盖
  if (slides.length > 0 && slides[0].title !== '新幻灯片') {
    if (!confirm('当前幻灯片内容将被 AI 生成的内容替换，确定继续？')) return;
  }

  // ===== 阶段一：AI 构思内容 =====
  aiGenerateBtn.disabled = true;
  aiProgress.style.display = '';
  aiProgress.innerHTML = '<span class="spinner"></span> ✨ AI正在润色主题、构思大纲和内容...（预计 10-30 秒）';
  aiGenerateBtn.textContent = '⏳ 构思中';

  let data;
  try {
    const resp = await fetch(`${API_BASE}/api/generate-ppt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, slideCount }),
      signal: (() => {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 90000);
        return ctrl.signal;
      })(),
    });

    data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || '请求失败');
    }

    console.log('📥 AI 返回数据:', data);
    console.log(`  标题: "${data.title}" | 页数: ${data.slides.length}`);
  } catch (err) {
    console.error('❌ AI 生成失败:', err);
    toast('❌ 生成失败: ' + err.message);
    aiGenerateBtn.disabled = false;
    aiProgress.style.display = 'none';
    aiGenerateBtn.textContent = '✨ 生成';
    return;
  }

  // ===== 阶段二：自动配色 & 渲染骨架 =====
  aiProgress.innerHTML = '<span class="spinner"></span> 🎨 AI正在应用配色方案、渲染幻灯片...';
  renderAISlides(data);

  // ===== 阶段三：自动配图 =====
  const slidesWithKeywords = data.slides
    .map((s, i) => ({ ...s, index: i }))
    .filter(s => s.imageKeyword && s.imageKeyword.trim());

  if (slidesWithKeywords.length > 0) {
    aiProgress.innerHTML = `<span class="spinner"></span> 🖼️ AI正在自动搜索配图...（${slidesWithKeywords.length} 页需要配图）`;

    let done = 0;
    const imagePromises = slidesWithKeywords.map(async (s) => {
      const imgUrl = await fetchBestImage(s.imageKeyword.trim());
      if (imgUrl) {
        slides[s.index].image = imgUrl;
        // 同步 DOM 输入框
        if (s.index === currentIndex) {
          slideImage.value = imgUrl;
        }
        done++;
        aiProgress.innerHTML = `<span class="spinner"></span> 🖼️ 配图进度：${done}/${slidesWithKeywords.length} — 刚完成「${s.title}」`;
      }
    });

    await Promise.allSettled(imagePromises);
    // 刷新当前选中页的预览
    updatePreview();
    // 同步列表显示
    renderSlideList();
    toast(`✅ 生成完成！${slides.length} 页幻灯片，${done} 页已自动配图`);
  } else {
    toast(`✅ 已生成 ${slides.length} 页幻灯片！`);
  }

  // 恢复 UI
  aiGenerateBtn.disabled = false;
  aiProgress.style.display = 'none';
  aiGenerateBtn.textContent = '✨ 生成';
}

// 快速搜图：根据关键词返回最佳图片 URL（用于 AI 自动配图）
async function fetchBestImage(keyword) {
  // 优先尝试 API 搜索
  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&client_id=${apiKey}`;
      const resp = await fetch(url, { signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 8000); return c.signal; })() });
      if (resp.ok) {
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
          return data.results[0].urls.regular;
        }
      }
    } catch (_) { /* 降级到 source 模式 */ }
  }
  // 降级：source.unsplash.com 兜底
  return `https://source.unsplash.com/1200x900/?${encodeURIComponent(keyword)}`;
}

// 将 AI 返回的 JSON 渲染为幻灯片（含自动配色）
function renderAISlides(data) {
  saveCurrent();

  slides = data.slides.map((s, i) => {
    // 智能标题位置：标题页居中，内容页顶部
    const isTitlePage = s.layout === 'title';
    // 标题页把 content 作为 subtitle
    const subtitle = isTitlePage ? (s.content || s.subtitle || '') : (s.subtitle || '');
    const content = isTitlePage ? '' : (s.content || '');

    return {
      title: s.title || `第 ${i + 1} 页`,
      subtitle: subtitle,
      content: content,
      content2: s.content2 || '',
      image: s.image || '',
      note: s.note || '',
      layout: ['title', 'content', 'two-column', 'image-text', 'image-only'].includes(s.layout)
        ? s.layout : 'content',
      fontSize: s.fontSize || 'normal',
      textAlign: s.textAlign || 'left',
      titlePos: s.titlePos || (isTitlePage ? 'middle' : 'top'),
      bgColor: s.bgColor || '',
      imageKeyword: s.imageKeyword || '',
    };
  });

  currentIndex = 0;
  renderSlideList();
  selectSlide(0);
  pushHistory();

  console.log(`✅ 已渲染 ${slides.length} 页幻灯片（含自动配色）:`);
  slides.forEach((s, i) => {
    console.log(`  #${i + 1} [${s.layout}] ${s.title} | bg:${s.bgColor || '默认'} | img:${s.imageKeyword || '无'}`);
  });
}

// 回车触发生成
aiTopicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAIGenerate();
});
aiGenerateBtn.addEventListener('click', handleAIGenerate);

// ========== 事件监听（图片搜索） ==========
openImgSearchBtn.addEventListener('click', openImageSearch);
closeImgSearchBtn.addEventListener('click', closeImageSearch);
imgSearchOverlay.addEventListener('click', (e) => {
  if (e.target === imgSearchOverlay) closeImageSearch();
});
imgSearchBtn.addEventListener('click', triggerImageSearch);
imgRefreshBtn.addEventListener('click', refreshImageSearch);
imgSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') triggerImageSearch();
});

// 快捷分类点击
$('imgSearchCats').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (btn) {
    const kw = btn.dataset.kw;
    imgSearchInput.value = kw;
    searchImages(kw);
  }
});

// ESC 关闭弹窗（合并到主快捷键监听）
// 注意: 已通过全局 keydown 处理 (见下方)

// ========== 事件监听 ==========
addSlideBtn.addEventListener('click', addSlide);
deleteSlideBtn.addEventListener('click', deleteSlide);
moveUpBtn.addEventListener('click', () => moveSlide(true));
moveDownBtn.addEventListener('click', () => moveSlide(false));
dupSlideBtn.addEventListener('click', duplicateSlide);
exportBtn.addEventListener('click', exportPPTX);

// 撤销/重做
$('undoBtn').addEventListener('click', undoAction);
$('redoBtn').addEventListener('click', redoAction);

// 草稿操作
$('saveDraftBtn').addEventListener('click', saveDraft);
$('loadDraftBtn').addEventListener('click', loadDraft);
$('exportJsonBtn').addEventListener('click', exportJson);
$('importJsonInput').addEventListener('change', (e) => {
  importJson(e.target.files[0]);
  e.target.value = '';
});

// 带防抖的历史推送
let _historyDebounceTimer = null;
function pushHistoryDebounced() {
  clearTimeout(_historyDebounceTimer);
  _historyDebounceTimer = setTimeout(pushHistory, 800);
}

slideTitle.addEventListener('input', () => { slides[currentIndex].title = slideTitle.value; updatePreview(); renderSlideList(); pushHistoryDebounced(); });
slideSubtitle.addEventListener('input', () => { slides[currentIndex].subtitle = slideSubtitle.value; updatePreview(); pushHistoryDebounced(); });
slideContent.addEventListener('input', () => { slides[currentIndex].content = slideContent.value; updatePreview(); pushHistoryDebounced(); });
slideContent2.addEventListener('input', () => { slides[currentIndex].content2 = slideContent2.value; updatePreview(); pushHistoryDebounced(); });
slideImage.addEventListener('input', () => { slides[currentIndex].image = slideImage.value; updatePreview(); });
slideNote.addEventListener('input', () => { slides[currentIndex].note = slideNote.value; });

fontSizeSel.addEventListener('change', () => { slides[currentIndex].fontSize = fontSizeSel.value; updatePreview(); pushHistory(); });
textAlignSel.addEventListener('change', () => { slides[currentIndex].textAlign = textAlignSel.value; updatePreview(); pushHistory(); });
titlePosSel.addEventListener('change', () => { slides[currentIndex].titlePos = titlePosSel.value; updatePreview(); pushHistory(); });

$('layoutPicker').addEventListener('click', (e) => {
  const btn = e.target.closest('.layout-btn');
  if (btn) setLayout(btn.dataset.layout);
});

// 主题切换：单击=当前页（立即），双击=全部幻灯片
let themeClickTimer = null;
let themeLastClicked = null;
$('themePicker').addEventListener('click', (e) => {
  const dot = e.target.closest('.theme-dot');
  if (!dot) return;
  const themeName = dot.dataset.theme;

  // 立即应用到当前页
  setTheme(themeName, false);

  // 检测双击：同一颜色短时间内连点两次 → 应用到全部
  if (themeClickTimer && themeLastClicked === themeName) {
    clearTimeout(themeClickTimer);
    themeClickTimer = null;
    themeLastClicked = null;
    setTheme(themeName, true);
    return;
  }
  themeLastClicked = themeName;
  themeClickTimer = setTimeout(() => {
    themeClickTimer = null;
    themeLastClicked = null;
  }, 400);
});

// ========== 快捷键 ==========
document.addEventListener('keydown', (e) => {
  // 图片搜索弹窗快捷键
  if (e.key === 'Escape' && imgSearchOverlay.style.display !== 'none') {
    closeImageSearch();
    return;
  }
  // 键盘翻页：← → 切换幻灯片（不在输入框中时生效）
  if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) { return; }
    e.preventDefault();
    if (currentIndex > 0) { saveCurrent(); selectSlide(currentIndex - 1); }
    return;
  }
  if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) { return; }
    e.preventDefault();
    if (currentIndex < slides.length - 1) { saveCurrent(); selectSlide(currentIndex + 1); }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoAction(); }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redoAction(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); exportPPTX(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); addSlide(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSlide(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') { e.preventDefault(); moveSlide(true); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') { e.preventDefault(); moveSlide(false); }
});

// ========== 初始化 ==========
renderSlideList();
selectSlide(0);
setTheme('purple');
pushHistory();        // 记录初始状态
updateUndoRedoBtns();

// 检测 AI 后端
checkBackendHealth();

// 草稿恢复提示
setTimeout(checkAutoRestoreDraft, 1000);

console.log('📊 PPT Maker Pro 已就绪');
console.log('   AI 后端:', API_BASE);
console.log('   快捷键: ←→ 翻页 | Ctrl+Z 撤销 | Ctrl+Y 重做 | Ctrl+S 导出 | Ctrl+N 新建 | Ctrl+D 复制 | Ctrl+↑↓ 排序');
console.log('   翻页动画: 前进=滑入 | 后退=淡入 | 内容=逐条弹入');
console.log('   图片搜索: 点击「🔍 搜图」搜索高质量免费图片');
console.log('   AI 生成: 输入主题 → 点击 ✨生成 → 自动填充幻灯片');
