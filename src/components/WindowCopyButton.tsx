import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface WindowCopyButtonProps {
  getText?: () => string;
  textToCopy?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
  windowId?: string;
  title?: string;
  className?: string;
  label?: string;
}

export const WindowCopyButton: React.FC<WindowCopyButtonProps> = ({
  getText,
  textToCopy,
  containerRef,
  windowId,
  title = "نسخ محتوى النافذة للذكاء الاصطناعي",
  className = "",
  label
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let content = "";
    if (textToCopy) {
      content = textToCopy;
    } else if (getText) {
      content = getText();
    } else if (containerRef?.current) {
      content = containerRef.current.innerText || containerRef.current.textContent || "";
    } else {
      // Fallback: search closest parent container card
      const parent = (e.currentTarget as HTMLElement).closest('[data-window-container="true"], .bg-white, .bg-zinc-950, .bg-zinc-900, .bg-slate-50, .bg-slate-900');
      if (parent) {
        content = (parent as HTMLElement).innerText || (parent as HTMLElement).textContent || "";
      }
    }

    if (windowId) {
      content = `[Window ID: ${windowId}]\n${content}`.trim();
    }

    if (!content) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy window content:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={windowId ? `${title} (ID: ${windowId})` : title}
      className={`px-2 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 text-xs font-bold ${className}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
      ) : (
        <span className="text-xs leading-none">🔗</span>
      )}
      {label && <span className="text-[10px] font-mono">{copied ? "تم النسخ" : label}</span>}
    </button>
  );
};

