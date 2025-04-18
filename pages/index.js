import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [goal, setGoal] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(`demo_${Date.now()}`);
  const [agent, setAgent] = useState('orchestrator');

  const submitGoal = async () => {
    setLoading(true);
    const effectiveProjectId = `demo_${Date.now()}`;
    setProjectId(effectiveProjectId);
    try {
      // Generate a new project ID for each submission
      const effectiveProjectId = `demo_${Date.now()}`;
      setProjectId(effectiveProjectId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/project/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project_id: effectiveProjectId,
          goal,
          agent
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to fetch' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Promethios Agent Playground</h1>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Project ID:</label>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ width: '300px', padding: '0.5rem', marginRight: '1rem' }}
          disabled
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Goal:</label>
        <input
          type="text"
          placeholder="Enter your goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          style={{ width: '300px', padding: '0.5rem', marginRight: '1rem' }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Agent:</label>
        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          style={{ width: '300px', padding: '0.5rem', marginRight: '1rem' }}
        >
          <option value="orchestrator">orchestrator</option>
          <option value="hal">hal</option>
          <option value="nova">nova</option>
          <option value="ash">ash</option>
          <option value="critic">critic</option>
          <option value="sage">sage</option>
        </select>
      </div>
      <button 
        onClick={submitGoal} 
        disabled={loading || !goal}
        style={{ 
          padding: '0.5rem 1rem', 
          backgroundColor: loading || !goal ? '#cccccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading || !goal ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Thinking...' : 'Submit'}
      </button>
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Response:</h3>
          <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
