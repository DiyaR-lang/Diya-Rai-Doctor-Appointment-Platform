// import React, { useEffect, useState, useRef } from "react";
// import axios from "axios";
// import { io } from "socket.io-client";

// // Added 'currentUserId' so the component knows who is sending the message
// const Chat = ({ patientId, doctorId, currentUserId }) => {
//   const [socket, setSocket] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const scrollRef = useRef();

//   // 1. Initialize socket once
//   useEffect(() => {
//     const newSocket = io("http://localhost:5000", { transports: ["websocket"] });
//     setSocket(newSocket);

//     return () => newSocket.disconnect();
//   }, []);

//   // 2. Fetch history
//   useEffect(() => {
//     const fetchMessages = async () => {
//       try {
//         const res = await axios.get(
//           `http://localhost:5000/api/messages/${patientId}/${doctorId}`
//         );
//         setMessages(res.data);
//       } catch (err) {
//         console.error("Error fetching history:", err);
//       }
//     };
//     fetchMessages();
//   }, [patientId, doctorId]);

//   // 3. Join room & Listen
//   useEffect(() => {
//     if (!socket) return;

//     // IMPORTANT: Match server keys (senderId/receiverId)
//     socket.emit("join_room", { senderId: patientId, receiverId: doctorId });

//     const handleMessage = (msg) => {
//       setMessages((prev) => [...prev, msg]);
//     };

//     socket.on("receive_message", handleMessage);

//     return () => {
//       socket.off("receive_message", handleMessage);
//     };
//   }, [socket, patientId, doctorId]);

//   // Auto-scroll to bottom when new messages arrive
//   useEffect(() => {
//     scrollRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // 4. Send Message
//   const handleSend = () => {
//     if (!input.trim() || !socket) return;

//     // Determine receiver
//     const receiverId = currentUserId === patientId ? doctorId : patientId;

//     const messageData = {
//       senderId: currentUserId,
//       receiverId: receiverId,
//       message: input,
//     };

//     // Emit to server
//     socket.emit("send_message", messageData);
    
//     // Optimistic update (show message immediately)
//     // Note: If your server emits back to the sender, you might get duplicates. 
//     // If so, remove the line below.
//     // setMessages((prev) => [...prev, { ...messageData, _id: Date.now() }]);

//     setInput("");
//   };

//   return (
//     <div className="flex flex-col h-full border rounded-lg bg-white shadow-sm">
//       <div className="p-3 border-b bg-gray-50 font-bold text-gray-700">
//         Chat Session
//       </div>
      
//       <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[400px]">
//         {messages.map((msg, index) => (
//           <div
//             key={msg._id || index}
//             className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
//           >
//             <div
//               className={`max-w-[80%] p-2 rounded-lg text-sm ${
//                 msg.senderId === currentUserId
//                   ? "bg-blue-600 text-white rounded-br-none"
//                   : "bg-gray-200 text-gray-800 rounded-bl-none"
//               }`}
//             >
//               {msg.message}
//             </div>
//           </div>
//         ))}
//         <div ref={scrollRef} />
//       </div>

//       <div className="p-3 border-t flex gap-2">
//         <input
//           type="text"
//           className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyPress={(e) => e.key === "Enter" && handleSend()}
//           placeholder="Type a message..."
//         />
//         <button
//           onClick={handleSend}
//           className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Chat;