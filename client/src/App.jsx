import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Users, CheckCircle, BarChart3, LogOut, Menu, Truck, Settings } from 'lucide-react';
import ClientsPage from './pages/ClientsPage';
import ClientFormPage from './pages/ClientFormPage';
import ClientDetailPage from './pages/ClientDetailPage';
import DashboardPage from './pages/DashboardPage';
import CollectionsPage from './pages/CollectionsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import RoutePage from './pages/RoutePage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';

const Layout = ({ children }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const location = useLocation();
    const { logout } = useAuth();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const getLinkStyle = (path) => ({
        padding: '0.75rem',
        borderRadius: 'var(--border-radius)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: isActive(path) ? 'white' : 'transparent',
        color: isActive(path) ? 'var(--color-primary)' : 'white',
        fontWeight: isActive(path) ? '600' : 'normal'
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Sidebar - Desktop */}
            <aside style={{
                width: '250px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                display: window.innerWidth > 768 ? 'flex' : 'none',
                flexDirection: 'column',
                padding: '2rem 1rem'
            }} className="desktop-sidebar">
                <h1 style={{ color: 'white', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src="/logo.png" alt="CatÓleo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>CatÓleo</span>
                </h1>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link to="/" style={getLinkStyle('/')}>
                        <Home size={20} /> Dashboard
                    </Link>
                    <Link to="/clients" style={getLinkStyle('/clients')}>
                        <Users size={20} /> Clientes
                    </Link>
                    <Link to="/collections" style={getLinkStyle('/collections')}>
                        <CheckCircle size={20} /> Coletas
                    </Link>
                    <Link to="/reports" style={getLinkStyle('/reports')}>
                        <BarChart3 size={20} /> Relatórios
                    </Link>
                    <Link to="/users" style={getLinkStyle('/users')}>
                        <Users size={20} /> Equipe
                    </Link>
                    <Link to="/route" style={getLinkStyle('/route')}>
                        <Truck size={20} /> Roteirização
                    </Link>
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link to="/settings" style={getLinkStyle('/settings')}>
                        <Settings size={20} /> Configurações
                    </Link>
                    <button onClick={logout} style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: 'var(--border-radius)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        backgroundColor: 'transparent',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                    }}>
                        <LogOut size={20} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Mobile Header */}
                <header style={{
                    padding: '1rem',
                    backgroundColor: 'white',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }} className="mobile-header">
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src="/logo.png" alt="CatÓleo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                        CatÓleo
                    </span>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none' }}>
                        <Menu size={24} color="var(--color-primary)" />
                    </button>
                </header>

                {/* Mobile Navigation Overlay */}
                {mobileMenuOpen && (
                    <div className="mobile-nav-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    }} onClick={() => setMobileMenuOpen(false)}>
                        <nav style={{
                            width: '280px', height: '100%', backgroundColor: 'var(--color-primary)',
                            padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            overflowY: 'auto',
                        }} onClick={e => e.stopPropagation()}>
                            <h1 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <img src="/logo.png" alt="CatÓleo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                                CatÓleo
                            </h1>
                            {[
                                { to: '/', icon: <Home size={20} />, label: 'Dashboard' },
                                { to: '/clients', icon: <Users size={20} />, label: 'Clientes' },
                                { to: '/collections', icon: <CheckCircle size={20} />, label: 'Coletas' },
                                { to: '/reports', icon: <BarChart3 size={20} />, label: 'Relatórios' },
                                { to: '/users', icon: <Users size={20} />, label: 'Equipe' },
                                { to: '/route', icon: <Truck size={20} />, label: 'Roteirização' },
                                { to: '/settings', icon: <Settings size={20} />, label: 'Configurações' },
                            ].map(item => (
                                <Link key={item.to} to={item.to} style={getLinkStyle(item.to)} onClick={() => setMobileMenuOpen(false)}>
                                    {item.icon} {item.label}
                                </Link>
                            ))}
                            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                <button onClick={() => { logout(); setMobileMenuOpen(false); }} style={{
                                    width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    backgroundColor: 'transparent', color: 'white',
                                    border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
                                }}>
                                    <LogOut size={20} /> Sair
                                </button>
                            </div>
                        </nav>
                    </div>
                )}

                <div style={{ padding: '0' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Carregando...</div>;
    if (!user) return <LoginPage />; // Or Navigate to login

    return children;
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />

                    <Route path="/*" element={
                        <ProtectedRoute>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<DashboardPage />} />
                                    <Route path="/clients" element={<ClientsPage />} />
                                    <Route path="/clients/new" element={<ClientFormPage />} />
                                    <Route path="/clients/:id" element={<ClientDetailPage />} />
                                    <Route path="/clients/:id/edit" element={<ClientFormPage />} />
                                    <Route path="/collections" element={<CollectionsPage />} />
                                    <Route path="/reports" element={<ReportsPage />} />
                                    <Route path="/users" element={<UsersPage />} />
                                    <Route path="/route" element={<RoutePage />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                </Routes>
                            </Layout>
                        </ProtectedRoute>
                    } />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
