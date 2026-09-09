import type { ReactNode } from "react";

export function WalletDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-dialog-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-line bg-cream p-6 shadow-xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="wallet-dialog-title" className="display-caps text-2xl">
            {title}
          </h2>
          <button className="text-2xl leading-none text-ink-soft" aria-label="Close dialog" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
