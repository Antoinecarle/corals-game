import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei';
import { Loader2 } from 'lucide-react';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

interface ModelViewerProps {
  modelUrl: string;
  height?: string;
  autoRotate?: boolean;
}

export default function ModelViewer({ modelUrl, height = '300px', autoRotate = true }: ModelViewerProps) {
  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-800 border border-gray-700" style={{ height }}>
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-400">Loading model...</span>
        </div>
      }>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Stage environment="city" intensity={0.5}>
            <Model url={modelUrl} />
          </Stage>
          <OrbitControls autoRotate={autoRotate} autoRotateSpeed={2} />
          <gridHelper args={[10, 10, '#333', '#222']} />
        </Canvas>
      </Suspense>
    </div>
  );
}
