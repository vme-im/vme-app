'use client'

// 全局错误边界：连根布局都抛错时（error.tsx 无法捕获根布局错误）的最后兜底。
// 它会替换整个根布局，故必须自带 <html>/<body>；用内联样式以免依赖未加载的全局 CSS。
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FBF3E4',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          padding: '16px',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            background: '#fff',
            border: '4px solid #000',
            boxShadow: '8px 8px 0 0 #000',
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '56px',
              fontWeight: 900,
              fontStyle: 'italic',
              color: '#C41200',
              margin: 0,
              textShadow: '4px 4px 0 #000',
            }}
          >
            🍗 打烊中
          </p>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#000', marginTop: '16px' }}>
            服务器正在小憩
          </h1>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#333', marginTop: '12px' }}>
            疯四的服务器吃太饱睡着了，文案稍后回来。
          </p>

          <div
            style={{
              marginTop: '28px',
              background: '#FFC72C',
              border: '3px solid #000',
              boxShadow: '4px 4px 0 0 #000',
              padding: '20px',
            }}
          >
            <p
              style={{
                fontSize: '15px',
                fontWeight: 700,
                fontStyle: 'italic',
                color: '#000',
                margin: 0,
              }}
            >
              “要不先 V 我 50 醒醒神？回头一定加倍把文案端上来。”
            </p>
          </div>

          <button
            onClick={reset}
            style={{
              marginTop: '32px',
              background: '#C41200',
              color: '#fff',
              border: '3px solid #000',
              boxShadow: '4px 4px 0 0 #000',
              padding: '12px 24px',
              fontWeight: 900,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            再试一次 / Retry
          </button>
        </div>
      </body>
    </html>
  )
}
