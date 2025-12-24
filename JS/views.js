// Модуль представлений (страницы)
// Содержит логику рендера отдельных экранов: главная, логин, кабинет, формы объявлений, контакты

import { Api } from "./api.js";
import { State } from "./state.js";
import { UI } from "./ui.js";
import { Components } from "./components.js";
import { Router } from "./router.js";

// Рендер оболочки (хедер) для каждой страницы
function renderShell() {
  const headerContainer = UI.getHeaderContainer();
  if (!headerContainer) return;
  headerContainer.innerHTML = "";
  const header = Components.header();
  headerContainer.appendChild(header);
}

// Проверка авторизации для защищённых страниц
function ensureAuth() {
  if (!State.isAuthenticated()) {
    UI.showToast("Сначала войдите в аккаунт", "error");
    Router.navigate("/login");
    return false;
  }
  return true;
}

// ---------- Главная: список объявлений ----------
async function homeView() {
  renderShell();
  const main = UI.getMainContainer();
  UI.clearMain();
  UI.setPageTitle("Объявления");

  if (!main) return;

  const hero = Components.el("section", { className: "hero" }, [
    Components.el("div", { className: "hero-text" }, [
      Components.el(
        "h1",
        { className: "hero-title" },
        "Объявления института"
      ),
      Components.el(
        "p",
        { className: "hero-subtitle" },
        "Находите жильё, подработку, учёбу и новые знакомства внутри студенческого комьюнити."
      )
    ]),
    State.isAuthenticated()
      ? Components.button({
          label: "Добавить объявление",
          variant: "primary",
          size: "lg",
          onClick: function () {
            Router.navigate("/add");
          }
        })
      : Components.button({
          label: "Войти, чтобы разместить объявление",
          variant: "primary",
          size: "lg",
          onClick: function () {
            Router.navigate("/login");
          }
        })
  ]);

  const searchRow = Components.el("div", { className: "search-row" });

  const searchField = Components.inputField({
    label: "Поиск по заголовку и описанию",
    name: "search",
    placeholder: "Например: «сниму комнату», «репетитор по математике»"
  });

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "toggle";

  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.className = "toggle-input";

  const toggleIndicator = document.createElement("span");
  toggleIndicator.className = "toggle-indicator";

  const toggleText = document.createElement("span");
  toggleText.className = "toggle-label";
  toggleText.textContent = "Показывать только мои";

  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(toggleIndicator);
  toggleLabel.appendChild(toggleText);

  searchRow.appendChild(searchField.wrapper);
  searchRow.appendChild(toggleLabel);

  const listContainer = Components.el("div", { className: "posts-grid" });

  main.appendChild(hero);
  main.appendChild(searchRow);
  main.appendChild(listContainer);

  let allPosts = [];
  try {
    allPosts = await Api.getAllPosts();
  } catch (err) {
    console.error(err);
  }

  const currentUser = State.getUser();

  function renderList() {
    listContainer.innerHTML = "";
    const query = (searchField.control.value || "")
      .toString()
      .trim()
      .toLowerCase();
    const onlyMine = toggleInput.checked;

    const filtered = allPosts.filter(function (post) {
      if (onlyMine) {
        if (!currentUser || !currentUser.email) return false;
        if (post.user_email !== currentUser.email) return false;
      }
      if (!query) return true;
      const combined =
        ((post.title || "") + " " + (post.content || "")).toLowerCase();
      return combined.indexOf(query) !== -1;
    });

    if (filtered.length === 0) {
      listContainer.appendChild(
        Components.el(
          "p",
          { className: "empty-state" },
          "Пока нет объявлений по заданным условиям."
        )
      );
      return;
    }

    filtered.forEach(function (post) {
      const isMine =
        currentUser && currentUser.email === post.user_email;
      const card = Components.postCard(post, {
        isMine: isMine,
        onOpen: function (p) {
          openPostModal(p);
        },
        onEdit: function (p) {
          Router.navigate("/edit/" + p.id);
        },
        onDelete: async function (p) {
          if (!ensureAuth()) return;
          if (
            !window.confirm(
              "Удалить это объявление без возможности восстановления?"
            )
          ) {
            return;
          }
          try {
            await Api.deletePost(p.id);
            UI.showToast("Объявление удалено", "success");
            allPosts = allPosts.filter(function (x) {
              return x.id !== p.id;
            });
            renderList();
          } catch (err) {
            console.error(err);
          }
        }
      });
      listContainer.appendChild(card);
    });
  }

  function openPostModal(post) {
    const overlay = Components.el("div", { className: "modal-overlay" });
    const modal = Components.el("div", { className: "modal" });

    const title = Components.el(
      "h2",
      { className: "modal-title" },
      post.title || ""
    );

    const content = Components.el(
      "p",
      { className: "modal-content-full" },
      post.content || ""
    );

    const contact = Components.el("div", { className: "modal-contact" }, [
      Components.el(
        "span",
        { className: "modal-contact-label" },
        "Контакты: "
      ),
      Components.el(
        "span",
        { className: "modal-contact-value" },
        post.contact || "не указаны"
      )
    ]);

    const closeBtn = Components.button({
      label: "Закрыть",
      variant: "secondary",
      size: "md",
      onClick: function () {
        overlay.remove();
      }
    });

    modal.appendChild(title);
    modal.appendChild(content);
    modal.appendChild(contact);
    modal.appendChild(closeBtn);
    overlay.appendChild(modal);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }

  searchField.control.addEventListener("input", function () {
    renderList();
  });
  toggleInput.addEventListener("change", function () {
    renderList();
  });

  renderList();
}

