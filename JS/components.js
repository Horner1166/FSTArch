// Модуль UI-компонентов (кнопки, поля, карточки, хедер)
// Здесь храним переиспользуемые элементы интерфейса

import { State } from "./state.js";
import { Router } from "./router.js";
import { Api } from "./api.js";

let moderationBadgeTimer = null;

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

  if (moderationBadgeTimer) {
    clearInterval(moderationBadgeTimer);
    moderationBadgeTimer = null;
  }

  const headerEl = el("header", { className: "app-header" });

  // Кнопка "назад"
  const backBtn = el("button", {
    className: "back-btn",
    onClick: function() {
      Router.goBack();
    }
  }, "←");
  
  // Показываем кнопку только если есть история
  if (!Router.canGoBack()) {
    backBtn.style.display = "none";
  }

  const logo = el("div", { className: "logo" }, [
    el("span", { className: "logo-mark" }, "LN"),
    el("span", { className: "logo-text" }, "LightNet")
  ]);
  logo.addEventListener("click", function () {
    Router.navigate("/");
  });

  const nav = el("nav", { className: "nav" });
  const navItems = [
    { path: "/", label: "Объявления" },
    { path: "/contacts", label: "Контакты" }
  ];
  
  // Добавляем пункт админа, если пользователь администратор
  if (State.isAdmin()) {
    navItems.push({ path: "/moderator", label: "Объявления на модерацию", isModeration: true });
  }
  
  navItems.forEach(function (item) {
    const content = item.isModeration
      ? el("span", { className: "nav-link-content" }, [
          el("span", { className: "nav-link-text" }, item.label),
          el("span", { className: "nav-badge", attrs: { "data-moderation-badge": "1" } }, "")
        ])
      : item.label;

    const link = el(
      "button",
      {
        className: "nav-link",
        onClick: function () {
          Router.navigate(item.path);
        }
      },
      content
    );
    nav.appendChild(link);
  });

  // Обновляем счетчик объявлений на модерации (только для админа)
  if (State.isAdmin()) {
    (async function () {
      try {
        const badge = headerEl.querySelector('[data-moderation-badge="1"]');
        if (!badge) return;
        const posts = await Api.getPendingPosts();
        const count = Array.isArray(posts) ? posts.length : 0;
        if (count > 0) {
          badge.textContent = String(count);
          badge.style.display = "inline-flex";
        } else {
          badge.textContent = "";
          badge.style.display = "none";
        }
      } catch (e) {
        // без тостов, чтобы не раздражать пользователя
        const badge = headerEl.querySelector('[data-moderation-badge="1"]');
        if (badge) {
          badge.textContent = "";
          badge.style.display = "none";
        }
      }
    })();

    // Периодическое обновление, чтобы бейдж появлялся без перезагрузки/перехода
    moderationBadgeTimer = setInterval(async function () {
      try {
        if (!State.isAdmin()) return;
        const badge = headerEl.querySelector('[data-moderation-badge="1"]');
        if (!badge) return;
        const posts = await Api.getPendingPosts();
        const count = Array.isArray(posts) ? posts.length : 0;
        if (count > 0) {
          badge.textContent = String(count);
          badge.style.display = "inline-flex";
        } else {
          badge.textContent = "";
          badge.style.display = "none";
        }
      } catch (_e) {
        // ignore
      }
    }, 15000);
  }

  const right = el("div", { className: "header-right" });

  if (State.isAuthenticated()) {
    const userLabel = el("div", { className: "user-pill" }, [
      el(
        "span",
        { className: "user-name" },
        user.username || user.email || "Пользователь"
      )
    ]);

    const dashboardContent = el("span", { className: "nav-link-content" }, [
      el("span", { className: "nav-link-icon" }, "👤"),
      el(
        "span",
        { className: "nav-badge", attrs: { "data-dashboard-badge": "1" } },
        ""
      )
    ]);

    const dashboardBtn = el(
      "button",
      {
        className: "btn btn-ghost btn-sm",
        onClick: function () {
          Router.navigate("/dashboard");
        }
      },
      dashboardContent
    );

    const dashBadge = dashboardBtn.querySelector('[data-dashboard-badge="1"]');
    const rejectedCount = user && typeof user.rejectedCount === "number" ? user.rejectedCount : 0;
    if (dashBadge) {
      if (rejectedCount > 0) {
        dashBadge.textContent = String(rejectedCount);
        dashBadge.style.display = "inline-flex";
      } else {
        dashBadge.textContent = "";
        dashBadge.style.display = "none";
      }
    }

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

  headerEl.appendChild(backBtn);
  headerEl.appendChild(logo);
  headerEl.appendChild(nav);
  headerEl.appendChild(right);

  return headerEl;
}

// Карточка объявления
function postCard(post, options) {
  const opts = options || {};
  const isMine = !!opts.isMine;
  const canSeeModerationStatus = isMine || State.isAdmin();

  const rawStatus = post && post.moderation_status ? String(post.moderation_status) : "";
  const normalizedStatus = rawStatus.toLowerCase().includes("approved")
    ? "approved"
    : rawStatus.toLowerCase().includes("rejected")
      ? "rejected"
      : rawStatus.toLowerCase().includes("pending")
        ? "pending"
        : "";

  const root = el("article", { className: "post-card" });
  
  // Делаем всю карточку кликабельной для открытия
  root.style.cursor = "pointer";
  root.addEventListener("click", function(e) {
    // Не срабатываем на кнопках действий
    if (e.target.closest(".post-actions")) return;
    if (opts.onOpen) opts.onOpen(post);
  });

  const title = el("h3", { className: "post-title" }, post.title || "");
  title.style.fontSize = "calc(1.25rem + 4pt)"; // Увеличиваем шрифт на 4пт

  const text =
    (post.content || "").length > 180
      ? (post.content || "").slice(0, 177) + "..."
      : post.content || "";

  const content = el("p", { className: "post-content" }, text);

  const contact = el("p", { className: "post-contact" }, [
    el("span", { className: "post-contact-label" }, "Контакты: "),
    el("span", { className: "post-contact-value" }, post.contact || "не указаны")
  ]);

  const metaLeft = el("div", { className: "post-meta-left" }, [
    el("span", { className: "badge" }, isMine ? "Моё объявление" : "Объявление"),
    el(
      "span",
      { className: "post-email" },
      post.username || "username"
    ),
    // Добавляем статус объявления
    canSeeModerationStatus && normalizedStatus && el(
      "span",
      { className: "post-status badge badge-" + (normalizedStatus === "approved" ? "success" : normalizedStatus === "rejected" ? "danger" : "warning") },
      normalizedStatus === "approved" ? "Одобрено" : 
      normalizedStatus === "rejected" ? "Отклонено" : 
      "На модерации"
    )
  ].filter(Boolean));

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

  // Убираем кнопку "Открыть" - теперь вся карточка кликабельна
  // const openBtn = button({
  //   label: "Открыть",
  //   variant: "ghost",
  //   size: "sm",
  //   onClick: function () {
  //     if (opts.onOpen) opts.onOpen(post);
  //   }
  // });
  // actions.appendChild(openBtn);

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
  root.appendChild(contact);
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


