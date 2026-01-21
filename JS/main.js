// Точка входа во фронтенд-приложение
// Подключает модули состояния, UI, роутера и представлений, задаёт таблицу маршрутов

import { State } from "./state.js";
import { UI } from "./ui.js";
import { Router } from "./router.js";
import { Views } from "./views.js";

function initApp() {
  try {
    // Инициализация состояния и базовой оболочки
    State.init();
    UI.initLayout();

    // Таблица маршрутов SPA
    const routes = {
      "/": Views.homeView,
      "/home": Views.homeView,
      // loginView возвращает функцию-обработчик
      "/login": Views.loginView(),
      "/register": Views.loginView(),
      "/dashboard": Views.dashboardView,
      "/add": function () {
        Views.postFormView({ mode: "create" });
      },
      "/edit/:id": function (params) {
        Views.postFormView({ mode: "edit", id: params.id });
      },
      "/contacts": Views.contactsView,
      "/moderator": Views.moderatorView,
      "/users": Views.usersManagementView
    };

    Router.init(routes);
  } catch (error) {
    // Если что-то упало до рендера — покажем ошибку пользователю
    console.error("Failed to init app", error);
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444; max-width: 720px; margin: 0 auto;">
          <h1 style="margin-bottom: 16px;">Ошибка запуска интерфейса</h1>
          <div style="opacity: 0.9; margin-bottom: 14px;">${error && error.message ? error.message : "Неизвестная ошибка"}</div>
          <div style="opacity: 0.7; font-size: 13px;">Откройте консоль (F12) для деталей.</div>
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initApp);


