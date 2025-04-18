import React from 'react';

const AgentTimeline = ({ completedSteps = [], lastCompletedAgent = null }) => {
  // Agent emoji mapping
  const agentEmojis = {
    hal: '🤖',
    nova: '🎨',
    critic: '🔍',
    ash: '📝',
    sage: '🧠',
    orchestrator: '🎭'
  };

  // Agent output mapping - simulated conversational outputs based on agent type
  const getAgentOutput = (agent) => {
    switch (agent) {
      case 'hal':
        return 'HAL created the initial project structure and implemented core functionality.';
      case 'nova':
        return 'NOVA designed and implemented the UI components for the application.';
      case 'critic':
        return 'CRITIC reviewed the code and suggested improvements for better performance and readability.';
      case 'ash':
        return 'ASH documented the project structure and created setup instructions.';
      case 'sage':
        return 'SAGE analyzed the project and provided a comprehensive summary of its functionality.';
      case 'orchestrator':
        return 'ORCHESTRATOR planned the project execution and assigned tasks to specialized agents.';
      default:
        return `${agent.toUpperCase()} completed its assigned tasks.`;
    }
  };

  return (
    <div className="agent-timeline">
      <h2 style={{ marginBottom: '20px', color: 'var(--highlight)' }}>Agent Activity</h2>
      
      {completedSteps.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '40px 0' }}>
          <p>No agent activity yet. Waiting for agents to start working...</p>
          <div className="cursor"></div>
        </div>
      ) : (
        <div className="timeline">
          {completedSteps.map((agent, index) => (
            <div 
              key={`${agent}-${index}`} 
              className="timeline-item fade-in"
              style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: 'var(--secondary-bg)',
                borderRadius: '4px',
                borderLeft: agent === lastCompletedAgent ? '4px solid var(--highlight)' : '4px solid transparent',
                animation: `fadeIn 0.5s ease forwards ${index * 0.1}s`
              }}
            >
              <div className="agent-header" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px' 
              }}>
                <span className="agent-emoji" style={{ fontSize: '24px', marginRight: '8px' }}>
                  {agentEmojis[agent] || '🤖'}
                </span>
                <h3 style={{ margin: 0 }}>
                  {agent.toUpperCase()}
                </h3>
                <span 
                  className="status-badge"
                  style={{
                    marginLeft: 'auto',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: agent === lastCompletedAgent ? 'var(--highlight)' : 'var(--border)',
                    color: agent === lastCompletedAgent ? 'var(--background)' : 'var(--text)'
                  }}
                >
                  {agent === lastCompletedAgent ? 'Latest' : 'Complete'}
                </span>
              </div>
              
              <div className="agent-output" style={{ lineHeight: '1.5' }}>
                <p>{getAgentOutput(agent)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentTimeline;
