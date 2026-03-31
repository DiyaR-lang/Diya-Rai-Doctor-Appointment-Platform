// src/components/Chat.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const Chat = ({ patientId, doctorId }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const room = [patientId, doctorId].sort().join("_");

  // ---------------------------
  // Initialize socket
  // ---------------------------
  useEffect(() => {
    const newSocket = io("http://localhost:5000", { transports: ["websocket"] });
    setSocket(newSocket);

    return () => newSocket.disconnect(); // cleanup on unmount
  }, []);

  // ---------------------------
  // Fetch chat history
  // ---------------------------
  useEffect(() => {
    const fetchMessages = async () => {
      const res = await axios.get(
        `http://localhost:5000/api/messages/${patientId}/${doctorId}`
      );
      setMessages(res.data);
    };
    fetchMessages();
  }, [patientId, doctorId]);

  // ---------------------------
  // Join room & listen for messages
  // ---------------------------
  useEffect(() => {
    if (!socket) return;

    socket.emit("join_room", { patientId, doctorId });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [socket, patientId, doctorId]);

  // ---------------------------
  // Send message
  // ---------------------------
  const handleSend = () => {
    if (!input.trim()) return;
    socket.emit("send_message", { patientId, doctorId, message: input });
    setInput("");
  };

  return (
    <div style={{ border: "1px solid gray", padding: "10px", width: "400px" }}>
      <h3>Chat</h3>
      <div
        style={{
          border: "1px solid lightgray",
          height: "300px",
          overflowY: "scroll",
          padding: "5px",
          marginBottom: "10px",
        }}
      >
        {messages.map((msg) => (
          <div key={msg._id} style={{ marginBottom: "5px" }}>
            <b>{msg.senderId === patientId ? "Patient" : "Doctor"}:</b> {msg.message}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message"
        style={{ width: "80%" }}
      />
      <button onClick={handleSend} style={{ width: "18%", marginLeft: "2%" }}>
        Send
      </button>
    </div>
  );
};

export default Chat;