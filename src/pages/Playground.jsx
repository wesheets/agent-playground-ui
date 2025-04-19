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
  
  // Reference to track active polling intervals
  const pollingRef = useRef({
    status: null,
    state: null
  });

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
    // Clear polling intervals before resetting view
    if (pollingRef.current.status) {
      clearInterval(pollingRef.current.status);
      pollingRef.current.status = null;
    }
    if (pollingRef.current.state) {
      clearInterval(pollingRef.current.state);
      pollingRef.current.state = null;
    }
    
    setProjectId(null);
    setProjectData(null);
    setProjectState(null);
    setSelectedFile(null);
    setFileContent(null);
    setActivityFeed([]);
    setUserPrompt('');
    setOrchestratorResponse(null);
    setShowResponseModal(false);
    
    console.log('Polling intervals cleared and view reset');
  };

  // Handle project selection
  const handleProjectChange = (newProjectId) => {
    // Clear polling intervals before switching projects
    if (pollingRef.current.status) {
      clearInterval(pollingRef.current.status);
      pollingRef.current.status = null;
    }
    if (pollingRef.current.state) {
      clearInterval(pollingRef.current.state);
      pollingRef.current.state = null;
    }
    
    setProjectId(newProjectId);
    setSelectedFile(null);
    setFileContent(null);
    
    console.log(`Polling intervals cleared and switched to project: ${newProjectId}`);
  };

  // Check if loop is active
  const isLoopActive = () => {
    if (!projectData) return false;
    return projectData.loop_status === "running";
  };

  // Download ZIP function
  const handleDownloadZip = async () => {
    // Prevent download if loop is active
    if (isLoopActive()) {
      setError("Cannot download project while loop is active. Please wait for loop to complete.");
      return;
    }
    
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

    // Clear any existing polling intervals first
    if (pollingRef.current.status) {
      clearInterval(pollingRef.current.status);
      pollingRef.current.status = null;
    }
    if (pollingRef.current.state) {
      clearInterval(pollingRef.current.state);
      pollingRef.current.state = null;
    }

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
    pollingRef.current.status = setInterval(fetchProjectStatus, 5000);
    pollingRef.current.state = setInterval(fetchProjectState, 10000);
    
    console.log(`Started polling for project: ${projectId}`);
    
    // Clean up intervals on unmount or projectId change
    return () => {
      if (pollingRef.current.status) {
        clearInterval(pollingRef.current.status);
        pollingRef.current.status = null;
      }
      if (pollingRef.current.state) {
        clearInterval(pollingRef.current.state);
        pollingRef.current.state = null;
      }
      console.log(`Stopped polling for project: ${projectId}`);
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
            <span style={{ marginRight: '10px' }}>🔄</span>
            <span>Waiting for input{'.'.repeat(dotCount)}</span>
          </div>
        </div>
        
        <div className="prompt-container" style={{
          width: '100%',
          maxWidth: '600px',
          marginBottom: '40px'
        }}>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Enter your goal or question..."
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '16px',
              minHeight: '120px',
              resize: 'vertical',
              marginBottom: '16px'
            }}
          />
          
          <button
            onClick={submitToOrchestrator}
            disabled={submittingPrompt || !userPrompt.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--highlight)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: submittingPrompt || !userPrompt.trim() ? 'not-allowed' : 'pointer',
              opacity: submittingPrompt || !userPrompt.trim() ? 0.7 : 1
            }}
          >
            {submittingPrompt ? 'Processing...' : 'Submit'}
          </button>
        </div>
        
        <div className="project-selection" style={{
          width: '100%',
          maxWidth: '600px'
        }}>
          <h3 style={{
            fontSize: '18px',
            marginBottom: '16px',
            color: 'var(--text)'
          }}>
            Or select an existing project:
          </h3>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center'
          }}>
            {projectList.map((id) => (
              <button
                key={id}
                onClick={() => handleProjectChange(id)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render the agent playground view
  const renderAgentPlayground = () => {
    return (
      <div className="playground-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--background)',
        color: 'var(--text)'
      }}>
        {/* Status Bar */}
        <div className="status-bar" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: 'var(--header-bg)',
          borderBottom: '1px solid var(--border)'
        }}>
          <PlaygroundStatusPanel 
            projectData={projectData} 
            loading={loading} 
            error={error}
          />
          
          <div className="actions" style={{
            display: 'flex',
            gap: '10px'
          }}>
            <button
              onClick={handleResetView}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'var(--button-secondary)',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Return to Console
            </button>
            
            <button
              onClick={handleDownloadZip}
              disabled={isLoopActive()}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: isLoopActive() ? 'var(--button-disabled)' : 'var(--button-primary)',
                color: 'white',
                fontSize: '14px',
                cursor: isLoopActive() ? 'not-allowed' : 'pointer',
                opacity: isLoopActive() ? 0.7 : 1
              }}
              title={isLoopActive() ? "Cannot download while loop is active" : "Download project as ZIP"}
            >
              {isLoopActive() ? "Loop Active - Export Locked" : "Download ZIP"}
            </button>
          </div>
        </div>
        
        {/* Orchestrator Input */}
        <div className="orchestrator-input" style={{
          padding: '15px 20px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--card-bg)'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Enter a new goal or question for the Conversational Orchestrator..."
              style={{
                flex: 1,
                padding: '10px 15px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: '14px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitToOrchestrator();
                }
              }}
            />
            
            <button
              onClick={submitToOrchestrator}
              disabled={submittingPrompt || !userPrompt.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'var(--highlight)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: submittingPrompt || !userPrompt.trim() ? 'not-allowed' : 'pointer',
                opacity: submittingPrompt || !userPrompt.trim() ? 0.7 : 1
              }}
            >
              {submittingPrompt ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
        
        {/* Main Content Area - 70/30 Split */}
        <div className="main-content" style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* Left Panel - Agent Activity (70%) */}
          <div className="left-panel" style={{
            width: '70%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <div className="panel-header" style={{
              padding: '15px 20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--card-bg)'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Agent Activity</h2>
            </div>
            
            <div className="panel-content" style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px'
            }}>
              <AgentTimeline 
                projectData={projectData} 
                activityFeed={activityFeed}
              />
              
              {selectedFile && (
                <div className="file-content" style={{
                  marginTop: '20px',
                  padding: '20px',
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ marginTop: 0 }}>{selectedFile}</h3>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflow: 'auto',
                    maxHeight: '400px',
                    padding: '15px',
                    backgroundColor: 'var(--code-bg)',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {fileContent}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Panel - Generated Files (30%) */}
          <div className="right-panel" style={{
            width: '30%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="panel-header" style={{
              padding: '15px 20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--card-bg)'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Generated Files</h2>
            </div>
            
            <div className="panel-content" style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px'
            }}>
              <FileTree 
                projectData={projectData} 
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the orchestrator response modal
  const renderResponseModal = () => {
    if (!showResponseModal || !orchestratorResponse) return null;
    
    return (
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
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <h2 style={{ marginTop: 0, color: 'var(--highlight)' }}>Orchestrator Response</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '5px' }}>Your Input:</h3>
            <p style={{ 
              padding: '10px', 
              backgroundColor: 'var(--input-bg)', 
              borderRadius: '4px',
              margin: '0'
            }}>
              {userPrompt}
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '5px' }}>Proposed Goal:</h3>
            <p style={{ 
              padding: '10px', 
              backgroundColor: 'var(--code-bg)', 
              borderRadius: '4px',
              margin: '0'
            }}>
              {orchestratorResponse.proposed_goal}
            </p>
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '5px' }}>Interpretation:</h3>
            <p style={{ 
              padding: '10px', 
              backgroundColor: 'var(--code-bg)', 
              borderRadius: '4px',
              margin: '0'
            }}>
              {orchestratorResponse.interpretation}
            </p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setShowResponseModal(false)}
              style={{
                padding: '10px 20px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'var(--button-secondary)',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            
            <button
              onClick={confirmOrchestratorResponse}
              style={{
                padding: '10px 20px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'var(--highlight)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Confirm & Start Project
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <>
      {projectId ? renderAgentPlayground() : renderLandingPage()}
      {renderResponseModal()}
    </>
  );
}
