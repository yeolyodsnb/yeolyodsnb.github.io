// 导航栏滚动时变半透明
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.style.background = 'rgba(255, 255, 255, 0.85)';
  } else {
    nav.style.background = 'rgba(255, 255, 255, 0.95)';
  }
});

// 汉堡菜单
const hamburger = document.getElementById('navHamburger');
const navLinks  = document.getElementById('navLinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // 点击导航链接后自动收起菜单
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });

  // 点击页面其他区域收起菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('nav')) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
    }
  });
}

// 卡片入场动画
const cards = document.querySelectorAll('.project-card');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.15 });

cards.forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'opacity 0.6s, transform 0.6s';
  observer.observe(card);
});

// 技能标签悬停彩色效果
const skillColors = ['#6c5ce7','#0984e3','#00b894','#e17055','#e84393','#fdcb6e','#00a8a8','#d63031'];
document.querySelectorAll('.skill-tag').forEach((tag, i) => {
  const c = skillColors[i % skillColors.length];
  tag.addEventListener('mouseenter', () => {
    tag.style.background = c;
    tag.style.transform = 'scale(1.08)';
  });
  tag.addEventListener('mouseleave', () => {
    tag.style.background = '#6c5ce7';
    tag.style.transform = '';
  });
});

// 输出欢迎信息
console.log('🌟 欢迎来到 yeol 的个人主页！');
console.log('🚀 https://yeolyodsnb.github.io');
