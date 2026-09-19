/**
 * Telegram Web App - Управление задачами фестиваля
 * Поддержка: Telegram WebApp SDK, Supabase Storage, FastAPI Backend
 */

// Состояние приложения
const state = {
  currentUser: {
    id: 10001,
    username: 'volunteer_alex',
    first_name: 'Алексей',
  },
  currentRole: null, // 'volunteer', 'organizer', 'admin'
  tasks: [],
  progressBars: [],
  users: [],
  selectedFilter: 'all',
  activeDiscussionTaskId: null,
  supabaseClient: null,
  supabaseConfig: null,
  selectedFile: null,
};

// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    state.currentUser = tg.initDataUnsafe.user;
  }
}

// Заголовки для запросов к бэкенду (с валидацией initData)
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (tg && tg.initData) {
    headers['X-Telegram-Init-Data'] = tg.initData;
  }
  return headers;
}

// DOM элементы
const el = {
  roleSelectScreen: document.getElementById('roleSelectScreen'),
  mainScreen: document.getElementById('mainScreen'),
  headerTitle: document.getElementById('headerTitle'),
  roleIndicator: document.getElementById('roleIndicator'),
  switchRoleBtn: document.getElementById('switchRoleBtn'),
  tgUserLabel: document.getElementById('tgUserLabel'),

  selectVolunteerBtn: document.getElementById('selectVolunteerBtn'),
  selectOrganizerBtn: document.getElementById('selectOrganizerBtn'),

  passwordModal: document.getElementById('passwordModal'),
  passwordInput: document.getElementById('passwordInput'),
  passwordError: document.getElementById('passwordError'),
  submitPasswordBtn: document.getElementById('submitPasswordBtn'),
  cancelPasswordBtn: document.getElementById('cancelPasswordBtn'),
  closePasswordModalBtn: document.getElementById('closePasswordModalBtn'),

  progressBarsContainer: document.getElementById('progressBarsContainer'),
  addProgressBarBtn: document.getElementById('addProgressBarBtn'),

  adminActionToolbar: document.getElementById('adminActionToolbar'),
  openCreateTaskModalBtn: document.getElementById('openCreateTaskModalBtn'),
  openTagManagerBtn: document.getElementById('openTagManagerBtn'),
  openArchiveBtn: document.getElementById('openArchiveBtn'),

  tasksList: document.getElementById('tasksList'),
  tasksCountBadge: document.getElementById('tasksCountBadge'),
  filterPills: document.querySelectorAll('.filter-pill'),

  createTaskModal: document.getElementById('createTaskModal'),
  closeCreateTaskModalBtn: document.getElementById('closeCreateTaskModalBtn'),
  cancelCreateTaskBtn: document.getElementById('cancelCreateTaskBtn'),
  createTaskForm: document.getElementById('createTaskForm'),
  imageInput: document.getElementById('imageInput'),
  dropzone: document.getElementById('dropzone'),
  uploadPlaceholder: document.getElementById('uploadPlaceholder'),
  uploadPreviewBox: document.getElementById('uploadPreviewBox'),
  imagePreview: document.getElementById('imagePreview'),
  removeImageBtn: document.getElementById('removeImageBtn'),
  uploadStatusText: document.getElementById('uploadStatusText'),
  taskAssignUsers: document.getElementById('taskAssignUsers'),
  submitCreateTaskBtn: document.getElementById('submitCreateTaskBtn'),
  createBtnSpinner: document.getElementById('createBtnSpinner'),

  tagManagerModal: document.getElementById('tagManagerModal'),
  closeTagManagerModalBtn: document.getElementById('closeTagManagerModalBtn'),
  usersTagList: document.getElementById('usersTagList'),

  createProgressBarModal: document.getElementById('createProgressBarModal'),
  closeProgressBarModalBtn: document.getElementById('closeProgressBarModalBtn'),
  cancelProgressBarBtn: document.getElementById('cancelProgressBarBtn'),
  createProgressBarForm: document.getElementById('createProgressBarForm'),

  discussionModal: document.getElementById('discussionModal'),
  closeDiscussionModalBtn: document.getElementById('closeDiscussionModalBtn'),
  discussionTaskTitle: document.getElementById('discussionTaskTitle'),
  discussionMessages: document.getElementById('discussionMessages'),
  discussionSendForm: document.getElementById('discussionSendForm'),
  discussionInput: document.getElementById('discussionInput'),

  archiveModal: document.getElementById('archiveModal'),
  closeArchiveModalBtn: document.getElementById('closeArchiveModalBtn'),
  archiveTasksList: document.getElementById('archiveTasksList'),
};

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  initUserInfo();
  await initSupabaseClient();
  setupEventListeners();
});

