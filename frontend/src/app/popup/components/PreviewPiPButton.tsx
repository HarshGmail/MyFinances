'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PictureInPicture } from 'lucide-react';
import { createPortal } from 'react-dom';

type Props = {
  children: React.ReactNode; // content to render inside PiP
  width?: number;
  height?: number;
  label?: string;
  className?: string;
};

declare global {
  interface Window {
    documentPictureInPicture?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestWindow: (options?: any) => Promise<Window>;
    };
  }
}

function copyStyles(fromDoc: Document, toDoc: Document) {
  // Copy <link> and <style> tags so Tailwind/shadcn styles apply
  Array.from(fromDoc.querySelectorAll('link[rel="stylesheet"], style')).forEach((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    toDoc.head.appendChild(clone);
  });
  // Copy HTML classes (e.g., dark mode)
  toDoc.documentElement.className = fromDoc.documentElement.className;
  // Basic body reset
  toDoc.body.style.margin = '0';
  toDoc.body.style.background = getComputedStyle(fromDoc.body).background || 'transparent';
}

export const PreviewPiPButton: React.FC<Props> = ({
  children,
  width = 380,
  height = 620,
  label = 'Open PiP',
  className,
}) => {
  const [pipWin, setPipWin] = useState<Window | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const open = useCallback(async () => {
    try {
      // Prefer Document Picture-in-Picture
      if (window.documentPictureInPicture?.requestWindow) {
        const w = await window.documentPictureInPicture.requestWindow({ width, height });
        copyStyles(document, w.document);
        w.document.title = 'PiP Preview';
        const mount = w.document.createElement('div');
        mount.id = 'pip-root';
        w.document.body.appendChild(mount);
        mountRef.current = mount;
        setPipWin(w);
        w.addEventListener('pagehide', () => setPipWin(null), { once: true });
      } else {
        // Fallback to normal popup window
        const w = window.open('', 'pip-preview', `width=${width},height=${height},popup=1`);
        if (!w) return;
        copyStyles(document, w.document);
        w.document.title = 'PiP Preview';
        const mount = w.document.createElement('div');
        mount.id = 'pip-root';
        w.document.body.appendChild(mount);
        mountRef.current = mount;
        setPipWin(w);
        w.addEventListener('beforeunload', () => setPipWin(null), { once: true });
      }
    } catch (e) {
      console.error('PiP open failed:', e);
    }
  }, [width, height]);

  // Cleanup if parent unmounts
  useEffect(() => {
    return () => {
      try {
        pipWin?.close();
      } catch {}
    };
  }, [pipWin]);

  const portal = useMemo(() => {
    if (!pipWin || !mountRef.current) return null;
    return createPortal(children, mountRef.current);
  }, [pipWin, children]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={open} className={className}>
        <PictureInPicture className="w-4 h-4 mr-2" />
        {label}
      </Button>
      {portal}
    </>
  );
};
