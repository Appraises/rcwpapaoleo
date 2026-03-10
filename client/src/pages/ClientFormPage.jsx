import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package, Plus, X } from 'lucide-react';
import api from '../api/axios';

// Removed calculateContainers as per request (Client Receptacles are now manual boolean checkboxes)

// CPF / CNPJ formatting and validation helpers
const formatDocument = (value) => {
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

const isValidCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let add = 0, rev;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    return true;
};

const isValidCNPJ = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != digits.charAt(0)) return false;
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != digits.charAt(1)) return false;
    return true;
};

const formatPhone = (value) => {
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

const formatCep = (value) => {
    let v = value.replace(/\D/g, '');
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    if (v.length > 9) v = v.substring(0, 9);
    return v;
};

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const ClientFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        tradeName: '',
        document: '',
        phone: '',
        additionalPhones: [],
        address: '', // legacy
        street: '',
        number: '',
        district: '',
        city: '',
        state: '',
        zip: '',
        reference: '',
        observations: '',
        pricePerLiter: '',
        averageOilLiters: '',
        latitude: '',
        longitude: '',
        has25L: false,
        has50L: false,
        has100L: false,
        has200L: false,
        recurrenceDays: ''
    });
    const [error, setError] = useState('');
    const [docError, setDocError] = useState('');
    const [geocoding, setGeocoding] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [cnpjLoading, setCnpjLoading] = useState(false);
    const [cities, setCities] = useState([]);
    const [citiesLoading, setCitiesLoading] = useState(false);

    const handleGeocode = async () => {
        // Silent check: Only trigger if we have all necessary info
        if (!formData.street || !formData.number || !formData.city || !formData.state) {
            return;
        }

        const query = `${formData.street}, ${formData.number}, ${formData.city} - ${formData.state}`;

        setGeocoding(true);
        try {
            // Using backend proxy to Google Maps Geocoding API (API key stays server-side)
            const response = await api.get('/settings/geocode', { params: { address: query } });
            const { lat, lng } = response.data;

            if (lat && lng) {
                setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        } finally {
            setGeocoding(false);
        }
    };

    // --- BrasilAPI CNPJ lookup ---
    const handleCnpjLookup = async (rawCnpj) => {
        if (rawCnpj.length !== 14 || !isValidCNPJ(rawCnpj)) return;

        setCnpjLoading(true);
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`);
            if (!response.ok) return;
            const data = await response.json();

            // Helper: capitalize "BRASILIA" -> "Brasilia"
            const capitalize = (str) => {
                if (!str) return '';
                return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
            };

            // Build logradouro with tipo (e.g. "Rua XV de Novembro")
            const logradouro = [data.descricao_tipo_de_logradouro, data.logradouro]
                .filter(Boolean)
                .map(s => capitalize(s))
                .join(' ');

            setFormData(prev => ({
                ...prev,
                name: prev.name || data.razao_social || '',
                tradeName: prev.tradeName || data.nome_fantasia || '',
                zip: prev.zip || (data.cep ? formatCep(data.cep) : ''),
                street: prev.street || logradouro,
                number: prev.number || (data.numero && data.numero !== 'SN' ? data.numero : ''),
                district: prev.district || capitalize(data.bairro || ''),
                city: prev.city || capitalize(data.municipio || ''),
                state: prev.state || data.uf || ''
            }));
        } catch (error) {
            console.error('BrasilAPI CNPJ Error:', error);
        } finally {
            setCnpjLoading(false);
        }
    };

    const handleZipBlur = async (e) => {
        const zip = e.target.value.replace(/\D/g, '');
        if (zip.length !== 8) return;

        setCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    street: data.logradouro || prev.street,
                    district: data.bairro || prev.district,
                    city: data.localidade || prev.city,
                    state: data.uf || prev.state
                }));
            }
        } catch (error) {
            console.error('ViaCEP Error:', error);
        } finally {
            setCepLoading(false);
        }
    };

    // Fetch cities from IBGE when state changes
    useEffect(() => {
        if (!formData.state) {
            setCities([]);
            return;
        }
        const fetchCities = async () => {
            setCitiesLoading(true);
            try {
                const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios?orderBy=nome`);
                const data = await res.json();
                setCities(data.map(m => m.nome));
            } catch (err) {
                console.error('Erro ao buscar cidades:', err);
                setCities([]);
            } finally {
                setCitiesLoading(false);
            }
        };
        fetchCities();
    }, [formData.state]);

    useEffect(() => {
        if (id) {
            const fetchClient = async () => {
                try {
                    const response = await api.get(`/clients/${id}`);
                    const client = response.data;
                    // Flatten Address object if exists
                    const addressData = client.Address || {};

                    setFormData({
                        name: client.name || '',
                        tradeName: client.tradeName || '',
                        document: client.document ? formatDocument(client.document) : '',
                        phone: client.phone ? formatPhone(client.phone) : '',
                        additionalPhones: (client.additionalPhones || []).map(p => formatPhone(p.phone)),
                        address: client.address || '', // legacy
                        street: addressData.street || '',
                        number: addressData.number || '',
                        district: addressData.district || '',
                        city: addressData.city || '',
                        state: addressData.state || '',
                        zip: addressData.zip ? formatCep(addressData.zip) : '',
                        reference: addressData.reference || '',
                        latitude: addressData.latitude || client.latitude || '',
                        longitude: addressData.longitude || client.longitude || '',
                        pricePerLiter: client.pricePerLiter || '',
                        averageOilLiters: client.averageOilLiters || '',
                        observations: client.observations || '',
                        has25L: client.has25L || false,
                        has50L: client.has50L || false,
                        has100L: client.has100L || false,
                        has200L: client.has200L || false,
                        recurrenceDays: client.recurrenceDays || '',
                    });
                } catch (err) {
                    setError('Erro ao carregar dados do cliente.');
                }
            };
            fetchClient();
        }
    }, [id]);

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (name === 'phone') value = formatPhone(value);
        if (name === 'zip') value = formatCep(value);
        if (name === 'document') {
            value = value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                if (value.length === 14) {
                    if (!isValidCPF(value.replace(/\D/g, ''))) setDocError('CPF inválido'); else setDocError('');
                } else {
                    setDocError('');
                }
            } else {
                value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
                if (value.length > 18) value = value.substring(0, 18);
                if (value.length === 18) {
                    const rawCnpj = value.replace(/\D/g, '');
                    if (!isValidCNPJ(rawCnpj)) {
                        setDocError('CNPJ inválido');
                    } else {
                        setDocError('');
                        handleCnpjLookup(rawCnpj);
                    }
                } else {
                    setDocError('');
                }
            }
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddPhone = () => {
        setFormData(prev => ({
            ...prev,
            additionalPhones: [...prev.additionalPhones, '']
        }));
    };

    const handleExtraPhoneChange = (index, value) => {
        const formatted = formatPhone(value);
        setFormData(prev => {
            const newPhones = [...prev.additionalPhones];
            newPhones[index] = formatted;
            return { ...prev, additionalPhones: newPhones };
        });
    };

    const handleRemoveExtraPhone = (index) => {
        setFormData(prev => {
            const newPhones = [...prev.additionalPhones];
            newPhones.splice(index, 1);
            return { ...prev, additionalPhones: newPhones };
        });
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setDocError('');

        const rawDoc = formData.document.replace(/\D/g, '');
        if (rawDoc.length > 0) { // Only validate if document is provided
            if (rawDoc.length <= 11 && !isValidCPF(rawDoc)) {
                setDocError('CPF inválido');
                setLoading(false);
                return;
            } else if (rawDoc.length > 11 && !isValidCNPJ(rawDoc)) {
                setDocError('CNPJ inválido');
                setLoading(false);
                return;
            }
        }

        try {
            const cleanedData = {
                ...formData,
                document: formData.document.replace(/\D/g, ''),
                phone: formData.phone.replace(/\D/g, ''),
                additionalPhones: formData.additionalPhones.filter(p => p).map(p => p.replace(/\D/g, '')),
                zip: formData.zip.replace(/\D/g, ''),
                pricePerLiter: formData.pricePerLiter ? parseFloat(String(formData.pricePerLiter).replace(',', '.')) : 0,
                averageOilLiters: formData.averageOilLiters ? parseFloat(String(formData.averageOilLiters).replace(',', '.')) : 0,
                recurrenceDays: formData.recurrenceDays ? parseInt(formData.recurrenceDays, 10) : null
            };

            if (id) {
                await api.put(`/clients/${id}`, cleanedData);
            } else {
                await api.post('/clients', cleanedData);
            }
            navigate('/clients');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao salvar cliente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <button onClick={() => navigate('/clients')} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem',
                background: 'none', color: 'var(--color-text-light)', fontSize: '0.9rem'
            }}>
                <ArrowLeft size={16} /> Voltar para lista
            </button>

            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>{id ? 'Editar Cliente' : 'Novo Cliente'}</h2>

                {error && <div style={{ backgroundColor: '#fee2e2', color: 'var(--color-error)', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Razão Social *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nome Fantasia</label>
                            <input
                                type="text"
                                name="tradeName"
                                value={formData.tradeName || ''}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>CPF ou CNPJ</label>
                            <input
                                type="text"
                                name="document"
                                value={formData.document}
                                onChange={handleChange}
                                maxLength={18}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: docError ? '1px solid var(--color-error)' : '1px solid #ddd' }}
                            />
                            {docError && <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{docError}</span>}
                            {cnpjLoading && <span style={{ color: '#2563eb', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>🔍 Buscando dados do CNPJ...</span>}
                            <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Preenche os dados automaticamente (apenas CNPJ).</small>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Telefone Principal (WhatsApp)*</label>
                            <input
                                type="tel"
                                name="phone"
                                placeholder="(00) 00000-0000"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                maxLength="15"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                            {formData.additionalPhones.map((phone, index) => (
                                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="tel"
                                        placeholder="(00) 00000-0000"
                                        value={phone}
                                        onChange={(e) => handleExtraPhoneChange(index, e.target.value)}
                                        maxLength="15"
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExtraPhone(index)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0.5rem'
                                        }}
                                        title="Remover telefone"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddPhone}
                                style={{
                                    marginTop: '0.5rem',
                                    background: '#f1f5f9',
                                    border: '1px dashed #cbd5e1',
                                    color: '#475569',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    width: '100%'
                                }}
                            >
                                <Plus size={16} /> Adicionar número extra
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Logradouro (Rua/Av) *</label>
                            <input
                                type="text"
                                name="street"
                                value={formData.street || ''}
                                onChange={handleChange}
                                onBlur={handleGeocode}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Número *</label>
                            <input
                                type="text"
                                name="number"
                                value={formData.number || ''}
                                onChange={handleChange}
                                onBlur={handleGeocode}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Bairro *</label>
                            <input
                                type="text"
                                name="district"
                                value={formData.district || ''}
                                onChange={handleChange}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>CEP</label>
                            <input
                                type="text"
                                name="zip"
                                value={formData.zip || ''}
                                onChange={handleChange}
                                onBlur={handleZipBlur}
                                maxLength={9}
                                placeholder={cepLoading ? 'Buscando...' : ''}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: cepLoading ? '#f3f4f6' : 'white' }}
                            />
                            <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Preenche o endereço automaticamente.</small>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cidade *</label>
                            {cities.length > 0 ? (
                                <select
                                    name="city"
                                    value={formData.city || ''}
                                    onChange={handleChange}
                                    onBlur={handleGeocode}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white' }}
                                >
                                    <option value="" disabled>{citiesLoading ? 'Carregando...' : 'Selecione a cidade'}</option>
                                    {cities.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city || ''}
                                    onChange={handleChange}
                                    onBlur={handleGeocode}
                                    required
                                    placeholder={formData.state ? (citiesLoading ? 'Carregando cidades...' : 'Digite a cidade') : 'Selecione o estado primeiro'}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                                />
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado (UF) *</label>
                            <select
                                name="state"
                                value={formData.state || ''}
                                onChange={handleChange}
                                onBlur={handleGeocode}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white' }}
                            >
                                <option value="" disabled>Selecione</option>
                                {UFS.map(uf => (
                                    <option key={uf} value={uf}>{uf}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Ponto de Referência</label>
                        <input
                            type="text"
                            name="reference"
                            value={formData.reference || ''}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Preço de Compra (R$/L)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                name="pricePerLiter"
                                value={formData.pricePerLiter || ''}
                                onChange={handleChange}
                                placeholder="Ex: 2,70"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                            <small style={{ color: '#666' }}>Valor pago a este cliente por litro de óleo.</small>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Média de Óleo Esperada (L)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                name="averageOilLiters"
                                value={formData.averageOilLiters || ''}
                                onChange={handleChange}
                                placeholder="Ex: 50"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                            <small style={{ color: '#666' }}>Quantidade média de litros de óleo por coleta.</small>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Recorrência (dias)</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                name="recurrenceDays"
                                value={formData.recurrenceDays || ''}
                                onChange={handleChange}
                                placeholder="Ex: 30"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                            <small style={{ color: '#666' }}>Deixe vazio para não enviar alertas de recorrência.</small>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: 'var(--border-radius)', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
                            <Package size={18} />
                            Recipientes / Bombonas do Cliente
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Selecione quais tamanhos de bombonas estão alocados neste cliente (clique para marcar/desmarcar).</p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                            {[25, 50, 100, 200].map(size => {
                                const field = `has${size}L`;
                                const isSelected = formData[field];
                                return (
                                    <div
                                        key={size}
                                        onClick={() => setFormData(prev => ({ ...prev, [field]: !prev[field] }))}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                                            backgroundColor: isSelected ? '#f0fdf4' : 'white',
                                            color: isSelected ? 'var(--color-primary)' : '#475569',
                                            fontWeight: '600',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isSelected ? '0 4px 6px -1px rgba(34, 197, 94, 0.1)' : 'none'
                                        }}
                                    >
                                        <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{size}L</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '400', color: isSelected ? '#166534' : '#94a3b8' }}>
                                            {isSelected ? '✓ Selecionado' : 'Clique para marcar'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Observações</label>
                        <textarea
                            name="observations"
                            value={formData.observations}
                            onChange={handleChange}
                            rows={3}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="submit" disabled={loading} style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            padding: '0.75rem 2rem',
                            borderRadius: 'var(--border-radius)',
                            fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                            <Save size={20} />
                            {loading ? 'Salvando...' : 'Salvar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientFormPage;
