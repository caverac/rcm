import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Appeals table for managing denial appeals
  pgm.createTable('appeals', {
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
    appeal_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'first_level',
      check:
        "appeal_type IN ('first_level', 'second_level', 'third_level', 'external_review')",
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
      check:
        "status IN ('pending', 'in_progress', 'submitted', 'under_review', 'approved', 'denied', 'partially_approved', 'withdrawn')",
    },
    priority: {
      type: 'varchar(20)',
      notNull: true,
      default: 'medium',
      check: "priority IN ('high', 'medium', 'low')",
    },
    appeal_amount: {
      type: 'decimal(10,2)',
      notNull: true,
      check: 'appeal_amount > 0',
    },
    filed_date: { type: 'timestamp' },
    due_date: { type: 'timestamp' },
    decision_date: { type: 'timestamp' },
    approved_amount: {
      type: 'decimal(10,2)',
      check: 'approved_amount >= 0',
    },
    appeal_reason: { type: 'text' },
    supporting_documents: {
      type: 'jsonb',
      comment: 'Array of document references/URLs',
    },
    notes: { type: 'text' },
    assigned_to: { type: 'varchar(255)' },
    payer_response: { type: 'text' },
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
  pgm.createIndex('appeals', 'denial_id')
  pgm.createIndex('appeals', 'claim_id')
  pgm.createIndex('appeals', 'status')
  pgm.createIndex('appeals', 'priority')
  pgm.createIndex('appeals', 'assigned_to')
  pgm.createIndex('appeals', ['status', 'priority'])

  // Partial index for finding overdue appeals (only for active appeals)
  pgm.createIndex('appeals', 'due_date', {
    name: 'appeals_due_date_active_index',
    where: "status IN ('pending', 'in_progress', 'submitted', 'under_review')",
  })

  // Add updated_at trigger to appeals table
  pgm.createTrigger('appeals', 'update_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  })

  // Update the denials table to track if an appeal exists
  pgm.addColumns('denials', {
    appealed: {
      type: 'boolean',
      default: false,
      comment: 'Whether this denial has been appealed',
    },
  })

  // Create a trigger to automatically update denials.appealed when an appeal is created
  pgm.createFunction(
    'update_denial_appealed',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
      UPDATE denials
      SET appealed = true
      WHERE id = NEW.denial_id;
      RETURN NEW;
    END;
    `
  )

  pgm.createTrigger('appeals', 'update_denial_appealed_trigger', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'update_denial_appealed',
    level: 'ROW',
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers
  pgm.dropTrigger('appeals', 'update_denial_appealed_trigger', {
    ifExists: true,
  })
  pgm.dropTrigger('appeals', 'update_updated_at', { ifExists: true })

  // Drop functions
  pgm.dropFunction('update_denial_appealed', [], { ifExists: true })

  // Remove column from denials
  pgm.dropColumns('denials', ['appealed'], { ifExists: true })

  // Drop table
  pgm.dropTable('appeals', { ifExists: true, cascade: true })
}
