module.exports = {
  server: {
    port: 3000,
    entrypoint: `https://api.boogoogoo.com`
  },
  appId: 'wxf59749a45686779c',
  appSecret: '2553af7112c7911bc3bea91da887dc8c',
  mch: {
    mchId: '1560901281',
    key: 'MfXPmTHK0F9fFzcsDcfsa5mR8wBCl0Yt',
    payNotifyUrl: 'https://api.boogoogoo.com/orders/wechat/pay_callback',
    refundNotifyUrl: 'https://api.boogoogoo.com/orders/wechat/refund_callback'
  },
  logDir: '/data/log/jbs-server',
  dbUri: 'mongodb://admin:12wed98uh56yhbv@49.234.63.40:27017,49.234.63.40:27018,49.234.63.40:27019/jbs?replicaSet=rs0&maxPoolSize=512&authSource=admin',
  jwt: {
    issuer: 'ademes',
    secret: 'JARF2YXNTA46ZH8F4Q2TBFHWE8DSDJCXAMGQTSSMWZKSPWC8FMWSL9YXU5PELUFN',
    duration: 2592000
  },
  query: {
    offset: 0,
    limit: 10
  },
  qiniu: {
    bucket: 'jbs-server',
    accessKey: 'tVQXlS0ahil12znZM0RcwSDehAzJfUhs4lmjSoNC',
    secretKey: 'Ebwd-HQi_HPQuJD7yK62ooZUVxG3aVI80g73NCBF',
    event: {
      qrcodeKeyPrefix: 'static/images/events/qrcode-dev',
      callbackUrl: 'https://api.boogoogoo.com/notifications/qrcode-upload-callback'
    }
  },
  sms: {
    templates: {},
    enabled: true,
    spCode: '1470',
    loginName: 'dyfhpy',
    password: '123456'
  }
};
