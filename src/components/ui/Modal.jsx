import * as Dialog from "@radix-ui/react-dialog";

function Modal({ open, onOpenChange, title, description, children, footer, className }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-[90vw] p-4 z-50 ${className || 'max-w-md'}`}>
          {title && (
            <Dialog.Title className="text-base font-semibold text-gray-900">
              {title}
            </Dialog.Title>
          )}
          {description && (
            <Dialog.Description className="text-sm text-gray-600 mt-1">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
          {footer && (
            <div className="mt-6 flex justify-end gap-2">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default Modal;