// ---------- Страница входа (единый блок без вкладок) ----------
function loginView(_options) {
  return async function () {
    renderShell();
    const main = UI.getMainContainer();
    UI.clearMain();
    UI.setPageTitle("Вход");

    if (!main) return;

    const card = Components.el("section", { className: "auth-card" });

    const title = Components.el(
      "h1",
      { className: "auth-title" },
      "Вход по email"
    );

    const subtitle = Components.el(
      "p",
      { className: "auth-subtitle" },
      "Мы отправим одноразовый код на вашу почту. Пароль придумывать не нужно."
    );

    const step1Title = Components.el(
      "h2",
      { className: "auth-step-title" },
      "1. Введите ваш email"
    );
    const emailField = Components.inputField({
      label: "Корпоративная или личная почта",
      name: "email",
      type: "email",
      placeholder: "you@university.edu"
    });

    const sendBtn = Components.button({
      label: "Получить код",
      variant: "primary",
      size: "md"
    });

    const step2Title = Components.el(
      "h2",
      { className: "auth-step-title" },
      "2. Введите код из письма"
    );
    const codeField = Components.inputField({
      label: "Код из письма",
      name: "code",
      placeholder: "Например: 123456"
    });

    const loginBtn = Components.button({
      label: "Войти",
      variant: "primary",
      size: "md"
    });

    // По умолчанию шаг 2 заблокирован, пока не запросим код
    codeField.wrapper.style.opacity = "0.5";
    codeField.control.disabled = true;
    loginBtn.disabled = true;
    loginBtn.classList.add("btn-disabled");

    // Обработчик запроса кода
    sendBtn.addEventListener("click", async function () {
      const email = (emailField.control.value || "").trim();
      if (!email) {
        UI.showToast("Введите email", "error");
        return;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "Отправляем...";

      try {
        await Api.requestCode(email);
        UI.showToast("Код отправлен на вашу почту", "success");

        codeField.wrapper.style.opacity = "1";
        codeField.control.disabled = false;
        loginBtn.disabled = false;
        loginBtn.classList.remove("btn-disabled");

        // Запоминаем email в состоянии
        State.setAuth({ email: email, accessToken: null });
      } catch (err) {
        console.error(err);
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = "Получить код";
      }
    });

    // Обработчик подтверждения кода
    loginBtn.addEventListener("click", async function () {
      const email = (emailField.control.value || "").trim();
      const code = (codeField.control.value || "").trim();

      if (!email || !code) {
        UI.showToast("Введите email и код", "error");
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = "Входим...";

      try {
        const data = await Api.authorize(email, code);
        if (data && data.access_token) {
          // Сохраняем токен
          State.setAuth({
            email: email,
            accessToken: data.access_token
          });

          // Дополнительно подтягиваем профиль пользователя (ник, id, информация о смене ника)
          try {
            const me = await Api.getMe();
            if (me) {
              State.setUserMeta({
                username: me.username,
                userId: me.id,
                // если сейчас смена ника запрещена, сохраняем время, когда её снова можно будет сделать
                usernameChangeCooldownUntil: me.next_username_change_at || null
              });
            }
          } catch (profileErr) {
            console.error("Не удалось получить профиль пользователя", profileErr);
          }

          UI.showToast("Успешный вход", "success");
          Router.navigate("/dashboard");
        }
      } catch (err) {
        console.error(err);
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Войти";
      }
    });

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(step1Title);
    card.appendChild(emailField.wrapper);
    card.appendChild(sendBtn);
    card.appendChild(step2Title);
    card.appendChild(codeField.wrapper);
    card.appendChild(loginBtn);

    main.appendChild(card);
  };
}

// ---------- Личный кабинет ----------
async function dashboardView() {
  if (!ensureAuth()) return;

  // Подтягиваем свежие данные профиля (чтобы знать, можно ли ещё менять ник)
  let me = null;
  try {
    me = await Api.getMe();
    if (me) {
      State.setUserMeta({
        username: me.username,
        userId: me.id,
        usernameChangeCooldownUntil: me.next_username_change_at || null
      });
    }
  } catch (err) {
    console.error("Не удалось получить профиль пользователя", err);
  }

  renderShell();
  const main = UI.getMainContainer();
  UI.clearMain();
  UI.setPageTitle("Личный кабинет");

  if (!main) return;

  const user = State.getUser();

  const headerRow = Components.el("div", { className: "dashboard-header" }, [
    Components.el("div", { className: "dashboard-user" }, [
      Components.el(
        "p",
        { className: "dashboard-label" },
        "Вы вошли как:"
      ),
      Components.el(
        "p",
        { className: "dashboard-email" },
        user.email || "unknown@example.com"
      )
    ]),
    Components.button({
      label: "Добавить объявление",
      variant: "primary",
      size: "md",
      onClick: function () {
        Router.navigate("/add");
      }
    })
  ]);

  // Блок смены никнейма
  const usernameCard = Components.el("section", { className: "panel" });
  const unameTitle = Components.el(
    "h2",
    { className: "panel-title" },
    "Никнейм в системе"
  );
  const currentName = Components.el(
    "p",
    { className: "panel-subtitle" },
    user.username
      ? "Текущий ник: " + user.username
      : "Ник ещё не задан. Пока вместо него будет отображаться ваш email."
  );

  // Информация о таймере смены ника
  const timerInfo = Components.el(
    "p",
    { className: "panel-subtitle" },
    ""
  );

  const unameField = Components.inputField({
    label: "Новый ник",
    name: "username",
    placeholder: "Например: frontend_hero"
  });
  if (user.username) {
    unameField.control.value = user.username;
  }

  const saveUnameBtn = Components.button({
    label: "Сохранить ник",
    variant: "secondary",
    size: "md"
  });

  // Логика таймера смены ника (можно менять раз в 30 дней)
  // usernameChangeCooldownUntil — момент, до которого НЕЛЬЗЯ менять ник
  let cooldownUntil = null;
  if (user.usernameChangeCooldownUntil) {
    cooldownUntil = new Date(user.usernameChangeCooldownUntil);
  } else if (me && me.next_username_change_at) {
    cooldownUntil = new Date(me.next_username_change_at);
  }

  function formatRemaining(deadline) {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) {
      return null;
    }
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
    if (days > 0) {
      return `${days} дн. ${hours} ч.`;
    }
    if (hours > 0) {
      return `${hours} ч.`;
    }
    const minutes = totalMinutes;
    return `${minutes} мин.`;
  }

  function applyTimerState() {
    const now = new Date();

    if (!cooldownUntil || now >= cooldownUntil) {
      // Смена ника разрешена прямо сейчас
      timerInfo.textContent =
        "После сохранения ника следующую смену можно будет сделать только через 30 дней.";
      unameField.control.disabled = false;
      saveUnameBtn.disabled = false;
      return;
    }

    const text = formatRemaining(cooldownUntil);
    timerInfo.textContent = text
      ? `Ник можно будет сменить через ${text}.`
      : "Ник можно будет сменить позже.";

    unameField.control.disabled = true;
    saveUnameBtn.disabled = true;
  }

  applyTimerState();
  if (cooldownUntil) {
    // Обновляем таймер раз в минуту
    setInterval(applyTimerState, 60_000);
  }

  saveUnameBtn.addEventListener("click", async function () {
    const value = (unameField.control.value || "").trim();
    if (!value) {
      UI.showToast("Ник не может быть пустым", "error");
      return;
    }

    saveUnameBtn.disabled = true;
    saveUnameBtn.textContent = "Сохраняем...";

    try {
      const data = await Api.updateUsername(value);
      if (data && data.username) {
        // После успешной смены ника — блокируем дальнейшую смену на 30 дней
        const now = new Date();
        const cooldownUntilLocal = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        State.setUserMeta({
          username: data.username,
          usernameChangeCooldownUntil: cooldownUntilLocal.toISOString()
        });
        cooldownUntil = cooldownUntilLocal;
        applyTimerState();

        currentName.textContent = "Текущий ник: " + data.username;
        UI.showToast("Ник обновлён", "success");
      }
    } catch (err) {
      console.error(err);
    } finally {
      saveUnameBtn.disabled = false;
      saveUnameBtn.textContent = "Сохранить ник";
    }
  });

  usernameCard.appendChild(unameTitle);
  usernameCard.appendChild(currentName);
  usernameCard.appendChild(timerInfo);
  usernameCard.appendChild(unameField.wrapper);
  usernameCard.appendChild(saveUnameBtn);

  // Блок с моими объявлениями
  const postsCard = Components.el("section", { className: "panel" });
  const postsTitle = Components.el(
    "h2",
    { className: "panel-title" },
    "Мои объявления"
  );
  const postsInfo = Components.el(
    "p",
    { className: "panel-subtitle" },
    "Здесь будут все ваши объявления. Новые публикации сначала проходят модерацию."
  );
  const list = Components.el("div", { className: "posts-grid" });

  postsCard.appendChild(postsTitle);
  postsCard.appendChild(postsInfo);
  postsCard.appendChild(list);

  main.appendChild(headerRow);
  main.appendChild(usernameCard);
  main.appendChild(postsCard);

  let posts = [];
  try {
    if (user.userId) {
      // Если мы уже знаем userId — берём полную выборку по пользователю
      posts = await Api.getUserPosts(user.userId);
    } else {
      // Иначе фильтруем одобренные объявления по email
      const all = await Api.getAllPosts();
      posts = all.filter(function (p) {
        return p.user_email === user.email;
      });
    }
  } catch (err) {
    console.error(err);
  }

  if (!posts || posts.length === 0) {
    list.appendChild(
      Components.el(
        "p",
        { className: "empty-state" },
        "У вас пока нет объявлений. Самое время создать первое!"
      )
    );
    return;
  }

  posts.forEach(function (post) {
    const card = Components.postCard(post, {
      isMine: true,
      onOpen: function () {
        Router.navigate("/edit/" + post.id);
      },
      onEdit: function () {
        Router.navigate("/edit/" + post.id);
      },
      onDelete: async function (p) {
        if (
          !window.confirm(
            "Удалить это объявление без возможности восстановления?"
          )
        ) {
          return;
        }
        try {
          await Api.deletePost(p.id);
          UI.showToast("Объявление удалено", "success");
          list.removeChild(card);
        } catch (err) {
          console.error(err);
        }
      }
    });
    list.appendChild(card);
  });
}

// ---------- Страница создания / редактирования объявления ----------
async function postFormView(params) {
  if (!ensureAuth()) return;

  const isEdit = params && params.mode === "edit";
  const id = params && params.id ? params.id : null;

  renderShell();
  const main = UI.getMainContainer();
  UI.clearMain();
  UI.setPageTitle(
    isEdit ? "Редактирование объявления" : "Новое объявление"
  );

  if (!main) return;

  const card = Components.el("section", {
    className: "panel panel-large"
  });

  const title = Components.el(
    "h1",
    { className: "panel-title" },
    isEdit ? "Редактировать объявление" : "Новое объявление"
  );
  const subtitle = Components.el(
    "p",
    { className: "panel-subtitle" },
    "Пишите конкретно и по делу — так ваше объявление быстрее найдут нужные люди."
  );

  const titleField = Components.inputField({
    label: "Заголовок",
    name: "title",
    placeholder: "Например: Сдам комнату рядом с институтом"
  });
  const contentField = Components.inputField({
    label: "Описание",
    name: "content",
    placeholder: "Расскажите, что вы предлагаете или ищете...",
    multiline: true
  });
  const contactField = Components.inputField({
    label: "Контакты",
    name: "contact",
    placeholder: "Введите свой телеграмм или телефон",
    type: "text"
  });

  const submitBtn = Components.button({
    label: isEdit ? "Сохранить изменения" : "Опубликовать",
    variant: "primary",
    size: "md"
  });

  card.appendChild(title);
  card.appendChild(subtitle);
  card.appendChild(titleField.wrapper);
  card.appendChild(contentField.wrapper);
  card.appendChild(contactField.wrapper);
  card.appendChild(submitBtn);

  main.appendChild(card);

  // Если редактирование — подгружаем текущие данные
  if (isEdit && id) {
    try {
      const existing = await Api.getPost(id);
      if (existing) {
        titleField.control.value = existing.title || "";
        contentField.control.value = existing.content || "";
        contactField.control.value = existing.contact || "";
        if (!State.getUser().userId && existing.user_id) {
          State.setUserMeta({ userId: existing.user_id });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  submitBtn.addEventListener("click", async function () {
    const titleValue = (titleField.control.value || "").trim();
    const contentValue = (contentField.control.value || "").trim();
    const contactValue = (contactField.control.value || "").trim();

    if (!titleValue || !contentValue || !contactValue) {
      UI.showToast("Заполните заголовок, описание и контакты", "error");
      return;
    }

    // Валидация формата контактов
    const trimmedContact = contactValue.trim();
    const isTelegram = trimmedContact.startsWith("@");
    const isPhone = trimmedContact.startsWith("+7");
    const isiPhone = trimmedContact.startsWith("8");
    
    if (!isTelegram && !isPhone && !isiPhone) {
      UI.showToast("Контакты должны начинаться с '@' для телеграм или '+7 / 8' для телефона", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? "Сохраняем..." : "Публикуем...";

    try {
      if (isEdit && id) {
        await Api.updatePost(id, {
          title: titleValue,
          content: contentValue,
          contact: contactValue
        });
        UI.showToast("Объявление обновлено", "success");
      } else {
        const created = await Api.createPost({
          title: titleValue,
          content: contentValue,
          contact: contactValue
        });
        // Если бекенд вернул user_id — запоминаем
        if (created && created.user_id) {
          State.setUserMeta({ userId: created.user_id });
        }
        UI.showToast(
          "Объявление отправлено на модерацию и появится после проверки",
          "success"
        );
      }
      Router.navigate("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit
        ? "Сохранить изменения"
        : "Опубликовать";
    }
  });
}

// ---------- Страница контактов ----------
function contactsView() {
  renderShell();
  const main = UI.getMainContainer();
  UI.clearMain();
  UI.setPageTitle("Контакты");

  if (!main) return;

  const card = Components.el("section", {
    className: "panel panel-large"
  });

  const title = Components.el(
    "h1",
    { className: "panel-title" },
    "Контакты и поддержка"
  );
  const text = Components.el(
    "p",
    { className: "panel-subtitle" },
    "Если у вас есть вопросы, идеи по развитию проекта или вы нашли баг — напишите нам. Мы постараемся ответить как можно быстрее."
  );

  const list = Components.el("ul", { className: "contacts-list" });
  const items = [
    { label: "Email поддержки", value: "drug-net@mail.ru" },
    { label: "Telegram", value: "@DrugNet" },
    {
      label: "Часы работы",
      value: "Пн–Пт, 10:00–19:00 по московскому времени"
    }
  ];

  items.forEach(function (item) {
    const li = Components.el("li", { className: "contacts-item" }, [
      Components.el(
        "span",
        { className: "contacts-label" },
        item.label
      ),
      Components.el(
        "span",
        { className: "contacts-value" },
        item.value
      )
    ]);
    list.appendChild(li);
  });

  card.appendChild(title);
  card.appendChild(text);
  card.appendChild(list);
  main.appendChild(card);
}

export const Views = {
  homeView,
  loginView,
  dashboardView,
  postFormView,
  contactsView
};


