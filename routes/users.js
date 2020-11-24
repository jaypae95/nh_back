const express = require('express');
const router = express.Router();
const {User} = require('../models');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const responseJson = {};

const CODE = {
    'SUCCESS': 0,
    'NO_USER': 1,
    'INCORRECT_PASSWORD': 2,
    'USERNAME_ALREADY_EXIST': 3,
    'USERNAME_INVALID': 4,
    'PHONE_NUMBER_ALREADY_EXIST': 5,
    'PHONE_NUMBER_INVALID': 6,
    'NAME_INVALID': 7,
    'UNKNOWN_ERROR': 8,
};

function phoneNumberCheck(phone) {
    const regExp = /(01[016789])([1-9]{1}[0-9]{2,3})([0-9]{4})$/;
    if(!regExp.test(phone)) {
        return false;
    }
    return true;
}

/* GET users listing. */
// 회원인지 확인하고 문자 아니면 알림 보낼때 사용
router.get('/overlap/phone', async function(req, res, next) {
    const result = await User.findOne(
        {where: {phone_number: req.query.phone_number}},
    );

    if(!phoneNumberCheck(req.query.phone_number)) {
        responseJson.result = CODE.PHONE_NUMBER_INVALID;
        responseJson.detail = 'phone number invalid';
    } else if(result == null) {
        responseJson.result = CODE.SUCCESS;
        responseJson.detail = 'no exist';
    } else {
        responseJson.result = CODE.PHONE_NUMBER_ALREADY_EXIST;
        responseJson.detail = 'phone number already exist';
    }
    res.json(responseJson);
});

router.get('/overlap/username', async function(req, res, next) {
    const result = await User.findOne({where: {username: req.query.username}});

    if(result == null) {
        responseJson.result = CODE.SUCCESS;
        responseJson.detail = 'no exist';
    } else {
        responseJson.result = CODE.USERNAME_ALREADY_EXIST;
        responseJson.detail = 'username already exist';
    }
    res.json(responseJson);
});
//signup
router.post('/signup', async function(req, res, next) {
    try {
        if(phoneNumberCheck(req.body.phone_number)) {
            console.log(req.body.password);
            const result = await User.create({
                username: req.body.username,
                password: bcrypt.hashSync(req.body.password, saltRounds),
                name: req.body.name,
                phone_number: req.body.phone_number,
            });
            responseJson.result = CODE.SUCCESS;
            responseJson.detail = 'signup success';
        } else {
            responseJson.result = CODE.PHONE_NUMBER_INVALID;
            responseJson.detail = 'phone number invalid';
        }
    } catch(exception) {
        responseJson.result = CODE.UNKNOWN_ERROR;
        responseJson.detail = exception.errors[0].message;
    } finally {
        res.json(responseJson);
    }
});

module.exports = router;
