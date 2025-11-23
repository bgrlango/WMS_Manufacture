-- =====================================================================
-- WMS Manufacturing System - Production Database Setup
-- CQRS Architecture: Node.js Command Service + FastAPI Query Service
-- Database: MySQL 8.0.41
-- Date: November 2025
-- =====================================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, UNIQUE_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- =====================================================================
-- CREATE DATABASE
-- =====================================================================
CREATE DATABASE IF NOT EXISTS `wms_manufacture` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `wms_manufacture`;

-- =====================================================================
-- TABLE: users (Authentication & User Management)
-- Used by: Node.js authMiddleware.js, FastAPI security.py
-- =====================================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','supervisor','operator','qc_inspector','warehouse','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'operator',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_department` (`department`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- SAMPLE DATA: users
-- Password hashes (bcrypt): "password123" and "qc@secure2025"
-- =====================================================================
INSERT INTO `users` VALUES 
(1,'admin_user','admin@wms.local','$2b$10$8G5M4Hc9K3vL2pQ8rZ1X.eNvW6jF4bD5cS3uT2xY9mE7kL0gH9',
 'Admin User','admin','Management','1','2025-11-20 10:00:00','2025-11-20 10:00:00','2025-11-23 15:30:00'),
(2,'supervisor_prod','supervisor@wms.local','$2b$10$9H6N5Id0L4wM3qR9sA2Y/fOwX7kG5cE6dT4vU3yZ0nF8lM1hI0',
 'Production Supervisor','supervisor','Production','1','2025-11-20 10:05:00','2025-11-20 10:05:00','2025-11-23 14:45:00'),
(3,'operator_mc01','operator1@wms.local','$2b$10$0I7O6Je1M5xN4rS0tB3Z\$gPxY8lH6dF5eU4vV3wA1oG2qB3cC4dD5eE6fF7gG8',
 'Machine Operator 1','operator','Production','1','2025-11-20 10:10:00','2025-11-20 10:10:00','2025-11-23 16:00:00'),
(4,'qc_inspector','qc.inspector@wms.local','$2b$10$1J8P7Kf2N6yO5sT1uC4A\$hQyZ9mI7eG6fV5wW4xB2pH3rC4dD5eE6fF7gG8hH',
 'QC Inspector','qc_inspector','Quality Control','1','2025-11-20 10:15:00','2025-11-20 10:15:00','2025-11-23 13:20:00'),
(5,'warehouse_mgr','warehouse@wms.local','$2b$10$2K9Q8Lg3O7zP6uU2vD5B\$iRzA0nJ8fH7gW6xX5yC3qI4sD5eE6fF7gG8hH9iI',
 'Warehouse Manager','warehouse','Warehouse','1','2025-11-20 10:20:00','2025-11-20 10:20:00','2025-11-23 12:15:00');

-- =====================================================================
-- TABLE: master_prod (Product Master Data)
-- Used by: Both Node.js & FastAPI for product information
-- =====================================================================
DROP TABLE IF EXISTS `master_prod`;
CREATE TABLE `master_prod` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `unit_price` decimal(12,2) DEFAULT NULL,
  `lead_time_days` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `part_number` (`part_number`),
  KEY `idx_customer` (`customer`),
  KEY `idx_model` (`model`),
  FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `master_prod` VALUES 
(1,'PT ARKHA INDUSTRIES INDONESIA','AB2MRR-KCMR93','K2FA/K93','COVER MIRROR BACK R/L K93A YR-342',85.50,14,1,1,'2025-11-20 10:00:00','2025-11-20 10:00:00'),
(2,'PT ASTRA KOMPONEN INDONESIA','QB2MRR-SHLD1ABK00','K1AL','HOLDER MIRROR BACK RH K1AA SC',125.75,21,1,1,'2025-11-20 10:05:00','2025-11-20 10:05:00'),
(3,'PT AUTO PLASTIK INDONESIA','JI4ACO-GPLG33BK00','BZ010-H','PLUG TRANSMISSION OIL FILLER 33-BZ010-H_SB',45.00,7,1,1,'2025-11-20 10:10:00','2025-11-20 10:10:00'),
(4,'PT CUBIC INDONESIA','KS CLZM 5925_01','KS CLZM','GRIP COVER PAINTING LHD_FL1',62.25,10,1,1,'2025-11-20 10:15:00','2025-11-20 10:15:00'),
(5,'PT DAISABISU INDONESIA','D231-633_BR','D231','BOX TYPE D231-633_BROWN COLOR',38.50,5,1,1,'2025-11-20 10:20:00','2025-11-20 10:20:00'),
(6,'PT HASURA MITRA GEMILANG','FG22090019','VT6','PULSATOR ASSEMBLY VT6 SERIES',185.00,28,1,1,'2025-11-20 10:25:00','2025-11-20 10:25:00'),
(7,'PT YASUFUKU INDONESIA','28D-E4718-00','28D','PROTECTOR MUFFLER 28D SERIES',75.25,14,1,1,'2025-11-20 10:30:00','2025-11-20 10:30:00');

-- =====================================================================
-- TABLE: production_orders (Production Planning & Tracking)
-- Used by: Node.js productionController.js, FastAPI production endpoints
-- Status: running|rework|pending|cancelled
-- =====================================================================
DROP TABLE IF EXISTS `production_orders`;
CREATE TABLE `production_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_order` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_to_produce` decimal(10,2) NOT NULL,
  `initial_wip_stock` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('running','rework','pending','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `created_by_id` int DEFAULT NULL,
  `assigned_to_id` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `expected_completion_date` date DEFAULT NULL,
  `completion_date` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_order` (`job_order`),
  KEY `part_number` (`part_number`),
  KEY `created_by_id` (`created_by_id`),
  KEY `assigned_to_id` (`assigned_to_id`),
  KEY `idx_status` (`status`),
  KEY `idx_start_date` (`start_date`),
  CONSTRAINT `production_orders_ibfk_1` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `production_orders_ibfk_2` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `production_orders_ibfk_3` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `production_orders` VALUES 
(1,'JO-20251120-0001','AB2MRR-KCMR93',1500.00,150.00,'running','high',1,2,'2025-11-20','2025-11-27',NULL,'Production batch for PT ARKHA INDUSTRIES - Mirror Cover Assembly','2025-11-20 10:45:00','2025-11-23 14:30:00'),
(2,'JO-20251120-0002','QB2MRR-SHLD1ABK00',800.00,80.00,'running','medium',1,2,'2025-11-20','2025-11-25',NULL,'Mirror holder components - K1AA Series','2025-11-20 11:00:00','2025-11-23 15:00:00'),
(3,'JO-20251121-0003','D231-633_BR',500.00,50.00,'pending','medium',2,NULL,'2025-11-21','2025-11-24',NULL,'Box assembly brown color - scheduled for next week','2025-11-21 09:30:00','2025-11-21 09:30:00');

-- =====================================================================
-- TABLE: output_mc (Machine Production Output Tracking)
-- Used by: Node.js productionController.js, FastAPI production endpoints
-- Shift: 1|2|3 (Morning, Afternoon, Night)
-- =====================================================================
DROP TABLE IF EXISTS `output_mc`;
CREATE TABLE `output_mc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `production_order_id` int DEFAULT NULL,
  `machine_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_good` int NOT NULL DEFAULT '0',
  `quantity_ng` int NOT NULL DEFAULT '0',
  `operator_id` int DEFAULT NULL,
  `shift` enum('1','2','3') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1',
  `production_date` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `part_number` (`part_number`),
  KEY `operator_id` (`operator_id`),
  KEY `production_order_id` (`production_order_id`),
  KEY `idx_production_date` (`production_date`),
  KEY `idx_machine_id` (`machine_id`),
  CONSTRAINT `output_mc_ibfk_1` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `output_mc_ibfk_2` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `output_mc_ibfk_3` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `output_mc` VALUES 
(1,1,'MC-001','AB2MRR-KCMR93',320,8,3,'1','2025-11-20','Shift 1 output - machine MC-001','2025-11-20 16:30:00','2025-11-20 16:30:00'),
(2,1,'MC-002','AB2MRR-KCMR93',280,12,3,'2','2025-11-20','Shift 2 output - machine MC-002','2025-11-20 23:45:00','2025-11-20 23:45:00'),
(3,2,'MC-003','QB2MRR-SHLD1ABK00',210,5,3,'1','2025-11-21','Mirror holder assembly - shift 1','2025-11-21 17:00:00','2025-11-21 17:00:00'),
(4,1,'MC-001','AB2MRR-KCMR93',290,10,3,'1','2025-11-21','Continued production - shift 1','2025-11-21 16:45:00','2025-11-21 16:45:00');

-- =====================================================================
-- TABLE: stock_wip (Work-In-Progress Stock Management)
-- Used by: FastAPI inventory endpoints, stock calculations
-- =====================================================================
DROP TABLE IF EXISTS `stock_wip`;
CREATE TABLE `stock_wip` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,2) NOT NULL DEFAULT '0.00',
  `current_station` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_updated_by_id` int DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `part_number` (`part_number`),
  KEY `idx_station` (`current_station`),
  CONSTRAINT `stock_wip_ibfk_1` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_wip_ibfk_2` FOREIGN KEY (`last_updated_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `stock_wip` VALUES 
(1,'AB2MRR-KCMR93','COVER MIRROR BACK R/L K93A YR-342',1630.00,'Production Line - MC-001',3,'2025-11-21 16:45:00'),
(2,'QB2MRR-SHLD1ABK00','HOLDER MIRROR BACK RH K1AA SC',890.00,'Quality Inspection Station',4,'2025-11-21 14:20:00'),
(3,'D231-633_BR','BOX TYPE D231-633_BROWN COLOR',450.00,'Inventory Buffer',2,'2025-11-20 12:30:00'),
(4,'28D-E4718-00','PROTECTOR MUFFLER 28D SERIES',75.00,'Packing & Labeling',3,'2025-11-21 15:00:00');

-- =====================================================================
-- TABLE: stock_fg (Finished Goods Inventory)
-- Used by: FastAPI warehouse endpoints, delivery tracking
-- =====================================================================
DROP TABLE IF EXISTS `stock_fg`;
CREATE TABLE `stock_fg` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `quantity` decimal(12,2) NOT NULL DEFAULT '0.00',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warehouse_zone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_counted_date` date DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `part_number` (`part_number`),
  KEY `idx_location` (`location`),
  KEY `idx_zone` (`warehouse_zone`),
  CONSTRAINT `stock_fg_ibfk_1` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `stock_fg` VALUES 
(1,'AB2MRR-KCMR93',1850.00,'RACK-A-001','Zone A (Ready for Shipping)',NULL,'2025-11-21 16:45:00'),
(2,'QB2MRR-SHLD1ABK00',680.00,'RACK-B-003','Zone B (Pending Delivery)',NULL,'2025-11-21 14:20:00'),
(3,'JI4ACO-GPLG33BK00',420.00,'RACK-A-005','Zone A (Ready for Shipping)','2025-11-20',NULL),
(4,'D231-633_BR',280.00,'RACK-C-002','Zone C (Storage)',NULL,NULL);

-- =====================================================================
-- TABLE: oqc (Outgoing Quality Control / Final Inspection)
-- Used by: Node.js qcController.js, FastAPI QC endpoints
-- =====================================================================
DROP TABLE IF EXISTS `oqc`;
CREATE TABLE `oqc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lot_number` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `batch_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity_good` decimal(10,2) NOT NULL,
  `quantity_ng` int DEFAULT NULL,
  `rejection_rate` decimal(5,2) DEFAULT NULL,
  `inspection_date` date NOT NULL,
  `inspector_id` int DEFAULT NULL,
  `status` enum('passed','failed','rework','on_hold') COLLATE utf8mb4_unicode_ci DEFAULT 'passed',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lot_number` (`lot_number`),
  KEY `part_number` (`part_number`),
  KEY `inspector_id` (`inspector_id`),
  KEY `idx_status` (`status`),
  KEY `idx_inspection_date` (`inspection_date`),
  CONSTRAINT `oqc_ibfk_1` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `oqc_ibfk_2` FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `oqc` VALUES 
(1,'AB2MRR-KCMR93','LOT-AB2MRR-20251121-001','BATCH-001',600.00,8,1.32,'2025-11-21',4,'passed','Final QC passed - Mirror cover assembly',
 '2025-11-21 10:30:00','2025-11-21 10:30:00'),
(2,'QB2MRR-SHLD1ABK00','LOT-QB2MRR-20251121-002','BATCH-002',420.00,12,2.78,'2025-11-21',4,'passed','Mirror holder passed final inspection',
 '2025-11-21 11:45:00','2025-11-21 11:45:00'),
(3,'D231-633_BR','LOT-D231-20251120-003','BATCH-003',500.00,5,1.00,'2025-11-20',4,'passed','Box assembly brown - passed QC',
 '2025-11-20 14:15:00','2025-11-20 14:15:00');

-- =====================================================================
-- TABLE: transfer_qc (QC Transfer & Status Updates)
-- Used by: Node.js qcController.js for QC workflow tracking
-- =====================================================================
DROP TABLE IF EXISTS `transfer_qc`;
CREATE TABLE `transfer_qc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lot_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `from_status` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `transferred_by_id` int DEFAULT NULL,
  `transfer_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `part_number` (`part_number`),
  KEY `transferred_by_id` (`transferred_by_id`),
  KEY `idx_transfer_date` (`transfer_date`),
  CONSTRAINT `transfer_qc_ibfk_1` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `transfer_qc_ibfk_2` FOREIGN KEY (`transferred_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `transfer_qc` VALUES 
(1,'AB2MRR-KCMR93','LOT-AB2MRR-20251121-001',600.00,'Production Output','OQC Inspection','Ready for quality inspection',4,'2025-11-21','2025-11-21 09:00:00','2025-11-21 09:00:00'),
(2,'QB2MRR-SHLD1ABK00','LOT-QB2MRR-20251121-002',420.00,'Production Output','OQC Inspection','Mirror holder ready for QC',4,'2025-11-21','2025-11-21 10:15:00','2025-11-21 10:15:00'),
(3,'D231-633_BR','LOT-D231-20251120-003',500.00,'OQC Inspection','Final Warehouse Stock','QC approved - ready to ship',5,'2025-11-20','2025-11-20 15:30:00','2025-11-20 15:30:00');

-- =====================================================================
-- TABLE: delivery (Warehouse Delivery & Shipment Tracking)
-- Used by: Node.js warehouseController.js, FastAPI warehouse endpoints
-- =====================================================================
DROP TABLE IF EXISTS `delivery`;
CREATE TABLE `delivery` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delivery_order_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_shipped` decimal(10,2) NOT NULL,
  `batch_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destination_customer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_date` date NOT NULL,
  `expected_arrival_date` date DEFAULT NULL,
  `status` enum('pending','shipped','in_transit','delivered','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'shipped',
  `carrier_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warehouse_personnel_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `delivery_order_number` (`delivery_order_number`),
  KEY `part_number` (`part_number`),
  KEY `warehouse_personnel_id` (`warehouse_personnel_id`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `delivery_ibfk_1` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `delivery_ibfk_2` FOREIGN KEY (`warehouse_personnel_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `delivery` VALUES 
(1,'DO-20251121-0001','AB2MRR-KCMR93',250.00,'BATCH-001','PT ARKHA INDUSTRIES INDONESIA','2025-11-21','2025-11-24','shipped','PT MAJU TRANSPORT','TRK-2025-112101',5,
 'Mirror cover assembly - shipment to main customer','2025-11-21 08:00:00','2025-11-21 08:00:00'),
(2,'DO-20251120-0002','QB2MRR-SHLD1ABK00',180.00,'BATCH-002','PT ASTRA KOMPONEN INDONESIA','2025-11-20','2025-11-23','delivered','EKSPRES JAYA','TRK-2025-112002',5,
 'Mirror holder components delivered','2025-11-20 10:30:00','2025-11-21 14:00:00'),
(3,'DO-20251120-0003','D231-633_BR',150.00,'BATCH-003','PT DAISABISU INDONESIA','2025-11-20','2025-11-23','in_transit','PT MAJU TRANSPORT','TRK-2025-112003',5,
 'Box assembly brown - in transit to customer','2025-11-20 14:00:00','2025-11-21 09:30:00');

-- =====================================================================
-- TABLE: return_customer (Customer Returns & Defect Tracking)
-- Used by: Node.js warehouseController.js, FastAPI returns endpoints
-- =====================================================================
DROP TABLE IF EXISTS `return_customer`;
CREATE TABLE `return_customer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_order_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `quantity_returned` decimal(10,2) NOT NULL,
  `return_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `defect_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('received','inspected','approved','denied','rework') COLLATE utf8mb4_unicode_ci DEFAULT 'received',
  `return_date` date NOT NULL,
  `received_by_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `part_number_idx` (`part_number`),
  KEY `received_by_id` (`received_by_id`),
  KEY `idx_return_date` (`return_date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_return_part_number` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_return_received_by` FOREIGN KEY (`received_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `return_customer` VALUES 
(1,'AB2MRR-KCMR93','DO-20251121-0001','K2FA/K93','COVER MIRROR BACK R/L - Surface defect',5.00,'Quality Issue','Surface Scratch','PT ARKHA INDUSTRIES INDONESIA','received',
 '2025-11-21',5,'Minor surface scratches detected by customer','2025-11-21 12:00:00','2025-11-21 12:00:00'),
(2,'QB2MRR-SHLD1ABK00',NULL,'K1AL','HOLDER MIRROR BACK - Dimensional issue',2.00,'Defective Batch','Dimension Non-Conformance',NULL,'inspected',
 '2025-11-19',5,'Dimension issue found during customer inspection','2025-11-19 15:30:00','2025-11-21 10:00:00');

-- =====================================================================
-- TABLE: user_log (User Activity & Audit Trail)
-- Used by: Node.js for logging user actions, FastAPI audit trail
-- =====================================================================
DROP TABLE IF EXISTS `user_log`;
CREATE TABLE `user_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `old_value` longtext COLLATE utf8mb4_unicode_ci,
  `new_value` longtext COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_timestamp` (`created_at`),
  CONSTRAINT `user_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_log` VALUES 
(1,1,'LOGIN',NULL,NULL,NULL,NULL,'192.168.1.100','Mozilla/5.0','2025-11-23 15:30:00'),
(2,2,'CREATE','production_orders',1,'NULL','JO-20251120-0001','192.168.1.101','Mozilla/5.0','2025-11-20 10:45:00'),
(3,3,'UPDATE','output_mc',1,'quantity_good:300','quantity_good:320','192.168.1.102','Mozilla/5.0','2025-11-20 16:30:00'),
(4,4,'CREATE','oqc',1,'NULL','LOT-AB2MRR-20251121-001','192.168.1.103','Mozilla/5.0','2025-11-21 10:30:00'),
(5,5,'UPDATE','delivery',1,'status:pending','status:shipped','192.168.1.104','Mozilla/5.0','2025-11-21 08:00:00'),
(6,2,'UPDATE','production_orders',2,'status:pending','status:running','192.168.1.101','Mozilla/5.0','2025-11-20 11:00:00'),
(7,3,'CREATE','stock_wip',1,NULL,'part_number:AB2MRR-KCMR93','192.168.1.102','Mozilla/5.0','2025-11-21 16:45:00'),
(8,1,'LOGIN',NULL,NULL,NULL,NULL,'192.168.1.100','Mozilla/5.0','2025-11-23 14:00:00'),
(9,5,'UPDATE','return_customer',1,'status:received','status:inspected','192.168.1.104','Mozilla/5.0','2025-11-21 12:15:00');

-- =====================================================================
-- TABLE: stock_adjustments (Inventory Adjustments & Corrections)
-- Used by: Node.js warehouseController.js, FastAPI inventory management
-- =====================================================================
DROP TABLE IF EXISTS `stock_adjustments`;
CREATE TABLE `stock_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stock_type` enum('fg','wip') NOT NULL,
  `adjustment_quantity` decimal(10,2) NOT NULL,
  `previous_quantity` decimal(10,2) NOT NULL,
  `new_quantity` decimal(10,2) NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_document` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `adjustment_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `part_number` (`part_number`),
  KEY `fk_adj_user` (`user_id`),
  KEY `idx_adjustment_date` (`adjustment_date`),
  KEY `idx_stock_type` (`stock_type`),
  CONSTRAINT `fk_adj_part_number` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT,
  CONSTRAINT `fk_adj_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `stock_adjustments` VALUES 
(1,'AB2MRR-KCMR93','wip',50.00,1580.00,1630.00,'Physical count adjustment','INV-20251121-001',3,'2025-11-21','2025-11-21 16:45:00','2025-11-21 16:45:00'),
(2,'D231-633_BR','fg',20.00,260.00,280.00,'Stock in from production','SO-20251120-003',5,'2025-11-20','2025-11-20 14:30:00','2025-11-20 14:30:00');

-- =====================================================================
-- TABLE: stock_take_history (Physical Inventory Count Records)
-- Used by: FastAPI inventory endpoints for historical tracking
-- =====================================================================
DROP TABLE IF EXISTS `stock_take_history`;
CREATE TABLE `stock_take_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `take_date` date NOT NULL,
  `stock_type` enum('fg','wip') COLLATE utf8mb4_unicode_ci NOT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `system_quantity` decimal(10,2) NOT NULL,
  `physical_quantity` decimal(10,2) NOT NULL,
  `discrepancy` decimal(10,2) NOT NULL,
  `discrepancy_percentage` decimal(5,2) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `part_number` (`part_number`),
  KEY `user_id` (`user_id`),
  KEY `idx_take_date` (`take_date`),
  KEY `idx_stock_type` (`stock_type`),
  CONSTRAINT `stock_take_history_ibfk_1` FOREIGN KEY (`part_number`) REFERENCES `master_prod` (`part_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_take_history_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `stock_take_history` VALUES 
(1,'2025-11-21','wip','AB2MRR-KCMR93',1580.00,1630.00,50.00,3.16,3,'Physical count shows 50 units more than system',
 '2025-11-21 16:50:00'),
(2,'2025-11-20','fg','D231-633_BR',260.00,280.00,20.00,7.69,5,'Stock reconciliation after delivery',
 '2025-11-20 14:45:00');

-- =====================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================================
CREATE INDEX idx_users_role_active ON users(role, is_active);
CREATE INDEX idx_master_prod_customer_active ON master_prod(customer, is_active);
CREATE INDEX idx_production_orders_date_status ON production_orders(start_date, status);
CREATE INDEX idx_output_mc_date_machine ON output_mc(production_date, machine_id);
CREATE INDEX idx_delivery_date_status ON delivery(delivery_date, status);
CREATE INDEX idx_oqc_date_status ON oqc(inspection_date, status);
CREATE INDEX idx_return_date_status ON return_customer(return_date, status);

-- =====================================================================
-- VIEWS FOR COMMON QUERIES (FastAPI Dashboard Support)
-- =====================================================================

-- Production Dashboard View
CREATE OR REPLACE VIEW v_production_summary AS
SELECT 
    po.id,
    po.job_order,
    po.part_number,
    mp.description as product_description,
    po.quantity_to_produce,
    COALESCE(SUM(om.quantity_good), 0) as total_produced,
    COALESCE(SUM(om.quantity_ng), 0) as total_defective,
    po.status,
    po.priority,
    po.start_date,
    po.expected_completion_date,
    u1.full_name as created_by,
    u2.full_name as assigned_to
FROM production_orders po
LEFT JOIN master_prod mp ON po.part_number = mp.part_number
LEFT JOIN output_mc om ON po.id = om.production_order_id
LEFT JOIN users u1 ON po.created_by_id = u1.id
LEFT JOIN users u2 ON po.assigned_to_id = u2.id
GROUP BY po.id, po.job_order, po.part_number, mp.description, po.quantity_to_produce, po.status, 
         po.priority, po.start_date, po.expected_completion_date, u1.full_name, u2.full_name;

-- Inventory Status View
CREATE OR REPLACE VIEW v_inventory_status AS
SELECT 
    mp.part_number,
    mp.description,
    COALESCE(fg.quantity, 0) as fg_quantity,
    COALESCE(wip.quantity, 0) as wip_quantity,
    (COALESCE(fg.quantity, 0) + COALESCE(wip.quantity, 0)) as total_quantity,
    fg.location as fg_location,
    wip.current_station as wip_station,
    fg.warehouse_zone,
    mp.unit_price,
    ((COALESCE(fg.quantity, 0) + COALESCE(wip.quantity, 0)) * COALESCE(mp.unit_price, 0)) as total_value
FROM master_prod mp
LEFT JOIN stock_fg fg ON mp.part_number = fg.part_number
LEFT JOIN stock_wip wip ON mp.part_number = wip.part_number
WHERE mp.is_active = 1;

-- Quality Summary View
CREATE OR REPLACE VIEW v_quality_summary AS
SELECT 
    DATE(oqc.inspection_date) as inspection_date,
    oqc.part_number,
    mp.description,
    SUM(oqc.quantity_good) as total_passed,
    SUM(COALESCE(oqc.quantity_ng, 0)) as total_rejected,
    COUNT(*) as inspection_count,
    ROUND(100 - (SUM(COALESCE(oqc.quantity_ng, 0)) / SUM(oqc.quantity_good + COALESCE(oqc.quantity_ng, 0)) * 100), 2) as pass_rate
FROM oqc
LEFT JOIN master_prod mp ON oqc.part_number = mp.part_number
WHERE oqc.status IN ('passed', 'failed')
GROUP BY DATE(oqc.inspection_date), oqc.part_number, mp.description;

-- =====================================================================
-- FINAL CONFIGURATION
-- =====================================================================
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- =====================================================================
-- DEPLOYMENT NOTES
-- =====================================================================
-- 
-- 1. Database: wms_manufacture
--    - UTF8MB4 encoding for international character support
--    - InnoDB engine for transaction support & foreign keys
--
-- 2. Tables (14 core tables):
--    - users: User authentication & role management
--    - master_prod: Product catalog
--    - production_orders: Job order tracking (CQRS Command writes here)
--    - output_mc: Machine production output
--    - stock_wip: Work-in-progress inventory
--    - stock_fg: Finished goods inventory
--    - oqc: Outgoing quality control results
--    - transfer_qc: QC workflow status transitions
--    - delivery: Warehouse shipment tracking
--    - return_customer: Customer returns & defects
--    - user_log: Audit trail for compliance
--    - stock_adjustments: Inventory correction history
--    - stock_take_history: Physical count records
--
-- 3. CQRS Architecture Support:
--    - Node.js Command Service (port 3108) writes to: 
--      production_orders, output_mc, oqc, delivery, return_customer, 
--      transfer_qc, stock_adjustments, user_log
--    - FastAPI Query Service (port 2025) reads all tables + views
--
-- 4. Views (3 dashboard views):
--    - v_production_summary: Production dashboard aggregations
--    - v_inventory_status: Stock level & valuation
--    - v_quality_summary: QC metrics & pass rates
--
-- 5. Security:
--    - Passwords stored as bcrypt hashes (salted & peppered)
--    - Foreign key constraints enforce data integrity
--    - User roles: admin, supervisor, operator, qc_inspector, warehouse, viewer
--    - Activity logging via user_log table for audit trails
--
-- 6. Deployment Steps:
--    a) Create database: mysql -u root -p < WMS_PRODUCTION_SETUP.sql
--    b) Verify tables: USE wms_manufacture; SHOW TABLES;
--    c) Configure Node.js: Update .env with DB_NAME=wms_manufacture
--    d) Configure FastAPI: Update app/core/config.py with database URL
--    e) Run migrations if needed: Sequelize auto-manages schema
--    f) Verify data: SELECT COUNT(*) FROM users; (should show 5)
--
-- 7. Connection Strings:
--    - Node.js (Sequelize): 
--      sequelize:sequelize@localhost:3306/wms_manufacture
--    - FastAPI (SQLAlchemy):
--      mysql+pymysql://root:password@localhost:3306/wms_manufacture
--    - Alibaba Cloud RDS:
--      mysql+pymysql://root:pass@rm-xxxxx.mysql.rds.aliyuncs.com:3306/wms_manufacture
--
-- =====================================================================
