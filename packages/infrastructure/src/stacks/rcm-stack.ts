import {
  Stack,
  StackProps,
  RemovalPolicy,
  Duration,
  CfnOutput,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'

export class RcmStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // VPC for RDS
    const vpc = new ec2.Vpc(this, 'RcmVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    })

    // Security group for RDS
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for RCM PostgreSQL database',
      allowAllOutbound: true,
    })

    // Security group for Lambda functions
    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'LambdaSecurityGroup',
      {
        vpc,
        description: 'Security group for Lambda functions',
        allowAllOutbound: true,
      }
    )

    // Allow Lambda to connect to RDS
    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to PostgreSQL'
    )

    // PostgreSQL RDS instance
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
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      databaseName: 'rcmdb',
      credentials: rds.Credentials.fromGeneratedSecret('rcm_admin'),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      backupRetention: Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY, // Change for production
      deletionProtection: false, // Change to true for production
      publiclyAccessible: false,
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
    })

    // S3 bucket for document storage
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY, // Change for production
      autoDeleteObjects: true, // Change for production
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: Duration.days(90),
            },
          ],
        },
      ],
    })

    // Lambda function placeholder for claims processing
    const claimsProcessor = new lambda.Function(this, 'ClaimsProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Event:', JSON.stringify(event, null, 2));
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Claims processor placeholder' }),
          };
        };
      `),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: database.secret?.secretArn || '',
        DB_NAME: 'rcmdb',
        DOCUMENTS_BUCKET_NAME: documentsBucket.bucketName,
      },
      timeout: Duration.seconds(30),
    })

    // Grant permissions
    database.secret?.grantRead(claimsProcessor)
    documentsBucket.grantReadWrite(claimsProcessor)

    // API Gateway
    const api = new apigateway.RestApi(this, 'RcmApi', {
      restApiName: 'Revenue Cycle Management API',
      description: 'API for RCM operations',
    })

    const claimsResource = api.root.addResource('claims')
    claimsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(claimsProcessor)
    )
    claimsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(claimsProcessor)
    )

    const claimResource = claimsResource.addResource('{claimId}')
    claimResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(claimsProcessor)
    )
    claimResource.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(claimsProcessor)
    )

    // CloudFormation Outputs
    new CfnOutput(this, 'DatabaseEndpoint', {
      value: database.dbInstanceEndpointAddress,
      description: 'RDS PostgreSQL endpoint',
      exportName: 'RcmDatabaseEndpoint',
    })

    new CfnOutput(this, 'DatabasePort', {
      value: database.dbInstanceEndpointPort,
      description: 'RDS PostgreSQL port',
      exportName: 'RcmDatabasePort',
    })

    new CfnOutput(this, 'DatabaseName', {
      value: 'rcmdb',
      description: 'Database name',
      exportName: 'RcmDatabaseName',
    })

    new CfnOutput(this, 'DatabaseSecretArn', {
      value: database.secret?.secretArn || '',
      description: 'Secret ARN for database credentials',
      exportName: 'RcmDatabaseSecretArn',
    })

    new CfnOutput(this, 'DocumentsBucketName', {
      value: documentsBucket.bucketName,
      description: 'S3 bucket for document storage',
      exportName: 'RcmDocumentsBucketName',
    })

    new CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint',
      exportName: 'RcmApiEndpoint',
    })

    new CfnOutput(this, 'DatabaseConnectionString', {
      value: `postgresql://\${SECRET}@${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}/rcmdb`,
      description:
        'Database connection string (replace ${SECRET} with credentials from Secrets Manager)',
      exportName: 'RcmDatabaseConnectionTemplate',
    })
  }
}
