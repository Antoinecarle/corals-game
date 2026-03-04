import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Sparkles, Wand2, Image, Box, Link2, RefreshCw, Loader2 } from 'lucide-react';
import ModelViewer from './ModelViewer';
import ImagePreview from './ImagePreview';

type GenerationState = 'idle' | 'generating_prompt' | 'prompt_ready' | 'generating' | 'polling' | 'preview' | 'linked' | 'error';
type TabType = '2d' | '3d';

interface AssetGeneratorPanelProps {
  entityType: string;
  entityId?: string;
  entityData: Record<string, any>;
  onAssetLinked?: (assetId: string, field: string) => void;
}

export default function AssetGeneratorPanel({ entityType, entityId, entityData, onAssetLinked }: AssetGeneratorPanelProps) {
  const [tab, setTab] = useState<TabType>('2d');
  const [state, setState] = useState<GenerationState>('idle');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [asset, setAsset] = useState<{ id: string; file_path: string; thumbnail_url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-prompt generation
  const generatePrompt = async () => {
    setState('generating_prompt');
    setError(null);
    try {
      const result = await api<any>('/ai/generate/visual-prompt', {
        method: 'POST',
        body: JSON.stringify({ entity_type: entityType, entity_data: entityData, target: tab }),
      });
      const v = result.variants?.[0] || result;
      setPrompt(v.prompt || '');
      setNegativePrompt(v.negative_prompt || '');
      setState('prompt_ready');
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  };

  // Generate 2D
  const generate2D = async () => {
    setState('generating');
    setError(null);
    try {
      const result = await api<any>('/ai/generate/visual-2d', {
        method: 'POST',
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, prompt }),
      });
      setAsset(result.asset);
      setJobId(result.jobId);
      setState('preview');
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  };

  // Generate 3D
  const generate3D = async () => {
    setState('generating');
    setError(null);
    try {
      const result = await api<any>('/ai/generate/visual-3d', {
        method: 'POST',
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, prompt, negative_prompt: negativePrompt }),
      });
      setJobId(result.jobId);
      setState('polling');
      setProgress(0);
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  };

  // Poll for 3D job status
  useEffect(() => {
    if (state !== 'polling' || !jobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await api<any>(`/ai/jobs/${jobId}/status`);
        setProgress(status.progress || 0);

        if (status.status === 'completed' && status.asset) {
          setAsset(status.asset);
          setState('preview');
          clearInterval(interval);
        } else if (status.status === 'failed') {
          setError(status.error || 'Generation failed');
          setState('error');
          clearInterval(interval);
        }
      } catch (err: any) {
        setError(err.message);
        setState('error');
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [state, jobId]);

  // Link asset to entity
  const linkAsset = async () => {
    if (!asset || !entityId) return;
    const field = tab === '3d' ? 'model_asset_id' : (entityType === 'item' ? 'icon_asset_id' : 'sprite_asset_id');
    try {
      await api('/ai/link-asset', {
        method: 'POST',
        body: JSON.stringify({ asset_id: asset.id, entity_type: entityType, entity_id: entityId, field }),
      });
      setState('linked');
      onAssetLinked?.(asset.id, field);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const reset = () => {
    setState('idle');
    setPrompt('');
    setNegativePrompt('');
    setJobId(null);
    setProgress(0);
    setAsset(null);
    setError(null);
  };

  const handleGenerate = () => {
    if (tab === '2d') generate2D();
    else generate3D();
  };

  return (
    <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2">
          <Wand2 className="w-4 h-4" />
          Visual Asset Generation
        </h3>
        <div className="flex bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => { setTab('2d'); reset(); }}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-colors ${tab === '2d' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Image className="w-3 h-3" /> 2D Concept
          </button>
          <button
            onClick={() => { setTab('3d'); reset(); }}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-colors ${tab === '3d' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Box className="w-3 h-3" /> 3D Model
          </button>
        </div>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`Describe the ${tab === '3d' ? '3D model' : 'concept art'} to generate...`}
            rows={3}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
          />
        </div>
        {tab === '3d' && (
          <input
            value={negativePrompt}
            onChange={e => setNegativePrompt(e.target.value)}
            placeholder="Negative prompt (things to avoid)..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={generatePrompt}
            disabled={state === 'generating_prompt' || state === 'generating' || state === 'polling'}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            {state === 'generating_prompt' ? 'Generating...' : 'Auto-Prompt'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt || state === 'generating' || state === 'polling' || state === 'generating_prompt'}
            className="flex items-center gap-1 px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded transition-colors"
          >
            {state === 'generating' || state === 'polling' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3" />
            )}
            {state === 'generating' ? 'Generating...' : state === 'polling' ? `${progress}%` : 'Generate'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {state === 'polling' && (
        <div className="space-y-1">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">3D generation in progress... {progress}%</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={reset} className="mt-1 text-xs text-red-300 hover:text-red-200 underline">Reset</button>
        </div>
      )}

      {/* Preview */}
      {state === 'preview' && asset && (
        <div className="space-y-3">
          {tab === '3d' && asset.file_path ? (
            <ModelViewer modelUrl={asset.file_path} height="300px" />
          ) : tab === '2d' && asset.file_path ? (
            <ImagePreview imageUrl={asset.file_path} alt={`${entityType} concept art`} height="300px" />
          ) : null}

          <div className="flex items-center gap-2">
            <button onClick={reset} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
            {entityId && (
              <button onClick={linkAsset} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors">
                <Link2 className="w-3 h-3" /> Link to Entity
              </button>
            )}
          </div>
        </div>
      )}

      {/* Linked success */}
      {state === 'linked' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-green-400">Asset linked successfully!</p>
          <button onClick={reset} className="text-xs text-green-300 hover:text-green-200 underline">Generate another</button>
        </div>
      )}
    </div>
  );
}
