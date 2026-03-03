import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import QRCode from "react-qr-code";

function LiveQR() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, employee_code")
      .eq("is_active", true);

    setEmployees(data || []);
  };

  useEffect(() => {
    if (!selectedEmployee) return;

    const generateQR = () => {
      const timestamp = Date.now();

      const url = `https://steel-gym-system.vercel.app/scan?code=${selectedEmployee}&ts=${timestamp}`;

      setQrValue(url);
    };

    generateQR();

    const interval = setInterval(() => {
      generateQR();
    }, 60000);

    return () => clearInterval(interval);
  }, [selectedEmployee]);

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
      <h2>اختار الموظف</h2>

      <select
        value={selectedEmployee}
        onChange={(e) => setSelectedEmployee(e.target.value)}
        style={{ padding: 10, marginBottom: 20 }}
      >
        <option value="">اختر موظف</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.employee_code}>
            {emp.full_name}
          </option>
        ))}
      </select>

      {qrValue && (
        <div style={{ background: "white", padding: 20 }}>
          <QRCode value={qrValue} size={250} />
        </div>
      )}
    </div>
  );
}

export default LiveQR;