import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Write-offs table for tracking denied amounts that are written off
  pgm.createTable('write_offs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    denial_id: {
      type: 'uuid',
      references: 'denials',
      onDelete: 'CASCADE',
      notNull: true,
    },
    claim_id: {
      type: 'uuid',
      references: 'claims',
      onDelete: 'CASCADE',
      notNull: true,
    },
    write_off_amount: {
      type: 'decimal(10,2)',
      notNull: true,
      check: 'write_off_amount > 0',
    },
    write_off_reason: {
      type: 'varchar(100)',
      notNull: true,
      check:
        "write_off_reason IN ('below_threshold', 'timely_filing_expired', 'non_covered_service', 'patient_responsibility', 'contract_adjustment', 'uncollectible', 'other')",
    },
    reason_notes: {
      type: 'text',
      comment: 'Additional details about the write-off decision',
    },
    approved_by: {
      type: 'varchar(255)',
      comment: 'Person who approved the write-off',
    },
    approval_date: {
      type: 'timestamp',
    },
    category: {
      type: 'varchar(50)',
      comment: 'Denial category that led to write-off',
    },
    is_preventable: {
      type: 'boolean',
      default: false,
      comment: 'Whether this write-off was preventable',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('now()'),
    },
  })

  // Indexes for performance
  pgm.createIndex('write_offs', 'denial_id')
  pgm.createIndex('write_offs', 'claim_id')
  pgm.createIndex('write_offs', 'write_off_reason')
  pgm.createIndex('write_offs', 'category')
  pgm.createIndex('write_offs', 'is_preventable')
  pgm.createIndex('write_offs', 'approval_date')
  pgm.createIndex('write_offs', ['category', 'is_preventable'])

  // Add updated_at trigger
  pgm.createTrigger('write_offs', 'update_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  })

  // Update denials table to track if written off
  pgm.addColumns('denials', {
    written_off: {
      type: 'boolean',
      default: false,
      comment: 'Whether this denial has been written off',
    },
    write_off_date: {
      type: 'timestamp',
      comment: 'Date the denial was written off',
    },
  })

  // Create trigger to automatically update denials when write-off is created
  pgm.createFunction(
    'update_denial_written_off',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
      UPDATE denials
      SET
        written_off = true,
        write_off_date = NEW.created_at,
        resolution_status = 'abandoned',
        updated_at = now()
      WHERE id = NEW.denial_id;
      RETURN NEW;
    END;
    `
  )

  pgm.createTrigger('write_offs', 'update_denial_written_off_trigger', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'update_denial_written_off',
    level: 'ROW',
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers
  pgm.dropTrigger('write_offs', 'update_denial_written_off_trigger', {
    ifExists: true,
  })
  pgm.dropTrigger('write_offs', 'update_updated_at', { ifExists: true })

  // Drop functions
  pgm.dropFunction('update_denial_written_off', [], { ifExists: true })

  // Remove columns from denials
  pgm.dropColumns('denials', ['written_off', 'write_off_date'], {
    ifExists: true,
  })

  // Drop table
  pgm.dropTable('write_offs', { ifExists: true, cascade: true })
}
