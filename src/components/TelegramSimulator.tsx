import React, { useState } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Tag,
  Archive,
  ArrowRight,
  Shield,
  User as UserIcon,
  X,
  Upload,
  Send,
  ExternalLink,
  RotateCcw,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { Task, ProgressBar, User, UserRole, UrgencyColor, Message } from '../types';

interface TelegramSimulatorProps {
  initialRole?: UserRole | null;
}

const INITIAL_USERS: User[] = [
  { id: 1001, username: 'alex_sound', first_name: 'Алексей (Звук)', role: 'volunteer', tags: ['звук', 'сцена'] },
  { id: 1002, username: 'elena_merch', first_name: 'Елена (Мерч)', role: 'volunteer', tags: ['одежда', 'мерч'] },
  { id: 1003, username: 'dmitry_media', first_name: 'Дмитрий (Пресса)', role: 'volunteer', tags: ['журнал', 'медиа'] },
  { id: 1004, username: 'olga_food', first_name: 'Ольга (Фуд-корт)', role: 'volunteer', tags: ['питание'] },
  { id: 1005, username: 'fest_boss', first_name: 'Иван Координатор', role: 'admin', tags: ['орг'] },
];

const INITIAL_PROGRESS_BARS: ProgressBar[] = [
  { id: 1, title: 'Монтаж Главной Сцены и Звука', tags: ['звук', 'сцена'], target_count: 4 },
  { id: 2, title: 'Подготовка мерча и формы волонтёров', tags: ['одежда', 'мерч'], target_count: 3 },
  { id: 3, title: 'Печать фестивального журнала и гида', tags: ['журнал'], target_count: 2 },
];

const INITIAL_TASKS: Task[] = [
  {
    id: 101,
    title: 'Проверить коммутацию микрофонов на Главной сцене',
    description: 'В 15:00 саундчек хедлайнера. Убедиться, что радиосистемы на частотах 520-560 МГц без помех.',
    urgency_color: 'red',
    links: ['https://festival.live/stage-schema.pdf'],
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    status: 'in_progress',
    assigned_to: [1001],
    tags: ['звук', 'сцена'],
    created_at: '2026-09-19T09:30:00Z',
  },
  {
    id: 102,
    title: 'Распаковать бейджи и форму для второй смены',
    description: 'Коробки у инфо-стойки №2. Разложить по размерам (S, M, L, XL) и выдать по списку.',
    urgency_color: 'yellow',
    links: ['https://festival.live/volunteers-list'],
    status: 'new',
    assigned_to: [1002],
    tags: ['одежда', 'мерч'],
    created_at: '2026-09-19T10:00:00Z',
  },
  {
    id: 103,
    title: 'Согласовать финальный тираж буклета фестиваля',
    description: 'Проверить расписание лектория на 3-й странице перед запуском в печать.',
    urgency_color: 'green',
    links: ['https://drive.google.com/festival-booklet'],
    status: 'new',
    assigned_to: [1003],
    tags: ['журнал'],
    created_at: '2026-09-19T10:45:00Z',
  },
];

