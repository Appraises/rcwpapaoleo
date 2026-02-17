import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, MapPin, Building2, Save, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
    const { user } = useAuth();

    // Oil selling price
    const [sellingPrice, setSellingPrice] = useState('');
    const [priceLoading, setPriceLoading] = useState(true);
    const [priceSaved, setPriceSaved] = useState(false);

    // Base/HQ location
    const [baseName, setBaseName] = useState(() => localStorage.getItem('catoleo_base_name') || 'Base da Empresa');
    const [baseLat, setBaseLat] = useState(() => {
        const saved = localStorage.getItem('catoleo_base_lat');
        return saved || '-10.9472';
    });
    const [baseLng, setBaseLng] = useState(() => {
        const saved = localStorage.getItem('catoleo_base_lng');
        return saved || '-37.0731';
    });
    const [baseSaved, setBaseSaved] = useState(false);

    // Company info
    const [companyName, setCompanyName] = useState(() => localStorage.getItem('catoleo_company_name') || '');
    const [companyCnpj, setCompanyCnpj] = useState(() => localStorage.getItem('catoleo_company_cnpj') || '');
    const [companyPhone, setCompanyPhone] = useState(() => localStorage.getItem('catoleo_company_phone') || '');
    const [companySaved, setCompanySaved] = useState(false);

    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await api.get('/dashboard/financial');
                setSellingPrice(response.data.sellingPrice || '');
            } catch (error) {
                console.error('Error fetching selling price:', error);
            } finally {
                setPriceLoading(false);
            }
        };
        if (user?.role === 'admin') {
            fetchPrice();
        } else {
            setPriceLoading(false);
        }
    }, [user]);

    const handleSavePrice = async (e) => {
        e.preventDefault();
        try {
            await api.post('/dashboard/financial/price', { price: parseFloat(sellingPrice) });
            setPriceSaved(true);
            setTimeout(() => setPriceSaved(false), 2500);
        } catch (error) {
            console.error('Error updating price:', error);
            alert('Erro ao atualizar preço.');
        }
    };

    const handleSaveBase = (e) => {
        e.preventDefault();
        localStorage.setItem('catoleo_base_name', baseName);
        localStorage.setItem('catoleo_base_lat', baseLat);
        localStorage.setItem('catoleo_base_lng', baseLng);
        setBaseSaved(true);
        setTimeout(() => setBaseSaved(false), 2500);
    };

    const handleSaveCompany = (e) => {
        e.preventDefault();
        localStorage.setItem('catoleo_company_name', companyName);
        localStorage.setItem('catoleo_company_cnpj', companyCnpj);
        localStorage.setItem('catoleo_company_phone', companyPhone);
        setCompanySaved(true);
        setTimeout(() => setCompanySaved(false), 2500);
    };

    // Styles
    const pageStyle = {
        padding: '2rem',
        maxWidth: '720px',
        margin: '0 auto',
    };

    const cardStyle = {
        backgroundColor: 'white',
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--shadow-sm)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        border: '1px solid #e5e7eb',
    };

    const cardHeaderStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        marginBottom: '1.25rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #f3f4f6',
    };

    const cardTitleStyle = {
        fontSize: '1.05rem',
        fontWeight: '600',
        color: '#1f2937',
        margin: 0,
    };

    const iconBadgeStyle = (color) => ({
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
    });

    const labelStyle = {
        display: 'block',
        fontSize: '0.82rem',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '0.35rem',
    };

    const inputStyle = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        fontSize: '0.9rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    };

    const fieldGroupStyle = {
        marginBottom: '1rem',
    };

    const rowStyle = {
        display: 'flex',
        gap: '0.75rem',
    };

    const btnSaveStyle = (saved) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.25rem',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '0.85rem',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        backgroundColor: saved ? '#16a34a' : 'var(--color-primary)',
        color: 'white',
    });

    return (
        <div className="settings-page" style={pageStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.75rem' }}>
                <Settings size={24} color="var(--color-primary)" />
                <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-primary-dark)' }}>Configurações</h2>
            </div>

            {/* Oil Selling Price — Admin only */}
            {user?.role === 'admin' && (
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <div style={iconBadgeStyle('#fef3c7')}>
                            <DollarSign size={20} color="#d97706" />
                        </div>
                        <h3 style={cardTitleStyle}>Preço de Venda do Óleo</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem', marginTop: 0 }}>
                        Defina o preço por litro do óleo reciclado para cálculo de receita no Dashboard.
                    </p>
                    <form onSubmit={handleSavePrice}>
                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>Preço (R$/Litro)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                placeholder={priceLoading ? 'Carregando...' : '0.00'}
                                disabled={priceLoading}
                                style={inputStyle}
                                required
                            />
                        </div>
                        <button type="submit" style={btnSaveStyle(priceSaved)} disabled={priceLoading}>
                            {priceSaved ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar Preço</>}
                        </button>
                    </form>
                </div>
            )}

            {/* Base/HQ Location */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <div style={iconBadgeStyle('#dcfce7')}>
                        <MapPin size={20} color="#16a34a" />
                    </div>
                    <h3 style={cardTitleStyle}>Base / Sede da Empresa</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem', marginTop: 0 }}>
                    Ponto de partida e retorno das rotas de coleta (Roteirização).
                </p>
                <form onSubmit={handleSaveBase}>
                    <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Nome da Base</label>
                        <input
                            type="text"
                            value={baseName}
                            onChange={(e) => setBaseName(e.target.value)}
                            placeholder="Ex: Sede CatÓleo"
                            style={inputStyle}
                            required
                        />
                    </div>
                    <div style={{ ...fieldGroupStyle, ...rowStyle }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Latitude</label>
                            <input
                                type="number"
                                step="any"
                                value={baseLat}
                                onChange={(e) => setBaseLat(e.target.value)}
                                placeholder="-10.9472"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Longitude</label>
                            <input
                                type="number"
                                step="any"
                                value={baseLng}
                                onChange={(e) => setBaseLng(e.target.value)}
                                placeholder="-37.0731"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" style={btnSaveStyle(baseSaved)}>
                        {baseSaved ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar Base</>}
                    </button>
                </form>
            </div>

            {/* Company Info */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <div style={iconBadgeStyle('#e0e7ff')}>
                        <Building2 size={20} color="#4f46e5" />
                    </div>
                    <h3 style={cardTitleStyle}>Dados da Empresa</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem', marginTop: 0 }}>
                    Informações para relatórios e documentos futuros.
                </p>
                <form onSubmit={handleSaveCompany}>
                    <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Nome da Empresa</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Ex: CatÓleo Reciclagem LTDA"
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ ...fieldGroupStyle, ...rowStyle }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>CNPJ</label>
                            <input
                                type="text"
                                value={companyCnpj}
                                onChange={(e) => setCompanyCnpj(e.target.value)}
                                placeholder="00.000.000/0001-00"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Telefone</label>
                            <input
                                type="text"
                                value={companyPhone}
                                onChange={(e) => setCompanyPhone(e.target.value)}
                                placeholder="(79) 99999-9999"
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <button type="submit" style={btnSaveStyle(companySaved)}>
                        {companySaved ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar Dados</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
