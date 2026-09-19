import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import ChatWidget from './components/ChatWidget';
import Home from './pages/Home';
import AddVideo from './pages/AddVideo';
import Processing from './pages/Processing';
import Library from './pages/Library';
import Detail from './pages/Detail';
import Planner from './pages/Planner';
import Chatbot from './pages/Chatbot';
import Login from './pages/Login';

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/add" element={<AddVideo />} />
        <Route path="/process/:id" element={<Processing />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:id" element={<Detail />} />
        <Route path="/plan" element={<Planner />} />
        <Route path="/chat" element={<Chatbot />} />
      </Routes>
      <ChatWidget />
    </>
  );
}
