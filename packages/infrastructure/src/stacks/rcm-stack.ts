import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as cr from 'aws-cdk-lib/custom-resources'

/**
 * RCM Infrastructure Stack
 *
 * Deploys a publicly accessible PostgreSQL RDS instance for the RCM MCP server.
 * The MCP server runs locally and connects to this remote database.
 *
 * Connection details are stored in Secrets Manager at /rcm/db-credentials
 *
 * For demo/development use only. For production:
 * - Use private subnets with VPN/bastion access
 * - Enable deletion protection
 * - Use larger instance types
 * - Enable Multi-AZ
 */
export class RcmStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const dbName = 'rcmdb'
    const dbUsername = 'rcm_admin'
    const dbPort = 5432

    // VPC with public subnets only (for publicly accessible RDS)
    const vpc = new ec2.Vpc(this, 'RcmVpc', {
      maxAzs: 2,
      natGateways: 0, // No NAT needed - saves ~$32/month
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    })

    // Security group for RDS - allows PostgreSQL from anywhere
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for RCM PostgreSQL database',
      allowAllOutbound: true,
    })

    // Allow PostgreSQL connections from anywhere (for demo)
    // In production, restrict to specific IP ranges
    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(dbPort),
      'Allow PostgreSQL from anywhere'
    )

    // PostgreSQL RDS instance - publicly accessible
    const database = new rds.DatabaseInstance(this, 'RcmDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroups: [dbSecurityGroup],
      databaseName: dbName,
      credentials: rds.Credentials.fromGeneratedSecret(dbUsername),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      backupRetention: Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY, // For demo - change for production
      deletionProtection: false, // For demo - change to true for production
      publiclyAccessible: true, // Direct connection for demo
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
    })

    // Create a custom secret with all connection details at /rcm/db-credentials
    // We need to read the generated password from the RDS secret and create a new secret
    // with all the connection details in a well-known location
    const dbCredentialsSecret = new secretsmanager.Secret(
      this,
      'DbCredentialsSecret',
      {
        secretName: '/rcm/db-credentials',
        description: 'RCM database connection credentials',
        removalPolicy: RemovalPolicy.DESTROY,
      }
    )

    // Use a custom resource to populate the secret with connection details
    // after the RDS instance is created
    const populateSecret = new cr.AwsCustomResource(this, 'PopulateDbSecret', {
      onCreate: {
        service: 'SecretsManager',
        action: 'putSecretValue',
        parameters: {
          SecretId: dbCredentialsSecret.secretArn,
          SecretString: JSON.stringify({
            host: database.dbInstanceEndpointAddress,
            port: dbPort,
            dbname: dbName,
            username: dbUsername,
            // Reference the password from the RDS-generated secret
            password: database.secret
              ?.secretValueFromJson('password')
              .unsafeUnwrap(),
            // Convenience: full connection string
            connection_string: `postgresql://${dbUsername}:${database.secret?.secretValueFromJson('password').unsafeUnwrap()}@${database.dbInstanceEndpointAddress}:${dbPort}/${dbName}`,
          }),
        },
        physicalResourceId: cr.PhysicalResourceId.of('rcm-db-credentials'),
      },
      onUpdate: {
        service: 'SecretsManager',
        action: 'putSecretValue',
        parameters: {
          SecretId: dbCredentialsSecret.secretArn,
          SecretString: JSON.stringify({
            host: database.dbInstanceEndpointAddress,
            port: dbPort,
            dbname: dbName,
            username: dbUsername,
            password: database.secret
              ?.secretValueFromJson('password')
              .unsafeUnwrap(),
            connection_string: `postgresql://${dbUsername}:${database.secret?.secretValueFromJson('password').unsafeUnwrap()}@${database.dbInstanceEndpointAddress}:${dbPort}/${dbName}`,
          }),
        },
        physicalResourceId: cr.PhysicalResourceId.of('rcm-db-credentials'),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [dbCredentialsSecret.secretArn],
      }),
    })

    // Ensure the custom resource runs after the database is created
    populateSecret.node.addDependency(database)

    // Grant the custom resource permission to read the RDS secret
    database.secret?.grantRead(populateSecret)
  }
}
