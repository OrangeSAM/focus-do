'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────
type Priority = 'high' | 'mid' | 'low';

interface Todo {
  id: number;
  text: string;
  category: string;
  priority: Priority;
  done: boolean;
  today: boolean;
  due: string | null;
}

interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  categories: string[];
  todos: Todo[];
}

// ── Design tokens ─────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  high: { label: '紧急', color: '#dc2626', bg: '#fef2f2', dot: '#dc2626' },
  mid:  { label: '重要', color: '#b45309', bg: '#fffbeb', dot: '#b45309' },
  low:  { label: '日常', color: '#6b5e54', bg: '#f5f0eb', dot: '#a89e94' },
};

const PROJECT_COLORS: Record<string, { accent: string; bg: string; border: string; light: string }> = {
  invest: { accent: '#4338ca', bg: '#e8ecfd', border: '#a5b4fc', light: '#dbeafe' },
  work:   { accent: '#0369a1', bg: '#cce8f7', border: '#7dd3fc', light: '#bae6fd' },
  life:   { accent: '#15803d', bg: '#c6f4d5', border: '#6ee7a0', light: '#a7f3d0' },
};

// ── Initial data ──────────────────────────────────────────
const initialProjects: Project[] = [
  {
    id: 'invest', name: '投资交易', color: '#4338ca', icon: '📈',
    categories: ['研究', '执行', '复盘'],
    todos: [
      { id: 1,  text: '研究比亚迪 Q3 财报',    category: '研究', priority: 'high', done: false, today: true,  due: '2024-12-20' },
      { id: 2,  text: '止盈 ETF 仓位',          category: '执行', priority: 'high', done: false, today: true,  due: null },
      { id: 3,  text: '上月交易复盘总结',        category: '复盘', priority: 'mid',  done: true,  today: false, due: null },
      { id: 13, text: '关注美联储议息会议',      category: '研究', priority: 'mid',  done: false, today: false, due: '2024-12-18' },
      { id: 14, text: '调整仓位配比',            category: '执行', priority: 'low',  done: false, today: false, due: null },
    ],
  },
  {
    id: 'work', name: '工作项目', color: '#0369a1', icon: '💼',
    categories: ['开发', '设计', '沟通'],
    todos: [
      { id: 4,  text: '完成首页重构 PR',         category: '开发', priority: 'high', done: false, today: true,  due: '2024-12-19' },
      { id: 5,  text: '与设计师对齐交互稿',      category: '沟通', priority: 'mid',  done: false, today: false, due: null },
      { id: 6,  text: '修复移动端布局 bug',      category: '开发', priority: 'high', done: true,  today: false, due: null },
      { id: 15, text: '更新组件文档',             category: '设计', priority: 'low',  done: false, today: false, due: null },
    ],
  },
  {
    id: 'life', name: '生活健康', color: '#15803d', icon: '🌿',
    categories: ['运动', '饮食', '学习'],
    todos: [
      { id: 7,  text: '跑步 5km',                category: '运动', priority: 'mid',  done: true,  today: true,  due: null },
      { id: 8,  text: '预约体检',                 category: '饮食', priority: 'high', done: false, today: false, due: '2024-12-25' },
      { id: 9,  text: '读《原则》第三章',         category: '学习', priority: 'low',  done: false, today: false, due: null },
      { id: 16, text: '冥想 10 分钟',             category: '运动', priority: 'low',  done: false, today: true,  due: null },
    ],
  },
];

let nextId = 20;

// ── Utility ───────────────────────────────────────────────
function formatDue(due: string | null): { text: string; color: string } | null {
  if (!due) return null;
  const d = new Date(due);
  const today = new Date(new Date().toDateString());
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { text: `逾期${-diff}天`, color: '#c45d4a' };
  if (diff === 0) return { text: '今天', color: '#b8860b' };
  if (diff === 1) return { text: '明天', color: '#b8860b' };
  if (diff <= 7)  return { text: `${diff}天后`, color: '#8a7e74' };
  return { text: `${diff}天后`, color: '#c4bab0' };
}

