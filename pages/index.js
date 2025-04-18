import { useState } from 'react';

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
        <label>Project ID:</label><br />
        <input type="text" value={projectId} disabled style={{ width: '300px' }} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Goal:</label><br />
        <input
          type="text"
          placeholder="Enter your goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          style={{ width: '300px' }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Agent:</label><br />
        <select value={agent} onChange={(e) => setAgent(e.target.value)} style={{ width: '300px' }}>
          <option value="orchestrator">orchestrator</option>
          <option value="hal">hal</option>
          <option value="nova">nova</option>
          <option value="ash">ash</option>
          <option value="critic">critic</option>
          <option value="sage">sage</option>
        </select>
      </div>
      <button onClick={submitGoal} disabled={loading || !goal}>
        {loading ? 'Thinking...' : 'Submit'}
      </button>
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Response:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
