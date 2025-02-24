import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import * as lambda from 'aws-cdk-lib/aws-lambda-event-sources'
import * as logs from 'aws-cdk-lib/aws-logs'

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const meetingsBucket = new s3.Bucket(this, 'meetmind-meetings-bucket', {
      bucketName: 'meetmind-meetings',
    })

    const meetingsQueue = new sqs.Queue(this, 'meetmind-meetings-queue', {
      queueName: 'meetmind-meetings-queue',
    })

    meetingsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(meetingsQueue)
    )

    const workerFunction = new DockerImageFunction(this, 'meetmind-worker', {
      code: DockerImageCode.fromImageAsset(path.join(__dirname, '../..'), {
        file: 'apps/worker/Dockerfile',
        exclude: ['node_modules', 'dist', '**/cdk.out'],
      }),
      functionName: 'meetmind-worker',
      environment: {
        GROQ_API_KEY: process.env.GROQ_API_KEY!,
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL!,
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN!,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY!,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    })

    workerFunction.addEventSource(new lambda.SqsEventSource(meetingsQueue))

    meetingsQueue.grantConsumeMessages(workerFunction)
    meetingsBucket.grantRead(workerFunction)
  }
}
