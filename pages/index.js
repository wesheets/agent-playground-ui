import { useState } from 'react';

export default function Home() {
  const [goal, setGoal] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submitGoal = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/project/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
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
      <input
        type="text"
        placeholder="Enter your goal"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        style={{ width: '300px', padding: '0.5rem', marginRight: '1rem' }}
      />
      <button onClick={submitGoal} disabled={loading}>
        {loading ? 'Thinking...' : 'Submit'}
      </button>
      {result && (
        <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
