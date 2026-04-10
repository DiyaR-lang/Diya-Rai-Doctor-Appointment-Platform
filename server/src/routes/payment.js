import express from "express"
import axios from "axios"
import Appointment from "../models/Appointment.js"
import Doctor from "../models/Doctor.js"

const router = express.Router()

/*
--------------------------------
1️⃣ INITIATE KHALTI PAYMENT
--------------------------------
*/
router.post("/khalti/initiate", async (req, res) => {
  try {
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
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    )

    res.json({
      success: true,
      payment_url: response.data.payment_url
    })

  } catch (error) {
    console.log(error)
    res.json({
      success: false,
      message: "Khalti payment initiation failed"
    })
  }
})

/*
--------------------------------
2️⃣ KHALTI CALLBACK & SLOT LOCKING
--------------------------------
*/
router.get("/khalti/callback", async (req, res) => {
  try {
    const { pidx, purchase_order_id } = req.query

    const lookupResponse = await axios.post(
      "https://dev.khalti.com/api/v2/epayment/lookup/",
      { pidx },
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    )

    if (lookupResponse.data.status === "Completed") {
      // 1. Update Appointment Status to Paid
      const appointment = await Appointment.findByIdAndUpdate(
        purchase_order_id,
        { paymentStatus: "paid", status: "scheduled" },
        { new: true }
      )

      if (appointment) {
        // 2. LOCK THE DOCTOR'S SLOT (Logic for Step 3 UI)
        const doctor = await Doctor.findById(appointment.doctorId)
        
        if (doctor) {
          // Find the specific date row
          const day = doctor.availability.find(a => a.date === appointment.date)
          if (day) {
            // Find the specific time slot and mark as booked
            const slot = day.slots.find(s => s.time === appointment.time)
            if (slot) {
              slot.isBooked = true
              slot.bookedBy = appointment.patientId
              await doctor.save()

              // 3. EMIT REAL-TIME UPDATE (Gray out button for others)
              const io = req.app.get("socketio")
              if (io) {
                io.emit("slot_booked", { 
                  doctorId: doctor._id, 
                  date: appointment.date, 
                  time: appointment.time 
                })
              }
            }
          }
        }
      }

      return res.send("<h1>Payment Successful. Your appointment is confirmed!</h1>")

    } else {
      return res.send("<h1>Payment Failed or Cancelled</h1>")
    }

  } catch (error) {
    console.log(error)
    res.send("<h1>Payment Verification Failed</h1>")
  }
})

export default router