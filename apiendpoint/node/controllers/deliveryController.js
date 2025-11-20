const { Delivery, ReturnCustomer } = require('../models');

exports.createDelivery = async (req, res) => {
    try {
        console.log('Creating delivery with data:', req.body);
        
        const {
            delivery_number,
            customer_name,
            part_number,
            quantity,
            delivery_date,
            driver_name,
            vehicle_number,
            notes
        } = req.body;

        // Validasi data required
        if (!delivery_number || !customer_name || !part_number || !quantity) {
            return res.status(400).json({
                message: 'Field delivery_number, customer_name, part_number, dan quantity wajib diisi.',
                status: 'error'
            });
        }

        // Buat delivery baru
        const delivery = await Delivery.create({
            delivery_number,
            customer_name,
            part_number,
            quantity,
            delivery_date: delivery_date || new Date(),
            driver_name,
            vehicle_number,
            notes,
            created_by: req.user.id
        });

        console.log('Delivery created successfully:', delivery.id);

        res.status(201).json({
            message: 'Delivery berhasil dibuat',
            data: delivery,
            status: 'success'
        });

    } catch (error) {
        console.error('Error creating delivery:', error);
        res.status(500).json({
            message: 'Gagal membuat delivery',
            error: error.message,
            status: 'error'
        });
    }
};

exports.createReturn = async (req, res) => {
    try {
        console.log('Creating return with data:', req.body);
        
        const {
            return_number,
            customer_name,
            part_number,
            quantity_returned,
            return_date,
            reason,
            condition,
            notes
        } = req.body;

        // Validasi data required
        if (!return_number || !customer_name || !part_number || !quantity_returned) {
            return res.status(400).json({
                message: 'Field return_number, customer_name, part_number, dan quantity_returned wajib diisi.',
                status: 'error'
            });
        }

        // Buat return baru
        const customerReturn = await ReturnCustomer.create({
            return_number,
            customer_name,
            part_number,
            quantity_returned,
            return_date: return_date || new Date(),
            reason,
            condition,
            notes,
            created_by: req.user.id
        });

        console.log('Return created successfully:', customerReturn.id);

        res.status(201).json({
            message: 'Return berhasil dibuat',
            data: customerReturn,
            status: 'success'
        });

    } catch (error) {
        console.error('Error creating return:', error);
        res.status(500).json({
            message: 'Gagal membuat return',
            error: error.message,
            status: 'error'
        });
    }
};

exports.updateDelivery = async (req, res) => {
    try {
        const deliveryId = req.params.id;
        const updates = req.body;

        const delivery = await Delivery.findByPk(deliveryId);
        if (!delivery) {
            return res.status(404).json({
                message: 'Delivery tidak ditemukan',
                status: 'error'
            });
        }

        await delivery.update(updates);

        res.json({
            message: 'Delivery berhasil diupdate',
            data: delivery,
            status: 'success'
        });

    } catch (error) {
        console.error('Error updating delivery:', error);
        res.status(500).json({
            message: 'Gagal mengupdate delivery',
            error: error.message,
            status: 'error'
        });
    }
};

exports.updateReturn = async (req, res) => {
    try {
        const returnId = req.params.id;
        const updates = req.body;

        const customerReturn = await ReturnCustomer.findByPk(returnId);
        if (!customerReturn) {
            return res.status(404).json({
                message: 'Return tidak ditemukan',
                status: 'error'
            });
        }

        await customerReturn.update(updates);

        res.json({
            message: 'Return berhasil diupdate',
            data: customerReturn,
            status: 'success'
        });

    } catch (error) {
        console.error('Error updating return:', error);
        res.status(500).json({
            message: 'Gagal mengupdate return',
            error: error.message,
            status: 'error'
        });
    }
};
