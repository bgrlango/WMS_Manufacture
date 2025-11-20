/**
 * QR Code Helper Utilities
 * Format: partnumber,LOT-(tahun-bulan-tanggal)(shift)(No mesin)-(no box)
 * Contoh: AB2MRR-KCMR93,LOT-202508313A07-0012
 */

const moment = require('moment');

class QRCodeHelper {
  /**
   * Parse QR code data
   * @param {string} qrData - Raw QR code data
   * @returns {object} Parsed data with part_number and lot_number
   */
  static parseQRCode(qrData) {
    try {
      if (!qrData || typeof qrData !== 'string') {
        throw new Error('Invalid QR code data');
      }

      const parts = qrData.split(',');
      if (parts.length !== 2) {
        throw new Error('QR code format should be: partnumber,LOT-YYYYMMDDSSMM-NNNN');
      }

      const part_number = parts[0].trim();
      const lot_number = parts[1].trim();

      // Validate lot number format
      if (!lot_number.startsWith('LOT-')) {
        throw new Error('Lot number must start with LOT-');
      }

      // Validate lot number structure: LOT-YYYYMMDDSSMM-NNNN
      const lotPattern = /^LOT-(\d{8})([A-Z])(\d{2})-(\d{4})$/;
      const match = lot_number.match(lotPattern);
      
      if (!match) {
        throw new Error('Invalid lot number format. Expected: LOT-YYYYMMDDSSMM-NNNN');
      }

      const [, dateStr, shift, machine, box] = match;
      
      // Validate date
      const date = moment(dateStr, 'YYYYMMDD');
      if (!date.isValid()) {
        throw new Error('Invalid date in lot number');
      }

      return {
        part_number,
        lot_number,
        parsed_lot: {
          date: date.format('YYYY-MM-DD'),
          shift,
          machine: parseInt(machine),
          box: parseInt(box),
          raw_date: dateStr
        },
        is_valid: true
      };
    } catch (error) {
      return {
        part_number: null,
        lot_number: null,
        parsed_lot: null,
        is_valid: false,
        error: error.message
      };
    }
  }

  /**
   * Generate lot number
   * @param {string} shift - Shift code (A, B, C)
   * @param {number} machine - Machine number (01-99)
   * @param {number} box - Box number (0001-9999)
   * @param {Date} date - Production date (optional, defaults to today)
   * @returns {string} Generated lot number
   */
  static generateLotNumber(shift, machine, box, date = new Date()) {
    const dateStr = moment(date).format('YYYYMMDD');
    const machineStr = machine.toString().padStart(2, '0');
    const boxStr = box.toString().padStart(4, '0');
    
    return `LOT-${dateStr}${shift}${machineStr}-${boxStr}`;
  }

  /**
   * Generate QR code data
   * @param {string} partNumber - Part number
   * @param {string} shift - Shift code
   * @param {number} machine - Machine number
   * @param {number} box - Box number
   * @param {Date} date - Production date
   * @returns {string} QR code data
   */
  static generateQRCode(partNumber, shift, machine, box, date = new Date()) {
    const lotNumber = this.generateLotNumber(shift, machine, box, date);
    return `${partNumber},${lotNumber}`;
  }

  /**
   * Validate QR code format
   * @param {string} qrData - QR code data to validate
   * @returns {boolean} Is valid format
   */
  static isValidQRCode(qrData) {
    const parsed = this.parseQRCode(qrData);
    return parsed.is_valid;
  }

  /**
   * Extract production info from lot number
   * @param {string} lotNumber - Lot number to analyze
   * @returns {object} Production information
   */
  static getProductionInfo(lotNumber) {
    const parsed = this.parseQRCode(`DUMMY,${lotNumber}`);
    if (!parsed.is_valid) {
      return null;
    }

    return {
      production_date: parsed.parsed_lot.date,
      shift: parsed.parsed_lot.shift,
      machine_number: parsed.parsed_lot.machine,
      box_number: parsed.parsed_lot.box,
      shift_name: this.getShiftName(parsed.parsed_lot.shift)
    };
  }

  /**
   * Get shift name from code
   * @param {string} shiftCode - Shift code (A, B, C)
   * @returns {string} Shift name
   */
  static getShiftName(shiftCode) {
    const shifts = {
      'A': 'Morning Shift (07:00-15:00)',
      'B': 'Evening Shift (15:00-23:00)', 
      'C': 'Night Shift (23:00-07:00)'
    };
    return shifts[shiftCode] || 'Unknown Shift';
  }

  /**
   * Generate QR code data for testing purposes
   * @param {string} partNumber - Part number
   * @param {string} shift - Shift code (A, B, C)
   * @param {number} machine - Machine number (1-99)
   * @param {number} box - Box number (1-9999)
   * @param {Date} date - Production date (optional, defaults to today)
   * @returns {string} Generated QR code data
   */
  static generateQRCode(partNumber, shift = 'A', machine = 1, box = 1, date = null) {
    const prodDate = date || new Date();
    const lotNumber = this.generateLotNumber(shift, machine, box, prodDate);
    return `${partNumber},${lotNumber}`;
  }
}

module.exports = QRCodeHelper;
