import { useId } from "react";
import clsx from "clsx";

function Input({ label, type = "text", error, className, ...props }) {
  const id = useId();
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={clsx(
          "w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm",
          "px-3 py-2",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default Input;
