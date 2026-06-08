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

// ========== 数据模型 ==========
let slides = [
  { title: '欢迎使用 PPT 制作工具', subtitle: '', content: '点击左侧「+ 添加」创建新幻灯片\n选择版面布局和配色模板\n编辑完成后一键导出 PPTX 文件', content2: '', image: '', note: '', layout: 'content', fontSize: 'normal', textAlign: 'left', titlePos: 'top' },
  { title: '五大版面布局', subtitle: '', content: '内容页：标题 + 要点列表，适合正文', content2: '标题页：居中大标题，适合封面/章节页\n图文混排：图片与文字并排展示\n双栏：左右对比内容\n图片页：全屏图片展示', image: '', note: '', layout: 'two-column', fontSize: 'normal', textAlign: 'left', titlePos: 'top' },
  { title: '开始制作', subtitle: '祝你创作愉快 🎉', content: '', content2: '', image: '', note: '', layout: 'title', fontSize: 'large', textAlign: 'center', titlePos: 'middle' },
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
function selectSlide(index) {
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
  updatePreview();
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
}

// ========== 更新预览 ==========
function updatePreview() {
  const s = slides[currentIndex];
  const theme = THEMES[currentTheme];
  const fs = FONT_SIZES[s.fontSize] || FONT_SIZES.normal;

  // 重置样式类
  previewSlide.className = 'preview-slide';
  previewTitle.style.textAlign = '';
  previewBody.style.textAlign = '';

  // 背景
  previewSlide.style.background = theme.bg;
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
  lines.forEach(line => {
    const p = document.createElement('p');
    p.className = 'preview-text';
    p.textContent = '• ' + line;
    p.style.fontSize = fontSize + 'px';
    p.style.color = color;
    p.style.opacity = '0.85';
    container.appendChild(p);
  });
}

function renderPreviewImage() {
  previewImage.style.display = '';
  previewImage.src = slideImage.value;
  previewImage.onerror = () => { previewImage.style.display = 'none'; };
}

// ========== 设置主题 ==========
function setTheme(name) {
  currentTheme = name;
  document.querySelectorAll('.theme-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.theme === name);
  });
  updatePreview();
}

// ========== 幻灯片操作 ==========
function addSlide() {
  saveCurrent();
  const newSlide = {
    title: '新幻灯片', subtitle: '', content: '点击此处编辑内容', content2: '',
    image: '', note: '', layout: 'content', fontSize: 'normal', textAlign: 'left', titlePos: 'top',
  };
  slides.push(newSlide);
  selectSlide(slides.length - 1);
}

function deleteSlide() {
  if (slides.length <= 1) { toast('至少保留一张幻灯片'); return; }
  if (!confirm(`确定删除「${slides[currentIndex].title || '无标题'}」？`)) return;
  slides.splice(currentIndex, 1);
  if (currentIndex >= slides.length) currentIndex = slides.length - 1;
  selectSlide(currentIndex);
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
  toast(up ? '已上移' : '已下移');
}

function duplicateSlide() {
  saveCurrent();
  const clone = JSON.parse(JSON.stringify(slides[currentIndex]));
  clone.title = (clone.title || '复制') + ' (副本)';
  slides.splice(currentIndex + 1, 0, clone);
  selectSlide(currentIndex + 1);
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
    s.background = { color: theme.bg };

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

// ========== 事件监听 ==========
addSlideBtn.addEventListener('click', addSlide);
deleteSlideBtn.addEventListener('click', deleteSlide);
moveUpBtn.addEventListener('click', () => moveSlide(true));
moveDownBtn.addEventListener('click', () => moveSlide(false));
dupSlideBtn.addEventListener('click', duplicateSlide);
exportBtn.addEventListener('click', exportPPTX);

slideTitle.addEventListener('input', () => { slides[currentIndex].title = slideTitle.value; updatePreview(); renderSlideList(); });
slideSubtitle.addEventListener('input', () => { slides[currentIndex].subtitle = slideSubtitle.value; updatePreview(); });
slideContent.addEventListener('input', () => { slides[currentIndex].content = slideContent.value; updatePreview(); });
slideContent2.addEventListener('input', () => { slides[currentIndex].content2 = slideContent2.value; updatePreview(); });
slideImage.addEventListener('input', () => { slides[currentIndex].image = slideImage.value; updatePreview(); });
slideNote.addEventListener('input', () => { slides[currentIndex].note = slideNote.value; });

fontSizeSel.addEventListener('change', () => { slides[currentIndex].fontSize = fontSizeSel.value; updatePreview(); });
textAlignSel.addEventListener('change', () => { slides[currentIndex].textAlign = textAlignSel.value; updatePreview(); });
titlePosSel.addEventListener('change', () => { slides[currentIndex].titlePos = titlePosSel.value; updatePreview(); });

$('layoutPicker').addEventListener('click', (e) => {
  const btn = e.target.closest('.layout-btn');
  if (btn) setLayout(btn.dataset.layout);
});

$('themePicker').addEventListener('click', (e) => {
  const dot = e.target.closest('.theme-dot');
  if (dot) setTheme(dot.dataset.theme);
});

// ========== 快捷键 ==========
document.addEventListener('keydown', (e) => {
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

console.log('📊 PPT Maker Pro 已就绪');
console.log('   快捷键: Ctrl+S 导出 | Ctrl+N 新建 | Ctrl+D 复制 | Ctrl+↑↓ 排序');
