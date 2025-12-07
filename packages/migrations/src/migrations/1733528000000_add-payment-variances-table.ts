import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create payment_variances table
  pgm.createTable('payment_variances', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    claim_id: {
      type: 'uuid',
      notNull: true,
      references: 'claims',
      onDelete: 'CASCADE',
      comment: 'Reference to the claim that was paid',
    },
    payer_id: {
      type: 'uuid',
      notNull: true,
      comment: 'Reference to the payer/insurer',
    },
    expected_amount: {
      type: 'decimal(10,2)',
      notNull: true,
      comment: 'Expected payment amount based on contract',
    },
    actual_amount: {
      type: 'decimal(10,2)',
      notNull: true,
      comment: 'Actual amount paid',
    },
    variance_amount: {
      type: 'decimal(10,2)',
      notNull: true,
      comment: 'Difference between expected and actual (actual - expected)',
    },
    variance_percentage: {
      type: 'decimal(5,2)',
      notNull: true,
      comment: 'Percentage variance ((actual - expected) / expected * 100)',
    },
    variance_type: {
      type: 'varchar(50)',
      notNull: true,
      check: "variance_type IN ('underpayment', 'overpayment', 'expected')",
      comment: 'Type of variance based on amount difference',
    },
    variance_reason: {
      type: 'varchar(100)',
      check:
        "variance_reason IN ('contract_adjustment', 'bundling', 'non_covered_service', 'missing_authorization', 'credentialing_issue', 'coordination_of_benefits', 'incorrect_coding', 'timely_filing', 'duplicate_claim', 'other')",
      comment: 'Reason for the payment variance',
    },
    payment_date: {
      type: 'timestamp',
      notNull: true,
      comment: 'Date payment was received',
    },
    reason_notes: {
      type: 'text',
      comment: 'Detailed notes about the variance reason',
    },
    requires_appeal: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether this variance should trigger an appeal',
    },
    appeal_id: {
      type: 'uuid',
      references: 'appeals',
      onDelete: 'SET NULL',
      comment: 'Reference to appeal if one was filed',
    },
    resolved: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether the variance has been resolved',
    },
    resolution_date: {
      type: 'timestamp',
      comment: 'Date the variance was resolved',
    },
    resolution_notes: {
      type: 'text',
      comment: 'Notes about how the variance was resolved',
    },
    created_by: {
      type: 'varchar(255)',
      comment: 'User who created the variance record',
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

  // Create indexes for common queries
  pgm.createIndex('payment_variances', 'claim_id')
  pgm.createIndex('payment_variances', 'payer_id')
  pgm.createIndex('payment_variances', 'variance_type')
  pgm.createIndex('payment_variances', 'variance_reason')
  pgm.createIndex('payment_variances', 'resolved')
  pgm.createIndex('payment_variances', 'requires_appeal')
  pgm.createIndex('payment_variances', 'payment_date')
  pgm.createIndex('payment_variances', ['payer_id', 'variance_type'])
  pgm.createIndex('payment_variances', ['created_at', 'variance_type'])

  // Create trigger to auto-update updated_at
  pgm.createTrigger(
    'payment_variances',
    'update_payment_variances_updated_at',
    {
      when: 'BEFORE',
      operation: 'UPDATE',
      function: 'update_updated_at_column',
      level: 'ROW',
    }
  )

  // Add payment variance tracking to claims table
  pgm.addColumns('claims', {
    has_payment_variance: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether this claim has any payment variances',
    },
    variance_count: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of payment variances for this claim',
    },
  })

  // Create trigger to auto-update claims when variance is created
  pgm.createFunction(
    'update_claim_payment_variance',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
      UPDATE claims
      SET has_payment_variance = true,
          variance_count = variance_count + 1,
          updated_at = now()
      WHERE id = NEW.claim_id;
      RETURN NEW;
    END;
    `
  )

  pgm.createTrigger(
    'payment_variances',
    'update_claim_payment_variance_trigger',
    {
      when: 'AFTER',
      operation: 'INSERT',
      function: 'update_claim_payment_variance',
      level: 'ROW',
    }
  )
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers first
  pgm.dropTrigger(
    'payment_variances',
    'update_claim_payment_variance_trigger',
    {
      ifExists: true,
    }
  )
  pgm.dropFunction('update_claim_payment_variance', [], { ifExists: true })
  pgm.dropTrigger('payment_variances', 'update_payment_variances_updated_at', {
    ifExists: true,
  })

  // Remove columns from claims
  pgm.dropColumns('claims', ['has_payment_variance', 'variance_count'], {
    ifExists: true,
  })

  // Drop table
  pgm.dropTable('payment_variances', { ifExists: true })
}
