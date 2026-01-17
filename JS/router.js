// Модуль роутинга (SPA на hash-роутинге)
// Управляет разбором hash и вызовом соответствующих обработчиков страниц

let routes = {};
let history = ["/"];
let currentIndex = 0;

// Инициализация таблицы маршрутов
function init(routesMap) {
  routes = routesMap || {};
  window.addEventListener("hashchange", handleRouteChange);
  handleRouteChange();
}

// Программная навигация
function navigate(path, addToHistory = true) {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  
  if (addToHistory && currentIndex >= 0) {
    const currentPath = parseHash();
    if (currentPath !== path) {
      history = history.slice(0, currentIndex + 1);
      history.push(currentPath);
      currentIndex = history.length - 1;
    }
  }
  
  window.location.hash = "#" + path;
}

// Функция для возврата назад
function goBack() {
  if (currentIndex > 0) {
    currentIndex--;
    const targetPath = history[currentIndex];
    window.location.hash = "#" + targetPath;
  }
}

// Проверка возможности вернуться назад
function canGoBack() {
  return currentIndex > 0;
}

// Разбор текущего hash
function parseHash() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  return raw.startsWith("/") ? raw : "/" + raw;
}

// Подбор маршрута по шаблону (поддержка :param)
function matchRoute(path) {
  const pathSegments = path.split("/").filter(Boolean);

  let best = { view: null, params: {} };

  Object.keys(routes).forEach(function (pattern) {
    const patternSegments = pattern.split("/").filter(Boolean);
    if (patternSegments.length !== pathSegments.length) {
      return;
    }

    const params = {};
    let matched = true;

    for (let i = 0; i < patternSegments.length; i++) {
      const seg = patternSegments[i];
      const val = pathSegments[i];

      if (seg.charAt(0) === ":") {
        params[seg.slice(1)] = val;
      } else if (seg !== val) {
        matched = false;
        break;
      }
    }

    if (matched) {
      best = { view: routes[pattern], params: params };
    }
  });

  if (!best.view) {
    best.view = routes["/"]; // fallback на главную
  }

  return best;
}

// Обработчик смены маршрута
function handleRouteChange() {
  const path = parseHash();
  const match = matchRoute(path);
  if (typeof match.view === "function") {
    // передаём вьюшке распарсенные параметры
    match.view(match.params || {});
  }
}

export const Router = {
  init,
  navigate,
  goBack,
  canGoBack
};