// Инициализация информации о пользователе в интерфейсе
function initUserInfo() {
  const name = state.currentUser.first_name || state.currentUser.username || 'Пользователь';
  const uname = state.currentUser.username ? ` (@${state.currentUser.username})` : '';
  el.tgUserLabel.textContent = `Telegram: ${name}${uname}`;
}

// Инициализация JS клиента Supabase для загрузки фото
async function initSupabaseClient() {
  try {
    const res = await fetch('/api/config/supabase');
    if (res.ok) {
      state.supabaseConfig = await res.json();
      if (window.supabase && state.supabaseConfig.supabase_url && state.supabaseConfig.supabase_anon_key) {
        state.supabaseClient = window.supabase.createClient(
          state.supabaseConfig.supabase_url,
          state.supabaseConfig.supabase_anon_key
        );
        console.log('Supabase JS Client успешно инициализирован');
      }
    }
  } catch (err) {
    console.warn('Не удалось загрузить конфигурацию Supabase (будет использован тестовый режим):', err);
  }
}

// Слушатели событий
function setupEventListeners() {
  // Выбор роли "Волонтёр"
  el.selectVolunteerBtn.addEventListener('click', () => {
    setRole('volunteer');
  });

  // Выбор роли "Организатор" (открывает модалку ввода пароля)
  el.selectOrganizerBtn.addEventListener('click', () => {
    el.passwordModal.classList.remove('hidden');
    el.passwordInput.value = '';
    el.passwordError.classList.add('hidden');
    el.passwordInput.focus();
  });

  // Закрытие модалки пароля
  const closePassModal = () => el.passwordModal.classList.add('hidden');
  el.cancelPasswordBtn.addEventListener('click', closePassModal);
  el.closePasswordModalBtn.addEventListener('click', closePassModal);

  // Проверка пароля (1965 -> Организатор, 19907 -> Администратор)
  el.submitPasswordBtn.addEventListener('click', handlePasswordSubmit);
  el.passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handlePasswordSubmit();
  });

  // Смена роли
  el.switchRoleBtn.addEventListener('click', () => {
    state.currentRole = null;
    el.mainScreen.classList.add('hidden');
    el.roleSelectScreen.classList.remove('hidden');
    el.roleIndicator.style.display = 'none';
    el.switchRoleBtn.style.display = 'none';
    el.headerTitle.textContent = 'Фестивальные задачи';
  });

  // Фильтры задач
  el.filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      el.filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedFilter = pill.dataset.filter;
      renderTasks();
    });
  });

  // Модалка создания задачи
  el.openCreateTaskModalBtn.addEventListener('click', openCreateTaskModal);
  const closeCreateModal = () => el.createTaskModal.classList.add('hidden');
  el.closeCreateTaskModalBtn.addEventListener('click', closeCreateModal);
  el.cancelCreateTaskBtn.addEventListener('click', closeCreateModal);
  el.createTaskForm.addEventListener('submit', handleCreateTaskSubmit);

  // Drag-and-drop и выбор файла изображения
  el.imageInput.addEventListener('change', handleImageSelect);
  el.removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImageUpload();
  });

  // Модалка тегов пользователей
  el.openTagManagerBtn.addEventListener('click', openTagManagerModal);
  el.closeTagManagerModalBtn.addEventListener('click', () => el.tagManagerModal.classList.add('hidden'));

  // Прогресс-бары
  el.addProgressBarBtn.addEventListener('click', () => el.createProgressBarModal.classList.remove('hidden'));
  const closePbModal = () => el.createProgressBarModal.classList.add('hidden');
  el.closeProgressBarModalBtn.addEventListener('click', closePbModal);
  el.cancelProgressBarBtn.addEventListener('click', closePbModal);
  el.createProgressBarForm.addEventListener('submit', handleCreateProgressBarSubmit);

  // Архив
  el.openArchiveBtn.addEventListener('click', openArchiveModal);
  el.closeArchiveModalBtn.addEventListener('click', () => el.archiveModal.classList.add('hidden'));

  // Обсуждение / Чат
  el.closeDiscussionModalBtn.addEventListener('click', () => el.discussionModal.classList.add('hidden'));
  el.discussionSendForm.addEventListener('submit', handleSendMessageSubmit);
}

