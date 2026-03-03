import os
from socket import timeout
from aws_cdk import (
    Stack,
    Duration,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
    RemovalPolicy,
    aws_events as events,
    aws_events_targets as targets,
    aws_apigateway as apigw
)
from constructs import Construct

class StockPipelineStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # defin the table
        table = dynamodb.Table(
            self, "TopMoversTable",
            table_name="TopMovers",
            partition_key=dynamodb.Attribute(
                name="date",
                type=dynamodb.AttributeType.STRING
            ),
            removal_policy=RemovalPolicy.DESTROY #for dev.demo
        )

        # define ingestion lambda
        ingestion_fn = _lambda.Function(
            self, "IngestionFunction",
            runtime=_lambda.Runtime.NODEJS_22_X,
            handler="index.handler",
            code=_lambda.Code.from_asset("../lambdas/ingestion"),
            environment={
                "TABLE_NAME": table.table_name,
                "STOCK_API_KEY": os.environ.get("STOCK_API_KEY", "")
            },
            timeout=Duration.seconds(120)
        )

        # grant lamda access to write into dynamoDB
        table.grant_write_data(ingestion_fn)

        # define the eventbridge cron rule
        rule = events.Rule(
            self,"DailyStockRule",
            schedule=events.Schedule.cron(
                hour="5",
                minute="1"
            )
        )
        rule.add_target(targets.LambdaFunction(ingestion_fn))

        # define the retrieval lambda + api gateway
        retrieval_fn = _lambda.Function(
            self,"RetrievalFunction",
            runtime=_lambda.Runtime.NODEJS_22_X,
            handler="index.handler",
            code=_lambda.Code.from_asset("../lambdas/retrieval"),
            environment={
                "TABLE_NAME": table.table_name
            }
        )
        table.grant_read_data(retrieval_fn)
        api = apigw.RestApi(self, "StockApi",
            rest_api_name="StockMoversAPI",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS
            )
        )

        movers=api.root.add_resource("movers")
        movers.add_method("GET", apigw.LambdaIntegration(retrieval_fn))


 


