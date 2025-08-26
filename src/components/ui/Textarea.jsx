import { useEffect, useId, useState } from "react";
import clsx from "clsx";

function Textarea({ label, maxLength = 280, error, className, ...props }) {
  const id = useId();
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(props.value?.length ?? 0);
  }, [props.value]);
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
      <textarea
        id={id}
        maxLength={maxLength}
        className={clsx(
          "w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm",
          "px-3 py-2 min-h-[120px] resize-vertical",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        aria-invalid={!!error}
        onChange={(e) => setCount(e.target.value.length)}
        {...props}
      />
      <div className="mt-1 flex justify-between text-xs">
        {error ? <p className="text-red-600">{error}</p> : <span />}
        <p className="text-gray-500">
          {count}/{maxLength}
        </p>
      </div>
    </div>
  );
}

export default Textarea;
