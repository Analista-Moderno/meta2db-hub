import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Database, Link as LinkIcon, Settings, Layers } from 'lucide-react';

const Layout = () => {
  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-dot"></div>
          AdsData Hub
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} style={{ marginRight: '12px' }} />
            Dashboard
          </NavLink>
          <NavLink to="/pipelines" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Layers size={20} style={{ marginRight: '12px' }} />
            Pipelines
          </NavLink>
          <NavLink to="/destinations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Database size={20} style={{ marginRight: '12px' }} />
            Destinos (Postgres)
          </NavLink>
          <NavLink to="/integrations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LinkIcon size={20} style={{ marginRight: '12px' }} />
            Integrações Meta
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} style={{ marginRight: '12px' }} />
            Configurações
          </NavLink>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status do Sistema:</span>
            <span className="badge badge-success">Operante</span>
          </div>
        </header>
        <section className="content-area">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default Layout;
