import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { errorFields, log } from '../log';
import { PixelIcon, SheetClose } from './ui';

export interface MenuSection {
  key: string;
  label: string;
  icon: readonly string[];
  /** The section's box; mounted only while its sheet is open, so its reads happen when someone asks for it. */
  content: ReactNode;
}

/**
 * The single-column layout's row of secondary boxes (Friend Space, links, projects): one labelled button each,
 * opening the box as a sheet over the bottom of the frame. Keeping them out of the column lets the wall follow
 * the owner's controls directly and scroll without end. Only optional items belong here; what the platform
 * requires every viewer to see stays on the page.
 */
export function MoreMenu({ name, sections }: { name: string | undefined; sections: readonly MenuSection[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  if (sections.length === 0) return null;

  return (
    <nav aria-label={name === undefined ? 'More' : `More from ${name}`}>
      <ul className="panel grid auto-cols-fr grid-flow-col divide-x divide-line">
        {sections.map((s) => (
          <li key={s.key} className="min-w-0">
            <button
              type="button"
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1.5 px-2 py-2 text-[11px] leading-tight font-bold tracking-[0.1em] text-primary uppercase hover:bg-raised"
              aria-haspopup="dialog"
              aria-controls={`sheet-${s.key}`}
              onClick={(e) => {
                opener.current = e.currentTarget;
                setOpen(s.key);
              }}
            >
              <PixelIcon rows={s.icon} className="h-3.5 w-3.5" />
              {s.label}
            </button>
          </li>
        ))}
      </ul>
      {sections.map((s) => (
        <Sheet
          key={s.key}
          id={`sheet-${s.key}`}
          open={open === s.key}
          onClosed={() => {
            setOpen(null);
            opener.current?.focus();
          }}
        >
          {s.content}
        </Sheet>
      ))}
    </nav>
  );
}

/**
 * A modal `<dialog>` pinned to the bottom of the frame. Escape, the Close button in the box's bar and a tap on the
 * dimmed page all close it; the page behind does not scroll while it is open (index.css).
 */
function Sheet({ id, open, onClosed, children }: { id: string; open: boolean; onClosed: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog === null || open === dialog.open) return;
    if (!open) {
      dialog.close();
      return;
    }
    try {
      dialog.showModal();
    } catch (err) {
      log('warn', 'profile.sheet', 'could not open the sheet as a modal', { sheet: id, ...errorFields(err), recovery: 'opened without the modal backdrop' });
      dialog.show();
    }
  }, [open, id]);

  return (
    <dialog
      ref={ref}
      id={id}
      className="sheet"
      onClose={onClosed}
      onClick={(e) => {
        // A click on the dialog element itself landed on the backdrop: the box fills the dialog.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {open && <SheetClose.Provider value={() => ref.current?.close()}>{children}</SheetClose.Provider>}
    </dialog>
  );
}
