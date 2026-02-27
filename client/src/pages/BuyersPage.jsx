import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import BuyerFormModal from '../components/BuyerFormModal';
import SaleFormModal from '../components/SaleFormModal';
import { Plus, Eye, Edit, Trash2, DollarSign } from 'lucide-react';

const BuyersPage = () => {
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states for Buyer
    const [showBuyerModal, setShowBuyerModal] = useState(false);
    const [currentBuyer, setCurrentBuyer] = useState(null);

    // Modal states for Sale
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [buyerForSale, setBuyerForSale] = useState(null);

    const fetchBuyers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/buyers');
            setBuyers(response.data);
        } catch (error) {
            console.error('Error fetching buyers:', error);
            alert('Falha ao carregar compradores.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyers();
    }, []);

    // Handlers for Buyer Form
    const handleShowBuyerModal = (buyer = null) => {
        setCurrentBuyer(buyer);
        setShowBuyerModal(true);
    };

    const handleCloseBuyerModal = () => {
        setShowBuyerModal(false);
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
            handleCloseBuyerModal();
        } catch (error) {
            console.error('Error saving buyer:', error);
            alert('Falha ao salvar comprador.');
        }
    };

    const handleDeleteBuyer = async (id) => {
        if (window.confirm('Tem certeza que deseja apagar este comprador? Todas as vendas atreladas a ele também serão excluídas.')) {
            try {
                await api.delete(`/buyers/${id}`);
                fetchBuyers();
            } catch (error) {
                console.error('Error deleting buyer:', error);
                alert('Falha ao apagar comprador.');
            }
        }
    };

    // Handlers for Sale Form
    const handleShowSaleModal = (buyer) => {
        setBuyerForSale(buyer);
        setShowSaleModal(true);
    };

    const handleCloseSaleModal = () => {
        setShowSaleModal(false);
        setBuyerForSale(null);
    };

    const handleSaveSale = async (saleData) => {
        try {
            await api.post(`/sales`, { ...saleData, buyerId: buyerForSale.id });
            handleCloseSaleModal();
            alert('Venda registrada com sucesso!');
            // Opicionalmente navegar para a página do comprador ou recarregar os dados se eles mudarem
        } catch (error) {
            console.error('Error saving sale:', error);
            alert('Falha ao salvar venda.');
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
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link
                        to="/vendas/historico"
                        style={{
                            backgroundColor: '#f3f4f6',
                            color: 'var(--color-text)',
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--border-radius)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: '1px solid #e5e7eb',
                            textDecoration: 'none',
                            fontWeight: 500
                        }}
                    >
                        Histórico Geral
                    </Link>
                    <button
                        onClick={() => handleShowBuyerModal()}
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
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : buyers.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)',
                    backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)'
                }}>
                    <p style={{ fontSize: '1.1rem' }}>Nenhum comprador cadastrado ainda.</p>
                </div>
            ) : (
                <>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                        {buyers.length} comprador{buyers.length !== 1 ? 'es' : ''}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {buyers.map(buyer => (
                            <div key={buyer.id} style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: 'var(--border-radius)',
                                boxShadow: 'var(--shadow-sm)',
                                borderLeft: '4px solid var(--color-primary)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 600, color: 'var(--color-primary)' }}>{buyer.name}</h3>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <span style={{
                                        backgroundColor: getTypeColor(buyer.type),
                                        color: 'white',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                    }}>
                                        {buyer.type || 'Outro'}
                                    </span>
                                </div>

                                {buyer.document && <p style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Doc: {buyer.document}</p>}
                                {buyer.phone && <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}><strong>Tel:</strong> {buyer.phone}</p>}
                                {buyer.address && <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{buyer.address}</p>}

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {/* Secondary Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link to={`/vendas/${buyer.id}`} style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            padding: '0.4rem',
                                            borderRadius: 'var(--border-radius)',
                                            border: '1px solid var(--color-primary)',
                                            color: 'var(--color-primary)',
                                            fontSize: '0.9rem'
                                        }}>
                                            Detalhes
                                        </Link>
                                        <button onClick={() => handleShowBuyerModal(buyer)} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '0.4rem 0.7rem', borderRadius: 'var(--border-radius)',
                                            backgroundColor: '#f0f0f0', color: 'var(--color-text)', border: 'none', cursor: 'pointer'
                                        }}>
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteBuyer(buyer.id)} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '0.4rem 0.7rem', borderRadius: 'var(--border-radius)',
                                            backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', cursor: 'pointer'
                                        }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Primary Action Button (Add Sale) */}
                                    <button
                                        onClick={() => handleShowSaleModal(buyer)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            padding: '0.6rem',
                                            borderRadius: 'var(--border-radius)',
                                            backgroundColor: '#10b981', // green for sales
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                    >
                                        <DollarSign size={18} /> Registrar Venda
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Buyer Modal */}
            {showBuyerModal && (
                <BuyerFormModal
                    show={showBuyerModal}
                    handleClose={handleCloseBuyerModal}
                    handleSave={handleSaveBuyer}
                    initialData={currentBuyer}
                />
            )}

            {/* Sale Modal */}
            {showSaleModal && (
                <SaleFormModal
                    show={showSaleModal}
                    handleClose={handleCloseSaleModal}
                    handleSave={handleSaveSale}
                    initialData={null}
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
