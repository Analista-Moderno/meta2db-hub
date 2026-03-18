import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PipelineBuilder from './pages/PipelineBuilder';
import Destinations from './pages/Destinations';
import { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/jobs`);
        setJobs(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div>
      <h1 className="page-title">Visão Geral (Painel de Saúde)</h1>
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Pipelines Instanciados</h3>
        {jobs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Nenhum Job ativo ainda.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px' }}>Nome do Job</th>
                <th style={{ padding: '10px' }}>Nível de Extração</th>
                <th style={{ padding: '10px' }}>Período Base</th>
                <th style={{ padding: '10px' }}>Banco Destino</th>
                <th style={{ padding: '10px' }}>Status do Motor</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px' }}>{job.name}</td>
                  <td style={{ padding: '10px' }}>{job.level}</td>
                  <td style={{ padding: '10px' }}>{job.datePreset}</td>
                  <td style={{ padding: '10px' }}>{job.destination?.name || 'Easypanel'}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', borderRadius: '4px', fontSize: '0.8rem' }}>
                      Pausado (Falta de Redis)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const Integrations = () => {
  const [status, setStatus] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  useEffect(() => {
    // Check URL params for success/error alerts
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success')) {
      alert('Autenticação com a Meta realizada com sucesso! O Token Long-Lived foi salvo.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const checkStatus = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/facebook/status`);
        if (res.data.connected) {
          setStatus(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkStatus();
  }, []);

  const handleFacebookLogin = () => {
    window.location.href = `${API_URL}/api/auth/facebook`;
  };

  return (
    <div>
      <h1 className="page-title">Integração Fonte</h1>
      <div className="card" style={{ maxWidth: '500px' }}>
        <h3 style={{ marginBottom: '10px' }}>Meta Ads (Facebook)</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Conecte sua conta do Facebook para originar as campanhas, contas e métricas do aplicativo.
        </p>
        
        {status ? (
          <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success-color)', borderRadius: '8px' }}>
            <h4 style={{ color: 'var(--success-color)', marginBottom: '5px' }}>✅ Meta Conectado</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Acesso garantido. O Token está blindado no banco de dados e pronto para ser utilizado nos Jobs.<br/>
            </p>
            <button className="btn-secondary" onClick={handleFacebookLogin}>
              Reconectar Facebook
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={handleFacebookLogin}>Conectar com Facebook</button>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pipelines" element={<PipelineBuilder />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="destinations" element={<Destinations />} />
          <Route path="settings" element={<div><h1 className="page-title">Configurações Base</h1></div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
