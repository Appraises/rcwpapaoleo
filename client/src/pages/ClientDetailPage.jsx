import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Package, Droplet, Calendar, TrendingUp, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import CollectionModal from '../components/CollectionModal';

const CONTAINER_SIZES = [200, 100, 60, 50, 30];

const calculateContainers = (rawLiters) => {
    const liters = parseFloat(rawLiters);
    if (!liters || isNaN(liters) || liters <= 0) return null;
    const containers = [];
    let remaining = liters;
    for (const size of CONTAINER_SIZES) {
        const count = Math.floor(remaining / size);
        if (count > 0) {
            containers.push({ size, count });
            remaining -= count * size;
        }
    }
    if (remaining > 0) {
        const smallest = [...CONTAINER_SIZES].reverse().find(s => s >= remaining) || CONTAINER_SIZES[CONTAINER_SIZES.length - 1];
        const existing = containers.find(c => c.size === smallest);
        if (existing) existing.count += 1;
        else containers.push({ size: smallest, count: 1 });
    }
    const totalCapacity = containers.reduce((sum, c) => sum + c.size * c.count, 0);
    const totalContainers = containers.reduce((sum, c) => sum + c.count, 0);
    return { containers, totalCapacity, totalContainers };
};

const formatDocument = (val) => {
    if (!val) return '';
    const value = val.toString();
    let v = value.replace(/\D/g, '');
    if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
        if (v.length > 18) v = v.substring(0, 18);
    }
    return v;
};