// Проверка пароля на бэкенде
async function handlePasswordSubmit() {
  const password = el.passwordInput.value.trim();
  if (!password) return;

  try {
    const res = await fetch('/api/auth/verify-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (data.success && data.role) {
      el.passwordModal.classList.add('hidden');
      setRole(data.role);
    } else {
      // Локальная проверка в случае оффлайн/тест
      if (password === '19907') {
        el.passwordModal.classList.add('hidden');
        setRole('admin');
      } else if (password === '1965') {
        el.passwordModal.classList.add('hidden');
        setRole('organizer');
      } else {
        el.passwordError.classList.remove('hidden');
      }
    }
  } catch (err) {
    // Fallback проверка
    if (password === '19907') {
      el.passwordModal.classList.add('hidden');
      setRole('admin');
    } else if (password === '1965') {
      el.passwordModal.classList.add('hidden');
      setRole('organizer');
    } else {
      el.passwordError.classList.remove('hidden');
    }
  }
}

// Установка роли и переход на главный экран
function setRole(role) {
  state.currentRole = role;
  el.roleSelectScreen.classList.add('hidden');
  el.mainScreen.classList.remove('hidden');
  el.roleIndicator.style.display = 'inline-block';
  el.switchRoleBtn.style.display = 'inline-flex';

  el.roleIndicator.className = `role-badge ${role}`;
  if (role === 'admin') {
    el.roleIndicator.textContent = 'Главный админ';
    el.adminActionToolbar.classList.remove('hidden');
    el.addProgressBarBtn.classList.remove('hidden');
    el.headerTitle.textContent = 'Координация: Админ';
  } else if (role === 'organizer') {
    el.roleIndicator.textContent = 'Организатор';
    el.adminActionToolbar.classList.add('hidden');
    el.addProgressBarBtn.classList.add('hidden');
    el.headerTitle.textContent = 'Координация: Орг';
  } else {
    el.roleIndicator.textContent = 'Волонтёр';
    el.adminActionToolbar.classList.add('hidden');
    el.addProgressBarBtn.classList.add('hidden');
    el.headerTitle.textContent = 'Мои задачи';
  }

  loadData();
}

// Загрузка данных с бэкенда
async function loadData() {
  await Promise.all([loadProgressBars(), loadTasks(), loadUsers()]);
}

// Загрузка прогресс-баров
async function loadProgressBars() {
  try {
    const res = await fetch('/api/progress-bars', { headers: getAuthHeaders() });
    if (res.ok) {
      state.progressBars = await res.json();
      renderProgressBars();
    }
  } catch (err) {
    console.error('Ошибка загрузки прогресс-баров:', err);
  }
}

function renderProgressBars() {
  if (!state.progressBars || state.progressBars.length === 0) {
    el.progressBarsContainer.innerHTML = '<div class="empty-state">Нет созданных прогресс-баров</div>';
    return;
  }

  el.progressBarsContainer.innerHTML = state.progressBars
    .map((pb) => {
      const tagsStr = pb.tags && pb.tags.length ? ` (${pb.tags.join(', ')})` : '';
      return `
      <div class="progress-item" id="pb_${pb.id}">
        <div class="progress-info">
          <span class="progress-name">${escapeHtml(pb.title)}${tagsStr}</span>
          <span class="progress-percent">${pb.completed_count}/${pb.target_count} (${pb.percent}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar-fill" style="width: ${pb.percent}%"></div>
        </div>
      </div>
    `;
    })
    .join('');
}

// Загрузка задач
async function loadTasks() {
  el.tasksList.innerHTML = '<div class="tasks-loading">Загрузка актуальных заданий...</div>';
  try {
    const params = new URLSearchParams({
      role: state.currentRole || 'volunteer',
      user_id: state.currentUser.id,
    });
    const res = await fetch(`/api/tasks?${params.toString()}`, { headers: getAuthHeaders() });
    if (res.ok) {
      state.tasks = await res.json();
      renderTasks();
    } else {
      el.tasksList.innerHTML = '<div class="empty-state">Не удалось загрузить задачи</div>';
    }
  } catch (err) {
    console.error('Ошибка загрузки задач:', err);
    el.tasksList.innerHTML = '<div class="empty-state">Ошибка соединения с сервером</div>';
  }
}

