import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PipelineBuilder = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const [formData, setFormData] = useState({
    name: '',
    destinationId: '',
    apiVersion: 'v25.0',
    datePreset: 'last_30d',
    timeIncrement: '1',
    level: 'ad',
    accounts: [],
    cronSchedule: '0 0 * * *'
  });

  const [fieldSelection, setFieldSelection] = useState({
    basicMetrics: true, // spend, impressions, clicks
    standardEvents: false, // leads, purchases
    videoEngagement: false, // plays, 25%, 50%, 100%
    demographics: false, // age, gender
    geographics: false, // region
    platforms: false // publisher_platform, device
  });

  const handleFieldToggle = (field) => {
    setFieldSelection(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    const fetchDbs = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/credentials`);
        setDestinations(res.data);
      } catch (e) {
        console.error('Sem bancos cadastrados', e);
      }
    };
    fetchDbs();
  }, []);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/jobs`, { ...formData, fields: fieldSelection });
      alert('Job Criado com Sucesso!');
      setFormData({ ...formData, name: '' });
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || error.message;
      alert('Erro ao salvar Job: ' + errMsg);
    }
  };

  return (
    <div>
      <h1 className="page-title">Construtor de Pipelines</h1>
      <div className="card">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Configure as regras da extração da API do Meta Ads. O sistema cuidará das quebras de requisições, paginações e conversão para o Star Schema.
        </p>

        <form onSubmit={handleCreateJob}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Coluna 1: Configurações Gerais */}
            <div>
              <h3 style={{ marginBottom: '15px' }}>1. Parâmetros Gerais</h3>
              
              <div className="input-group">
                <label>Nome do Job</label>
                <input type="text" placeholder="Ex: Carga Diária - Conta Principal" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>

              <div className="input-group">
                <label>Versão da API do Meta</label>
                <select value={formData.apiVersion} onChange={e => setFormData({ ...formData, apiVersion: e.target.value })}>
                  <option value="v19.0">v19.0</option>
                  <option value="v20.0">v20.0</option>
                  <option value="v21.0">v21.0</option>
                  <option value="v24.0">v24.0</option>
                  <option value="v25.0">v25.0 (Latest)</option>
                </select>
              </div>

              <div className="input-group">
                <label>Nível de Extração (Level)</label>
                <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}>
                  <option value="ad">Anúncio (ad) - Recomendado</option>
                  <option value="adset">Conjunto (adset)</option>
                  <option value="campaign">Campanha (campaign)</option>
                  <option value="account">Conta (account)</option>
                </select>
              </div>

              <div className="input-group">
                <label>Período (Date Preset)</label>
                <select value={formData.datePreset} onChange={e => setFormData({ ...formData, datePreset: e.target.value })}>
                  <option value="yesterday">Ontem (yesterday)</option>
                  <option value="last_3d">Últimos 3 dias (last_3d)</option>
                  <option value="last_7d">Últimos 7 dias (last_7d)</option>
                  <option value="last_30d">Últimos 30 dias (last_30d)</option>
                  <option value="this_month">Este mês (this_month)</option>
                  <option value="BACKFILL_ALL">🔄 Carga Histórica (Lifecycle Completo / Backfill)</option>
                </select>
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>A Carga Histórica fará chamadas fatiadas (em chunks de 30 dias) para evitar timeout.</small>
              </div>

            </div>

            {/* Coluna 2: Campos e Destino */}
            <div>
              <h3 style={{ marginBottom: '15px' }}>2. Modelagem & Checkboxes (Star Schema)</h3>
              
              <div style={{ marginBottom: '20px', background: 'var(--bg-color)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldSelection.basicMetrics} onChange={() => handleFieldToggle('basicMetrics')} disabled />
                  Métricas Básicas e Entidades Mestre (Gasto, Impressões, CPM, CPC) - Fixo
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldSelection.standardEvents} onChange={() => handleFieldToggle('standardEvents')} />
                  Eventos Padrão (Leads, Compras, View Content, Messages, AddToCart)
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldSelection.videoEngagement} onChange={() => handleFieldToggle('videoEngagement')} />
                  Engajamento de Vídeo e Criativos (Play 25%, 50%, ThruPlays, Thumbnails)
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldSelection.demographics} onChange={() => handleFieldToggle('demographics')} />
                  Dados Demográficos (Idade, Gênero)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldSelection.geographics} onChange={() => handleFieldToggle('geographics')} />
                  Dados Geográficos (Região, País)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldSelection.platforms} onChange={() => handleFieldToggle('platforms')} />
                  Plataformas e Posicionamentos (Reels, Feed, Device, Publisher)
                </label>
              </div>

              <div className="input-group">
                <label>Banco de Dados de Destino (Onde injetar o Star Schema)</label>
                <select value={formData.destinationId} onChange={e => setFormData({ ...formData, destinationId: e.target.value })} required>
                  <option value="">Selecione um destino (PostgreSQL)</option>
                  {destinations.map(db => (
                    <option key={db.id} value={db.id}>{db.name} ({db.host})</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
          
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>Salvar e Ativar Extração Automática</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PipelineBuilder;
