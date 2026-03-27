import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import CollectionModal from '../components/CollectionModal';
import toast from 'react-hot-toast';
import { confirmToast } from '../utils/confirmToast';

const CollectionsPage = () => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const response = await api.get('/collections');
            setCollections(response.data);
        } catch (error) {
            console.error('Error fetching collections:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const handleDelete = async (id) => {
        confirmToast('Excluir esta coleta?', async () => {
            try {
                await api.delete(`/collections/${id}`);
                toast.success('Coleta excluída com sucesso.');
                fetchCollections();
            } catch (error) {
                console.error('Error deleting collection:', error);
                toast.error('Erro ao excluir coleta.');
            }
        });
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>Todas as Coletas</h2>
                <button onClick={() => setIsModalOpen(true)} style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--border-radius)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Plus size={20} />
                    Nova Coleta
                </button>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : collections.length === 0 ? (
                <p>Nenhuma coleta registrada.</p>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                            <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid #eee' }}>
                                <tr>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Data</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Cliente</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Coletor</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Qtd (L)</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Observação</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map(col => (
                                    <tr key={col.id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8f9fa' } }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{new Date(col.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span
                                                onClick={() => col.Client?.id && navigate(`/clients/${col.Client.id}`)}
                                                style={{
                                                    cursor: col.Client?.id ? 'pointer' : 'default',
                                                    color: col.Client?.id ? '#60a5fa' : 'var(--color-text)',
                                                    backgroundColor: col.Client?.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                    border: col.Client?.id ? '1px solid rgba(59, 130, 246, 0.2)' : 'none',
                                                    padding: col.Client?.id ? '4px 10px' : '0',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    display: 'inline-block',
                                                    transition: 'all 0.2s ease',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}
                                                onMouseOver={e => {
                                                    if (col.Client?.id) {
                                                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                                    }
                                                }}
                                                onMouseOut={e => {
                                                    if (col.Client?.id) {
                                                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                                                    }
                                                }}
                                            >
                                                {col.Client?.name || 'N/A'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', color: '#555' }}>
                                            {col.User?.name || col.User?.email || '-'}
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{col.quantity}</td>
                                        <td style={{ padding: '1rem', color: '#666' }}>
                                            {col.isTrocaDescarte && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.75rem', fontWeight: '600', marginRight: '0.5rem' }}>TROCA/DESCARTE</span>}
                                            {col.observation || (col.isTrocaDescarte ? '' : '-')}
                                        </td>
                                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button onClick={() => handleDelete(col.id)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', outline: 'none' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <CollectionModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { setIsModalOpen(false); fetchCollections(); }}
                />
            )}
        </div>
    );
};

export default CollectionsPage;
