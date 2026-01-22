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
    const attrs = {
      id: id,
      name: opts.name || "",
      placeholder: opts.placeholder || ""
    };
    if (opts.maxlength) {
      attrs.maxlength = opts.maxlength;
    }
    control = el("textarea", {
      className: "input",
      attrs: attrs
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
  
  // Добавляем пункт модерации для модератора или админа
  if (State.isAdmin() || State.isModerator()) {
    navItems.push({ path: "/moderator", label: "Объявления на модерацию", isModeration: true });
    navItems.push({ path: "/users", label: "Пользователи" });
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

  // Обновляем счетчик объявлений на модерации (для админа или модератора)
  if (State.isAdmin() || State.isModerator()) {
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
        if (!State.isAdmin() && !State.isModerator()) return;
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
    // Nickname is now clickable and links to the dashboard/profile
    const userLabelContent = el("span", { className: "nav-link-content" }, [
      el(
        "span",
        { className: "user-name" },
        user.username || user.email || "Пользователь"
      ),
      el(
        "span",
        { className: "nav-badge", attrs: { "data-dashboard-badge": "1" } },
        ""
      )
    ]);

    const userLabel = el(
      "button",
      {
        className: "user-pill user-pill-clickable",
        onClick: function () {
          Router.navigate("/dashboard");
        }
      },
      [userLabelContent]
    );

    const dashBadge = userLabel.querySelector('[data-dashboard-badge="1"]');
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

  // Add photo display section
  let imagesSection = null;
  if (post.images && Array.isArray(post.images) && post.images.length > 0) {
    imagesSection = el("div", { className: "post-images" });
    
    post.images.slice(0, 3).forEach(function(imageItem) {
      // Извлекаем URL из объекта или используем строку напрямую
      const imageUrl = typeof imageItem === 'string' ? imageItem : (imageItem.image_url || imageItem.url || '');
      if (!imageUrl) return;
      
      const img = el("img", {
        className: "post-image",
        attrs: {
          src: imageUrl,
          alt: "Фото объявления"
        }
      });
      // Добавляем функцию просмотра в увеличенном размере при клике
      img.style.cursor = "pointer";
      img.addEventListener("click", function(e) {
        e.stopPropagation(); // Предотвращаем открытие модального окна объявления
        openImageModal(post.images, imageUrl);
      });
      imagesSection.appendChild(img);
    });
    
    if (post.images.length > 3) {
      const moreText = el("span", { className: "post-images-more" }, "+" + (post.images.length - 3) + " фото");
      imagesSection.appendChild(moreText);
    }
  }

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
  if (imagesSection) {
    root.appendChild(imagesSection);
  }
  root.appendChild(content);
  root.appendChild(contact);
  root.appendChild(meta);
  root.appendChild(actions);

  return root;
}

// Функция просмотра изображения в увеличенном размере (как в Авито)
function openImageModal(allImages, currentImageUrl) {
  const allImageUrls = allImages.map(function(imageItem) {
    return typeof imageItem === 'string' ? imageItem : (imageItem.image_url || imageItem.url || '');
  }).filter(Boolean);
  
  let currentIndex = allImageUrls.indexOf(currentImageUrl);
  if (currentIndex === -1) currentIndex = 0;
  
  const overlay = el("div", { className: "image-viewer-overlay" });
  const viewer = el("div", { className: "image-viewer" });
  const img = el("img", {
    className: "image-viewer-img",
    attrs: {
      src: allImageUrls[currentIndex],
      alt: "Просмотр фото"
    }
  });
  
  const closeBtn = el("button", {
    className: "image-viewer-close",
    onClick: function() {
      overlay.remove();
    }
  }, "✕");
  
  const prevBtn = el("button", {
    className: "image-viewer-nav image-viewer-prev",
    onClick: function() {
      if (currentIndex > 0) {
        currentIndex--;
        img.src = allImageUrls[currentIndex];
      }
    }
  }, "‹");
  
  const nextBtn = el("button", {
    className: "image-viewer-nav image-viewer-next",
    onClick: function() {
      if (currentIndex < allImageUrls.length - 1) {
        currentIndex++;
        img.src = allImageUrls[currentIndex];
      }
    }
  }, "›");
  
  const counter = el("div", { className: "image-viewer-counter" }, 
    (currentIndex + 1) + " / " + allImageUrls.length
  );
  
  // Обновление счётчика при переключении
  function updateCounter() {
    counter.textContent = (currentIndex + 1) + " / " + allImageUrls.length;
    prevBtn.style.opacity = currentIndex > 0 ? "1" : "0.3";
    nextBtn.style.opacity = currentIndex < allImageUrls.length - 1 ? "1" : "0.3";
  }
  
  prevBtn.addEventListener("click", updateCounter);
  nextBtn.addEventListener("click", updateCounter);
  
  // Закрытие по клику на overlay
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Закрытие по Escape
  const handleEscape = function(e) {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);
  
  // Стрелки влево/вправо для навигации
  const handleArrowKeys = function(e) {
    if (e.key === "ArrowLeft" && currentIndex > 0) {
      currentIndex--;
      img.src = allImageUrls[currentIndex];
      updateCounter();
    } else if (e.key === "ArrowRight" && currentIndex < allImageUrls.length - 1) {
      currentIndex++;
      img.src = allImageUrls[currentIndex];
      updateCounter();
    }
  };
  document.addEventListener("keydown", handleArrowKeys);
  
  overlay.addEventListener("click", function() {
    document.removeEventListener("keydown", handleArrowKeys);
  });
  
  viewer.appendChild(closeBtn);
  viewer.appendChild(prevBtn);
  viewer.appendChild(nextBtn);
  viewer.appendChild(img);
  viewer.appendChild(counter);
  overlay.appendChild(viewer);
  document.body.appendChild(overlay);
  
  updateCounter();
}

// Кастомное модальное окно подтверждения
function confirmModal(options) {
  const opts = options || {};
  const title = opts.title || "Подтверждение";
  const message = opts.message || "Вы уверены?";
  const confirmText = opts.confirmText || "Да";
  const cancelText = opts.cancelText || "Отмена";
  const confirmVariant = opts.confirmVariant || "primary";

  return new Promise(function(resolve) {
    const overlay = el("div", { className: "modal-overlay confirm-modal-overlay" });
    const modal = el("div", { className: "modal confirm-modal" });

    const titleEl = el("h2", { className: "modal-title" }, title);
    const messageEl = el("p", { className: "confirm-modal-message" }, message);

    const actions = el("div", { className: "confirm-modal-actions" });

    const cancelBtn = button({
      label: cancelText,
      variant: "secondary",
      size: "md",
      onClick: function() {
        overlay.remove();
        resolve(false);
      }
    });

    const confirmBtn = button({
      label: confirmText,
      variant: confirmVariant,
      size: "md",
      onClick: function() {
        overlay.remove();
        resolve(true);
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    modal.appendChild(titleEl);
    modal.appendChild(messageEl);
    modal.appendChild(actions);
    overlay.appendChild(modal);

    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });

    document.body.appendChild(overlay);
  });
}

// Кастомное модальное окно с полем ввода (замена prompt)
function promptModal(options) {
  const opts = options || {};
  const title = opts.title || "Введите значение";
  const message = opts.message || "";
  const placeholder = opts.placeholder || "";
  const confirmText = opts.confirmText || "Подтвердить";
  const cancelText = opts.cancelText || "Отмена";
  const confirmVariant = opts.confirmVariant || "primary";
  const multiline = opts.multiline || false;

  return new Promise(function(resolve) {
    const overlay = el("div", { className: "modal-overlay confirm-modal-overlay" });
    const modal = el("div", { className: "modal confirm-modal prompt-modal" });

    const titleEl = el("h2", { className: "modal-title" }, title);
    
    let messageEl = null;
    if (message) {
      messageEl = el("p", { className: "confirm-modal-message" }, message);
    }

    const field = inputField({
      label: "",
      name: "prompt-input",
      placeholder: placeholder,
      multiline: multiline
    });
    field.wrapper.style.marginBottom = "20px";

    const actions = el("div", { className: "confirm-modal-actions" });

    const cancelBtn = button({
      label: cancelText,
      variant: "secondary",
      size: "md",
      onClick: function() {
        overlay.remove();
        resolve(null);
      }
    });

    const confirmBtn = button({
      label: confirmText,
      variant: confirmVariant,
      size: "md",
      onClick: function() {
        const value = (field.control.value || "").trim();
        overlay.remove();
        resolve(value || null);
      }
    });

    // Подтверждение по Enter (только для однострочного поля)
    if (!multiline) {
      field.control.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          const value = (field.control.value || "").trim();
          overlay.remove();
          resolve(value || null);
        }
      });
    }

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    modal.appendChild(titleEl);
    if (messageEl) {
      modal.appendChild(messageEl);
    }
    modal.appendChild(field.wrapper);
    modal.appendChild(actions);
    overlay.appendChild(modal);

    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) {
        overlay.remove();
        resolve(null);
      }
    });

    document.body.appendChild(overlay);
    
    // Фокус на поле ввода
    setTimeout(function() {
      field.control.focus();
    }, 100);
  });
}

export const Components = {
  el,
  button,
  inputField,
  header,
  postCard,
  confirmModal,
  promptModal,
  openImageModal
};


