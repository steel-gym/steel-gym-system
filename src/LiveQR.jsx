import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

function LiveQR() {
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    const generateQR = () => {
      const timestamp = Date.now();
      const url = `https://steel-gym-system.vercel.app/scan?code=1&ts=${timestamp}`;
      setQrValue(url);
    };

    generateQR();

    const interval = setInterval(() => {
      generateQR();
    }, 60000); // كل دقيقة

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#111",
        color: "#fff",
      }}
    >
      <h2>QR متغير كل دقيقة</h2>
      <div style={{ background: "white", padding: 20 }}>
        <QRCode value={qrValue} size={250} />
      </div>
    </div>
  );
}

export default LiveQR;