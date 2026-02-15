import { useEffect, useState } from 'react';
import { FlowChart } from './components/FlowChart';
import { MacroView } from './components/MacroView';
import { IR } from './types/ir';
import { convertIRToReactFlow } from './utils/flowConverter';
import { Node, Edge } from 'reactflow';
import { vscode } from './vscode-api';

type ViewMode = 'micro' | 'macro';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('micro');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [macroData, setMacroData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 可視化ボタンのクリックハンドラ
  const handleVisualize = () => {
    vscode.postMessage({ type: 'visualize' });
  };

  useEffect(() => {
    // Extension側からのメッセージを受信
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('📨 Message received in App:', message.type, message);

      switch (message.type) {
        case 'updateFlow': {
          try {
            const ir: IR = message.data;
            console.log('✅ updateFlow received:', {
              nodes: ir.nodes?.length,
              edges: ir.edges?.length,
              data: ir
            });
            const { nodes: flowNodes, edges: flowEdges } = convertIRToReactFlow(ir);
            console.log('✅ Converted to React Flow:', {
              nodes: flowNodes.length,
              edges: flowEdges.length
            });
            setNodes(flowNodes);
            setEdges(flowEdges);
            setViewMode('micro');
            setError(null);
            console.log('✅ State updated successfully');
          } catch (err: any) {
            setError(err.message);
            console.error('❌ フロー変換エラー:', err);
            console.error('Stack:', err.stack);
          }
          break;
        }
        case 'updateMacroView': {
          try {
            const data = message.data;
            console.log('✅ updateMacroView received:', data);
            setMacroData(data);
            setViewMode('macro');
            setError(null);
          } catch (err: any) {
            setError(err.message);
            console.error('❌ マクロビュー変換エラー:', err);
          }
          break;
        }
        default:
          console.log('⚠️  Unknown message type:', message.type);
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('📡 Message listener registered in App');

    return () => {
      window.removeEventListener('message', handleMessage);
      console.log('📡 Message listener unregistered');
    };
  }, []);

  if (error) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e1e1e',
          color: '#ef4444',
          fontSize: '16px',
          padding: '20px',
        }}
      >
        <div>
          <h2>エラーが発生しました</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // マクロビューの表示（ワークスペース俯瞰）
  if (viewMode === 'macro' && macroData) {
    return <MacroView data={macroData} />;
  }

  // ミクロビューの表示
  if (viewMode === 'micro' && nodes.length > 0) {
    console.log('Rendering FlowChart with nodes:', nodes.length, 'edges:', edges.length);
    return <FlowChart nodes={nodes} edges={edges} />;
  }

  // デバッグ: viewModeとnodesの状態を確認
  console.log('Current viewMode:', viewMode, 'nodes.length:', nodes.length);

  // 初期状態（データなし）
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e1e1e',
        color: '#9ca3af',
        fontSize: '14px',
        padding: '20px',
        gap: '20px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: '#60a5fa', marginBottom: '10px' }}>
          📊 Prism Code
        </h3>
        <p style={{ marginBottom: '20px' }}>
          TypeScriptファイルを開いて、下のボタンをクリックしてください
        </p>
      </div>

      <button
        onClick={handleVisualize}
        style={{
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#fff',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        }}
      >
        🔍 現在のファイルを可視化
      </button>

      <div
        style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '10px',
        }}
      >
        または Cmd+Shift+P →「Prism Code: コードを可視化」
      </div>
    </div>
  );
}

export default App;
