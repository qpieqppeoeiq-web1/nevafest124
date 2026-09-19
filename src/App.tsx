import React, { useState } from 'react';
import { Smartphone, FolderCode, Layers, Github, ExternalLink, Sparkles } from 'lucide-react';
import { TelegramSimulator } from './components/TelegramSimulator';
import { ProjectExplorer } from './components/ProjectExplorer';
import { ArchitectureView } from './components/ArchitectureView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'files' | 'architecture'>('simulator');

  return (
    <div className="min-h-screen bg-[#0a0c12] text-[#f8fafc] flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Global Bar */}
      <header className="sticky top-0 z-40 bg-[#0f121a]/95 backdrop-blur-md border-b border-[#1f2537] px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
              🎪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">
                  Festival Task Manager
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Telegram Mini App
                </span>
              </div>
              <p className="text-xs text-slate-400">
                FastAPI • aiogram 3 (Webhook) • PostgreSQL • Supabase Storage
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-[#141724] p-1 rounded-xl border border-[#242b3d]">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1f30]'
              }`}
            >
              <Smartphone size={14} />
              <span>Web App (Симулятор)</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'files'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1f30]'
              }`}
            >
              <FolderCode size={14} />
              <span>Файлы проекта</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'architecture'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1f30]'
              }`}
            >
              <Layers size={14} />
              <span>Архитектура</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-4 sm:py-6">
        {activeTab === 'simulator' && <TelegramSimulator />}
        {activeTab === 'files' && <ProjectExplorer />}
        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Footer info */}
      <footer className="border-t border-[#1a1f2e] bg-[#0b0d14] py-3 text-center text-xs text-slate-500">
        Telegram Web App • Координация фестиваля • Роли: Волонтёр | Организатор (1965) | Главный админ (19907)
      </footer>
    </div>
  );
}
