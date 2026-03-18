const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.callDriver = async (req,res)=>{

  try{

    const { userPhone, driverPhone } = req.body;

    const call = await client.calls.create({

      to: driverPhone,
      from: process.env.TWILIO_PHONE_NUMBER,

      twiml: `<Response>
                <Dial>${userPhone}</Dial>
              </Response>`

    });

    res.json({
      success:true,
      callSid:call.sid
    });

  }catch(err){

    console.error("CALL ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Call failed"
    });

  }

};