const formatPhone = (val) => {
    if (!val) return '';
    const value = val.toString();
    let v = value.replace(/\D/g, '');
    if (v.length <= 10) {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
        if (v.length > 15) v = v.substring(0, 15);
    }
    return v;
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const ClientDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [clientRes, collectionsRes] = await Promise.all([
                api.get(`/clients/${id}`),
                api.get(`/clients/${id}/collections`)
            ]);
            setClient(clientRes.data);
            setCollections(collectionsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleDeleteCollection = async (collectionId) => {
        if (window.confirm('Excluir esta coleta?')) {
            try {
                await api.delete(`/collections/${collectionId}`);
                fetchData();
            } catch (error) {
                console.error('Error deleting collection:', error);
            }
        }
    };

    // Build monthly chart data (last 6 months)
    const monthlyChartData = useMemo(() => {
        const now = new Date();
        const months = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months[key] = { name: MONTH_NAMES[d.getMonth()], litros: 0 };
        }
        collections.forEach(col => {
            const d = new Date(col.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (months[key]) months[key].litros += col.quantity;
        });
        return Object.values(months);
    }, [collections]);

    const containerRecommendation = useMemo(() => {
        return calculateContainers(client?.averageOilLiters);
    }, [client?.averageOilLiters]);

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Carregando...</div>;
    if (!client) return <div className="container" style={{ padding: '2rem' }}>Cliente não encontrado.</div>;

    const totalCollected = collections.reduce((acc, curr) => acc + curr.quantity, 0);
    const lastCollection = collections.length > 0 ? new Date(collections[0].date) : null;

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <button onClick={() => navigate('/clients')} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem',
                background: 'none', color: 'var(--color-text-light)', fontSize: '0.9rem'
            }}>
                <ArrowLeft size={16} /> Voltar para lista
            </button>

            {/* Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.6rem', backgroundColor: '#e0f2fe', borderRadius: '50%', color: '#0284c7' }}>
                        <Droplet size={20} />
                    </div>
                    <div>
                        <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>Total Coletado</p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0, color: '#0284c7' }}>{totalCollected}L</p>
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.6rem', backgroundColor: '#dcfce7', borderRadius: '50%', color: '#16a34a' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>Nº de Coletas</p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0, color: '#16a34a' }}>{collections.length}</p>
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.6rem', backgroundColor: '#fef3c7', borderRadius: '50%', color: '#d97706' }}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>Última Coleta</p>
                        <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: '#d97706' }}>
                            {lastCollection ? lastCollection.toLocaleDateString('pt-BR') : 'Nenhuma'}
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>

                {/* Client Info Card */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{client.name}</h2>
                            {client.tradeName && <p style={{ color: '#888', fontSize: '0.95rem', margin: '0.25rem 0 0' }}>{client.tradeName}</p>}
                        </div>
                        <Link to={`/clients/${client.id}/edit`} style={{ padding: '0.5rem', color: 'var(--color-text-light)' }}><Edit size={18} /></Link>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem', color: '#555' }}>
                        <p><strong>CNPJ/CPF:</strong> {formatDocument(client.document)}</p>
                        <p><strong>Telefone Principal:</strong> {formatPhone(client.phone)}</p>
                        {client.additionalPhones && client.additionalPhones.length > 0 && (
                            <div style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #e2e8f0', marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Números Adicionais:</p>
                                {client.additionalPhones.map((p, idx) => (
                                    <p key={idx} style={{ margin: '0', fontSize: '0.9rem', color: '#475569' }}>• {formatPhone(p.phone)}</p>
                                ))}
                            </div>
                        )}
                        <p><strong>Endereço:</strong> {client.address}</p>

                        {((client.latitude && client.longitude) || (client.Address?.latitude && client.Address?.longitude)) && (
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${client.latitude || client.Address?.latitude},${client.longitude || client.Address?.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    color: '#0284c7', fontSize: '0.85rem', textDecoration: 'none',
                                    marginTop: '-0.25rem', marginBottom: '0.25rem'
                                }}
                            >
                                <MapPin size={14} /> Abrir no Google Maps (Debug)
                            </a>
                        )}

                        {client.observations && <p><strong>Obs:</strong> {client.observations}</p>}

                        {client.averageOilLiters > 0 && (
                            <div style={{ marginTop: '0.75rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--border-radius)', border: '1px solid #bbf7d0' }}>
                                <p style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '0.25rem' }}>Média Esperada: <strong>{client.averageOilLiters}L</strong></p>
                                {containerRecommendation && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', color: '#166534', fontSize: '0.85rem' }}>
                                            <Package size={14} /> Recipientes:
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                            {containerRecommendation.containers.map((c, i) => (
                                                <span key={i} style={{
                                                    backgroundColor: '#dcfce7', color: '#166534',
                                                    padding: '0.2rem 0.6rem', borderRadius: '999px',
                                                    fontSize: '0.8rem', fontWeight: '500'
                                                }}>
                                                    {c.count}x {c.size}L
                                                </span>
                                            ))}
                                        </div>
                                        <small style={{ color: '#15803d', fontSize: '0.75rem' }}>
                                            Cap. total: {containerRecommendation.totalCapacity}L ({containerRecommendation.totalContainers} rec.)
                                        </small>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Collections History + Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Mini Monthly Chart */}
                    {collections.length > 0 && (
                        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#333' }}>Evolução Mensal (últimos 6 meses)</h4>
                            <div style={{ height: '160px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyChartData}>
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} width={35} />
                                        <Tooltip formatter={(v) => [`${v}L`, 'Coletado']} />
                                        <Bar dataKey="litros" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Histórico de Coletas</h3>
                            <button onClick={() => setIsModalOpen(true)} style={{
                                backgroundColor: 'var(--color-secondary)',
                                color: 'var(--color-text)',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--border-radius)',
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                fontWeight: '600'
                            }}>
                                <Plus size={18} /> Nova Coleta
                            </button>
                        </div>

                        {collections.length === 0 ? (
                            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>Nenhuma coleta registrada.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                            <th style={{ padding: '0.75rem' }}>Data</th>
                                            <th style={{ padding: '0.75rem' }}>Qtd (L)</th>
                                            <th style={{ padding: '0.75rem' }}>Coletor</th>
                                            <th style={{ padding: '0.75rem' }}>Observação</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {collections.map(col => (
                                            <tr key={col.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '0.75rem' }}>{new Date(col.date).toLocaleDateString('pt-BR')}</td>
                                                <td style={{ padding: '0.75rem', fontWeight: '500' }}>{col.quantity}</td>
                                                <td style={{ padding: '0.75rem', color: '#555' }}>{col.User?.name || '-'}</td>
                                                <td style={{ padding: '0.75rem', color: '#666', fontSize: '0.9rem' }}>{col.observation || '-'}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                    <button onClick={() => handleDeleteCollection(col.id)} style={{ color: 'var(--color-error)', background: 'none' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <CollectionModal
                    clientId={id}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { setIsModalOpen(false); fetchData(); }}
                />
            )}
        </div>
    );
};

export default ClientDetailPage;
