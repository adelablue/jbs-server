module.exports = {
  server: {
    port: 3000,
    entrypoint: `https://api.boogoogoo.com`
  },
  appId: 'wxf59749a45686779c',
  appSecret: '2553af7112c7911bc3bea91da887dc8c',
  logDir: '/data/log/jbs-server',
  dbUri: 'mongodb://mongo0:27017,mongo1:27017,mongo2:27017/jbs?replicaSet=rs0&slaveOk=true',
  jwt: {
    issuer: 'ademes',
    secret: 'JARF2YXNTA46ZH8F4Q2TBFHWE8DSDJCXAMGQTSSMWZKSPWC8FMWSL9YXU5PELUFN',
    duration: 7200
  },
  query: {
    offset: 0,
    limit: 10
  },
  qiniu: {
    bucket: 'jbs-server',
    accessKey: 'tVQXlS0ahil12znZM0RcwSDehAzJfUhs4lmjSoNC',
    secretKey: 'Ebwd-HQi_HPQuJD7yK62ooZUVxG3aVI80g73NCBF'
  },
  sms: {
    templates: {},
    enabled: false,
    spCode: '1470',
    loginName: 'dyfhpy',
    password: '123456'
  }
};
