import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Rebills table for tracking claim resubmissions
  pgm.createTable('rebills', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    original_claim_id: {
      type: 'uuid',
      references: 'claims',
      onDelete: 'CASCADE',
      notNull: true,
      comment: 'Original denied claim',
    },
    new_claim_id: {
      type: 'uuid',
      references: 'claims',
      onDelete: 'CASCADE',
      comment: 'New claim ID after rebill (if different)',
    },
    denial_id: {
      type: 'uuid',
      references: 'denials',
      onDelete: 'CASCADE',
      notNull: true,
    },
    rebill_reason: {
      type: 'varchar(100)',
      notNull: true,
      check:
        "rebill_reason IN ('corrected_coding', 'added_modifier', 'updated_diagnosis', 'corrected_info', 'resubmit_timely', 'provider_change', 'other')",
    },
    changes_made: {
      type: 'jsonb',
      comment: 'JSON object describing what was changed',
    },
    reason_notes: {
      type: 'text',
      comment: 'Detailed notes about the rebill',
    },
    rebill_amount: {
      type: 'decimal(10,2)',
      notNull: true,
      check: 'rebill_amount > 0',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
      check:
        "status IN ('pending', 'submitted', 'accepted', 'paid', 'denied_again', 'partially_paid')",
    },
    submitted_date: {
      type: 'timestamp',
    },
    resolution_date: {
      type: 'timestamp',
    },
    recovered_amount: {
      type: 'decimal(10,2)',
      check: 'recovered_amount >= 0',
    },
    created_by: {
      type: 'varchar(255)',
      comment: 'User who created the rebill',
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
  pgm.createIndex('rebills', 'original_claim_id')
  pgm.createIndex('rebills', 'new_claim_id')
  pgm.createIndex('rebills', 'denial_id')
  pgm.createIndex('rebills', 'rebill_reason')
  pgm.createIndex('rebills', 'status')
  pgm.createIndex('rebills', 'submitted_date')
  pgm.createIndex('rebills', ['status', 'submitted_date'])

  // Add updated_at trigger
  pgm.createTrigger('rebills', 'update_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  })

  // Update denials table to track if rebilled
  pgm.addColumns('denials', {
    rebilled: {
      type: 'boolean',
      default: false,
      comment: 'Whether this denial has been rebilled',
    },
    rebill_date: {
      type: 'timestamp',
      comment: 'Date the denial was rebilled',
    },
  })

  // Create trigger to automatically update denials when rebill is created
  pgm.createFunction(
    'update_denial_rebilled',
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
        rebilled = true,
        rebill_date = NEW.created_at,
        resolution_status = 'pending',
        updated_at = now()
      WHERE id = NEW.denial_id;
      RETURN NEW;
    END;
    `
  )

  pgm.createTrigger('rebills', 'update_denial_rebilled_trigger', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'update_denial_rebilled',
    level: 'ROW',
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers
  pgm.dropTrigger('rebills', 'update_denial_rebilled_trigger', {
    ifExists: true,
  })
  pgm.dropTrigger('rebills', 'update_updated_at', { ifExists: true })

  // Drop functions
  pgm.dropFunction('update_denial_rebilled', [], { ifExists: true })

  // Remove columns from denials
  pgm.dropColumns('denials', ['rebilled', 'rebill_date'], { ifExists: true })

  // Drop table
  pgm.dropTable('rebills', { ifExists: true, cascade: true })
}
