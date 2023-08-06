# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## 使用命令
```
cdk deploy --parameters cfDistId=E36TELAKGOJXZN --parameters rateLimit=30 --parameters urlRateLimit=20 --parameters urlList='/foo,/bar,/bar/1' --parameters ipSetNumber=5   
```
### 参数说明：
```
cdk deploy --parameters cfDistId=<distribution id> --parameters rateLimit=<总限速速率，每分钟> --parameters urlRateLimit=<url限速速率> --parameters urlList=<URL list> --parameters ipSetNumber=<ipsets 数量> 
```

## 问题
- cdk 不能使用循环，ipsets数量不能控制。
- 删除stack时，lambda@edge function 失败。