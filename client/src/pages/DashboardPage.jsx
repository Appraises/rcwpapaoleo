import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Droplet, TrendingUp, Users, DollarSign, Settings, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [financials, setFinancials] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [newPrice, setNewPrice] = useState('');

    // WhatsApp Status State
    const [waStatus, setWaStatus] = useState(null);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    const fetchFinancials = async () => {
        if (user?.role === 'admin') {
            try {
                const response = await api.get('/dashboard/financial');
                setFinancials(response.data);
                setNewPrice(response.data.sellingPrice);
            } catch (error) {
                console.error('Error fetching financials:', error);
            }
        }
    };

    const fetchWaStatus = async () => {
        if (user?.role !== 'admin') return;
        try {
            const res = await api.get('/evolution/status');
            setWaStatus(res.data?.instance?.state || 'not_connected');
        } catch (error) {
            console.error('API Evolution error:', error);
            setWaStatus('error');
        }
    };

    const handleSyncWebhook = async () => {
        if (!window.confirm('Tem certeza que deseja forçar a sincronização do Webhook do WhatsApp?')) return;
        try {
            const res = await api.post('/evolution/webhook/set');
            alert(`Webhook configurado com sucesso!\nNova Rota: ${res.data.webhookUrl}`);
        } catch (error) {
            console.error('Erro ao configurar webhook:', error);
            alert('Falha ao configurar webhook. Você definiu a variável EVOLUTION_WEBHOOK_URL ou o servidor consegue deduzir a URL?');
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchStats(), fetchFinancials(), fetchWaStatus()]);
            setLoading(false);
        };
        loadData();
    }, [user]);

    const handleUpdatePrice = async (e) => {
        e.preventDefault();
        try {
            await api.post('/dashboard/financial/price', { price: parseFloat(newPrice) });
            await fetchFinancials();
            setIsPriceModalOpen(false);
        } catch (error) {
            console.error('Error updating price:', error);
            alert('Erro ao atualizar preço');
        }
    };

    if (loading) return <div className="p-8">Carregando dashboard...</div>;
    if (!stats) return <div className="p-8">Erro ao carregar dados.</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.8rem', color: 'var(--color-text)' }}>Dashboard</h2>

            {/* General Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '50%', color: 'var(--color-primary)' }}>
                        <Droplet size={24} />
                    </div>
                    <div>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>Coletado este Mês</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalMonth} L</h3>
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '50%', color: '#16a34a' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>Total Geral</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalGeneral} L</h3>
                    </div>
                </div>
            </div>

            {/* Pending Requests Notification */}
            {stats.pendingRequestsCount + stats.dispatchedRequestsCount > 0 && (
                <Link to="/requests" style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '2.5rem' }}>
                    <div style={{
                        backgroundColor: '#fffbeb', padding: '1.25rem 1.5rem', borderRadius: 'var(--border-radius)',
                        boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem',
                        borderLeft: '4px solid #f59e0b', cursor: 'pointer', transition: 'transform 0.15s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '50%' }}>
                            <AlertTriangle size={22} color="#d97706" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#92400e' }}>
                                Solicitações de Coleta
                            </p>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: '#b45309' }}>
                                {stats.pendingRequestsCount > 0 && `${stats.pendingRequestsCount} pendente${stats.pendingRequestsCount > 1 ? 's' : ''}`}
                                {stats.pendingRequestsCount > 0 && stats.dispatchedRequestsCount > 0 && ' · '}
                                {stats.dispatchedRequestsCount > 0 && `${stats.dispatchedRequestsCount} despachada${stats.dispatchedRequestsCount > 1 ? 's' : ''}`}
                            </p>
                        </div>
                        <span style={{
                            padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold',
                            backgroundColor: '#fef3c7', color: '#92400e'
                        }}>
                            Ver →
                        </span>
                    </div>
                </Link>
            )}

            {/* WhatsApp Status Badge (Admin Only) */}
            {user?.role === 'admin' && (
                <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', borderLeft: waStatus === 'open' ? '4px solid #16a34a' : '4px solid #ef4444' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: waStatus === 'open' ? '#dcfce7' : '#fee2e2', borderRadius: '50%' }}>
                        {waStatus === 'open' ? <Wifi size={22} color="#16a34a" /> : <WifiOff size={22} color="#991b1b" />}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#1f2937' }}>WhatsApp</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                            {waStatus === 'open' ? 'Assistente automático operante' : 'Desconectado — configure em Configurações'}
                        </p>
                    </div>
                    <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: waStatus === 'open' ? '#dcfce7' : '#fee2e2',
                        color: waStatus === 'open' ? '#16a34a' : '#991b1b'
                    }}>
                        {waStatus === 'open' ? '● Operante' : '● Offline'}
                    </span>
                    <button onClick={handleSyncWebhook} style={{
                        marginLeft: 'auto', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius)',
                        backgroundColor: '#1e40af', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'
                    }}>
                        Sincronizar Webhook (Bot)
                    </button>
                </div>
            )}

            {/* Financial Section (Admin Only) */}
            {user?.role === 'admin' && financials && (
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.4rem', color: '#333' }}>Financeiro & Sistema</h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setIsPriceModalOpen(true)} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1rem', borderRadius: 'var(--border-radius)',
                                backgroundColor: 'white', border: '1px solid #ddd', cursor: 'pointer'
                            }}>
                                <Settings size={16} /> Configurar Preço de Venda
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ backgroundColor: '#fff7ed', padding: '1.5rem', borderRadius: 'var(--border-radius)', borderLeft: '5px solid #f97316' }}>
                            <p style={{ color: '#9a3412', fontSize: '0.9rem', fontWeight: '600' }}>Receita Estimada (Venda)</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#7c2d12' }}>
                                R$ {financials.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                            <small style={{ color: '#9a3412' }}>Baseado em R$ {financials.sellingPrice}/L</small>
                        </div>

                        <div style={{ backgroundColor: '#fef2f2', padding: '1.5rem', borderRadius: 'var(--border-radius)', borderLeft: '5px solid #ef4444' }}>
                            <p style={{ color: '#991b1b', fontSize: '0.9rem', fontWeight: '600' }}>Custo Total (Compra)</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#7f1d1d' }}>
                                R$ {financials.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                            <small style={{ color: '#991b1b' }}>Pagamentos aos clientes</small>
                        </div>

                        <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: 'var(--border-radius)', borderLeft: '5px solid #22c55e' }}>
                            <p style={{ color: '#166534', fontSize: '0.9rem', fontWeight: '600' }}>Lucro Estimado</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#14532d' }}>
                                R$ {financials.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                {/* Ranking Chart */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.1rem' }}>Top 5 Clientes</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.ranking} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="Client.name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="totalQuantity" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                    {stats.ranking.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Chart */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.1rem' }}>Histórico Mensal</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Price Modal */}
            {isPriceModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: 'var(--border-radius)',
                        width: '100%', maxWidth: '400px', padding: '1.5rem',
                        boxShadow: 'var(--shadow-md)'
                    }}>
                        <h3 style={{ marginBottom: '1rem' }}>Configurar Preço de Venda</h3>
                        <p style={{ marginBottom: '1rem', color: '#666' }}>Defina o preço de venda do óleo reciclado</p>
                        <form onSubmit={handleUpdatePrice}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Preço (R$/L)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newPrice}
                                    onChange={e => setNewPrice(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setIsPriceModalOpen(false)} style={{
                                    padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius)',
                                    background: '#f5f5f5', color: 'var(--color-text)'
                                }}>Cancelar</button>
                                <button type="submit" style={{
                                    padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius)',
                                    background: 'var(--color-primary)', color: 'white', fontWeight: '600'
                                }}>Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
