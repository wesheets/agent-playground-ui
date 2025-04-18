import React, { useState, useEffect } from 'react';
import AgentTimeline from '../components/AgentTimeline';
import FileTree from '../components/FileTree';
import PlaygroundStatusPanel from '../components/PlaygroundStatusPanel';

export default function Playground() {
  const [projectId, setProjectId] = useState('loop_validation_001');
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjectStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://web-production-2639.up.railway.app'}/api/project/${projectId}/status`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project status: ${response.status}`);
        }
        
        const data = await response.json();
        setProjectData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching project status:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchProjectStatus();
    
    // Then set up polling every 5 seconds
    const intervalId = setInterval(fetchProjectStatus, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [projectId]);

  return (
    <div className="playground-container" style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <PlaygroundStatusPanel 
        projectId={projectId}
        loopCount={projectData?.loop_count || 0}
        nextStep={projectData?.next_recommended_step || 'Initializing...'}
      />
      
      <div className="playground-content" style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Left Panel - Agent Feed (70% on desktop, 100% on mobile) */}
        <div className="agent-feed-panel" style={{
          flex: '1 1 70%',
          minWidth: '300px',
          padding: '20px',
          overflowY: 'auto',
          borderRight: '1px solid #333',
          order: 1
        }}>
          {loading && !projectData ? (
            <div className="loading">Loading agent data...</div>
          ) : error ? (
            <div className="error" style={{ color: 'var(--error)' }}>Error: {error}</div>
          ) : (
            <AgentTimeline 
              completedSteps={projectData?.completed_steps || []}
              lastCompletedAgent={projectData?.last_completed_agent}
            />
          )}
        </div>
        
        {/* Right Panel - File Tree (30% on desktop, 100% on mobile) */}
        <div className="file-tree-panel" style={{
          flex: '1 1 30%',
          minWidth: '250px',
          padding: '20px',
          backgroundColor: 'var(--secondary-bg)',
          overflowY: 'auto',
          order: 2
        }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--highlight)' }}>
            Generated Files
          </h3>
          {loading && !projectData ? (
            <div className="loading">Loading file tree...</div>
          ) : error ? (
            <div className="error" style={{ color: 'var(--error)' }}>Error: {error}</div>
          ) : (
            <FileTree files={projectData?.files_created || []} />
          )}
        </div>
      </div>
    </div>
  );
}
