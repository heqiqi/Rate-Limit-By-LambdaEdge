# Rate-Limit-By-LambdaEdge

利用Lambda@edge + cloudfront + waf做请求速率控制，保护源站。

## 初始化aws cdk

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## 方案架构
![image](https://github.com/heqiqi/Rate-Limit-By-LambdaEdge/blob/main/images/rate-arch.png)

## 使用命令
```
cdk deploy --parameters cfDistId=ERPF1QJKIU7F3 --parameters rateLimit=10 --parameters urlRateLimit=5 --parameters urlList='/foo,/bar,/bar/1' --context ddbregions=us-west-2,ap-southeast-1,eu-central-1  RateLimitCfStack --profile useast1 
```
### 参数说明
```
cdk deploy --parameters cfDistId=<distribution id> --parameters rateLimit=<总限速速率，每分钟> --parameters urlRateLimit=<url限速速率> --parameters urlList=<URL list> --context ddbregions=<region1>,<region2>,<region3>  RateLimitCfStack  --profile <profile>
```

## 修改点
- 将ipset个数设定为10个。
- 默认部署区域设为us-east-1。
- 增加ddbregions，选择在哪些区域开启Dynamodb global table。
- custom resource 增加 onDelete操作，但是由于cloudfront deploy 耗时较长，所以 delete stacks时还是失败。
