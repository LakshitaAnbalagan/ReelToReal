import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { plannerApi } from '../services/api';

export default function Chatbot() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        "Hello! I'm your ReelToReal AI Planning Agent ✦. Ask me to plan a dinner, a weekend trip, a workout, or a recipe using your saved video memories. If your request is broad, I'll ask a couple of quick questions to make your plan perfect!",
      plan: null,
      sourceMemories: [],
      isClarifying: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuery && messages.length === 1) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

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
        sourceMemories: res.data.sourceMemories || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'I ran into a temporary error while fetching your memories. Please try asking again.',
          isClarifying: false,
          plan: null,
          sourceMemories: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (chipText) => {
    handleSendMessage(chipText);
  };

  return (
    <main className="page planner-chat-page">
      <div className="planner-header">
        <div>
          <div className="eyebrow">
            REELTOREAL AI AGENT <span>✦</span>
          </div>
          <h1>Interactive AI Planner Chatbot</h1>
          <p className="lead">
            Chat with your personal memory AI. It retrieves details from your saved Reels and clarifies what you need to build the perfect plan.
          </p>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              <div className="avatar">{msg.role === 'assistant' ? '✦' : '👤'}</div>
              <div className="message-content">
                <div className="meta">
                  <span className="author">{msg.role === 'assistant' ? 'ReelToReal AI Agent' : 'You'}</span>
                  <span className="time">{msg.timestamp}</span>
                </div>

                <div className="bubble">
                  {msg.isClarifying && (
                    <div className="clarifying-badge">
                      <span>💡 Clarifying Details Needed</span>
                    </div>
                  )}
                  <p className="bubble-text">{msg.content}</p>

                  {msg.plan && msg.plan.steps && (
                    <div className="chat-plan-card">
                      <div className="plan-card-header">
                        <h2>{msg.plan.title || 'Your Customized Plan'}</h2>
                        <p>{msg.plan.message}</p>
                      </div>

                      <div className="plan-steps-list">
                        {msg.plan.steps.map((step, idx) => (
                          <div key={idx} className="plan-step-item">
                            <div className="step-time">{step.time}</div>
                            <div className="step-info">
                              <h3>
                                {step.activity} <span className="step-place">@ {step.place}</span>
                              </h3>
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
            <div className="message-row assistant loading">
              <div className="avatar">✦</div>
              <div className="message-content">
                <div className="bubble loading-bubble">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="loading-label">Searching database memories & preparing plan...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="suggestions-chips">
            <button type="button" onClick={() => handleChipClick('Plan a South Indian food tour in Chennai')}>
              🍱 Food Tour in Chennai
            </button>
            <button type="button" onClick={() => handleChipClick('Plan a 2-day weekend trip to Pondicherry')}>
              🏝️ Weekend Pondicherry Trip
            </button>
            <button type="button" onClick={() => handleChipClick('Where can I get dim sum and hand-pulled noodles?')}>
              🥟 Dim Sum & Noodles
            </button>
            <button type="button" onClick={() => handleChipClick('Create a 20-minute home workout plan')}>
              🏋️ Home Workout Routine
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="chat-form"
          >
            <input
              type="text"
              placeholder="Ask ReelToReal AI to plan something (e.g. 'Plan a Saturday dinner for 2 under ₹1000')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="button dark send-btn" disabled={!input.trim() || loading}>
              Send ✦
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
