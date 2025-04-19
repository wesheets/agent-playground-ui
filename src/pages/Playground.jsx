import React, { useState, useEffect } from 'react';
import AgentTimeline from '../components/AgentTimeline';
import FileTree from '../components/FileTree';
import PlaygroundStatusPanel from '../components/PlaygroundStatusPanel';

export default function Playground() {
  const [projectId, setProjectId] = useState('loop_validation_001');
  const [projectData, setProjectData] = useState(null);
  const [projectState, setProjectState] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);

  // Reset view function
  const handleResetView = () => {
    setProjectId(null);
    setProjectData(null);
    setProjectState(null);
    setSelectedFile(null);
    setFileContent(null);
    setActivityFeed([]);
  };

  // Handle project selection
  const handleProjectChange = (newProjectId) => {
    setProjectId(newProjectId);
    setSelectedFile(null);
    setFileContent(null);
  };

  // Download ZIP function
  const handleDownloadZip = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-2639.up.railway.app';
      const response = await fetch(`${apiUrl}/api/project/export_zip?project_id=${projectId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to download ZIP: ${response.status}`);
      }
      
      // Convert response to blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${projectId}.zip`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading ZIP:', err);
      setError(`Download failed: ${err.message}`);
    }
  };

  // Fetch project list (for dropdown)
  useEffect(() => {
    const fetchProjectList = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-2639.up.railway.app';
        // This is a mock endpoint - in a real implementation, you would have an endpoint that returns all projects
        // For now, we'll just use a hardcoded list
        setProjectList(['loop_validation_001', 'loop_validation_002', 'loop_003_autospawned']);
      } catch (err) {
        console.error('Error fetching project list:', err);
      }
    };

    fetchProjectList();
  }, []);

  // Fetch project status
  useEffect(() => {
    if (!projectId) return;

    const fetchProjectStatus = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-2639.up.railway.app';
        const response = await fetch(`${apiUrl}/api/system/status?project_id=${projectId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.project_state) {
          setProjectData(data.project_state);
          
          // Update activity feed with new actions
          const newAction = {
            timestamp: new Date().toISOString(),
            agent: data.project_state.last_completed_agent || 'system',
            action: `Updated project state`,
            details: data.project_state.next_recommended_step || 'No details available'
          };
          
          setActivityFeed(prev => {
            const updatedFeed = [newAction, ...prev];
            return updatedFeed.slice(0, 10); // Keep only the last 10 actions
          });
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching project status:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch project state
    const fetchProjectState = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-2639.up.railway.app';
        const response = await fetch(`${apiUrl}/api/project/state?project_id=${projectId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project state: ${response.status}`);
        }
        
        const data = await response.json();
        setProjectState(data);
      } catch (err) {
        console.error('Error fetching project state:', err);
      }
    };

    // Fetch immediately on mount or projectId change
    fetchProjectStatus();
    fetchProjectState();
    
    // Then set up polling every 5 seconds
    const statusIntervalId = setInterval(fetchProjectStatus, 5000);
    const stateIntervalId = setInterval(fetchProjectState, 10000);
    
    // Clean up intervals on unmount or projectId change
    return () => {
      clearInterval(statusIntervalId);
      clearInterval(stateIntervalId);
    };
  }, [projectId]);

  // Handle file selection
  const handleFileSelect = async (filePath) => {
    setSelectedFile(filePath);
    try {
      // In a real implementation, you would fetch the file content from an API
      // For now, we'll just set a mock content
      setFileContent(`Content of ${filePath} would be displayed here.`);
    } catch (err) {
      console.error('Error fetching file content:', err);
      setFileContent(`Error loading file: ${err.message}`);
    }
  };

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
        projectList={projectList}
        onProjectChange={handleProjectChange}
        onResetView={handleResetView}
        loopCount={projectData?.loop_count || 0}
        nextStep={projectData?.next_recommended_step || 'Initializing...'}
        lastCompletedAgent={projectData?.last_completed_agent || 'None'}
      />
      
      {!projectId ? (
        <div className="ready-state" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '20px'
        }}>
          <h2 style={{ color: 'var(--highlight)' }}>Select a project to begin cognition playback</h2>
          <p>Choose a project from the dropdown above to view its status and files.</p>
        </div>
      ) : (
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
              <>
                <AgentTimeline 
                  completedSteps={projectData?.completed_steps || []}
                  lastCompletedAgent={projectData?.last_completed_agent}
                  activityFeed={activityFeed}
                />
                
                {/* Loop Activity Feed */}
                <div className="activity-feed" style={{
                  marginTop: '30px',
                  padding: '15px',
                  backgroundColor: 'var(--secondary-bg)',
                  borderRadius: '4px'
                }}>
                  <h3 style={{ marginBottom: '15px', color: 'var(--highlight)' }}>
                    🔁 Loop Activity Feed
                  </h3>
                  
                  {activityFeed.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '10px 0' }}>
                      <p>No activity recorded yet.</p>
                    </div>
                  ) : (
                    <div className="feed-items">
                      {activityFeed.map((item, index) => (
                        <div key={index} className="feed-item" style={{
                          padding: '8px 0',
                          borderBottom: index < activityFeed.length - 1 ? '1px solid #333' : 'none',
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}>
                          <div className="feed-icon" style={{ marginRight: '10px', fontSize: '18px' }}>
                            {item.agent === 'hal' ? '🤖' : 
                             item.agent === 'nova' ? '🎨' : 
                             item.agent === 'critic' ? '🔍' : 
                             item.agent === 'ash' ? '📝' : 
                             item.agent === 'sage' ? '🧠' : 
                             item.agent === 'orchestrator' ? '🎭' : '🔁'}
                          </div>
                          <div className="feed-content" style={{ flex: 1 }}>
                            <div className="feed-header" style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginBottom: '4px'
                            }}>
                              <span>{item.agent.toUpperCase()}</span>
                              <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="feed-message">{item.action}</div>
                            {item.details && (
                              <div className="feed-details" style={{ 
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginTop: '4px'
                              }}>
                                {item.details}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
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
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ color: 'var(--highlight)', margin: 0 }}>
                Generated Files
              </h3>
              
              <button 
                onClick={handleDownloadZip}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--highlight)',
                  color: 'var(--background)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ marginRight: '6px' }}>⬇️</span>
                Download ZIP
              </button>
            </div>
            
            {loading && !projectState ? (
              <div className="loading">Loading file tree...</div>
            ) : error ? (
              <div className="error" style={{ color: 'var(--error)' }}>Error: {error}</div>
            ) : (
              <>
                <FileTree 
                  files={projectState?.files_created || []} 
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                />
                
                {/* File Preview */}
                {selectedFile && (
                  <div className="file-preview" style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '4px',
                    border: '1px solid #333'
                  }}>
                    <h4 style={{ marginTop: 0, marginBottom: '10px' }}>
                      {selectedFile}
                    </h4>
                    <pre style={{
                      backgroundColor: 'var(--background)',
                      padding: '10px',
                      borderRadius: '4px',
                      overflowX: 'auto',
                      fontSize: '12px',
                      lineHeight: 1.5
                    }}>
                      {fileContent}
                    </pre>
                  </div>
                )}
                
                {/* Documentation Section */}
                {projectState?.docs_generated && projectState.docs_generated.length > 0 && (
                  <div className="docs-section" style={{
                    marginTop: '30px',
                    padding: '15px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '4px',
                    border: '1px solid #333'
                  }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--highlight)' }}>
                      Documentation
                    </h3>
                    
                    {projectState.docs_generated.map((doc, index) => (
                      <div key={index} className="doc-item" style={{
                        marginBottom: '15px',
                        padding: '10px',
                        backgroundColor: 'var(--secondary-bg)',
                        borderRadius: '4px'
                      }}>
                        <h4 style={{ marginTop: 0, marginBottom: '10px' }}>
                          {doc.title || `Document ${index + 1}`}
                        </h4>
                        <div className="markdown-content" style={{
                          lineHeight: 1.5
                        }}>
                          {doc.content || 'No content available'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Feedback Section */}
                {projectState?.feedback_log && projectState.feedback_log.length > 0 && (
                  <div className="feedback-section" style={{
                    marginTop: '30px',
                    padding: '15px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '4px',
                    border: '1px solid #333'
                  }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--highlight)' }}>
                      Feedback Log
                    </h3>
                    
                    {projectState.feedback_log.map((feedback, index) => (
                      <div key={index} className="feedback-item" style={{
                        marginBottom: '15px',
                        padding: '10px',
                        backgroundColor: 'var(--secondary-bg)',
                        borderRadius: '4px',
                        borderLeft: '4px solid var(--highlight)'
                      }}>
                        <div className="feedback-header" style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <h4 style={{ margin: 0 }}>
                            {feedback.title || `Feedback ${index + 1}`}
                          </h4>
                          <span style={{ 
                            padding: '2px 6px',
                            backgroundColor: 'var(--highlight)',
                            color: 'var(--background)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {feedback.type || 'CRITIC'}
                          </span>
                        </div>
                        <div className="feedback-content" style={{
                          lineHeight: 1.5
                        }}>
                          {feedback.content || 'No content available'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