// ── SVG Checkmark ─────────────────────────────────────────
function Checkmark({ checked, color }: { checked: boolean; color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <circle cx="8" cy="8" r="7" stroke={checked ? color : '#d5d0ed'} strokeWidth="1.5" fill={checked ? color : 'transparent'} style={{ transition: 'all 0.25s ease' }} />
      {checked && (
        <path d="M5 8.5L7 10.5L11 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 24, strokeDashoffset: checked ? 0 : 24, animation: checked ? 'checkmark 0.3s ease forwards' : 'none' }} />
      )}
    </svg>
  );
}

// ── Progress Ring ─────────────────────────────────────────
function ProgressRing({ todos, color }: { todos: Todo[]; color: string }) {
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e8e0d8" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div style={{ fontSize: 11, color: '#8a7e74', lineHeight: 1.4 }}>
        <div style={{ fontWeight: 600, color: '#2c2420', fontSize: 13 }}>{pct}%</div>
        <div>{done}/{total} 完成</div>
      </div>
    </div>
  );
}

// ── Todo Card ─────────────────────────────────────────────
function TodoCard({ todo, accentColor, projectConfig, onToggle, onToggleToday, onDelete, index }: {
  todo: Todo; accentColor: string; projectConfig: { accent: string; bg: string; border: string; light: string };
  onToggle: (id: number) => void; onToggleToday: (id: number) => void; onDelete: (id: number) => void;
  index: number;
}) {
  const [hover, setHover] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const due = formatDue(todo.due);
  const pc = PRIORITY_CONFIG[todo.priority];

  const handleToggle = () => {
    if (!todo.done) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 600);
    }
    onToggle(todo.id);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="animate-fade-in-up"
      style={{
        background: todo.done ? '#faf7f3' : 'var(--bg-card)',
        border: `1px solid ${hover ? projectConfig.border : 'var(--border-light)'}`,
        borderLeft: `3px solid ${todo.done ? 'var(--border)' : accentColor}`,
        borderRadius: 'var(--radius)',
        padding: '14px 16px 14px 18px',
        marginBottom: 8,
        cursor: 'default',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        opacity: todo.done ? 0.55 : 1,
        position: 'relative',
        animationDelay: `${index * 0.04}s`,
      }}
    >
      {/* Confetti burst on complete */}
      {justCompleted && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 40, height: 40, borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
          animation: 'confettiBurst 0.6s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          aria-label={todo.done ? '标记为未完成' : '标记为已完成'}
          style={{
            background: 'none', border: 'none', padding: 2, cursor: 'pointer',
            marginTop: 1, flexShrink: 0, lineHeight: 0,
            transform: hover ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.2s ease',
          }}
        >
          <Checkmark checked={todo.done} color={accentColor} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 500, lineHeight: 1.5,
            color: todo.done ? 'var(--ink-faint)' : 'var(--ink)',
            textDecoration: todo.done ? 'line-through' : 'none',
            letterSpacing: '-0.01em',
          }}>
            {todo.text}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {/* Priority dot */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, padding: '2px 8px', borderRadius: 99,
              background: pc.bg, color: pc.color, fontWeight: 600,
              letterSpacing: '0.02em',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
              {pc.label}
            </span>

            {/* Category */}
            <span style={{
              fontSize: 10, color: 'var(--ink-faint)',
              padding: '2px 6px', borderRadius: 99,
              background: projectConfig.bg,
              fontWeight: 500,
            }}>
              {todo.category}
            </span>

            {/* Due date */}
            {due && (
              <span style={{
                fontSize: 10, color: due.color, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {due.text}
              </span>
            )}

            {/* Today badge */}
            {todo.today && !todo.done && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em',
                color: accentColor, padding: '2px 7px', borderRadius: 99,
                background: projectConfig.light,
              }}>
                TODAY
              </span>
            )}
          </div>
        </div>

        {/* Hover actions */}
        <div style={{
          display: 'flex', gap: 4, flexShrink: 0,
          opacity: hover ? 1 : 0, transition: 'opacity 0.2s ease',
          pointerEvents: hover ? 'auto' : 'none',
        }}>
          <button
            onClick={() => onToggleToday(todo.id)}
            title={todo.today ? '取消今日' : '加入今日'}
            style={{
              border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', fontSize: 12,
              background: todo.today ? projectConfig.light : 'transparent',
              color: todo.today ? accentColor : 'var(--ink-faint)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { if (!todo.today) e.currentTarget.style.background = 'var(--border-light)'; }}
            onMouseLeave={e => { if (!todo.today) e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L9.5 6.5L14 7.5L10.5 10.5L11.5 15L8 12.5L4.5 15L5.5 10.5L2 7.5L6.5 6.5L8 2Z"
                fill={todo.today ? accentColor : 'none'} stroke={todo.today ? accentColor : 'currentColor'} strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            title="删除"
            style={{
              border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', fontSize: 12,
              background: 'transparent', color: 'var(--ink-faint)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fdf2ef'; e.currentTarget.style.color = '#c45d4a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-faint)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Add Form ────────────────────────────────────────
function QuickAdd({ categories, projectConfig, onAdd, onCancel }: {
  categories: string[]; projectConfig: { accent: string; bg: string; border: string; light: string };
  onAdd: (data: Omit<Todo, 'id' | 'done'>) => void; onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [priority, setPriority] = useState<Priority>('mid');
  const [due, setDue] = useState('');
  const [today, setToday] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ text: text.trim(), category, priority, due: due || null, today });
    setText(''); setDue(''); setToday(false);
  };

  const selectStyle: React.CSSProperties = {
    fontSize: 11, border: '1px solid var(--border)', borderRadius: 8,
    padding: '5px 8px', background: 'var(--bg-card)', color: 'var(--ink)',
    fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <form onSubmit={handleSubmit} className="animate-scale-in" style={{
      background: 'var(--bg-card)', border: `1.5px solid ${projectConfig.border}`,
      borderRadius: 'var(--radius)', padding: 14, marginBottom: 8,
      boxShadow: `0 4px 20px ${projectConfig.accent}10`,
    }}>
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="写点什么..."
        style={{
          width: '100%', border: 'none', outline: 'none', fontSize: 13.5,
          fontWeight: 500, color: 'var(--ink)', background: 'transparent',
          marginBottom: 10, fontFamily: 'inherit', letterSpacing: '-0.01em',
        }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value as Priority)} style={selectStyle}>
          <option value="high">紧急</option>
          <option value="mid">重要</option>
          <option value="low">日常</option>
        </select>
        <input
          type="date" value={due} onChange={e => setDue(e.target.value)}
          style={{ ...selectStyle, minWidth: 110 }}
        />
        <label style={{
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
          color: projectConfig.accent, cursor: 'pointer', fontWeight: 500,
          padding: '4px 8px', borderRadius: 8,
          background: today ? projectConfig.light : 'transparent',
          transition: 'background 0.2s',
        }}>
          <input type="checkbox" checked={today} onChange={e => setToday(e.target.checked)}
            style={{ accentColor: projectConfig.accent, width: 12, height: 12 }} />
          今日
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{
          flex: 1, background: projectConfig.accent, color: '#fff', border: 'none',
          borderRadius: 9, padding: '7px 0', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em',
          transition: 'all 0.2s ease', boxShadow: `0 2px 8px ${projectConfig.accent}30`,
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${projectConfig.accent}40`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 2px 8px ${projectConfig.accent}30`; }}
        >
          添加
        </button>
        <button type="button" onClick={onCancel} style={{
          padding: '7px 16px', background: 'var(--border-light)', color: 'var(--ink-light)',
          border: 'none', borderRadius: 9, fontSize: 12, cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--border-light)'; }}
        >
          取消
        </button>
      </div>
    </form>
  );
}

// ── Empty State ───────────────────────────────────────────
function EmptyState({ projectConfig, onAdd }: {
  projectConfig: { accent: string; bg: string; light: string }; onAdd: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
        background: projectConfig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        🌱
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-light)', marginBottom: 14, fontWeight: 500 }}>
        空空如也
      </div>
      <button onClick={onAdd} style={{
        background: projectConfig.bg, color: projectConfig.accent,
        border: `1.5px dashed ${projectConfig.accent}40`,
        borderRadius: 10, padding: '8px 20px', fontSize: 12, cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = projectConfig.light; e.currentTarget.style.borderColor = projectConfig.accent; }}
        onMouseLeave={e => { e.currentTarget.style.background = projectConfig.bg; e.currentTarget.style.borderColor = `${projectConfig.accent}40`; }}
      >
        + 添加第一条
      </button>
    </div>
  );
}

// ── Project Column ────────────────────────────────────────
function ProjectColumn({ project, onUpdate, index }: {
  project: Project; onUpdate: (projectId: string, todos: Todo[]) => void; index: number;
}) {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'today' | 'done'>('all');
  const pc = PROJECT_COLORS[project.id] || PROJECT_COLORS.work;

  const filtered = project.todos.filter(t => {
    if (filter === 'today')  return t.today && !t.done;
    if (filter === 'done')   return t.done;
    if (filter === 'active') return !t.done;
    return true;
  });

  const handleToggle = (id: number) => {
    onUpdate(project.id, project.todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };
  const handleToggleToday = (id: number) => {
    onUpdate(project.id, project.todos.map(t => t.id === id ? { ...t, today: !t.today } : t));
  };
  const handleDelete = (id: number) => {
    onUpdate(project.id, project.todos.filter(t => t.id !== id));
  };
  const handleAdd = (data: Omit<Todo, 'id' | 'done'>) => {
    const newTodo: Todo = { id: nextId++, ...data, done: false };
    onUpdate(project.id, [...project.todos, newTodo]);
    setAdding(false);
  };

  const filterOptions = [['all','全部'],['active','进行中'],['today','今日'],['done','已完成']] as const;

  return (
    <div className="animate-fade-in-up" style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      padding: 0, width: 350, flexShrink: 0, display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
      animationDelay: `${index * 0.1}s`,
    }}>
      {/* Column header */}
      <div style={{
        padding: '22px 22px 18px',
        background: `linear-gradient(180deg, ${pc.bg} 0%, var(--bg-card) 100%)`,
        borderBottom: `1px solid var(--border-light)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: pc.light, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: `inset 0 1px 2px ${pc.accent}10`,
          }}>
            {project.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--ink)',
              fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
            }}>
              {project.name}
            </div>
          </div>
        </div>

        <ProgressRing todos={project.todos} color={pc.accent} />
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg)', borderRadius: 10, padding: 3 }}>
          {filterOptions.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                flex: 1, border: 'none', borderRadius: 8, padding: '5px 0', fontSize: 11,
                cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: filter === val ? 600 : 400,
                background: filter === val ? 'var(--bg-card)' : 'transparent',
                color: filter === val ? pc.accent : 'var(--ink-light)',
                boxShadow: filter === val ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick add */}
      <div style={{ padding: adding ? '14px 20px 0' : '0 20px' }}>
        {adding && (
          <QuickAdd
            categories={project.categories}
            projectConfig={pc}
            onAdd={handleAdd}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>

      {/* Todo list */}
      <div className="stagger" style={{ flex: 1, overflowY: 'auto', maxHeight: 480, padding: '10px 14px' }}>
        {filtered.length === 0 && !adding
          ? <EmptyState projectConfig={pc} onAdd={() => setAdding(true)} />
          : filtered.map((todo, i) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                accentColor={pc.accent}
                projectConfig={pc}
                onToggle={handleToggle}
                onToggleToday={handleToggleToday}
                onDelete={handleDelete}
                index={i}
              />
            ))
        }
      </div>

      {/* Add button */}
      {!adding && filtered.length > 0 && (
        <div style={{ padding: '6px 20px 18px' }}>
          <button
            onClick={() => setAdding(true)}
            style={{
              width: '100%', border: `1.5px dashed ${pc.accent}25`,
              background: 'transparent', color: pc.accent,
              borderRadius: 10, padding: '8px 0', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = pc.bg; e.currentTarget.style.borderColor = `${pc.accent}50`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${pc.accent}25`; }}
          >
            + 添加事项
          </button>
        </div>
      )}
    </div>
  );
}

