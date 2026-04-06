/**
 * Lightweight tooltip wrapper.
 * Usage: <Tooltip text="What this does"><button>…</button></Tooltip>
 * The tooltip appears above the child by default; pass position="bottom" to flip it.
 */
export default function Tooltip({ text, children, position = "top" }) {
  if (!text) return children;

  const isTop = position !== "bottom";

  return (
    <div className="relative group/tip inline-flex">
      {children}
      <div
        className={`
          pointer-events-none absolute z-50 left-1/2 -translate-x-1/2
          opacity-0 group-hover/tip:opacity-100
          transition-opacity duration-100 delay-200
          ${isTop ? "bottom-full mb-2" : "top-full mt-2"}
        `}
      >
        <div className="bg-gray-900 text-white text-[11px] font-medium rounded-md px-2.5 py-1.5 whitespace-nowrap max-w-[220px] text-center leading-snug shadow-lg">
          {text}
        </div>
        {/* arrow */}
        <div
          className={`
            w-0 h-0 mx-auto
            border-l-4 border-r-4 border-l-transparent border-r-transparent
            ${isTop
              ? "border-t-4 border-t-gray-900"
              : "border-b-4 border-b-gray-900 -mt-px order-first -mb-px"}
          `}
          style={isTop ? {} : { order: -1 }}
        />
      </div>
    </div>
  );
}
