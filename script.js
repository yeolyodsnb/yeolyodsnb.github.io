// 导航栏滚动时变半透明
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.style.background = 'rgba(255, 255, 255, 0.85)';
  } else {
    nav.style.background = 'rgba(255, 255, 255, 0.95)';
  }
});

// 卡片入场动画
const cards = document.querySelectorAll('.project-card');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.2 });

cards.forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'opacity 0.6s, transform 0.6s';
  observer.observe(card);
});

// 点击导航链接后平滑滚动（已在 CSS 用 scroll-behavior 处理）
// 输出欢迎信息
console.log('🌟 欢迎来到 yeol 的个人主页！');
console.log('🚀 https://yeolyodsnb.github.io');
