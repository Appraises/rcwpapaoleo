import toast from 'react-hot-toast';
import React from 'react';

const severityStyles = {
    danger: {
        border: '1px solid #f87171',
        color: '#7f1d1d',
        confirmBg: '#dc2626',
    },
    warning: {
        border: '1px solid #fbbf24',
        color: '#78350f',
        confirmBg: '#d97706',
    }
};

/**
 * @param {string} message
 * @param {Function} onConfirm
 * @param {'danger'|'warning'} [severity='danger'] - 'danger' (red) for destructive actions, 'warning' (yellow) for non-critical confirmations.
 */
export const confirmToast = (message, onConfirm, severity = 'danger') => {
    const s = severityStyles[severity] || severityStyles.danger;

    toast((t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontWeight: '500' }}>{message}</span>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                        padding: '0.35rem 0.75rem', borderRadius: '4px',
                        border: '1px solid #ddd', background: 'white', cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                >
                    Cancelar
                </button>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        onConfirm();
                    }}
                    style={{
                        padding: '0.35rem 0.75rem', borderRadius: '4px', border: 'none',
                        background: s.confirmBg, color: 'white', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.85rem'
                    }}
                >
                    Confirmar
                </button>
            </div>
        </div>
    ), {
        duration: 8000,
        style: { border: s.border, padding: '16px', color: s.color }
    });
};
