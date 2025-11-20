const { Delivery, ReturnCustomer } = require('../models');
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Generate delivery order number: DO-YYYYMMDD-XXXX
 */
const generateDeliveryOrder = async (transaction) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const datePart = `${year}${month}${day}`;
    const prefix = `DO-${datePart}-`;

    const [lastOrder] = await sequelize.query(
        'SELECT delivery_order FROM delivery WHERE delivery_order LIKE ? ORDER BY delivery_order DESC LIMIT 1 FOR UPDATE',
        {
            replacements: [`${prefix}%`],
            type: QueryTypes.SELECT,
            transaction
        }
    );

    let nextSequence = 1;
    if (lastOrder) {
        const lastSequenceNumber = parseInt(lastOrder.delivery_order.split('-').pop(), 10);
        nextSequence = lastSequenceNumber + 1;
    }

    const sequencePart = nextSequence.toString().padStart(4, '0');
    return `${prefix}${sequencePart}`;
};

/**
 * Generate return number: RN-YYYYMMDD-XXXX
 */
const generateReturnNumber = async (transaction) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const datePart = `${year}${month}${day}`;
    const prefix = `RN-${datePart}-`;

    const [lastReturn] = await sequelize.query(
        'SELECT return_number FROM return_customer WHERE return_number LIKE ? ORDER BY return_number DESC LIMIT 1 FOR UPDATE',
        {
            replacements: [`${prefix}%`],
            type: QueryTypes.SELECT,
            transaction
        }
    );

    let nextSequence = 1;
    if (lastReturn) {
        const lastSequenceNumber = parseInt(lastReturn.return_number.split('-').pop(), 10);
        nextSequence = lastSequenceNumber + 1;
    }

    const sequencePart = nextSequence.toString().padStart(4, '0');
    return `${prefix}${sequencePart}`;
};

exports.createDelivery = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { job_order, delivery_quantity, delivery_date, customer_name, remarks } = req.body;
        const user_id = req.user.id;
        
        if (!job_order || delivery_quantity === undefined || !delivery_date || !customer_name) {
            await t.rollback();
            return res.status(400).json({ message: 'Field job_order, delivery_quantity, delivery_date, dan customer_name wajib diisi.' });
        }
        
        // Generate delivery order number
        const delivery_order = await generateDeliveryOrder(t);
        
        const [result] = await sequelize.query(
            'INSERT INTO delivery (delivery_order, job_order, delivery_quantity, delivery_date, customer_name, remarks, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            {
                replacements: [delivery_order, job_order, delivery_quantity, delivery_date, customer_name, remarks, user_id],
                type: QueryTypes.INSERT,
                transaction: t
            }
        );
        
        const [newDelivery] = await sequelize.query(
            'SELECT * FROM delivery WHERE id = ?',
            {
                replacements: [result],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );
        
        await t.commit();
        
        res.status(201).json({
            message: 'Delivery berhasil dibuat',
            data: newDelivery
        });
    } catch (error) {
        await t.rollback();
        console.error('Error creating delivery:', error);
        res.status(500).json({ 
            message: 'Gagal membuat delivery', 
            error: error.message 
        });
    }
};

exports.createReturn = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { job_order, return_quantity, return_date, return_reason, customer_name } = req.body;
        
        if (!job_order || return_quantity === undefined || !return_date || !customer_name) {
            await t.rollback();
            return res.status(400).json({ message: 'Field job_order, return_quantity, return_date, dan customer_name wajib diisi.' });
        }
        
        // Generate return number
        const return_number = await generateReturnNumber(t);
        
        const [result] = await sequelize.query(
            'INSERT INTO return_customer (return_number, job_order, return_quantity, return_date, return_reason, customer_name, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            {
                replacements: [return_number, job_order, return_quantity, return_date, return_reason, customer_name],
                type: QueryTypes.INSERT,
                transaction: t
            }
        );
        
        const [newReturn] = await sequelize.query(
            'SELECT * FROM return_customer WHERE id = ?',
            {
                replacements: [result],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );
        
        await t.commit();
        
        res.status(201).json({
            message: 'Return Customer berhasil dibuat',
            data: newReturn
        });
    } catch (error) {
        await t.rollback();
        console.error('Error creating return:', error);
        res.status(500).json({ 
            message: 'Gagal membuat return customer', 
            error: error.message 
        });
    }
};
