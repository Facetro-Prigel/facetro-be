
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
module.exports = {
generateString: (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
},
generatePassword: async (password, round=14) => {
  const salt = await bcrypt.genSalt(round);
  return await bcrypt.hash(password, salt);
},
generateZero: (number)=>{
  return number < 10 ? "0"+number : number;
},
generateAccessToken: (username, secretToken = process.env.SECRET_TOKEN) =>{
  return jwt.sign(username, secretToken, { expiresIn: '31d' });
 }
}