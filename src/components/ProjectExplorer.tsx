import React, { useState } from 'react';
import { FileCode, Copy, Check, Folder, Terminal, ExternalLink, ShieldCheck, Database, Server, Smartphone } from 'lucide-react';
import { projectFiles } from '../projectFiles';

export const ProjectExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState(projectFiles[0]);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'backend' | 'frontend' | 'deploy' | 'docs'>('all');

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFiles = projectFiles.filter(f => {
    const matchesCat = activeCategory === 'all' || f.category === activeCategory;
    const matchesSearch = f.path.toLowerCase().includes(searchQuery.toLowerCase()) || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#131722] border border-[#242b3d] p-3.5 rounded-xl">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
            <Server size={15} />
            <span>FastAPI & Python</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 mt-1">Асинхронный бэкенд</div>
          <p className="text-[11px] text-slate-400 mt-1">
            SQLAlchemy 2.0 + asyncpg, валидация initData по HMAC-SHA256, REST API.
          </p>
        </div>

        <div className="bg-[#131722] border border-[#242b3d] p-3.5 rounded-xl">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
            <Smartphone size={15} />
            <span>aiogram 3 Webhook</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 mt-1">Telegram Бот</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Команда /start с кнопкой WebApp, моментальные пуш-уведомления волонтёрам.
          </p>
        </div>

        <div className="bg-[#131722] border border-[#242b3d] p-3.5 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
            <Database size={15} />
            <span>PostgreSQL & Supabase</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 mt-1">Хранилище данных</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Реляционные данные в Postgres, фото напрямую в Supabase Storage через JS SDK.
          </p>
        </div>

        <div className="bg-[#131722] border border-[#242b3d] p-3.5 rounded-xl">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
            <ShieldCheck size={15} />
            <span>Render Deploy</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 mt-1">Готово к публикации</div>
          <p className="text-[11px] text-slate-400 mt-1">
            render.yaml, Dockerfile, requirements.txt, .env.example и RLS-политики.
          </p>
        </div>
      </div>

      {/* Code Browser Container */}
      <div className="bg-[#11141e] border border-[#23293c] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[580px]">
        {/* Left Sidebar: File Tree */}
        <div className="w-full md:w-72 bg-[#0e1119] border-r border-[#23293c] p-3 flex flex-col shrink-0">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Файлы проекта
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по файлам..."
            className="w-full bg-[#161a27] border border-[#252c40] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 mb-2 focus:outline-none focus:border-blue-500"
          />

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 mb-3">
            {(['all', 'backend', 'frontend', 'deploy', 'docs'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-[#181d2c] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredFiles.map(file => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/40'
                      : 'text-slate-400 hover:bg-[#161b29] hover:text-slate-200'
                  }`}
                >
                  <FileCode size={14} className={isSelected ? 'text-blue-400' : 'text-slate-500'} />
                  <span className="truncate flex-1">{file.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Editor Pane: Code Content */}
        <div className="flex-1 flex flex-col bg-[#0c0e15] overflow-hidden">
          {/* File Header */}
          <div className="px-4 py-3 bg-[#11141e] border-b border-[#23293c] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-sky-400 font-semibold bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">
                {selectedFile.language.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-slate-200 font-bold">{selectedFile.path}</span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#1a1f30] hover:bg-[#252c42] text-slate-200 border border-[#2b334a] transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>

          {/* Description bar */}
          <div className="px-4 py-2 bg-[#141824] border-b border-[#23293c] text-[11px] text-slate-400">
            💡 {selectedFile.description}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed text-slate-300 bg-[#0c0e15]">
            <pre className="whitespace-pre overflow-x-auto">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
