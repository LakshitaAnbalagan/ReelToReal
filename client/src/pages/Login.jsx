import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await authApi.register(formData);
        localStorage.setItem('reelToReal_token', res.data.token);
        localStorage.setItem('reelToReal_user', JSON.stringify(res.data.user));
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => navigate('/library'), 1000);
      } else {
        const res = await authApi.login({ email: formData.email, password: formData.password });
        localStorage.setItem('reelToReal_token', res.data.token);
        localStorage.setItem('reelToReal_user', JSON.stringify(res.data.user));
        setSuccessMsg('Welcome back! Redirecting...');
        setTimeout(() => navigate('/library'), 800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email: 'lakshita@reeltoreal.ai', password: 'password123' });
      localStorage.setItem('reelToReal_token', res.data.token);
      localStorage.setItem('reelToReal_user', JSON.stringify(res.data.user));
      setSuccessMsg('Logged in as Lakshita Anbalagan!');
      setTimeout(() => navigate('/library'), 600);
    } catch {
      // Fallback demo user object if backend server is in offline mode
      const demoUser = { _id: 'demo-user-1', name: 'Lakshita Anbalagan', email: 'lakshita@reeltoreal.ai' };
      localStorage.setItem('reelToReal_token', 'demo-token-123');
      localStorage.setItem('reelToReal_user', JSON.stringify(demoUser));
      setSuccessMsg('Logged in as Lakshita Anbalagan!');
      setTimeout(() => navigate('/library'), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="eyebrow">REELTOREAL MEMORY ✦</div>
          <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="auth-sub">
            {isRegister
              ? 'Save reels, organize structured memories, and plan smarter.'
              : 'Sign in to access your personal video memory library.'}
          </p>
        </div>

        {error && <div className="auth-alert error">{error}</div>}
        {successMsg && <div className="auth-alert success">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="e.g. Lakshita Anbalagan"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="button dark auth-submit" disabled={loading}>
            {loading ? 'Processing...' : isRegister ? 'Create Account →' : 'Sign In →'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button type="button" className="button light demo-login-btn" onClick={handleDemoLogin} disabled={loading}>
          ✨ 1-Click Demo Login (Lakshita)
        </button>

        <div className="auth-toggle">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => { setIsRegister(false); setError(''); }}>
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don’t have an account?{' '}
              <button type="button" onClick={() => { setIsRegister(true); setError(''); }}>
                Create one now
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
