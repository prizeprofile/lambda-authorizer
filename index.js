const AWS = require('aws-sdk')
const ddb = new AWS.DynamoDB()

exports.handler = ({ authorizationToken, methodArn }, _, callback) => {
  const [ id, token ] = authorizationToken.replace('Bearer ', '').split(',')

  const item = {
    TableName: process.env.DDB_TABLE,
    Key: { user_id: { S: id } },
    ProjectionExpression: 'pp_token, access_token, access_token_secret'
  };

  return new Promise((resolve, reject) => {
    ddb.getItem(item, (err, d) => {
      console.log(err, d)

      return err || ! d || ! d.Item || ! d.Item.pp_token || d.Item.pp_token.S !== token
        ? reject()
        : resolve ({
          access_token: d.Item.access_token.S,
          access_token_secret: d.Item.access_token_secret.S
        })
    })
  })
    .then(context => callback(null, {
      principalId: id,
      context,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: methodArn
          }
        ]
      }
    }))
    .catch(() => callback('Unauthorized'))
}
