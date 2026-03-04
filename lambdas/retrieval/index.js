const { DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand} = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;

const client  = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        const results = await docClient.send(
            new QueryCommand({
                TableName:TABLE_NAME,
                KeyConditionExpression: "#pk = :pkval",
                ExpressionAttributeNames: {
                    "#pk" : "pk",
                },
                ExpressionAttributeValues: {
                    ":pkval": "TOP_MOVER",
                },
                ScanIndexForward: false,  // descending by data
                Limit: 7, // grabs 7 records
            })
        );

        const items = results.Items || [];

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({data: items}),
        };
    } catch (error) {
        console.error("Retrieval error: ", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
                message: "Failed to retrieve top movers",
                error: error.message,
            }),
        };
    }
};