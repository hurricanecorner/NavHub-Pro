import React, { useState, useRef } from 'react';
import { GripVertical, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DraggableTagListProps {
  tags: string[];
  onReorder: (newTags: string[]) => void;
  onRemove: (tag: string) => void;
  emptyText?: string;
}

export const DraggableTagList: React.FC<DraggableTagListProps> = ({
  tags,
  onReorder,
  onRemove,
  emptyText = '暂无标签'
}) => {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const dragStateRef = useRef<{
    isDragging: boolean;
    startIdx: number;
    startX: number;
    startY: number;
    currentHoverIdx: number | null;
  }>({
    isDragging: false,
    startIdx: -1,
    startX: 0,
    startY: 0,
    currentHoverIdx: null,
  });

  const tagsRef = useRef(tags);
  tagsRef.current = tags;

  const moveTag = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= tags.length || toIdx >= tags.length) return;
    const newTags = [...tags];
    const [moved] = newTags.splice(fromIdx, 1);
    newTags.splice(toIdx, 0, moved);
    onReorder(newTags);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    // 仅响应鼠标左键或单点触控
    if (e.button !== 0) return;
    // 如果点击的是按钮（如删除或箭头），不启动拖拽
    if ((e.target as HTMLElement).closest('button')) return;

    const startX = e.clientX;
    const startY = e.clientY;

    dragStateRef.current = {
      isDragging: false,
      startIdx: idx,
      startX,
      startY,
      currentHoverIdx: idx,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;

      if (!dragStateRef.current.isDragging) {
        // 移动距离大于 4px 时确认为拖拽
        if (Math.hypot(dx, dy) > 4) {
          dragStateRef.current.isDragging = true;
          setDraggingIdx(idx);
        } else {
          return;
        }
      }

      setDragPos({ x: moveEv.clientX, y: moveEv.clientY });

      // 检测当前光标悬停的目标标签
      const elements = document.elementsFromPoint(moveEv.clientX, moveEv.clientY);
      let foundIdx: number | null = null;
      for (const el of elements) {
        const tagEl = el.closest('[data-tag-index]');
        if (tagEl) {
          const targetIdx = Number(tagEl.getAttribute('data-tag-index'));
          if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < tagsRef.current.length) {
            foundIdx = targetIdx;
            break;
          }
        }
      }

      dragStateRef.current.currentHoverIdx = foundIdx;
      setHoverIdx(foundIdx);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      const { isDragging, startIdx, currentHoverIdx } = dragStateRef.current;
      if (isDragging && currentHoverIdx !== null && currentHoverIdx !== startIdx && startIdx >= 0) {
        const currentTags = [...tagsRef.current];
        const [moved] = currentTags.splice(startIdx, 1);
        currentTags.splice(currentHoverIdx, 0, moved);
        onReorder(currentTags);
      }

      dragStateRef.current.isDragging = false;
      dragStateRef.current.startIdx = -1;
      dragStateRef.current.currentHoverIdx = null;
      setDraggingIdx(null);
      setHoverIdx(null);
      setDragPos(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  return (
    <>
      <div 
        className="w-full min-h-[85px] px-6 py-5 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-200 dark:border-white/5 rounded-[1.5rem] flex flex-wrap items-center gap-2.5 shadow-inner transition-all relative select-none"
      >
        {tags && tags.length > 0 ? (
          tags.map((tag, idx) => {
            const isDragging = draggingIdx === idx;
            const isOver = hoverIdx === idx && draggingIdx !== idx;

            return (
              <div
                key={`${tag}-${idx}`}
                data-tag-index={idx}
                onPointerDown={(e) => handlePointerDown(e, idx)}
                style={{ touchAction: 'none' }}
                className={`group inline-flex items-center gap-1 pl-2 pr-1.5 py-1.5 bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-black shadow-sm border transition-all cursor-grab active:cursor-grabbing select-none relative ${
                  isDragging
                    ? 'opacity-25 border-dashed border-brand-500 bg-brand-50/30 dark:bg-brand-950/30 scale-95'
                    : isOver
                    ? 'ring-2 ring-brand-500 scale-105 bg-brand-50 dark:bg-brand-950/60 border-brand-500 shadow-lg z-10'
                    : 'border-slate-200/80 dark:border-white/10 hover:border-brand-300 hover:shadow-md'
                }`}
                title="按住鼠标拖拽即可自由调整排序，也可点击两侧箭头微调"
              >
                {/* 抓手把柄 */}
                <div className="p-0.5 text-slate-400 dark:text-zinc-500 group-hover:text-brand-500 transition-colors shrink-0">
                  <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
                </div>

                {/* 左移按钮 */}
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveTag(idx, idx - 1);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-600 rounded text-slate-400 hover:text-brand-600 transition-all"
                    title="向前移动"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 pointer-events-none" />
                  </button>
                )}

                {/* 标签文字 */}
                <span className="pointer-events-none select-none px-0.5 font-bold"># {tag}</span>

                {/* 右移按钮 */}
                {idx < tags.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveTag(idx, idx + 1);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-600 rounded text-slate-400 hover:text-brand-600 transition-all"
                    title="向后移动"
                  >
                    <ChevronRight className="w-3.5 h-3.5 pointer-events-none" />
                  </button>
                )}

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(tag);
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors ml-0.5 shrink-0"
                  title="删除此标签"
                >
                  <X className="w-3.5 h-3.5 pointer-events-none" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="w-full text-center py-4 text-xs font-bold text-slate-400 dark:text-zinc-500 select-none">
            {emptyText}
          </div>
        )}
      </div>

      {/* 拖拽中的跟随悬浮卡片 */}
      {draggingIdx !== null && dragPos && tags[draggingIdx] && (
        <div
          style={{
            position: 'fixed',
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`,
            transform: 'translate(-50%, -50%) rotate(3deg)',
            pointerEvents: 'none',
            zIndex: 99999,
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-black shadow-2xl ring-4 ring-brand-400/30 select-none cursor-grabbing"
        >
          <GripVertical className="w-3.5 h-3.5 text-white/80" />
          <span># {tags[draggingIdx]}</span>
        </div>
      )}
    </>
  );
};
