// Точка входа во фронтенд-приложение
// Подключает модули состояния, UI, роутера и представлений, задаёт таблицу маршрутов

import { State } from "./state.js";
import { UI } from "./ui.js";
import { Router } from "./router.js";
import { Views } from "./views.js";

function initApp() {
  // Инициализация состояния и базовой оболочки
  State.init();
  UI.initLayout();

  // Таблица маршрутов SPA
  const routes = {
    "/": Views.homeView,
    "/home": Views.homeView,
    "/login": Views.loginView({ mode: "login" }),
    "/register": Views.loginView({ mode: "register" }),
    "/dashboard": Views.dashboardView,
    "/add": function () {
      Views.postFormView({ mode: "create" });
    },
    "/edit/:id": function (params) {
      Views.postFormView({ mode: "edit", id: params.id });
    },
    "/contacts": Views.contactsView
  };

  Router.init(routes);
}

document.addEventListener("DOMContentLoaded", initApp);


