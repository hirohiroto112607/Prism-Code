import { Handle, Position } from 'reactflow';

interface StartNodeData {
  label: string;
}

export function StartNode({ data }: { data: StartNodeData }) {
  return (
    <div
      style={{
        padding: '12px 20px',
        borderRadius: '20px',
        background: '#4ade80',
        border: '2px solid #22c55e',
        color: '#fff',
        fontWeight: 'bold',
        minWidth: '120px',
        textAlign: 'center',
      }}
    >
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
