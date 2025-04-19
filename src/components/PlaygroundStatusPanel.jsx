import React from 'react';

const PlaygroundStatusPanel = ({ 
  projectId, 
  projectList = [], 
  onProjectChange, 
  onResetView,
  loopCount, 
  nextStep,
  lastCompletedAgent 
}) => {
  return (
    <div className="playground-status-panel" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderBottom: '1px solid #333',
      backgroundColor: 'var(--secondary-bg)'
    }}>
      {/* Left side - Loop Badge and Project Selector */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div 
          className="loop-badge glow"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid var(--highlight)',
            backgroundColor: 'rgba(0, 255, 200, 0.1)',
            marginRight: '15px'
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
        
        {/* Project Selector Dropdown */}
        <div className="project-selector" style={{ marginLeft: '10px' }}>
          <select 
            value={projectId || ''}
            onChange={(e) => onProjectChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--background)',
              color: 'var(--text)',
              border: '1px solid #333',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Select Project</option>
            {projectList.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Center - Last Completed Agent */}
      {lastCompletedAgent && (
        <div className="last-agent" style={{ 
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center'
        }}>
          Last Agent: 
          <span style={{ 
            color: 'var(--highlight)',
            marginLeft: '5px',
            padding: '2px 6px',
            backgroundColor: 'rgba(0, 255, 200, 0.1)',
            borderRadius: '4px'
          }}>
            {lastCompletedAgent.toUpperCase()}
          </span>
        </div>
      )}
      
      {/* Right side - Next Step Status and Reset Button */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div 
          className="next-step"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px',
            borderRadius: '4px',
            backgroundColor: 'var(--background)',
            border: '1px solid #333',
            marginRight: '10px'
          }}
        >
          <span style={{ marginRight: '8px' }}>🧠 Next:</span>
          <span>{nextStep}</span>
          <span className="cursor"></span>
        </div>
        
        {/* Reset Button */}
        <button 
          onClick={onResetView}
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--background)',
            color: 'var(--text)',
            border: '1px solid #333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Reset View
        </button>
      </div>
    </div>
  );
};

export default PlaygroundStatusPanel;
