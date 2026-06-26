import React, { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

// --- Reusable Component Interfaces ---
export interface GlassCardItem {
  id: string | number;
  initials?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  subtitle: string;
  mainText: string;
  tags: { text: string; type: 'featured' | 'default' | 'danger' | 'warning' | 'success' }[];
  stats: { icon: React.ComponentType<{ className?: string; size?: number }>; text: string; }[];
  avatarGradient?: string;
  onAction?: () => void;
  actionText?: string;
}

export interface GlassStackCardProps {
  items: GlassCardItem[];
  /** How many cards to show behind the main card */
  visibleBehind?: number;
  /** Custom title for the stack */
  headerTitle?: string;
  /** Custom subtitle for the stack */
  headerSubtitle?: string;
}

export const GlassStackCard = ({ items, visibleBehind = 2, headerTitle, headerSubtitle }: GlassStackCardProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalCards = items.length;

  const navigate = useCallback((newIndex: number) => {
    setActiveIndex((newIndex + totalCards) % totalCards);
  }, [totalCards]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (index !== activeIndex) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartRef.current = clientX;
    cardRefs.current[activeIndex]?.classList.add('is-dragging');
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragOffset(clientX - dragStartRef.current);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    cardRefs.current[activeIndex]?.classList.remove('is-dragging');
    if (Math.abs(dragOffset) > 80) {
      navigate(activeIndex + (dragOffset < 0 ? 1 : -1));
    }
    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, dragOffset, activeIndex, navigate]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (!items?.length) return null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Optional Stack Header */}
      {(headerTitle || headerSubtitle) && (
        <div className="text-left space-y-1 mb-4">
          {headerTitle && (
            <h3 className="text-lg font-display font-bold text-white tracking-tight flex items-center gap-1.5 uppercase">
              <Sparkles size={14} className="text-cyan-400" /> {headerTitle}
            </h3>
          )}
          {headerSubtitle && (
            <p className="text-xs text-slate-400 font-mono">{headerSubtitle}</p>
          )}
        </div>
      )}

      {/* The Stack Area */}
      <div className="relative min-h-[290px] md:min-h-[270px] flex items-center justify-center select-none">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          // Calculate display order relative to the active card
          const displayOrder = (index - activeIndex + totalCards) % totalCards;

          const style: CSSProperties = {};
          if (displayOrder === 0) { // Top card
            style.transform = `translateX(${dragOffset}px) rotate(${dragOffset * 0.015}deg)`;
            style.opacity = 1;
            style.zIndex = totalCards;
            style.cursor = isDragging ? 'grabbing' : 'grab';
          } else if (displayOrder <= visibleBehind) { // Stacked cards behind
            const scale = 1 - 0.05 * displayOrder;
            const translateY = -1.25 * displayOrder; // spacing in rem
            style.transform = `scale(${scale}) translateY(${translateY}rem)`;
            style.opacity = 1 - 0.25 * displayOrder;
            style.zIndex = totalCards - displayOrder;
            style.pointerEvents = 'none'; // Only top card is interactive
          } else { // Hidden cards
            style.transform = 'scale(0.8) translateY(-3rem)';
            style.opacity = 0;
            style.zIndex = 0;
            style.pointerEvents = 'none';
          }

          const getTagClass = (type: string) => {
            switch (type) {
              case 'featured':
                return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
              case 'danger':
                return 'bg-red-500/10 text-red-400 border border-red-500/20';
              case 'warning':
                return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
              case 'success':
                return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
              default:
                return 'bg-slate-800/60 text-slate-300 border border-white/[0.05]';
            }
          };

          const IconComponent = item.icon;

          return (
            <div
              ref={el => { cardRefs.current[index] = el; }}
              key={item.id}
              className="absolute left-0 right-0 w-full rounded-2xl border border-white/[0.06] bg-slate-950/75 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out transform-gpu touch-none overflow-hidden"
              style={style}
              onMouseDown={(e) => handleDragStart(e, index)}
              onTouchStart={(e) => handleDragStart(e, index)}
            >
              {/* Highlight top border gradient */}
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              
              <div className="p-4 md:p-5 space-y-3">
                
                {/* Header info */}
                <div className="flex items-start gap-4 text-left">
                  {/* Decorative Initials or Icon */}
                  {IconComponent ? (
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/20" style={{ background: item.avatarGradient || 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))' }}>
                      <IconComponent size={20} />
                    </div>
                  ) : item.initials ? (
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-mono font-bold text-sm border border-white/[0.05]" style={{ background: item.avatarGradient || 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                      {item.initials}
                    </div>
                  ) : null}

                  <div className="space-y-0.5">
                    <h3 className="text-base md:text-lg font-display font-bold text-white tracking-tight leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-[10px] md:text-xs font-mono text-cyan-400 uppercase tracking-wider">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Main Text Recommendation */}
                <div className="text-left">
                  <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal">
                    {item.mainText}
                  </p>
                </div>

                {/* Footer Badges & Stats */}
                <div className="pt-3 border-t border-white/[0.05] flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                  {/* Tags / Priority Badges */}
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag, i) => (
                      <span
                        key={i}
                        className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${getTagClass(tag.type)}`}
                      >
                        {tag.text}
                      </span>
                    ))}
                  </div>

                  {/* Quantitative Stats indicators */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-slate-400">
                    {item.stats.map((stat, i) => {
                      const StatIcon = stat.icon;
                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          <StatIcon className="text-cyan-400/80 shrink-0" size={14} />
                          <span className="leading-none">{stat.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Action CTA Button - Min 44px height */}
                {item.onAction && (
                  <div className="pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onAction?.();
                      }}
                      className="w-full h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 font-mono text-sm font-bold transition-all cursor-pointer"
                    >
                      <span>{item.actionText || 'Take Action'}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls / Navigation dots */}
      <div className="flex items-center justify-center gap-3 pt-4">
        {items.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => navigate(index)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                isActive ? 'w-8 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'w-2.5 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
