import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy, CfnOutput } from 'aws-cdk-lib';


export class RateLimitCfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    //cfn parameters
    const cfDistId = new cdk.CfnParameter(this, 'cfDistId', {
      description: 'CloudFront distribution id on which the Lambda@Edge is deployed',
      type: 'String',
      default: process.env.DISTRIBUTE || "abc123",
    });
    const rateLimit = new cdk.CfnParameter(this, 'rateLimit', {
      description: 'Total rate limited requests per minute',
      type: 'Number',
      default: process.env.RATE || 50,
    });
    
    const table = new dynamodb.Table(this, 'Request-Rate-Limit-Access', {
      partitionKey: {
        name: 'ip',
        type: dynamodb.AttributeType.STRING
      }, 
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, 
    });
    const blackIpTable = new dynamodb.Table(this, 'Black-Ip-List', {
      partitionKey: {
        name: 'ip',
        type: dynamodb.AttributeType.STRING
      }, 
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, 
    });
    const lambdaExecuteRole = new iam.Role(this, 'lambda-execute-role', {
      assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal("lambda.amazonaws.com"), new iam.ServicePrincipal("edgelambda.amazonaws.com")),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')]
    });
    const RateLimitLambda = new lambda.Function(this, 'RateLimitLambdaEdge', {
      runtime: lambda.Runtime.NODEJS_16_X,    // execution environment
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      handler: 'rate-limit.handler',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),       
      role: lambdaExecuteRole,         
    });
    // fullaccess to dynamodb
    table.grantFullAccess(RateLimitLambda);
    blackIpTable.grantFullAccess(RateLimitLambda);

    const edgeFuncVersion = RateLimitLambda.currentVersion

    // const iDistribution = cloudfront.Distribution.fromDistributionAttributes(this, 'distribution', {
    //   distributionId: 'foo',
    //   domainName: 'bar',
    // });
    
   new CfnOutput(this, 'DdbTableName', { value: table.tableName });
    
    }
}