// Отрисовка списка задач с учётом фильтра
function renderTasks() {
  let filtered = state.tasks;
  if (state.selectedFilter === 'urgent') {
    filtered = filtered.filter((t) => t.urgency_color === 'red');
  } else if (state.selectedFilter === 'in_progress') {
    filtered = filtered.filter((t) => t.status === 'in_progress');
  }

  el.tasksCountBadge.textContent = `${filtered.length} задач`;

  if (filtered.length === 0) {
    el.tasksList.innerHTML = `
      <div class="empty-state">
        <p>🎉 Нет активных заданий в этом разделе</p>
      </div>
    `;
    return;
  }

  el.tasksList.innerHTML = filtered.map((task) => renderTaskCard(task)).join('');
}

// Генерация HTML карточки задания
function renderTaskCard(task) {
  const urgencyLabels = {
    red: '🔴 Срочно',
    yellow: '🟡 Внимание',
    green: '🟢 Обычная',
  };

  const isInProgress = task.status === 'in_progress';

  const tagsHtml =
    task.tags && task.tags.length
      ? `<div class="task-tags-row">${task.tags.map((tag) => `<span class="task-tag">#${escapeHtml(tag)}</span>`).join('')}</div>`
      : '';

  const linksHtml =
    task.links && task.links.length
      ? `<div class="task-links-row">${task.links
          .map(
            (link) =>
              `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="task-link-item">🔗 ${escapeHtml(link)}</a>`
          )
          .join('')}</div>`
      : '';

  const imageHtml = task.image_url
    ? `<img src="${escapeHtml(task.image_url)}" alt="Фото задачи" class="task-img-preview" onclick="window.open('${escapeHtml(task.image_url)}', '_blank')">`
    : '';

  return `
    <div class="task-card" id="task_card_${task.id}">
      <div class="task-card-header">
        <h4 class="task-title">${escapeHtml(task.title)}</h4>
        <span class="urgency-badge ${task.urgency_color}">
          ${urgencyLabels[task.urgency_color] || '🟢 Обычная'}
        </span>
      </div>

      ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
      ${imageHtml}
      ${tagsHtml}
      ${linksHtml}

      <div class="task-actions-footer">
        <div class="task-status-btns">
          <button class="btn-status in-progress-btn ${isInProgress ? 'active' : ''}" onclick="updateTaskStatus(${task.id}, 'in_progress')">
            ${isInProgress ? '⏳ В работе' : 'Выполняется'}
          </button>
          <button class="btn-status completed-btn" onclick="updateTaskStatus(${task.id}, 'completed')">
            ✓ Выполнено
          </button>
        </div>
        <button class="btn-discuss" onclick="openDiscussion(${task.id}, '${escapeHtml(task.title)}')">
          💬 Вопрос
        </button>
      </div>
    </div>
  `;
}

// Смена статуса задачи ("Выполняется" / "Выполнено")
window.updateTaskStatus = async function (taskId, newStatus) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      // Обновляем задачи и прогресс-бары
      await Promise.all([loadTasks(), loadProgressBars()]);
    }
  } catch (err) {
    console.error('Ошибка обновления статуса:', err);
  }
};

// Загрузка списка пользователей для селекта назначения и управления тегами
async function loadUsers() {
  try {
    const res = await fetch('/api/users', { headers: getAuthHeaders() });
    if (res.ok) {
      state.users = await res.json();
      populateAssignUsersSelect();
    }
  } catch (err) {
    console.warn('Не удалось загрузить пользователей:', err);
  }
}

function populateAssignUsersSelect() {
  el.taskAssignUsers.innerHTML = state.users
    .map((u) => {
      const name = u.first_name || u.username || `User ${u.id}`;
      const tags = u.tags && u.tags.length ? ` [${u.tags.join(', ')}]` : '';
      return `<option value="${u.id}">${escapeHtml(name)}${tags}</option>`;
    })
    .join('');
}

// Открытие модалки создания задачи
function openCreateTaskModal() {
  el.createTaskModal.classList.remove('hidden');
  resetImageUpload();
  el.createTaskForm.reset();
  populateAssignUsersSelect();
}

