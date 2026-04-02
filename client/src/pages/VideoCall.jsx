import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

export default function VideoCall() {
  const { roomId } = useParams();
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for container to be rendered
    if (containerRef.current) {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady || !roomId) return;

    const startCall = async () => {
      const appID = 1914081145;
      const serverSecret = "ca67ba7cf24e5eafa0678328991290d9";
      
      // CRITICAL: Ensure we have a valid ID and Name
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser?._id || storedUser?.id || "user_" + Math.floor(Math.random() * 1000);
      const userName = storedUser?.name || "Medical User";

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID, serverSecret, roomId, userId, userName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zp.joinRoom({
        container: containerRef.current,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        showScreenSharingButton: true,
      });
    };

    startCall();
  }, [isReady, roomId]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      {!isReady && <div className="text-white p-10">Connecting to server...</div>}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}