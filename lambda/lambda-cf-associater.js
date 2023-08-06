const funcName = (process.env.funcName == null) ? 'country-mobile-limited' : process.env.funcName
const funcVersion = (process.env.funcVersion == null) ? '2' : process.env.funcVersion
const distributionId = (process.env.distributionId == null) ? 'E3O37UQQXPQMPO' : process.env.distributionId
const webacl = (process.env.webacl == null) ? '' : process.env.webacl

const AWS = require('aws-sdk');

// Create service client
const cf = new AWS.CloudFront();
const sts = new AWS.STS();

async function getAccountId() {
    const data = await sts.getCallerIdentity({}).promise();
    return data.Account;
}

async function getDistConfig(dConfig) {
    const params = {
        Id: distributionId
    };
    console.log('test ');
    let data = await cf.getDistributionConfig(params).promise();
    return data;
}

async function getLambdaArn() {
    const accountId = await getAccountId();
    return `arn:aws:lambda:us-east-1:${accountId}:function:${funcName}:${funcVersion}`;
}

async function associateLambda(config) {
    const lambdaArn = await getLambdaArn();
    console.log(`lambdaArn: ${lambdaArn}`);

    // Update CloudFront
    return await cf.updateDistribution(config).promise();
}

function lambdaEdge(lambdaArn) {
    return {
        Quantity: 1, /* required */
        Items: [
            {
                EventType: 'origin-request', /* required */
                LambdaFunctionARN: lambdaArn, /* required */
                IncludeBody: false
            },
        ]
    }
}

exports.handler = async (event) => {
    let dConfig = {};
    dConfig = await getDistConfig(dConfig);
    const larn = await getLambdaArn();
    dConfig.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations = lambdaEdge(larn);
    dConfig.DistributionConfig.WebACLId = webacl;  
    console.log("distribution config: " + JSON.stringify({ DistributionConfig: dConfig.DistributionConfig, Id: distributionId }))
    await associateLambda({ DistributionConfig: dConfig.DistributionConfig, Id: distributionId, IfMatch: dConfig.ETag });

    const response = {
        statusCode: 200,
        body: 'associated with Lambda for distribution: ' + distributionId,
    };
    return response;
};