// ── Today Focus Banner ────────────────────────────────────
function TodayFocus({ projects }: { projects: Project[] }) {
  const todayItems = projects.flatMap(p =>
    p.todos
      .filter(t => t.today && !t.done)
      .map(t => ({ ...t, projectName: p.name, projectColor: p.color, projectIcon: p.icon, projectId: p.id }))
  );

  if (todayItems.length === 0) return null;

  return (
    <div className="animate-fade-in-up" style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px', marginBottom: 24,
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-md)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative corner accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 120, height: 120,
        background: 'radial-gradient(circle at top right, rgba(67,56,202,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #4338ca, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(67,56,202,0.25)',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 6H15L10.5 9L12 14.5L8 11L4 14.5L5.5 9L1 6H6.5L8 1Z" fill="white" />
          </svg>
        </div>
        <div>
          <span style={{
            fontSize: 16, fontWeight: 700, color: 'var(--ink)',
            fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
          }}>
            今日焦点
          </span>
        </div>
        <span style={{
          background: 'var(--bg)', borderRadius: 99,
          padding: '3px 10px', fontSize: 11, fontWeight: 600,
          color: 'var(--ink-light)', marginLeft: 4,
        }}>
          {todayItems.length} 项
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {todayItems.map(t => {
          const pc = PROJECT_COLORS[t.projectId] || PROJECT_COLORS.work;
          return (
            <div key={t.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: pc.bg, borderRadius: 10,
              padding: '7px 12px', fontSize: 12.5, fontWeight: 500,
              border: `1px solid ${pc.border}`,
              transition: 'all 0.2s ease',
              cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 2px 8px ${pc.accent}15`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span style={{ fontSize: 14 }}>{t.projectIcon}</span>
              <span style={{ color: 'var(--ink)' }}>{t.text}</span>
              {t.due && (
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 500, marginLeft: 2 }}>
                  {formatDue(t.due)?.text}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────
function StatsBar({ projects }: { projects: Project[] }) {
  const totalAll = projects.flatMap(p => p.todos).length;
  const totalDone = projects.flatMap(p => p.todos).filter(t => t.done).length;
  const todayCount = projects.flatMap(p => p.todos).filter(t => t.today && !t.done).length;
  const pct = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      {/* Overall progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="14" cy="14" r="11" fill="none" stroke="var(--border)" strokeWidth="2.5" />
          <circle cx="14" cy="14" r="11" fill="none" stroke="var(--accent-sage)" strokeWidth="2.5"
            strokeDasharray={2 * Math.PI * 11} strokeDashoffset={2 * Math.PI * 11 * (1 - pct / 100)}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <span style={{ fontSize: 12, color: 'var(--ink-light)', fontWeight: 500 }}>
          <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{totalDone}</span>/{totalAll}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-light)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 6H15L10.5 9L12 14.5L8 11L4 14.5L5.5 9L1 6H6.5L8 1Z" fill="var(--accent-indigo)" />
          </svg>
          <span style={{ fontWeight: 600, color: 'var(--accent-indigo)' }}>{todayCount}</span>
          <span>今日</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="var(--accent-sage)" strokeWidth="1.5" fill="none" />
            <path d="M5.5 8.5L7 10L11 6" stroke="var(--accent-sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontWeight: 600, color: 'var(--accent-sage)' }}>{totalDone}</span>
          <span>完成</span>
        </span>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const handleUpdate = useCallback((projectId: string, newTodos: Todo[]) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, todos: newTodos } : p));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <header style={{
        background: 'rgba(221,214,206,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 40px',
        display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(67,56,202,0.2)',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M5.5 8L7 9.5L10.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{
            fontSize: 18, fontWeight: 700, color: 'var(--ink)',
            fontFamily: 'var(--font-display)', letterSpacing: '-0.03em',
          }}>
            FocusDo
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <StatsBar projects={projects} />
      </header>

      {/* Main content */}
      <main style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <TodayFocus projects={projects} />

        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 32 }}>
          {projects.map((p, i) => (
            <ProjectColumn key={p.id} project={p} onUpdate={handleUpdate} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
