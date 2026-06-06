import React from 'react';

export default function Loader({ text = "Loading..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 20,
          padding: 30,
          textAlign: 'center',
          backdropFilter: 'blur(20px)'
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent-indian)',
            margin: '0 auto 15px',
            animation: 'spin 1s linear infinite'
          }}
        />

        <div style={{ fontSize: 12 }}>{text}</div>

        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
}