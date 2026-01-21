// Модуль работы с API (fetch + FastAPI)
// Содержит универсальный helper для HTTP-запросов и набор функций для конкретных эндпоинтов

import { Config } from "./config.js";
import { State } from "./state.js";
import { UI } from "./ui.js";

// Все конечные точки API собраны в одном месте,
// чтобы их было проще править при смене бекенд-роутов.
const ENDPOINTS = {
  requestCode: "/auth/[.post]",
  authorize: "/auth/login/[.post]",
  updateUsername: "/user/[.put]",
  getMe: "/user/[.get]",
  createPost: "/posts/[.post]",
  getAllPosts: "/posts/[.get]",
  getPost: "/posts/:id/[.get]",
  updatePost: "/posts/:id/[.put]",
  deletePost: "/posts/:id/[.delete]",
  getUserPosts: "/posts/:user_id/[.get]",
  // Admin moderation endpoints (served under /moderator on backend)
  getPendingPosts: "/moderator/posts/[.get]",
  approvePost: "/moderator/posts/approve/:id/[.post]",
  rejectPost: "/moderator/posts/reject/:id/[.post]",
  // User management endpoints
  listUsers: "/moderator/users/[.get]",
  toggleBanUser: "/moderator/users/:id/[.post]",
  toggleModeratorRole: "/admin/users/:id/[.post]",
  // Image upload endpoint
  uploadImage: "/upload/image/[.post]"
};

// Универсальный helper для HTTP-запросов
async function request(path, options) {
  const opts = options || {};
  const method = opts.method || "GET";
  const body = opts.body || null;
  const auth = opts.auth || false;

  const headers = {
    "Content-Type": "application/json"
  };

  if (auth) {
    const token = State.getToken();
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
  }

  const requestBody = body
    ? typeof body === "string"
      ? body
      : JSON.stringify(body)
    : null;

  const response = await fetch(Config.apiBaseUrl + path, {
    method: method,
    headers: headers,
    body: requestBody
  });

  // Обработка 204 (нет контента)
  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_err) {
    data = null;
  }

  if (!response.ok) {
    const message =
      data && data.detail
        ? data.detail
        : "Ошибка при выполнении запроса";
    UI.showToast(message, "error");
    throw new Error(message);
  }

  return data;
}

// ---------- Методы авторизации ----------

// Запросить одноразовый код по email
function requestCode(email) {
  return request(ENDPOINTS.requestCode, {
    method: "POST",
    body: { email: email }
  });
}

// Подтвердить код и получить access_token
function authorize(email, code) {
  return request(ENDPOINTS.authorize, {
    method: "POST",
    body: { email: email, code: code }
  });
}

// Обновить никнейм пользователя
function updateUsername(username) {
  return request(ENDPOINTS.updateUsername, {
    method: "PUT",
    body: { username: username },
    auth: true
  });
}

// Получить данные текущего пользователя (id, email, username, role, is_banned)
function getMe() {
  return request(ENDPOINTS.getMe, {
    method: "GET",
    auth: true
  });
}

// ---------- Методы работы с объявлениями ----------

// Получить все одобренные посты
function getAllPosts() {
  return request(ENDPOINTS.getAllPosts, { method: "GET" });
}

// Получить пост по id (для редактирования/просмотра)
function getPost(id) {
  // Бекенд ожидает post_id в query-параметрах
  const path = `${ENDPOINTS.getPost}?post_id=${encodeURIComponent(id)}`;
  return request(path, {
    method: "GET",
    // токен прикладываем, чтобы владелец видел и неободренные посты
    auth: true
  });
}

// Создать новое объявление
function createPost(payload) {
  return request(ENDPOINTS.createPost, {
    method: "POST",
    body: payload,
    auth: true
  });
}

// Обновить объявление
function updatePost(id, payload) {
  const path = `${ENDPOINTS.updatePost}?post_id=${encodeURIComponent(id)}`;
  return request(path, {
    method: "PUT",
    body: payload,
    auth: true
  });
}

// Удалить объявление
function deletePost(id) {
  const path = `${ENDPOINTS.deletePost}?post_id=${encodeURIComponent(id)}`;
  return request(path, {
    method: "DELETE",
    auth: true
  });
}

// Получить посты конкретного пользователя (если известен userId)
function getUserPosts(userId) {
  // Бекенд ждёт user_id в query-параметрах
  const path = `${ENDPOINTS.getUserPosts}?user_id=${encodeURIComponent(userId)}`;
  return request(path, {
    method: "GET",
    auth: true
  });
}

// Moderator functions
async function getPendingPosts() {
  const path = ENDPOINTS.getPendingPosts;
  return request(path, {
    method: "GET",
    auth: true
  });
}

async function approvePost(id) {
  const path = `${ENDPOINTS.approvePost}?post_id=${encodeURIComponent(id)}`;
  return request(path, {
    method: "POST",
    auth: true
  });
}

async function rejectPost(id, reason) {
  const path = `${ENDPOINTS.rejectPost}?post_id=${encodeURIComponent(id)}`;
  return request(path, {
    method: "POST",
    body: { reason },
    auth: true
  });
}

// Image upload function
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  return fetch(Config.apiBaseUrl + ENDPOINTS.uploadImage, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + State.getToken()
    },
    body: formData
  }).then(async response => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.detail || "Error uploading image";
      UI.showToast(message, "error");
      throw new Error(message);
    }
    return response.json();
  });
}

// User management functions
async function listUsers() {
  const path = ENDPOINTS.listUsers;
  return request(path, {
    method: "GET",
    auth: true
  });
}

async function toggleBanUser(userId) {
  const path = `${ENDPOINTS.toggleBanUser}?user_id=${encodeURIComponent(userId)}`;
  return request(path, {
    method: "POST",
    auth: true
  });
}

async function toggleModeratorRole(userId) {
  const path = `${ENDPOINTS.toggleModeratorRole}?user_id=${encodeURIComponent(userId)}`;
  return request(path, {
    method: "POST",
    auth: true
  });
}

export const Api = {
  requestCode,
  authorize,
  updateUsername,
  getMe,
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getUserPosts,
  // Moderator functions
  getPendingPosts,
  approvePost,
  rejectPost,
  // User management functions
  listUsers,
  toggleBanUser,
  toggleModeratorRole,
  // Image upload function
  uploadImage
};


