import express from "express"
import axios from "axios"
import Appointment from "../models/Appointment.js"

const router = express.Router()

/*
--------------------------------
1️⃣ INITIATE KHALTI PAYMENT
--------------------------------
*/

router.post("/khalti/initiate", async (req, res) => {

try{

const { appointmentId, amount } = req.body

const payload = {
return_url: process.env.KHALTI_RETURN_URL,
website_url: process.env.WEBSITE_URL,
amount: amount * 100, // Khalti uses paisa
purchase_order_id: appointmentId,
purchase_order_name: "Doctor Appointment"
}

const response = await axios.post(
"https://dev.khalti.com/api/v2/epayment/initiate/",
payload,
{
headers:{
Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
"Content-Type": "application/json"
}
}
)

res.json({
success:true,
payment_url: response.data.payment_url
})

}catch(error){

console.log(error)

res.json({
success:false,
message:"Khalti payment initiation failed"
})

}

})

/*
--------------------------------
2️⃣ KHALTI CALLBACK
--------------------------------
*/

router.get("/khalti/callback", async (req, res) => {

try{

const { pidx, purchase_order_id } = req.query

const lookupResponse = await axios.post(
"https://dev.khalti.com/api/v2/epayment/lookup/",
{ pidx },
{
headers:{
Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
"Content-Type":"application/json"
}
}
)

if(lookupResponse.data.status === "Completed"){

await Appointment.findByIdAndUpdate(
purchase_order_id,
{ paymentStatus: "paid" }
)

return res.send("Payment Successful. Appointment Confirmed.")

}else{

return res.send("Payment Failed or Cancelled")

}

}catch(error){

console.log(error)

res.send("Payment Verification Failed")

}

})

export default router