import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import api from '../api/axios';
import { Truck, Navigation, MapPin, CheckSquare, Square, RotateCcw, Zap, Home, Settings2 } from 'lucide-react';

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create a numbered icon for route stops
const createNumberedIcon = (number) => {
    const color = '#3b82f6';
    return L.divIcon({
        className: 'custom-numbered-marker',
        html: `
            <div style="
                background: ${color};
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 14px;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
                ${number}
            </div>
            <div style="
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 10px solid ${color};
                margin: -2px auto 0;
            "></div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42]
    });
};

// Create a special icon for the base/HQ
const createBaseIcon = () => {
    return L.divIcon({
        className: 'custom-base-marker',
        html: `
            <div style="
                background: #16a34a;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.35);
            ">
                🏠
            </div>
            <div style="
                width: 0;
                height: 0;
                border-left: 9px solid transparent;
                border-right: 9px solid transparent;
                border-top: 11px solid #16a34a;
                margin: -2px auto 0;
            "></div>
        `,
        iconSize: [36, 47],
        iconAnchor: [18, 47],
        popupAnchor: [0, -47]
    });
};

// Haversine distance in km between two lat/lng points
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const RoutingMachine = ({ waypoints }) => {
    const map = useMap();
    const routingControlRef = useRef(null);

    useEffect(() => {
        if (!map) return;

        // Remove previous control if exists
        if (routingControlRef.current) {
            map.removeControl(routingControlRef.current);
        }

        if (waypoints.length > 1) {
            const planPoints = waypoints.map(wp => L.latLng(wp[0], wp[1]));

            routingControlRef.current = L.Routing.control({
                waypoints: planPoints,
                routeWhileDragging: false,
                show: false,
                addWaypoints: false,
                fitSelectedRoutes: true,
                lineOptions: {
                    styles: [{ color: '#2E7D32', weight: 5, opacity: 0.85 }]
                },
                createMarker: () => null // We handle markers ourselves
            }).addTo(map);
        }

        return () => {
            if (routingControlRef.current && map) {
                map.removeControl(routingControlRef.current);
            }
        };
    }, [map, waypoints]);

    return null;
};

// Default HQ/Base location (Aracaju - SE)
const DEFAULT_BASE = { lat: -10.9472, lng: -37.0731, name: 'Base da Empresa' };

const RoutePage = () => {
    const [clients, setClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [routeWaypoints, setRouteWaypoints] = useState([]);
    const [optimizedOrder, setOptimizedOrder] = useState([]); // Clients in optimized order
    const [isLoading, setIsLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [routeStats, setRouteStats] = useState(null); // { stops, distanceKm }
    const [searchTerm, setSearchTerm] = useState('');
    const [showBaseConfig, setShowBaseConfig] = useState(false);

    // Base/HQ location — persisted in localStorage
    const [baseLat, setBaseLat] = useState(() => {
        const saved = localStorage.getItem('catoleo_base_lat');
        return saved ? parseFloat(saved) : DEFAULT_BASE.lat;
    });
    const [baseLng, setBaseLng] = useState(() => {
        const saved = localStorage.getItem('catoleo_base_lng');
        return saved ? parseFloat(saved) : DEFAULT_BASE.lng;
    });
    const [baseName, setBaseName] = useState(() => {
        return localStorage.getItem('catoleo_base_name') || DEFAULT_BASE.name;
    });

    const saveBase = () => {
        localStorage.setItem('catoleo_base_lat', baseLat.toString());
        localStorage.setItem('catoleo_base_lng', baseLng.toString());
        localStorage.setItem('catoleo_base_name', baseName);
        setShowBaseConfig(false);
    };

    const defaultCenter = [baseLat, baseLng];

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await api.get('/clients?sort=name_asc');
                const mappableClients = response.data.filter(c => c.Address && c.Address.latitude && c.Address.longitude);
                setClients(mappableClients);
            } catch (error) {
                console.error('Error fetching clients:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClients();
    }, []);

    const toggleClient = (client) => {
        if (selectedClients.find(c => c.id === client.id)) {
            setSelectedClients(selectedClients.filter(c => c.id !== client.id));
        } else {
            setSelectedClients([...selectedClients, client]);
        }
    };

    const selectAll = () => {
        const filtered = getFilteredClients();
        const newSelected = [...selectedClients];
        filtered.forEach(c => {
            if (!newSelected.find(s => s.id === c.id)) {
                newSelected.push(c);
            }
        });
        setSelectedClients(newSelected);
    };

    const deselectAll = () => {
        setSelectedClients([]);
        clearRoute();
    };

    const getFilteredClients = () => {
        if (!searchTerm.trim()) return clients;
        const term = searchTerm.toLowerCase();
        return clients.filter(c =>
            c.name.toLowerCase().includes(term) ||
            (c.address && c.address.toLowerCase().includes(term)) ||
            (c.Address && c.Address.street && c.Address.street.toLowerCase().includes(term)) ||
            (c.Address && c.Address.district && c.Address.district.toLowerCase().includes(term))
        );
    };

    const calculateRoute = () => {
        if (selectedClients.length < 1) {
            alert('Selecione pelo menos 1 cliente para criar uma rota.');
            return;
        }

        setIsOptimizing(true);

        setTimeout(() => {
            const clients = [...selectedClients];
            const n = clients.length;

            // Node 0 = base, nodes 1..n = clients
            // Build distance matrix (n+1 x n+1)
            const coords = [
                { lat: baseLat, lng: baseLng }, // index 0 = base
                ...clients.map(c => ({ lat: c.Address.latitude, lng: c.Address.longitude }))
            ];
            const totalNodes = coords.length;

            const dist = Array.from({ length: totalNodes }, () => new Float64Array(totalNodes));
            for (let i = 0; i < totalNodes; i++) {
                for (let j = i + 1; j < totalNodes; j++) {
                    const d = haversineDistance(coords[i].lat, coords[i].lng, coords[j].lat, coords[j].lng);
                    dist[i][j] = d;
                    dist[j][i] = d;
                }
            }

            let bestOrder; // indices into clients array (0-based, NOT including base)

            if (n <= 18) {
                // ========================================
                // HELD-KARP (exact, optimal) — O(n² · 2ⁿ)
                // ========================================
                // State: dp[S][i] = min cost to visit all nodes in set S, ending at node i
                // S is a bitmask of visited CLIENT nodes (not base)
                // We always start and end at node 0 (base)

                const FULL = (1 << n) - 1;
                const INF = Infinity;

                // dp[mask][i] = min distance starting from base, visiting clients in mask, ending at client i
                // parent[mask][i] = previous client index in optimal path
                const dp = Array.from({ length: 1 << n }, () => new Float64Array(n).fill(INF));
                const parent = Array.from({ length: 1 << n }, () => new Int8Array(n).fill(-1));

                // Initialize: go from base (node 0) directly to client i (node i+1)
                for (let i = 0; i < n; i++) {
                    dp[1 << i][i] = dist[0][i + 1];
                }

                // Fill DP
                for (let mask = 1; mask <= FULL; mask++) {
                    for (let last = 0; last < n; last++) {
                        if (!(mask & (1 << last))) continue;
                        if (dp[mask][last] === INF) continue;

                        for (let next = 0; next < n; next++) {
                            if (mask & (1 << next)) continue;
                            const newMask = mask | (1 << next);
                            const newDist = dp[mask][last] + dist[last + 1][next + 1];
                            if (newDist < dp[newMask][next]) {
                                dp[newMask][next] = newDist;
                                parent[newMask][next] = last;
                            }
                        }
                    }
                }

                // Find optimal last client (minimize path + return to base)
                let bestDist = INF;
                let bestLast = -1;
                for (let i = 0; i < n; i++) {
                    const total = dp[FULL][i] + dist[i + 1][0]; // return to base
                    if (total < bestDist) {
                        bestDist = total;
                        bestLast = i;
                    }
                }

                // Reconstruct path
                const path = [];
                let mask = FULL;
                let cur = bestLast;
                while (cur !== -1) {
                    path.push(cur);
                    const prev = parent[mask][cur];
                    mask ^= (1 << cur);
                    cur = prev;
                }
                path.reverse();
                bestOrder = path;

            } else {
                // ========================================
                // FALLBACK: Nearest Neighbor + 2-opt improvement
                // ========================================

                // --- Nearest Neighbor ---
                const visited = new Set();
                const order = [];
                let currentNode = 0; // start at base

                while (order.length < n) {
                    let nearest = -1;
                    let minD = Infinity;
                    for (let i = 0; i < n; i++) {
                        if (visited.has(i)) continue;
                        const d = dist[currentNode][i + 1];
                        if (d < minD) {
                            minD = d;
                            nearest = i;
                        }
                    }
                    if (nearest !== -1) {
                        order.push(nearest);
                        visited.add(nearest);
                        currentNode = nearest + 1;
                    }
                }

                // --- 2-opt improvement ---
                // Try swapping segments to reduce total distance
                const routeDist = (route) => {
                    let d = dist[0][route[0] + 1]; // base to first
                    for (let i = 0; i < route.length - 1; i++) {
                        d += dist[route[i] + 1][route[i + 1] + 1];
                    }
                    d += dist[route[route.length - 1] + 1][0]; // last to base
                    return d;
                };

                let improved = true;
                while (improved) {
                    improved = false;
                    for (let i = 0; i < order.length - 1; i++) {
                        for (let j = i + 1; j < order.length; j++) {
                            // Reverse the segment between i and j
                            const newRoute = [...order];
                            let left = i, right = j;
                            while (left < right) {
                                [newRoute[left], newRoute[right]] = [newRoute[right], newRoute[left]];
                                left++;
                                right--;
                            }
                            if (routeDist(newRoute) < routeDist(order)) {
                                for (let k = i; k <= j; k++) order[k] = newRoute[k];
                                improved = true;
                            }
                        }
                    }
                }

                bestOrder = order;
            }

            // Build the optimized client list
            const orderedPath = bestOrder.map(i => clients[i]);

            // Calculate total distance (base → clients → base)
            let totalDistance = dist[0][bestOrder[0] + 1]; // base to first
            for (let i = 0; i < bestOrder.length - 1; i++) {
                totalDistance += dist[bestOrder[i] + 1][bestOrder[i + 1] + 1];
            }
            totalDistance += dist[bestOrder[bestOrder.length - 1] + 1][0]; // last to base

            // Build waypoints: base → clients → base
            const clientPoints = orderedPath.map(c => [c.Address.latitude, c.Address.longitude]);
            const points = [
                [baseLat, baseLng],   // Start at base
                ...clientPoints,       // Visit clients
                [baseLat, baseLng],   // Return to base
            ];

            // Update state
            setSelectedClients(orderedPath);
            setOptimizedOrder(orderedPath);
            setRouteWaypoints(points);
            setRouteStats({
                stops: orderedPath.length,
                distanceKm: totalDistance,
                isOptimal: n <= 18,
            });
            setIsOptimizing(false);
        }, 300);
    };

    const clearRoute = () => {
        setRouteWaypoints([]);
        setOptimizedOrder([]);
        setRouteStats(null);
    };

    const openGoogleMaps = () => {
        if (routeWaypoints.length < 2) return;

        // Origin = base, Destination = base (round trip)
        // Waypoints = all client stops in between
        const origin = `${baseLat},${baseLng}`;
        const destination = `${baseLat},${baseLng}`;
        // Client stops are waypoints[1] through waypoints[length-2] (skip base at start/end)
        const clientStops = routeWaypoints.slice(1, -1).map(pt => `${pt[0]},${pt[1]}`).join('|');

        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${clientStops}&travelmode=driving`;

        window.open(url, '_blank');
    };

    const openWaze = () => {
        if (optimizedOrder.length < 1) return;

        // Waze supports single destination — navigate to the first client stop
        const firstClient = optimizedOrder[0];
        const url = `https://waze.com/ul?ll=${firstClient.Address.latitude},${firstClient.Address.longitude}&navigate=yes`;
        window.open(url, '_blank');
    };

    const filteredClients = getFilteredClients();
    const isRouteActive = optimizedOrder.length > 0;

    // Styles
    const sidebarStyle = {
        width: '340px',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
    };

    const headerStyle = {
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
    };

    const btnPrimary = {
        width: '100%', padding: '0.75rem', backgroundColor: 'var(--color-primary)',
        color: 'white', border: 'none', borderRadius: 'var(--border-radius)',
        fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem',
        transition: 'all 0.2s ease',
    };

    const btnSecondary = (color) => ({
        width: '100%', padding: '0.7rem', backgroundColor: color,
        color: 'white', border: 'none', borderRadius: 'var(--border-radius)',
        fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem',
        transition: 'all 0.2s ease',
    });

    return (
        <div className="route-layout" style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
            {/* Sidebar */}
            <div className="route-sidebar" style={sidebarStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '1.15rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary-dark)' }}>
                            <Truck size={20} /> Roteirização
                        </h2>
                        <button
                            onClick={() => setShowBaseConfig(!showBaseConfig)}
                            title="Configurar base"
                            style={{
                                background: 'none', border: '1px solid #d1d5db', borderRadius: '6px',
                                padding: '0.35rem', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', color: '#6b7280',
                            }}
                        >
                            <Settings2 size={16} />
                        </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                        Rota circular saindo de <strong>{baseName}</strong>.
                    </p>

                    {/* Base Configuration Panel */}
                    {showBaseConfig && (
                        <div style={{
                            marginTop: '0.75rem', padding: '0.75rem',
                            backgroundColor: '#f9fafb', borderRadius: 'var(--border-radius)',
                            border: '1px solid #e5e7eb',
                        }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Home size={14} /> Localização da Base
                            </div>
                            <input
                                type="text" placeholder="Nome da base"
                                value={baseName}
                                onChange={(e) => setBaseName(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.8rem',
                                    border: '1px solid #d1d5db', borderRadius: '6px',
                                    marginBottom: '0.4rem', outline: 'none',
                                }}
                            />
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                <input
                                    type="number" step="any" placeholder="Latitude"
                                    value={baseLat}
                                    onChange={(e) => setBaseLat(parseFloat(e.target.value) || 0)}
                                    style={{
                                        flex: 1, padding: '0.45rem 0.6rem', fontSize: '0.8rem',
                                        border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none',
                                    }}
                                />
                                <input
                                    type="number" step="any" placeholder="Longitude"
                                    value={baseLng}
                                    onChange={(e) => setBaseLng(parseFloat(e.target.value) || 0)}
                                    style={{
                                        flex: 1, padding: '0.45rem 0.6rem', fontSize: '0.8rem',
                                        border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none',
                                    }}
                                />
                            </div>
                            <button
                                onClick={saveBase}
                                style={{
                                    width: '100%', padding: '0.45rem', fontSize: '0.8rem',
                                    backgroundColor: 'var(--color-primary)', color: 'white',
                                    border: 'none', borderRadius: '6px', fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Salvar Base
                            </button>
                        </div>
                    )}
                </div>

                {/* Route Stats */}
                {routeStats && (
                    <div style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#f0fdf4',
                        borderBottom: '1px solid #bbf7d0',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                    }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                {routeStats.stops}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Paradas
                            </div>
                        </div>
                        <div style={{ width: '1px', height: '2rem', backgroundColor: '#bbf7d0' }} />
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                {routeStats.distanceKm.toFixed(1)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                km (linha reta)
                            </div>
                        </div>
                    </div>
                )}

                {/* Search + Selection Controls */}
                <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db',
                            borderRadius: 'var(--border-radius)', fontSize: '0.85rem',
                            outline: 'none', transition: 'border-color 0.2s',
                            marginBottom: '0.5rem',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={selectAll}
                            style={{
                                flex: 1, padding: '0.4rem', fontSize: '0.75rem',
                                backgroundColor: 'transparent', border: '1px solid #d1d5db',
                                borderRadius: '6px', color: '#374151', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                            }}
                        >
                            <CheckSquare size={14} /> Todos
                        </button>
                        <button
                            onClick={deselectAll}
                            style={{
                                flex: 1, padding: '0.4rem', fontSize: '0.75rem',
                                backgroundColor: 'transparent', border: '1px solid #d1d5db',
                                borderRadius: '6px', color: '#374151', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                            }}
                        >
                            <Square size={14} /> Nenhum
                        </button>
                    </div>
                </div>

                {/* Client List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
                    {isLoading ? (
                        <p style={{ textAlign: 'center', color: '#999', padding: '2rem 0' }}>Carregando...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {filteredClients.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#999', padding: '1rem 0', fontSize: '0.85rem' }}>
                                    Nenhum cliente encontrado.
                                </p>
                            )}
                            {filteredClients.map(client => {
                                const isSelected = !!selectedClients.find(c => c.id === client.id);
                                const routeIndex = isRouteActive
                                    ? optimizedOrder.findIndex(c => c.id === client.id)
                                    : -1;

                                return (
                                    <label key={client.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        padding: '0.65rem 0.75rem', borderRadius: 'var(--border-radius)',
                                        backgroundColor: isSelected
                                            ? (routeIndex >= 0 ? '#f0fdf4' : '#f0fdf4')
                                            : '#fafafa',
                                        border: '1px solid',
                                        borderColor: isSelected ? '#86efac' : '#f3f4f6',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}>
                                        {/* Route order badge */}
                                        {routeIndex >= 0 ? (
                                            <div style={{
                                                minWidth: '26px', height: '26px', borderRadius: '50%',
                                                backgroundColor: routeIndex === 0 ? '#16a34a'
                                                    : routeIndex === optimizedOrder.length - 1 ? '#dc2626'
                                                        : '#3b82f6',
                                                color: 'white', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700',
                                                flexShrink: 0,
                                            }}>
                                                {routeIndex + 1}
                                            </div>
                                        ) : (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleClient(client)}
                                                style={{ width: '1rem', height: '1rem', flexShrink: 0, accentColor: 'var(--color-primary)' }}
                                            />
                                        )}
                                        <div style={{ overflow: 'hidden', flex: 1 }}>
                                            <div style={{
                                                fontWeight: '600', fontSize: '0.85rem',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                color: '#1f2937',
                                            }}>{client.name}</div>
                                            <div style={{
                                                fontSize: '0.72rem', color: '#9ca3af',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {client.Address?.street && `${client.Address.street}, ${client.Address.number || ''}`}
                                                {client.Address?.district && ` — ${client.Address.district}`}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    backgroundColor: '#fafafa',
                }}>
                    {/* Selection count */}
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', textAlign: 'center', marginBottom: '0.25rem' }}>
                        {selectedClients.length} cliente{selectedClients.length !== 1 ? 's' : ''} selecionado{selectedClients.length !== 1 ? 's' : ''}
                    </div>

                    <button
                        onClick={calculateRoute}
                        disabled={selectedClients.length < 1 || isOptimizing}
                        style={{
                            ...btnPrimary,
                            opacity: (selectedClients.length < 1 || isOptimizing) ? 0.6 : 1,
                            cursor: (selectedClients.length < 1 || isOptimizing) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <Zap size={16} />
                        {isOptimizing ? 'Otimizando...' : 'Otimizar Rota'}
                    </button>

                    {isRouteActive && (
                        <>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={openGoogleMaps}
                                    style={btnSecondary('#4285F4')}
                                >
                                    <Navigation size={15} />
                                    Google Maps
                                </button>
                                <button
                                    onClick={openWaze}
                                    style={btnSecondary('#33ccff')}
                                >
                                    <MapPin size={15} />
                                    Waze
                                </button>
                            </div>
                            <button
                                onClick={clearRoute}
                                style={{
                                    width: '100%', padding: '0.5rem', backgroundColor: 'transparent',
                                    color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 'var(--border-radius)',
                                    cursor: 'pointer', fontSize: '0.82rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                }}
                            >
                                <RotateCcw size={14} />
                                Limpar Rota
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="route-map" style={{ flex: 1, padding: '1rem', backgroundColor: '#f3f4f6' }}>
                <div style={{
                    height: '100%',
                    width: '100%',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white'
                }}>
                    <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Base/HQ Marker — always shown */}
                        <Marker position={[baseLat, baseLng]} icon={createBaseIcon()}>
                            <Popup>
                                <div>
                                    <div style={{
                                        fontSize: '0.7rem', fontWeight: '700',
                                        color: '#16a34a', marginBottom: '0.25rem',
                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                    }}>
                                        📍 Ponto de partida e retorno
                                    </div>
                                    <strong>{baseName}</strong>
                                </div>
                            </Popup>
                        </Marker>

                        {/* Markers for selected clients */}
                        {selectedClients.map((client, idx) => {
                            if (!client.Address || !client.Address.latitude) return null;

                            const routeIndex = isRouteActive
                                ? optimizedOrder.findIndex(c => c.id === client.id)
                                : -1;

                            const icon = isRouteActive && routeIndex >= 0
                                ? createNumberedIcon(routeIndex + 1)
                                : undefined; // default leaflet marker

                            return (
                                <Marker
                                    key={client.id}
                                    position={[client.Address.latitude, client.Address.longitude]}
                                    icon={icon}
                                >
                                    <Popup>
                                        <div>
                                            {isRouteActive && routeIndex >= 0 && (
                                                <div style={{
                                                    fontSize: '0.7rem', fontWeight: '700',
                                                    color: 'var(--color-primary)', marginBottom: '0.25rem',
                                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                                }}>
                                                    Parada #{routeIndex + 1}
                                                </div>
                                            )}
                                            <strong>{client.name}</strong><br />
                                            {client.Address.street}, {client.Address.number}<br />
                                            {client.Address.district}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {/* Routing Machine Layer */}
                        {routeWaypoints.length > 0 && <RoutingMachine waypoints={routeWaypoints} />}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default RoutePage;
