
const { CollectionRequest, Collection, Client } = require('../models');

class CollectionRequestController {
    // List all pending and dispatched collection requests for the collectors
    static async getPendingRequests(req, res) {
        try {
            const { Address } = require('../models');
            const { Op } = require('sequelize');
            const requests = await CollectionRequest.findAll({
                where: {
                    status: { [Op.in]: ['PENDING', 'DISPATCHED'] }
                },
                include: [
                    {
                        model: Client,
                        attributes: ['name', 'phone', 'street', 'number', 'district', 'city', 'reference'],
                        include: [{ model: Address }]
                    }
                ],
                order: [['requestedAt', 'DESC']]
            });

            res.status(200).json(requests);
        } catch (error) {
            console.error('Error fetching collection requests:', error);
            res.status(500).json({ error: 'Failed to fetch collection requests' });
        }
    }

    // Update status (e.g., from PENDING to COMPLETED or CANCELLED)
    static async updateRequestStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const validStatuses = ['PENDING', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            let request;
            try {
                request = await CollectionRequest.findByPk(id, {
                    include: [{ model: Client, attributes: ['averageOilLiters'] }]
                });
            } catch (e) {
                console.warn('[CollectionRequestController] ⚠️ findByPk include Client failed:', e.message);
                request = await CollectionRequest.findByPk(id);
            }

            if (!request) {
                return res.status(404).json({ error: 'Collection request not found' });
            }

            request.status = status;
            await request.save();

            // Auto-create Collection record when marking as COMPLETED
            if (status === 'COMPLETED') {
                let qty = request.Client?.averageOilLiters || 0;

                // If include failed or client wasn't attached, fetch directly
                if (qty === 0 && request.clientId) {
                    try {
                        const client = await Client.findByPk(request.clientId);
                        qty = client?.averageOilLiters || 0;
                    } catch (e) {
                        console.error('[CollectionRequestController] ⚠️ Failed to fetch Client for auto-collection:', e.message);
                    }
                }

                if (qty > 0) {
                    try {
                        await Collection.create({
                            clientId: request.clientId,
                            userId: req.user?.id || null,
                            date: new Date(),
                            quantity: qty,
                            observation: 'Coleta registrada manualmente via painel'
                        });
                        console.log(`[CollectionRequest] ✅ Auto-created Collection: ${qty}L for client ${request.clientId}`);
                    } catch (collectionError) {
                        console.error('[CollectionRequest] ❌ Failed to auto-create Collection (ORM). Trying raw SQL:', collectionError.message);
                        try {
                            const sequelize = require('../config/database');
                            await sequelize.query(
                                'INSERT INTO Collections (clientId, userId, date, quantity, observation, createdAt, updatedAt) VALUES (?, ?, date("now"), ?, ?, datetime("now"), datetime("now"))',
                                { replacements: [request.clientId, req.user?.id || null, qty, 'Coleta registrada manualmente via painel'] }
                            );
                            console.log(`[CollectionRequest] ✅ Auto-created Collection (SQL): ${qty}L for client ${request.clientId}`);
                        } catch (sqlError) {
                            console.error('[CollectionRequest] ❌ Failed to auto-create Collection (SQL):', sqlError.message);
                        }
                    }
                } else {
                    console.log(`[CollectionRequest] ⚠️ Cannot auto-create Collection: qty is 0 for client ${request.clientId}`);
                }
            }

            res.status(200).json({ message: 'Status updated successfully', request });
        } catch (error) {
            console.error('Error updating collection request:', error);
            res.status(500).json({ error: 'Failed to update collection request' });
        }
    }
}

module.exports = CollectionRequestController;
