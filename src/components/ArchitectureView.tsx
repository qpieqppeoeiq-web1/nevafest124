import React from 'react';
import { Server, Database, Smartphone, ShieldCheck, ArrowRight, Upload, Bell, CheckCircle2, Key } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      {/* Visual System Architecture Diagram */}
      <div className="bg-[#121622] border border-[#232a3d] rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>🎪 Архитектура Festival Telegram Web App</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Сквозной процесс взаимодействия бота, веб-приложения, FastAPI, PostgreSQL и Supabase Storage.
          </p>
        </div>

        {/* Step-by-Step Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Telegram Bot */}
          <div className="bg-[#161a28] border border-[#273046] p-4 rounded-xl space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              1
            </div>
            <h4 className="font-bold text-sm text-slate-100">Telegram Bot (aiogram 3)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Пользователь пишет <code>/start</code>. Бот регистрирует или обновляет его профиль в PostgreSQL и отправляет кнопку <code className="text-sky-300">InlineKeyboardButton(web_app=...)</code>.
            </p>
            <div className="text-[11px] text-slate-400 bg-[#0e111a] p-2.5 rounded-lg border border-[#21283c]">
              ⚡ Работает по <b>Webhook</b> (экономия ресурсов, пробуждение Render из спящего режима).
            </div>
          </div>

          {/* Card 2: WebApp Frontend */}
          <div className="bg-[#161a28] border border-[#273046] p-4 rounded-xl space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              2
            </div>
            <h4 className="font-bold text-sm text-slate-100">Telegram Web App</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Приложение валидирует <code>initData</code>, предлагает выбор роли. Пароль <b>1965</b> открывает панель организатора, <b>19907</b> — админа.
            </p>
            <div className="text-[11px] text-slate-400 bg-[#0e111a] p-2.5 rounded-lg border border-[#21283c]">
              📷 <b>Supabase JS SDK</b> загружает фото прямо с телефона, возвращая <code>publicUrl</code>.
            </div>
          </div>

          {/* Card 3: Backend & DB */}
          <div className="bg-[#161a28] border border-[#273046] p-4 rounded-xl space-y-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              3
            </div>
            <h4 className="font-bold text-sm text-slate-100">FastAPI & PostgreSQL</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Сохраняет задания, ветки сообщений, теги и цели. При создании задачи асинхронно рассылает пуш-уведомления назначенным волонтёрам.
            </p>
            <div className="text-[11px] text-slate-400 bg-[#0e111a] p-2.5 rounded-lg border border-[#21283c]">
              📊 Прогресс-бары рассчитываются в реальном времени по выполненным задачам.
            </div>
          </div>
        </div>

        {/* Supabase Storage Integration Scheme */}
        <div className="bg-[#0f121a] border border-[#242c40] rounded-xl p-5 space-y-3">
          <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Upload size={16} className="text-sky-400" />
            <span>Интеграция Supabase Storage (без Base64)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="space-y-1.5 bg-[#141824] p-3 rounded-lg border border-[#22283a]">
              <div className="font-semibold text-slate-200">1. Загрузка с фронтенда:</div>
              <p className="text-slate-400">
                Телефон отправляет бинарный файл напрямую в хранилище Supabase через CDN-клиент:
              </p>
              <pre className="bg-[#0c0e15] p-2 rounded text-[11px] text-emerald-400 overflow-x-auto">
{`const { data } = await supabase.storage
  .from('festival-tasks')
  .upload(\`tasks/\${fileName}\`, file);`}
              </pre>
            </div>

            <div className="space-y-1.5 bg-[#141824] p-3 rounded-lg border border-[#22283a]">
              <div className="font-semibold text-slate-200">2. Сохранение URL в PostgreSQL:</div>
              <p className="text-slate-400">
                Бэкенд сохраняет только легковесную строковую ссылку на изображение:
              </p>
              <pre className="bg-[#0c0e15] p-2 rounded text-[11px] text-sky-400 overflow-x-auto">
{`const { data: urlData } = supabase.storage
  .from('festival-tasks')
  .getPublicUrl(\`tasks/\${fileName}\`);
// URL передаётся в POST /api/tasks`}
              </pre>
            </div>
          </div>
        </div>

        {/* Deploy Checklist */}
        <div className="bg-[#0f121a] border border-[#242c40] rounded-xl p-5 space-y-3">
          <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Чек-лист для публикации на Render</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Создать бота в @BotFather и получить BOT_TOKEN</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Создать PostgreSQL базу на Render или Supabase</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Применить SQL-политику RLS для бакета festival-tasks</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Задать переменные ORGANIZER_PASSWORD=1965, ADMIN_PASSWORD=19907</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