const INITIAL_MESSAGES: Record<number, Message[]> = {
  101: [
    { id: 1, task_id: 101, user_id: 1005, username: 'fest_boss', text: 'Алексей, микрофон Shure Beta 58 лежит в кейсе А3', created_at: '10:15' },
    { id: 2, task_id: 101, user_id: 1001, username: 'alex_sound', text: 'Принял! Проверяю кабели и батарейки.', created_at: '10:20' },
  ],
};

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = () => {
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [progressBars, setProgressBars] = useState<ProgressBar[]>(INITIAL_PROGRESS_BARS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [messages, setMessages] = useState<Record<number, Message[]>>(INITIAL_MESSAGES);
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'in_progress'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isPbModalOpen, setIsPbModalOpen] = useState(false);

  // Discussion state
  const [activeDiscussionTask, setActiveDiscussionTask] = useState<Task | null>(null);
  const [newMessageText, setNewMessageText] = useState('');

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newUrgency, setNewUrgency] = useState<UrgencyColor>('green');
  const [newDesc, setNewDesc] = useState('');
  const [newLinks, setNewLinks] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newAssignedUsers, setNewAssignedUsers] = useState<number[]>([]);
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // New PB form
  const [newPbTitle, setNewPbTitle] = useState('');
  const [newPbTags, setNewPbTags] = useState('');
  const [newPbTarget, setNewPbTarget] = useState(5);

  // Notification popup simulator
  const [botNotification, setBotNotification] = useState<{ title: string; desc: string; urgency: string } | null>(null);

  // Handle password submit (1965 -> organizer, 19907 -> admin)
  const handlePasswordSubmit = () => {
    if (passwordInput === '19907') {
      setRole('admin');
      setIsPasswordModalOpen(false);
      setPasswordError(false);
      setPasswordInput('');
    } else if (passwordInput === '1965') {
      setRole('organizer');
      setIsPasswordModalOpen(false);
      setPasswordError(false);
      setPasswordInput('');
    } else {
      setPasswordError(true);
    }
  };

  // Change task status
  const updateTaskStatus = (taskId: number, newStatus: Task['status']) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  };

  // Calculate Progress Bars completion based on completed tasks matching tags
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const calculatedProgressBars = progressBars.map(pb => {
    const pbTags = new Set(pb.tags);
    const count = completedTasks.filter(t => t.tags.some(tag => pbTags.has(tag))).length;
    const target = Math.max(pb.target_count, 1);
    const percent = Math.min(100, Math.round((count / target) * 100));
    return {
      ...pb,
      completed_count: count,
      percent,
    };
  });

  // Filter tasks
  const visibleTasks = tasks.filter(t => {
    // Exclude completed from active board
    if (t.status === 'completed') return false;

    // Filter by role
    if (role === 'volunteer') {
      const isAssigned = t.assigned_to.includes(currentUser.id);
      const userTagSet = new Set(currentUser.tags);
      const hasTag = t.tags.some(tag => userTagSet.has(tag));
      const isGeneral = t.assigned_to.length === 0 && t.tags.length === 0;
      if (!isAssigned && !hasTag && !isGeneral) return false;
    }

    // Filter by tab
    if (activeFilter === 'urgent') return t.urgency_color === 'red';
    if (activeFilter === 'in_progress') return t.status === 'in_progress';
    return true;
  });

  // Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const parsedTags = newTags.split(/[\s,]+/).map(t => t.replace('#', '').trim()).filter(Boolean);
    const parsedLinks = newLinks.split(/[\s,]+/).map(l => l.trim()).filter(Boolean);

    const createdTask: Task = {
      id: Date.now(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      urgency_color: newUrgency,
      links: parsedLinks,
      image_url: newImageUrl || undefined,
      status: 'new',
      assigned_to: newAssignedUsers,
      tags: parsedTags,
      created_at: new Date().toISOString(),
    };

    setTasks(prev => [createdTask, ...prev]);

    // Trigger simulated Bot Notification
    setBotNotification({
      title: createdTask.title,
      desc: createdTask.description,
      urgency: createdTask.urgency_color,
    });
    setTimeout(() => setBotNotification(null), 5000);

    // Reset
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewLinks('');
    setNewTags('');
    setNewAssignedUsers([]);
    setNewImageUrl('');
  };

  // Simulated Supabase Upload
  const handlePhotoUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    // Simulating upload to Supabase Storage and generating public URL
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewImageUrl(event.target?.result as string);
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    }, 800);
  };

  // Add Message to task thread
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeDiscussionTask) return;

    const newMsg: Message = {
      id: Date.now(),
      task_id: activeDiscussionTask.id,
      user_id: currentUser.id,
      username: currentUser.username,
      text: newMessageText.trim(),
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => ({
      ...prev,
      [activeDiscussionTask.id]: [...(prev[activeDiscussionTask.id] || []), newMsg],
    }));
    setNewMessageText('');
  };

  // Update user tags
  const handleUpdateUserTags = (userId: number, tagsStr: string) => {
    const parsed = tagsStr.split(/[\s,]+/).map(t => t.replace('#', '').trim()).filter(Boolean);
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, tags: parsed } : u)));
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, tags: parsed }));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto p-2 sm:p-4">
      {/* Left Column: Telegram WebApp Window Container */}
      <div className="w-full lg:w-[480px] shrink-0 mx-auto">
        {/* Telegram App Frame Header */}
        <div className="bg-[#17212b] border border-[#242f3d] rounded-t-2xl p-3 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#2b5278] text-[#64b5f6]">
              Telegram Mini App
            </span>
            <span className="text-xs text-slate-300 font-medium truncate max-w-[170px]">
              @{currentUser.username}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>Bot Webhook Active</span>
          </div>
        </div>

        {/* Telegram Phone Viewport */}
        <div className="bg-[#0d0f15] text-[#f8fafc] border-x border-b border-[#242f3d] rounded-b-2xl min-h-[640px] flex flex-col relative overflow-hidden shadow-2xl">
          {/* Bot Notification Banner (Animated) */}
          {botNotification && (
            <div className="absolute top-2 left-2 right-2 z-50 bg-[#1e293b] border border-[#3b82f6] p-3 rounded-xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-3">
              <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <span>🤖 Бот прислал уведомление!</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400">
                    {botNotification.urgency === 'red' ? '🔴 Срочно' : 'Новое'}
                  </span>
                </div>
                <div className="text-slate-300 font-medium mt-0.5">{botNotification.title}</div>
              </div>
              <button onClick={() => setBotNotification(null)} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {/* WebApp Top Bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#11141e]/90 backdrop-blur-md border-b border-[#222738]">
            <div>
              <div className="text-[10px] tracking-wider font-bold text-sky-400">FESTIVAL 2026</div>
              <div className="text-sm font-bold text-slate-100">
                {role === 'admin'
                  ? 'Главный Администратор'
                  : role === 'organizer'
                  ? 'Панель Организатора'
                  : role === 'volunteer'
                  ? 'Задачи Волонтёра'
                  : 'Фестивальные задачи'}
              </div>
            </div>

            {role && (
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    role === 'admin'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : role === 'organizer'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {role === 'admin' ? 'Админ' : role === 'organizer' ? 'Орг' : 'Волонтёр'}
                </span>
                <button
                  onClick={() => setRole(null)}
                  title="Сменить роль"
                  className="p-1.5 rounded-md bg-[#1a1e2b] hover:bg-[#252b3d] text-slate-300 border border-[#2a3045] transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            )}
          </header>

          {/* SCREEN 1: ROLE SELECTION */}
          {!role && (
            <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 mb-4">
                🎪
              </div>
              <h2 className="text-xl font-bold text-slate-100">Выберите вашу роль</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Система координации и распределения задач фестиваля
              </p>

              <div className="w-full mt-6 space-y-3">
                <button
                  onClick={() => setRole('volunteer')}
                  className="w-full text-left p-4 rounded-xl bg-[#151924] hover:bg-[#1c2232] border border-[#262e44] transition-all flex items-center gap-3.5 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center text-xl shrink-0">
                    🤝
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 transition-colors">
                      Волонтёр
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      Задачи по тегам {currentUser.tags.map(t => `#${t}`).join(' ')}
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full text-left p-4 rounded-xl bg-[#151924] hover:bg-[#1c2232] border border-[#262e44] transition-all flex items-center gap-3.5 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-xl shrink-0">
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-100 group-hover:text-amber-400 transition-colors">
                      Организатор / Администратор
                    </div>
                    <div className="text-xs text-slate-400">
                      Вход по кодам доступа (1965 / 19907)
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#151924] border border-[#242b3d] text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Вход: {currentUser.first_name}</span>
              </div>
            </div>
          )}

          {/* SCREEN 2: MAIN TASKS DASHBOARD */}
          {role && (
            <div className="flex-1 p-3 overflow-y-auto space-y-4">
              {/* Progress Bars Section */}
              <div className="bg-[#141824] border border-[#22283a] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>📊 Прогресс фестиваля</span>
                  </div>
                  {role === 'admin' && (
                    <button
                      onClick={() => setIsPbModalOpen(true)}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                    >
                      + Создать цель
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {calculatedProgressBars.map(pb => (
                    <div key={pb.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">
                          {pb.title}{' '}
                          <span className="text-[10px] text-slate-400">
                            ({pb.tags.map(t => `#${t}`).join(', ')})
                          </span>
                        </span>
                        <span className="font-bold text-sky-400">
                          {pb.completed_count}/{pb.target_count} ({pb.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#1f2538] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 rounded-full"
                          style={{ width: `${pb.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Toolbar (Only for admin) */}
              {role === 'admin' && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition-colors"
                  >
                    <Plus size={14} /> Новое задание
                  </button>
                  <button
                    onClick={() => setIsTagModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#161a27] hover:bg-[#1f2436] text-slate-200 border border-[#262c42] rounded-xl text-xs font-medium transition-colors"
                  >
                    <Tag size={13} /> Теги волонтёров
                  </button>
                  <button
                    onClick={() => setIsArchiveModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#161a27] hover:bg-[#1f2436] text-slate-200 border border-[#262c42] rounded-xl text-xs font-medium transition-colors"
                  >
                    <Archive size={13} /> Архив ({completedTasks.length})
                  </button>
                </div>
              )}

              {/* Organizer Archive Quick View */}
              {role === 'organizer' && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsArchiveModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-[#161a27] px-3 py-1.5 rounded-lg border border-[#242a3e]"
                  >
                    <Archive size={13} /> Просмотр архива ({completedTasks.length})
                  </button>
                </div>
              )}

              {/* Filters */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1.5 bg-[#141824] p-1 rounded-lg border border-[#22283a]">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeFilter === 'all'
                        ? 'bg-slate-200 text-slate-900 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Все
                  </button>
                  <button
                    onClick={() => setActiveFilter('urgent')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeFilter === 'urgent'
                        ? 'bg-red-500/20 text-red-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔴 Срочные
                  </button>
                  <button
                    onClick={() => setActiveFilter('in_progress')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeFilter === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    В работе
                  </button>
                </div>
                <span className="text-xs text-slate-500">{visibleTasks.length} задач</span>
              </div>

              {/* Task Cards List */}
              <div className="space-y-3 pb-8">
                {visibleTasks.length === 0 ? (
                  <div className="text-center py-10 bg-[#141824] rounded-xl border border-[#22283a] text-slate-400 text-xs">
                    🎉 Нет активных задач по заданным критериям
                  </div>
                ) : (
                  visibleTasks.map(task => {
                    const taskMsgCount = (messages[task.id] || []).length;
                    const urgencyBadge = {
                      red: { text: '🔴 Срочно', border: 'border-red-500/30', bg: 'bg-red-500/15', color: 'text-red-400' },
                      yellow: { text: '🟡 Внимание', border: 'border-amber-500/30', bg: 'bg-amber-500/15', color: 'text-amber-400' },
                      green: { text: '🟢 Обычная', border: 'border-emerald-500/30', bg: 'bg-emerald-500/15', color: 'text-emerald-400' },
                    }[task.urgency_color];

                    return (
                      <div
                        key={task.id}
                        className="bg-[#141824] border border-[#242b3d] rounded-xl p-3.5 space-y-2.5 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-100 leading-snug">
                            {task.title}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${urgencyBadge.bg} ${urgencyBadge.border} ${urgencyBadge.color}`}
                          >
                            {urgencyBadge.text}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                            {task.description}
                          </p>
                        )}

                        {task.image_url && (
                          <div className="rounded-lg overflow-hidden border border-[#283046]">
                            <img
                              src={task.image_url}
                              alt="Фото задачи (Supabase)"
                              className="w-full max-h-48 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => window.open(task.image_url, '_blank')}
                            />
                          </div>
                        )}

                        {/* Tags */}
                        {task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map(tag => (
                              <span
                                key={tag}
                                className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#1e2436] text-slate-300"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Links */}
                        {task.links && task.links.length > 0 && (
                          <div className="space-y-1">
                            {task.links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 truncate"
                              >
                                <ExternalLink size={11} /> {link}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-[#22283a] flex items-center gap-2">
                          <button
                            onClick={() => updateTaskStatus(task.id, 'in_progress')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                              task.status === 'in_progress'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-[#1b2131] text-slate-300 hover:bg-[#232a3f] border border-[#283149]'
                            }`}
                          >
                            <Clock size={12} />
                            {task.status === 'in_progress' ? 'В работе' : 'Выполняется'}
                          </button>

                          <button
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 size={12} /> Выполнено
                          </button>

                          <button
                            onClick={() => setActiveDiscussionTask(task)}
                            className="py-1.5 px-2.5 rounded-lg text-xs font-medium bg-[#1b2131] hover:bg-[#232a3f] text-slate-200 border border-[#283149] transition-colors flex items-center gap-1"
                          >
                            <MessageSquare size={12} />
                            <span>Чат</span>
                            {taskMsgCount > 0 && (
                              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                                {taskMsgCount}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Simulator Switcher, Role Info & Quick Action Tools */}
      <div className="flex-1 space-y-4">
        {/* Interactive Testing Control Box */}
        <div className="bg-[#141722] border border-[#252a3d] rounded-xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#252a3d] pb-3">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-sky-400" />
              <h3 className="text-sm font-bold text-slate-100">Тестирование сценариев Web App</h3>
            </div>
            <span className="text-[11px] text-slate-400">Telegram WebApp SDK Emulation</span>
          </div>

          {/* Switch Active Telegram User */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Переключить аккаунт Telegram волонтёра:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setCurrentUser(u)}
                  className={`p-2 rounded-lg text-left text-xs transition-all border ${
                    currentUser.id === u.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-[#0f121a] border-[#222738] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="truncate font-medium text-slate-200">{u.first_name}</div>
                  <div className="text-[10px] text-slate-500">@{u.username}</div>
                  <div className="text-[9px] text-sky-400 truncate mt-0.5">
                    {u.tags.map(t => `#${t}`).join(' ')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Password Quick Hints */}
          <div className="bg-[#0f121a] border border-[#222738] rounded-lg p-3 space-y-2 text-xs">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Shield size={14} className="text-amber-400" />
              <span>Пароли доступа для роли «Организатор»:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div className="bg-[#181d2c] p-2 rounded border border-[#262c42]">
                <div className="font-bold text-amber-300">Пароль: 1965</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Панель организатора: просмотр всех заданий, изменение статусов, чат.
                </div>
              </div>
              <div className="bg-[#181d2c] p-2 rounded border border-[#262c42]">
                <div className="font-bold text-red-300">Пароль: 19907</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Главный администратор: создание задач, загрузка в Supabase, теги, цели, архив.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#141722] border border-[#252a3d] p-3 rounded-xl">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>🪣 Supabase Storage</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Фронтенд загружает фото напрямую через CDN-клиент @supabase/supabase-js. В БД пишется только публичный URL.
            </p>
          </div>

          <div className="bg-[#141722] border border-[#252a3d] p-3 rounded-xl">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>⚡ Webhook aiogram 3</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Бот слушает /webhook на FastAPI. Гарантирует пробуждение бесплатного тарифа Render и отправку уведомлений.
            </p>
          </div>

          <div className="bg-[#141722] border border-[#252a3d] p-3 rounded-xl">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>🏷️ Теги и Прогресс</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Прогресс-бары динамически суммируют выполнение задач по привязанным тегам (#звук, #одежда, #сцена).
            </p>
          </div>
        </div>
      </div>

      {/* --- MODAL: PASSWORD PROMPT --- */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141722] border border-[#2a3045] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-100">Вход для организаторов</h3>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordError(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Введите пароль для организатора (1965) или главного администратора (19907):
            </p>

            <div className="space-y-2">
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Код доступа"
                className="w-full bg-[#0d0f15] border border-[#2a3045] rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
              {passwordError && (
                <p className="text-xs text-red-400">Неверный пароль доступа</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPasswordInput('1965')}
                className="text-[11px] py-1 px-2 rounded bg-[#1e2436] text-amber-300 hover:bg-[#283149]"
              >
                Подставить 1965
              </button>
              <button
                onClick={() => setPasswordInput('19907')}
                className="text-[11px] py-1 px-2 rounded bg-[#1e2436] text-red-300 hover:bg-[#283149]"
              >
                Подставить 19907
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordError(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-[#1e2436] hover:bg-[#283149]"
              >
                Отмена
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE TASK (ADMIN) --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141722] border border-[#2a3045] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3045] pb-3">
              <h3 className="font-bold text-base text-slate-100">Новое фестивальное задание</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Название задания *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Например: Проверить коммутацию микрофонов на сцене"
                  className="w-full bg-[#0d0f15] border border-[#2a3045] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Маркер срочности *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['red', 'yellow', 'green'] as UrgencyColor[]).map(c => {
                    const label = { red: '🔴 Срочно', yellow: '🟡 Внимание', green: '🟢 Обычная' }[c];
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setNewUrgency(c)}
                        className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                          newUrgency === c
                            ? 'bg-[#1e2436] border-slate-200 text-white'
                            : 'bg-[#0d0f15] border-[#2a3045] text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Описание задания</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Детальные инструкции, время, контакты ответственных..."
                  className="w-full bg-[#0d0f15] border border-[#2a3045] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              {/* Supabase Storage Image Upload */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-200">
                  Фото карточки (Загрузка в Supabase Storage)
                </label>
                <div className="border-2 border-dashed border-[#2a3045] hover:border-[#3b82f6] rounded-xl p-3 text-center bg-[#0d0f15] relative transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUploadSim}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {isUploadingPhoto ? (
                    <div className="py-3 text-sky-400">Загрузка в Supabase Storage...</div>
                  ) : newImageUrl ? (
                    <div className="relative">
                      <img src={newImageUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewImageUrl('');
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="py-2 text-slate-400 flex flex-col items-center gap-1">
                      <Upload size={18} className="text-slate-400" />
                      <span>Нажмите для выбора файла с устройства</span>
                      <span className="text-[10px] text-slate-500">
                        Файл загрузится в Supabase Storage бакет festival-tasks
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Теги задания (через запятую)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="звук, сцена, одежда, журнал"
                  className="w-full bg-[#0d0f15] border border-[#2a3045] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Назначить конкретным волонтёрам</label>
                <div className="flex flex-wrap gap-1.5">
                  {users.map(u => {
                    const isSelected = newAssignedUsers.includes(u.id);
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => {
                          setNewAssignedUsers(prev =>
                            isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white font-medium'
                            : 'bg-[#0d0f15] border-[#2a3045] text-slate-300'
                        }`}
                      >
                        {u.first_name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Полезные ссылки</label>
                <input
                  type="text"
                  value={newLinks}
                  onChange={e => setNewLinks(e.target.value)}
                  placeholder="https://festival.live/schema"
                  className="w-full bg-[#0d0f15] border border-[#2a3045] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2a3045]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-[#1e2436] hover:bg-[#283149]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Создать и отправить ботом
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: TAG MANAGER --- */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141722] border border-[#2a3045] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3045] pb-3">
              <h3 className="font-bold text-base text-slate-100">🏷️ Теги волонтёров</h3>
              <button onClick={() => setIsTagModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Присваивайте теги (например, «звук», «одежда», «журнал»), чтобы группировать волонтёров и распределять задачи:
            </p>

            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-[#0d0f15] border border-[#242b3d] p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{u.first_name}</span>
                    <span className="text-[10px] text-slate-500">ID: {u.id}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={u.tags.join(', ')}
                      id={`tag_input_${u.id}`}
                      className="flex-1 bg-[#151924] border border-[#2a3045] rounded-lg px-2.5 py-1 text-xs text-slate-100"
                      placeholder="звук, одежда, журнал"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`tag_input_${u.id}`) as HTMLInputElement;
                        if (input) handleUpdateUserTags(u.id, input.value);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE PROGRESS BAR --- */}
      {isPbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141722] border border-[#2a3045] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-100">Создать прогресс-бар</h3>
              <button onClick={() => setIsPbModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Название цели фестиваля *</label>
                <input
                  type="text"
                  value={newPbTitle}
                  onChange={e => setNewPbTitle(e.target.value)}
                  placeholder="Например: Монтаж освещения"
                  className="w-full bg-[#0d0f15] border border-[#2a3045] rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Связанные теги *</label>
                <input
                  type="text"
                  value={newPbTags}
                  onChange={e => setNewPbTags(e.target.value)}
                  placeholder="сцена, звук"
                  className="w-full bg-[#0d0f15] border border-[#2a3045] rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200">Целевое количество выполненных задач *</label>
                <input
                  type="number"
                  min={1}
                  value={newPbTarget}
                  onChange={e => setNewPbTarget(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-[#0d0f15] border border-[#2a3045] rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPbModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-[#1e2436]"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPbTitle.trim()) return;
                    const parsed = newPbTags.split(/[\s,]+/).map(t => t.replace('#', '').trim()).filter(Boolean);
                    setProgressBars(prev => [
                      ...prev,
                      { id: Date.now(), title: newPbTitle.trim(), tags: parsed, target_count: newPbTarget },
                    ]);
                    setIsPbModalOpen(false);
                    setNewPbTitle('');
                    setNewPbTags('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ARCHIVE --- */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141722] border border-[#2a3045] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3045] pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Archive size={18} className="text-emerald-400" />
                <span>Архив выполненных заданий</span>
              </h3>
              <button onClick={() => setIsArchiveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {completedTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                В архиве пока нет завершённых заданий
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.map(task => (
                  <div key={task.id} className="bg-[#0d0f15] border border-[#22283a] p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-100">{task.title}</h5>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} /> Выполнено
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-400">{task.description}</p>
                    )}
                    {task.image_url && (
                      <img src={task.image_url} alt="" className="max-h-24 rounded-lg object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: TASK DISCUSSION (CHAT) --- */}
      {activeDiscussionTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141722] border border-[#2a3045] rounded-2xl w-full max-w-md h-[540px] flex flex-col shadow-2xl overflow-hidden">
            {/* Chat Header */}
            <div className="p-3.5 border-b border-[#252b3d] flex items-center justify-between bg-[#11141e]">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Обсуждение задания</div>
                <div className="text-xs font-bold text-slate-100 truncate max-w-[260px]">
                  {activeDiscussionTask.title}
                </div>
              </div>
              <button onClick={() => setActiveDiscussionTask(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
              {!(messages[activeDiscussionTask.id]?.length) ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  Сообщений пока нет. Напишите координаторам свой вопрос по заданию.
                </div>
              ) : (
                messages[activeDiscussionTask.id].map(m => {
                  const isMine = m.user_id === currentUser.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${isMine ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      {!isMine && (
                        <span className="text-[10px] font-bold text-sky-400 mb-0.5 ml-1">
                          @{m.username}
                        </span>
                      )}
                      <div
                        className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-[#1b2131] text-slate-200 border border-[#262e44] rounded-bl-xs'
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 px-1">{m.created_at}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Send Input */}
            <form onSubmit={handleSendMessage} className="p-2.5 border-t border-[#252b3d] bg-[#11141e] flex items-center gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={e => setNewMessageText(e.target.value)}
                placeholder="Написать сообщение координаторам..."
                className="flex-1 bg-[#0d0f15] border border-[#252b3d] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
