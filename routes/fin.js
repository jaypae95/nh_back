const express = require('express');
const router = express.Router();
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '..', 'config', 'config.json'))[env];
const moment = require('moment');
const axios = require('axios');

const {User, Event, BreakDown} = require('../models');
const util = require('../utils');
const code = util.code;


createBodyHeader = function(apiNm, userId) {
    const time = moment().format('YYYYMMDD-HHmmss');
    const tsymd = time.substring(0, 8);
    const trtm = time.substring(9, 15);
    const ut = Math.floor(new Date().getTime() / 1000);
    const isTuno = ut + userId.toString();

    const postBodyHeader = {
        'Iscd': config.iscd,
        'FintechApsno': '001', // 테스트용 고정
        'ApiSvcCd': 'DrawingTransferA', // 테스트용 고정
        'AccessToken': config.accessToken,
    };

    postBodyHeader.ApiNm = apiNm; // API 명
    postBodyHeader.Tsymd= tsymd; // 전송일자
    postBodyHeader.Trtm =trtm; // 전송시각
    postBodyHeader.IsTuno=isTuno; // 기관거래고유번호
    return postBodyHeader;
};

getNHURL = function(apiNm) {
    return 'https://developers.nonghyup.com/' + apiNm + '.nh';
};

// NH API OpenFinAccountDirect
router.post('/', async function(req, res, next) {
    const responseJson= {};
    try {
        const userId = res.locals.user.id;
        const apiNm = 'OpenFinAccountDirect';
        const body= {
            'DrtrRgyn': 'Y',
            'BrdtBrno': config.BrdtBrno,
            'Bncd': req.body.bncd,
            'Acno': req.body.acno,
        };
        body.Header= createBodyHeader(apiNm, userId);
        const result = await axios.post(getNHURL(apiNm), body);
        if(result.data.Header.Rpcd !== '00000') {
            responseJson.result = code.NH_API_ERROR;
            responseJson.detail = result.data.Header.Rsms;
            res.json(responseJson);
        }
        else {
            res.locals.Rgno=result.data.Rgno;
            next();
        }
    }
    catch (error) {
        responseJson.result = code.NH_API_ERROR;
        responseJson.detail = 'nh api( OpenFinAccountDirect ) error';
        res.json(responseJson);
    }
});
// NH API CheckOpenFinAccountDirect
router.post('/', async function(req, res, next) {
    const responseJson= {};
    try {
        const userId = res.locals.user.id;
        const rgno = res.locals.Rgno;

        const apiNm = 'CheckOpenFinAccountDirect';
        const body = {
            'Rgno': rgno,
            'BrdtBrno': config.BrdtBrno, 
        };
        body.Header= createBodyHeader(apiNm, userId);
        const result = await axios.post(getNHURL(apiNm), body);
        if(result.data.Header.Rpcd !== '00000') {
            responseJson.result = code.NH_API_ERROR;
            responseJson.detail = reult.data.Header.Rsms;
            res.json(responseJson);
        }
        else {
            res.locals.FinAcno = result.data.FinAcno;
            next();
        }
    }
    catch (error) {
        responseJson.result = code.NH_API_ERROR;
        responseJson.detail = 'nh api (CheckOpenFinAccountDirect) error';
        next(error);
    }
});

// user table update
router.post('/', async function(req, res, next) {
    const responseJson= {};
    try {
        const userId = res.locals.user.id;
        const finAcno = res.locals.FinAcno;

        const result = await User.update(
            {
                fin_account: finAcno,
            },
            {
                where: {
                    id: userId,
                },
            });
        responseJson.result= code.SUCCESS;
        responseJson.detail= 'finaccount create success';
        res.json(responseJson);
    }
    catch (error) {
        responseJson.result = code.DB_ERROR;
        responseJson.detail = 'user table update error';
        res.json(responseJson);
        next(error);
    }
});


router.post('/transfer', async function(req, res, next) {
    const responseJson= {};
    const {event_hash} = req.body;
    try {
        // get event id from db
        const result = await Event.findOne(
            {attributes: ['id'], where: {event_hash: event_hash}},
        );

        if(result === null) {
            responseJson.result = code.NO_DATA;
            responseJson.detail = 'not valid event hash';
            res.json(responseJson);
            return;
        }
        res.locals.eventId = result.dataValues.id;
        // get finAcno
        const userId = res.locals.user.id;
        const result2 = await User.findOne(
            {attributes: ['fin_account'], where: {id: userId}},
        );

        if(result2 === null) {
            responseJson.result = code.NO_DATA;
            responseJson.detail = 'not register fin account';
            res.json(responseJson);
            return;
        }
        res.locals.finAccount = result2.dataValues.fin_account;
        next();        
    }
    catch (error) {
        responseJson.result = code.DB_ERROR;
        responseJson.detail = 'transfer DB find error';
        res.json(responseJson);
    }
});
// use nh api DrawingTransfer
router.post('/transfer', async function(req, res, next) {
    const responseJson= {};
    const {tram} = req.body;
    try {
        const userId = res.locals.user.id;
        const apiNm = 'DrawingTransfer';
        const body= {
            'FinAcno': res.locals.finAccount,
            'Tram': tram,
            'DractOtlt': '부조금 출금',
        };
        
        body.Header= createBodyHeader(apiNm, userId);        
        const result = await axios.post(getNHURL(apiNm), body);
        if(result.data.Header.Rpcd !== '00000') {
            responseJson.result = code.NH_API_ERROR;
            responseJson.detail = result.data.Header.Rsms;
            res.json(responseJson);
        }
        const time = result.data.Header.Tsymd + result.data.Header.Trtm;
        res.locals.transferTime = time.replace(
            /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
            '$1-$2-$3 $4:$5:$6');
        next();
    }
    catch (error) {
        responseJson.result = code.NH_API_ERROR;
        responseJson.detail = 'nh api( DrawingTransfer ) error';
        res.json(responseJson);
    }
});
// Breakdown db insert
router.post('/transfer', async function(req, res, next) {
    const responseJson= {};
    let {tram, message} = req.body;
    const userId = res.locals.user.id;
    const transferTime= res.locals.transferTime;
    const eventId = res.locals.eventId;
    // message error avoid
    if(message.length > 45) {
        message = message.substring(0, 45);
    }
    const data = {
        event_id: eventId,
        sender_id: userId,
        transfer_datetime: transferTime,
        message: message,
        money: tram,
        is_direct_input: false,
    };

    try {
        const result = await BreakDown.create(data);
        responseJson.result = code.SUCCESS;
        responseJson.detail = 'transfer success';
        res.json(responseJson);
    }
    catch (error) {
        responseJson.result = code.DB_ERROR;
        responseJson.detail = 'transfer db insert error';
        responseJson.data = data;
        res.json(responseJson);
    }
});
module.exports = router;