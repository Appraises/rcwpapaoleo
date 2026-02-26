import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, MapPin, Building2, Save, CheckCircle, QrCode, RefreshCw, Wifi, WifiOff, Truck, Play } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const formatCNPJ = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 14) v = v.substring(0, 14);
    if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    }
    return v;
};

const formatPhone = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length <= 10) {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return v;
};

const SettingsPage = () => {
    const { user } = useAuth();

    // Oil selling price
    const [sellingPrice, setSellingPrice] = useState('');
    const [priceLoading, setPriceLoading] = useState(true);
    const [priceSaved, setPriceSaved] = useState(false);

    // Base/HQ location (persisted in SystemSetting)
    const [baseName, setBaseName] = useState('Base da Empresa');
    const [baseLat, setBaseLat] = useState('-10.9472');
    const [baseLng, setBaseLng] = useState('-37.0731');
    const [baseSaved, setBaseSaved] = useState(false);

    // Dispatch config (persisted in SystemSetting)
    const [collectors, setCollectors] = useState([]);
    const [primaryCollectorId, setPrimaryCollectorId] = useState('');
    const [secondaryCollectorId, setSecondaryCollectorId] = useState('');
    const [splitThreshold, setSplitThreshold] = useState('15');
    const [ownerPhone, setOwnerPhone] = useState('');
    const [dispatchSaved, setDispatchSaved] = useState(false);
    const [dispatching, setDispatching] = useState(false);
    const [dispatchResult, setDispatchResult] = useState(null);

    // Company info
    const [companyName, setCompanyName] = useState(() => localStorage.getItem('catoleo_company_name') || '');
    const [companyCnpj, setCompanyCnpj] = useState(() => formatCNPJ(localStorage.getItem('catoleo_company_cnpj') || ''));
    const [companyPhone, setCompanyPhone] = useState(() => formatPhone(localStorage.getItem('catoleo_company_phone') || ''));
    const [companySaved, setCompanySaved] = useState(false);

    // WhatsApp state
    const [waStatus, setWaStatus] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [loadingWa, setLoadingWa] = useState(false);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchPrice();
            fetchWaStatus();
            fetchSettings();
            fetchCollectors();
        } else {
            setPriceLoading(false);
        }
    }, [user]);

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

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings?keys=base_lat,base_lng,base_name,dispatch_primary_collector_id,dispatch_secondary_collector_id,dispatch_split_threshold,dispatch_owner_phone');
            const s = res.data;
            if (s.base_name) setBaseName(s.base_name);
            if (s.base_lat) setBaseLat(s.base_lat);
            if (s.base_lng) setBaseLng(s.base_lng);
            if (s.dispatch_primary_collector_id) setPrimaryCollectorId(s.dispatch_primary_collector_id);
            if (s.dispatch_secondary_collector_id) setSecondaryCollectorId(s.dispatch_secondary_collector_id);
            if (s.dispatch_split_threshold) setSplitThreshold(s.dispatch_split_threshold);
            if (s.dispatch_owner_phone) setOwnerPhone(formatPhone(s.dispatch_owner_phone));
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchCollectors = async () => {
        try {
            const res = await api.get('/auth/users');
            setCollectors(res.data.filter(u => u.isCollector && u.phone));
        } catch (error) {
            console.error('Error fetching collectors:', error);
        }
    };

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

    const handleSaveBase = async (e) => {
        e.preventDefault();
        try {
            await api.put('/settings', {
                base_name: baseName,
                base_lat: baseLat,
                base_lng: baseLng
            });
            // Also keep localStorage in sync for RoutePage
            localStorage.setItem('catoleo_base_name', baseName);
            localStorage.setItem('catoleo_base_lat', baseLat);
            localStorage.setItem('catoleo_base_lng', baseLng);
            setBaseSaved(true);
            setTimeout(() => setBaseSaved(false), 2500);
        } catch (error) {
            console.error('Error saving base:', error);
            alert('Erro ao salvar base.');
        }
    };

    const handleSaveDispatch = async (e) => {
        e.preventDefault();
        try {
            await api.put('/settings', {
                dispatch_primary_collector_id: primaryCollectorId,
                dispatch_secondary_collector_id: secondaryCollectorId,
                dispatch_split_threshold: splitThreshold,
                dispatch_owner_phone: ownerPhone
            });
            setDispatchSaved(true);
            setTimeout(() => setDispatchSaved(false), 2500);
        } catch (error) {
            console.error('Error saving dispatch config:', error);
            alert('Erro ao salvar configurações de despacho.');
        }
    };

    const handleManualDispatch = async () => {
        if (!window.confirm('Deseja executar o despacho de rotas agora? Isso enviará as rotas via WhatsApp para os coletadores.')) return;
        setDispatching(true);
        setDispatchResult(null);
        try {
            const res = await api.post('/dispatch/run');
            setDispatchResult(res.data);
        } catch (error) {
            console.error('Error dispatching:', error);
            setDispatchResult({ dispatched: false, reason: error.response?.data?.error || error.message });
        } finally {
            setDispatching(false);
        }
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

    const selectStyle = {
        ...inputStyle,
        backgroundColor: 'white',
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

            {/* Dispatch Configuration — Admin only */}
            {user?.role === 'admin' && (
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <div style={iconBadgeStyle('#dbeafe')}>
                            <Truck size={20} color="#2563eb" />
                        </div>
                        <h3 style={cardTitleStyle}>Despacho Diário de Rotas</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem', marginTop: 0 }}>
                        Configuração do envio automático de rotas otimizadas para coletadores via WhatsApp (todos os dias às 6h).
                    </p>
                    <form onSubmit={handleSaveDispatch}>
                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>Coletador Primário</label>
                            <select
                                value={primaryCollectorId}
                                onChange={(e) => setPrimaryCollectorId(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="">Selecionar coletador principal...</option>
                                {collectors.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                                ))}
                            </select>
                        </div>
                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>Coletador Secundário (se muitas solicitações)</label>
                            <select
                                value={secondaryCollectorId}
                                onChange={(e) => setSecondaryCollectorId(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="">Nenhum (apenas 1 coletador)</option>
                                {collectors.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                                ))}
                            </select>
                        </div>
                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>Limiar para dividir rotas</label>
                            <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0', marginBottom: '0.35rem' }}>
                                Se tiver mais que esse número de solicitações, a rota é dividida entre 2 coletadores.
                            </p>
                            <input
                                type="number"
                                min="1"
                                value={splitThreshold}
                                onChange={(e) => setSplitThreshold(e.target.value)}
                                style={{ ...inputStyle, maxWidth: '120px' }}
                            />
                        </div>
                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>WhatsApp do Dono/Admin (para relatório diário)</label>
                            <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0', marginBottom: '0.35rem' }}>
                                Recebe o resumo das coletas do dia quando o coletador finalizar o expediente.
                            </p>
                            <input
                                type="text"
                                value={ownerPhone}
                                onChange={(e) => setOwnerPhone(e.target.value)}
                                placeholder="(79) 99999-9999"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button type="submit" style={btnSaveStyle(dispatchSaved)}>
                                {dispatchSaved ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar Config</>}
                            </button>
                            <button type="button" onClick={handleManualDispatch} disabled={dispatching} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem',
                                border: '1px solid #d1d5db', cursor: dispatching ? 'not-allowed' : 'pointer',
                                backgroundColor: '#f9fafb', color: '#374151',
                                transition: 'all 0.25s ease',
                            }}>
                                <Play size={16} />
                                {dispatching ? 'Despachando...' : 'Despachar Agora'}
                            </button>
                        </div>
                    </form>
                    {dispatchResult && (
                        <div style={{
                            marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px',
                            backgroundColor: dispatchResult.dispatched ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${dispatchResult.dispatched ? '#bbf7d0' : '#fecaca'}`,
                            fontSize: '0.85rem', color: dispatchResult.dispatched ? '#166534' : '#991b1b'
                        }}>
                            {dispatchResult.dispatched
                                ? `✅ Rotas despachadas com sucesso! Modo: ${dispatchResult.mode === 'dual' ? '2 coletadores' : '1 coletador'}`
                                : `❌ Não foi possível despachar: ${dispatchResult.reason}`
                            }
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
                    Ponto de partida e retorno das rotas de coleta (Roteirização e Despacho).
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
                                onChange={(e) => setCompanyCnpj(formatCNPJ(e.target.value))}
                                placeholder="00.000.000/0001-00"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Telefone</label>
                            <input
                                type="text"
                                value={companyPhone}
                                onChange={(e) => setCompanyPhone(formatPhone(e.target.value))}
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
