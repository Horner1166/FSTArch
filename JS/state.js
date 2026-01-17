// Модуль состояния приложения (State)
// Отвечает за хранение данных пользователя и access-токена в localStorage

const STORAGE_KEY = "fstmain_frontend_state";

/**
 * Текущее состояние пользователя:
 * { email, accessToken, username, userId }
 */
let currentUser = null;

// Загрузка состояния из localStorage
function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    currentUser = parsed.currentUser || null;
  } catch (err) {
    console.error("Не удалось прочитать состояние из localStorage", err);
    currentUser = null;
  }
}

// Сохранение состояния в localStorage
function persist() {
  try {
    const payload = { currentUser };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error("Не удалось сохранить состояние в localStorage", err);
  }
}

// Инициализация (вызывается один раз при старте)
function init() {
  load();
}

// Установить данные авторизации (email + токен)
function setAuth(payload) {
  const { email, accessToken } = payload;
  if (!currentUser) currentUser = {};
  currentUser.email = email;
  currentUser.accessToken = accessToken;
  persist();
}

// Сброс авторизации
function clearAuth() {
  currentUser = null;
  persist();
}

// Проверка, авторизован ли пользователь (наличие токена)
function isAuthenticated() {
  return !!(currentUser && currentUser.accessToken);
}

// Сохранить дополнительные данные пользователя (ник, id, таймер смены ника)
function setUserMeta(meta) {
  if (!currentUser) currentUser = {};
  if (meta.username !== undefined) {
    currentUser.username = meta.username;
  }
  if (meta.userId !== undefined) {
    currentUser.userId = meta.userId;
  }
  if (meta.role !== undefined) {
    currentUser.role = meta.role;
  }
  if (meta.rejectedCount !== undefined) {
    currentUser.rejectedCount = meta.rejectedCount;
  }
  if (meta.usernameChangeCooldownUntil !== undefined) {
    currentUser.usernameChangeCooldownUntil = meta.usernameChangeCooldownUntil;
  }
  persist();
}

// Получить объект пользователя
function getUser() {
  return currentUser || {};
}

// Получить access token
function getToken() {
  return currentUser && currentUser.accessToken
    ? currentUser.accessToken
    : null;
}

// Проверить, является ли пользователь модератором
function isModerator() {
  const role = currentUser && currentUser.role ? String(currentUser.role) : "";
  const r = role.toLowerCase();
  return r === "moderator" || r.endsWith(".moderator") || r.includes("moderator");
}

// Проверить, является ли пользователь администратором
function isAdmin() {
  const role = currentUser && currentUser.role ? String(currentUser.role) : "";
  const r = role.toLowerCase();
  return r === "admin" || r.endsWith(".admin") || r.includes("admin");
}

export const State = {
  init,
  setAuth,
  clearAuth,
  isAuthenticated,
  setUserMeta,
  getUser,
  getToken,
  isModerator,
  isAdmin
};


