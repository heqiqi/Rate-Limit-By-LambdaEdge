/// TABLE Region 
const TABLE_REGION =   'us-east-1'
/// Name of the Ip Rate table 
const TABLE_NAME = (process.env.TABLE_NAME == null) ? 'cf-country-mobile-rate-limit' : process.env.TABLE_NAME
/// Name of the block Ip table 
const IP_TABLE_NAME = (process.env.IP_TABLE_NAME == null) ? 'black-ip-list' : process.env.IP_TABLE_NAME

/// allowed nation
const ALLOWED_COUNTRY = (process.env.ALLOWED_COUNTRY == null) ? 'KH,CN,HK,MY,PH,SA,TH,VN,UA,SG,MM' : process.env.ALLOWED_COUNTRY

/// Windows duration, default value: 2 minutes 
const WINDOW_PERIOD_IN_SECONDS = (process.env.WINDOW_PERIOD_IN_SECONDS == null) ? 2 * 60 * 1000 : Number(process.env.WINDOW_PERIOD_IN_SECONDS) * 1000

/// GLOBAL_RATE
const GLOBAL_RATE = (process.env.GLOBAL_RATE == null) ? 'GLOBAL_RATE_RRRRR' : Number(process.env.GLOBAL_RATE)

/// URL_RATE
const URL_RATE = (process.env.URL_RATE == null) ? 'URL_RATE_RRRRR' : Number(process.env.URL_RATE)

/// URL_LIST
const URL_LIST = (process.env.URL_LIST == null) ? 'URL_LIST_RRRRR' : Number(process.env.URL_LIST)

/// Duration of black ， 10 min
const BLOCK_PERIOD = (process.env.BLOCK_PERIOD == null) ? 10*60*1000 : process.env.BLOCK_PERIOD

/// dynamodb global tables enabled region
const DDB_GLOBAL_TABLE_REGIONS = (process.env.DDB_GLOBAL_TABLE_REGIONS == null) ? 'DDB_GLOBAL_TABLE_REGIONS_RRRRR' : process.env.DDB_GLOBAL_TABLE_REGIONS

/// HTTP_CODE_LIST
const CODE_LIST = (process.env.CODE_LIST == null) ? 'CODE_LIST_RRRRR' : Number(process.env.CODE_LIST)


/// request region
const AWS_REGION = process.env.AWS_REGION;
console.log('AWS_REGION: ' + AWS_REGION + "\nprocess.env.AWS_REGION: " + process.env.AWS_REGION);
const RegionsMap =
{
    'us-east-2': 'us',
    'us-east-1': 'us',
    'us-west-1': 'us',
    'us-west-2': 'us',
    'af-south-1': 'africa',
    'ap-east-1': 'asia',
    'ap-south-2': 'asia',
    'ap-southeast-3': 'asia',
    'ap-southeast-4': 'asia',
    'ap-south-1': 'asia',
    'ap-northeast-3': 'asia',
    'ap-northeast-2': 'asia',
    'ap-southeast-1': 'asia',
    'ap-southeast-2': 'asia',
    'ap-northeast-1': 'asia',
    'ca-central-1': 'us',
    'eu-central-1': 'eu',
    'eu-west-1': 'eu',
    'eu-west-2': 'eu',
    'eu-south-1': 'eu',
    'eu-west-3': 'eu',
    'eu-south-2': 'eu',
    'eu-north-1': 'eu',
    'eu-central-2': 'eu',
    'il-central-1': 'me',
    'me-south-1': 'me',
    'me-central-1': 'me',
    'sa-east-1': 'us'
}

let regionsEnabled = {
    'us': false,
    'us-region': [],
    'asia': false,
    'asia-region': [],
    'eu': false,
    'eu-region': [],
    'me': false,
    'me-region': [],
    'africa': false,
    'africa-region': []
}
const https = require('https');

const replicatedRegions = {
  'us-east-1': true,
  'us-west-2': false,
  'eu-central-1': false,
  'ap-southeast-1': false,
  'ap-northeast-1': false,
  'ap-east-1': false
}

const timeElapsed = Date.now();
const today = new Date(timeElapsed);

    function rateLimit () {
    return {
      status: '429',
      statusDescription: 'Too Many Requests'
    }
}

function blackList () {
    return {
      status: '403',
      statusDescription: 'In blacklist'
    }
}

function originLambdaErr () {
    return {
      status: '501',
      statusDescription: 'internal error'
    }
}

