const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('equipment_assets', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      organization_id: { type: DataTypes.UUID, allowNull: true },
      serial_number: { type: DataTypes.STRING(120), allowNull: false },
      qr_public_token: { type: DataTypes.STRING(160), allowNull: false },
      qr_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      name: { type: DataTypes.STRING(160), allowNull: false },
      manufacturer: { type: DataTypes.STRING(120), allowNull: true },
      model: { type: DataTypes.STRING(120), allowNull: true },
      status: { type: DataTypes.ENUM('OPERATIONAL', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'QUARANTINED', 'RETIRED'), allowNull: false, defaultValue: 'OPERATIONAL' },
      collection_point_id: { type: DataTypes.STRING(120), allowNull: true },
      meter_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('equipment_assets', ['tenant_id', 'serial_number'], { unique: true, name: 'equipment_assets_tenant_serial_uq' });
    await queryInterface.addIndex('equipment_assets', ['tenant_id', 'qr_public_token'], { unique: true, name: 'equipment_assets_tenant_qr_uq' });
    await queryInterface.addIndex('equipment_assets', ['tenant_id', 'status'], { name: 'equipment_assets_tenant_status_idx' });

    await queryInterface.createTable('rental_contracts', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      organization_id: { type: DataTypes.UUID, allowNull: true },
      entitlement_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: true },
      catalog_item_id: { type: DataTypes.UUID, allowNull: true },
      catalog_price_id: { type: DataTypes.UUID, allowNull: true },
      source_system: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'equipment' },
      source_id: { type: DataTypes.STRING(160), allowNull: false },
      mode: { type: DataTypes.ENUM('PREPAID', 'POSTPAID'), allowNull: false },
      status: { type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'EXHAUSTED', 'CANCELLED', 'EXPIRED'), allowNull: false, defaultValue: 'DRAFT' },
      included_minutes: { type: DataTypes.INTEGER, allowNull: false },
      max_sessions: { type: DataTypes.INTEGER, allowNull: false },
      overtime_rate_cents: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BRL' },
      valid_from: { type: DataTypes.DATE, allowNull: false },
      valid_until: { type: DataTypes.DATE, allowNull: true },
      used_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      used_sessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('rental_contracts', ['tenant_id', 'source_system', 'source_id'], { unique: true, name: 'rental_contracts_source_uq' });
    await queryInterface.addIndex('rental_contracts', ['tenant_id', 'status'], { name: 'rental_contracts_status_idx' });
    await queryInterface.addIndex('rental_contracts', ['entitlement_id'], { name: 'rental_contracts_entitlement_idx' });

    await queryInterface.createTable('equipment_reservations', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      organization_id: { type: DataTypes.UUID, allowNull: true },
      contract_id: { type: DataTypes.UUID, allowNull: false },
      asset_id: { type: DataTypes.UUID, allowNull: false },
      agend_reservation_id: { type: DataTypes.STRING(160), allowNull: true },
      user_id: { type: DataTypes.UUID, allowNull: true },
      collection_point_id: { type: DataTypes.STRING(120), allowNull: true },
      scheduled_start: { type: DataTypes.DATE, allowNull: false },
      scheduled_end: { type: DataTypes.DATE, allowNull: false },
      status: { type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'), allowNull: false, defaultValue: 'PENDING' },
      idempotency_key: { type: DataTypes.STRING(220), allowNull: false },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('equipment_reservations', ['tenant_id', 'idempotency_key'], { unique: true, name: 'equipment_reservations_idempotency_uq' });
    await queryInterface.addIndex('equipment_reservations', ['asset_id', 'scheduled_start', 'scheduled_end'], { name: 'equipment_reservations_asset_window_idx' });

    await queryInterface.createTable('rental_sessions', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      organization_id: { type: DataTypes.UUID, allowNull: true },
      contract_id: { type: DataTypes.UUID, allowNull: false },
      reservation_id: { type: DataTypes.UUID, allowNull: true },
      asset_id: { type: DataTypes.UUID, allowNull: false },
      entitlement_id: { type: DataTypes.UUID, allowNull: false },
      status: { type: DataTypes.ENUM('CHECKED_OUT', 'COMPLETED', 'COMPLETED_WITH_DEBT', 'CANCELLED', 'INCIDENT'), allowNull: false, defaultValue: 'CHECKED_OUT' },
      pickup_check_in_at: { type: DataTypes.DATE, allowNull: false },
      return_check_out_at: { type: DataTypes.DATE, allowNull: true },
      pickup_operator_id: { type: DataTypes.UUID, allowNull: true },
      return_operator_id: { type: DataTypes.UUID, allowNull: true },
      pickup_collection_point_id: { type: DataTypes.STRING(120), allowNull: true },
      return_collection_point_id: { type: DataTypes.STRING(120), allowNull: true },
      used_minutes: { type: DataTypes.INTEGER, allowNull: true },
      included_minutes_used: { type: DataTypes.INTEGER, allowNull: true },
      overage_minutes: { type: DataTypes.INTEGER, allowNull: true },
      overage_amount_cents: { type: DataTypes.INTEGER, allowNull: true },
      entitlement_movement_id: { type: DataTypes.UUID, allowNull: true },
      billing_item_id: { type: DataTypes.STRING(160), allowNull: true },
      pay_transaction_id: { type: DataTypes.STRING(160), allowNull: true },
      incident_code: { type: DataTypes.STRING(100), allowNull: true },
      idempotency_key: { type: DataTypes.STRING(220), allowNull: false },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('rental_sessions', ['tenant_id', 'idempotency_key'], { unique: true, name: 'rental_sessions_idempotency_uq' });
    await queryInterface.addIndex('rental_sessions', ['asset_id', 'status'], { name: 'rental_sessions_asset_status_idx' });
    await queryInterface.addIndex('rental_sessions', ['contract_id', 'status'], { name: 'rental_sessions_contract_status_idx' });

    await queryInterface.createTable('rental_usage_records', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      session_id: { type: DataTypes.UUID, allowNull: false },
      event_type: { type: DataTypes.ENUM('CHECK_IN', 'CHECK_OUT', 'EXTENSION', 'INCIDENT', 'ADJUSTMENT'), allowNull: false },
      occurred_at: { type: DataTypes.DATE, allowNull: false },
      used_minutes: { type: DataTypes.INTEGER, allowNull: true },
      idempotency_key: { type: DataTypes.STRING(220), allowNull: false },
      actor_id: { type: DataTypes.UUID, allowNull: true },
      payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('rental_usage_records', ['tenant_id', 'session_id', 'idempotency_key'], { unique: true, name: 'rental_usage_records_idempotency_uq' });

    await queryInterface.createTable('equipment_inspections', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      asset_id: { type: DataTypes.UUID, allowNull: false },
      session_id: { type: DataTypes.UUID, allowNull: true },
      phase: { type: DataTypes.ENUM('PICKUP', 'RETURN'), allowNull: false },
      condition: { type: DataTypes.ENUM('OK', 'DAMAGE', 'MISSING_PART', 'DIRTY', 'FAILED'), allowNull: false },
      meter_minutes: { type: DataTypes.INTEGER, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      media_object_ids: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      additional_charge_cents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('equipment_inspections', ['asset_id', 'phase', 'session_id'], { name: 'equipment_inspections_asset_phase_idx' });

    await queryInterface.createTable('equipment_maintenance_orders', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      asset_id: { type: DataTypes.UUID, allowNull: false },
      type: { type: DataTypes.ENUM('PREVENTIVE', 'CORRECTIVE', 'INSPECTION'), allowNull: false },
      status: { type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'), allowNull: false, defaultValue: 'OPEN' },
      priority: { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'), allowNull: false, defaultValue: 'MEDIUM' },
      description: { type: DataTypes.TEXT, allowNull: false },
      scheduled_at: { type: DataTypes.DATE, allowNull: true },
      started_at: { type: DataTypes.DATE, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      cost_cents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('equipment_maintenance_orders', ['tenant_id', 'asset_id', 'status'], { name: 'equipment_maintenance_asset_status_idx' });
  },

  async down(queryInterface) {
    for (const table of ['equipment_maintenance_orders', 'equipment_inspections', 'rental_usage_records', 'rental_sessions', 'equipment_reservations', 'rental_contracts', 'equipment_assets']) {
      await queryInterface.dropTable(table);
    }
    for (const type of ['enum_equipment_maintenance_orders_status', 'enum_equipment_maintenance_orders_priority', 'enum_equipment_maintenance_orders_type', 'enum_equipment_inspections_condition', 'enum_equipment_inspections_phase', 'enum_rental_usage_records_event_type', 'enum_rental_sessions_status', 'enum_equipment_reservations_status', 'enum_rental_contracts_status', 'enum_rental_contracts_mode', 'enum_equipment_assets_status']) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}";`);
    }
  },
};
