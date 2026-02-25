
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

            const request = await CollectionRequest.findByPk(id, {
                include: [{ model: Client, attributes: ['averageOilLiters'] }]
            });
            if (!request) {
                return res.status(404).json({ error: 'Collection request not found' });
            }

            request.status = status;
            await request.save();

            // Auto-create Collection record when marking as COMPLETED
            if (status === 'COMPLETED') {
                const qty = request.Client?.averageOilLiters || 0;
                if (qty > 0) {
                    await Collection.create({
                        clientId: request.clientId,
                        userId: req.user?.id || null,
                        date: new Date(),
                        quantity: qty,
                        observation: 'Coleta registrada manualmente via painel'
                    });
                    console.log(`[CollectionRequest] ✅ Auto-created Collection: ${qty}L for client ${request.clientId}`);
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
