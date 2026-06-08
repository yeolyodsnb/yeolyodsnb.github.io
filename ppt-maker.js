// ========== PPT Maker - 幻灯片数据管理 ==========

// 主题配色定义
const THEMES = {
  purple: { bg: '#6c5ce7', text: '#ffffff', accent: '#a29bfe', name: '紫色' },
  blue:   { bg: '#0984e3', text: '#ffffff', accent: '#74b9ff', name: '蓝色' },
  green:  { bg: '#00b894', text: '#ffffff', accent: '#55efc4', name: '绿色' },
  orange: { bg: '#e17055', text: '#ffffff', accent: '#fab1a0', name: '橙色' },
  dark:   { bg: '#2d3436', text: '#ffffff', accent: '#636e72', name: '深色' },
  red:    { bg: '#d63031', text: '#ffffff', accent: '#ff7675', name: '红色' },
};

// 全局状态
let slides = [
  { title: '欢迎', content: '感谢使用 PPT 制作工具\n点击左侧 + 添加新幻灯片', image: '' },
  { title: '关于', content: '编辑内容，选择模板\n一键导出 PPTX 文件', image: '' },
];
let currentSlideIndex = 0;
let currentTheme = 'purple';

// ========== DOM 元素 ==========
const slideListEl     = document.getElementById('slideList');
const addSlideBtn     = document.getElementById('addSlideBtn');
const deleteSlideBtn  = document.getElementById('deleteSlideBtn');
const exportBtn       = document.getElementById('exportBtn');
const slideTitleInput = document.getElementById('slideTitle');
const slideContentInput = document.getElementById('slideContent');
const slideImageInput = document.getElementById('slideImage');
const previewTitle    = document.getElementById('previewTitle');
const previewBody     = document.getElementById('previewBody');
const previewSlide    = document.getElementById('previewContent');
const themePicker     = document.getElementById('themePicker');

// ========== 渲染幻灯片列表 ==========
function renderSlideList() {
  slideListEl.innerHTML = '';
  slides.forEach((slide, i) => {
    const li = document.createElement('li');
    li.className = i === currentSlideIndex ? 'active' : '';
    li.innerHTML = `
      <span class="slide-num">#${i + 1}</span>
      <span class="slide-label">${slide.title || '无标题'}</span>
    `;
    li.addEventListener('click', () => selectSlide(i));
    slideListEl.appendChild(li);
  });
}

// ========== 选择幻灯片 ==========
function selectSlide(index) {
  currentSlideIndex = index;
  const slide = slides[index];
  slideTitleInput.value = slide.title;
  slideContentInput.value = slide.content;
  slideImageInput.value = slide.image || '';
  updatePreview();
  renderSlideList();
}

// ========== 添加幻灯片 ==========
function addSlide() {
  slides.push({ title: '新幻灯片', content: '双击此处编辑内容', image: '' });
  currentSlideIndex = slides.length - 1;
  renderSlideList();
  selectSlide(currentSlideIndex);
}

// ========== 删除幻灯片 ==========
function deleteSlide() {
  if (slides.length <= 1) {
    alert('至少保留一张幻灯片！');
    return;
  }
  if (!confirm(`确定要删除"${slides[currentSlideIndex].title || '无标题'}"吗？`)) return;
  slides.splice(currentSlideIndex, 1);
  if (currentSlideIndex >= slides.length) {
    currentSlideIndex = slides.length - 1;
  }
  renderSlideList();
  selectSlide(currentSlideIndex);
}

