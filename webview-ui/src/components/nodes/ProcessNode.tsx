import { Handle, Position } from 'reactflow';

interface ProcessNodeData {
  label: string;
  details?: string;
  nodeType: 'variable' | 'return' | 'expression';
}

export function ProcessNode({ data }: { data: ProcessNodeData }) {
  const getColor = () => {
    switch (data.nodeType) {
      case 'variable':
        return { bg: '#fbbf24', border: '#f59e0b' };
      case 'return':
        return { bg: '#a78bfa', border: '#8b5cf6' };
      default:
        return { bg: '#60a5fa', border: '#3b82f6' };
    }
  };

  const colors = getColor();

  return (
    <div
      style={{
        padding: '10px 16px',
        borderRadius: '8px',
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        color: '#fff',
        minWidth: '150px',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        {data.label}
      </div>
      {data.details && (
        <div style={{ fontSize: '11px', opacity: 0.9 }}>{data.details}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
