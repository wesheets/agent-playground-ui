import React from 'react';

const PlaygroundStatusPanel = ({ projectId, loopCount, nextStep }) => {
  return (
    <div className="playground-status-panel" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderBottom: '1px solid #333',
      backgroundColor: 'var(--secondary-bg)'
    }}>
      {/* Left side - Loop Badge */}
      <div 
        className="loop-badge glow"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          borderRadius: '4px',
          border: '1px solid var(--highlight)',
          backgroundColor: 'rgba(0, 255, 200, 0.1)'
        }}
      >
        <span style={{ marginRight: '8px' }}>Loop Mode: Active</span>
        <span style={{ 
          backgroundColor: 'var(--highlight)',
          color: 'var(--background)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          Loop: {loopCount}
        </span>
      </div>
      
      {/* Center - Project ID */}
      <div className="project-id" style={{ color: 'var(--text)' }}>
        Project: <span style={{ color: 'var(--highlight)' }}>{projectId}</span>
      </div>
      
      {/* Right side - Next Step Status */}
      <div 
        className="next-step"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          borderRadius: '4px',
          backgroundColor: 'var(--background)',
          border: '1px solid #333'
        }}
      >
        <span style={{ marginRight: '8px' }}>🧠 Next:</span>
        <span>{nextStep}</span>
        <span className="cursor"></span>
      </div>
    </div>
  );
};

export default PlaygroundStatusPanel;
