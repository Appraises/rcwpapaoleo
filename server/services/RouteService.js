// server/services/RouteService.js
// Server-side TSP solver — extracted from RoutePage.jsx for use by the dispatch cron job

// Haversine distance in km between two lat/lng points
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Solves the Travelling Salesman Problem starting and ending at a base/depot.
 *
 * @param {{ lat: number, lng: number }} base - Base/depot coordinates
 * @param {{ lat: number, lng: number }[]} clients - Array of client coordinates
 * @returns {{ orderedIndices: number[], totalDistanceKm: number }}
 *   orderedIndices are indices into the original `clients` array, in visit order.
 */
function optimizeRoute(base, clients) {
    const n = clients.length;
    if (n === 0) return { orderedIndices: [], totalDistanceKm: 0 };
    if (n === 1) {
        const d = haversineDistance(base.lat, base.lng, clients[0].lat, clients[0].lng) * 2;
        return { orderedIndices: [0], totalDistanceKm: d };
    }

    // Node 0 = base, nodes 1..n = clients
    const coords = [
        { lat: base.lat, lng: base.lng },
        ...clients.map(c => ({ lat: c.lat, lng: c.lng }))
    ];
    const totalNodes = coords.length;

    // Build distance matrix
    const dist = Array.from({ length: totalNodes }, () => new Float64Array(totalNodes));
    for (let i = 0; i < totalNodes; i++) {
        for (let j = i + 1; j < totalNodes; j++) {
            const d = haversineDistance(coords[i].lat, coords[i].lng, coords[j].lat, coords[j].lng);
            dist[i][j] = d;
            dist[j][i] = d;
        }
    }

    let bestOrder;

    if (n <= 20) {
        // ═══════════════════════════════════════════════
        // HELD-KARP (exact, optimal) — O(n² · 2ⁿ)
        // ═══════════════════════════════════════════════
        const FULL = (1 << n) - 1;
        const INF = Infinity;

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

        // Find optimal last client
        let bestDist = INF;
        let bestLast = -1;
        for (let i = 0; i < n; i++) {
            const total = dp[FULL][i] + dist[i + 1][0];
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
        // ═══════════════════════════════════════════════
        // FALLBACK: Nearest Neighbor + 2-opt
        // ═══════════════════════════════════════════════

        // Nearest Neighbor
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

        // 2-opt improvement
        const routeDist = (route) => {
            let d = dist[0][route[0] + 1];
            for (let i = 0; i < route.length - 1; i++) {
                d += dist[route[i] + 1][route[i + 1] + 1];
            }
            d += dist[route[route.length - 1] + 1][0];
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

    // Calculate total distance
    let totalDistance = dist[0][bestOrder[0] + 1];
    for (let i = 0; i < bestOrder.length - 1; i++) {
        totalDistance += dist[bestOrder[i] + 1][bestOrder[i + 1] + 1];
    }
    totalDistance += dist[bestOrder[bestOrder.length - 1] + 1][0];

    return { orderedIndices: bestOrder, totalDistanceKm: totalDistance };
}

/**
 * Splits clients into two geographically balanced groups using simple k-means-like approach.
 * Each group is assigned to a different collector.
 *
 * @param {{ lat: number, lng: number }[]} clients
 * @returns {[number[], number[]]} Two arrays of indices into the clients array.
 */
function splitIntoTwoGroups(clients) {
    if (clients.length <= 1) return [clients.map((_, i) => i), []];

    // Find the two most distant clients as initial seeds
    let maxDist = -1;
    let seedA = 0, seedB = 1;
    for (let i = 0; i < clients.length; i++) {
        for (let j = i + 1; j < clients.length; j++) {
            const d = haversineDistance(clients[i].lat, clients[i].lng, clients[j].lat, clients[j].lng);
            if (d > maxDist) {
                maxDist = d;
                seedA = i;
                seedB = j;
            }
        }
    }

    // Assign each client to the closest seed
    const groupA = [];
    const groupB = [];

    for (let i = 0; i < clients.length; i++) {
        const dA = haversineDistance(clients[i].lat, clients[i].lng, clients[seedA].lat, clients[seedA].lng);
        const dB = haversineDistance(clients[i].lat, clients[i].lng, clients[seedB].lat, clients[seedB].lng);
        if (dA <= dB) {
            groupA.push(i);
        } else {
            groupB.push(i);
        }
    }

    return [groupA, groupB];
}

module.exports = { optimizeRoute, splitIntoTwoGroups, haversineDistance };
