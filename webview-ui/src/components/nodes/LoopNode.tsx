import { Handle, Position } from 'reactflow';

interface LoopNodeData {
  condition?: string;
  loopType: 'for' | 'while';
}

export function LoopNode({ data }: { data: LoopNodeData }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '12px',
        background: '#14b8a6',
        border: '3px solid #0d9488',
        color: '#fff',
        minWidth: '150px',
        position: 'relative',
      }}
    >
      {/* 初回入力用ハンドル */}
      <Handle
        type="target"
        position={Position.Top}
        id="entry"
      />

      {/* バックエッジ用ハンドル（ループ本体から戻る） */}
      <Handle
        type="target"
        position={Position.Left}
        id="loop"
        style={{ background: '#14b8a6' }}
      />

      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        {data.loopType === 'for' ? '🔁 For Loop' : '🔁 While Loop'}
      </div>

      {data.condition && (
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          {data.condition}
        </div>
      )}

      {/* ループ継続（ループ本体へ） */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="continue"
        style={{ background: '#10b981' }}
      />

      {/* ループ終了 */}
      <Handle
        type="source"
        position={Position.Right}
        id="exit"
        style={{ background: '#ef4444' }}
      />
    </div>
  );
}
