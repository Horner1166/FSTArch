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
  UI.animatePageIn();
  UI.setPageTitle("Объявления");

  if (!main) return;

  const hero = Components.el("section", { className: "hero" }, [
    Components.el("div", { className: "hero-text" }, [
      Components.el(
        "h1",
        { className: "hero-title" },
        "LightNet - площадка бесплатных объявлений для ваших товаров и услуг"
      ),
      Components.el(
        "p",
        { className: "hero-subtitle" },
        "Размещайте и находите объявления быстро и удобно — в одном месте."
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
        if (!currentUser || !currentUser.userId) return false;
        if (post.user_id !== currentUser.userId) return false;
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
        currentUser && currentUser.userId && post.user_id === currentUser.userId;
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
          const confirmed = await Components.confirmModal({
            title: "Удалить объявление",
            message: "Удалить это объявление без возможности восстановления?",
            confirmText: "Удалить",
            confirmVariant: "danger"
          });
          if (!confirmed) return;
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

    // Images section in modal
    let imagesSection = null;
    if (post.images && Array.isArray(post.images) && post.images.length > 0) {
      imagesSection = Components.el("div", { className: "modal-images" });
      
      post.images.forEach(function(imageItem) {
        // Извлекаем URL из объекта или используем строку напрямую
        const imageUrl = typeof imageItem === 'string' ? imageItem : (imageItem.image_url || imageItem.url || '');
        if (!imageUrl) return;
        
        const img = Components.el("img", {
          className: "modal-image",
          attrs: {
            src: imageUrl,
            alt: "Фото объявления"
          }
        });
        // Убираем открытие в новой вкладке - теперь просто превью
        img.style.cursor = "default";
        imagesSection.appendChild(img);
      });
    }

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
    if (imagesSection) {
      modal.appendChild(imagesSection);
    }
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
    UI.animatePageIn();
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
                role: me.role,
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
        role: me.role,
        usernameChangeCooldownUntil: me.next_username_change_at || null
      });
    }
  } catch (err) {
    console.error("Не удалось получить профиль пользователя", err);
  }

  renderShell();
  const main = UI.getMainContainer();
  UI.clearMain();
  UI.animatePageIn();
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
  const postsList = Components.el("div", { className: "posts-grid" });

  postsCard.appendChild(postsTitle);
  postsCard.appendChild(postsInfo);
  postsCard.appendChild(postsList);

  main.appendChild(headerRow);
  main.appendChild(usernameCard);
  main.appendChild(postsCard);

  let posts = [];
  try {
    const effectiveUserId = (me && me.id) ? me.id : user.userId;
    console.log("Dashboard: effectiveUserId =", effectiveUserId, "me =", me, "user =", user);
    
    if (effectiveUserId) {
      // Если мы знаем userId — берём полную выборку по пользователю (включая rejected/pending)
      posts = await Api.getUserPosts(effectiveUserId);
      console.log("Dashboard: getUserPosts result =", posts);
    } else {
      // Иначе фильтруем одобренные объявления по email
      const all = await Api.getAllPosts();
      posts = all.filter(function (p) {
        return p.username && user.username && p.username === user.username;
      });
      console.log("Dashboard: fallback filter result =", posts);
    }
  } catch (err) {
    console.error("Dashboard error loading posts:", err);
  }

  if (!Array.isArray(posts)) {
    posts = [];
  }

  // Бейдж на вкладке "Личный кабинет": количество отклонённых объявлений
  try {
    const rejectedCount = Array.isArray(posts)
      ? posts.filter(function (p) {
          const s = p && p.moderation_status ? String(p.moderation_status).toLowerCase() : "";
          return s.includes("rejected");
        }).length
      : 0;
    State.setUserMeta({ rejectedCount: rejectedCount });
    renderShell();
  } catch (_e) {
    // ignore
  }

  if (!posts || posts.length === 0) {
    postsList.appendChild(
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
      onOpen: openPostModal,
      onEdit: function (p) {
        Router.navigate("/edit/" + p.id);
      },
      onDelete: async function (p) {
        const confirmed = await Components.confirmModal({
          title: "Удалить объявление",
          message: "Удалить это объявление без возможности восстановления?",
          confirmText: "Удалить",
          confirmVariant: "danger"
        });
        if (!confirmed) return;
        try {
          await Api.deletePost(p.id);
          UI.showToast("Объявление удалено", "success");
          dashboardView();
        } catch (e) {
          console.error(e);
          UI.showToast("Не удалось удалить", "error");
        }
      }
    });

    // Если объявление отклонено — показываем причину
    const status = post && post.moderation_status ? String(post.moderation_status).toLowerCase() : "";
    if (status.includes("rejected") && post.rejection_reason) {
      card.appendChild(
        Components.el(
          "div",
          { className: "post-rejection" },
          "Причина отклонения: " + post.rejection_reason
        )
      );
    }
    postsList.appendChild(card);
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
  UI.animatePageIn();
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
    placeholder: "Например: Продам велосипед, Сдам комнату, Ищу мастера"
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
  const cityField = Components.inputField({
    label: "Город",
    name: "city",
    placeholder: "Например: Москва"
  });
  const streetField = Components.inputField({
    label: "Улица",
    name: "street",
    placeholder: "Например: Ленина, 15"
  });
  const priceField = Components.inputField({
    label: "Цена",
    name: "price",
    placeholder: "Например: 5000",
    type: "text"
  });

  // Image upload section
  const imageSection = Components.el("div", { className: "image-upload-section" });
  const imageLabel = Components.el("label", { className: "image-upload-label" }, "Фотографии (до 10)");
  
  // Create upload button
  const imageUploadButton = Components.button({
    label: "+ Добавить фото",
    variant: "secondary",
    size: "md",
    onClick: function() {
      // Create hidden file input when button is clicked
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "file";
      hiddenInput.accept = "image/*";
      hiddenInput.multiple = true;
      hiddenInput.style.display = "none";
      
      hiddenInput.addEventListener("change", function(e) {
        const files = Array.from(e.target.files);
        
        // Проверяем общее количество изображений
        if (uploadedImageFiles.length + files.length > 10) {
          UI.showToast("Можно загрузить максимум 10 изображений", "error");
          document.body.removeChild(hiddenInput);
          return;
        }
        
        for (const file of files) {
          if (file.size > 5 * 1024 * 1024) {
            UI.showToast("Файл слишком большой (максимум 5 МБ)", "error");
            continue;
          }
          
          // Добавляем файл в массив
          uploadedImageFiles.push(file);
          
          // Создаем превью из файла
          const reader = new FileReader();
          reader.onload = function(e) {
            const imgContainer = Components.el("div", { className: "image-preview-item" });
            const img = Components.el("img", {
              className: "image-preview-img",
              attrs: {
                src: e.target.result,
                alt: "Превью"
              }
            });
            const removeBtn = Components.button({
              label: "✕",
              variant: "danger",
              size: "sm",
              onClick: function() {
                // Удаляем файл из массива
                const index = uploadedImageFiles.indexOf(file);
                if (index > -1) {
                  uploadedImageFiles.splice(index, 1);
                }
                imgContainer.remove();
              }
            });
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(removeBtn);
            imagePreview.appendChild(imgContainer);
          };
          reader.readAsDataURL(file);
        }
        
        // Remove temporary input
        document.body.removeChild(hiddenInput);
      });
      
      // Add input to body and simulate click
      document.body.appendChild(hiddenInput);
      hiddenInput.click();
    }
  });
  
  const imagePreview = Components.el("div", { className: "image-preview" });
  let uploadedImageFiles = []; // Храним файлы вместо URL-ов

  imageSection.appendChild(imageLabel);
  imageSection.appendChild(imageUploadButton);
  imageSection.appendChild(imagePreview);

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
  card.appendChild(cityField.wrapper);
  card.appendChild(streetField.wrapper);
  card.appendChild(priceField.wrapper);
  card.appendChild(imageSection);
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
        cityField.control.value = existing.city || "";
        streetField.control.value = existing.street || "";
        priceField.control.value = existing.price || "";
        
        // Load existing images (для отображения)
        // При редактировании существующие изображения остаются на сервере
        // Новые файлы будут добавлены к существующим, если replace_images=false
        if (existing.images && Array.isArray(existing.images)) {
          existing.images.forEach(function(imageObj) {
            // Бекенд возвращает объекты с полем image_url
            const imageUrl = typeof imageObj === 'string' ? imageObj : (imageObj.image_url || imageObj.url);
            if (!imageUrl) return;
            
            const imgContainer = Components.el("div", { className: "image-preview-item existing-image" });
            imgContainer.setAttribute('data-image-url', imageUrl);
            
            const img = Components.el("img", {
              className: "image-preview-img",
              attrs: {
                src: imageUrl,
                alt: "Превью"
              }
            });
            const removeBtn = Components.button({
              label: "✕",
              variant: "danger",
              size: "sm",
              onClick: function() {
                // При удалении существующего изображения просто скрываем его из превью
                // В будущем можно добавить функционал удаления отдельных изображений через API
                imgContainer.remove();
              }
            });
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(removeBtn);
            imagePreview.appendChild(imgContainer);
          });
        }
        
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
    const cityValue = (cityField.control.value || "").trim();
    const streetValue = (streetField.control.value || "").trim();
    const priceValue = (priceField.control.value || "").trim();

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
      // Проверяем количество изображений
      if (uploadedImageFiles.length > 10) {
        UI.showToast("Можно загрузить максимум 10 изображений", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? "Сохранить изменения" : "Опубликовать";
        return;
      }

      const postData = {
        title: titleValue,
        content: contentValue,
        contact: contactValue,
        city: cityValue || undefined,
        street: streetValue || undefined,
        price: priceValue || undefined
      };

      if (isEdit && id) {
        // При редактировании: если есть новые файлы, добавляем их к существующим (replace_images=false)
        await Api.updatePost(id, postData, uploadedImageFiles.length > 0 ? uploadedImageFiles : null, false);
        UI.showToast("Объявление обновлено", "success");
      } else {
        // При создании: отправляем файлы вместе с данными поста
        const created = await Api.createPost(postData, uploadedImageFiles.length > 0 ? uploadedImageFiles : null);
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
  UI.animatePageIn();
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
    { label: "Email поддержки", value: "light-net@mail.ru" },
    { label: "Telegram", value: "@LightNet" },
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

// ---------- Страница модератора ----------
function moderatorView() {
  renderShell();
  const main = UI.getMainContainer();
  UI.clearMain();
  UI.animatePageIn();
  
  if (!main) return;
  
  // Проверка прав доступа (модератор или админ)
  if (!State.isAdmin() && !State.isModerator()) {
    const card = Components.el("section", { className: "panel panel-large" }, [
      Components.el("h1", { className: "panel-title" }, "Доступ запрещен"),
      Components.el("p", { className: "panel-subtitle" }, "У вас нет прав для доступа к этой странице.")
    ]);
    main.appendChild(card);
    return;
  }
  
  UI.setPageTitle("Объявления на модерации");
  
  // Заголовок страницы
  const header = Components.el("div", { className: "moderator-header" }, [
    Components.el("h1", { className: "panel-title" }, "Объявления на модерации"),
    Components.el("p", { className: "panel-subtitle" }, "Проверьте и одобрите или отклоните новые объявления.")
  ]);
  
  // Контейнер для списка объявлений
  const postsContainer = Components.el("div", { className: "posts-grid moderator-posts" });
  
  // Функция загрузки и отображения объявлений
  async function loadPendingPosts() {
    try {
      postsContainer.innerHTML = '<div style="text-align: center; padding: 40px;">🔄 Загрузка...</div>';
      
      const posts = await Api.getPendingPosts();
      
      if (!posts || posts.length === 0) {
        postsContainer.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.7;">Нет объявлений на модерации</div>';
        return;
      }
      
      postsContainer.innerHTML = '';
      
      posts.forEach(post => {
        const postCard = createModeratorPostCard(post);
        postsContainer.appendChild(postCard);
      });

      // Обновляем хедер, чтобы бейджи отражали актуальное состояние
      renderShell();
      
    } catch (error) {
      console.error('Error loading pending posts:', error);
      postsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Ошибка загрузки объявлений</div>';
    }
  }
  
  // Создание карточки объявления для модератора
  function createModeratorPostCard(post) {
    const card = Components.el("article", { className: "post-card moderator-card" });
    
    const title = Components.el("h3", { className: "post-title" }, post.title || "Без заголовка");
    title.style.fontSize = "calc(1.25rem + 4pt)";
    
    const text = (post.content || "").length > 180
      ? (post.content || "").slice(0, 177) + "..."
      : post.content || "";
    
    const content = Components.el("p", { className: "post-content" }, text);
    
    // Информация о контактах и местоположении
    const contactInfo = Components.el("div", { className: "post-contact" }, [
      Components.el("span", { className: "post-contact-label" }, "Контакты: "),
      Components.el("span", { className: "post-contact-value" }, post.contact || "не указаны")
    ]);
    
    // Новые поля
    const locationInfo = Components.el("div", { className: "post-location" }, [
      Components.el("span", { className: "post-location-label" }, "Местоположение: "),
      Components.el("span", { className: "post-location-value" }, 
        (post.city && post.street) ? `${post.city}, ${post.street}` : 
        post.city || post.street || "не указано"
      )
    ]);
    
    const priceInfo = Components.el("div", { className: "post-price" }, [
      Components.el("span", { className: "post-price-label" }, "Цена: "),
      Components.el("span", { className: "post-price-value" }, post.price || "не указана")
    ]);
    
    // Метаданные
    const meta = Components.el("div", { className: "post-meta" }, [
      Components.el("div", { className: "post-meta-left" }, [
        Components.el("span", { className: "badge" }, "На модерации"),
        Components.el("span", { className: "post-email" }, post.username || "username")
      ]),
      Components.el("div", { className: "post-meta-right" }, [
        Components.el("span", { className: "post-date" }, new Date(post.created_at).toLocaleString("ru-RU"))
      ])
    ]);
    
    // Кнопки действий модератора
    const actions = Components.el("div", { className: "moderator-actions" });
    
    const viewBtn = Components.button({
      label: "Открыть объявление",
      variant: "secondary",
      size: "sm",
      onClick: () => openModeratorPostModal(post)
    });
    
    const approveBtn = Components.button({
      label: "Принять объявление",
      variant: "primary",
      size: "sm",
      onClick: () => approvePost(post.id)
    });
    
    const rejectBtn = Components.button({
      label: "Отклонить объявление",
      variant: "danger",
      size: "sm",
      onClick: () => rejectPost(post.id)
    });
    
    actions.appendChild(viewBtn);
    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
    
    // Собираем карточку
    card.appendChild(title);
    card.appendChild(content);
    card.appendChild(contactInfo);
    card.appendChild(locationInfo);
    card.appendChild(priceInfo);
    card.appendChild(meta);
    card.appendChild(actions);
    
    return card;
  }
  
  // Функция одобрения объявления
  async function approvePost(postId) {
    try {
      await Api.approvePost(postId);
      UI.showToast("Объявление одобрено", "success");
      loadPendingPosts(); // Перезагружаем список
      renderShell();
    } catch (error) {
      console.error('Error approving post:', error);
      UI.showToast("Ошибка при одобрении объявления", "error");
    }
  }
  
  async function rejectPostWithReason(postId, reason) {
    try {
      await Api.rejectPost(postId, reason);
      UI.showToast("Объявление отклонено", "success");
      loadPendingPosts();
      renderShell();
    } catch (error) {
      console.error("Error rejecting post:", error);
      UI.showToast("Ошибка при отклонении объявления", "error");
    }
  }

  // Функция отклонения объявления (с запросом причины)
  async function rejectPost(postId) {
    const reason = await Components.promptModal({
      title: "Отклонить объявление",
      message: "Укажите причину отклонения объявления:",
      placeholder: "Введите причину...",
      confirmText: "Отклонить",
      confirmVariant: "danger",
      multiline: true
    });
    if (!reason) return;
    await rejectPostWithReason(postId, reason);
  }
  
  // Модальное окно для просмотра объявления
  function openModeratorPostModal(post) {
    const overlay = Components.el("div", { className: "modal-overlay" });
    const modal = Components.el("div", { className: "modal modal-moderator" });
    
    const title = Components.el("h2", { className: "modal-title" }, post.title || "Без заголовка");
    
    const content = Components.el("div", { className: "modal-content" }, [
      Components.el("p", {}, post.content || "Нет описания")
    ]);
    
    const contact = Components.el("div", { className: "modal-contact" }, [
      Components.el("strong", {}, "Контакты: "),
      Components.el("span", {}, post.contact || "не указаны")
    ]);
    
    const location = Components.el("div", { className: "modal-location" }, [
      Components.el("strong", {}, "Местоположение: "),
      Components.el("span", {}, (post.city && post.street) ? `${post.city}, ${post.street}` : 
        post.city || post.street || "не указано")
    ]);
    
    const price = Components.el("div", { className: "modal-price" }, [
      Components.el("strong", {}, "Цена: "),
      Components.el("span", {}, post.price || "не указана")
    ]);
    
    const actions = Components.el("div", { className: "modal-actions moderator-actions" });
    
    const approveBtn = Components.button({
      label: "Принять объявление",
      variant: "primary",
      size: "md",
      onClick: async () => {
        await approvePost(post.id);
        document.body.removeChild(overlay);
      }
    });
    
    const rejectBtn = Components.button({
      label: "Отклонить объявление",
      variant: "danger",
      size: "md",
      onClick: async () => {
        const reason = await Components.promptModal({
          title: "Отклонить объявление",
          message: "Укажите причину отклонения объявления:",
          placeholder: "Введите причину...",
          confirmText: "Отклонить",
          confirmVariant: "danger",
          multiline: true
        });
        if (reason) {
          await rejectPostWithReason(post.id, reason);
          document.body.removeChild(overlay);
        }
      }
    });
    
    const closeBtn = Components.button({
      label: "Закрыть",
      variant: "secondary",
      size: "sm",
      onClick: () => document.body.removeChild(overlay)
    });
    
    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
    actions.appendChild(closeBtn);
    
    modal.appendChild(title);
    modal.appendChild(content);
    modal.appendChild(contact);
    modal.appendChild(location);
    modal.appendChild(price);
    modal.appendChild(actions);
    
    overlay.appendChild(modal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    document.body.appendChild(overlay);
  }
  
  // Собираем страницу
  main.appendChild(header);
  main.appendChild(postsContainer);
  
  // Загружаем объявления
  loadPendingPosts();
}

// ---------- Страница управления пользователями (для модератора/админа) ----------
async function usersManagementView() {
  renderShell();
  const main = UI.getMainContainer();
  UI.clearMain();
  UI.animatePageIn();
  
  if (!main) return;
  
  // Проверка прав доступа (модератор или админ)
  if (!State.isAdmin() && !State.isModerator()) {
    const card = Components.el("section", { className: "panel panel-large" }, [
      Components.el("h1", { className: "panel-title" }, "Доступ запрещен"),
      Components.el("p", { className: "panel-subtitle" }, "У вас нет прав для доступа к этой странице.")
    ]);
    main.appendChild(card);
    return;
  }
  
  UI.setPageTitle("Управление пользователями");
  
  // Заголовок страницы
  const header = Components.el("div", { className: "moderator-header" }, [
    Components.el("h1", { className: "panel-title" }, "Управление пользователями"),
    Components.el("p", { className: "panel-subtitle" }, "Просматривайте, банте или назначайте модераторами пользователей системы.")
  ]);
  
  // Контейнер для списка пользователей
  const usersContainer = Components.el("div", { className: "users-grid" });
  
  // Функция загрузки и отображения пользователей
  async function loadUsers() {
    try {
      usersContainer.innerHTML = '<div style="text-align: center; padding: 40px;">🔄 Загрузка...</div>';
      
      const users = await Api.listUsers();
      
      if (!users || users.length === 0) {
        usersContainer.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.7;">Пользователи не найдены</div>';
        return;
      }
      
      usersContainer.innerHTML = '';
      
      users.forEach(user => {
        const userCard = createUserCard(user);
        usersContainer.appendChild(userCard);
      });
      
    } catch (error) {
      console.error('Error loading users:', error);
      usersContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Ошибка загрузки пользователей</div>';
    }
  }
  
  // Создание карточки пользователя
  function createUserCard(user) {
    const card = Components.el("article", { className: "user-card" });
    
    // Определяем роль для отображения
    const roleText = user.role === "admin" ? "Администратор" : 
                     user.role === "moderator" ? "Модератор" : "Пользователь";
    const roleClass = user.role === "admin" ? "badge-admin" : 
                      user.role === "moderator" ? "badge-moderator" : "badge-user";
    
    const userInfo = Components.el("div", { className: "user-info" }, [
      Components.el("h3", { className: "user-card-name" }, user.username || "Без имени"),
      Components.el("p", { className: "user-card-email" }, user.email || ""),
      Components.el("div", { className: "user-card-meta" }, [
        Components.el("span", { className: `badge ${roleClass}` }, roleText),
        user.is_banned ? Components.el("span", { className: "badge badge-danger" }, "Забанен") : null
      ].filter(Boolean)),
      Components.el("p", { className: "user-card-date" }, 
        "Регистрация: " + new Date(user.created_at).toLocaleDateString("ru-RU")
      )
    ]);
    
    // Кнопки действий
    const actions = Components.el("div", { className: "user-actions" });
    
    // Кнопка бана/разбана (только для обычных пользователей, не для себя)
    const currentUser = State.getUser();
    const isOwnAccount = currentUser && currentUser.userId && String(currentUser.userId) === String(user.id);
    
    if (user.role === "user" && !isOwnAccount) {
      const banBtn = Components.button({
        label: user.is_banned ? "Разбанить" : "Забанить",
        variant: user.is_banned ? "primary" : "danger",
        size: "sm",
        onClick: async () => {
          const confirmed = await Components.confirmModal({
            title: user.is_banned ? "Разбанить пользователя" : "Забанить пользователя",
            message: user.is_banned 
              ? "Вы уверены, что хотите разбанить пользователя " + user.username + "?" 
              : "Вы уверены, что хотите забанить пользователя " + user.username + "? Все его объявления будут удалены.",
            confirmText: user.is_banned ? "Разбанить" : "Забанить",
            confirmVariant: user.is_banned ? "primary" : "danger"
          });
          if (!confirmed) return;
          try {
            await Api.toggleBanUser(user.id);
            UI.showToast(user.is_banned ? "Пользователь разбанен" : "Пользователь забанен", "success");
            loadUsers();
          } catch (error) {
            console.error('Error toggling ban:', error);
          }
        }
      });
      actions.appendChild(banBtn);
    }
    
    // Кнопка назначения/снятия модератора (только для админа, не для себя и не для других админов)
    if (State.isAdmin() && !isOwnAccount && user.role !== "admin") {
      const modBtn = Components.button({
        label: user.role === "moderator" ? "Снять модератора" : "Сделать модератором",
        variant: user.role === "moderator" ? "secondary" : "primary",
        size: "sm",
        onClick: async () => {
          const isMod = user.role === "moderator";
          const confirmed = await Components.confirmModal({
            title: isMod ? "Снять роль модератора" : "Назначить модератором",
            message: isMod 
              ? "Вы уверены, что хотите снять роль модератора у пользователя " + user.username + "?"
              : "Вы уверены, что хотите назначить пользователя " + user.username + " модератором?",
            confirmText: isMod ? "Снять роль" : "Назначить",
            confirmVariant: isMod ? "secondary" : "primary"
          });
          if (!confirmed) return;
          try {
            await Api.toggleModeratorRole(user.id);
            UI.showToast(isMod ? "Роль модератора снята" : "Пользователь назначен модератором", "success");
            loadUsers();
          } catch (error) {
            console.error('Error toggling moderator role:', error);
          }
        }
      });
      actions.appendChild(modBtn);
    }
    
    card.appendChild(userInfo);
    if (actions.children.length > 0) {
      card.appendChild(actions);
    }
    
    return card;
  }
  
  // Собираем страницу
  main.appendChild(header);
  main.appendChild(usersContainer);
  
  // Загружаем пользователей
  loadUsers();
}

export const Views = {
  homeView,
  loginView,
  dashboardView,
  postFormView,
  contactsView,
  moderatorView,
  usersManagementView
};


