import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { plannerApi } from '../services/api';
import VideoCard from '../components/VideoCard';

export default function Planner() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(
    params.get('q') || 'Plan my evening. I want Chinese food and something casual afterward.'
  );
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await plannerApi.query(query);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to make a plan.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (params.get('q')) {
      submit();
    }
  }, [params]);

  return (
    <main className="page planner">
      <div className="eyebrow">ASK YOUR SAVED CONTENT ✦</div>
      <h1>
        What do you want<br />
        to <em>plan?</em>
      </h1>
      <form onSubmit={submit} className="ask">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Plan my evening — Chinese dinner"
        />
        <button className="button dark" disabled={busy}>
          {busy ? 'Thinking…' : 'Plan ✦'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="plan-result">
          <section className="plan-card">
            <div className="eyebrow">YOUR PLAN</div>
            <h2>{result.plan.title}</h2>
            <p>{result.plan.message}</p>
            {result.plan.steps.map((step, idx) => (
              <article className="plan-step" key={step.videoId || idx}>
                <time>{step.time}</time>
                <div>
                  <h3>{step.activity}</h3>
                  <strong>{step.place}</strong>
                  <p>{step.reason}</p>
                </div>
              </article>
            ))}
          </section>
          <section className="sources">
            <div className="eyebrow">RETRIEVED FROM YOUR MEMORY</div>
            <h2>Source saved videos</h2>
            {result.retrieved && result.retrieved.length ? (
              <div className="source-list">
                {result.retrieved.map((video, index) => (
                  <VideoCard key={video._id || index} video={video} index={index} />
                ))}
              </div>
            ) : (
              <Link className="button dark" to="/add">
                Save your first Reel →
              </Link>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
