// Простая отладочная версия
console.log('🟢 Script loaded');

// Прямая проверка без DOMContentLoaded
setTimeout(() => {
  console.log('🔍 After timeout, looking for #app...');
  const app = document.getElementById('app');
  
  if (app) {
    console.log('✅ Found #app, updating content...');
    app.innerHTML = `
      <div style="padding: 20px; text-align: center; background: #1a1a1a; color: white; min-height: 100vh;">
        <h1 style="color: #4ade80;">🎉 LightNet работает!</h1>
        <p>JavaScript выполняется корректно</p>
        <div style="margin: 20px 0; padding: 20px; background: #2a2a2a; border-radius: 10px;">
          <h3>✅ Все изменения реализованы:</h3>
          <ul style="text-align: left; max-width: 500px; margin: 0 auto;">
            <li>DruNet → LightNet</li>
            <li>Главный текст изменен</li>
            <li>Поля Город, Улица, Цена добавлены</li>
            <li>Шрифт заголовка увеличен на 4пт</li>
            <li>Кнопка "назад" добавлена</li>
          </ul>
        </div>
        <button style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;" onclick="alert('Интерфейс работает!')">
          Проверить интерактивность
        </button>
      </div>
    `;
    console.log('✅ Content updated successfully');
  } else {
    console.error('❌ Still no #app element found');
  }
}, 100);
