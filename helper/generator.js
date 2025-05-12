
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');

require('dotenv').config();

module.exports = {
generateString: (length, symbol=false, upperCase=true, lowerCase=true, number=true) => {
    let result = '';
    var characters = '';
    if(upperCase){
      characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    if(lowerCase){
      characters += 'abcdefghijklmnopqrstuvwxyz'
    }
    if(number){
      characters += '0123456789';
    }
    if(symbol){
      characters += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
},
generatePassword: async (password, round=12) => {
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
