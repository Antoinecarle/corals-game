import { Download, ZoomIn } from 'lucide-react';
import { useState } from 'react';

interface ImagePreviewProps {
  imageUrl: string;
  alt?: string;
  height?: string;
}

export default function ImagePreview({ imageUrl, alt = 'Generated image', height = '300px' }: ImagePreviewProps) {
  const [zoomed, setZoomed] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = alt.replace(/\s+/g, '_') + '.png';
    link.click();
  };

  return (
    <>
      <div className="relative rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group" style={{ height }}>
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-contain"
        />
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setZoomed(true)}
            className="p-1.5 bg-gray-900/80 hover:bg-gray-900 rounded text-gray-300 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 bg-gray-900/80 hover:bg-gray-900 rounded text-gray-300 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {zoomed && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8" onClick={() => setZoomed(false)}>
          <img src={imageUrl} alt={alt} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}
