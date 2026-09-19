import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { plannerApi } from '../services/api';

export default function ChatWidget() {
  const location = useLocation();
  const chatEndRef = useRef(null);

  // Exclude widget on Home ('/') and Plan ('/plan') pages
  const hideWidget = ['/', '/plan'].includes(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showGreetingPopup, setShowGreetingPopup] = useState(true);

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        "Hello! I'm your ReelToReal AI Planning Agent ✦. Ask me to plan a dinner, a weekend trip, a workout, or a recipe using your saved Reels. If your request is broad, I'll ask clarifying questions to make your plan perfect!",
      plan: null,
      isClarifying: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen, isMaximized]);

  // Hide greeting popup after 12 seconds automatically if not clicked
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGreetingPopup(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowGreetingPopup(false);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    setIsMaximized(false);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleSendMessage = async (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await plannerApi.chat({
        messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        query: queryText
      });

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.data.reply || 'Here is what I found for your request.',
        isClarifying: Boolean(res.data.isClarifying),
        plan: res.data.plan || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'I ran into a temporary error. Please try asking again.',
          isClarifying: false,
          plan: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (hideWidget) return null;

  return (
    <div className="floating-chat-container">
      {/* 1. Auto-Appearing Greeting Speech Bubble Pop-up */}
      {showGreetingPopup && !isOpen && (
        <div className="chat-greeting-popup animate-bounce">
          <button className="greeting-close" onClick={() => setShowGreetingPopup(false)}>
            ✕
          </button>
          <div className="greeting-content" onClick={handleOpenChat}>
            <span className="greeting-badge">AI AGENT ✦</span>
            <p>Hi! Need help planning from your saved Reels? Click to chat with me!</p>
          </div>
        </div>
      )}

      {/* 2. Floating Circular AI Icon Button (Only Icon format, No Text) */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="floating-icon-btn"
          aria-label="Open ReelToReal AI Planner Chatbot"
          title="ReelToReal AI Planner Agent"
        >
          <span className="pulse-ring"></span>
          <span className="ai-icon-symbol">✦</span>
        </button>
      )}

      {/* 3. Maximized View Backdrop Overlay */}
      {isOpen && isMaximized && (
        <div className="chat-backdrop-overlay" onClick={toggleMaximize} />
      )}

      {/* 4. Chat Window (Minimized Floating Corner Popup OR Maximized View) */}
      {isOpen && (
        <div className={`chat-window ${isMaximized ? 'maximized' : 'minimized'}`}>
          {/* Header */}
          <div className="chat-window-header">
            <div className="header-info">
              <span className="header-avatar">✦</span>
              <div>
                <h3>ReelToReal AI Agent</h3>
                <span className="online-indicator">● Active Memory RAG Agent</span>
              </div>
            </div>

            <div className="header-actions">
              {/* Maximize / Minimize Toggle Button */}
              <button
                className="action-btn"
                onClick={toggleMaximize}
                title={isMaximized ? 'Minimize Window' : 'Maximize Window'}
              >
                {isMaximized ? '🗕' : '🗖'}
              </button>
              {/* Close Button */}
              <button className="action-btn close" onClick={handleCloseChat} title="Close Chat">
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="chat-window-body">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-msg-row ${msg.role}`}>
                <div className="chat-msg-avatar">{msg.role === 'assistant' ? '✦' : '👤'}</div>
                <div className="chat-msg-content">
                  <div className="chat-msg-meta">
                    <span className="author">{msg.role === 'assistant' ? 'AI Agent' : 'You'}</span>
                    <span className="time">{msg.timestamp}</span>
                  </div>

                  <div className="chat-msg-bubble">
                    {msg.isClarifying && (
                      <div className="clarifying-pill">
                        <span>💡 Clarifying Details Needed</span>
                      </div>
                    )}
                    <p className="bubble-text">{msg.content}</p>

                    {msg.plan && msg.plan.steps && (
                      <div className="popup-plan-card">
                        <div className="popup-plan-header">
                          <h4>{msg.plan.title || 'Your Plan'}</h4>
                          <p>{msg.plan.message}</p>
                        </div>
                        <div className="popup-plan-steps">
                          {msg.plan.steps.map((step, idx) => (
                            <div key={idx} className="popup-step-item">
                              <span className="step-time">{step.time}</span>
                              <div className="step-details">
                                <h5>
                                  {step.activity} <small>@ {step.place}</small>
                                </h5>
                                <p>{step.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-msg-row assistant loading">
                <div className="chat-msg-avatar">✦</div>
                <div className="chat-msg-content">
                  <div className="chat-msg-bubble loading-bubble">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span>Searching memories...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="chat-window-chips">
            <button type="button" onClick={() => handleSendMessage('Plan a South Indian food tour in Chennai')}>
              🍱 Food Tour
            </button>
            <button type="button" onClick={() => handleSendMessage('Plan a 2-day weekend trip to Pondicherry')}>
              🏝️ Weekend Trip
            </button>
            <button type="button" onClick={() => handleSendMessage('Where to get dim sum & noodles?')}>
              🥟 Dim Sum & Noodles
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="chat-window-form"
          >
            <input
              type="text"
              placeholder="Ask ReelToReal AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="button dark send-btn" disabled={!input.trim() || loading}>
              Send ✦
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
