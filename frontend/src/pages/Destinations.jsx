import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Plus, Trash2, CheckCircle2 } from 'lucide-react';

const Destinations = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const [databases, setDatabases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', host: '', port: '5432', user: '', password: '', database: ''
  });

  const fetchDatabases = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/credentials`);
      setDatabases(res.data);
    } catch (error) {
      console.log('Erro ao buscar bancos, usando mock visual por enquanto', error);
      setDatabases([
        { id: '1', name: 'DW Interno da Empresa', host: 'postgres-db.easypanel.host', port: 5432, user: 'banco01', database: 'data_warehouse' }
      ]);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/credentials`, formData);
      setShowForm(false);
      setFormData({ name: '', host: '', port: '5432', user: '', password: '', database: '' });
      fetchDatabases();
    } catch (error) {
      alert('Erro ao criar conexão de banco. Verifique se o backend está rodando.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Remover este destino? Requer reconfigurar Jobs associados.')) {
      try {
        await axios.delete(`${API_URL}/api/credentials/${id}`);
        fetchDatabases();
      } catch (error) {
        alert('Erro ao deletar.');
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Bancos de Dados Destino</h1>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Adicionar Destino
        </button>
      </div>

      <div style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        <p>Cadastre aqui as credenciais PostgreSQL onde o Meta2DB criará o <strong>Star Schema</strong> automaticamente (Auto-migração de tabelas).</p>
      </div>

      {showForm && (
        <div className="card" style={{ border: '1px solid var(--primary-color)' }}>
          <h3 style={{ marginBottom: '15px' }}>Nova Conexão PostgreSQL</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="input-group">
                <label>Apelido da Conexão</label>
                <input type="text" placeholder="Ex: RDS AWS Cliente B" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Database Name</label>
                <input type="text" placeholder="postgres" value={formData.database} onChange={e => setFormData({...formData, database: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Host</label>
                <input type="text" placeholder="xxx.easypanel.host" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Porta</label>
                <input type="number" placeholder="5432" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Usuário</label>
                <input type="text" placeholder="postgres" value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Senha</label>
                <input type="password" placeholder="***" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar Destino</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {databases.map(db => (
          <div key={db.id} className="card" style={{ marginBottom: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{ padding: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--primary-color)' }}>
                <Database size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{db.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Pronta para Inserção
                </span>
              </div>
            </div>
            
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <strong>Host:</strong> {db.host}:{db.port}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <strong>Database:</strong> {db.database}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong>Usuário:</strong> {db.user}
            </div>

            <button 
              onClick={() => handleDelete(db.id)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', color: 'var(--danger-color)' }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {databases.length === 0 && !showForm && (
          <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>
            Nenhum banco de destino configurado ainda.
          </div>
        )}
      </div>

    </div>
  );
};

export default Destinations;
