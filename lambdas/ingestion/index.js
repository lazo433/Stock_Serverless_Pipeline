const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;
// const STOCK_API_KEY = process.env.STOCK_API_KEY;
const STOCK_API_KEY = 'DywvFQC6wuHGutC_gfEgPwQhHTkp7xlp';
const stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];

const savedResults = [{"status":"OK","from":"2026-02-26","symbol":"AAPL","open":274.945,"high":276.11,"low":270.795,"close":272.95,"volume":32345114.765942,"afterHours":271.7,"preMarket":273.46},{"status":"OK","from":"2026-02-26","symbol":"MSFT","open":404.71,"high":407.49,"low":398.74,"close":401.72,"volume":34405869.720193,"afterHours":397.193,"preMarket":400},{"status":"OK","from":"2026-02-26","symbol":"GOOGL","open":312.64,"high":313.14,"low":302.345,"close":307.38,"volume":36431231.916257,"afterHours":307.25,"preMarket":312.18},{"status":"OK","from":"2026-02-26","symbol":"AMZN","open":210.73,"high":211.05,"low":205.345,"close":207.92,"volume":47756765.609998,"afterHours":206.55,"preMarket":210},{"status":"OK","from":"2026-02-26","symbol":"TSLA","open":414.42,"high":416.81,"low":403.66,"close":408.58,"volume":53602497.658486,"afterHours":406.7,"preMarket":415.05},{"status":"OK","from":"2026-02-26","symbol":"NVDA","open":194.27,"high":194.29,"low":184.315,"close":184.89,"volume":360807907.423002,"afterHours":185,"preMarket":197.6}];

exports.handler = async (event) => {

    try {

        // Handle weekends and holidays
        const day = new Date().getDay();
        if( day === 0 || day === 6) {
            console.log("Weekend - No valid market data returned for this date.");
            return {statusCode: 200, body: "Weekend - no market data" };
        }
        //const isoDate = new Date().toISOString().slice(0,10);
        const isoDate = "2026-02-27"; // for testing. Free version doesn't allow today's data in real time
        //console.log(isoDate);

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

        // Build the DynamoDB item
        const item = {
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