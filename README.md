# Rate-Limit-By-LambdaEdge

利用Lambda@edge + cloudfront + waf做请求速率控制，保护源站。

## 方案架构
![image](https://github.com/heqiqi/Rate-Limit-By-LambdaEdge/blob/main/images/rate-arch.png)

## 使用命令
```
git clone https://github.com/heqiqi/Rate-Limit-By-LambdaEdge -b origin_response
cd Rate-Limit-By-LambdaEdge
npm install
cdk bootstrap
cdk deploy --parameters cfDistId=E10T6860ZLOY54 --parameters rateLimit=10 --parameters codeList='400,401,402,403,404,405,406,407,408,409,410,429,500,501,502' --context ddbregions=ap-southeast-1,eu-central-1  RateLimitCfStack --profile default 
```
### 参数说明
```
cdk deploy --parameters cfDistId=<distribution id> --parameters rateLimit=<总限速速率，每2分钟>  --parameters codeList=<status code list> --context ddbregions=<region1>,<region2>,<region3>  RateLimitCfStack  --profile <profile>
```

