// Модуль UI-оболочки (Shell, layout)
// Отвечает за базовую разметку, контейнеры и системные тосты

const root = document.getElementById("app");
let mainContainer = null;
let headerContainer = null;
let toastContainer = null;

// Инициализация базовой разметки (без оболочки)
function initLayout() {
  if (!root) {
    console.error("Не найден элемент #app");
    return;
  }

  root.innerHTML = "";

  toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";

  headerContainer = document.createElement("div");
  headerContainer.className = "shell-header";

  mainContainer = document.createElement("main");
  mainContainer.className = "shell-main";

  root.appendChild(toastContainer);
  root.appendChild(headerContainer);
  root.appendChild(mainContainer);
}

// Вернуть контейнер для основного контента
function getMainContainer() {
  return mainContainer;
}

// Вернуть контейнер для хедера
function getHeaderContainer() {
  return headerContainer;
}

// Очистить основной контент
function clearMain() {
  if (mainContainer) {
    mainContainer.innerHTML = "";
  }
}

// Плавное появление контента страницы
function animatePageIn() {
  if (!mainContainer) return;
  mainContainer.classList.remove("page-enter");
  mainContainer.classList.remove("page-enter-active");

  // Форсируем reflow, чтобы анимация запускалась при каждом переходе
  // eslint-disable-next-line no-unused-expressions
  mainContainer.offsetHeight;

  mainContainer.classList.add("page-enter");

  requestAnimationFrame(function () {
    if (!mainContainer) return;
    mainContainer.classList.add("page-enter-active");
  });
}

// Показать toast-уведомление
function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Автоматическое скрытие через 3 секунды
  setTimeout(function () {
    if (toast && toast.parentNode) {
      toast.classList.add("toast-hide");
      
      // Удаляем элемент после завершения анимации скрытия
      const removeToast = function() {
        if (toast && toast.parentNode) {
          toast.remove();
        }
      };
      
      toast.addEventListener("transitionend", removeToast, { once: true });
      
      // Fallback: удаляем элемент через 500мс, если transitionend не сработал
      setTimeout(function() {
        if (toast && toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }
  }, 2000);
}

// Установить заголовок вкладки
function setPageTitle(title) {
  if (!title) {
    document.title = "LightNet — сервис объявлений";
  } else {
    document.title = title + " — LightNet";
  }
}

export const UI = {
  initLayout,
  getMainContainer,
  getHeaderContainer,
  clearMain,
  animatePageIn,
  showToast,
  setPageTitle
};


