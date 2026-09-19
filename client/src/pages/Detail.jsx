import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { videosApi } from '../services/api';

export default function Detail() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);

  useEffect(() => {
    videosApi.get(id).then((r) => setVideo(r.data));
  }, [id]);

  if (!video) return <main className="page">Loading memory…</main>;

  return (
    <main className="page detail">
      <Link className="back" to="/library">
        ← Back to library
      </Link>
      <div className="detail-hero">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="detail-thumb" style={{ width: '220px', height: '220px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', flexShrink: 0 }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
        ) : (
          <div className="detail-art">{video.category === 'Travel' ? '◒' : '✦'}</div>
        )}
        <div>
          <div className="eyebrow">{video.isDemo ? 'DEMO MEMORY · ' : ''}{video.category}</div>
          <h1>{video.title}</h1>
          <p className="lead">{video.summary}</p>
          <div className="tags">
            {video.tags?.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="detail-grid">
        <section>
          <h2>AI Summary</h2>
          <p>{video.summary}</p>

          {video.onScreenText && video.onScreenText !== 'No specific on-screen text or menu card detected.' && (
            <>
              <h2>On-Screen Text & Menu Card OCR</h2>
              <div className="menu-ocr-box" style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '1.2rem', borderRadius: '12px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#d48806' }}>📋 Detected Menu Cards, Prices & Text Overlays:</p>
                <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-line', color: '#262626' }}>{video.onScreenText}</p>
              </div>
            </>
          )}

          {video.visualAnalysis && (
            <>
              <h2>Visual Scene Analysis (Video Frames)</h2>
              <div className="visual-box" style={{ background: '#f5f5f7', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                <p><strong>Frame Observations:</strong> {video.visualAnalysis}</p>
              </div>
            </>
          )}

          {video.keyframes?.length > 0 && (
            <>
              <h2>Analyzed Video Keyframes ({video.keyframes.length} snapshots)</h2>
              <div className="keyframes-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {video.keyframes.map((src, i) => (
                  <img key={i} src={src} alt={`Frame ${i + 1}`} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e0e0e0' }} onError={(e) => { e.target.style.opacity = '0.3'; }} />
                ))}
              </div>
            </>
          )}




          <h2>Spoken Audio Transcript</h2>
          <p className="transcript">“{video.transcript || 'No spoken audio detected.'}”</p>

          {video.actionableIdeas?.length > 0 && (
            <>
              <h2>Actionable Recommendations</h2>
              <ul style={{ paddingLeft: '1.2rem', lineHeight: '1.8' }}>
                {video.actionableIdeas.map((idea, i) => (
                  <li key={i}>{idea}</li>
                ))}
              </ul>
            </>
          )}
        </section>
        <aside>
          <h2>Extracted Insights</h2>
          <dl>
            <dt>Category</dt>
            <dd>{video.category} · {video.subcategory || 'General'}</dd>

            <dt>Estimated Cost</dt>
            <dd>{video.price || 'Not mentioned'}</dd>

            <dt>Places & Entities</dt>
            <dd>{video.entities?.map((item) => item.name).join(', ') || '—'}</dd>

            <dt>Locations</dt>
            <dd>{video.locations?.join(', ') || '—'}</dd>

            {video.foods?.length > 0 && (
              <>
                <dt>Dishes & Drinks</dt>
                <dd>{video.foods.join(', ')}</dd>
              </>
            )}

            {video.activities?.length > 0 && (
              <>
                <dt>Activities</dt>
                <dd>{video.activities.join(', ')}</dd>
              </>
            )}
          </dl>
          <Link className="button dark" to={`/plan?q=${encodeURIComponent(video.title)}`}>
            Plan with this Reel ✦
          </Link>
        </aside>
      </div>
    </main>
  );
}

