import React, { useEffect, useState } from 'react';
import { Download, FileText, Calendar, Clock, Loader, Plus } from 'lucide-react';
import api from '../api/axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ReportsPage = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('weekly');
    const [reportFilter, setReportFilter] = useState('all');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/reports');
            setReports(response.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Não foi possível carregar os relatórios.');
        } finally {
            setLoading(false);
        }
    };

    const handleForceGenerate = async (type) => {
        try {
            setGenerating(true);
            const body = { type };
            if (reportFilter === 'abrasel') {
                body.filter = 'abrasel';
            }
            await api.post('/reports/generate', body);
            const filterLabel = reportFilter === 'abrasel' ? ' (Abrasel)' : '';
            toast.success(`Relatório ${type === 'weekly' ? 'Semanal' : 'Mensal'}${filterLabel} gerado com sucesso!`);
            fetchReports(); // Refresh the list
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Erro ao gerar relatório. Apenas administradores podem gerar manualmente.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = (filePath) => {
        // Usa baseURL do axios se estiver em dev corporativo, senão usa caminho relativo direto
        const isDev = window.location.hostname === 'localhost';
        const url = isDev ? `http://localhost:3001${filePath}` : filePath;
        window.open(url, '_blank');
    };

    const filteredReports = reports.filter(r => r.type === activeTab);

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text)' }}>Central de Relatórios PDF</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={reportFilter}
                        onChange={(e) => setReportFilter(e.target.value)}
                        style={{
                            padding: '0.75rem 1rem', borderRadius: 'var(--border-radius)',
                            border: '1px solid #cbd5e1', backgroundColor: 'white',
                            fontSize: '0.9rem', color: '#334155', cursor: 'pointer'
                        }}
                    >
                        <option value="all">Todos os Clientes</option>
                        <option value="abrasel">Apenas Abrasel</option>
                    </select>
                    <button
                        onClick={() => handleForceGenerate('weekly')}
                        disabled={generating}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1rem', backgroundColor: 'var(--color-primary)',
                            color: 'white', borderRadius: 'var(--border-radius)', border: 'none', cursor: 'pointer',
                            opacity: generating ? 0.7 : 1
                        }}>
                        {generating ? <Loader size={18} className="spin" /> : <Plus size={18} />} Gerar Semanal
                    </button>
                    <button
                        onClick={() => handleForceGenerate('monthly')}
                        disabled={generating}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1rem', backgroundColor: '#3b82f6',
                            color: 'white', borderRadius: 'var(--border-radius)', border: 'none', cursor: 'pointer',
                            opacity: generating ? 0.7 : 1
                        }}>
                        {generating ? <Loader size={18} className="spin" /> : <Plus size={18} />} Gerar Mensal
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #eee' }}>
                <button
                    onClick={() => setActiveTab('weekly')}
                    style={{
                        padding: '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: activeTab === 'weekly' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        color: activeTab === 'weekly' ? 'var(--color-primary)' : '#666',
                        fontWeight: activeTab === 'weekly' ? 'bold' : 'normal',
                        fontSize: '1rem'
                    }}
                >
                    Relatórios Semanais
                </button>
                <button
                    onClick={() => setActiveTab('monthly')}
                    style={{
                        padding: '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: activeTab === 'monthly' ? '3px solid #3b82f6' : '3px solid transparent',
                        color: activeTab === 'monthly' ? '#3b82f6' : '#666',
                        fontWeight: activeTab === 'monthly' ? 'bold' : 'normal',
                        fontSize: '1rem'
                    }}
                >
                    Relatórios Mensais
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Carregando histórico...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {filteredReports.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '1rem', color: '#64748b' }}>
                            Nenhum relatório {activeTab === 'weekly' ? 'semanal' : 'mensal'} gerado ainda. <br />
                            Use o botão acima para gerar um manual ou aguarde a rotina automática.
                        </div>
                    ) : (
                        filteredReports.map(report => (
                            <div key={report.id} style={{
                                backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem',
                                boxShadow: 'var(--shadow-md)', border: '1px solid #f1f5f9',
                                display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        padding: '1rem', borderRadius: '0.75rem',
                                        backgroundColor: report.type === 'weekly' ? '#dcfce7' : '#dbeafe',
                                        color: report.type === 'weekly' ? '#16a34a' : '#2563eb'
                                    }}>
                                        <FileText size={28} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '0.25rem' }}>
                                            Relatório {report.type === 'weekly' ? 'Semanal' : 'Mensal'}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                            <Calendar size={14} />
                                            {format(new Date(report.startDate), 'dd MMM', { locale: ptBR })} - {format(new Date(report.endDate), 'dd MMM, yyyy', { locale: ptBR })}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                                    <Clock size={12} /> Gerado em: {format(new Date(report.generatedAt), "dd/MM/yyyy 'às' HH:mm")}
                                </div>

                                <button
                                    onClick={() => handleDownload(report.filePath)}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                        backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        gap: '0.5rem', fontWeight: '500', transition: 'all 0.2s', marginTop: 'auto'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                                >
                                    <Download size={18} /> Baixar PDF
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default ReportsPage;
