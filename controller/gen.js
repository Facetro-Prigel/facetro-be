const utils = require('../helper/utils');
const axios = require('axios')
module.exports = {
    embeding: async (req, res) => {
        let body = req.body
        let image = body.image;
        if ((Object.keys(body).length == 1) && (image != undefined)) {
            const config_u = { headers: { "Content-Type": "application/json" } };
            try {
                const { data } = await axios.post(`${process.env.ML_URL}gen`, { image }, config_u);
                return utils.createResponse(res, 200, "Success", "Embedding berhasil dibuat!", "/gen", data.data[0].signatureData);
            } catch (mlError) {
                console.error("ML Build Error:", mlError.message || mlError);
                return utils.createResponse(
                    res,
                    400,
                    "Bad Request",
                    "Tidak ada atau terdapat banyak wajah!",
                    "/gen"
                );
            }
            
        }
    }
}