import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

export default function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('reelToReal_user');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('reelToReal_user');
    localStorage.removeItem('reelToReal_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <header>
      <NavLink className="brand" to="/">
        REEL<span>TO</span>REAL<i>✦</i>
      </NavLink>
      <nav>
        <NavLink to="/library">Library</NavLink>
        <NavLink to="/add">Add video</NavLink>
        <NavLink to="/plan">Plan</NavLink>
      </nav>
      <div className="nav-user-area" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        {user ? (
          <div className="user-profile-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.05)', padding: '0.35rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#52c41a' }}></span>
            <span>{user.name || 'User'}</span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c8c8c', marginLeft: '0.3rem', fontSize: '0.8rem', textDecoration: 'underline' }}>
              Logout
            </button>
          </div>
        ) : (
          <NavLink className="nav-login-link" to="/login" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#262626', textDecoration: 'none' }}>
            Login / Sign Up
          </NavLink>
        )}
        <NavLink className="nav-cta" to="/add">
          Save a Reel <b>→</b>
        </NavLink>
      </div>
    </header>
  );
}
