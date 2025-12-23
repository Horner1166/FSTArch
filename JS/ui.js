// Модуль UI-оболочки (Shell, layout)
// Отвечает за базовую разметку, контейнеры и системные тосты

const root = document.getElementById("app");
let mainContainer = null;
let headerContainer = null;
let toastContainer = null;

// Инициализация базовой разметки (оболочка приложения)
function initLayout() {
  if (!root) {
    console.error("Не найден элемент #app");
    return;
  }

  root.innerHTML = "";

  toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";

  const shell = document.createElement("div");
  shell.className = "shell";

  headerContainer = document.createElement("div");
  headerContainer.className = "shell-header";

  mainContainer = document.createElement("main");
  mainContainer.className = "shell-main";

  shell.appendChild(headerContainer);
  shell.appendChild(mainContainer);

  root.appendChild(toastContainer);
  root.appendChild(shell);
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

// Показать toast-уведомление
function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Автоматическое скрытие
  setTimeout(function () {
    toast.classList.add("toast-hide");
    toast.addEventListener("transitionend", function () {
      toast.remove();
    });
  }, 3000);
}

// Установить заголовок вкладки
function setPageTitle(title) {
  if (!title) {
    document.title = "DrugNet — объявления для студентов";
  } else {
    document.title = title + " — CampusBoard";
  }
}

export const UI = {
  initLayout,
  getMainContainer,
  getHeaderContainer,
  clearMain,
  showToast,
  setPageTitle
};


