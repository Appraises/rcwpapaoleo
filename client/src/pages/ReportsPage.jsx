import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../api/axios';
import { Droplet, Leaf, TrendingUp, Download } from 'lucide-react';

const ReportsPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Reusing dashboard stats for now, but in a real app would likely have specific report endpoints
                // To be creative, we'll calculate environmental impact on the frontend based on these stats
                const response = await api.get('/dashboard/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="p-8">Carregando relatórios...</div>;
    if (!stats) return <div className="p-8">Erro ao carregar dados.</div>;

    // Creative Calculations
    // 1 Liter of oil contaminates 25,000 liters of water
    const waterSaved = stats.totalGeneral * 25000;
    // Approx 2.5 kg of CO2 avoided per liter recycled into biodiesel
    const co2Avoided = stats.totalGeneral * 2.5;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text)' }}>Relatórios de Sustentabilidade</h2>
                <button
                    onClick={() => window.print()}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-primary)',
                        color: 'white', borderRadius: 'var(--border-radius)', border: 'none', cursor: 'pointer'
                    }}>
                    <Download size={18} /> Exportar PDF
                </button>
            </div>

            {/* Environmental Impact Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

                {/* Water Saved Card */}
                <div style={{
                    backgroundColor: '#e0f2fe', padding: '1.5rem', borderRadius: '1rem',
                    boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1.5rem'
                }}>
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '50%', color: '#0284c7' }}>
                        <Droplet size={32} />
                    </div>
                    <div>
                        <p style={{ color: '#0369a1', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>Água Preservada</p>
                        <h3 style={{ color: '#0c4a6e', fontSize: '1.8rem', fontWeight: 'bold' }}>
                            {waterSaved.toLocaleString('pt-BR')} <span style={{ fontSize: '1rem' }}>Litros</span>
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#075985' }}>1L óleo = 25.000L água</p>
                    </div>
                </div>

                {/* CO2 Avoided Card */}
                <div style={{
                    backgroundColor: '#dcfce7', padding: '1.5rem', borderRadius: '1rem',
                    boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1.5rem'
                }}>
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '50%', color: '#16a34a' }}>
                        <Leaf size={32} />
                    </div>
                    <div>
                        <p style={{ color: '#15803d', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>CO2 Evitado</p>
                        <h3 style={{ color: '#14532d', fontSize: '1.8rem', fontWeight: 'bold' }}>
                            {co2Avoided.toLocaleString('pt-BR')} <span style={{ fontSize: '1rem' }}>kg</span>
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#166534' }}>Reciclagem p/ Biodiesel</p>
                    </div>
                </div>

                {/* General Total */}
                <div style={{
                    backgroundColor: '#fff7ed', padding: '1.5rem', borderRadius: '1rem',
                    boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1.5rem'
                }}>
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '50%', color: '#ea580c' }}>
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <p style={{ color: '#c2410c', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>Total Coletado</p>
                        <h3 style={{ color: '#7c2d12', fontSize: '1.8rem', fontWeight: 'bold' }}>
                            {stats.totalGeneral.toLocaleString('pt-BR')} <span style={{ fontSize: '1rem' }}>L</span>
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#9a3412' }}>Desde o início</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

                {/* Monthly Trend Chart */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.1rem' }}>Evolução Mensal da Coleta</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#4caf50', strokeWidth: 2 }}
                                />
                                <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-primary)" }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Clients Distribution Chart */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.1rem' }}>Top 5 Clientes (Contribuição)</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.ranking.map((r) => ({ name: r.Client?.name || 'Unknown', value: parseInt(r.totalQuantity) }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.ranking.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
