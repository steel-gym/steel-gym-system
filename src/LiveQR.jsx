import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

function LiveQR() {
  const [qrValue, setQrValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const employeeCode = params.get("code");

    if (!employeeCode) {
      setError("لا يوجد كود موظف في الرابط");
      return;
    }

    const generateQR = () => {
      const timestamp = Date.now();

      const url = `https://steel-gym-system.vercel.app/scan?code=${employeeCode}&ts=${timestamp}`;

      setQrValue(url);
    };

    generateQR();

    const interval = setInterval(() => {
      generateQR();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#111",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {error && <h2>{error}</h2>}

      {!error && qrValue && (
        <>
          <h2>QR خاص بك</h2>
          <div style={{ background: "white", padding: 20 }}>
            <QRCode value={qrValue} size={250} />
          </div>
        </>
      )}
    </div>
  );
}

export default LiveQR;