// ========== 更新预览 ==========
function updatePreview() {
  const slide = slides[currentSlideIndex];
  const theme = THEMES[currentTheme];

  previewTitle.textContent = slide.title || '标题预览';
  previewBody.innerHTML = '';

  if (slide.content) {
    const lines = slide.content.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const p = document.createElement('p');
      p.className = 'preview-text';
      p.textContent = '• ' + line;
      previewBody.appendChild(p);
    });
  }

  if (slide.image) {
    const img = document.createElement('img');
    img.src = slide.image;
    img.onerror = () => { img.style.display = 'none'; };
    previewBody.appendChild(img);
  }

  // 应用主题
  previewSlide.style.background = theme.bg;
  previewTitle.style.color = theme.text;
  previewBody.querySelectorAll('.preview-text').forEach(el => {
    el.style.color = theme.text;
    el.style.opacity = '0.85';
  });
}

// ========== 切换主题 ==========
function setTheme(themeName) {
  currentTheme = themeName;
  document.querySelectorAll('.theme-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.theme === themeName);
  });
  updatePreview();
}

// ========== 导出 PPTX ==========
function exportPPTX() {
  if (typeof PptxGenJS === 'undefined') {
    alert('PPT 库正在加载中，请稍后再试...');
    return;
  }

  const pptx = new PptxGenJS();
  const theme = THEMES[currentTheme];

  pptx.defineLayout({ name: 'CUSTOM', width: '13.333', height: '7.5' });
  pptx.layout = 'CUSTOM';

  slides.forEach(slide => {
    const s = pptx.addSlide();

    // 背景
    s.background = { color: theme.bg };

    // 装饰条
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.12,
      fill: { color: theme.accent },
    });

    // 标题
    if (slide.title) {
      s.addText(slide.title, {
        x: 1, y: 1.2, w: '11.333', h: 1,
        fontSize: 36, bold: true, color: theme.text,
        fontFace: 'Microsoft YaHei',
        align: 'left',
      });
    }

    // 内容
    if (slide.content) {
      const lines = slide.content.split('\n').filter(l => l.trim());
      const bullets = lines.map(line => ({
        text: line,
        options: {
          fontSize: 18, color: theme.text, fontFace: 'Microsoft YaHei',
          bullet: { type: 'number' },
          paraSpaceAfter: 8,
        },
      }));

      s.addText(bullets, {
        x: 1.2, y: 2.6, w: '10.933', h: 3.5,
        valign: 'top',
      });
    }

    // 图片
    if (slide.image) {
      s.addImage({
        path: slide.image,
        x: 8, y: 1.5, w: 4.5, h: 4.5,
        sizing: { type: 'contain', w: 4.5, h: 4.5 },
      }).catch(() => {
        // 图片加载失败，静默跳过
      });
    }

    // 页脚装饰
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.38, w: '100%', h: 0.12,
      fill: { color: theme.accent },
    });
  });

  // 保存下载
  pptx.writeFile({ fileName: 'yeol-演示文稿.pptx' })
    .then(() => {
      console.log('✅ PPTX 导出成功！');
    })
    .catch(err => {
      console.error('导出失败:', err);
      alert('导出失败，请重试。');
    });
}

// ========== 事件监听 ==========
addSlideBtn.addEventListener('click', addSlide);
deleteSlideBtn.addEventListener('click', deleteSlide);
exportBtn.addEventListener('click', exportPPTX);

slideTitleInput.addEventListener('input', () => {
  slides[currentSlideIndex].title = slideTitleInput.value;
  updatePreview();
  renderSlideList();
});

slideContentInput.addEventListener('input', () => {
  slides[currentSlideIndex].content = slideContentInput.value;
  updatePreview();
});

slideImageInput.addEventListener('input', () => {
  slides[currentSlideIndex].image = slideImageInput.value;
  updatePreview();
});

themePicker.addEventListener('click', (e) => {
  const dot = e.target.closest('.theme-dot');
  if (dot) setTheme(dot.dataset.theme);
});

// ========== 键盘快捷键 ==========
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    exportPPTX();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    addSlide();
  }
});

// ========== 初始化 ==========
renderSlideList();
selectSlide(0);
setTheme('purple');

console.log('📊 PPT Maker 已就绪');
console.log('   快捷键: Ctrl+S 导出 | Ctrl+N 新建幻灯片');
