import { useState } from 'react';
import { Search, Plus, Trash2, Eye, EyeOff, Pencil } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface EntityListProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onPublish?: (item: T, published: boolean) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  getId: (item: T) => string;
  isPublished?: (item: T) => boolean;
}

export default function EntityList<T>({
  title, subtitle, items, columns, onAdd, onEdit, onDelete, onPublish,
  searchPlaceholder = 'Search...', filters, getId, isPublished
}: EntityListProps<T>) {
  const [search, setSearch] = useState('');

  const filtered = items.filter(item =>
    !search || columns.some(col => {
      const val = (item as any)[col.key];
      return val && String(val).toLowerCase().includes(search.toLowerCase());
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {filters}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No items found
                </td>
              </tr>
            )}
            {filtered.map(item => (
              <tr key={getId(item)} className="hover:bg-gray-800/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-300">
                    {col.render ? col.render(item) : String((item as any)[col.key] ?? '')}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onPublish && isPublished && (
                      <button
                        onClick={() => onPublish(item, !isPublished(item))}
                        className={`p-1.5 rounded transition-colors ${isPublished(item) ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-gray-300'}`}
                        title={isPublished(item) ? 'Unpublish' : 'Publish'}
                      >
                        {isPublished(item) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                    {onEdit && (
                      <button onClick={() => onEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-400 rounded transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(item)} className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
