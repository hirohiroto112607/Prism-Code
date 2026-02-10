import { Handle, Position } from 'reactflow';

interface EndNodeData {
  label: string;
}

export function EndNode({ data }: { data: EndNodeData }) {
  return (
    <div
      style={{
        padding: '12px 20px',
        borderRadius: '20px',
        background: '#ef4444',
        border: '2px solid #dc2626',
        color: '#fff',
        fontWeight: 'bold',
        minWidth: '120px',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
    </div>
  );
}
