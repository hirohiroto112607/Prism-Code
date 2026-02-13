import { useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { vscode } from '../vscode-api';

interface MacroViewProps {
  // 将来的にAIから受け取るデータの型
  data?: any;
}

// 仮データ: 機能単位でグループ化されたフローチャート
const MOCK_NODES: Node[] = [
  // 機能1: ユーザー認証
  {
    id: 'func-auth',
    type: 'group',
    position: { x: 50, y: 50 },
    data: { label: '機能: ユーザー認証' },
    style: {
      width: 350,
      height: 400,
      background: 'rgba(102, 126, 234, 0.1)',
      border: '2px solid #667eea',
      borderRadius: '12px',
      padding: '20px',
    },
  },
  {
    id: 'auth-1',
    type: 'default',
    position: { x: 25, y: 80 },
    data: { label: 'ログイン画面表示' },
    parentNode: 'func-auth',
    style: {
      background: '#667eea',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },
  {
    id: 'auth-2',
    type: 'default',
    position: { x: 25, y: 160 },
    data: { label: '認証情報検証' },
    parentNode: 'func-auth',
    style: {
      background: '#667eea',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },
  {
    id: 'auth-3',
    type: 'default',
    position: { x: 25, y: 240 },
    data: { label: 'トークン生成' },
    parentNode: 'func-auth',
    style: {
      background: '#667eea',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },
  {
    id: 'auth-4',
    type: 'default',
    position: { x: 25, y: 320 },
    data: { label: 'セッション確立' },
    parentNode: 'func-auth',
    style: {
      background: '#667eea',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },

  // 機能2: データ処理
  {
    id: 'func-data',
    type: 'group',
    position: { x: 500, y: 50 },
    data: { label: '機能: データ処理' },
    style: {
      width: 350,
      height: 400,
      background: 'rgba(118, 75, 162, 0.1)',
      border: '2px solid #764ba2',
      borderRadius: '12px',
      padding: '20px',
    },
  },
  {
    id: 'data-1',
    type: 'default',
    position: { x: 25, y: 80 },
    data: { label: 'データ取得' },
    parentNode: 'func-data',
    style: {
      background: '#764ba2',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },
  {
    id: 'data-2',
    type: 'default',
    position: { x: 25, y: 160 },
    data: { label: 'データ変換' },
    parentNode: 'func-data',
    style: {
      background: '#764ba2',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },
  {
    id: 'data-3',
    type: 'default',
    position: { x: 25, y: 240 },
    data: { label: 'データ保存' },
    parentNode: 'func-data',
    style: {
      background: '#764ba2',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },

  // 機能3: エラーハンドリング
  {
    id: 'func-error',
    type: 'group',
    position: { x: 950, y: 50 },
    data: { label: '機能: エラーハンドリング' },
    style: {
      width: 350,
      height: 300,
      background: 'rgba(239, 68, 68, 0.1)',
      border: '2px solid #ef4444',
      borderRadius: '12px',
      padding: '20px',
    },
  },
  {
    id: 'error-1',
    type: 'default',
    position: { x: 25, y: 80 },
    data: { label: 'エラー検知' },
    parentNode: 'func-error',
    style: {
      background: '#ef4444',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },
  {
    id: 'error-2',
    type: 'default',
    position: { x: 25, y: 160 },
    data: { label: 'ログ出力' },
    parentNode: 'func-error',
    style: {
      background: '#ef4444',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '10px',
    },
  },
];

const MOCK_EDGES: Edge[] = [
  // 認証機能内のフロー
  { id: 'e-auth-1-2', source: 'auth-1', target: 'auth-2', animated: true },
  { id: 'e-auth-2-3', source: 'auth-2', target: 'auth-3', animated: true },
  { id: 'e-auth-3-4', source: 'auth-3', target: 'auth-4', animated: true },

  // データ処理機能内のフロー
  { id: 'e-data-1-2', source: 'data-1', target: 'data-2', animated: true },
  { id: 'e-data-2-3', source: 'data-2', target: 'data-3', animated: true },

  // エラーハンドリング機能内のフロー
  { id: 'e-error-1-2', source: 'error-1', target: 'error-2', animated: true },

  // 機能間の連携
  {
    id: 'e-auth-data',
    source: 'auth-4',
    target: 'data-1',
    label: '認証成功後',
    style: { stroke: '#10b981', strokeWidth: 3 },
    animated: true,
  },
  {
    id: 'e-auth-error',
    source: 'auth-2',
    target: 'error-1',
    label: '認証失敗',
    style: { stroke: '#ef4444', strokeWidth: 3 },
    animated: true,
  },
  {
    id: 'e-data-error',
    source: 'data-3',
    target: 'error-1',
    label: 'データエラー',
    style: { stroke: '#ef4444', strokeWidth: 3 },
    animated: true,
  },
];

export function MacroView({ data }: MacroViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(MOCK_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(MOCK_EDGES);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'group') {
      setSelectedFeature(node.id);
    }
  }, []);

  const switchToMicroView = useCallback(() => {
    vscode.postMessage({ type: 'switchViewMode', viewMode: 'micro' });
  }, []);

  const switchToOverviewView = useCallback(() => {
    vscode.postMessage({ type: 'switchViewMode', viewMode: 'overview' });
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1e1e1e' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        style={{ background: '#1e1e1e' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#404040" />
        <Controls />

        {/* パネル: 説明 */}
        <Panel position="top-left">
          <div
            style={{
              background: 'rgba(30, 30, 30, 0.95)',
              padding: '15px 20px',
              borderRadius: '8px',
              border: '1px solid #667eea',
              color: '#e0e0e0',
              maxWidth: '400px',
            }}
          >
            <h2
              style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#667eea',
              }}
            >
              🔭 マクロビュー（機能単位）
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
              機能単位でグループ化されたフローチャートを表示しています。
              <br />
              将来的にAIが自動的に機能を分類・可視化します。
            </p>
          </div>
        </Panel>

        {/* パネル: ビュー切替 */}
        <Panel position="bottom-left">
          <div
            style={{
              background: 'rgba(30, 30, 30, 0.95)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #404040',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#9ca3af',
                marginBottom: '4px',
              }}
            >
              ビュー切替
            </div>
            <button
              onClick={switchToMicroView}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff',
                background: '#60a5fa',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🔬 ミクロビュー
            </button>
            <button
              onClick={switchToOverviewView}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff',
                background: '#764ba2',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📊 概要ビュー
            </button>
          </div>
        </Panel>

        {/* パネル: 選択中の機能 */}
        {selectedFeature && (
          <Panel position="top-right">
            <div
              style={{
                background: 'rgba(30, 30, 30, 0.95)',
                padding: '15px 20px',
                borderRadius: '8px',
                border: '1px solid #10b981',
                color: '#e0e0e0',
                minWidth: '250px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#10b981',
                }}
              >
                選択中: {selectedFeature}
              </h3>
              <button
                onClick={() => setSelectedFeature(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#fff',
                  background: '#667eea',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                選択解除
              </button>
            </div>
          </Panel>
        )}

        {/* パネル: 凡例 */}
        <Panel position="bottom-right">
          <div
            style={{
              background: 'rgba(30, 30, 30, 0.95)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #404040',
              color: '#e0e0e0',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
              凡例
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    background: '#667eea',
                    borderRadius: '4px',
                  }}
                />
                <span>認証機能</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    background: '#764ba2',
                    borderRadius: '4px',
                  }}
                />
                <span>データ処理</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    background: '#ef4444',
                    borderRadius: '4px',
                  }}
                />
                <span>エラーハンドリング</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
