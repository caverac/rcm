import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class RcmStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB table for claims data
    const claimsTable = new dynamodb.Table(this, 'ClaimsTable', {
      partitionKey: { name: 'claimId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // Change for production
      pointInTimeRecovery: true,
    });

    // Add GSI for querying by patient ID
    claimsTable.addGlobalSecondaryIndex({
      indexName: 'PatientIndex',
      partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedDate', type: dynamodb.AttributeType.STRING },
    });

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
    });

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
      environment: {
        CLAIMS_TABLE_NAME: claimsTable.tableName,
        DOCUMENTS_BUCKET_NAME: documentsBucket.bucketName,
      },
    });

    // Grant permissions
    claimsTable.grantReadWriteData(claimsProcessor);
    documentsBucket.grantReadWrite(claimsProcessor);

    // API Gateway
    const api = new apigateway.RestApi(this, 'RcmApi', {
      restApiName: 'Revenue Cycle Management API',
      description: 'API for RCM operations',
    });

    const claimsResource = api.root.addResource('claims');
    claimsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(claimsProcessor)
    );
    claimsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(claimsProcessor)
    );

    const claimResource = claimsResource.addResource('{claimId}');
    claimResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(claimsProcessor)
    );
    claimResource.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(claimsProcessor)
    );
  }
}
