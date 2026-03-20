const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;
const STOCK_API_KEY = process.env.STOCK_API_KEY;
const stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];

exports.handler = async (event) => {

    try {
        // Handle weekends and holidays
 
        const overrideDate = event && event.overrideDate;
        const isoDate = overrideDate || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        //const isoDate = "2026-02-26"; // for testing. Free version doesn't allow today's data in real time

        const day = new Date(isoDate).getUTCDay();
        if( day === 0 || day === 6) {
            console.log("Weekend - No valid market data returned for this date.");
            return {statusCode: 200, body: "Weekend - no market data" };
        }

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        // fetches the open-close json for each of the stocks in batches due to free version having a 5 api call/min limit
        const batchSize = 3;
        const results = [];
        for(let i = 0; i < stocks.length; i += batchSize) {
            const batch = stocks.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (stock) => {
                    const url = `https://api.massive.com/v1/open-close/${stock}/${isoDate}?adjusted=true&apiKey=${STOCK_API_KEY}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    return data;
                })
            );
            results.push(...batchResults);
            if (i + batchSize < stocks.length) await sleep(60000); // limit of 5api calls/min
        }

        //console.log(JSON.stringify(results));
        console.log(results)

        // Check if date is a holiday
        const validResults = results.filter(stock => stock.status === "OK");
        if (validResults.length === 0) {
            console.log("No valid market data returned for this date.");
            return {statusCode: 200, body: "Weekend - no market data" };
        }

        // Calculating the & change
        const percentChangeStocks = [];
        results.forEach(stock => {
            const formula = (stock.close - stock.open) / stock.open;
            var percentChange = parseFloat((formula * 100).toFixed(2));
            percentChangeStocks.push({
                symbol: stock.symbol,
                percentageChange: percentChange,
                open: stock.open,
                close: stock.close
            });
        });

        let topMover = {symbol: "", percentageChange: 0, open: 0, close: 0};
        percentChangeStocks.forEach(stock => {
            const currPercent = Math.abs(stock.percentageChange);
            if (currPercent > Math.abs(topMover.percentageChange)) {
                topMover = stock;
            }
        });
        const direction = topMover.percentageChange > 0 ? "up" : "down";

        //Build the DynamoDB item
        const item = {
            pk: "TOP_MOVER",
            date: isoDate,
            symbol: topMover.symbol,
            open: topMover.open,
            close: topMover.close,
            percentChange: topMover.percentageChange,
            direction: direction
        };

        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        }));
        console.log(item)

        return {statusCode: 200, body: "Success"};
    } catch (error) {
        console.error("Error: ", error);
        return {statusCode: 500, body: JSON.stringify({message: error.message}) };
    }
    
};
//exports.handler();