// client/src/utils/routeOptimizer.js

/**
 * Haversine distance in km between two lat/lng points
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
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

/**
 * Calculate the optimal route using Held-Karp (exact) or Nearest Neighbor + 2-opt (fallback)
 *
 * @param {Array} clients - Array of client objects containing { Address: { latitude, longitude } }
 * @param {Object} baseCoords - Base location { lat, lng }
 * @returns {Object} { orderedPath, totalDistance, isOptimal, routeIndices }
 */
export const calculateOptimalRoute = (clients, baseCoords) => {
    const n = clients.length;
    if (n === 0) return { orderedPath: [], totalDistance: 0, isOptimal: true, routeIndices: [] };

    // Node 0 = base, nodes 1..n = clients
    // Build distance matrix (n+1 x n+1)
    const coords = [
        { lat: baseCoords.lat, lng: baseCoords.lng }, // index 0 = base
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
    const isOptimal = n <= 18;

    if (isOptimal) {
        // ========================================
        // HELD-KARP (exact, optimal) — O(n² · 2ⁿ)
        // ========================================
        const FULL = (1 << n) - 1;
        const INF = Infinity;

        const dp = Array.from({ length: 1 << n }, () => new Float64Array(n).fill(INF));
        const parent = Array.from({ length: 1 << n }, () => new Int8Array(n).fill(-1));

        for (let i = 0; i < n; i++) {
            dp[1 << i][i] = dist[0][i + 1];
        }

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

        let bestDist = INF;
        let bestLast = -1;
        for (let i = 0; i < n; i++) {
            const total = dp[FULL][i] + dist[i + 1][0]; // return to base
            if (total < bestDist) {
                bestDist = total;
                bestLast = i;
            }
        }

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

    return {
        orderedPath,
        totalDistance,
        isOptimal,
        routeIndices: bestOrder
    };
};
