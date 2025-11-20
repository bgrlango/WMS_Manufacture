const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

// Import ERP Models
const erpModels = require('./erpModels');

// Import QC Models
const qcModels = require('./qcModels');

// Import Enhanced Warehouse Models
const warehouseModels = require('./warehouseModels');

const models = {
    // Core Models
    User: require('./user'),
    UserLog: require('./userLog'),
    ProductionOrder: require('./productionOrder'),
    OutputMc: require('./outputMc'),
    TransferQc: require('./transferQc'),
    OQC: qcModels.OQC, // Use enhanced OQC model
    Delivery: require('./delivery'),
    Return: require('./return'),
    
    // ERP Enhancement Models
    InventoryLocation: erpModels.InventoryLocation,
    InventoryMovement: erpModels.InventoryMovement,
    InventoryBalance: erpModels.InventoryBalance,
    Machine: erpModels.Machine,
    ProductionSchedule: erpModels.ProductionSchedule,
    BillOfMaterials: erpModels.BillOfMaterials,
    Supplier: erpModels.Supplier,
    PurchaseOrder: erpModels.PurchaseOrder,
    IntegrationQueue: erpModels.IntegrationQueue,
    WorkflowState: erpModels.WorkflowState,
    SystemConfiguration: erpModels.SystemConfiguration,
    
    // QC Models
    QCInspectionPlan: qcModels.QCInspectionPlan,
    QCInspectionResult: qcModels.QCInspectionResult,
    QCDefectCode: qcModels.QCDefectCode,
    QCNonConformance: qcModels.QCNonConformance,
    
    // Enhanced Warehouse Models
    InventoryBalanceEnhanced: warehouseModels.InventoryBalance,
    InventoryMovementEnhanced: warehouseModels.InventoryMovement,
    InventoryLocationEnhanced: warehouseModels.InventoryLocation,
    StockReservation: warehouseModels.StockReservation,
    CycleCount: warehouseModels.CycleCount,
    CycleCountDetail: warehouseModels.CycleCountDetail,
};

// Definisikan asosiasi antar tabel di sini
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
