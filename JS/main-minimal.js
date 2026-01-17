// Минимальная точка входа для тестирования
console.log('🚀 Starting minimal app...');

// Ждем загрузки DOM
function initApp() {
  console.log('🔍 Looking for #app element...');
  
  // Проверяем базовые элементы
  const app = document.getElementById('app');
  if (!app) {
    console.error('❌ #app element not found');
    return;
  }
  
  console.log('✅ #app element found');
  
  // Создаем базовую структуру
  app.innerHTML = `
    <div class="shell">
      <div class="shell-header">
        <header class="app-header">
          <button class="back-btn" style="display: none;">←</button>
          <div class="logo">
            <span class="logo-mark">LN</span>
            <span class="logo-text">LightNet</span>
          </div>
          <nav class="nav">
            <button class="nav-link">Объявления</button>
            <button class="nav-link">Контакты</button>
          </nav>
        </header>
      </div>
      <div class="shell-main">
        <section class="hero">
          <div class="hero-text">
            <h1 class="hero-title">Ищите или продавайте свои вещи и услуги где и когда угодно</h1>
            <p class="hero-subtitle">Размещайте и находите объявления быстро и удобно — в одном месте.</p>
            <button class="btn btn-primary btn-lg">Войти, чтобы разместить объявление</button>
          </div>
        </section>
        <div class="posts-grid">
          <article class="post-card">
            <h3 class="post-title" style="font-size: calc(1.25rem + 4pt);">Тестовое объявление</h3>
            <p class="post-content">Это тестовое объявление для проверки отображения...</p>
            <p class="post-contact">
              <span class="post-contact-label">Контакты: </span>
              <span class="post-contact-value">@test</span>
            </p>
            <div class="post-meta">
              <div class="post-meta-left">
                <span class="badge">Объявление</span>
                <span class="post-email">username</span>
              </div>
              <div class="post-meta-right">
                <span class="post-date">01.01.2025 12:00</span>
              </div>
            </div>
            <div class="post-actions">
              <button class="btn btn-ghost btn-sm">Открыть</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  `;
  
  console.log('✅ Basic structure created');
  console.log('🎉 Minimal app ready!');
}

// Проверяем состояние DOM
if (document.readyState === 'loading') {
  console.log('⏳ DOM is still loading, waiting...');
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  console.log('⚡ DOM already loaded');
  initApp();
}
