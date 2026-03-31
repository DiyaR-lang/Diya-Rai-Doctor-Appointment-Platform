// src/components/Notifications.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const Notifications = ({ userId, token }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // ---------------------------
  // Initialize socket
  // ---------------------------
  useEffect(() => {
    const newSocket = io("http://localhost:5000", { transports: ["websocket"] });
    setSocket(newSocket);

    return () => newSocket.disconnect(); // cleanup
  }, []);

  // ---------------------------
  // Fetch existing notifications from backend
  // ---------------------------
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/notifications/my",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setNotifications(res.data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
  }, [token]);

  // ---------------------------
  // Listen for real-time notifications
  // ---------------------------
  useEffect(() => {
    if (!socket) return;

    socket.on("new_notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket.off("new_notification");
    };
  }, [socket]);

  return (
    <div style={{ border: "1px solid gray", padding: "10px", width: "300px" }}>
      <h3>Notifications</h3>
      <ul>
        {notifications.map((n) => (
          <li key={n._id} style={{ fontWeight: n.isRead ? "normal" : "bold" }}>
            {n.title}: {n.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;