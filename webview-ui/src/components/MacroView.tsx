import { MacroViewData } from '../types/ir';

interface MacroViewProps {
  data: MacroViewData;
}

export function MacroView({ data }: MacroViewProps) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#1e1e1e',
        color: '#e0e0e0',
        padding: '20px',
        overflow: 'auto',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          marginBottom: '30px',
          borderBottom: '2px solid #667eea',
          paddingBottom: '15px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#667eea',
          }}
        >
          🔭 マクロビュー（俯瞰）
        </h1>
        <p
          style={{
            margin: '5px 0 0 0',
            fontSize: '14px',
            color: '#9ca3af',
          }}
        >
          {data.metadata.sourceFile.split('/').pop()} - システム全体の構造を表示
        </p>
      </div>

      {/* 統計情報 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '30px',
        }}
      >
        <StatCard
          title="関数数"
          value={data.functions.length}
          icon="📊"
          color="#667eea"
        />
        <StatCard
          title="関数呼び出し"
          value={data.callGraph.length}
          icon="🔗"
          color="#764ba2"
        />
        <StatCard
          title="平均行数"
          value={Math.round(
            data.functions.reduce((sum, f) => sum + f.lineCount, 0) /
              data.functions.length || 0
          )}
          icon="📝"
          color="#f59e0b"
        />
        <StatCard
          title="平均複雑度"
          value={Math.round(
            data.functions.reduce((sum, f) => sum + f.complexity, 0) /
              data.functions.length || 0
          )}
          icon="⚙️"
          color="#ef4444"
        />
      </div>

      {/* 関数一覧 */}
      <div style={{ marginBottom: '30px' }}>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#60a5fa',
          }}
        >
          関数一覧
        </h2>
        <div
          style={{
            display: 'grid',
            gap: '15px',
          }}
        >
          {data.functions.map((func) => (
            <FunctionCard key={func.id} func={func} />
          ))}
        </div>
      </div>

      {/* 関数呼び出しグラフ */}
      {data.callGraph.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '15px',
              color: '#60a5fa',
            }}
          >
            関数呼び出し関係
          </h2>
          <div
            style={{
              background: '#2d2d2d',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #404040',
            }}
          >
            {data.callGraph.map((call) => (
              <div
                key={call.id}
                style={{
                  padding: '10px',
                  marginBottom: '10px',
                  background: '#1e1e1e',
                  borderRadius: '6px',
                  borderLeft: '3px solid #667eea',
                  fontSize: '14px',
                }}
              >
                <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                  {call.caller}
                </span>
                <span style={{ color: '#9ca3af', margin: '0 10px' }}>→</span>
                <span style={{ color: '#a78bfa' }}>{call.callee}()</span>
                <span
                  style={{
                    color: '#6b7280',
                    fontSize: '12px',
                    marginLeft: '10px',
                  }}
                >
                  (line {call.location.start.line})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* フッター */}
      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '12px',
          borderTop: '1px solid #404040',
        }}
      >
        💡 ヒント: コマンドパレットから「ミクロビュー(詳細)」に切り替えて、各関数の詳細なフローチャートを表示できます
      </div>
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: '#2d2d2d',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #404040',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color,
          marginBottom: '5px',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '14px', color: '#9ca3af' }}>{title}</div>
    </div>
  );
}

// 関数カードコンポーネント
function FunctionCard({ func }: { func: any }) {
  return (
    <div
      style={{
        background: '#2d2d2d',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #404040',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#60a5fa',
            }}
          >
            {func.name}
          </h3>
          <div
            style={{
              fontSize: '13px',
              color: '#9ca3af',
              marginTop: '5px',
            }}
          >
            ({func.parameters.join(', ')})
            {func.returnType && (
              <span style={{ color: '#a78bfa' }}> → {func.returnType}</span>
            )}
          </div>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          行 {func.location.start.line}-{func.location.end.line}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Badge
          label={`${func.lineCount}行`}
          color="#f59e0b"
        />
        <Badge
          label={`複雑度: ${func.complexity}`}
          color={func.complexity > 5 ? '#ef4444' : '#10b981'}
        />
        {func.hasLoops && <Badge label="ループあり" color="#667eea" />}
        {func.hasConditionals && <Badge label="条件分岐あり" color="#764ba2" />}
      </div>
    </div>
  );
}

// バッジコンポーネント
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}
