const { CollectionRequest, Client, Address } = require('../models');

class CollectionRequestController {
    // List all pending collection requests for the collectors
    static async getPendingRequests(req, res) {
        try {
            const requests = await CollectionRequest.findAll({
                where: {
                    status: 'PENDING'
                },
                include: [
                    {
                        model: Client,
                        attributes: ['name', 'phone', 'street', 'number', 'district', 'city', 'reference']
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

            const validStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const request = await CollectionRequest.findByPk(id);
            if (!request) {
                return res.status(404).json({ error: 'Collection request not found' });
            }

            request.status = status;
            await request.save();

            res.status(200).json({ message: 'Status updated successfully', request });
        } catch (error) {
            console.error('Error updating collection request:', error);
            res.status(500).json({ error: 'Failed to update collection request' });
        }
    }
}

module.exports = CollectionRequestController;