// Обработка выбора изображения
function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  state.selectedFile = file;
  const reader = new FileReader();
  reader.onload = (event) => {
    el.imagePreview.src = event.target.result;
    el.uploadPlaceholder.classList.add('hidden');
    el.uploadPreviewBox.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function resetImageUpload() {
  state.selectedFile = null;
  el.imageInput.value = '';
  el.imagePreview.src = '';
  el.uploadPlaceholder.classList.remove('hidden');
  el.uploadPreviewBox.classList.add('hidden');
  el.uploadStatusText.classList.add('hidden');
  el.uploadStatusText.textContent = '';
}

// Создание задачи с загрузкой фото в Supabase Storage
async function handleCreateTaskSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('taskTitle').value.trim();
  const urgency = document.querySelector('input[name="urgency"]:checked').value;
  const description = document.getElementById('taskDescription').value.trim();
  const linksRaw = document.getElementById('taskLinks').value.trim();
  const tagsRaw = document.getElementById('taskTagsInput').value.trim();

  const links = linksRaw ? linksRaw.split(/[\s,]+/).filter(Boolean) : [];
  const tags = tagsRaw
    ? tagsRaw
        .split(/[\s,]+/)
        .map((t) => t.replace('#', ''))
        .filter(Boolean)
    : [];

  const selectedOptions = Array.from(el.taskAssignUsers.selectedOptions);
  const assigned_to = selectedOptions.map((opt) => parseInt(opt.value, 10));

  el.submitCreateTaskBtn.disabled = true;
  el.createBtnSpinner.classList.remove('hidden');

  let imageUrl = null;

  // 1. Загрузка фото в Supabase Storage через официальный JS клиент
  if (state.selectedFile && state.supabaseClient && state.supabaseConfig) {
    try {
      el.uploadStatusText.classList.remove('hidden');
      el.uploadStatusText.textContent = 'Загрузка фото в Supabase Storage...';

      const file = state.selectedFile;
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const bucketName = state.supabaseConfig.supabase_bucket || 'festival-tasks';

      const { data, error } = await state.supabaseClient.storage
        .from(bucketName)
        .upload(`tasks/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        console.error('Ошибка загрузки в Supabase Storage:', error);
        alert(`Ошибка загрузки фото в Supabase: ${error.message}`);
      } else {
        const { data: urlData } = state.supabaseClient.storage
          .from(bucketName)
          .getPublicUrl(`tasks/${fileName}`);
        imageUrl = urlData.publicUrl;
        console.log('Изображение успешно загружено в Supabase:', imageUrl);
      }
    } catch (err) {
      console.error('Исключение при загрузке фото:', err);
    }
  }

  // 2. Отправка задания на бэкенд FastAPI
  try {
    const payload = {
      title,
      description,
      urgency_color: urgency,
      links,
      image_url: imageUrl,
      assigned_to,
      tags,
    };

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      el.createTaskModal.classList.add('hidden');
      await Promise.all([loadTasks(), loadProgressBars()]);
    } else {
      const errData = await res.json();
      alert(`Ошибка создания задачи: ${errData.detail || 'Неизвестная ошибка'}`);
    }
  } catch (err) {
    console.error('Ошибка создания задачи:', err);
    alert('Не удалось связаться с сервером');
  } finally {
    el.submitCreateTaskBtn.disabled = false;
    el.createBtnSpinner.classList.add('hidden');
  }
}

// Модалка управления тегами волонтёров
function openTagManagerModal() {
  el.tagManagerModal.classList.remove('hidden');
  renderUsersTagList();
}

function renderUsersTagList() {
  if (!state.users || state.users.length === 0) {
    el.usersTagList.innerHTML = '<div class="empty-state">Нет зарегистрированных волонтёров</div>';
    return;
  }

  el.usersTagList.innerHTML = state.users
    .map((u) => {
      const name = u.first_name || u.username || `User ${u.id}`;
      const uname = u.username ? ` (@${u.username})` : '';
      const tagsStr = (u.tags || []).join(', ');

      return `
      <div class="user-tag-row" id="user_row_${u.id}">
        <div class="user-tag-header">
          <span class="user-name">${escapeHtml(name)}${escapeHtml(uname)}</span>
          <span class="count-tag">ID: ${u.id}</span>
        </div>
        <div class="user-tag-input-row">
          <input type="text" id="tags_input_${u.id}" value="${escapeHtml(tagsStr)}" placeholder="звук, одежда, журнал, сцена">
          <button class="btn-primary btn-save-tags" onclick="saveUserTags(${u.id})">Сохранить</button>
        </div>
      </div>
    `;
    })
    .join('');
}

window.saveUserTags = async function (userId) {
  const input = document.getElementById(`tags_input_${userId}`);
  if (!input) return;

  const rawTags = input.value;
  const tags = rawTags
    .split(/[\s,]+/)
    .map((t) => t.replace('#', '').trim())
    .filter(Boolean);

  try {
    const res = await fetch(`/api/users/${userId}/tags`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tags }),
    });

    if (res.ok) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      alert('Теги пользователя успешно обновлены');
      await loadUsers();
    }
  } catch (err) {
    console.error('Ошибка сохранения тегов:', err);
  }
};

// Создание прогресс-бара
async function handleCreateProgressBarSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('pbTitle').value.trim();
  const tagsRaw = document.getElementById('pbTags').value.trim();
  const target = parseInt(document.getElementById('pbTarget').value, 10) || 5;

  const tags = tagsRaw
    .split(/[\s,]+/)
    .map((t) => t.replace('#', '').trim())
    .filter(Boolean);

  try {
    const res = await fetch('/api/progress-bars', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, tags, target_count: target }),
    });

    if (res.ok) {
      el.createProgressBarModal.classList.add('hidden');
      el.createProgressBarForm.reset();
      await loadProgressBars();
    }
  } catch (err) {
    console.error('Ошибка создания прогресс-бара:', err);
  }
}

// Архив выполненных заданий
async function openArchiveModal() {
  el.archiveModal.classList.remove('hidden');
  el.archiveTasksList.innerHTML = '<div class="empty-state">Загрузка архива...</div>';

  try {
    const res = await fetch('/api/archive', { headers: getAuthHeaders() });
    if (res.ok) {
      const archived = await res.json();
      if (archived.length === 0) {
        el.archiveTasksList.innerHTML = '<div class="empty-state">Архив пуст</div>';
        return;
      }

      el.archiveTasksList.innerHTML = archived
        .map((task) => {
          const completedDate = task.completed_at
            ? new Date(task.completed_at).toLocaleString('ru-RU')
            : 'Недавно';

          return `
          <div class="archive-card">
            <div class="task-card-header">
              <h4 class="task-title">${escapeHtml(task.title)}</h4>
              <span class="archive-date">✓ Выполнено: ${completedDate}</span>
            </div>
            ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
            ${task.image_url ? `<img src="${escapeHtml(task.image_url)}" class="task-img-preview">` : ''}
          </div>
        `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Ошибка загрузки архива:', err);
  }
}

// Ветка обсуждения задания
window.openDiscussion = async function (taskId, title) {
  state.activeDiscussionTaskId = taskId;
  el.discussionTaskTitle.textContent = title;
  el.discussionModal.classList.remove('hidden');
  el.discussionInput.value = '';
  await loadDiscussionMessages(taskId);
};

async function loadDiscussionMessages(taskId) {
  el.discussionMessages.innerHTML = '<div class="chat-loading">Загрузка сообщений...</div>';

  try {
    const res = await fetch(`/api/tasks/${taskId}/messages`, { headers: getAuthHeaders() });
    if (res.ok) {
      const msgs = await res.json();
      if (msgs.length === 0) {
        el.discussionMessages.innerHTML = `
          <div class="empty-state" style="padding: 20px;">
            Сообщений пока нет. Напишите координаторам свой вопрос по заданию.
          </div>
        `;
        return;
      }

      el.discussionMessages.innerHTML = msgs
        .map((m) => {
          const isMine = m.user_id === state.currentUser.id;
          const time = new Date(m.created_at).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return `
          <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
            ${!isMine ? `<div class="chat-sender">${escapeHtml(m.username || 'Участник')}</div>` : ''}
            <div class="chat-text">${escapeHtml(m.text)}</div>
            <div class="chat-time">${time}</div>
          </div>
        `;
        })
        .join('');

      el.discussionMessages.scrollTop = el.discussionMessages.scrollHeight;
    }
  } catch (err) {
    console.error('Ошибка загрузки сообщений:', err);
  }
}

async function handleSendMessageSubmit(e) {
  e.preventDefault();
  const text = el.discussionInput.value.trim();
  if (!text || !state.activeDiscussionTaskId) return;

  try {
    const res = await fetch(`/api/tasks/${state.activeDiscussionTaskId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      el.discussionInput.value = '';
      await loadDiscussionMessages(state.activeDiscussionTaskId);
    }
  } catch (err) {
    console.error('Ошибка отправки сообщения:', err);
  }
}

// Утилита экранирования HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
