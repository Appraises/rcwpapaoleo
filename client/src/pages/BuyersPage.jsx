import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import BuyerFormModal from '../components/BuyerFormModal';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';

const BuyersPage = () => {
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentBuyer, setCurrentBuyer] = useState(null);

    const fetchBuyers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/buyers');
            setBuyers(response.data);
        } catch (error) {
            console.error('Error fetching buyers:', error);
            alert('Failed to load buyers.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyers();
    }, []);

    const handleShowModal = (buyer = null) => {
        setCurrentBuyer(buyer);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentBuyer(null);
    };

    const handleSaveBuyer = async (buyerData) => {
        try {
            if (currentBuyer) {
                await api.put(`/buyers/${currentBuyer.id}`, buyerData);
            } else {
                await api.post(`/buyers`, buyerData);
            }
            fetchBuyers();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving buyer:', error);
            alert('Failed to save buyer.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this buyer? All sales records attached to it will also be deleted.')) {
            try {
                await api.delete(`/buyers/${id}`);
                fetchBuyers();
            } catch (error) {
                console.error('Error deleting buyer:', error);
                alert('Failed to delete buyer.');
            }
        }
    };

    const getTypeColor = (type) => {
        if (type === 'Usina') return '#0dcaf0';
        if (type === 'Granja') return '#ffc107';
        return '#6c757d';
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>Compradores (Vendas)</h2>
                <button
                    onClick={() => handleShowModal()}
                    style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--border-radius)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={20} />
                    Novo Comprador
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid #eee' }}>
                                <tr>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Nome</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Tipo</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Telefone</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {buyers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Ainda não há compradores cadastrados.</td>
                                    </tr>
                                ) : (
                                    buyers.map((buyer) => (
                                        <tr key={buyer.id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s' }}>
                                            <td style={{ padding: '1rem', fontWeight: '500' }}>{buyer.name}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    backgroundColor: getTypeColor(buyer.type),
                                                    color: 'white',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '1rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {buyer.type || 'Outro'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--color-text-light)' }}>{buyer.phone || '-'}</td>
                                            <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <Link to={`/vendas/${buyer.id}`} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                                                    <Eye size={18} />
                                                </Link>
                                                <button onClick={() => handleShowModal(buyer)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(buyer.id)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <BuyerFormModal
                    show={showModal}
                    handleClose={handleCloseModal}
                    handleSave={handleSaveBuyer}
                    initialData={currentBuyer}
                />
            )}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default BuyersPage;
