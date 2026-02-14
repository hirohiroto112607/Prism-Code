import { Handle, Position } from 'reactflow';

interface IfNodeData {
  condition: string;
}

export function IfNode({ data }: { data: IfNodeData }) {
  return (
    <div
      style={{
        padding: '0',
        position: 'relative',
        width: '160px',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 上部のハンドル（入力） */}
      <Handle type="target" position={Position.Top} style={{ top: '5px' }} />

      {/* ダイヤモンド型の背景 */}
      <div
        style={{
          width: '130px',
          height: '130px',
          background: '#f472b6',
          border: '2px solid #ec4899',
          transform: 'rotate(45deg)',
          position: 'absolute',
          top: '15px',
          left: '15px',
        }}
      />

      {/* テキスト */}
      <div
        style={{
          position: 'relative',
          color: '#fff',
          fontWeight: 'bold',
          textAlign: 'center',
          fontSize: '13px',
          wordBreak: 'break-word',
          maxWidth: '90px',
          zIndex: 1,
        }}
      >
        {data.condition}
      </div>

      {/* True用のハンドル（下部左） */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '20%', background: '#10b981' }}
      />

      {/* False用のハンドル（下部右） */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '80%', background: '#ef4444' }}
      />
    </div>
  );
}
