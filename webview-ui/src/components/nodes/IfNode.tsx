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
        minWidth: '150px',
      }}
    >
      <Handle type="target" position={Position.Top} />

      {/* ダイヤモンド型の背景 */}
      <div
        style={{
          width: '120px',
          height: '120px',
          background: '#f472b6',
          border: '2px solid #ec4899',
          transform: 'rotate(45deg)',
          position: 'absolute',
          top: '-10px',
          left: '15px',
        }}
      />

      {/* テキスト */}
      <div
        style={{
          position: 'relative',
          padding: '40px 20px',
          color: '#fff',
          fontWeight: 'bold',
          textAlign: 'center',
          fontSize: '13px',
          wordBreak: 'break-word',
        }}
      >
        {data.condition}
      </div>

      {/* True/False用のハンドル */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '50%', right: '-10px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ bottom: '-10px' }}
      />
    </div>
  );
}
