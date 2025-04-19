import React, { useState, useEffect, useRef } from 'react';
import AgentTimeline from '../components/AgentTimeline';
import FileTree from '../components/FileTree';
import PlaygroundStatusPanel from '../components/PlaygroundStatusPanel';

export default function Playground() {
  const [projectId, setProjectId] = useState(null); // Changed to null by default to show landing page
  const [projectData, setProjectData] = useState(null);
  const [projectState, setProjectState] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [orchestratorResponse, setOrchestratorResponse] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [submittingPrompt, setSubmittingPrompt] = useState(false);
  const [dotCount, setDotCount] = useState(1);
  const [brainFlicker, setBrainFlicker] = useState(true);

  // References to track previous state for activity feed optimization
  const prevLoopCountRef = useRef(0);
  const prevLastCompletedAgentRef = useRef(null);
  const prevFilesCreatedLengthRef = useRef(0);

  // Animation effects for landing page
  useEffect(() => {
    if (!projectId) {
      // Dot trail animation
      const dotInterval = setInterval(() => {
        setDotCount(prev => prev < 3 ? prev + 1 : 1);
      }, 800);
      
      // Brain flicker animation
      const flickerInterval = setInterval(() => {
        setBrainFlicker(prev => !prev);
      }, 1500);
      
      return () => {
        clearInterval(dotInterval);
        clearInterval(flickerInterval);
      };
    }
  }, [projectId]);

  // Reset view function
  const handleResetView = () => {
    setProjectId(null);
    setProjectData(null);
    setProjectState(null);
    setSelectedFile(null);
    setFileContent(null);
    setActivityFeed([]);
    setUserPrompt('');
    setOrchestratorResponse(null);
    setShowResponseModal(false);
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

  // Submit prompt to orchestrator
  const submitToOrchestrator = async () => {
    if (!userPrompt.trim()) return;
    
    try {
      setSubmittingPrompt(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-2639.up.railway.app';
      const response = await fetch(`${apiUrl}/api/orchestrator/interpret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: userPrompt
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit prompt: ${response.status}`);
      }
      
      const data = await response.json();
      setOrchestratorResponse(data);
      setShowResponseModal(true);
      
      // Add to activity feed
      const newAction = {
        timestamp: new Date().toISOString(),
        agent: 'orchestrator',
        action: `Processed user prompt`,
        details: userPrompt
      };
      
      setActivityFeed(prev => {
        const updatedFeed = [newAction, ...prev];
        return updatedFeed.slice(0, 10); // Keep only the last 10 actions
      });
      
    } catch (err) {
      console.error('Error submitting prompt:', err);
      setError(`Prompt submission failed: ${err.message}`);
    } finally {
      setSubmittingPrompt(false);
    }
  };

  // Confirm orchestrator response and start new project
  const confirmOrchestratorResponse = async () => {
    if (!orchestratorResponse) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-2639.up.railway.app';
      const response = await fetch(`${apiUrl}/api/project/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: `loop_${Date.now().toString().slice(-6)}`,
          goal: orchestratorResponse.proposed_goal,
          agent: 'orchestrator'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start project: ${response.status}`);
      }
      
      const data = await response.json();
      setShowResponseModal(false);
      setUserPrompt('');
      
      // Add to activity feed
      const newAction = {
        timestamp: new Date().toISOString(),
        agent: 'system',
        action: `Started new project`,
        details: `Goal: ${orchestratorResponse.proposed_goal}`
      };
      
      setActivityFeed(prev => {
        const updatedFeed = [newAction, ...prev];
        return updatedFeed.slice(0, 10);
      });
      
      // Optionally switch to the new project
      if (data.project_id) {
        setProjectId(data.project_id);
      }
      
    } catch (err) {
      console.error('Error starting project:', err);
      setError(`Project start failed: ${err.message}`);
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
          // Store current values for comparison
          const currentLoopCount = data.project_state.loop_count || 0;
          const currentLastCompletedAgent = data.project_state.last_completed_agent;
          const currentFilesCreatedLength = data.project_state.files_created?.length || 0;
          
          // Check if there are meaningful changes to report
          const loopCountChanged = currentLoopCount !== prevLoopCountRef.current;
          const agentChanged = currentLastCompletedAgent !== prevLastCompletedAgentRef.current && currentLastCompletedAgent;
          const filesLengthChanged = currentFilesCreatedLength !== prevFilesCreatedLengthRef.current;
          
          // Only update activity feed if there are meaningful changes
          if (loopCountChanged || agentChanged || filesLengthChanged) {
            let actionText = "Updated project state";
            let actionDetails = data.project_state.next_recommended_step || 'No details available';
            
            if (loopCountChanged) {
              actionText = `Loop count increased to ${currentLoopCount}`;
            } else if (agentChanged) {
              actionText = `Agent ${currentLastCompletedAgent.toUpperCase()} completed its task`;
            } else if (filesLengthChanged) {
              actionText = `New files created (${currentFilesCreatedLength} total)`;
            }
            
            const newAction = {
              timestamp: new Date().toISOString(),
              agent: data.project_state.last_completed_agent || 'system',
              action: actionText,
              details: actionDetails
            };
            
            setActivityFeed(prev => {
              const updatedFeed = [newAction, ...prev];
              return updatedFeed.slice(0, 10); // Keep only the last 10 actions
            });
          }
          
          // Update the refs with current values
          prevLoopCountRef.current = currentLoopCount;
          prevLastCompletedAgentRef.current = currentLastCompletedAgent;
          prevFilesCreatedLengthRef.current = currentFilesCreatedLength;
          
          // Update project data state
          setProjectData(data.project_state);
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

  // Render the cinematic intro landing page
  const renderLandingPage = () => {
    return (
      <div className="cinematic-intro" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '20px',
        textAlign: 'center',
        background: 'var(--background)',
        color: 'var(--text)'
      }}>
        <div className="brain-icon" style={{
          fontSize: '64px',
          marginBottom: '20px',
          opacity: brainFlicker ? 1 : 0.7,
          transition: 'opacity 0.3s ease'
        }}>
          🧠
        </div>
        
        <h1 style={{
          fontSize: '36px',
          marginBottom: '16px',
          color: 'var(--highlight)'
        }}>
          Welcome to Promethios
        </h1>
        
        <p style={{
          fontSize: '18px',
          maxWidth: '600px',
          marginBottom: '40px',
          lineHeight: 1.6
        }}>
          A living system of autonomous agents.<br />
          Built to think. Built to build. Built to question.
        </p>
        
        <div className="status-messages" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '40px',
          width: '100%',
          maxWidth: '500px'
        }}>
          <div className="status-item" style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '10px 20px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0, 255, 200, 0.1)',
            width: '100%'
          }}>
            <span style={{ marginRight: '10px' }}>🔁</span>
            <span>The cognition engine is active.</span>
          </div>
          
          <div className="status-item" style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '10px 20px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0, 255, 200, 0.1)',
            width: '100%'
          }}>
            <span style={{ marginRight: '10px' }}>🧠</span>
            <span>The memory is intact.</span>
          </div>
          
          <div className="status-item" style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '10px 20px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0, 255, 200, 0.1)',
            width: '100%'
          }}>
            <span style={{ marginRight: '10px' }}>🪶</span>
            <span>The loop is idle — waiting for your intention.</span>
          </div>
        </div>
        
        <p style={{
          fontSize: '16px',
          maxWidth: '600px',
          marginBottom: '30px',
          lineHeight: 1.6
        }}>
          Select a project to begin cognition playback.<br />
          Or open a prompt, and tell the system what you need.
        </p>
        
        {/* Project selector */}
        <div className="project-selector" style={{
          marginBottom: '30px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <select 
            value=""
            onChange={(e) => handleProjectChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 15px',
              backgroundColor: 'var(--background)',
              color: 'var(--text)',
              border: '1px solid var(--highlight)',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            <option value="">Select a project</option>
            {projectList.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        
        {/* Prompt input for orchestrator */}
        <div className="prompt-input" style={{
          width: '100%',
          maxWidth: '500px',
          marginBottom: '40px'
        }}>
          <textarea
            placeholder="Describe your idea or goal..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '15px',
              backgroundColor: 'var(--secondary-bg)',
              color: 'var(--text)',
              border: '1px solid #333',
              borderRadius: '4px',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: '16px',
              marginBottom: '10px'
            }}
          />
          <button
            onClick={submitToOrchestrator}
            disabled={!userPrompt.trim() || submittingPrompt}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: userPrompt.trim() && !submittingPrompt ? 'var(--highlight)' : 'var(--secondary-bg)',
              color: userPrompt.trim() && !submittingPrompt ? 'var(--background)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: userPrompt.trim() && !submittingPrompt ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: userPrompt.trim() && !submittingPrompt ? 1 : 0.7
            }}
          >
            <span style={{ marginRight: '8px' }}>🧠</span>
            {submittingPrompt ? 'Processing...' : 'Send to Orchestrator'}
          </button>
        </div>
        
        {/* Console-style subtext */}
        <div className="console-text" style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginTop: '20px'
        }}>
          <div>[ System standing by. ]</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            [ Awaiting input{'.'.repeat(dotCount)} ]
            <span className="cursor" style={{
              display: 'inline-block',
              width: '8px',
              height: '16px',
              backgroundColor: 'var(--highlight)',
              marginLeft: '5px',
              animation: 'blink 1s step-end infinite'
            }}></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="playground-container" style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {projectId && (
        <PlaygroundStatusPanel 
          projectId={projectId}
          projectList={projectList}
          onProjectChange={handleProjectChange}
          onResetView={handleResetView}
          loopCount={projectData?.loop_count || 0}
          nextStep={projectData?.next_recommended_step || 'Initializing...'}
          lastCompletedAgent={projectData?.last_completed_agent || 'None'}
        />
      )}
      
      {!projectId ? (
        // Cinematic intro landing page
        renderLandingPage()
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
                {/* Prompt Input for Orchestrator */}
                <div className="prompt-input-section" style={{
                  marginBottom: '30px',
                  padding: '15px',
                  backgroundColor: 'var(--secondary-bg)',
                  borderRadius: '4px',
                  border: '1px solid #333'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--highlight)' }}>
                    🧠 Conversational Orchestrator
                  </h3>
                  <div style={{ marginBottom: '10px' }}>
                    <textarea
                      placeholder="Describe your idea or goal..."
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '10px',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text)',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={submitToOrchestrator}
                      disabled={!userPrompt.trim() || submittingPrompt}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--highlight)',
                        color: 'var(--background)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: userPrompt.trim() && !submittingPrompt ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: userPrompt.trim() && !submittingPrompt ? 1 : 0.7
                      }}
                    >
                      <span style={{ marginRight: '6px' }}>🧠</span>
                      {submittingPrompt ? 'Processing...' : 'Send to Orchestrator'}
                    </button>
                  </div>
                </div>

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

      {/* Orchestrator Response Modal */}
      {showResponseModal && orchestratorResponse && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'var(--background)',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ color: 'var(--highlight)', marginTop: 0 }}>Orchestrator Response</h2>
            
            <div className="response-section" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px' }}>Proposed Goal:</h3>
              <p style={{ 
                padding: '10px', 
                backgroundColor: 'var(--secondary-bg)', 
                borderRadius: '4px',
                border: '1px solid var(--highlight)'
              }}>
                {orchestratorResponse.proposed_goal}
              </p>
            </div>
            
            {orchestratorResponse.challenge_insights && orchestratorResponse.challenge_insights.length > 0 && (
              <div className="response-section" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px' }}>Challenge Insights:</h3>
                <ul style={{ 
                  padding: '10px 10px 10px 30px', 
                  backgroundColor: 'var(--secondary-bg)', 
                  borderRadius: '4px',
                  margin: 0
                }}>
                  {orchestratorResponse.challenge_insights.map((insight, index) => (
                    <li key={index} style={{ marginBottom: '5px' }}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {orchestratorResponse.task_plan && orchestratorResponse.task_plan.length > 0 && (
              <div className="response-section" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px' }}>Task Plan:</h3>
                <ol style={{ 
                  padding: '10px 10px 10px 30px', 
                  backgroundColor: 'var(--secondary-bg)', 
                  borderRadius: '4px',
                  margin: 0
                }}>
                  {orchestratorResponse.task_plan.map((task, index) => (
                    <li key={index} style={{ marginBottom: '5px' }}>{task}</li>
                  ))}
                </ol>
              </div>
            )}
            
            <div className="modal-actions" style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              marginTop: '20px',
              gap: '10px'
            }}>
              <button 
                onClick={() => setShowResponseModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text)',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmOrchestratorResponse}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--highlight)',
                  color: 'var(--background)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Confirm & Start Project
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add CSS for cursor blink animation */}
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
