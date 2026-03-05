# Stock Serverless Pipeline

A serverless AWS pipeline that tracks a specific "Watchlist" of tech stocks and for each day, it return a single stock from our list that moved the most (highest % change), up or down. 

## Architechture

    (deployed via CDK)

    EventBridge (daily cron 05:01 UTC)
    |
    |
    Ingestion Lambda (Node.js)
    |_ Feches open/close data from the Massive.com for the
    |  list of 6 sotcks
    |
    |_ Calculates top mover by largest percent change
    |
    |_ Writes the record to DynamDB
    |
    |
    DynamoDB Tablel TopMovers
    |
    |
    Retrival Lambda (Node.js)
    |_ Using the sort key, grabs the 7 most recent dates and
    |  returns as the data as a JSON object
    |
    API Gateway REST API
    |_ Allows the frontend to retrieve data point using endpoint GET/movers

---
## Prerequisites

- [AWS CLI] (https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured (`aws configure`)
- Python 3.10+
- Node.js 18+
- A [Massive](https://massive.com/) API key

---
## Deploying the Backend (CDK)

### 1. Set your API key

Create a `.env` file in the project root:
Stock_API_KEY=your_api_key

### 2. Set up the Python virtual enviornment
    cd cdk
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

### 3. Bootstrap CDK (first time only)
    cdk bootstrap

### 4. Sythnesize and deploy
    cdk synth
    cdk deploy

After a successful deploy, the CDK will output the API Gateway URL

    Outputs: 
    StockPipelineStack.StockApiEndpoint... = https://{id}.execute-api.{region}.amazonaws.com/prod/

This url will be used for the frontend

---

## Running the Frontend

### 1. Configure the API URL
create `frontend/.env`:

    from the root:

    mkdir frontend
    touch .env
then add the API URL:

    VITE_API_BASE_URL=https://<id>.execute-api.<region>.amazonaws.com/prod

### 2. Install dependencies and start

    cd frontend
    npm install
    npm run dev

--- 

### Deleting all AWS resources
    cd cdk
    cdk destory

### How the Ingestion Works

The ingestion Lambda runs daily at 05:01 UTC (after US market close). It:

1. Skips weekends and holidays (no valid data).

2. Fetches the previous day's open/close prices from Massive.com in batches of 3 (due to the free-tier rate limit of 5 calls/min).

3. Calculates the percentage change (close - open) / open for each stock.

4. Picks the stock with the largest absolute % change as the "top mover".

5. Writes the result to DynamoDB with pk = "TOP_MOVER" and date = YYYY-MM-DD.
The retrieval Lambda queries DynamoDB for the 7 most recent records, sorted descending by date.