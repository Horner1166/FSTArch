// Модуль UI-компонентов (кнопки, поля, карточки, хедер)
// Здесь храним переиспользуемые элементы интерфейса

import { State } from "./state.js";
import { Router } from "./router.js";

// Вспомогательный универсальный конструктор DOM-элементов
function el(tag, options, children) {
  const opts = options || {};
  const element = document.createElement(tag);

  if (opts.className) {
    element.className = opts.className;
  }

  if (opts.attrs) {
    Object.keys(opts.attrs).forEach(function (key) {
      element.setAttribute(key, opts.attrs[key]);
    });
  }

  if (opts.onClick) {
    element.addEventListener("click", opts.onClick);
  }

  let content = children;
  if (content !== undefined && content !== null) {
    if (!Array.isArray(content)) {
      content = [content];
    }
    content.forEach(function (child) {
      if (child === null || child === undefined) return;
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }

  return element;
}

// Универсальная кнопка
function button(config) {
  const cfg = config || {};
  const buttonEl = el(
    "button",
    {
      className:
        "btn btn-" + (cfg.variant || "primary") + " btn-" + (cfg.size || "md"),
      attrs: { type: cfg.type || "button" },
      onClick: cfg.onClick
    },
    cfg.label || ""
  );
  return buttonEl;
}

// Поле ввода (input/textarea) с лейблом
function inputField(options) {
  const opts = options || {};
  const id =
    "fld-" +
    (opts.name || "field") +
    "-" +
    Math.random().toString(36).slice(2, 7);

  const wrapper = el("div", { className: "form-field" });
  const label = el("label", { attrs: { for: id } }, opts.label || "");

  let control;
  if (opts.multiline) {
    control = el("textarea", {
      className: "input",
      attrs: {
        id: id,
        name: opts.name || "",
        placeholder: opts.placeholder || ""
      }
    });
  } else {
    control = el("input", {
      className: "input",
      attrs: {
        id: id,
        name: opts.name || "",
        type: opts.type || "text",
        placeholder: opts.placeholder || "",
        value: opts.value || ""
      }
    });
  }

  wrapper.appendChild(label);
  wrapper.appendChild(control);

  return {
    wrapper,
    control
  };
}

// Хедер (логотип, навигация, кнопки входа/выхода)
function header() {
  const user = State.getUser();

  const headerEl = el("header", { className: "app-header" });

  const logo = el("div", { className: "logo" }, [
    el("span", { className: "logo-mark" }, "DG"),
    el("span", { className: "logo-text" }, "DrugNet")
  ]);
  logo.addEventListener("click", function () {
    Router.navigate("/");
  });

  const nav = el("nav", { className: "nav" });
  const navItems = [
    { path: "/", label: "Объявления" },
    { path: "/contacts", label: "Контакты" }
  ];
  navItems.forEach(function (item) {
    const link = el(
      "button",
      {
        className: "nav-link",
        onClick: function () {
          Router.navigate(item.path);
        }
      },
      item.label
    );
    nav.appendChild(link);
  });

  const right = el("div", { className: "header-right" });

  if (State.isAuthenticated()) {
    const userLabel = el("div", { className: "user-pill" }, [
      el(
        "span",
        { className: "user-name" },
        user.username || user.email || "Студент"
      )
    ]);

    const dashboardBtn = button({
      label: "Личный кабинет",
      variant: "ghost",
      size: "sm",
      onClick: function () {
        Router.navigate("/dashboard");
      }
    });

    const logoutBtn = button({
      label: "Выйти",
      variant: "secondary",
      size: "sm",
      onClick: function () {
        State.clearAuth();
        Router.navigate("/");
      }
    });

    right.appendChild(dashboardBtn);
    right.appendChild(userLabel);
    right.appendChild(logoutBtn);
  } else {
    const loginBtn = button({
      label: "Войти",
      variant: "secondary",
      size: "sm",
      onClick: function () {
        Router.navigate("/login");
      }
    });
    right.appendChild(loginBtn);
  }

  headerEl.appendChild(logo);
  headerEl.appendChild(nav);
  headerEl.appendChild(right);

  return headerEl;
}

// Карточка объявления
function postCard(post, options) {
  const opts = options || {};
  const isMine = !!opts.isMine;

  const root = el("article", { className: "post-card" });

  const title = el("h3", { className: "post-title" }, post.title || "");

  const text =
    (post.content || "").length > 180
      ? (post.content || "").slice(0, 177) + "..."
      : post.content || "";

  const content = el("p", { className: "post-content" }, text);

  const metaLeft = el("div", { className: "post-meta-left" }, [
    el("span", { className: "badge" }, isMine ? "Моё объявление" : "Студент"),
    el(
      "span",
      { className: "post-email" },
      post.user_email || "unknown@example.com"
    )
  ]);

  const createdAt = new Date(post.created_at);
  const metaRight = el("div", { className: "post-meta-right" }, [
    el(
      "span",
      { className: "post-date" },
      createdAt.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    )
  ]);

  const meta = el("div", { className: "post-meta" }, [metaLeft, metaRight]);

  const actions = el("div", { className: "post-actions" });

  const openBtn = button({
    label: "Открыть",
    variant: "ghost",
    size: "sm",
    onClick: function () {
      if (opts.onOpen) opts.onOpen(post);
    }
  });
  actions.appendChild(openBtn);

  if (isMine) {
    const editBtn = button({
      label: "Редактировать",
      variant: "secondary",
      size: "sm",
      onClick: function () {
        if (opts.onEdit) opts.onEdit(post);
      }
    });

    const delBtn = button({
      label: "Удалить",
      variant: "danger",
      size: "sm",
      onClick: function () {
        if (opts.onDelete) opts.onDelete(post);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
  }

  root.appendChild(title);
  root.appendChild(content);
  root.appendChild(meta);
  root.appendChild(actions);

  return root;
}

export const Components = {
  el,
  button,
  inputField,
  header,
  postCard
};


