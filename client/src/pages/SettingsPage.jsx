import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, MapPin, Building2, Save, CheckCircle, QrCode, RefreshCw, Wifi, WifiOff } from 'lucide-react';
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

    // WhatsApp state
    const [waStatus, setWaStatus] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [loadingWa, setLoadingWa] = useState(false);

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
            fetchWaStatus();
        } else {
            setPriceLoading(false);
        }
    }, [user]);

    const fetchWaStatus = async () => {
        try {
            const res = await api.get('/evolution/status');
            setWaStatus(res.data?.instance?.state || 'not_connected');
        } catch {
            setWaStatus('error');
        }
    };

    const fetchQrCode = async () => {
        setLoadingWa(true);
        try {
            const res = await api.get('/evolution/qr');
            if (res.data?.base64) {
                setQrCode(res.data.base64);
            } else if (res.status === 202 || res.data?.hint) {
                alert(res.data?.error || 'QR Code ainda não está pronto. Tente novamente em alguns segundos.');
            }
        } catch (error) {
            const msg = error.response?.data?.error || 'Falha ao gerar QR Code';
            alert(msg);
        } finally {
            setLoadingWa(false);
        }
    };

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
        flexWrap: 'wrap',
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

            {/* WhatsApp Integration — Admin only */}
            {user?.role === 'admin' && (
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <div style={iconBadgeStyle('#dcfce7')}>
                            {waStatus === 'open' ? <Wifi size={20} color="#16a34a" /> : <WifiOff size={20} color="#991b1b" />}
                        </div>
                        <h3 style={cardTitleStyle}>WhatsApp & Assistente Automático</h3>
                        <span style={{
                            marginLeft: 'auto',
                            padding: '0.2rem 0.7rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold',
                            backgroundColor: waStatus === 'open' ? '#dcfce7' : '#fee2e2',
                            color: waStatus === 'open' ? '#16a34a' : '#991b1b'
                        }}>
                            {waStatus === 'open' ? '● Conectado' : '● Desconectado'}
                        </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem', marginTop: 0 }}>
                        Conecte o WhatsApp da empresa para que o assistente automático responda solicitações de clientes.
                    </p>

                    {waStatus === 'open' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <Wifi size={20} color="#16a34a" />
                            <div>
                                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#166534' }}>WhatsApp conectado e operante!</p>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803d' }}>O assistente automático está respondendo as mensagens.</p>
                            </div>
                            <button onClick={fetchWaStatus} style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                <RefreshCw size={14} /> Atualizar
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.25rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            {qrCode ? (
                                <>
                                    <p style={{ fontSize: '0.9rem', color: '#333', fontWeight: 'bold', margin: 0 }}>Escaneie com o WhatsApp da Empresa:</p>
                                    <img src={qrCode} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px', borderRadius: '10px' }} />
                                    <button
                                        onClick={() => { setQrCode(null); fetchWaStatus(); }}
                                        style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        <RefreshCw size={14} /> Já escaneei (Atualizar Status)
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={fetchQrCode}
                                    disabled={loadingWa}
                                    style={{
                                        padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-primary)', color: 'white',
                                        borderRadius: '8px', fontWeight: 'bold', cursor: loadingWa ? 'not-allowed' : 'pointer', border: 'none', fontSize: '0.9rem',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                    <QrCode size={18} />
                                    {loadingWa ? 'Gerando...' : 'Gerar QR Code'}
                                </button>
                            )}
                        </div>
                    )}
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
                            placeholder="Ex: Sede Cat Óleo"
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
                            placeholder="Ex: Cat Óleo Reciclagem LTDA"
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