function calcDynamoDBRegion () {
    let DdbRegions = DDB_GLOBAL_TABLE_REGIONS.split(',');
    for (let r of DdbRegions) {
        let geo = RegionsMap[r];
        regionsEnabled[geo] = true;
        const geoRegion = geo+'-region';
        let rList = regionsEnabled[geoRegion];
        regionsEnabled[geoRegion].push(r);
    }
    console.log(`regionsEnabled map: ${JSON.stringify(regionsEnabled)}`);
    if (regionsEnabled[RegionsMap[process.env.AWS_REGION]]){
        //random index
        const list = regionsEnabled[RegionsMap[process.env.AWS_REGION]+'-region']
        const randomIndex = Math.floor(Math.random() * list.length);
        console.log('onboarding region: ' + list[randomIndex]);
        return list[randomIndex]
    }else{
        console.log('onboarding region: us-east-1');
        return 'us-east-1'
    }
} 

const AWS = require('aws-sdk')
const ddb = new AWS.DynamoDB.DocumentClient({
    apiVersion: '2012-10-08',
    region: calcDynamoDBRegion(),
    //sslEnabled: false, 
    paramValidation: false, 
    convertResponseTypes: false,
    httpOptions: {
        agent: new https.Agent({
          keepAlive: true,
        }),
    },
})

function getIp(request){
    return request.clientIp;
}

function getUA(request){
    if(request.headers['user-agent'] != null) {
        return request.headers['user-agent'][0].value;
    }else{
        return "unknown";
    }
}


function getCountry(request){
    if(request.headers['cloudfront-viewer-country'] != null) {
        return request.headers['cloudfront-viewer-country'][0].value;
    }
    return "unknown";
}

function isCountedCode(response){
    let code = getStatus(response);
    let errCodes = CODE_LIST.split(',');
    return errCodes.indexOf(code) != -1;
}

function accessLogFactory(req, code){
    return {
        ip:getIp(req),
        createAt: Date.now(),
        ua: getUA(req),
        url: req.uri,
        from: AWS_REGION,
        country: getCountry(req),
        statusCode: code,
        secIndex: today.toLocaleDateString(),
        ttl: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // in 24 hours
    }
}

//DDB operation
async function createItem (tableName,accessRecord) {
    let params = {
        TableName : tableName,
        Item: accessRecord
    }
    return await ddb.put(params).promise();    
}

async function createIps (tableName,ip) {
    let params = {
        TableName : tableName,
        Item: {
            "ip":ip,
            "createAt":timeElapsed,
            "secondIndex":"1",
            "ttl": Math.floor((timeElapsed + 24*60*60*1000)/1000)
            }
    }
    return await ddb.put(params).promise();    
}

async function queryIps (tableName, ip, startTime) {
    let params = {
        TableName : tableName,
        KeyConditionExpression: "#pKey = :pKey and #createAt >= :windowTime",
        ExpressionAttributeNames: {
          "#pKey": "ip",
          "#createAt":"createAt"
        },
        ExpressionAttributeValues: {
            ":pKey": ip,
            ":windowTime": startTime
        },
        //Limit: pageSize,
        ScanIndexForward: false
    }
    
    return await ddb.query(params).promise();
    
}

async function queryItems (tableName, ip, windowTime) {
    let params = {
        TableName : tableName,
        KeyConditionExpression: "#pKey = :pKey and #createAt >= :windowTime",
        ExpressionAttributeNames: {
          "#pKey": "ip",
          "#createAt":"createAt"
        },
        ExpressionAttributeValues: {
            ":pKey": ip,
            ":windowTime": windowTime
        },
        //Limit: pageSize,
        ScanIndexForward: true
    }
    
    return await ddb.query(params).promise();
    
}

function getStatus(response){
    return response.status;
}

function countDataInWindow(data, windowStart, windowSize) {
    const dataInWindow = data.filter(item => item.createAt >= windowStart && item.createAt <= (windowStart + windowSize));
    
    return dataInWindow.length;
}


exports.handler =  async function (event, context, callback) {

    const request = event.Records[0].cf.request;
    const response = event.Records[0].cf.response;
    let LimitRate = Number(GLOBAL_RATE);
    if (isCountedCode(response)) {
        let code = getStatus(response);
        await createItem(TABLE_NAME, accessLogFactory(request, code))
        ipUrlCount = await queryItems(TABLE_NAME, getIp(request), (Date.now() - WINDOW_PERIOD_IN_SECONDS)); // query 2 min
        if(ipUrlCount.Count == null || (ipUrlCount.Count >= LimitRate)){ // rate  5query / 2min
            await createIps(IP_TABLE_NAME,getIp(request));
        }else if( ipUrlCount.Count == null && ipUrlCount.Item.length > 0  ) {
            console.log("TODO: sliding windows invoke function: countDataInWindow");
        }
    }

    callback(null, response);
    return;

}

