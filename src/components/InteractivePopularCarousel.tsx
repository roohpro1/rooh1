import React, { useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { AppReview } from "../types";

interface InteractivePopularCarouselProps {
  siblingApps: AppReview[];
  onNavigate: (view: "home" | "app" | "admin" | "privacy", id?: string) => void;
  hideHeader?: boolean;
  itemShape?: "square" | "rectangle";
  className?: string;
}

export const InteractivePopularCarousel: React.FC<InteractivePopularCarouselProps> = ({ 
  siblingApps, 
  onNavigate,
  hideHeader = false,
  itemShape = "square",
  className = ""
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const positionRef = useRef(0);
  const velocityRef = useRef(-0.8); // default movement rate
  const isPointerDown = useRef(false);
  const startX = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const dragDistance = useRef(0);
  const isHoveredRef = useRef(false);
  const isInitialized = useRef(false);

  // Repeated five times to guarantee wrapping width is larger than screen width
  const repeatedApps = siblingApps && siblingApps.length > 0 
    ? [...siblingApps, ...siblingApps, ...siblingApps, ...siblingApps, ...siblingApps]
    : [];

  useEffect(() => {
    if (!siblingApps || siblingApps.length === 0) return;

    let animationId: number;

    const update = () => {
      if (!innerRef.current) {
        animationId = requestAnimationFrame(update);
        return;
      }

      const totalWidth = innerRef.current.scrollWidth;
      const oneSetWidth = totalWidth / 5;

      if (oneSetWidth > 0) {
        // Initialize position in the middle set of items to support endless bidirectional scroll
        if (!isInitialized.current) {
          positionRef.current = -oneSetWidth * 2;
          isInitialized.current = true;
        }

        // Apply physics movement when not hovering and not actively dragging
        if (!isPointerDown.current && !isHoveredRef.current) {
          const cruiseSpeed = 0.8;
          const currentSpeed = Math.abs(velocityRef.current);
          if (currentSpeed > cruiseSpeed) {
            // Decelerate toward cruiseSpeed with friction decay
            const decay = 0.97;
            velocityRef.current = velocityRef.current * decay;
            if (Math.abs(velocityRef.current) < cruiseSpeed) {
              velocityRef.current = velocityRef.current >= 0 ? cruiseSpeed : -cruiseSpeed;
            }
          } else {
            // Ensure we're cruising at base speed in the swiped direction
            velocityRef.current = velocityRef.current >= 0 ? cruiseSpeed : -cruiseSpeed;
          }

          positionRef.current += velocityRef.current;
        }

        // Loop boundaries wrap perfectly and invisibly
        while (positionRef.current < -oneSetWidth * 3) {
          positionRef.current += oneSetWidth;
        }
        while (positionRef.current > -oneSetWidth) {
          positionRef.current -= oneSetWidth;
        }

        innerRef.current.style.transform = `translate3d(${positionRef.current}px, 0px, 0px)`;
      }

      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, [siblingApps]);

  if (!siblingApps || siblingApps.length === 0) return null;

  const handleStart = (clientX: number) => {
    isPointerDown.current = true;
    startX.current = clientX;
    lastX.current = clientX;
    lastTime.current = performance.now();
    dragDistance.current = 0;
  };

  const handleMove = (clientX: number) => {
    if (!isPointerDown.current) return;
    const now = performance.now();
    const dt = now - lastTime.current;
    const deltaX = clientX - lastX.current;

    positionRef.current += deltaX;
    dragDistance.current += Math.abs(deltaX);

    if (dt > 0) {
      const instVelocity = (deltaX / dt) * 16.66;
      if (Math.abs(instVelocity) > 0.05) {
        velocityRef.current = instVelocity;
      }
    }

    lastX.current = clientX;
    lastTime.current = now;
  };

  const handleEnd = () => {
    isPointerDown.current = false;
    
    if (dragDistance.current > 5) {
      const minSpeed = 0.8;
      if (Math.abs(velocityRef.current) < minSpeed) {
        velocityRef.current = velocityRef.current >= 0 ? minSpeed : -minSpeed;
      }
      const maxSpeed = 8;
      if (Math.abs(velocityRef.current) > maxSpeed) {
        velocityRef.current = velocityRef.current >= 0 ? maxSpeed : -maxSpeed;
      }
    }
  };

  const handleItemClick = (e: React.MouseEvent, siblingId: string) => {
    if (dragDistance.current > 8) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onNavigate("app", siblingId);
  };

  return (
    <div 
      className={`w-full max-w-full bg-white dark:bg-zinc-950 rounded-[24px] sm:rounded-[32px] ${
        hideHeader ? "p-3 sm:p-4 my-6" : "p-6 sm:p-8 my-10"
      } overflow-hidden shadow-sm border-2 border-slate-200 dark:border-zinc-800 relative select-none transition-all duration-300 ${className}`}
      style={{ direction: "ltr" }}
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; handleEnd(); }}
    >
      {/* Header Ribbon - Only shown if hideHeader is false */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-2 px-3" style={{ direction: "rtl" }}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <h3 className="text-sm sm:text-base font-black text-black dark:text-zinc-100 tracking-wide">
              تطبيقات شائعة قد تعجبك الآن
            </h3>
          </div>
          <span className="text-[10px] sm:text-xs text-black dark:text-zinc-400 font-black bg-blue-50 dark:bg-zinc-800 px-3 py-1 rounded-full border-2 border-blue-200 dark:border-zinc-700">
            اسحب الشريط للتصفح بالاتجاهين • انقر للتفاصيل (يتوقف عند النقر والوقوف عليه)
          </span>
        </div>
      )}

      {/* Endless Draggable Scroll Surface without any dimming or gradient overlays */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden w-full cursor-grab active:cursor-grabbing py-1"
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div 
          ref={innerRef}
          className="flex gap-4 sm:gap-5 will-change-transform"
          style={{ width: "max-content" }}
        >
          {repeatedApps.map((sibling, idx) => (
            <div 
              key={`marquee-item-${sibling.id}-${idx}`}
              onClick={(e) => handleItemClick(e, sibling.id)}
              className={
                itemShape === "rectangle"
                  ? "flex items-center gap-3.5 bg-white dark:bg-zinc-900 border-2 border-blue-300/80 dark:border-amber-500/40 hover:border-blue-500 dark:hover:border-amber-400 p-3 sm:p-3.5 rounded-2xl w-60 sm:w-68 shrink-0 transition-all hover:scale-[1.03] active:scale-95 text-right shadow-sm cursor-pointer select-none"
                  : "flex flex-col items-center justify-between bg-white dark:bg-zinc-900 border-2 border-blue-300/80 dark:border-amber-500/40 hover:border-blue-500 dark:hover:border-amber-400 p-4 rounded-3xl w-44 h-44 sm:w-48 sm:h-48 shrink-0 transition-all hover:scale-[1.03] active:scale-95 text-center shadow-sm cursor-pointer select-none"
              }
              style={{ direction: "rtl" }}
            >
              {/* App Icon */}
              <div className={
                itemShape === "rectangle"
                  ? "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-slate-50 dark:bg-zinc-950 overflow-hidden border-2 border-blue-200 dark:border-amber-500/30 shrink-0 flex items-center justify-center shadow-xs"
                  : "h-18 w-18 sm:h-20 sm:w-20 rounded-2.5xl bg-slate-50 dark:bg-zinc-950 overflow-hidden border-2 border-blue-200 dark:border-amber-500/30 shrink-0 flex items-center justify-center shadow-xs"
              }>
                {sibling.iconUrl && sibling.iconUrl.trim() !== "" ? (
                  <img 
                    src={sibling.iconUrl} 
                    alt={sibling.name} 
                    className="h-full w-full object-cover" 
                    referrerPolicy="no-referrer" 
                    draggable="false" 
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const next = target.nextElementSibling as HTMLElement;
                      if (next) next.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="h-full w-full flex items-center justify-center bg-blue-100 dark:bg-amber-950/40 text-blue-950 dark:text-amber-300 font-black text-xl"
                  style={{ display: sibling.iconUrl ? 'none' : 'flex' }}
                >
                  {sibling.name ? sibling.name.charAt(0) : "A"}
                </div>
              </div>

              {/* Info & Rating with black fonts and cheerful badge */}
              {itemShape === "rectangle" ? (
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm md:text-base font-black text-black dark:text-white truncate w-full tracking-wide">{sibling.name}</h4>
                  <p className="text-[10px] sm:text-xs text-blue-950 dark:text-slate-200 font-black truncate mt-0.5 w-full">{sibling.category || "تطبيق"}</p>
                  
                  <div className="flex items-center gap-1.5 mt-1.5 font-black text-[10px] sm:text-xs">
                    <span className="text-black dark:text-white bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-lg border border-amber-400 flex items-center gap-0.5 font-black">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {sibling.rating ? sibling.rating.toFixed(1) : "4.9"}
                    </span>
                    <span className="text-black bg-gradient-to-r from-blue-50 to-rose-50 border-2 border-blue-500 px-2 py-0.5 rounded-lg font-black">تحميل مجاني</span>
                  </div>
                </div>
              ) : (
                <div className="w-full mt-2" style={{ direction: "rtl" }}>
                  <h4 className="text-xs sm:text-sm font-black text-black dark:text-white truncate w-full tracking-wide">{sibling.name}</h4>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-[10px] sm:text-xs text-blue-950 font-black bg-blue-50 border-2 border-blue-400 px-2 py-0.5 rounded-lg truncate max-w-full">
                      {sibling.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-0.5 mt-1.5" style={{ direction: "ltr" }}>
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3.5 h-3.5 ${i < Math.round(sibling.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-zinc-700'}`} 
                      />
                    ))}
                    <span className="text-[10px] sm:text-xs font-black text-black dark:text-white ml-1 bg-amber-100 dark:bg-amber-950/60 px-1 rounded border border-amber-300">
                      {sibling.rating ? sibling.rating.toFixed(1) : "4.9"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
