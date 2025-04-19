import React, { useState, useEffect, useRef } from 'react';
import AgentTimeline from '../components/AgentTimeline';
import FileTree from '../components/FileTree';
import PlaygroundStatusPanel from '../components/PlaygroundStatusPanel';

// Define the backend URL directly to avoid 404 errors on Vercel deployment
const BACKEND_URL = 'https://web-production-2639.up.railway.app';

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

  // Reset view function - Return to Console
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
      // Use direct backend URL to avoid 404 errors
      const response = await fetch(`${BACKEND_URL}/api/project/export_zip?project_id=${projectId}`);
      
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
      // Use direct backend URL to avoid 404 errors
      const response = await fetch(`${BACKEND_URL}/api/orchestrator/interpret`, {
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
      
      // Auto-set currentProjectId to the returned project_id and navigate to agent view
      if (data.project_id) {
        setProjectId(data.project_id);
        
        // Add to activity feed
        const newAction = {
          timestamp: new Date().toISOString(),
          agent: 'orchestrator',
          action: `Processed user prompt and created project`,
          details: `Project: ${data.project_id} - Goal: ${data.proposed_goal}`
        };
        
        setActivityFeed(prev => {
          const updatedFeed = [newAction, ...prev];
          return updatedFeed.slice(0, 10); // Keep only the last 10 actions
        });
        
        // Clear prompt and close modal
        setUserPrompt('');
      } else {
        // If no project_id is returned, show the response modal for confirmation
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
      }
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
      // Use direct backend URL to avoid 404 errors
      const response = await fetch(`${BACKEND_URL}/api/project/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: orchestratorResponse.project_id || `loop_${Date.now().toString().slice(-6)}`,
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
      
      // Set the project ID to navigate to agent view
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
        // Use direct backend URL to avoid 404 errors
        const response = await fetch(`${BACKEND_URL}/api/system/status?project_id=${projectId}`);
        
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
        // Use direct backend URL to avoid 404 errors
        const response = await fetch(`${BACKEND_URL}/api/project/state?project_id=${projectId}`);
        
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
            <option value="" disabled>Select a project...</option>
            {projectList.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>
        
        {/* Prompt input */}
        <div className="prompt-input" style={{
          width: '100%',
          maxWidth: '400px',
          marginBottom: '20px'
        }}>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: 'var(--background)',
              color: 'var(--text)',
              border: '1px solid var(--highlight)',
              borderRadius: '4px',
              fontSize: '16px',
              minHeight: '100px',
              resize: 'vertical'
            }}
          />
        </div>
        
        {/* Submit button */}
        <button
          onClick={submitToOrchestrator}
          disabled={submittingPrompt || !userPrompt.trim()}
          style={{
            padding: '12px 25px',
            backgroundColor: 'var(--highlight)',
            color: 'var(--background)',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: submittingPrompt || !userPrompt.trim() ? 'not-allowed' : 'pointer',
            opacity: submittingPrompt || !userPrompt.trim() ? 0.7 : 1
          }}
        >
          {submittingPrompt ? `Processing${'.'.repeat(dotCount)}` : 'Send to Orchestrator'}
        </button>
        
        {/* Console subtext */}
        <div className="console-subtext" style={{
          marginTop: '40px',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace'
        }}>
          <p>System standing by</p>
          <p>Awaiting input{'.'.repeat(dotCount)}</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)'
      }}>
        <h1>Promethios Playground</h1>
        {projectId && (
          <button
            onClick={handleResetView}
            style={{
              padding: '8px 15px',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Return to Console
          </button>
        )}
      </div>
      
      {/* Main content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflow: 'hidden'
      }}>
        {!projectId ? (
          // Show landing page when no project is selected
          renderLandingPage()
        ) : (
          // Show agent view when a project is selected
          <>
            {/* Three-panel layout with fixed proportions */}
            <div style={{
              display: 'flex',
              height: '100%',
              overflow: 'hidden'
            }}>
              {/* Left panel - Agent activity */}
              <div className="left-panel" style={{
                width: '25%', // Fixed at 25% of the total width
                borderRight: '1px solid var(--border)',
                overflow: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h2>Agent Activity</h2>
                <h3 style={{ color: 'var(--highlight)' }}>Agent Activity</h3>
                
                <AgentTimeline 
                  activityFeed={activityFeed}
                  projectData={projectData}
                />
                
                {projectData && (
                  <PlaygroundStatusPanel 
                    projectData={projectData}
                    loading={loading}
                  />
                )}
              </div>
              
              {/* Center panel - Content viewer */}
              <div className="center-panel" style={{
                width: '50%', // Fixed at 50% of the total width
                padding: '20px',
                overflow: 'auto'
              }}>
                <h2>Project Content</h2>
                {selectedFile ? (
                  <div className="file-content">
                    <h3>{selectedFile}</h3>
                    <pre style={{
                      backgroundColor: 'var(--code-bg)',
                      padding: '15px',
                      borderRadius: '4px',
                      overflow: 'auto'
                    }}>
                      {fileContent}
                    </pre>
                  </div>
                ) : (
                  <div className="no-file-selected" style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    <p>Select a file from the file tree to view its content.</p>
                  </div>
                )}
              </div>
              
              {/* Right panel - File tree */}
              <div className="right-panel" style={{
                width: '25%', // Fixed at 25% of the total width
                borderLeft: '1px solid var(--border)',
                overflow: 'auto',
                padding: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h2>Generated Files</h2>
                  <button
                    onClick={handleDownloadZip}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'var(--highlight)',
                      color: 'var(--background)',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Download ZIP
                  </button>
                </div>
                
                <FileTree 
                  projectState={projectState}
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                />
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Orchestrator response modal */}
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
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2>Orchestrator Response</h2>
            <div className="response-section" style={{ marginBottom: '20px' }}>
              <h3>Proposed Goal</h3>
              <p>{orchestratorResponse.proposed_goal}</p>
            </div>
            
            <div className="response-section" style={{ marginBottom: '20px' }}>
              <h3>Challenge Insights</h3>
              <ul>
                {orchestratorResponse.challenge_insights?.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
            
            <div className="response-section" style={{ marginBottom: '30px' }}>
              <h3>Task List</h3>
              <ol>
                {orchestratorResponse.task_list?.map((task, index) => (
                  <li key={index}>{task}</li>
                ))}
              </ol>
            </div>
            
            <div className="modal-actions" style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => setShowResponseModal(false)}
                style={{
                  padding: '10px 15px',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={confirmOrchestratorResponse}
                style={{
                  padding: '10px 15px',
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
    </div>
  );
}
