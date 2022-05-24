Updating .env file

```
host=smtp.mailtrap.io
port=<port>
username=<username>
password=<password>
max=<maxPrice>
min=<minPrice>
```

Running the application

```
docker-compose up
```

Endpoint exposed

```
http://localhost:3000/api/prices/btc?date=2022-05-24&offset=0&limit=1

```

Response

```
{
    "url": "http://localhost:3000/api/prices/btc?date=2022-05-24&offset=0&limit=1",
    "count": 2,
    "data": [
        {
            "timestamp": 1653374852,
            "price": 29297,
            "coin": "btc"
        }
    ],
    "next": "http://localhost:3000/api/prices/btc?date=2022-05-24&offset=1&limit=1"
}

```
