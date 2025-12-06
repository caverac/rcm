import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Enable UUID extension
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // Payers table
  pgm.createTable('payers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    payer_id: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    type: { type: 'varchar(50)' }, // commercial, medicare, medicaid, etc.
    contact_info: { type: 'jsonb' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // Claims table with comprehensive billing information
  pgm.createTable('claims', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    claim_id: { type: 'varchar(50)', notNull: true, unique: true },
    patient_id: { type: 'varchar(50)', notNull: true },
    payer_id: { type: 'uuid', references: 'payers', onDelete: 'SET NULL' },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'submitted', 'paid', 'denied', 'appealed', 'written_off')",
    },
    amount: { type: 'decimal(10,2)', notNull: true },
    paid_amount: { type: 'decimal(10,2)' },
    service_date: { type: 'date' },
    submitted_date: { type: 'timestamp' },
    // Billing codes
    cpt_codes: { type: 'jsonb', comment: 'Array of CPT codes with modifiers' },
    diagnosis_codes: { type: 'jsonb', comment: 'Array of ICD-10 diagnosis codes' },
    // Additional claim data
    place_of_service: { type: 'varchar(10)' },
    claim_type: { type: 'varchar(50)' }, // professional, institutional, etc.
    raw_data: { type: 'jsonb', comment: 'Raw 837/835 data' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // Denials table
  pgm.createTable('denials', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    claim_id: { type: 'uuid', references: 'claims', onDelete: 'CASCADE', notNull: true },
    denial_code: { type: 'varchar(50)', notNull: true }, // CO-197, PR-1, etc.
    denial_category: { type: 'varchar(100)' }, // AUTHORIZATION, CODING_ERROR, etc.
    denial_reason: { type: 'text' },
    denial_amount: { type: 'decimal(10,2)', notNull: true },
    denial_date: { type: 'timestamp', notNull: true },
    // Denial classification
    is_preventable: { type: 'boolean', default: false },
    root_cause: { type: 'varchar(255)' },
    // Action tracking
    action_taken: { type: 'varchar(50)' }, // appeal, write_off, rebill, etc.
    action_date: { type: 'timestamp' },
    resolution_status: { type: 'varchar(50)' }, // pending, resolved, abandoned
    recovered_amount: { type: 'decimal(10,2)' },
    // Additional metadata
    raw_data: { type: 'jsonb', comment: 'Raw 835 denial data' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // Denial codes reference table
  pgm.createTable('denial_code_library', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    category: { type: 'varchar(100)', notNull: true },
    description: { type: 'text', notNull: true },
    is_appealable: { type: 'boolean', default: true },
    common_resolution: { type: 'text' },
    prevention_tips: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // Organization policies for denial management
  pgm.createTable('org_policies', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    policy_name: { type: 'varchar(255)', notNull: true, unique: true },
    policy_type: { type: 'varchar(50)', notNull: true }, // appeal_threshold, write_off_threshold, etc.
    payer_id: { type: 'uuid', references: 'payers', onDelete: 'CASCADE' }, // null = applies to all
    denial_category: { type: 'varchar(100)' }, // null = applies to all categories
    // Thresholds
    min_amount: { type: 'decimal(10,2)' },
    max_amount: { type: 'decimal(10,2)' },
    days_to_action: { type: 'integer' },
    auto_appeal: { type: 'boolean', default: false },
    auto_write_off: { type: 'boolean', default: false },
    // Additional config
    config: { type: 'jsonb' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // Coding rules for audit_coding tool
  pgm.createTable('coding_rules', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    rule_name: { type: 'varchar(255)', notNull: true },
    rule_type: { type: 'varchar(50)', notNull: true }, // modifier_required, diagnosis_support, bundling, etc.
    cpt_code: { type: 'varchar(10)' },
    cpt_pattern: { type: 'varchar(100)' }, // regex pattern for matching multiple CPTs
    required_modifier: { type: 'varchar(10)' },
    incompatible_codes: { type: 'jsonb', comment: 'Array of CPT codes that cannot be billed together' },
    required_diagnosis_pattern: { type: 'varchar(100)' }, // ICD-10 pattern
    payer_specific: { type: 'uuid', references: 'payers', onDelete: 'CASCADE' },
    error_message: { type: 'text', notNull: true },
    severity: { type: 'varchar(20)', notNull: true, default: 'warning' }, // error, warning, info
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // Indexes for performance
  pgm.createIndex('claims', 'patient_id');
  pgm.createIndex('claims', 'payer_id');
  pgm.createIndex('claims', 'status');
  pgm.createIndex('claims', 'submitted_date');
  pgm.createIndex('denials', 'claim_id');
  pgm.createIndex('denials', 'denial_code');
  pgm.createIndex('denials', 'denial_category');
  pgm.createIndex('denials', 'denial_date');
  pgm.createIndex('denials', 'resolution_status');
  pgm.createIndex('denial_code_library', 'category');
  pgm.createIndex('org_policies', 'payer_id');
  pgm.createIndex('org_policies', ['policy_type', 'is_active']);
  pgm.createIndex('coding_rules', 'cpt_code');
  pgm.createIndex('coding_rules', ['rule_type', 'is_active']);

  // Create updated_at trigger function
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    `
  );

  // Add updated_at triggers
  const tables = ['payers', 'claims', 'denials', 'org_policies'];
  tables.forEach((table) => {
    pgm.createTrigger(table, 'update_updated_at', {
      when: 'BEFORE',
      operation: 'UPDATE',
      function: 'update_updated_at_column',
      level: 'ROW',
    });
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers
  const tables = ['payers', 'claims', 'denials', 'org_policies'];
  tables.forEach((table) => {
    pgm.dropTrigger(table, 'update_updated_at', { ifExists: true });
  });

  // Drop function
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });

  // Drop tables in reverse order
  pgm.dropTable('coding_rules', { ifExists: true, cascade: true });
  pgm.dropTable('org_policies', { ifExists: true, cascade: true });
  pgm.dropTable('denial_code_library', { ifExists: true, cascade: true });
  pgm.dropTable('denials', { ifExists: true, cascade: true });
  pgm.dropTable('claims', { ifExists: true, cascade: true });
  pgm.dropTable('payers', { ifExists: true, cascade: true });

  // Drop extension
  pgm.dropExtension('uuid-ossp', { ifExists: true });
}
