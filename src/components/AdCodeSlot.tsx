import { useEffect, useRef } from 'react';

interface AdCodeSlotProps {
  adCode: string;
}

export function AdCodeSlot({ adCode }: AdCodeSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    host.innerHTML = '';

    const trimmed = adCode.trim();
    if (!trimmed) return;

    const insertedScripts: HTMLScriptElement[] = [];

    try {
      const template = document.createElement('template');
      template.innerHTML = trimmed;
      const fragment = template.content.cloneNode(true) as DocumentFragment;
      const scripts = Array.from(fragment.querySelectorAll('script'));

      for (const oldScript of scripts) {
        const replacement = document.createElement('script');
        for (const attr of Array.from(oldScript.attributes)) {
          replacement.setAttribute(attr.name, attr.value);
        }
        if (oldScript.textContent) {
          replacement.textContent = oldScript.textContent;
        }
        oldScript.parentNode?.replaceChild(replacement, oldScript);
        insertedScripts.push(replacement);
      }

      host.appendChild(fragment);
    } catch {
      // Ignore malformed ad snippet errors so UI countdown never breaks
    }

    return () => {
      for (const s of insertedScripts) {
        s.remove();
      }
      if (host) {
        host.innerHTML = '';
      }
    };
  }, [adCode]);

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden min-h-[140px] flex items-center justify-center p-3">
      {!adCode.trim() ? (
        <div className="text-center space-y-1.5 py-4 px-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Sponsored Partner Message
          </p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            TAP9JA keeps creator bio pages free for African creators with short sponsored breaks.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full flex items-center justify-center overflow-hidden text-center" />
      )}
    </div>
  );
}
