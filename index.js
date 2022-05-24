let express = require('express');
let app = express();
let cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');

const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

const host = process.env.host;
const port = process.env.port;
const username = process.env.username;
const password = process.env.password;

const appPort = 3000;

const maxPrice = process.env.max;
const minPrice = process.env.min;

const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true';


const transport = nodemailer.createTransport({
    host: host,
    port: port,
    auth: {
        user: username,
        pass: password
    }
});

let isTableCreated = false;

const Price = sequelize.define('Price', {
    coinName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: false
    },
    value: {
        type: DataTypes.DOUBLE,
        defaultValue: 0.0
    },
    priceTime: {
        type: DataTypes.TIME,
        allowNull: false
    },
    priceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
}, {
    freezeTableName: true
}
);


app.get('/api/prices/btc', async function (req, res) {
    if (!isTableCreated) {
        await Price.sync();
    }
    const date = new Date(req.query.date);
    const offSet = parseInt(req.query.offset);
    const limit = parseInt(req.query.limit);
    const count = await Price.count({
        where: {
            priceDate: date
        }
    }).catch(err => {
        console.error(err);
        return 0;
    });
    const priceResponse = await Price.findAll({
        where: {
            priceDate: date
        },
        offset: offSet,
        limit: limit
    }).catch(err => {
        console.error(err);
        return [];
    });
    let dataResponse = priceResponse.map(p => {
        return {
            "timestamp": p.get().priceTime,
            "price": p.get().value,
            "coin": getCoinName(p.get().coinName)
        }
    });


    let currentUrl = req.protocol + '://' + req.get('host') + req.originalUrl;;
    let finalResonpse = {
        "url": currentUrl,
        "count": count,
        "data": dataResponse
    };

    let newOffset = offSet + limit;
    if (newOffset >= count) {
        newOffset = -1;
    }


    if (newOffset > 0) {
        let url = new URL(currentUrl);
        url.searchParams.set('offset', newOffset);
        let newUrl = url.toString();
        finalResonpse.next = newUrl;
    }
    res.send(finalResonpse);
});

function getCoinName(coinName) {

    switch (coinName) {
        case "Bitcoin":
            return "btc";
        default:
            return "NO_COIN_FOUND"
    };
}


cron.schedule("0/30 * * * * *", async () => {
    if (!isTableCreated) {
        await Price.sync();
    }
    const resp = await getCoinData();
    const price = resp.value;
    if (price > maxPrice) {
        let priceString = `CurrentPrice:${price}, maxPrice:${maxPrice}`
        await sendEmail('smit.thakkar1@gmail.com', 'thefellowcoder@gmail.com',
            'Price greater than maxPrice', priceString, `<p>${priceString}<p>`);
    }
    else if (price < minPrice) {
        let priceString = `CurrentPrice:${price}, minPrice:${maxPrice}`
        await sendEmail('smit.thakkar1@gmail.com', 'thefellowcoder@gmail.com',
            'Price less than minPrice', priceString, `<p>${priceString}<p>`);
    }

});

async function sendEmail(to, from, subject, text, html) {
    let info = await transport.sendMail({
        from: from, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: text, // plain text body
        html: html, // html body
    });
}



async function getCoinData() {

    const resp = await axios.get(API_URL).then(data => {
        return data.data;
    }).
        catch(err => { console.error(err) });
    let date = new Date(0);
    date.setUTCSeconds(resp.bitcoin.last_updated_at);
    const x = {
        'coinName': 'Bitcoin', 'currency': 'usd',
        'value': resp.bitcoin.usd,
        'priceTime': resp.bitcoin.last_updated_at,
        'priceDate': date
    };
    await Price.create(x).catch(err => {
        console.error(err);
    });

    return x;

}

app.listen(appPort);
