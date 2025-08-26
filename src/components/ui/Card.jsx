function Card({ title, action, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {(title || action) && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export default Card;
